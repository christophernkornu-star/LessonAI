import type { LessonTemplate } from "@/data/lessonTemplates";
import { supabase } from "@/integrations/supabase/client";
import {
  GHANA_CONTEXT,
  getCurriculumStandard,
  getSubjectExamples,
  getDifferentiationStrategy
} from "@/data/ghanaContext";
import { extractTextFromFile } from "./fileParsingService";
import { normalizeLatexMathDelimiters } from "@/lib/textFormatting";
import { jsonrepair } from "jsonrepair"; // npm install jsonrepair

// ============================================================================
// AI Provider Configuration
//
// Two providers are supported: Gemini (default) and DeepSeek. Which one a
// given user hits is controlled by the `ai_provider` column on their row in
// the `profiles` table (see getUserContext below) — set by an admin directly
// in the database (or via whatever admin tooling you build on top of this),
// not something the end user chooses themselves. Unset / unrecognized values
// fall back to Gemini.
// ============================================================================
const GEMINI_MODEL = "gemini-3.6-flash";
const DEEPSEEK_MODEL = "deepseek-chat";

type AIProvider = "gemini" | "deepseek";

// ============================================================================
// Teaching philosophy / detail level helpers
// ============================================================================
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

function normalizeDetailLevel(detailLevel: string): string {
  return detailLevel.toLowerCase().trim().replace(/\s+/g, "-");
}

function getDetailLevelLabel(detailLevel: string): string {
  const labels: Record<string, string> = {
    "brief": "Brief",
    "moderate": "Moderate",
    "detailed": "Detailed",
    "very-detailed": "Very Detailed",
  };
  return labels[detailLevel] || labels["moderate"];
}

function getDetailLevelGuidance(detailLevel: string): string {
  const normalizedLevel = normalizeDetailLevel(detailLevel);
  const levels: Record<string, string> = {
    "brief": "Provide a concise outline with key points only. Keep explanations short and focused on essentials. Aim for brevity while covering all necessary sections. Keep Starter content compact and directly linked to the lesson objective.",
    "moderate": "Provide standard detail with clear explanations and examples. Balance thoroughness with readability. Include practical details without being overwhelming. Scale the Starter section to include a clear warm-up activity and its purpose.",
    "detailed": "Provide comprehensive explanations, multiple examples, and thorough coverage of each section. Include specific instructions, dialogue suggestions, and detailed activity descriptions. Ensure the Starter section gives a detailed opening activity with prompts and a strong link to the main learning.",
    "very-detailed": "Provide extensive detail including scripted dialogue, multiple examples for different scenarios, differentiation strategies for various learner types, detailed timing for each activity segment, and comprehensive assessment rubrics. Provide a very detailed Starter section with explicit prompts, learner responses, and a smooth transition into the main lesson."
  };
  return levels[normalizedLevel] || levels["moderate"];
}

function getDetailLevelOverride(detailLevel: string): string {
  const normalizedLevel = normalizeDetailLevel(detailLevel);
  const overrides: Record<string, string> = {
    "brief": `- For BRIEF detail level, keep the entire lesson note extremely concise.
- Use only the most essential bullet points and key phrases.
- Limit each section to one or two short sentences or a single concise bullet.
- Keep the Phase 1 Starter section very short: one clear warm-up activity and a brief link to the lesson topic.
- Do NOT add unnecessary explanation, examples, or background details.
- The Phase 1 Starter learner activity should be present as a short sentence or bullet, not left blank.
`,
    "moderate": `- For MODERATE detail level, provide clear explanations and at least one example for each major section.
- Keep content practical and teacher-friendly, without excessive elaboration.
- In the Phase 1 Starter section, include a concise warm-up activity, a clear purpose statement, and a simple connection to the main lesson.
`,
    "detailed": `- For DETAILED detail level, include comprehensive step-by-step activity instructions and at least two examples.
- Add teacher prompts, learner responses, and pacing suggestions where appropriate.
- In the Phase 1 Starter section, describe the starter activity in detail, include prompts/questions, and explain how it prepares learners for new learning.
`,
    "very-detailed": `- For VERY DETAILED level, provide extensive classroom-ready content with multiple examples, explicit teacher dialogue, and detailed timing.
- Include assessment rubrics, differentiation for different learner needs, and clear pacing for each activity segment.
- In the Phase 1 Starter section, provide a fully developed starter routine with questions, expected learner responses, and a clear transition into the main lesson.
`,
  };
  return overrides[normalizedLevel] || overrides["moderate"];
}

// ============================================================================
// Types
// ============================================================================
export interface LessonData {
  subject: string;
  level: string;
  strand: string;
  subStrand: string;
  contentStandard: string;
  indicators?: string;
  indicator?: string;
  exemplars: string;
  curriculum?: string;
  classSize?: string;
  philosophy?: string;
  teachingPhilosophy?: string;
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

  includeCoverPage?: boolean;
  schoolName?: string;
  teacherName?: string;
  subjectTeacher?: string;
  coverPageSubject?: string;
  coverPageSource?: "profiles" | "manual";

  numLessons?: number;
  scheduledDays?: string[];

  topic?: string;
  subTopic?: string;
  date?: string;
  duration?: string;
  coreCompetencies?: string;
  previousKnowledge?: string;
  references?: string;
  keywords?: string;
  learningObjectives?: string;
  teachingLearningResources?: string;
  teacherActivities?: string;
  learnerActivities?: string;
  evaluation?: string;
  assignment?: string;
  remarks?: string;
  differentiation?: string;
  assessment?: string;
  reflection?: string;
  gradeLevel?: string;
  unit?: string;
  content?: string;
  methodology?: string;
  materials?: string;
  objectives?: string;
  lesson?: number;
}

// ============================================================================
// Usage logging / eligibility
// ============================================================================
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

