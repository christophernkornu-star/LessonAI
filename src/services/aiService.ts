import type { LessonTemplate } from "@/data/lessonTemplates";
import { supabase } from "@/integrations/supabase/client";
import { 
  GHANA_CONTEXT, 
  getCurriculumStandard, 
  getSubjectExamples, 
  getDifferentiationStrategy 
} from "@/data/ghanaContext";
import { extractTextFromFile } from "./fileParsingService";

// AI Provider Configuration
// Enforced to DeepSeek for production
const AI_PROVIDER = "deepseek";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // Kept for reference but unused
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// Helper functions for teaching philosophy and detail level
function getPhilosophyGuidance(philosophy: string): string {
  const philosophies: Record<string, string> = {
    "student-centered": "Focus on student-led activities, discovery learning, and hands-on exploration. Minimize direct instruction. Emphasize group work, discussions, and student presentations.",
    "teacher-led": "Use direct instruction as the primary method. Include clear explanations, demonstrations, and guided practice. Teacher controls the pace and flow of the lesson.",
    "balanced": "Balance between teacher-led instruction and student activities. Combine direct teaching with interactive elements, discussions, and practice opportunities.",
    "inquiry-based": "Design activities around questions and problems for students to investigate. Promote critical thinking and discovery. Guide students to find answers rather than providing them directly.",
    "collaborative": "Emphasize group work, peer learning, and cooperative activities. Include team projects, partner work, and collaborative problem-solving throughout the lesson."
  };
  return philosophies[philosophy] || philosophies["balanced"];
}

function getDetailLevelGuidance(detailLevel: string): string {
  const levels: Record<string, string> = {
    "brief": "Provide a concise outline with key points only. Keep explanations short and focused on essentials. Aim for brevity while covering all necessary sections.",
    "moderate": "Provide standard detail with clear explanations and examples. Balance thoroughness with readability. Include practical details without being overwhelming.",
    "detailed": "Provide comprehensive explanations, multiple examples, and thorough coverage of each section. Include specific instructions, dialogue suggestions, and detailed activity descriptions.",
    "very-detailed": "Provide extensive detail including scripted dialogue, multiple examples for different scenarios, differentiation strategies for various learner types, detailed timing for each activity segment, and comprehensive assessment rubrics."
  };
  return levels[detailLevel] || levels["moderate"];
}

export interface LessonData {
  subject: string;
  level: string;
  strand: string;
  subStrand: string;
  contentStandard: string;
  indicators?: string;
  exemplars: string;
  curriculum?: string;
  classSize?: string;
  philosophy?: string;
  term?: string;
  weekNumber?: string;
  weekEnding?: string;
  detailLevel?: string;
  includeDiagrams?: boolean;
  template?: LessonTemplate;
  selectedCurriculumFiles?: string[];
  selectedResourceFiles?: string[];
  location?: string;
  schemeResources?: string;
  
  // New field matching the user requirement
  numLessons?: number; // Defaults to 1 if undefined
  scheduledDays?: string[]; // Specific days for the lessons (e.g. ["Monday", "Wednesday"])
}

// Helper to log usage
async function logAIUsage(
  model: string, 
  requestType: string, 
  success: boolean, 
  tokens: number = 0, 
  errorMessage?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ai_usage_logs').insert({
      user_id: user?.id || null,
      model,
      request_type: requestType,
      tokens_used: tokens,
      success,
      error_message: errorMessage
    });
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }
}

export async function callAIAPI(prompt: string, systemMessage?: string, numLessons?: number): Promise<string> {
  // Strictly use DeepSeek API
  return callDeepSeekAPI(prompt, systemMessage, numLessons);
}

