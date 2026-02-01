import { 
  Document, 
  Paragraph, 
  TextRun, 
  Table, 
  TableCell, 
  TableRow, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  VerticalAlign, 
  Packer, 
  HeadingLevel,
  ShadingType,
  HeightRule,
  Footer,
  TableLayoutType
} from "docx";
import { saveAs } from "file-saver";

interface GhanaLessonData {
  term?: string;
  weekNumber?: string;
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

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

import { 
  cleanAndSplitText, 
  parseMarkdownLine, 
  capitalizeFirstLetter 
} from "@/lib/textFormatting";

function createCell(
  text: string, 
  bold: boolean = false, 
  columnSpan: number = 1, 
  isHeader: boolean = false,
  splitBold: boolean = false, // New parameter for label:value format
  width?: { size: number; type: any } // Optional explicit width
): TableCell {
  const paragraphs: Paragraph[] = [];
  
  if (splitBold && text.includes(':')) {
    // Split at first colon, bold the label, normal text for value
    const [label, ...valueParts] = text.split(':');
    const value = valueParts.join(':'); // Rejoin in case value has colons
    
    // Handle multiple lines in the value part (e.g. for Indicators)
    const lines = cleanAndSplitText(value);

    if (lines.length === 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ 
              text: label + ':', 
              bold: true,
              size: 20,
              font: "Segoe UI",
            }),
            new TextRun({ 
              text: " ", 
              bold: false,
              size: 20,
              font: "Segoe UI",
            })
          ],
          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 80, after: 80 },
        }));
    } else {
        lines.forEach((line, index) => {
            const children: TextRun[] = [];
            
            // For the first line, include the Label
            if (index === 0) {
                children.push(new TextRun({ 
                  text: label + ':', 
                  bold: true,
                  size: 20,
                  font: "Segoe UI",
                }));
                // Add first line text, ensure space
                children.push(new TextRun({ 
                  text: ' ' + line.trim(), 
                  bold: false,
                  size: 20,
                  font: "Segoe UI",
                }));
            } else {
                // Subsequent lines
                children.push(new TextRun({ 
                    text: line.trim(), 
                    bold: false,
                    size: 20,
                    font: "Segoe UI",
                }));
            }

            paragraphs.push(new Paragraph({
              children: children,
              alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
              // Tighter spacing between lines of the same field, but normal spacing around the whole block
              spacing: {
                before: index === 0 ? 80 : 40,
                after: index === lines.length - 1 ? 80 : 0,
              },
            }));
        });
    }

  } else {
    // Process text to handle newlines and formatting
    const lines = cleanAndSplitText(text);
    
    for (const line of lines) {
        let trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check for specific headers to force-bold ONLY if they aren't already markdown bolded
        // We check a "clean" version just for detection logic
        const contentForCheck = trimmedLine.replace(/\*\*/g, '');
        let forceBold = false;
        
        // Handle list items ending in colon (bold them)
        // Check for colon at end, ignoring trailing bold markers or minimal whitespace
        if (trimmedLine.replace(/[\*_]+$/, '').trim().endsWith(':')) {
             forceBold = true;
        }

        // Check if this is an Activity/Step/Part/Phase line - make it bold
        if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(contentForCheck)) {
            forceBold = true;
        }

        // Handle Markdown Headers (e.g. # Title, ## Subtitle)
        if (trimmedLine.match(/^#+\s/)) {
            trimmedLine = trimmedLine.replace(/^#+\s/, '');
            forceBold = true;
        }

        // Handle Bullet Points (e.g. - Item, * Item)
        if (trimmedLine.match(/^[-*]\s/)) {
            trimmedLine = trimmedLine.replace(/^[-*]\s/, '• ');
        }
        
        // Removed the specific colon check here because we moved it up to be more general
        
        const children: TextRun[] = [];
        
        if (forceBold) {
             // If we're forcing bold, we use the clean text to avoid printing the stars
             const textToPrint = trimmedLine.replace(/\*\*/g, '');
             children.push(new TextRun({ 
                text: textToPrint, 
                bold: true,
                size: 20, 
                font: "Segoe UI" 
            }));
        } else {
            // Parse for any markdown formatting (bold, italic)
            // parseMarkdownLine in textFormatting.ts handles **bold**
            const tokens = parseMarkdownLine(trimmedLine);
        
            for (const token of tokens) {
                children.push(new TextRun({ 
                    text: token.text, 
                    bold: bold || token.bold, 
                    italics: token.italic,
                    size: 20, 
                    font: "Segoe UI" 
                }));
            }
            
            // Fallback if no tokens
            if (children.length === 0 && trimmedLine) {
                children.push(new TextRun({ 
                    text: trimmedLine, 
                    bold: bold,
                    size: 20, 
                    font: "Segoe UI" 
                }));
            }
        }
        
        let spacingBefore = 80;
        // Add extra spacing for specific headers to create a visual break (simulating double newline)
        if (/Sample Class Exercises/i.test(trimmedLine)) {
            spacingBefore = 400; // ~20pt spacing (approx 2 lines)
        }

        paragraphs.push(new Paragraph({
            children: children,
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: spacingBefore, after: 80 }
        }));
    }
    
    // Fallback if no paragraphs created (empty text)
    if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: "", size: 20, font: "Segoe UI" })],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 80, after: 80 }
        }));
    }
  }

  return new TableCell({
    children: paragraphs,
    borders: tableBorders,
    columnSpan,
    verticalAlign: VerticalAlign.TOP,
    shading: isHeader ? {
      fill: "D9D9D9", // Gray background for phase headers
      type: ShadingType.CLEAR,
    } : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
    width: width, // Use explicit width if provided, otherwise let grid/auto handle it
  });
}