// Fetches the current user's suspension status and assigned AI provider in a
// single query. `ai_provider` is a column on `profiles` — set it per user
// (e.g. via the Supabase dashboard, a SQL statement, or an admin panel you
// build separately) to control which provider that account's requests go
// to. Defaults to "gemini" when unset, unrecognized, or when the profile
// can't be read at all (fail open to the default provider, not fail closed
// on an unrelated read error).
async function getUserContext(): Promise<{ provider: AIProvider }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { provider: "gemini" };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_suspended, role, ai_provider')
    .eq('id', user.id)
    .single();

  if (error) {
    console.warn("Failed to check profile/provider assignment:", error);
    return { provider: "gemini" };
  }

  const isSuspended = (profile as any)?.is_suspended === true;
  if (isSuspended) {
    throw new Error("Your account has been suspended. Please contact the administrator.");
  }

  const provider: AIProvider = (profile as any)?.ai_provider === "deepseek" ? "deepseek" : "gemini";
  return { provider };
}

// ============================================================================
// Shared edge-function invocation
//
// Both providers go through a Supabase edge function (gemini-proxy /
// deepseek-proxy) with the same shape of concerns: retry on transient
// failures (429/503, or a provider-specific "high demand"/quota message),
// prefer the real HTTP status the edge function forwards over guessing from
// text, honor a structured retryAfterSeconds hint when the edge function
// supplies one, and log usage. Pulling this into one helper means the retry
// policy only needs to be gotten right once, instead of drifting between
// two near-identical copies as each provider gets tweaked over time.
// ============================================================================
async function invokeAIEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
  extractContent: (data: any) => string | undefined,
  extractTokens: (data: any) => number,
  modelLabel: string,
): Promise<string> {
  const maxClientRetries = 2;

  for (let attempt = 0; attempt <= maxClientRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        let serverErrorMsg = error.message;
        let httpStatus: number | undefined = (error as any).context?.status;
        let retryAfterSeconds: number | undefined;

        try {
          const errorBody = await (error as any).context?.json();
          if (errorBody?.error) serverErrorMsg = errorBody.error;
          if (typeof errorBody?.retryAfterSeconds === 'number') {
            retryAfterSeconds = errorBody.retryAfterSeconds;
          }
        } catch (_e) { /* fall back to default message */ }

        const isTransient = httpStatus === 429 || httpStatus === 503 ||
          serverErrorMsg.toLowerCase().includes("quota exceeded") ||
          serverErrorMsg.toLowerCase().includes("please retry in") ||
          serverErrorMsg.toLowerCase().includes("high demand") ||
          serverErrorMsg.toLowerCase().includes("resource exhausted") ||
          serverErrorMsg.toLowerCase().includes("rate limit");

        if (isTransient && attempt < maxClientRetries) {
          const waitSecs = retryAfterSeconds ? Math.ceil(retryAfterSeconds) + 2 : 12;
          console.warn(`[Client Backoff:${functionName}] Waiting ${waitSecs}s before retrying (status ${httpStatus ?? 'unknown'})...`);
          await new Promise((r) => setTimeout(r, waitSecs * 1000));
          continue;
        }

        console.error(`${functionName} Error (status ${httpStatus ?? 'unknown'}):`, serverErrorMsg);
        throw new Error(serverErrorMsg);
      }

      const content = extractContent(data);
      if (!content) {
        console.error(`Invalid response structure from ${functionName}:`, data);
        logAIUsage(modelLabel, "text-generation", false, 0, "Invalid response structure");
        throw new Error("Invalid response from AI Service");
      }

      logAIUsage(modelLabel, "text-generation", true, extractTokens(data));
      return content;

    } catch (error: any) {
      if (attempt === maxClientRetries) {
        console.error(`Call to ${functionName} failed after retries:`, error);
        throw error;
      }
    }
  }

  throw new Error("Failed to generate content after retries.");
}

// ============================================================================
// callAIAPI — the single entry point every prompt in this file goes through.
//
// Routes to Gemini or DeepSeek based on the calling user's `ai_provider`
// assignment (see getUserContext above). Both branches accept the same
// `expectJson` flag: for Gemini this maps to generationConfig.responseMimeType
// = "application/json"; for DeepSeek it maps to response_format:
// { type: "json_object" } (DeepSeek's OpenAI-compatible JSON mode). Either
// way, the MODEL is made responsible for producing well-formed JSON —
// including correctly escaping any backslashes it emits for LaTeX (\frac,
// \times, etc.) — instead of us trying to reconstruct valid JSON from raw
// text after the fact. This is what actually fixes the "Bad escaped
// character in JSON" crash: that class of bug is a generation-time problem,
// not something a smarter regex can reliably patch afterwards.
//
// IMPORTANT: both edge functions need to forward the `expectJson` flag into
// the respective provider's request — see the gemini-proxy / deepseek-proxy
// source for exactly where. If an edge function ignores the extra field,
// everything still works exactly as before (falls back to the
// jsonrepair-based safety net elsewhere in this file) — this is a strict
// improvement, not a breaking change.
// ============================================================================
export async function callAIAPI(
  prompt: string,
  systemMessage?: string,
  numLessons?: number,
  maxTokens?: number,
  expectJson: boolean = false
): Promise<string> {
  const { provider } = await getUserContext();
  if (provider === "deepseek") {
    return callDeepSeekAPI(prompt, systemMessage, numLessons, maxTokens, expectJson);
  }
  return callGeminiAPI(prompt, systemMessage, numLessons, maxTokens, expectJson);
}

async function callGeminiAPI(
  prompt: string,
  systemMessage?: string,
  numLessons?: number,
  maxTokens?: number,
  expectJson: boolean = false
): Promise<string> {
  const defaultSystemMessage = "You are an expert educational content creator specializing in creating comprehensive, professional lesson plans for Ghanaian teachers following the National Pre-tertiary Curriculum.";

  const baseTokens = 6000;
  const tokensPerLesson = 2500;
  const calculatedMaxTokens = maxTokens
    ? maxTokens
    : (numLessons && numLessons > 1
      ? baseTokens + (numLessons * tokensPerLesson)
      : baseTokens);

  return invokeAIEdgeFunction(
    'gemini-proxy',
    {
      prompt,
      systemInstruction: systemMessage || defaultSystemMessage,
      maxOutputTokens: calculatedMaxTokens,
      model: GEMINI_MODEL,
      numLessons,
      expectJson, // edge function maps this -> generationConfig.responseMimeType
    },
    (data) => data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.choices?.[0]?.message?.content,
    (data) => data.usage?.totalTokenCount || data.usage?.total_tokens || 0,
    GEMINI_MODEL,
  );
}