async function callGroqAPI(prompt: string, systemMessage?: string, numLessons?: number): Promise<string> {
  // Validate API key
  if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_KEY_HERE") {
    throw new Error("Groq API key is not configured. Get a FREE key at https://console.groq.com and add VITE_GROQ_API_KEY to your .env file.");
  }

  console.log("Groq API Key loaded:", GROQ_API_KEY.substring(0, 10) + "...");
  console.log("Making request to Groq API...");

  const defaultSystemMessage = "You are an expert educational content creator specializing in creating comprehensive, professional lesson plans for Ghanaian teachers following the National Pre-tertiary Curriculum.";
  
  // Calculate max_tokens based on number of lessons (each lesson needs ~2500 tokens)
  const baseTokens = 4000;
  const tokensPerLesson = 2500;
  const calculatedMaxTokens = numLessons && numLessons > 1 
    ? Math.min(baseTokens + (numLessons * tokensPerLesson), 16000) // Cap at 16k for Groq
    : baseTokens;
  
  console.log(`Requesting ${calculatedMaxTokens} max_tokens for ${numLessons || 1} lesson(s)`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for multi-lesson

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Updated to current model
        messages: [
          {
            role: "system",
            content: systemMessage || defaultSystemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: calculatedMaxTokens,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log("Groq API response status:", response.status);

    if (!response.ok) {
      let errorMessage = "Failed to generate lesson note";
      try {
        const error = await response.json();
        console.error("Groq API error response:", JSON.stringify(error, null, 2));
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // Response wasn't JSON
        console.error("Groq API error (not JSON):", response.statusText);
        errorMessage = response.statusText;
      }
      logAIUsage("groq", "text-generation", false, 0, errorMessage);
      throw new Error(`Groq API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
       logAIUsage("groq", "text-generation", false, 0, "Invalid response");
       throw new Error("Invalid response from Groq API");
    }

    const content = data.choices[0].message.content;
    const tokens = data.usage?.total_tokens || 0;
    logAIUsage("groq", "text-generation", true, tokens);
    
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error calling Groq API:", error);
    
    let userMessage = "Failed to generate lesson content. Please try again.";
    
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
           userMessage = "Request timed out. The AI service is taking too long to respond.";
           logAIUsage("groq", "text-generation", false, 0, "Timeout > 60s");
        } else {
           userMessage = error.message;
           logAIUsage("groq", "text-generation", false, 0, error.message);
        }
    }
    
    throw new Error(userMessage);
  }
}


async function callDeepSeekAPI(prompt: string, systemMessage?: string, numLessons?: number): Promise<string> {
  // Validate API key
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === "YOUR_API_KEY_HERE") {
    console.error("DeepSeek API key missing:", DEEPSEEK_API_KEY);
    throw new Error("DeepSeek API key is not configured. Please add VITE_DEEPSEEK_API_KEY to your .env file.");
  }

  console.log("DeepSeek API Key loaded:", DEEPSEEK_API_KEY.substring(0, 10) + "...");
  console.log("Making request to DeepSeek API via Vite Proxy...");

  const defaultSystemMessage = "You are an expert educational content creator specializing in creating comprehensive, professional lesson plans for Ghanaian teachers following the National Pre-tertiary Curriculum.";
  
  // Calculate max_tokens based on number of lessons (each lesson needs ~2500 tokens)
  // DeepSeek has a max_tokens limit of 8192
  const baseTokens = 4000;
  const tokensPerLesson = 2500;
  const calculatedMaxTokens = numLessons && numLessons > 1 
    ? Math.min(baseTokens + (numLessons * tokensPerLesson), 8192) // Cap at 8192 for DeepSeek
    : Math.min(baseTokens, 8192);
  
  console.log(`Requesting ${calculatedMaxTokens} max_tokens for ${numLessons || 1} lesson(s)`);
  
  const controller = new AbortController();
  // Increase timeout for multi-lesson generation (30 seconds per lesson)
  const timeoutMs = numLessons && numLessons > 1 ? Math.max(120000, numLessons * 30000) : 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Use local proxy configured in vite.config.ts to bypass CORS
    const response = await fetch('/api/deepseek/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemMessage || defaultSystemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: calculatedMaxTokens,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DeepSeek API Error:", response.status, errorData);
      const errorMsg = `API Error: ${response.status} ${errorData.error?.message || response.statusText}`;
      logAIUsage("deepseek-chat", "text-generation", false, 0, errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json();

    console.log("DeepSeek API success via proxy");
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      logAIUsage("deepseek-chat", "text-generation", false, 0, "Invalid response");
      throw new Error("Invalid response from DeepSeek API");
    }
    
    const content = data.choices[0].message.content;
    const tokens = data.usage?.total_tokens || 0;
    logAIUsage("deepseek-chat", "text-generation", true, tokens);
    
    return content;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("DeepSeek API call failed:", error);
    if (error instanceof Error) {
       if (error.name === 'AbortError') {
          logAIUsage("deepseek-chat", "text-generation", false, 0, "Timeout > 120s");
          throw new Error("Request timed out after 2 minutes. The AI is taking too long to respond.");
       }
       logAIUsage("deepseek-chat", "text-generation", false, 0, error.message);
       throw error;
    }
    throw new Error("Network error. Please check your internet connection.");
  }
}

export async function generateLessonNote(originalData: LessonData): Promise<string> {
  try {
    // Clone data to avoid mutating the original
    const data = { ...originalData };
    const numLessons = data.numLessons || 1;

    // ITERATIVE GENERATION STRATEGY:
    // If multiple lessons are requested, we generate them individually and combine the results.
    // This bypasses the single-response token limit (8192 tokens) which often causes 
    // incomplete generation (e.g. stopping at 3 lessons instead of 5).
    // It also ensures each lesson receives the full attention of the model.

    if (numLessons > 1) {
      console.log(`Generating ${numLessons} lessons iteratively to ensure full detail...`);
      
      // Helper to safely get the Nth item (splitting by newline)
      const getItem = (text: string | undefined, index: number) => {
          if (!text) return "";
          const parts = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length === 0) return "";
          // If we have enough parts, use the specific one. Otherwise, repeat the last one or reuse.
          // Standard logic: If 1 part provided but 5 lessons asked, use that part for all.
          // If 5 parts provided for 5 lessons, use 1-to-1.
          if (parts.length === 1) return parts[0];
          return parts[Math.min(index, parts.length - 1)];
      };

      const lessonPromises = Array.from({ length: numLessons }).map(async (_, index) => {
           // Construct specific data for THIS lesson
           const singleLessonData: LessonData = {
               ...data,
               numLessons: 1, // Force single generation mode for the recursive call
               strand: getItem(data.strand, index),
               subStrand: getItem(data.subStrand, index),
               contentStandard: getItem(data.contentStandard, index),
               indicators: getItem(data.indicators, index),
               exemplars: getItem(data.exemplars, index),
               // Assign specific day if available
               scheduledDays: data.scheduledDays && data.scheduledDays[index] ? [data.scheduledDays[index]] : [],
               // Pass term/week info directly
               term: data.term,
               weekNumber: data.weekNumber,
               weekEnding: data.weekEnding,
           };
           
           // Generating individual lesson...
           return generateLessonNote(singleLessonData);
      });

      const results = await Promise.all(lessonPromises);

      if (data.template) {
          // If using a template (JSON Mode), the results are individual JSON strings (objects).
          // We need to combine them into a JSON Array.
          // Clean up results to ensure we only have the object part
          const jsonObjects = results.map(r => {
             const trimmed = r.trim();
             // If for some reason it's wrapped in array brackets (shouldn't be), remove them
             if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed.slice(1, -1);
             return trimmed;
          });
          return `[${jsonObjects.join(',')}]`;
      } else {
          // If using standard mode (Text Mode), join with separator
          // Ensure explicit numbering is present if it wasn't generated by AI
          // Apply formatting to each result before combining
          const titledResults = results.map((res, index) => {
              const formattedRes = formatGeneratedContent(res);
              const header = `Lesson: ${index + 1} of ${numLessons}`;
              if (!formattedRes.includes(header)) {
                  // Prepend the header if missing
                  return `**${header}**\n\n${formattedRes}`;
              }
              return formattedRes;
          });
          return titledResults.join('\n\n---\n\n');
      }
    }
    
    // === SINGLE LESSON GENERATION LOGIC (Original Flow) ===
    
    if (numLessons === 1) {
      const splitAndGetFirst = (text: string | undefined) => {
        if (!text) return "";
        // Split by newlines (used in Scheme grouping)
        const parts = text.split('\n');
        return parts[0].trim();
      };
      
      data.strand = splitAndGetFirst(data.strand);
      data.subStrand = splitAndGetFirst(data.subStrand);
      data.contentStandard = splitAndGetFirst(data.contentStandard);
      data.indicators = splitAndGetFirst(data.indicators);
      data.exemplars = splitAndGetFirst(data.exemplars);
    }
    
    // Fetch selected files if any
    let curriculumFilesInfo = "";
    let resourceFilesInfo = "";

    if (data.selectedCurriculumFiles && data.selectedCurriculumFiles.length > 0) {
      const { data: curriculumFiles } = await supabase
        .from("resource_files")
        .select("title, description, file_name, file_path, file_type")
        .in("id", data.selectedCurriculumFiles);
      
      if (curriculumFiles && curriculumFiles.length > 0) {
        const filesWithContent = await Promise.all(curriculumFiles.map(async (file: any) => {
            let content = "";
            if (file.file_path) {
                // Determine bucket based on file type (default to resource-files if unknown)
                // IMPORTANT: The file_path stored in DB might already be a full URL or a relative path
                // If it's a full URL from Supabase, we can use it directly or extract the path
                
                let publicUrl = "";
                if (file.file_path.startsWith('http')) {
                    publicUrl = file.file_path;
                } else {
                    const bucketName = file.file_type ? `${file.file_type}-files` : 'resource-files';
                    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(file.file_path);
                    publicUrl = publicUrlData.publicUrl;
                }

                if (publicUrl) {
                    try {
                        content = await extractTextFromFile(publicUrl, file.file_name);
                    } catch (err) {
                        console.warn(`Failed to extract text from ${file.file_name}:`, err);
                        content = "[Content extraction failed - file may be inaccessible]";
                    }
                }
            }
            return { ...file, content };
        }));

        curriculumFilesInfo = `\n\n**Reference Curriculum Documents:**\n${filesWithContent.map((file: any, idx: number) => 
          `${idx + 1}. ${file.title}${file.description ? ` - ${file.description}` : ''} (${file.file_name})\nCONTENT:\n${file.content.substring(0, 3000)}...`
        ).join('\n\n')}`;
      }
    }

    if (data.selectedResourceFiles && data.selectedResourceFiles.length > 0) {
      const { data: resourceFiles } = await supabase
        .from("resource_files")
        .select("title, description, file_name, file_path, file_type")
        .in("id", data.selectedResourceFiles);
      
      if (resourceFiles && resourceFiles.length > 0) {
        const filesWithContent = await Promise.all(resourceFiles.map(async (file: any) => {
            let content = "";
            if (file.file_path) {
                // Determine bucket based on file type
                const bucketName = file.file_type ? `${file.file_type}-files` : 'resource-files';
                const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(file.file_path);
                if (publicUrlData?.publicUrl) {
                    content = await extractTextFromFile(publicUrlData.publicUrl, file.file_name);
                }
            }
            return { ...file, content };
        }));

        resourceFilesInfo = `\n\n**Additional Resource Materials:**\n${filesWithContent.map((file: any, idx: number) => 
          `${idx + 1}. ${file.title}${file.description ? ` - ${file.description}` : ''} (${file.file_name})\nCONTENT:\n${file.content.substring(0, 3000)}...`
        ).join('\n\n')}`;
      }
    }

    // Build teaching approach guidance
    const philosophyGuidance = getPhilosophyGuidance(data.philosophy || 'balanced');
    const detailGuidance = getDetailLevelGuidance(data.detailLevel || 'moderate');
    
    // Get Ghana-specific context
    const curriculumStandard = getCurriculumStandard(data.level);
    const subjectExamples = getSubjectExamples(data.subject);
    const differentiationStrategies = getDifferentiationStrategy('mixed'); // Default to mixed for now, could be added to LessonData

    const ghanaContextPrompt = `
**GHANAIAN CONTEXT REQUIREMENTS (CRITICAL):**
1. Use ONLY Ghanaian names (Kwame, Akosua, Kofi, Ama, etc.)
2. Use ONLY Ghanaian places (Accra, Kumasi, Tamale, Cape Coast, etc.)
3. Use ONLY Ghanaian currency (Ghana cedis and pesewas)
4. Use ONLY locally available materials: ${GHANA_CONTEXT.local_materials.slice(0, 5).join(', ')}
5. Include Ghanaian values and cultural elements
6. Make it practical for real Ghanaian classroom conditions (large classes, limited resources)
7. Curriculum Standard: ${curriculumStandard}
${data.location ? `8. **LOCATION SPECIFIC CONTEXT:** The school is located in **${data.location}**. 
   - Use examples relevant to this specific location (e.g., nearby landmarks, local geography, main economic activities of the area).
   - If the location is a coastal area, use ocean/fishing examples. If forest belt, use farming/forestry examples. If northern savannah, use relevant agricultural/climate examples.
   - Mention local markets, festivals, or sites familiar to students in ${data.location}.` : ''}

**LANGUAGE AND SPELLING INSTRUCTIONS (CRITICAL):**
- **USE BRITISH ENGLISH SPELLING ONLY.** (e.g., 'colour' not 'color', 'programme' not 'program', 'centre' not 'center', 'behaviour' not 'behavior', 'organise' not 'organize', 'analyse' not 'analyze').
- This is mandatory for the Ghanaian curriculum context.
- For "Ghanaian Language" subject: ALL content MUST be written in ENGLISH ONLY.
- DO NOT use any Twi, Fante, Akan, Ewe, Ga, Dagbani, or any other Ghanaian local language words unless explicitly teaching them as vocabulary terms.
- Lesson activities, instructions, examples, and all text must be in plain British English.
- This applies regardless of whether the lesson is about teaching a local language - the lesson note itself must be in English.

**FORMATTING REQUIREMENTS:**
- Start each new thought, idea, or concept on a NEW LINE.
- Use double newlines (blank line) between different sections or major ideas.
- Number activities clearly (1), 2), 3) or Activity 1:, Activity 2:) with each on its own line.
- Avoid long run-on paragraphs - break them into digestible chunks.
- Use bullet points for lists of items.

**GHANAIAN EXAMPLES TO USE:**
${subjectExamples.map(ex => `- ${ex}`).join('\n')}

**DIFFERENTIATION STRATEGIES:**
${differentiationStrategies}
`;

    let prompt = "";

    if (data.template) {
      // Use the selected template structure as the exact base
      prompt = `You are an expert educational content creator for Ghana's education system. You will be given a lesson note template with exact headings and structure. Your task is to FILL IN the template with actual content while keeping the EXACT structure and headings.
${data.numLessons && data.numLessons > 1 ? `\n**CRITICAL: MULTIPLE LESSONS REQUIRED - GENERATE EXACTLY ${data.numLessons} LESSONS**
You MUST generate **EXACTLY ${data.numLessons} SEPARATE LESSON NOTES**.
⚠️ DO NOT generate fewer than ${data.numLessons} lessons. If you are asked for 5 lessons, you MUST create all 5.
Spread the provided Learning Indicators/Exemplars across these ${data.numLessons} lessons logically.
For example, if there are 4 exemplars and 2 lessons are requested, cover Exemplars 1-2 in Lesson 1, and Exemplars 3-4 in Lesson 2.
If you have fewer indicators than lessons, create review/practice lessons for the remaining slots.
At the top of EACH lesson note, clearly write "LESSON X OF ${data.numLessons}" where X is the lesson number (e.g. "LESSON 1 OF 5", "LESSON 2 OF 5").
You MUST also include the specific Lesson Number within the lesson title or sub-heading (e.g. "Lesson 1: Introduction to...", "Lesson 2: Advanced..."). 
OUTPUT FORMAT: Return a JSON ARRAY with EXACTLY ${data.numLessons} lesson objects: [{lesson1}, {lesson2}, {lesson3}, ...]
Your response MUST start with [ and end with ]` : ''}

**Template Name:** ${data.template.name}
**Template Description:** ${data.template.description}

**Lesson Information to Use:**
- Subject: ${data.subject}
- Grade Level: ${data.level}
- Strand: ${data.strand}
- Sub-Strand: ${data.subStrand}
- Content Standard: ${data.contentStandard}
${data.numLessons && data.numLessons > 1 ? '- **Task:** Split these Indicators/Exemplars across ' + data.numLessons + ' lessons.' : ''}
- Learning Indicators: ${data.indicators || "None provided"}
- Exemplars: ${data.exemplars || "None provided"}${data.schemeResources ? `\n- Resources from Scheme: ${data.schemeResources}` : ''}${curriculumFilesInfo}${resourceFilesInfo}

${ghanaContextPrompt}

**TEACHING APPROACH:**
${philosophyGuidance}

**DETAIL LEVEL:**
${detailGuidance}

${data.includeDiagrams ? `**DIAGRAM OUTLINES:**
Include descriptions of relevant diagrams, charts, illustrations, or visual aids that should be used during the lesson. For each diagram, provide:
- A clear title/caption
- What should be shown in the diagram
- How it relates to the learning objectives
- When it should be presented during the lesson
- Key elements or labels that should be included

` : ''}**EXACT TEMPLATE TO FILL (DO NOT MODIFY STRUCTURE OR HEADINGS):**

${data.template.structure}

**CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:**

1. MAINTAIN EXACT TABLE STRUCTURE - All +, -, |, and = characters MUST align perfectly
2. DO NOT modify, add, or remove any table border characters (+, -, |, =)
3. Keep text WITHIN cell boundaries - use concise text that fits the cell width
4. PRESERVE all bold formatting (**text**) exactly as shown
5. KEEP merged cell structure unchanged
6. DO NOT break table borders with long text - use line breaks within cells if needed
7. USE THE EXACT HEADINGS from the template - do not paraphrase, rename, or modify them
8. DO NOT skip any sections from the template
9. DO NOT add sections that aren't in the template
10. DO NOT reorder sections

**HOW TO FILL THE TEMPLATE:**
- Replace {SUBJECT} with: ${data.subject}
- Replace {LEVEL} or {CLASS} with: ${data.level}
- Replace {STRAND} with: ${data.strand}
- Replace {SUB_STRAND} with: ${data.subStrand}
- Replace {CONTENT_STANDARD} with: ${data.contentStandard}
- Replace {EXEMPLARS}, {OBJECTIVES}, or {INDICATOR} with appropriate learning objectives based on: ${data.indicators ? "Indicators: " + data.indicators : ""} ${data.exemplars ? "Exemplars: " + data.exemplars : ""}
- Replace {LESSON_TITLE} with a descriptive title for this lesson
- Replace {TERM} with the academic term (e.g., "First Term", "Second Term", "Third Term")
- Replace {WEEK_ENDING} with: ${data.weekEnding || ""} (Leave empty if not provided)
- Replace {DAY} with: ${data.scheduledDays && data.scheduledDays.length > 0 ? `the scheduled day (use "${data.scheduledDays[0]}" for Lesson 1${data.scheduledDays.length > 1 ? `, "${data.scheduledDays[1]}" for Lesson 2` : ''}${data.scheduledDays.length > 2 ? `, "${data.scheduledDays[2]}" for Lesson 3` : ''})` : "the day of the week"}
- Replace {DURATION} with appropriate lesson duration (e.g., 60 minutes, 1 hour)
- Replace {CLASS_SIZE} with: ${data.classSize || "typical class size (e.g., 30-40 students)"}
- Replace {PERFORMANCE_INDICATOR} with specific measurable outcomes starting with "By the end of the lesson, learners will be able to:"
- Replace {CORE_COMPETENCIES} with relevant competencies (e.g., Critical Thinking, Creativity, Communication, Collaboration)
- Replace {KEYWORDS} with key vocabulary terms for this lesson
- Replace {REFERENCE} with EXACTLY: "NaCCA ${data.subject} Curriculum for ${data.level}" - DO NOT add any other text, materials, or resources to this field.
- Replace {STARTER_DURATION} with "10 mins"
- Replace {NEW_LEARNING_DURATION} with "40 mins"
- Replace {REFLECTION_DURATION} with "10 mins"
- For {STARTER_ACTIVITIES}: Describe the starter/warm-up activities.
- For {REFLECTION_ACTIVITIES}: 
  1. Briefly summarize the lesson closure.
  2. ALWAYS add a blank line (double newline), then include the subheading "**Sample Class Exercises:**" (bolded) followed by at least 3 concept application questions for students to solve. 
  3. Ensure these questions test understanding of the lesson concepts in a practical way.
- For {NEW_LEARNING_ACTIVITIES}: Number the activities (Activity 1:, Activity 2:) starting on new lines and USE bold formatting (e.g. **Activity 1:**).
  ${data.numLessons && data.numLessons > 1 ? `
  - **CRITICAL - MULTIPLE STRANDS/LESSONS:**
    You have been provided with multiple Strands/Sub-strands for this week (separated by newlines).
    You are creating a plan for ${data.numLessons} lessons.
    ${data.scheduledDays && data.scheduledDays.length > 0 ? `**SCHEDULE:** This subject is taught on: ${data.scheduledDays.join(', ')}. Assign each lesson to the correct day in order.` : ''}
    **RULE:** You must STRICTLY separate the strands.
    - **Lesson 1** ${data.scheduledDays?.[0] ? `(Day: ${data.scheduledDays[0]})` : ''} must focus ONLY on the *first* Strand/Sub-strand provided.
    - **Lesson 2** ${data.scheduledDays?.[1] ? `(Day: ${data.scheduledDays[1]})` : ''} must focus ONLY on the *second* Strand/Sub-strand provided (if available).
    - **Lesson 3** ${data.scheduledDays?.[2] ? `(Day: ${data.scheduledDays[2]})` : ''} must focus ONLY on the *third* Strand/Sub-strand provided (if available).
    - **DO NOT** combine multiple strands into a single lesson/activity session. 
    - If you run out of unique strands, you may extend the last strand or review, but NEVER squash distinct strands together.
    - **NUMBERING:** Ensure each lesson is distinctly numbered 1 to ${data.numLessons}.` : ''}
    - Replace {DAY} with the specific day assigned to each lesson as listed above:
      * For Lesson 1, use: "${data.scheduledDays?.[0] || 'Monday'}"
      * For Lesson 2, use: "${data.scheduledDays?.[1] || 'Wednesday'}"
      * For Lesson 3, use: "${data.scheduledDays?.[2] || 'Friday'}"
      *(Continue this pattern for all ${data.numLessons} lessons)*
    - **SCHEDULE REQUIREMENT:** You MUST use the exact days provided above. DO NOT invent days or use default patterns like "Monday, Tuesday" unless they are explicitly listed above.
- For {STARTER_RESOURCES}, {NEW_LEARNING_RESOURCES}, {REFLECTION_RESOURCES}, list ONLY essential, simple, and readily available materials (avoid long lists)
- For sections like {INTRODUCTION}, {MAIN_ACTIVITIES}, {ASSESSMENT}, etc., write detailed, practical content
- **FORMATTING:** Use short, clear paragraphs. Avoid long "walls of text". Use bullet points (-) for lists. Separate distinct ideas with newlines.

**CONTENT QUALITY REQUIREMENTS:**
- **Paragraphing:** Break long text into smaller, readable paragraphs. Use double newlines (\n\n) to separate paragraphs in JSON strings.
- **Teaching Philosophy:** ${data.philosophy || 'balanced'} - ${philosophyGuidance}
- **Detail Level:** ${data.detailLevel || 'moderate'} - ${detailGuidance}
- **Diagrams:** ${data.includeDiagrams ? 'Include diagram outlines as requested.' : 'Do not include diagram outlines.'}
- Generate detailed, practical, actionable content for EVERY section
- Ensure all content is appropriate for ${data.level} students in Ghana
- Include specific examples, activities, and clear instructions
- Make it ready for immediate classroom use${curriculumFilesInfo || resourceFilesInfo ? '\n- Reference and incorporate content from the provided curriculum documents and resource materials' : ''}

**CRITICAL: JSON TEMPLATE OUTPUT REQUIREMENTS:**
- This template is in JSON format - you MUST return ONLY valid JSON
- Your response should START with { and END with }
- Do NOT add any text before or after the JSON
- Do NOT add markdown code blocks (no \`\`\`json or \`\`\`)
- DO NOT change the JSON structure or add/remove fields
- Replace ALL placeholders {SUBJECT}, {LEVEL}, {CLASS}, {STRAND}, {SUB_STRAND}, {CONTENT_STANDARD}, {EXEMPLARS}, {OBJECTIVES}, {INDICATOR}, {LESSON_TITLE}, {TERM}, {WEEK_ENDING}, {DAY}, {DURATION}, {CLASS_SIZE}, {PERFORMANCE_INDICATOR}, {CORE_COMPETENCIES}, {KEYWORDS}, {REFERENCE}, {STARTER_DURATION}, {NEW_LEARNING_DURATION}, {REFLECTION_DURATION} with actual educational content
- Ensure all string values are properly escaped (use \\ for special characters)
- Do NOT include ANY explanation, commentary, or meta-text
- The ENTIRE response must be parseable as JSON

**SPECIAL INSTRUCTIONS FOR TABLE TEMPLATES:**
- If the template contains ASCII table borders (+, -, |, =), you MUST preserve them EXACTLY
- Keep all content within the visual cell boundaries
- Use short, concise text that fits within each cell's width
- For multi-line content within a cell, use line breaks but maintain cell borders
- Example: If a cell is 50 characters wide, keep text under 48 characters per line
- Fill ALL placeholders {PLACEHOLDER_TEXT} with actual content - no placeholders should remain

**OUTPUT FORMAT:**
${data.template?.structure.trim().startsWith('{') ? `
⚠️ ATTENTION: This is a JSON template!
${data.numLessons && data.numLessons > 1 ? `- You are generating ${data.numLessons} lessons, so return a JSON ARRAY
- Your FIRST character must be: [
- Your LAST character must be: ]
- Format: [{lesson1}, {lesson2}, {lesson3}, ...] with EXACTLY ${data.numLessons} objects` : `- Your FIRST character must be: {
- Your LAST character must be: }`}
- NO text before the opening ${data.numLessons && data.numLessons > 1 ? '[' : '{'}
- NO text after the closing ${data.numLessons && data.numLessons > 1 ? ']' : '}'}
- NO markdown code fences
- ONLY pure JSON
` : `
- Start with the EXACT first line of the template
- Work through EACH section systematically, maintaining exact formatting
`}
- Output ONLY the filled template - no commentary, no explanations, no meta-text
- Do NOT say things like "Here is the lesson note" or "I have filled the template"
- Ensure EVERY placeholder is replaced with actual content

BEGIN THE FILLED TEMPLATE NOW:`;
    } else {
      // Use default prompt if no template selected
      prompt = `You are an expert educational content creator for Ghana's education system. Generate a comprehensive, professional lesson note based on the following information:
${data.numLessons && data.numLessons > 1 ? `
**⚠️ CRITICAL: MULTIPLE LESSONS REQUIRED - GENERATE EXACTLY ${data.numLessons} LESSONS**
You MUST generate **EXACTLY ${data.numLessons} SEPARATE LESSON NOTES**.
DO NOT generate fewer than ${data.numLessons} lessons. If you are asked for 5 lessons, you MUST create all 5.
Spread the provided Learning Indicators/Exemplars across these ${data.numLessons} lessons logically.
If you have fewer indicators than lessons, create review/practice lessons for the remaining slots.
Clearly label each lesson as "LESSON 1 OF ${data.numLessons}", "LESSON 2 OF ${data.numLessons}", etc.
Separate each lesson with a line containing only "---"
` : ''}
**Subject:** ${data.subject}
**Grade Level:** ${data.level}
**Class Size:** ${data.classSize || "Typical (30-40)"}
**Strand:** ${data.strand}
**Sub-Strand:** ${data.subStrand}
**Content Standard:** ${data.contentStandard}
**Learning Indicators:** ${data.indicators || "None provided"}
**Exemplars:** ${data.exemplars || "None provided"}
**Scheme Resources:** ${data.schemeResources || "Standard teaching materials"}${curriculumFilesInfo}${resourceFilesInfo}

${ghanaContextPrompt}

**TEACHING APPROACH:**
${philosophyGuidance}

**DETAIL LEVEL:**
${detailGuidance}
- **Formatting:** Use short, clear paragraphs. Avoid long blocks of text. Use bullet points where appropriate.

${data.includeDiagrams ? `**DIAGRAM OUTLINES:**
Include descriptions of relevant diagrams, charts, illustrations, or visual aids throughout the lesson. For each diagram, provide:
- A clear title/caption
- Description of what should be shown
- How it supports the learning objectives
- When it should be presented
- Key elements, labels, or annotations

` : ''}Please create a lesson note that includes:
1. Lesson Title
2. Learning Objectives (at least 3)
3. Materials Needed (List only essential, readily available items)
4. Introduction/Warm-up Activity (5-10 minutes)
5. Main Teaching Activities (30-40 minutes)
   - Step-by-step instructional sequence
   - Guided practice activities
   - Examples and demonstrations
   - IMPORTANT: Start every "Activity X:" on a new line and use bold formatting (e.g., **Activity 1:**).
   ${data.numLessons && data.numLessons > 1 ? `
   - **CRITICAL - MULTIPLE STRANDS/LESSONS:**
     You have been provided with distinct Strands/Sub-strands for this week (separated by newlines).
     You are creating a plan for ${data.numLessons} lessons.
     ${data.scheduledDays && data.scheduledDays.length > 0 ? `**SCHEDULE:** This subject is taught on: ${data.scheduledDays.join(', ')}. Assign each lesson to the correct day in order.` : ''}
     **RULE:** You must STRICTLY separate the strands.
     - **Lesson 1** ${data.scheduledDays?.[0] ? `(Day: ${data.scheduledDays[0]})` : ''} must focus ONLY on the *first* Strand/Sub-strand provided.
     - **Lesson 2** ${data.scheduledDays?.[1] ? `(Day: ${data.scheduledDays[1]})` : ''} must focus ONLY on the *second* Strand/Sub-strand provided (if available).
     - **Lesson 3** ${data.scheduledDays?.[2] ? `(Day: ${data.scheduledDays[2]})` : ''} must focus ONLY on the *third* Strand/Sub-strand provided (if available).
     - **DO NOT** combine multiple strands into a single lesson/activity session. 
     - If you run out of unique strands, you may extend the last strand or review, but NEVER squash distinct strands together.
     - **NUMBERING:** Ensure each lesson is distinctly numbered 1 to ${data.numLessons}.` : ''}
6. Assessment Methods
7. Differentiation Strategies
8. Closure/Summary (5 minutes) - Include summary of key points.
   - **Sample Class Exercises (Concept Application):** (Must be bolded) Include at least 3 questions for learners to practice.
9. Homework/Extension Activities

${curriculumFilesInfo || resourceFilesInfo ? 'Reference and incorporate content from the provided curriculum documents and resource materials where appropriate.\n\n' : ''}Format the lesson note professionally with clear sections and practical, actionable content that a teacher can use directly in the classroom.
${data.numLessons && data.numLessons > 1 ? `
**FINAL REMINDER:** You MUST generate EXACTLY ${data.numLessons} complete lesson notes, each separated by "---". Count your lessons before finishing - if you have fewer than ${data.numLessons}, continue generating more.` : ''}`;
    }

    // Pass numLessons to callAIAPI so it can allocate enough tokens
    const text = await callAIAPI(prompt, undefined, data.numLessons);
    // Apply formatting patches for requested bolding ONLY for non-JSON (text) output
    // JSON templates should not have text formatting applied as it corrupts the JSON
    if (data.template) {
      // JSON mode - return as-is without text formatting
      return text;
    }
    return formatGeneratedContent(text);
  } catch (error) {
    console.error("Error generating lesson note:", error);
    throw new Error("Failed to generate lesson note. Please check your API key and try again.");
  }
}

