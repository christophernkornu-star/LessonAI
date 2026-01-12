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

  // Fix jumbled numbered lists (e.g. "1. Item 2. Item")
  if (processed.match(/\s\d+\.\s/)) {
    processed = processed.replace(/(\s)(\d+\.\s)/g, '\n$2');
  }

  // Fix jumbled lettered lists (e.g. " a) Item b) Item")
  if (processed.match(/\s[a-zA-Z][\)\.]\s/)) {
    processed = processed.replace(/(\s)([a-zA-Z][\)\.]\s)/g, '\n$2');
  }

  // Fix jumbled Tiers (e.g. " Tier 1 ... Tier 2 ...")
  if (processed.match(/\sTier\s\d/)) {
    processed = processed.replace(/(\s)(Tier\s\d)/g, '\n$2');
  }

  // Fix "Activity N:" merging and ensure bold formatting
  // First, strip existing stars if any, to normalize
  processed = processed.replace(/\*\*(Activity\s+\d+:?)\*\*/gi, '$1');
  processed = processed.replace(/\*\*(Activity\s+\d+:?)/gi, '$1');
  
  // Now ensure newline and add bold wrapping
  processed = processed.replace(/([^\n])\s*(Activity\s+\d+:?)/gi, '$1\n$2');
  processed = processed.replace(/(Activity\s+\d+:?)/gi, '**$1**');
  
  return processed.split('\n');
}

/**
 * Parses a line of text for Markdown formatting (bold, italic).
 */
export function parseMarkdownLine(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

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