async function callDeepSeekAPI(
  prompt: string,
  systemMessage?: string,
  numLessons?: number,
  maxTokens?: number,
  expectJson: boolean = false
): Promise<string> {
  const defaultSystemMessage = "You are an expert educational content creator specializing in creating comprehensive, professional lesson plans for Ghanaian teachers following the National Pre-tertiary Curriculum.";

  const baseTokens = 6000;
  const tokensPerLesson = 2500;
  // DeepSeek's max_tokens hard cap is 8192 — capped in the edge function too,
  // but capping here as well keeps the number we log/reason about accurate.
  const calculatedMaxTokens = maxTokens
    ? Math.min(maxTokens, 8192)
    : (numLessons && numLessons > 1
      ? Math.min(baseTokens + (numLessons * tokensPerLesson), 8192)
      : Math.min(baseTokens, 8192));

  return invokeAIEdgeFunction(
    'deepseek-proxy',
    {
      prompt,
      systemMessage: systemMessage || defaultSystemMessage,
      maxTokens: calculatedMaxTokens,
      model: DEEPSEEK_MODEL,
      numLessons,
      expectJson, // edge function maps this -> response_format: { type: "json_object" }
    },
    (data) => data?.choices?.[0]?.message?.content || data?.text,
    (data) => data.usage?.total_tokens || data.usage?.totalTokenCount || 0,
    DEEPSEEK_MODEL,
  );
}