export async function extractCurriculumFromText(text: string): Promise<any[]> {
  const prompt = `
    You are an expert curriculum analyzer. I will provide you with text extracted from a curriculum document.
    Your task is to extract the structured curriculum data from this text.
    
    The document may contain curriculum for MULTIPLE CLASSES (e.g., Basic 4, Basic 5, and Basic 6).
    You must extract ALL curriculum units found in the text for ALL classes.
    
    The data should be structured as a JSON array of objects, where each object represents a specific "unit" or "sub-strand" of the curriculum.
    
    Each object MUST have the following fields:
    - "grade_level": The class or grade level (e.g., "Basic 1", "JHS 2"). Look for headers like "Basic 4", "B4", "Year 4".
    - "subject": The subject (e.g., "Mathematics", "Science").
    - "strand": The main strand or section title.
    - "sub_strand": The sub-strand or topic title.
    - "content_standards": An array of strings, each representing a content standard code and description (e.g., "B1.1.1.1: Count numbers...").
    - "learning_indicators": An array of strings, each representing a learning indicator.
    - "exemplars": A string containing examples or further details (optional).
    
    If the text contains multiple strands or sub-strands, create a separate object for each.
    
    Return ONLY the valid JSON array. Do not include any markdown formatting or explanation.
    
    TEXT TO ANALYZE:
    ${text.substring(0, 100000)} // Limit text length to avoid token limits
  `;

  try {
    const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON.");
    
    // Clean response
    let cleanJson = response.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error extracting curriculum:", error);
    throw new Error("Failed to extract curriculum data from the file.");
  }
}

