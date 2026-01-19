export interface TextToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Pre-processes text to fix jumbled lists and standardize formatting.
 * Splits combined lines (e.g. "1. A 2. B") into separate lines.
 */
export function cleanAndSplitText(text: string): string[] {
  if (!text) return [];

  let processed = text;

  // Clean up trailing asterisks from text like "Activity 2: Title**"
  // Match patterns like "Activity N: Some text**" and remove trailing **
  processed = processed.replace(/(\*\*[^*]+)\*\*(\*\*)?/g, (match, content) => {
    // If content starts with **, keep it as markdown bold
    if (content.startsWith('**')) {
      return content + '**';
    }
    return match;
  });
  
  // Fix malformed bold markers (trailing ** without opening)
  processed = processed.replace(/([^*])\*\*$/gm, '$1');
  processed = processed.replace(/([^*])\*\*(\s)/g, '$1$2');
  
  // Clean "Activity N: Title**" pattern - remove trailing ** and wrap whole thing in bold
  processed = processed.replace(/(Activity\s+\d+:?\s*[^*\n]+)\*\*/gi, '**$1**');
  
  // Fix jumbled numbered lists with period (e.g. "1. Item 2. Item")
  if (processed.match(/\s\d+\.\s/)) {
    processed = processed.replace(/(\s)(\d+\.\s)/g, '\n$2');
  }

  // Fix jumbled numbered lists with parenthesis (e.g. "text 1) Item 2) Item")
  // Ensure numbers with ) start on newline
  processed = processed.replace(/([^\n\d])(\s*)(\d+\)\s)/g, '$1\n$3');
  
  // Fix jumbled lettered lists (e.g. " a) Item b) Item")
  if (processed.match(/\s[a-zA-Z][\)\.]\s/)) {
    processed = processed.replace(/(\s)([a-zA-Z][\)\.]\s)/g, '\n$2');
  }

  // Fix jumbled Tiers (e.g. " Tier 1 ... Tier 2 ...")
  if (processed.match(/\sTier\s\d/)) {
    processed = processed.replace(/(\s)(Tier\s\d)/g, '\n$2');
  }
  
  // Split on sentence-ending keywords that indicate new thoughts/sections
  // Keywords: "Next,", "Then,", "Finally,", "Additionally,", "Moreover,", "Furthermore,"
  // "However,", "Therefore,", "In conclusion,", "To summarize,"
  const newThoughtKeywords = [
    'Next,', 'Then,', 'Finally,', 'Additionally,', 'Moreover,', 
    'Furthermore,', 'However,', 'Therefore,', 'In conclusion,', 
    'To summarize,', 'For example,', 'For instance,', 'In addition,',
    'As a result,', 'Consequently,', 'Meanwhile,', 'Subsequently,',
    'Afterwards,', 'Before this,', 'After this,'
  ];
  
  for (const keyword of newThoughtKeywords) {
    const regex = new RegExp(`([.!?])\\s*(${keyword.replace(',', ',?')})`, 'gi');
    processed = processed.replace(regex, '$1\n$2');
  }

  // Fix "Activity N:" merging and ensure bold formatting
  // First, strip existing stars if any, to normalize
  processed = processed.replace(/\*\*(Activity\s+\d+:?[^*]*)\*\*/gi, '$1');
  processed = processed.replace(/\*\*(Activity\s+\d+:?)/gi, '$1');
  
  // Now ensure newline and add bold wrapping for Activity labels
  processed = processed.replace(/([^\n])\s*(Activity\s+\d+:)/gi, '$1\n$2');
  // Bold the entire "Activity N: Title" line
  processed = processed.replace(/(Activity\s+\d+:\s*[^\n]*)/gi, '**$1**');
  
  // Clean up any double asterisks that got created
  processed = processed.replace(/\*\*\*\*/g, '**');
  
  // Clean up asterisks at end of lines that aren't part of bold markers
  processed = processed.replace(/\*\*$/gm, '');
  
  // Handle "Step N:" patterns similarly
  processed = processed.replace(/([^\n])(\s*)(Step\s+\d+:)/gi, '$1\n**$3**');
  processed = processed.replace(/^(Step\s+\d+:)/gim, '**$1**');
  
  // Handle "Part N:" patterns
  processed = processed.replace(/([^\n])(\s*)(Part\s+\d+:)/gi, '$1\n**$3**');
  processed = processed.replace(/^(Part\s+\d+:)/gim, '**$1**');
  
  // Handle "Phase N:" patterns
  processed = processed.replace(/([^\n])(\s*)(Phase\s+\d+:)/gi, '$1\n**$3**');
  processed = processed.replace(/^(Phase\s+\d+:)/gim, '**$1**');
  
  // Handle "Group N:" patterns (common in differentiated activities)
  processed = processed.replace(/([^\n])(\s*)(Group\s+\d+[^:]*:)/gi, '$1\n**$3**');
  
  // Clean up multiple consecutive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Clean double bold markers
  processed = processed.replace(/\*\*\*\*+/g, '**');
  
  return processed.split('\n');
}

/**
 * Parses a line of text for Markdown formatting (bold, italic).
 */
export function parseMarkdownLine(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  
  // First, clean any trailing ** that aren't part of a bold pair
  let cleanedText = text;
  
  // Remove orphan trailing **
  if (cleanedText.endsWith('**') && !cleanedText.slice(0, -2).includes('**')) {
    cleanedText = cleanedText.slice(0, -2);
  }
  
  // Handle case where ** appears at end without matching opening
  const asteriskCount = (cleanedText.match(/\*\*/g) || []).length;
  if (asteriskCount % 2 !== 0) {
    // Odd number of **, remove the last one
    const lastIndex = cleanedText.lastIndexOf('**');
    if (lastIndex !== -1) {
      cleanedText = cleanedText.slice(0, lastIndex) + cleanedText.slice(lastIndex + 2);
    }
  }
  
  const parts = cleanedText.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      tokens.push({ text: part.slice(2, -2), bold: true });
    } else {
      const italicParts = part.split(/(\*[^*]+\*)/g);
      for (const subPart of italicParts) {
        if (subPart.startsWith('*') && subPart.endsWith('*')) {
          tokens.push({ text: subPart.slice(1, -1), italic: true });
        } else if (subPart) {
          tokens.push({ text: subPart });
        }
      }
    }
  }
  return tokens;
}

/**
 * Helper to capitalize first letter only
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
