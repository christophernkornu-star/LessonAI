import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableCell, TableRow, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { cleanAndSplitText, parseMarkdownLine } from "@/lib/textFormatting";

interface LessonMetadata {
  subject: string;
  level: string;
  strand?: string;
  subStrand?: string;
  contentStandard?: string;
  templateName?: string;
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
      // DIRECT FIX: Remove trailing ** from lines
      let line = lines[i].trim().replace(/\*\*\s*$/, '');
      let isLineBold = false;

      // Check if this is an Activity/Step/Part/Phase line - make it bold
      if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(line)) {
        // Remove ALL ** and make the whole line bold
        line = line.replace(/\*\*/g, '');
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
