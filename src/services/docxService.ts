import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableCell, TableRow, WidthType, BorderStyle, PageBreak } from "docx";
import { saveAs } from "file-saver";
import { cleanAndSplitText, parseMarkdownLine } from "@/lib/textFormatting";

interface LessonMetadata {
  subject: string;
  level: string;
  strand?: string;
  subStrand?: string;
  contentStandard?: string;
  templateName?: string;
  teacherName?: string;
  schoolName?: string;
  term?: string;
  week?: string;
  includeCoverPage?: boolean;
}

/**
 * Parse lesson note text and convert to DOCX document
 */
export async function generateLessonNoteDocx(
  lessonNoteText: string,
  metadata: LessonMetadata,
  fileName: string = "lesson-note.docx"
): Promise<void> {
  try {
    // Split the text into lines using the shared utility
    const lines = cleanAndSplitText(lessonNoteText);

    const docElements: (Paragraph | Table)[] = [];

    // Optional Cover Page
    if (metadata.includeCoverPage) {
      docElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1000, after: 1500 },
          children: [
            new TextRun({ 
              text: (metadata.schoolName || "NAME OF SCHOOL").toUpperCase(), 
              bold: true, 
              font: "Century Gothic", 
              size: 40 // 20pt
            }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({ 
              text: (metadata.term?.toUpperCase() || "TERM").toUpperCase(), 
              bold: true, 
              font: "Century Gothic", 
              size: 36 // 18pt
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({ 
              text: "WEEKLY LESSON NOTE", 
              bold: true, 
              font: "Century Gothic", 
              size: 36
            }),
          ],
        }),
        ...(!/basic\s*[1-6]\b/i.test(metadata.level || "") ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 1200 },
            children: [
              new TextRun({ 
                text: (metadata.subject || "SUBJECT").toUpperCase(), 
                bold: true, 
                font: "Century Gothic", 
                size: 36
              }),
            ],
          })
        ] : []),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({ 
              text: `WEEK ${(metadata.week || "").replace(/[^0-9]/g, '') || "___"}`, 
              bold: true, 
              font: "Century Gothic", 
              size: 36
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [
            new TextRun({ 
              text: (metadata.level || "___").toUpperCase().replace(/([a-zA-Z])(\d)/g, '$1 $2'), 
              bold: true, 
              font: "Century Gothic", 
              size: 36
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2500, after: 800 },
          children: [
            new TextRun({ 
              text: (metadata.teacherName || "NAME OF TEACHER").toUpperCase(), 
              bold: true, 
              font: "Century Gothic", 
              size: 36
            }),
          ],
        }),
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Add header with metadata
    docElements.push(
      new Paragraph({
        text: "LESSON NOTE",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Add metadata section
    if (metadata.subject) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Subject: ", bold: true }),
            new TextRun({ text: metadata.subject }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (metadata.level) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Grade Level: ", bold: true }),
            new TextRun({ text: metadata.level }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (metadata.strand) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Strand: ", bold: true }),
            new TextRun({ text: metadata.strand }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (metadata.subStrand) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Sub-Strand: ", bold: true }),
            new TextRun({ text: metadata.subStrand }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (metadata.contentStandard) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Content Standard: ", bold: true }),
            new TextRun({ text: metadata.contentStandard }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (metadata.templateName) {
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Template: ", bold: true }),
            new TextRun({ text: metadata.templateName }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Add separator line
    docElements.push(
      new Paragraph({
        text: "─".repeat(80),
        spacing: { after: 200 },
      })
    );

    // Process lesson note content
    let currentSection = "";
    let isListItem = false;
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      // DIRECT FIX: Remove ALL ** markers for clean detection
      let line = lines[i].trim().replace(/^\*\*/, '').replace(/\*\*\s*$/, '').replace(/\*\*/g, '');
      let isLineBold = false;

      // Check if this is an Activity/Step/Part/Phase line - make it bold
      if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(line)) {
        isLineBold = true;
      }

      // Handle Markdown Headers (e.g. # Title, ## Subtitle)
      if (line.match(/^#+\s/)) {
        line = line.replace(/^#+\s/, '');
        isLineBold = true;
      }

      // Handle Bullet Points (e.g. - Item, * Item)
      if (line.match(/^[-*]\s/)) {
        line = line.replace(/^[-*]\s/, '• ');
      }

      // Detect markdown table
      const isTableRow = line.match(/^\|.*\|$/);
      const isTableSeparator = line.match(/^\|[\s:-]+\|$/);

      if (isTableRow && !isTableSeparator) {
        // Parse table row
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        tableRows.push(cells);
        inTable = true;
      } else if (isTableSeparator) {
        // Skip separator
        continue;
      } else {
        // If we were in a table and now we're not, render the table
        if (inTable) {
          const table = new Table({
            rows: tableRows.map((rowCells) => 
              new TableRow({
                children: rowCells.map(cellText => {
                  const tokens = parseMarkdownLine(cellText);
                  const isBold = tokens.some(t => t.bold);
                  const cleanText = tokens.map(t => t.text).join('');
                  
                  return new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: cleanText, bold: isBold })]
                    })],
                    width: { size: 100 / rowCells.length, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    }
                  });
                }),
              })
            ),
            width: { size: 100, type: WidthType.PERCENTAGE },
          });
          docElements.push(table);
          tableRows = [];
          inTable = false;
        }

        // Regular paragraph
        if (!line) {
          docElements.push(new Paragraph({ text: "" }));
          continue;
        }

        const children: TextRun[] = [];
        const tokens = parseMarkdownLine(line);
        
        for (const token of tokens) {
            children.push(new TextRun({ 
                text: token.text, 
                bold: isLineBold || token.bold, 
                italics: token.italic 
            }));
        }

        docElements.push(
          new Paragraph({
            children: children.length > 0 ? children : [new TextRun({ text: line, bold: isLineBold })],
            spacing: { after: 150 },
          })
        );
      }
    }

    // Handle any remaining table at the end
    if (tableRows.length > 0) {
      const table = new Table({
        rows: tableRows.map((rowCells) => 
          new TableRow({
            children: rowCells.map(cellText => {
              const isBold = cellText.startsWith('**') && cellText.endsWith('**');
              const cleanText = isBold ? cellText.slice(2, -2) : cellText;
              return new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: cleanText, bold: isBold })]
                })],
                width: { size: 100 / rowCells.length, type: WidthType.PERCENTAGE },
              });
            }),
          })
        ),
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      docElements.push(table);
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
              borders: metadata.includeCoverPage ? {
                pageBorders: {
                  display: "firstPage" as const,
                  offsetFrom: "page" as const,
                },
                pageBorderTop: { style: BorderStyle.DOUBLE, size: 24, space: 31, color: "000000" },
                pageBorderBottom: { style: BorderStyle.DOUBLE, size: 24, space: 31, color: "000000" },
                pageBorderLeft: { style: BorderStyle.DOUBLE, size: 24, space: 31, color: "000000" },
                pageBorderRight: { style: BorderStyle.DOUBLE, size: 24, space: 31, color: "000000" },
              } : undefined,
            },
          },
          children: docElements,
        },
      ],
    });

    // Generate and download
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);

    console.log("DOCX file generated successfully:", fileName);
  } catch (error) {
    console.error("Error generating DOCX file:", error);
    throw new Error("Failed to generate Word document");
  }
}

/**
 * Helper function to sanitize filename
 */
export function generateFileName(metadata: LessonMetadata): string {
  const date = new Date().toISOString().split('T')[0];
  const subject = metadata.subject.replace(/\s+/g, '-').toLowerCase();
  const level = metadata.level.replace(/\s+/g, '-').toLowerCase();
  return `lesson-note-${subject}-${level}-${date}.docx`;
}