export async function parseCurriculumPaste(text: string): Promise<{
  strand: string;
  subStrand: string;
  contentStandard: string;
  exemplars: string;
}> {
  const prompt = `
    I have a text snippet from a curriculum document. Please extract the following details:
    - Strand
    - Sub-strand
    - Content Standard
    - Learning Indicators / Exemplars

    Text:
    "${text.substring(0, 2000)}"

    Return a valid JSON object with keys: "strand", "subStrand", "contentStandard", "exemplars".
    If a field is not found, use an empty string.
    Do not include markdown formatting.
  `;

  try {
    const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON.");
    let cleanJson = response.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error parsing pasted curriculum:", error);
    return {
      strand: "",
      subStrand: "",
      contentStandard: "",
      exemplars: text // Fallback: put everything in exemplars if parsing fails
    };
  }
}

export async function parseSchemeOfLearning(text: string): Promise<Array<{
  week: string;
  weekEnding?: string;
  term: string;
  subject: string;
  classLevel: string;
  strand: string;
  subStrand: string;
  contentStandard: string;
  indicators: string;
  exemplars?: string;
  resources: string;
}>> {
  const prompt = `
    I have a text extracted from a Scheme of Learning document (likely a table). 
    Please extract the weekly plan details into a structured JSON array.

    The text typically follows column orders like: 
    Week, Week Ending, Term, Subject, Class, Strand, Sub-Strand, Content Standard, Indicators, Resources.
    
    CRITICAL INSTRUCTION:
    1. GLOBAL METADATA SEARCH: 
       - "Subject" (e.g., "Mathematics", "Science", "Computing").
       - "Class/Level" (e.g., "Basic 7", "B7", "JHS 1").
       - "Term" (e.g., "Term 1", "First Term", "Term One", "2nd Term").
       - Look for these in the document header/title if they are not in every row. 
    
    2. PROPAGATE METADATA: 
       - Apply the found Subject, Class, and Term to EVERY row in the output array.
       - If the Term is found in the header (e.g. "Scheme of Learning for Term 2"), make sure every object in the array has "term": "Term 2".

    3. WEEK ENDING SPECIFICS:
       - Look for a column or text indicating "Week Ending", "W/E", "Date", or "Period".
       - Extract the date or date range associated with each week.
       - If finding the date is difficult, look for patterns like "24th - 28th" or "Ending Friday".

    4. STRUCTURE:
       - Extract as many weeks as you can find.
    
    FORMATTING RULES:
    - "term": Normalize to "Term 1", "Term 2", or "Term 3". If text says "First Term", use "Term 1".
    - "week": Normalize to "Week 1", "Week 2", etc.
    - "strand" and "subStrand": Separte them if possible. 
    - "classLevel": Normalize to "Basic X" or "JHS X".
    
    Text:
    "${text.substring(0, 15000)}"

    Return a valid JSON array of objects with these exact keys: 
    "week", "weekEnding", "term", "subject", "classLevel", "strand", "subStrand", "contentStandard", "indicators", "exemplars", "resources".
    
    Use empty strings for missing fields rather than omitting keys.
    
    Output ONLY the JSON array. No markdown blocks.
  `;

  try {
    const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON arrays.");
    let cleanJson = response.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Attempt to fix truncated JSON
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn("JSON parse failed, attempting to repair truncated JSON...");
      // Find the last closing brace '}'
      const lastBrace = cleanJson.lastIndexOf('}');
      if (lastBrace !== -1) {
        // Cut off everything after the last object and close the array
        const repairedJson = cleanJson.substring(0, lastBrace + 1) + ']';
        try {
           const parsed = JSON.parse(repairedJson);
           console.log(`Repair successful. Recovered ${Array.isArray(parsed) ? parsed.length : 0} items.`);
           return Array.isArray(parsed) ? parsed : [];
        } catch (e2) {
           console.error("Repair failed:", e2);
           // Try one more aggressive repair: find the last "},"
           const lastCommaBrace = cleanJson.lastIndexOf('},');
           if (lastCommaBrace !== -1) {
             const repairedJson2 = cleanJson.substring(0, lastCommaBrace + 1) + ']';
             try {
                const parsed2 = JSON.parse(repairedJson2);
                return Array.isArray(parsed2) ? parsed2 : [];
             } catch (e3) {
                throw e;
             }
           }
           throw e;
        }
      }
      throw e;
    }
  } catch (error) {
    console.error("Error parsing scheme of learning:", error);
    throw new Error("Failed to parse scheme of learning data.");
  }
}