/**
 * Remove "Activity N:" prefix from text
 */
function cleanActivityPrefix(text: string): string {
  if (!text) return "";
  // Remove "Activity 1:", "Activity 1", etc from start of string or lines
  let cleaned = text.replace(/^(Activity\s+\d+:?)/i, '');
  cleaned = cleaned.replace(/\n(Activity\s+\d+:?)/gi, '\n');
  return cleaned.trim();
}

/**
 * Capitalize the first letter of the string
 */
function capitalizeWords(text: string): string {
  return capitalizeFirstLetter(text);
}

/**
 * Format subject by capitalizing first letter of each word
 */
function formatSubject(subject: string): string {
  return subject.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/**
 * Format term to ensure it has "TERM" prefix if needed
 */
function formatTerm(term: string): string {
  if (!term) return 'FIRST TERM';
  const cleanTerm = term.trim().toUpperCase();
  
  // If it's just a number (e.g. "1"), return "TERM 1"
  if (/^\d+$/.test(cleanTerm)) return `TERM ${cleanTerm}`;
  
  // If it's "FIRST", "SECOND", "THIRD", append "TERM"
  if (['FIRST', 'SECOND', 'THIRD'].includes(cleanTerm)) return `${cleanTerm} TERM`;
  
  return cleanTerm;
}

/**
 * Format week to ensure it has "WEEK" prefix if needed
 */
function formatWeek(week: string): string {
  if (!week) return 'WEEK 1';
  const cleanWeek = week.trim().toUpperCase();
  
  // If it's just a number (e.g. "5"), return "WEEK 5"
  if (/^\d+$/.test(cleanWeek)) return `WEEK ${cleanWeek}`;
  
  // If it doesn't start with "WEEK", prepend it
  if (!cleanWeek.startsWith('WEEK')) return `WEEK ${cleanWeek}`;
  
  return cleanWeek;
}

/**
 * Format class by adding space between 'Basic' and number and ensuring Title Case
 * e.g., 'Basic6' -> 'Basic 6', 'basic 1' -> 'Basic 1'
 */
function formatClass(classText: string): string {
  if (!classText) return "";
  // First normalize spacing: Add space between 'Basic' and number if missing
  let formatted = classText.replace(/([A-Za-z]+)(\d+)/g, '$1 $2');
  
  // Title Case (Capitalize first letter of each word)
  formatted = formatted.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return formatted;
}

/**
 * Clean Content Standard to remove duplicated codes
 * e.g. "B1.2.1.1.: B1.2.1.1. Demonstrate" -> "B1.2.1.1: Demonstrate"
 */
function cleanContentStandard(text: string): string {
  if (!text) return "";
  
  // Check for duplicated code pattern
  // Matches "CODE.:|:|." or "CODE: CODE"
  // Group 1 is the code.
  const match = text.match(/^([A-Z0-9.]+)(?:\.:|:|.)\s*\1\.?\s*(.*)/i);
  
  if (match) {
    // Return Code + formatted text
    // match[1] is the code, match[2] is the rest
    return `${match[1]}: ${match[2]}`;
  }
  
  return text;
}


/**
 * Get abbreviation for subject
 */
function getSubjectAbbreviation(subject: string): string {
  if (!subject) return "SUBJ";
  
  const map: Record<string, string> = {
    "MATHEMATICS": "MATH",
    "MATHS": "MATH",
    "SCIENCE": "SCI",
    "RELIGIOUS AND MORAL EDUCATION": "RME",
    "RELIGIOUS & MORAL EDUCATION": "RME",
    "COMPUTING": "COMP",
    "INFORMATION AND COMMUNICATION TECHNOLOGY": "ICT",
    "ICT": "ICT",
    "CREATIVE ARTS": "C.ART",
    "OUR WORLD OUR PEOPLE": "OWOP",
    "HISTORY": "HIST",
    "GHANAIAN LANGUAGE": "GH.LANG",
    "ENGLISH LANGUAGE": "ENG",
    "ENGLISH": "ENG",
    "FRENCH": "FRE",
    "PHYSICAL EDUCATION": "PE",
    "CAREER TECHNOLOGY": "C.TECH",
    "SOCIAL STUDIES": "S.STD",
    "HOME ECONOMICS": "HE",
    "PRE-TECHNICAL SKILLS": "PTS"
  };
  
  const upperSubject = subject.toUpperCase().trim();
  // Check exact match
  if (map[upperSubject]) return map[upperSubject];
  
  // Check partial match for some common ones
  if (upperSubject.includes("RELIGIOUS")) return "RME";
  if (upperSubject.includes("OUR WORLD")) return "OWOP";
  if (upperSubject.includes("CREATIVE")) return "C.ART";
  if (upperSubject.includes("CAREER")) return "C.TECH";
  
  // Default: First 3-4 chars
  return upperSubject.substring(0, 4).replace(/\s/g, '');
}

/**
 * Get abbreviation for class
 */
function getClassAbbreviation(className: string): string {
  if (!className) return "CLS";
  
  const upperClass = className.toUpperCase().trim();
  
  if (upperClass.includes("BASIC")) {
    return upperClass.replace("BASIC", "B").replace(/\s/g, "");
  }
  if (upperClass.includes("KG")) {
    return upperClass.replace(/\s/g, "");
  }
  if (upperClass.includes("JHS")) {
    return upperClass.replace(/\s/g, "");
  }
  if (upperClass.includes("YEAR")) {
    return upperClass.replace("YEAR", "Y").replace(/\s/g, "");
  }
  
  return upperClass.replace(/\s/g, "");
}

/**
 * Get abbreviation for week
 */
function getWeekAbbreviation(week: string): string {
  if (!week) return "WK1";
  
  const upperWeek = week.toUpperCase().trim();
  const numberMatch = upperWeek.match(/\d+/);
  
  if (numberMatch) {
    return `WK${numberMatch[0]}`;
  }
  return "WK";
}

/**
 * Clean strand/sub-strand text by removing prefixes like "Strand 1:", "Sub-strand 1:", "1:"
 */
function cleanStrandOrSubStrand(text: string): string {
  if (!text) return "";
  // Remove "Strand X:", "Sub Strand X:", "Sub-strand X:", "X:" (where X is a number)
  // Also handle cases where there might be spaces around the colon
  return text.replace(/^(?:Strand|Sub[- ]?Strand)?\s*\d+\s*:\s*/i, "").trim();
}

/**
 * Ensure Performance Indicator starts with the standard phrase
 */
function ensurePerformanceIndicatorPrefix(text: string): string {
  if (!text) return "";
  const prefix = "By the end of the lesson, learners will be able to";
  
  // Clean up the text first
  let cleanText = text.trim();
  
  // If it already starts with the prefix (case insensitive), just return it (maybe fix casing?)
  if (cleanText.toLowerCase().startsWith(prefix.toLowerCase())) {
     // Check if it has the colon
     const match = cleanText.match(new RegExp(`^${prefix}[:]?`, 'i'));
     if (match) {
        // preserve the logic, maybe just standardise the prefix?
        // Let's just assume if it's there it's fine, but maybe ensure the colon is handled in the text
        return cleanText;
     }
  }
  
  return `${prefix}: ${cleanText}`;
}

/**
 * Convert Ghana lesson JSON data to DOCX table format
 */
export async function generateGhanaLessonDocx(
  jsonData: string | GhanaLessonData | GhanaLessonData[],
  fileName: string = "ghana-lesson-plan.docx",
  returnBlob: boolean = false
): Promise<Blob | void> {
  try {
    // Normalize input to array
    let dataArray: GhanaLessonData[] = [];
    
    if (Array.isArray(jsonData)) {
        dataArray = jsonData;
    } else if (typeof jsonData === 'string') {
        const parsed = JSON.parse(jsonData);
        dataArray = Array.isArray(parsed) ? parsed : [parsed];
    } else {
        dataArray = [jsonData];
    }

    const docSections = dataArray.map((lessonData, index) => {
        // Table 1: Header Info (Rows 1-3)
        // Uses original 6-column grid - Scaled to ~10500 total width for 0.5" margins
        const table1 = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [1500, 600, 1100, 2600, 2600, 2100],
          rows: [
            // Row 1: Week Ending | Day (2 cols) | Subject (spanning 3 cols to the right)
            new TableRow({
              children: [
                createCell(`Week Ending: ${lessonData.weekEnding || ''}`, false, 1, false, true),
                createCell(`Day: ${lessonData.day || ''}`, false, 2, false, true),
                createCell(`Subject: ${formatSubject(lessonData.subject || '')}`, false, 3, false, true),
              ],
            }),

            // Row 2: Duration (spanning Week Ending + Day = 3 cols) | Strand (spanning 3 cols to far right)
            new TableRow({
              children: [
                createCell(`Duration: ${lessonData.duration || ''}`, false, 3, false, true),
                createCell(`Strand: ${cleanStrandOrSubStrand(lessonData.strand || '')}`, false, 3, false, true),
              ],
            }),

            // Row 3: Class | Class Size (2 cols) | Sub Strand (spanning 3 cols to the right)
            new TableRow({
              children: [
                createCell(`Class: ${formatClass(lessonData.class || '')}`, false, 1, false, true),
                createCell(`Class Size: ${lessonData.classSize || ''}`, false, 2, false, true),
                createCell(`Sub Strand: ${cleanStrandOrSubStrand(lessonData.subStrand || '')}`, false, 3, false, true),
              ],
            }),
          ],
        });

        // Table 2: Standards (Row 4)
        // Independent grid: 3 columns [2100, 6300, 2100]
        let lessonText = lessonData.lesson || '1 of 1';
        
        // If multiple lessons are being generated, enforce sequential numbering "X of Y"
        if (dataArray.length > 1) {
             lessonText = `${index + 1} of ${dataArray.length}`;
        }

        // If lessonText is just a number "1", format to "Lesson 1" (or "1 of 1")
        if (/^\d+$/.test(lessonText)) {
            // Check if we have context to know total? We don't in this scope easily unless passed.
            // defaulting to "1 of 1" is safe if unknown
             lessonText = `${lessonText} of 1`;
        }
        
        // Ensure "Lesson: " prefix is handled correctly
        let finalLessonCellText = "";
        if (lessonText.toLowerCase().startsWith("lesson: ")) {
             finalLessonCellText = lessonText;
        } else if (lessonText.toLowerCase().startsWith("lesson ")) {
             // e.g. "Lesson 1 of 3" -> "Lesson: 1 of 3" (optional preference, or just use as is)
             // User prompt implies "Lesson: 1 of 1" is the bad output.
             // If AI gives "Lesson 1 of 3", we might want "Lesson: 1 of 3"
             finalLessonCellText = lessonText.replace(/^Lesson\s+/i, "Lesson: ");
        } else {
             // e.g. "1 of 3" -> "Lesson: 1 of 3"
             finalLessonCellText = `Lesson: ${lessonText}`;
        }

        const table2 = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [2100, 6300, 2100],
          rows: [
            new TableRow({
              children: [
                createCell(`Content Standard: ${cleanContentStandard(lessonData.contentStandard || '')}`, false, 1, false, true),
                createCell(`Indicator: ${lessonData.indicator || ''}`, false, 1, false, true),
                createCell(finalLessonCellText, false, 1, false, true),
              ],
            }),
          ],
        });

        // Table 3: Competencies (Row 5)
        // Independent grid: 2 columns [8232, 2268] - Core Comp is ~4cm (2268 DXa)
        const table3 = new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [8232, 2268],
          rows: [
            new TableRow({
              children: [
                createCell(
                  `Performance Indicator: ${ensurePerformanceIndicatorPrefix(lessonData.performanceIndicator || '')}`, 
                  false, 1, false, true,
                  { size: 8232, type: WidthType.DXA }
                ),
                createCell(
                  `Core Competencies: ${lessonData.coreCompetencies || ''}`, 
                  false, 1, false, true,
                  { size: 2268, type: WidthType.DXA }
                ),
              ],
            }),
          ],
        });

        // Table 4: Keywords & References (Rows 6-7)
        // Independent grid: 2 columns [2000, 8500] - Increased first column for "Keywords"
        const table4 = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [2000, 8500],
          rows: [
            new TableRow({
              children: [
                createCell(`Keywords:`, false, 1, false, true),
                createCell(lessonData.keywords || '', false, 1, false),
              ],
            }),
            new TableRow({
              children: [
                createCell(`Reference:`, false, 1, false, true),
                // STRICT REQUIREMENT: "NaCCA [subject] Curriculum for [Class]"
                createCell(`NaCCA ${formatSubject(lessonData.subject || '')} Curriculum for ${formatClass(lessonData.class || '')}`, false, 1, false),
              ],
            }),
          ],
        });

        // Table 5: Phases (Rows 8+)
        // Independent grid: 3 columns [1701, 6497, 2268]
        const table5 = new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [1701, 6497, 2268],
          rows: [
            // Header
            new TableRow({
              children: [
                createCell("Phase/Duration", true, 1, true),
                createCell("Learners Activities", true, 1, true),
                createCell("Resources", true, 1, true),
              ],
            }),

            // Phase 1 - STARTER
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1701, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "PHASE 1: STARTER", bold: true, size: 20, font: "Segoe UI" }),
                      ],
                      spacing: { before: 80, after: 40 }, 
                    }),
                    new Paragraph({
                      children: [
                         new TextRun({ text: "(10 mins)", bold: true, size: 18, font: "Segoe UI" }),
                      ],
                      spacing: { before: 0, after: 80 },
                    }),
                  ],
                  borders: tableBorders,
                  verticalAlign: VerticalAlign.TOP,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
                createCell(capitalizeWords(lessonData.phases?.phase1_starter?.learnerActivities || ""), false, 1, false),
                createCell(capitalizeWords(lessonData.phases?.phase1_starter?.resources || ""), false, 1, false),
              ],
            }),

            // Phase 2 - NEW LEARNING
            new TableRow({
              children: [
                 new TableCell({
                  width: { size: 1701, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "PHASE 2: NEW LEARNING", bold: true, size: 20, font: "Segoe UI" }),
                      ],
                      spacing: { before: 80, after: 40 }, 
                    }),
                    new Paragraph({
                      children: [
                         new TextRun({ text: "(40 mins)", bold: true, size: 18, font: "Segoe UI" }),
                      ],
                      spacing: { before: 0, after: 80 },
                    }),
                  ],
                  borders: tableBorders,
                  verticalAlign: VerticalAlign.TOP,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
                createCell(capitalizeWords(lessonData.phases?.phase2_newLearning?.learnerActivities || ""), false, 1, false),
                createCell(capitalizeWords(lessonData.phases?.phase2_newLearning?.resources || ""), false, 1, false),
              ],
            }),

            // Phase 3 - REFLECTION
            new TableRow({
              children: [
                 new TableCell({
                  width: { size: 1701, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "PHASE 3: REFLECTION", bold: true, size: 20, font: "Segoe UI" }),
                      ],
                      spacing: { before: 80, after: 40 }, 
                    }),
                    new Paragraph({
                      children: [
                         new TextRun({ text: "(10 mins)", bold: true, size: 18, font: "Segoe UI" }),
                      ],
                      spacing: { before: 0, after: 80 },
                    }),
                  ],
                  borders: tableBorders,
                  verticalAlign: VerticalAlign.TOP,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
                createCell(capitalizeWords(lessonData.phases?.phase3_reflection?.learnerActivities || ""), false, 1, false),
                createCell(capitalizeWords(lessonData.phases?.phase3_reflection?.resources || ""), false, 1, false),
              ],
            }),
          ],
        });

        return {
          properties: {
            page: {
              margin: {
                top: 720,    // 0.5 inch
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: formatTerm(lessonData.term),
                  bold: true,
                  size: 24, // 12pt
                  font: "Segoe UI",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: `WEEKLY LESSON PLAN – ${formatClass(lessonData.class || 'BASIC 1').toUpperCase()}`,
                  bold: true,
                  size: 24, // 12pt
                  font: "Segoe UI",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: formatWeek(lessonData.weekNumber),
                  bold: true,
                  size: 24, // 12pt
                  font: "Segoe UI",
                  underline: {},
                }),
              ],
            }),
            table1,
            new Paragraph({ 
              children: [], 
              spacing: { after: 0, before: 0, line: 1, lineRule: "exact" as any },
              run: { size: 1 }
            }),
            table2,
            new Paragraph({ 
              children: [], 
              spacing: { after: 0, before: 0, line: 1, lineRule: "exact" as any },
              run: { size: 1 }
            }),
            table3,
            new Paragraph({ 
              children: [], 
              spacing: { after: 0, before: 0, line: 1, lineRule: "exact" as any },
              run: { size: 1 }
            }),
            table4,
            new Paragraph({ 
              children: [], 
              spacing: { after: 0, before: 0, line: 1, lineRule: "exact" as any },
              run: { size: 1 }
            }),
            table5,
            new Paragraph({
              text: "",
              spacing: { before: 400 },
            }),
          ],
        };
    });

    // Create document with all sections
    const doc = new Document({
      sections: docSections,
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    
    if (returnBlob) {
      return blob;
    }

    saveAs(blob, fileName);

    console.log("Ghana lesson plan DOCX generated successfully:", fileName);
  } catch (error) {
    console.error("Error generating Ghana lesson DOCX:", error);
    throw new Error("Failed to generate Ghana lesson plan document");
  }
}

