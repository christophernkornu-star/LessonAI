import { cleanAndSplitText, parseMarkdownLine } from "@/lib/textFormatting";
import { format } from "date-fns";


// Interface for Ghana Lesson Data (matching the one in ghanaLessonDocxService)
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

// PDF Export Service using browser's print functionality
// This provides a simple PDF export without additional dependencies

export async function exportToPDF(content: string, filename: string = "lesson-note.pdf"): Promise<void> {
  exportToPDFInternal(content, filename);
}

export async function exportGhanaLessonToPDF(data: GhanaLessonData | GhanaLessonData[], filename: string = "ghana-lesson-note.pdf"): Promise<void> {
  const dataArray = Array.isArray(data) ? data : [data];
  
  // Generate HTML for each lesson and join with page breaks
  const htmlContent = dataArray.map((lesson, index) => {
    const lessonHtml = generateGhanaLessonHTML(lesson);
    // Add page break after each lesson except the last one
    return index < dataArray.length - 1 
      ? `${lessonHtml}<div style="page-break-after: always; height: 0; margin: 0; padding: 0;"></div>`
      : lessonHtml;
  }).join('');

  exportToPDFInternal(htmlContent, filename, true);
}

function exportToPDFInternal(content: string, filename: string, isHtml: boolean = false): void {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to access iframe document');
  }

  // Write content to iframe with print styles
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in; /* Match Word doc margin */
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10pt; /* Match Word doc size roughly */
            line-height: 1.3;
            color: #000;
            max-width: 100%;
          }
          
          h1, h2, h3 {
            color: #000;
            margin: 5px 0;
            text-align: center;
            font-weight: bold;
          }
          
          h2 { font-size: 12pt; }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px; /* Space between tables */
            page-break-inside: avoid;
          }
          
          table, th, td {
            border: 1px solid #000;
          }
          
          th, td {
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
          }
          
          /* Gray background for headers */
          .bg-gray {
            background-color: #D9D9D9;
          }
          
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          
          .list-item { display: flex; margin-bottom: 4px; }
          .bullet { min-width: 15px; font-weight: bold; }
          .list-text { flex: 1; }
          .content-header { font-weight: bold; margin-top: 8px; margin-bottom: 4px; }
          .content-line { margin-bottom: 4px; }
          
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${isHtml ? content : `<div style="white-space: pre-wrap;">${content}</div>`}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for content to load then print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    }
    
    // Remove iframe after a delay to allow print dialog to open
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
}

function ensurePerformanceIndicatorPrefix(text: string): string {
  if (!text) return "";
  const prefix = "By the end of the lesson, learners will be able to";
  const trimmed = text.trim();
  
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
    const match = trimmed.match(new RegExp(`^${prefix}[:]?`, 'i'));
    if (match) return trimmed;
  }
  
  return `${prefix}: ${trimmed}`;
}

