import PizZip from 'pizzip';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize worker
// We use a CDN for the worker to avoid complex build configuration in this environment
// Using unpkg to ensure we get the worker matching the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromFile(fileUrl: string, fileName: string): Promise<string> {
  try {
    console.log(`Downloading file: ${fileName} from ${fileUrl}`);
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'docx') {
      return extractTextFromDocx(arrayBuffer);
    } else if (extension === 'pdf') {
      return extractTextFromPdf(arrayBuffer);
    } else if (['txt', 'csv', 'md', 'json', 'html'].includes(extension || '')) {
      return new TextDecoder().decode(arrayBuffer);
    } else {
      return `[Content extraction for .${extension} files is not currently supported. File: ${fileName}]`;
    }
  } catch (error) {
    console.error(`Error reading file ${fileName}:`, error);
    return `[Error reading file ${fileName}: ${(error as Error).message}]`;
  }
}

export async function extractTextFromBrowserFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'docx') {
      return extractTextFromDocx(arrayBuffer);
    } else if (['txt', 'csv', 'md', 'json', 'html'].includes(extension || '')) {
      return new TextDecoder().decode(arrayBuffer);
    } else if (extension === 'pdf') {
        return extractTextFromPdf(arrayBuffer);
    } else {
      return `[Content extraction for .${extension} files is not currently supported. File: ${file.name}]`;
    }
  } catch (error) {
    console.error(`Error reading file ${file.name}:`, error);
    return `[Error reading file ${file.name}: ${(error as Error).message}]`;
  }
}

function extractTextFromDocx(arrayBuffer: ArrayBuffer): string {
  try {
    const zip = new PizZip(arrayBuffer);
    const xml = zip.file("word/document.xml")?.asText();
    if (!xml) return "[Empty DOCX file]";
    
    // Improved XML text extraction to preserve table structure
    let text = xml;

    // 1. Mark table rows with newlines
    text = text.replace(/<\/w:tr>/g, '\n');
    
    // 2. Mark table cells with pipes (to create a pseudo-CSV/Markdown table)
    text = text.replace(/<\/w:tc>/g, ' | ');
    
    // 3. Replace paragraph endings with spaces (within cells) or newlines (outside)
    // We'll use a special marker for paragraphs to avoid breaking the table structure too much
    text = text.replace(/<\/w:p>/g, ' ');

    // 4. Remove all other tags
    text = text.replace(/<[^>]+>/g, '');
    
    // 5. Decode XML entities
    text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    
    // 6. Clean up excessive whitespace
    text = text.replace(/\s+/g, ' ').replace(/ \|\n/g, '\n').replace(/\n \|/g, '\n');

    return text.trim();
  } catch (e) {
    console.error("Error parsing DOCX:", e);
    return "[Error parsing DOCX file]";
  }
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved PDF text extraction
      // Try to preserve some structure by checking vertical position (y-coordinate)
      // This is a basic heuristic: if y changes significantly, it's a new line.
      
      const items = textContent.items as any[];
      if (items.length === 0) continue;

      // Sort by Y (descending for top-to-bottom) then X (ascending for left-to-right)
      // Note: PDF coordinates usually have (0,0) at bottom-left, so higher Y is higher on page.
      items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 5) { // 5 units tolerance for same line
           return b.transform[5] - a.transform[5]; // Sort Y descending
        }
        return a.transform[4] - b.transform[4]; // Sort X ascending
      });

      let pageText = '';
      let lastY = items[0].transform[5];

      for (const item of items) {
        const currentY = item.transform[5];
        // If Y difference is significant, insert newline
        if (Math.abs(currentY - lastY) > 10) {
          pageText += '\n';
        } else {
          // Add space between items on same line if needed
          if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
             pageText += ' '; 
          }
        }
        pageText += item.str;
        lastY = currentY;
      }

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    return fullText;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return `[Error parsing PDF file: ${(error as Error).message}]`;
  }
}