// ============================================================================
// Main lesson generation
// ============================================================================
export async function generateLessonNote(originalData: LessonData): Promise<string> {
  try {
    const data = { ...originalData };
    const numLessons = data.numLessons || 1;

    // SEQUENTIAL GENERATION: process one lesson at a time to avoid RPM limits
    // and to give each lesson the model's full attention/token budget.
    if (numLessons > 1) {
      console.log(`Generating ${numLessons} lessons sequentially...`);

      const getItem = (text: string | undefined, index: number) => {
        if (!text) return "";
        const parts = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length === 0) return "";
        if (parts.length === 1) return parts[0];
        return parts[Math.min(index, parts.length - 1)];
      };

      const results: string[] = [];

      for (let index = 0; index < numLessons; index++) {
        if (index > 0) {
          // Gemini's per-minute rate limit is shared across all lessons in
          // this batch, including whatever the edge function already retried
          // internally. 1.5s was too tight and led to repeated 429s once a
          // few lessons had already consumed the minute's quota; 5s gives
          // meaningfully more headroom without making a 5-lesson batch feel slow.
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        const singleLessonData: LessonData = {
          ...data,
          numLessons: 1, // forces the single-lesson prompt path below
          strand: getItem(data.strand, index),
          subStrand: getItem(data.subStrand, index),
          contentStandard: getItem(data.contentStandard, index),
          indicators: getItem(data.indicators, index),
          exemplars: getItem(data.exemplars, index),
          scheduledDays: data.scheduledDays && data.scheduledDays[index] ? [data.scheduledDays[index]] : [],
          term: data.term,
          weekNumber: data.weekNumber,
          weekEnding: data.weekEnding,
        };

        const lessonResult = await generateLessonNote(singleLessonData);
        results.push(lessonResult);
      }

      if (data.template) {
        const validObjects: any[] = [];
        results.forEach((r, index) => {
          const processed = safeParseLessonJson(r, index, numLessons);
          validObjects.push(processed);
        });
        return JSON.stringify(validObjects);
      } else {
        const titledResults = results.map((res, index) => {
          let formattedRes = formatGeneratedContent(res);
          formattedRes = formattedRes.replace(/(\*\*|)?Lesson:?\s*1\s*of\s*1(\*\*|)?/gi, '');
          formattedRes = formattedRes.replace(/^(\*\*|)?Lesson:?\s*\d+(\s*of\s*\d+)?(\*\*|)?\s*\n*/gim, '');
          const header = `**Lesson: ${index + 1} of ${numLessons}**`;
          return `${header}\n\n${formattedRes.trim()}`;
        });
        return titledResults.join('\n\n---\n\n');
      }
    }

    // === SINGLE LESSON PATH ===
    // (numLessons is guaranteed to be 1 here — either the caller asked for 1,
    // or the sequential loop above forced it. No "generate an N-lesson JSON
    // array in one shot" branch is needed, which removes a whole class of
    // prompt complexity and token pressure.)

    const splitAndGetFirst = (text: string | undefined) => {
      if (!text) return "";
      return text.split('\n')[0].trim();
    };

    data.strand = splitAndGetFirst(data.strand);
    data.subStrand = splitAndGetFirst(data.subStrand);
    data.contentStandard = splitAndGetFirst(data.contentStandard);
    data.indicators = splitAndGetFirst(data.indicators);
    data.exemplars = splitAndGetFirst(data.exemplars);

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

    const normalizedDetailLevel = normalizeDetailLevel(data.detailLevel || 'moderate');
    const detailLevelLabel = getDetailLevelLabel(normalizedDetailLevel);
    const philosophyGuidance = getPhilosophyGuidance(data.philosophy || 'balanced');
    const detailGuidance = getDetailLevelGuidance(normalizedDetailLevel);
    const detailLevelOverride = getDetailLevelOverride(normalizedDetailLevel);

    const curriculumStandard = getCurriculumStandard(data.level);
    const subjectExamples = getSubjectExamples(data.subject);
    const differentiationStrategies = getDifferentiationStrategy('mixed');

    const isEnglishGrammar = data.subject.toLowerCase().includes('english') &&
      (data.strand.toLowerCase().includes('grammar') ||
        data.subStrand.toLowerCase().includes('grammar') ||
        (data.indicators && data.indicators.toLowerCase().includes('grammar')) ||
        (data.exemplars && data.exemplars.toLowerCase().includes('grammar')));

    const englishGrammarPrompt = isEnglishGrammar ? `
**ENGLISH GRAMMAR SPECIFIC INSTRUCTIONS (CRITICAL):**
- The lesson MUST focus strictly on the grammatical concepts specified in the Sub-Strand and Indicators.
- Do NOT generate a literature, reading comprehension, or creative writing lesson unless explicitly stated in the indicators.
- Provide clear, explicit definitions of the grammar rules being taught.
- Include at least 5-10 specific sentence examples demonstrating the grammar rule in action.
- Ensure all grammar examples use Ghanaian context (e.g., "Kofi is eating fufu" instead of "John is eating pizza").
- Include specific grammar exercises in the New Learning and Reflection activities.
` : '';

    const isGhanaianLanguage = data.subject.toLowerCase().includes('ghanaian language') ||
      data.subject.toLowerCase().includes('twi') ||
      data.subject.toLowerCase().includes('fante') ||
      data.subject.toLowerCase().includes('ewe') ||
      data.subject.toLowerCase().includes('ga') ||
      data.subject.toLowerCase().includes('dagbani');

    const languageInstruction = isGhanaianLanguage ? `
**LANGUAGE INSTRUCTIONS FOR GHANAIAN LANGUAGE SUBJECT (CRITICAL - ZERO TOLERANCE):**
- Write the ENTIRE lesson plan, including all headings, activities, and instructions, in ENGLISH ONLY.
- ABSOLUTELY NO TWI, FANTE, EWE, GA, DAGBANI, OR ANY OTHER LOCAL LANGUAGE WORDS ARE ALLOWED. ZERO EXCEPTIONS.
- If you need to refer to a local word, use a placeholder like [Insert local word].
- Focus EXCLUSIVELY on the TEACHING METHODOLOGY and classroom activities.
` : `
**LANGUAGE AND SPELLING INSTRUCTIONS (CRITICAL):**
- **USE BRITISH ENGLISH SPELLING ONLY.** (e.g., 'colour' not 'color', 'programme' not 'program', 'centre' not 'center', 'organise' not 'organize', 'analyse' not 'analyze').
`;

    const jsonEscapingInstruction = data.template ? `
**CRITICAL JSON ESCAPING RULE:**
- Your entire response MUST be a single valid JSON object — nothing else.
- Any backslash you write inside a JSON string value MUST itself be escaped as a double backslash.
  Example: to represent the LaTeX fraction one-half, write $\\\\frac{1}{2}$ in your output (NOT $\\frac{1}{2}$).
- Never write a single unescaped backslash inside a string value. This applies to every LaTeX command
  (\\\\times, \\\\sqrt, \\\\div, \\\\pm, etc.) and to any other special character.
- Paragraph breaks inside a string value must use the standard JSON newline escape \\n.
` : '';

    const ghanaContextPrompt = `
**GHANAIAN CONTEXT REQUIREMENTS (CRITICAL):**
1. Use ONLY Ghanaian names (Kwame, Akosua, Kofi, Ama, etc.) for FICTIONAL characters in word problems, story scenarios, or example sentences (e.g., "Kofi bought 3 mangoes at the market for GH¢ 6.").
2. Use ONLY Ghanaian places (Accra, Kumasi, Tamale, Cape Coast, etc.)
3. Use ONLY Ghanaian currency (Ghana cedis and pesewas)
4. Use ONLY locally available materials: ${GHANA_CONTEXT.local_materials.slice(0, 5).join(', ')}
5. Include Ghanaian values and cultural elements
6. Make it practical for real Ghanaian classroom conditions (large classes, limited resources)
7. Curriculum Standard: ${curriculumStandard}
${data.location ? `8. **LOCATION SPECIFIC CONTEXT (CRITICAL):** The school is located in **${data.location}**.
   - Think concretely about what ${data.location} is actually like — coastal/fishing, forest/farming, savannah, urban/market town, mining, etc. — and ground the lesson in THAT specific environment, not a generic or different one.
   - Use examples relevant to this specific location.
   - Mention local markets, festivals, or sites familiar to students in ${data.location}.` : ''}

**STUDENT NAMING RULE (CRITICAL):**
- Do NOT invent specific student names when giving classroom instructions — you do not know who is actually in this teacher's class, so naming real-sounding students to call on doesn't make sense in a lesson note meant to be usable by any teacher, with any class.
- This means: never write things like "Ask Kwame and Amina to come forward," "Ask learners like Kweku, Fatima, and Ekow to share examples," or "Invite Akosua or Yaw to present." Ghanaian names are for FICTIONAL characters inside word problems and example sentences ONLY (rule 1 above) — never for directing an actual learner in the room.
- Instead, use generic, name-free classroom language: "Ask two learners to come forward," "Invite a few volunteers to share examples," "Select a representative from each group to present," "Call on individual learners to respond."
- This applies throughout every phase — Starter, New Learning activities, and Reflection — not just one section.

**STARTER ACTIVITY & RESOURCES/TLR — IMMEDIATE ENVIRONMENT RULE (CRITICAL):**
${data.location ? `- The Phase 1 Starter activity and every item listed under Resources/Teaching Learning Resources (TLR), in every phase, MUST be something a teacher could realistically walk outside and find in the immediate physical environment of ${data.location} itself — not just "somewhere in Ghana."
- Match the materials to what that specific place actually has. If ${data.location} is a coastal/fishing community, favor items like nets, canoes, seashells, sand, fish crates, smoked fish. If it's a farming/forest community, favor items like leaves, seeds, farm produce, sticks, baskets, cocoa pods. If it's a savannah/pastoral area, favor items like millet stalks, calabashes, livestock-related items. If it's an urban/market town, favor items like market goods, recycled packaging, chalk, exercise books. Do NOT default to coastal items (shells, canoes, fishing nets) unless ${data.location} is actually coastal — this is a common mistake to avoid.
- If you are not certain what kind of environment ${data.location} is, default to widely available, generic classroom/community materials (stones, bottle caps, counters, manila cards) rather than guessing at a specific environment type incorrectly.` : `- No specific location was provided, so use widely available, generic Ghanaian classroom/community materials (stones, bottle caps, counters, manila cards, real objects) for the Starter activity and Resources/TLR — the kind of items available in a typical Ghanaian school regardless of exact location.`}

**RESOURCES / TEACHING MATERIALS INSTRUCTIONS:**
- Keep resources simple, relevant, and easy to obtain in a typical Ghanaian school or community.
- Focus on locally available materials (e.g., counters, stones, bottle caps, manila cards, real objects).
- Avoid requesting expensive or hard-to-find equipment.
${languageInstruction}

**CORE COMPETENCIES (CRITICAL — GROUND THESE IN THE ACTUAL ACTIVITIES):**
- Only list a competency if the activities you write actually require it. A competency is not a label you attach because it's commonly paired with the subject — it must be demonstrated by a specific task a learner does.
- Before listing Core Competencies, first write the activities. Then check each candidate competency against what you actually wrote, using this test:
  - **Communication and Collaboration** — only if learners work in pairs/groups, present to each other, or must explain/justify something to a peer or the class.
  - **Critical Thinking and Problem Solving** — only if a task requires learners to reason through an ambiguous case, justify a choice between plausible options, or work out something with more than one valid path. Reciting a definition, copying an example, or matching a term to its label does NOT count — that is recall, not critical thinking.
  - **Creativity and Innovation** — only if learners produce something original (their own sentence, example, drawing, solution) rather than reproducing a given one.
  - **Personal Development and Leadership** — only if there is genuine self-reflection, self-assessment, or a learner taking a leadership/ownership role in an activity.
  - **Digital Literacy** — only if the lesson actually uses a digital tool or device.
  - **Cultural Identity and Global Citizenship** — only if the lesson substantively engages learners with cultural values, community practices, or global connections as content — not merely because the word problems and names used are Ghanaian. Local names, places, and currency are background flavor (per the GHANAIAN EXAMPLES rule above) and do not by themselves justify this competency.
- List at most 2 competencies, and only the ones that pass the test above for THIS specific lesson's activities. It is correct and expected for some lessons to genuinely support only 1.

**FORMATTING REQUIREMENTS:**
- Start each new thought, idea, or concept on a NEW LINE.
- Use double newlines (blank line) between different sections or major ideas.
- Number activities clearly (Activity 1:, Activity 2:) with each on its own line.
- Avoid long run-on paragraphs.
- **Bolding discipline (CRITICAL):** The ONLY things you may wrap in bold (**text**) are: (1) the activity/step/phase label together with the rest of that FIRST sentence, up to and including its full stop — e.g. **Activity 1: Review the concept of a fraction as part of a whole using shaded diagrams.** — and (2) the exact phrase **Sample Class Exercises:**. After that first sentence's full stop, start a new paragraph (blank line) and write the rest of the activity as plain, unbolded text. Do NOT bold anything else anywhere — not currency amounts, not quantities, not quoted words, not variable letters (x, n, y, etc.), not any other phrase for emphasis, and not any sentence after the first one in an activity. If you are unsure whether something should be bold, leave it unbolded.
- **LaTeX Math Mode:** Wrap ALL mathematical expressions, equations, fractions, and formulas in LaTeX inline math delimiters ($...$).
  Examples: $2 + 2 = 4$, $x + 5 = 11$, $\\frac{1}{2}$, $x^{2}$
- **Ellipsis / continuing sequences:** Do NOT use \\dots, \\ldots, \\cdots, or any other LaTeX ellipsis command to show a sequence continuing (e.g., 2, 4, 6, ...). Write a plain three-dot ellipsis (...) directly as ordinary text — never inside a LaTeX command, and never inside $ $ delimiters. Only wrap genuine equations, fractions, and exponents in $...$.
${jsonEscapingInstruction}
**GHANAIAN EXAMPLES TO USE (BACKGROUND FLAVOR ONLY):**
${subjectExamples.map(ex => `- ${ex}`).join('\n')}

**DIFFERENTIATION STRATEGIES:**
${differentiationStrategies}
${englishGrammarPrompt}
`;

    let prompt = "";

    if (data.template) {
      prompt = `You are an expert educational content creator for Ghana's education system. You will be given a lesson note template with exact headings and structure. Your task is to FILL IN the template with actual content while keeping the EXACT structure and headings.

**Template Name:** ${data.template.name}
**Template Description:** ${data.template.description}

**Lesson Information to Use:**
- Subject: ${data.subject}
- Grade Level: ${data.level}
- Strand: ${data.strand}
- Sub-Strand: ${data.subStrand}
- Content Standard: ${data.contentStandard}
- Learning Indicators: ${data.indicators || "None provided"}
- Exemplars: ${data.exemplars || "None provided"}${data.schemeResources ? `\n- Resources from Scheme: ${data.schemeResources}` : ''}${curriculumFilesInfo}${resourceFilesInfo}

${ghanaContextPrompt}

**TEACHING APPROACH:**
${philosophyGuidance}

**DETAIL LEVEL:** ${detailLevelLabel}
${detailGuidance}
${detailLevelOverride}

${data.includeDiagrams ? `**DIAGRAM OUTLINES:**
Include descriptions of relevant diagrams, charts, illustrations, or visual aids that should be used during the lesson.\n` : ''}
**EXACT TEMPLATE TO FILL:**
${data.template.structure}

**HOW TO FILL THE TEMPLATE:**
- Replace {SUBJECT} with: ${data.subject}
- Replace {LEVEL} or {CLASS} with: ${data.level}
- Replace {STRAND} with: ${data.strand}
- Replace {SUB_STRAND} with: ${data.subStrand}
- Replace {CONTENT_STANDARD} with: ${data.contentStandard}
- Replace {EXEMPLARS}, {OBJECTIVES}, or {INDICATOR} with appropriate learning objectives
- Replace {LESSON_TITLE} with a descriptive title
- Replace {TERM} with: "${data.term || 'TERM'}"
- Replace {WEEK_ENDING} with: "${data.weekEnding || ''}"
- Replace {DAY} with: "${data.scheduledDays?.[0] || 'Monday'}"
- Replace {REFERENCE} with EXACTLY: "NaCCA ${data.subject} Curriculum for ${data.level}"
- Replace {CORE_COMPETENCIES} (if present) ONLY after you have written {NEW_LEARNING_ACTIVITIES} — list the competencies that pass the evidence test in the CORE COMPETENCIES section above, based on what those activities actually require learners to do. Do not fill this field from a generic list.
- For {STARTER_ACTIVITIES} and every {..._RESOURCES} field (Starter, New Learning, Reflection): follow the STARTER ACTIVITY & RESOURCES/TLR — IMMEDIATE ENVIRONMENT RULE above. ${data.location ? `List only items realistically found in and around ${data.location} specifically.` : 'List only widely available, generic Ghanaian classroom/community materials.'}
- For {REFLECTION_ACTIVITIES}: Include summary closure, double newline, then "**Sample Class Exercises:**" followed by 3 questions.
- For {NEW_LEARNING_ACTIVITIES}: Format each activity starting with **Activity 1: <first sentence ending in a full stop>**, then a blank line, then the rest of that activity's content as plain unbolded text. Repeat for Activity 2, Activity 3, etc. Never bold anything beyond that first sentence (no bolding numbers, quoted words, or variable letters in the body).

**OUTPUT FORMAT:**
- Your response must be ONLY the JSON object — no markdown fences, no commentary before or after.

BEGIN THE FILLED TEMPLATE NOW:`;
    } else {
      prompt = `You are an expert educational content creator for Ghana's education system. Generate a comprehensive, professional lesson note based on the following information:

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

**DETAIL LEVEL:** ${detailLevelLabel}
${detailGuidance}
${detailLevelOverride}

Please create a lesson note that includes:
1. Lesson Title
2. Learning Objectives (at least 3)
3. Materials Needed
4. Starter Activity (5-10 minutes)
5. Main Teaching Activities (30-40 minutes) - Use **Activity 1:**, **Activity 2:**
6. Core Competencies — list these LAST, after writing the activities above, and only include ones that pass the evidence test in the CORE COMPETENCIES section above
7. Assessment Methods
8. Differentiation Strategies
9. Closure/Summary (5 minutes) - Include **Sample Class Exercises:** with 3 application questions.
10. Homework/Extension Activities`;
    }

    const text = await callAIAPI(prompt, undefined, data.numLessons, undefined, !!data.template);

    if (data.template) {
      return JSON.stringify(safeParseLessonJson(text, 0, 1));
    }
    return formatGeneratedContent(text);
  } catch (error) {
    console.error("Error generating lesson note:", error);
    throw new Error("Failed to generate lesson note. Please check your API key and try again.");
  }
}