/**
 * Generate filename for Ghana lesson plan
 */
export function generateGhanaLessonFileName(lessonData: GhanaLessonData | GhanaLessonData[] | string): string {
  try {
    let rawData: any = typeof lessonData === 'string' ? JSON.parse(lessonData) : lessonData;
    
    // If it's an array (either from parsing or direct input), take the first item
    const data: GhanaLessonData = Array.isArray(rawData) ? rawData[0] : rawData;
    
    const classAbbr = getClassAbbreviation(data.class || "");
    const subjectAbbr = getSubjectAbbreviation(data.subject || "");
    const weekAbbr = getWeekAbbreviation(data.weekNumber || "");
    
    return `${classAbbr}-${subjectAbbr}-${weekAbbr}.docx`;
  } catch (error) {
    return `ghana-lesson-plan-${new Date().toISOString().split('T')[0]}.docx`;
  }
}

/**
 * Parse JSON from AI response (handles cases where JSON might be wrapped in code blocks, arrays, or multiple lessons separated by ---)
 */
export function parseAIJsonResponse(response: string): GhanaLessonData | GhanaLessonData[] {
  try {
    // Remove markdown code blocks if present
    let cleanJson = response.trim();
    
    // Remove markdown code fences
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // PRIORITY 1: Check if it's a JSON array (multiple lessons)
    const trimmedForCheck = cleanJson.trim();
    if (trimmedForCheck.startsWith('[') && trimmedForCheck.includes('{')) {
      try {
        const parsed = JSON.parse(trimmedForCheck);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate each item has essential lesson fields
          const validLessons = parsed.filter((item: any) => item.subject || item.phases || item.strand);
          if (validLessons.length > 0) {
            console.log(`Parsed ${validLessons.length} lessons from JSON array`);
            return validLessons.length === 1 ? validLessons[0] : validLessons;
          }
        }
      } catch (e) {
        console.warn("Failed to parse as JSON array, trying other methods...");
      }
    }
    
    // PRIORITY 2: Check for "---" separator logic (legacy multiple lessons format)
    if (cleanJson.includes('---')) {
        const parts = cleanJson.split('---');
        const results: GhanaLessonData[] = [];

        for (const part of parts) {
            const trimmedPart = part.trim();
            if (!trimmedPart || trimmedPart.length < 5) continue;

            try {
                let jsonPart = trimmedPart;
                if (jsonPart.startsWith('```')) {
                    jsonPart = jsonPart.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
                }
                const parsed = JSON.parse(jsonPart);
                if (parsed.subject || parsed.phases) {
                    results.push(parsed as GhanaLessonData);
                }
            } catch (e) {
                console.warn("Failed to parse partial JSON block:", e);
            }
        }

        if (results.length > 0) {
            console.log(`Parsed ${results.length} lessons from --- separator format`);
            return results.length === 1 ? results[0] : results;
        }
    }

    // PRIORITY 3: Standard Single JSON parsing
    const parsed = JSON.parse(cleanJson);
    
    // Check if parsed result is an array
    if (Array.isArray(parsed)) {
      const validLessons = parsed.filter((item: any) => item.subject || item.phases || item.strand);
      if (validLessons.length > 0) {
        return validLessons.length === 1 ? validLessons[0] : validLessons;
      }
    }
    
    return parsed as GhanaLessonData;
    
  } catch (error) {
    console.error("Error parsing AI JSON response:", error);
    
    // Attempt fallback for common JSON errors
    try {
        // Find the first occurrence of [ or {
        const firstOpen = response.search(/[{[]/);
        // Find the last occurrence of } or ]
        const lastClose = Math.max(response.lastIndexOf('}'), response.lastIndexOf(']'));
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const potentialJson = response.substring(firstOpen, lastClose + 1);
            const fallbackParsed = JSON.parse(potentialJson);
            
            // Handle array result from fallback
            if (Array.isArray(fallbackParsed)) {
              const validLessons = fallbackParsed.filter((item: any) => item.subject || item.phases || item.strand);
              if (validLessons.length > 0) {
                return validLessons.length === 1 ? validLessons[0] : validLessons;
              }
            }
            
            return fallbackParsed as GhanaLessonData;
        }
    } catch (e) {}

    throw new Error("Failed to parse lesson data. Please ensure the AI returned valid JSON.");
  }
}