function formatGeneratedContent(text: string): string {
  if (!text) return text;
  let formatted = text;

  // 1. Recap Activity: ... (Bold the header line) - case insensitive
  formatted = formatted.replace(/(^|\n)(?!\*\*)(Recap Activity:[^\n]*)/gi, '$1**$2**');

  // 2. Quick oral quiz: (Bold the phrase) - case insensitive
  formatted = formatted.replace(/(^|\n)(?!\*\*)(Quick oral quiz:)/gi, '$1**$2**');

  // 3. Teacher summarises/summarizes the key steps for ...: (Bold the phrase)
  formatted = formatted.replace(/(^|\n)(?!\*\*)(Teacher summari[sz]es[^:]*:)/gi, '$1**$2**');

  // 4. Sample Class Exercises: (Ensure bold and double newline)
  // First, normalize any existing variations (with or without bold, with or without colon issues)
  // Then ensure double newline before and proper bolding
  formatted = formatted.replace(/\n*(\*\*)?(Sample Class Exercises):?(\*\*)?/gi, '\n\n**Sample Class Exercises:**');

  // 5. Clean up triple+ newlines to double newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // 6. Clean up potential double bolding from the replacements or AI output
  formatted = formatted.replace(/\*\*\*\*/g, '**');

  return formatted;
}