// ============================================================================
// Extraction helpers (all JSON-producing -> use expectJson: true)
// ============================================================================
export async function extractCurriculumFromText(text: string): Promise<any[]> {
  const prompt = `
    Extract structured curriculum units from this text as a JSON array of objects.
    Each object must contain:
    - "grade_level"
    - "subject"
    - "strand"
    - "sub_strand"
    - "content_standards" (array of strings)
    - "learning_indicators" (array of strings)
    - "exemplars" (string)
    - "page_reference" (string)

    Return ONLY the valid JSON array.
    TEXT:
    ${text.substring(0, 100000)}
  `;

  const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON.", undefined, undefined, true);
  return parseJsonSafely(response, []);
}

export async function parseCurriculumPaste(text: string): Promise<{
  strand: string;
  subStrand: string;
  contentStandard: string;
  exemplars: string;
}> {
  const prompt = `
    Extract from this text snippet: "strand", "subStrand", "contentStandard", "exemplars".
    Return a strict JSON object.
    Text: "${text.substring(0, 2000)}"
  `;

  try {
    const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON.", undefined, undefined, true);
    return parseJsonSafely(response, {
      strand: "",
      subStrand: "",
      contentStandard: "",
      exemplars: text
    });
  } catch (error) {
    console.error("Error parsing pasted curriculum:", error);
    return { strand: "", subStrand: "", contentStandard: "", exemplars: text };
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
    Extract weekly plan details from this Scheme of Learning into a JSON array of objects with keys:
    "week", "weekEnding", "term", "subject", "classLevel", "strand", "subStrand", "contentStandard", "indicators", "exemplars", "resources".
    Normalize term to "Term 1", "Term 2", or "Term 3". Normalize class to "Basic X" or "JHS X".

    Text: "${text.substring(0, 15000)}"
  `;

  const response = await callAIAPI(prompt, "You are a data extraction assistant that outputs strict JSON arrays.", undefined, undefined, true);
  return parseJsonSafely(response, []);
}

// ============================================================================
// JSON parsing — robust, single code path
//
// This replaces the old hand-rolled sanitizeJsonString + manual repair pass.
// jsonrepair handles unescaped control characters, bad/invalid escapes,
// trailing commas, unterminated strings, markdown code fences, etc. in one
// well-tested pass. Combined with `expectJson` above (which asks Gemini to
// emit valid JSON directly), this should be needed only rarely as a safety net.
// ============================================================================
function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

function parseJsonSafely<T>(raw: string, fallback: T): T {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Direct JSON.parse failed, attempting repair:", e);
    try {
      return JSON.parse(jsonrepair(cleaned));
    } catch (repairErr) {
      console.error("jsonrepair could not recover valid JSON:", repairErr);
      return fallback;
    }
  }
}

/**
 * Parses a single lesson's JSON, applies LaTeX/formatting normalization to
 * every string field, and updates the lesson title numbering. Falls back to
 * a clearly-marked error object (never throws) so callers can always index
 * into the result array.
 */
function safeParseLessonJson(jsonStr: string, index: number, totalLessons: number): any {
  const cleaned = stripCodeFences(jsonStr).replace(/,\s*$/, '');

  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    try {
      obj = JSON.parse(jsonrepair(cleaned));
    } catch (repairErr) {
      console.warn(`Lesson ${index} JSON could not be parsed or repaired, using fallback.`, repairErr);
      return {
        error: "This lesson's JSON format was interrupted or corrupted.",
        raw_content: cleaned.substring(0, 200) + "..."
      };
    }
  }

  if (Array.isArray(obj)) {
    obj = obj[index] ?? obj[0] ?? {};
  }

  const processedObj = formatValueDeep(obj);

  const titleKeys = ['title', 'lessonTitle', 'topic', 'lesson_title'];
  for (const k of titleKeys) {
    if (processedObj[k] && typeof processedObj[k] === 'string' && /Lesson\s*:?\s*1\b/i.test(processedObj[k])) {
      processedObj[k] = processedObj[k].replace(/Lesson\s*:?\s*1\b/i, `Lesson ${index + 1}`);
      if (!processedObj[k].includes(`of ${totalLessons}`)) {
        processedObj[k] += ` of ${totalLessons}`;
      }
    }
  }

  return processedObj;
}

// Strips EVERY bold marker (**) the model produced, then re-applies bold to
// the activity/step/phase/part label PLUS the rest of that first sentence,
// up to (and including) its first full stop — then breaks to a new line so
// everything after the full stop is plain text on its own line.
//
// e.g. "Activity 1: Review the concept of a fraction as part of a whole
// using shaded diagrams. Draw rectangles on the board..." becomes:
//   **Activity 1: Review the concept of a fraction as part of a whole
//   using shaded diagrams.**
//
//   Draw rectangles on the board...
//
// The model tends to also bold numbers, currency amounts, quoted words, and
// variable letters throughout an activity's body (e.g. "GH₵ **15**",
// "**'**unknown**'**") — since a DOCX run has no concept of "partially
// bold", wrapping most of a paragraph's words in ** individually makes the
// entire paragraph (or a large uncontrolled chunk of it) read as solid bold
// in Word, even though only fragments were marked. Stripping every ** first
// and re-adding it ONLY for this one controlled pattern guarantees the bold
// span is always exactly "label + first sentence" — nothing more, nothing
// less — regardless of what the model did with the rest of the text.
//
// The pattern is NOT anchored to start-of-line: the model doesn't reliably
// put every "Activity N:" on its own line to begin with (they can appear
// mid-paragraph, run straight on from the previous activity's last
// sentence), so this matches "Activity N:" wherever it occurs. Inserting a
// blank line (double newline) both before and after the bolded sentence
// also fixes that case — each activity ends up on its own paragraph even if
// the source text had them all run together. Double newlines are used
// (rather than single) specifically so `collapseStraySingleNewlines` below
// — which only touches single newlines — never merges this break back into
// a space. A period immediately followed by a digit (e.g. "3.5") is treated
// as a decimal point, not a sentence end, so it doesn't prematurely cut the
// bold span short.
//
// It must run BEFORE the header-specific bold-adding regexes below (Sample
// Class Exercises, Recap Activity, etc.), since those add their own fresh
// ** and would otherwise get stripped right back out.
function normalizeActivityBolding(text: string): string {
  if (!text) return text;
  const stripped = text.replace(/\*\*/g, '');
  return stripped
    .replace(
      /\s*((?:Activity|Step|Part|Phase)\s+\d+\s*:\s*[^.\n]*\.(?!\d))\s*/gi,
      (match, sentence: string) => `\n\n**${sentence.trim()}**\n\n`
    )
    .trim();
}

// Converts LaTeX ellipsis commands (\dots, \ldots, \cdots, \ddots, \dotsc,
// \dotsb) into a plain ellipsis character, whether or not they're wrapped in
// $ $. This is not "math" that a $...$ wrapper can make render correctly —
// there's no LaTeX/OMML engine on the DOCX side, just a plain text run, so
// any LaTeX command that isn't converted to real characters shows up as
// literal backslash-text (e.g. "GH¢ 20, \dots"). The prompt instructs the
// model to avoid this in the first place; this is the defensive backstop for
// whenever it slips through anyway.
function normalizeLatexEllipsis(text: string): string {
  if (!text) return text;
  return text
    .replace(/\$\s*\\(?:dots|ldots|cdots|ddots|dotsc|dotsb)\s*\$/g, '…')
    .replace(/\\(?:dots|ldots|cdots|ddots|dotsc|dotsb)/g, '…');
}

// Collapses stray single line-breaks that land mid-sentence (e.g. the model
// wrote "...will be in\nGroup 4 and\nGroup\n5." instead of one flowing
// sentence, or "...secret number is\n7. Purpose:" instead of "...is 7.
// Purpose:") into a plain space. A *real* paragraph break (two or more
// consecutive newlines) is left alone, and a newline is also left alone if
// it looks like genuine list/header structure: what follows starts a bullet,
// numbered item, or bold header, AND what precedes it actually ends a
// sentence (or is the very start of the field) — a bare number straight
// after a verb like "is" doesn't count, even though "7. Purpose:" alone
// looks list-item-shaped.
//
// Implementation note: this matches ONLY the newline character itself, using
// a lookbehind for the preceding character and inspecting several characters
// of context on both sides via the replacer's (match, offset, string)
// arguments — it does not capture/consume the surrounding characters into
// the match. An earlier version captured single characters on each side of
// the newline (`([^\n])\n(?!\n)([^\n])`), which meant the "is this a
// numbered list item?" check only ever had ONE character of lookahead to
// test against a pattern that needs 3+ (`\d+[.)]\s`) — so that protection
// could never actually fire.
function collapseStraySingleNewlines(text: string): string {
  if (!text) return text;
  return text.replace(/(?<=[^\n\r])\r?\n(?!\n)/g, (match, offset: number, full: string) => {
    const after = full.slice(offset + match.length, offset + match.length + 10);

    // Bullets ("- ", "• ") and bold headers ("**...") are unambiguous
    // structural markers — they essentially never appear by accident, so
    // always preserve the line break before them.
    if (/^(\*\*|[-•]\s)/.test(after)) return match;

    // A bare "digit + '.'/')' + space" is genuinely ambiguous: it's either a
    // numbered list item ("1. Extend the pattern...") or just a number that
    // happens to end the previous sentence ("...the secret number is\n7.
    // Purpose:"). Only treat it as a list item if what precedes the break
    // actually ends a sentence/section (or the break is at the very start of
    // the field) — a bare number straight after a verb like "is" doesn't
    // qualify, even though "7. Purpose:" alone looks list-item-shaped.
    if (/^\d+[.)]\s/.test(after)) {
      const before = full.slice(Math.max(0, offset - 12), offset);
      const precededBySentenceEnd = before.trim().length === 0 || /[.:!?]\s*$/.test(before);
      if (precededBySentenceEnd) return match;
    }

    return ' ';
  });
}

function formatValueDeep(val: any): any {
  if (typeof val === 'string') {
    let formatted = normalizeLatexMathDelimiters(val);
    formatted = normalizeActivityBolding(formatted);
    formatted = normalizeLatexEllipsis(formatted);
    formatted = collapseStraySingleNewlines(formatted);
    formatted = wrapMathInLatex(formatted);
    formatted = normalizeLatexMathDelimiters(formatted);
    formatted = formatted.replace(
      /(\n|^)[ \t]*(\*\*|)[ \t]*Sample Class Exercises.*?:?[ \t]*(\*\*|)[ \t]*(\n|$)/gi,
      '\n\n**Sample Class Exercises:**\n'
    );
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    const mergePattern = /(\**(?:Activity|Step|Part|Phase)\s+\d+(?::|.*?:)?\**)\s*[\r\n]+\s*/gi;
    formatted = formatted.replace(mergePattern, '$1 ');
    return formatted;
  }
  if (Array.isArray(val)) {
    return val.map(formatValueDeep);
  }
  if (typeof val === 'object' && val !== null) {
    const newObj: any = {};
    for (const k in val) newObj[k] = formatValueDeep(val[k]);
    return newObj;
  }
  return val;
}

// ============================================================================
// LaTeX / text formatting for plain-text (non-JSON) responses
// ============================================================================
function normalizeMathDelimiters(text: string): string {
  return normalizeLatexMathDelimiters(text);
}

function wrapMathInLatex(text: string): string {
  if (!text) return text;

  const normalizedText = normalizeMathDelimiters(text);

  const replaceOutsideMath = (
    input: string,
    regex: RegExp,
    replacer: (match: string, ...groups: string[]) => string
  ): string => {
    return input
      .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
      .map((segment) => {
        if (segment.startsWith('$$') && segment.endsWith('$$')) return segment;
        if (segment.startsWith('$') && segment.endsWith('$')) return segment;
        return segment.replace(regex, replacer as any);
      })
      .join('');
  };

  let result = normalizedText;

  result = replaceOutsideMath(
    result,
    /\\(?:cancel|frac|sqrt|leq|geq|neq|lt|gt|times|div|pm|approx)\{[^}\n]+\}(?:\{[^}\n]+\})?/g,
    (match) => `$${match}$`
  );

  result = replaceOutsideMath(
    result,
    /(?<![a-zA-Z])([a-zA-Z])\s*=\s*([\d(a-zA-Z+\-*/^.() ]+?)(?=\s*(?:,|\.|;|\n|$))/g,
    (match, variable, expression) => {
      if (/[-+*/^\d()]/.test(expression) && expression.trim().length > 0) {
        return `$${variable} = ${expression.trim()}$`;
      }
      return match;
    }
  );

  result = replaceOutsideMath(
    result,
    /(\(?\d+(?:\.\d+)?(?:\s*[+\-*/]\s*\d+(?:\.\d+)?)*\)?\s*[\+\-\*\/]\s*\(?\d+(?:\.\d+)?(?:\s*[+\-*/]\s*\d+(?:\.\d+)?)*\)?\s*=\s*\d+(?:\.\d+)?)/g,
    (match) => `$${match}$`
  );

  result = replaceOutsideMath(
    result,
    /(?<![\d\w/])([1-9]\d?)\/([1-9]\d?)(?![\d\w/])/g,
    (match) => `$${match}$`
  );

  return normalizeMathDelimiters(result);
}

function formatGeneratedContent(text: string): string {
  if (!text) return text;
  let formatted = text;

  formatted = normalizeLatexMathDelimiters(formatted);
  formatted = normalizeActivityBolding(formatted);
  formatted = normalizeLatexEllipsis(formatted);
  formatted = collapseStraySingleNewlines(formatted);
  formatted = wrapMathInLatex(formatted);
  formatted = normalizeLatexMathDelimiters(formatted);

  formatted = formatted.replace(/(^|\n)(?!\*\*)(Recap Activity:[^\n]*)/gi, '$1**$2**');
  formatted = formatted.replace(/(^|\n)(?!\*\*)(Quick oral quiz:)/gi, '$1**$2**');
  formatted = formatted.replace(/(^|\n)(?!\*\*)(Teacher summari[sz]es[^:]*:)/gi, '$1**$2**');
  formatted = formatted.replace(/(\n|^)[ \t]*(\*\*|)[ \t]*Sample Class Exercises.*?:?[ \t]*(\*\*|)[ \t]*(\n|$)/gi, '\n\n**Sample Class Exercises:**\n');

  const mergePattern = /(\**(?:Activity|Step|Part|Phase)\s+\d+(?::|.*?:)?\**)\s*[\r\n]+\s*/gi;
  formatted = formatted.replace(mergePattern, '$1 ');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.replace(/\*{4,}/g, '**');

  return formatted;
}