function generateGhanaLessonHTML(data: GhanaLessonData): string {
  const markdownToHtml = (text: string) => {
    if (!text) return '';
    
    // Use the comprehensive cleaner from textFormatting lib
    const lines = cleanAndSplitText(text);
    
    // Process each line
    const processedLines = lines.map(line => {
      // DIRECT FIX: Remove trailing ** from lines
      let trimmed = line.trim().replace(/\*\*\s*$/, '');
      if (!trimmed) return '<br/>'; // Maintain empty lines

      // Handle Markdown Headers (h1, h2, h3)
      let isHeader = false;
      if (trimmed.match(/^#+\s/)) {
        trimmed = trimmed.replace(/^#+\s/, '');
        isHeader = true;
      }

      // Handle Bullet Points
      let isListItem = false;
      if (trimmed.match(/^[-*•]\s/)) {
        trimmed = trimmed.replace(/^[-*•]\s/, '');
        isListItem = true;
      }

      // Check if this is an Activity/Step/Part/Phase line - make it bold
      if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(trimmed)) {
        // Remove ALL ** and wrap the whole line in bold
        trimmed = '**' + trimmed.replace(/\*\*/g, '') + '**';
      }

      // Handle labels ending in colon (e.g. "Step 1:") by bolding them
      // But skip if already has ** (like Activity lines)
      if (!trimmed.startsWith('**') && trimmed.match(/^[A-Za-z0-9\s\(\)]+:$/)) {
        trimmed = `**${trimmed}**`;
      }

      // Handle Numbered Patterns: Match "1." or "1)" at START of line and BOLD it
      if (trimmed.match(/^\d+[.)]/)) {
          trimmed = trimmed.replace(/^(\d+[.)])/, '**$1**');
      }
      
      // Clean any remaining orphan ** before parsing
      // Count ** pairs and remove orphans
      const asteriskCount = (trimmed.match(/\*\*/g) || []).length;
      if (asteriskCount % 2 !== 0) {
        // Remove trailing orphan **
        trimmed = trimmed.replace(/\*\*\s*$/, '');
      }
      }

      // Parse inline markdown
      const tokens = parseMarkdownLine(trimmed);
      const htmlParts = tokens.map(token => {
        let part = token.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
          
        if (token.bold) return `<strong>${part}</strong>`;
        if (token.italic) return `<em>${part}</em>`;
        return part;
      });

      let innerHtml = htmlParts.join('');

      // Wrap in appropriate container
      if (isHeader) return `<div class="content-header">${innerHtml}</div>`;
      if (isListItem) return `<div class="list-item"><span class="bullet">•</span><span class="list-text">${innerHtml}</span></div>`;
      
      return `<div class="content-line">${innerHtml}</div>`;
    });

    return processedLines.join('');
  };

  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="font-size: 14pt; margin: 0;">${(data.term || 'FIRST TERM').toUpperCase()}</h2>
      <h2 style="font-size: 14pt; margin: 5px 0;">WEEKLY LESSON PLAN – ${(data.class || 'BASIC 1').replace(/BASIC(\d)/i, 'BASIC $1').toUpperCase()}</h2>
      <h2 style="font-size: 12pt; margin: 0;">WEEK: ${data.weekNumber || '1'}</h2>
    </div>

    <!-- Table 1: Basic Info -->
    <table>
      <tr>
        <td style="width: 12.5%;"><strong>Week Ending:</strong><br/>${data.weekEnding}</td>
        <td style="width: 12.5%;"><strong>Day:</strong><br/>${data.day}</td>
        <td style="width: 12.5%;"><strong>Subject:</strong><br/>${data.subject}</td>
        <td style="width: 12.5%;"><strong>Duration:</strong><br/>${data.duration}</td>
        <td style="width: 12.5%;"><strong>Strand:</strong><br/>${data.strand}</td>
        <td style="width: 12.5%;"><strong>Class:</strong><br/>${data.class}</td>
        <td style="width: 12.5%;"><strong>Class Size:</strong><br/>${data.classSize}</td>
        <td style="width: 12.5%;"><strong>Sub Strand:</strong><br/>${data.subStrand}</td>
      </tr>
    </table>

    <!-- Table 2: Standards -->
    <table>
      <tr>
        <td style="width: 20%;"><strong>Content Standard:</strong><br/>${data.contentStandard}</td>
        <td style="width: 60%;"><strong>Indicator:</strong><br/>${data.indicator}</td>
        <td style="width: 20%;"><strong>Lesson:</strong><br/>${data.lesson || '1 of 1'}</td>
      </tr>
    </table>

    <!-- Table 3: Competencies -->
    <table>
      <tr>
        <td style="width: 30%;"><strong>Performance Indicator:</strong><br/>${ensurePerformanceIndicatorPrefix(data.performanceIndicator)}</td>
        <td style="width: 70%;"><strong>Core Competencies:</strong><br/>${data.coreCompetencies}</td>
      </tr>
    </table>

    <!-- Table 4: Keywords & Reference -->
    <table>
      <tr>
        <td style="width: 15%;"><strong>Key Words:</strong></td>
        <td style="width: 85%;">${data.keywords}</td>
      </tr>
      <tr>
        <td style="width: 15%;"><strong>Reference:</strong></td>
        <td style="width: 85%;">NaCCA ${data.subject || ''} Curriculum for ${data.class || ''}</td>
      </tr>
    </table>

    <!-- Table 5: Phases -->
    <table>
      <tr class="bg-gray">
        <th style="width: 15%;">Phase/Duration</th>
        <th style="width: 70%;">Learners Activities</th>
        <th style="width: 15%;">Resources</th>
      </tr>
      <tr>
        <td><strong>PHASE 1: STARTER</strong><br/>(Introduction)</td>
        <td>${markdownToHtml(data.phases?.phase1_starter?.learnerActivities || '')}</td>
        <td>${markdownToHtml(data.phases?.phase1_starter?.resources || '')}</td>
      </tr>
      <tr>
        <td><strong>PHASE 2: NEW LEARNING</strong></td>
        <td>${markdownToHtml(data.phases?.phase2_newLearning?.learnerActivities || '')}</td>
        <td>${markdownToHtml(data.phases?.phase2_newLearning?.resources || '')}</td>
      </tr>
      <tr>
        <td><strong>PHASE 3: REFLECTION</strong><br/>(Plenary/Closure)</td>
        <td>${markdownToHtml(data.phases?.phase3_reflection?.learnerActivities || '')}</td>
        <td>${markdownToHtml(data.phases?.phase3_reflection?.resources || '')}</td>
      </tr>
    </table>
  `;
}
