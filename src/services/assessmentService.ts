import { toast } from "sonner";
import { callAIAPI } from "./aiService";

export type AssessmentType = "quiz" | "worksheet" | "homework" | "test";
export type DifficultyLevel = "easy" | "medium" | "hard" | "mixed";
export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching";

export interface AssessmentConfig {
  type: AssessmentType;
  subject: string;
  level: string;
  topic: string;
  difficulty: DifficultyLevel;
  questionTypes: QuestionType[];
  numberOfQuestions: number;
  includeAnswerKey: boolean;
  timeLimit?: number;
  specialNeeds?: boolean;
  ellSupport?: boolean;
  giftedExtensions?: boolean;
}

export interface Assessment {
  title: string;
  subject: string;
  level: string;
  topic: string;
  difficulty: DifficultyLevel;
  timeLimit?: number;
  instructions: string;
  questions: Question[];
  answerKey?: AnswerKey[];
  extensions?: string[];
  accommodations?: string[];
}

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  hints?: string[];
}

export interface AnswerKey {
  questionId: number;
  answer: string | string[];
  explanation?: string;
  rubric?: string;
}

export const assessmentService = {
  /**
   * Generate assessment using AI
   */
  async generateAssessment(config: AssessmentConfig): Promise<Assessment | null> {
    try {
      const prompt = this.buildAssessmentPrompt(config);
      const systemMessage = "You are an expert educator who creates high-quality, age-appropriate assessments. Generate assessments in valid JSON format only, with no additional text or markdown formatting.";

      const content = await callAIAPI(prompt, systemMessage);

      if (!content) throw new Error("No content generated");

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const assessment: Assessment = JSON.parse(jsonMatch[0]);
      
      toast.success(`${config.type.charAt(0).toUpperCase() + config.type.slice(1)} generated successfully!`);
      return assessment;
    } catch (error) {
      console.error("Error generating assessment:", error);
      toast.error("Failed to generate assessment. Please try again.");
      return null;
    }
  },

  /**
   * Build prompt for assessment generation
   */
  buildAssessmentPrompt(config: AssessmentConfig): string {
    const questionTypeInstructions = config.questionTypes.map(type => {
      switch (type) {
        case "multiple_choice":
          return "multiple choice questions with 4 options (A, B, C, D)";
        case "true_false":
          return "true/false questions";
        case "short_answer":
          return "short answer questions (1-2 sentences)";
        case "essay":
          return "essay questions with detailed rubrics";
        case "fill_blank":
          return "fill-in-the-blank questions";
        case "matching":
          return "matching questions with items and answers";
        default:
          return type;
      }
    }).join(", ");

    let prompt = `Create a ${config.type} for ${config.subject} at ${config.level} level on the topic "${config.topic}".

Difficulty: ${config.difficulty}
Number of Questions: ${config.numberOfQuestions}
Question Types: ${questionTypeInstructions}
${config.timeLimit ? `Time Limit: ${config.timeLimit} minutes` : ""}

`;

    if (config.specialNeeds) {
      prompt += `Include accommodations for special needs students:
- Clear, simple language
- Visual supports where appropriate
- Extended time suggestions
- Alternative question formats
`;
    }

    if (config.ellSupport) {
      prompt += `Include ELL (English Language Learner) support:
- Simplified vocabulary
- Context clues
- Visual aids
- Sentence frames for answers
`;
    }

    if (config.giftedExtensions) {
      prompt += `Include extensions for gifted students:
- Higher-order thinking questions
- Open-ended challenges
- Research opportunities
- Creative application tasks
`;
    }

    prompt += `
Generate the assessment in this EXACT JSON format (no markdown, no extra text):
{
  "title": "Assessment Title",
  "subject": "${config.subject}",
  "level": "${config.level}",
  "topic": "${config.topic}",
  "difficulty": "${config.difficulty}",
  ${config.timeLimit ? `"timeLimit": ${config.timeLimit},` : ""}
  "instructions": "Clear instructions for students",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "points": 2,
      "hints": ["Optional hint for struggling students"]
    }
  ],
  ${config.includeAnswerKey ? `"answerKey": [
    {
      "questionId": 1,
      "answer": "A) Option 1",
      "explanation": "Explanation of why this is correct",
      "rubric": "For essay questions, provide scoring rubric"
    }
  ],` : ""}
  ${config.giftedExtensions ? `"extensions": [
    "Extension activity 1",
    "Extension activity 2"
  ],` : ""}
  ${config.specialNeeds || config.ellSupport ? `"accommodations": [
    "Accommodation suggestion 1",
    "Accommodation suggestion 2"
  ]` : ""}
}`;

    return prompt;
  },

  /**
   * Export assessment to DOCX format
   */
  async exportToDocx(assessment: Assessment, includeAnswers: boolean): Promise<void> {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableCell, TableRow, WidthType } = await import("docx");
    const { saveAs } = await import("file-saver");

    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        text: assessment.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Subject: ", bold: true }),
          new TextRun(assessment.subject)
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Level: ", bold: true }),
          new TextRun(assessment.level)
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Topic: ", bold: true }),
          new TextRun(assessment.topic)
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Difficulty: ", bold: true }),
          new TextRun(assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1))
        ],
        spacing: { after: 100 }
      })
    );

    if (assessment.timeLimit) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Time Limit: ", bold: true }),
            new TextRun(`${assessment.timeLimit} minutes`)
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Instructions
    children.push(
      new Paragraph({
        text: "Instructions:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        text: assessment.instructions,
        spacing: { after: 300 }
      })
    );

    // Questions
    children.push(
      new Paragraph({
        text: "Questions:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 }
      })
    );

    assessment.questions.forEach((question, index) => {
      // Question number and text
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun(question.question),
            new TextRun({ text: ` (${question.points} point${question.points > 1 ? 's' : ''})`, italics: true })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      // Options for multiple choice
      if (question.options) {
        question.options.forEach(option => {
          children.push(
            new Paragraph({
              text: `   ${option}`,
              spacing: { after: 50 }
            })
          );
        });
      }

      // Answer space for short answer/essay
      if (question.type === "short_answer" || question.type === "essay") {
        children.push(
          new Paragraph({
            text: "_".repeat(80),
            spacing: { before: 100, after: 100 }
          })
        );
        if (question.type === "essay") {
          children.push(
            new Paragraph({
              text: "_".repeat(80),
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: "_".repeat(80),
              spacing: { after: 200 }
            })
          );
        }
      }
    });

    // Answer Key (if included)
    if (includeAnswers && assessment.answerKey) {
      children.push(
        new Paragraph({
          text: "",
          pageBreakBefore: true
        }),
        new Paragraph({
          text: "Answer Key",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );

      assessment.answerKey.forEach((answer, index) => {
        const question = assessment.questions.find(q => q.id === answer.questionId);
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. `, bold: true }),
              new TextRun({ text: "Answer: ", bold: true }),
              new TextRun(Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer)
            ],
            spacing: { before: 200, after: 100 }
          })
        );

        if (answer.explanation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "   Explanation: ", italics: true }),
                new TextRun(answer.explanation)
              ],
              spacing: { after: 100 }
            })
          );
        }

        if (answer.rubric) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "   Rubric: ", italics: true }),
                new TextRun(answer.rubric)
              ],
              spacing: { after: 100 }
            })
          );
        }
      });
    }

    // Extensions (if included)
    if (assessment.extensions && assessment.extensions.length > 0) {
      children.push(
        new Paragraph({
          text: "Extension Activities",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      );

      assessment.extensions.forEach((ext, index) => {
        children.push(
          new Paragraph({
            text: `${index + 1}. ${ext}`,
            spacing: { after: 100 }
          })
        );
      });
    }

    // Accommodations (if included)
    if (assessment.accommodations && assessment.accommodations.length > 0) {
      children.push(
        new Paragraph({
          text: "Suggested Accommodations",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      );

      assessment.accommodations.forEach((acc, index) => {
        children.push(
          new Paragraph({
            text: `• ${acc}`,
            spacing: { after: 100 }
          })
        );
      });
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const fileName = `${assessment.title.replace(/\s+/g, '_')}_${Date.now()}.docx`;
    saveAs(blob, fileName);

    toast.success("Assessment exported successfully!");
  }
};
