import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

interface LessonNoteData {
  weekEnding: string;
  day: string;
  subject: string;
  duration: string;
  strand: string;
  class: string;
  classSize: string;
  subStrand: string;
  contentStandard: string;
  indicator: string;
  lesson: string;
  performanceIndicator: string;
  coreCompetencies: string;
  keywords: string;
  reference: string;
  phases: {
    phase1_starter: {
      duration: string;
      learnerActivities: string;
      resources: string;
    };
    phase2_newLearning: {
      duration: string;
      learnerActivities: string;
      resources: string;
    };
    phase3_reflection: {
      duration: string;
      learnerActivities: string;
      resources: string;
    };
  };
}

/**
 * Load template file from URL or uploaded file
 */
async function loadTemplate(templateUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Failed to load template: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

/**
 * Generate lesson note from DOCX template using docxtemplater
 * 
 * @param data - The lesson note data to fill into the template
 * @param templateUrl - URL to the DOCX template file (e.g., from Supabase storage or public folder)
 * @param outputFileName - Name for the downloaded file
 */
export async function generateLessonNoteFromTemplate(
  data: LessonNoteData,
  templateUrl: string,
  outputFileName: string = "lesson-note.docx"
): Promise<void> {
  try {
    // Load the template file
    const content = await loadTemplate(templateUrl);

    // Load the content into PizZip
    const zip = new PizZip(content);

    // Create a docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set the template data
    doc.setData({
      weekEnding: data.weekEnding,
      day: data.day,
      subject: data.subject,
      duration: data.duration,
      strand: data.strand,
      class: data.class,
      classSize: data.classSize,
      subStrand: data.subStrand,
      contentStandard: data.contentStandard,
      indicator: data.indicator,
      lesson: data.lesson,
      performanceIndicator: data.performanceIndicator,
      coreCompetencies: data.coreCompetencies,
      keywords: data.keywords,
      reference: data.reference,

      // Phase 1 - Starter
      phase1_duration: data.phases.phase1_starter.duration,
      phase1_activities: data.phases.phase1_starter.learnerActivities,
      phase1_resources: data.phases.phase1_starter.resources,

      // Phase 2 - New Learning
      phase2_duration: data.phases.phase2_newLearning.duration,
      phase2_activities: data.phases.phase2_newLearning.learnerActivities,
      phase2_resources: data.phases.phase2_newLearning.resources,

      // Phase 3 - Reflection
      phase3_duration: data.phases.phase3_reflection.duration,
      phase3_activities: data.phases.phase3_reflection.learnerActivities,
      phase3_resources: data.phases.phase3_reflection.resources,
    });

    // Render the document (replace all placeholders)
    doc.render();

    // Generate the output as a blob
    const output = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Download the file
    saveAs(output, outputFileName);

    console.log("Lesson note generated successfully:", outputFileName);
  } catch (error) {
    console.error("Error generating lesson note from template:", error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes("Unclosed tag")) {
        throw new Error("Template error: Unclosed tag found. Please check your template placeholders.");
      } else if (error.message.includes("Unopened tag")) {
        throw new Error("Template error: Unopened tag found. Please check your template placeholders.");
      }
    }
    
    throw new Error("Failed to generate lesson note from template");
  }
}

/**
 * Parse JSON response and generate lesson note from template
 */
export async function generateLessonFromJson(
  jsonData: string | LessonNoteData,
  templateUrl: string,
  fileName?: string
): Promise<void> {
  try {
    // Parse JSON if string
    const lessonData: LessonNoteData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    // Generate filename if not provided
    const outputFileName = fileName || generateLessonFileName(lessonData);

    // Generate the document
    await generateLessonNoteFromTemplate(lessonData, templateUrl, outputFileName);
  } catch (error) {
    console.error("Error generating lesson from JSON:", error);
    throw new Error("Failed to generate lesson note. Please check the data format.");
  }
}

/**
 * Generate filename based on lesson data
 */
export function generateLessonFileName(data: LessonNoteData): string {
  const date = new Date().toISOString().split('T')[0];
  const subject = data.subject.replace(/\s+/g, '-').toLowerCase();
  const classLevel = data.class.replace(/\s+/g, '-').toLowerCase();
  return `lesson-${subject}-${classLevel}-${date}.docx`;
}

/**
 * Validate lesson data structure
 */
export function validateLessonData(data: any): data is LessonNoteData {
  return (
    typeof data === 'object' &&
    typeof data.weekEnding === 'string' &&
    typeof data.day === 'string' &&
    typeof data.subject === 'string' &&
    typeof data.phases === 'object' &&
    typeof data.phases.phase1_starter === 'object' &&
    typeof data.phases.phase2_newLearning === 'object' &&
    typeof data.phases.phase3_reflection === 'object'
  );
}
