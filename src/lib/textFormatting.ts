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

  // FIRST: Clean all orphan/trailing ** from Activity lines
  // Pattern: "Activity N: Some text**" -> "Activity N: Some text"
  processed = processed.replace(/(Activity\s+\d+:[^*\n]*)\*\*(?!\*)/gi, '$1');
  
  // Also clean "**Activity N: Some text**" that might have extra trailing **
  processed = processed.replace(/\*\*(Activity\s+\d+:[^*\n]*)\*\*\*\*/gi, '**$1**');
  
  // Clean any standalone trailing ** that appear after text (not part of bold pair)
  processed = processed.replace(/([a-zA-Z0-9\.\)\]\!])\*\*(\s|$)/g, '$1$2');
  
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

  // NOW handle Activity formatting:
  // Step 1: Remove ALL existing ** around Activity patterns to normalize
  processed = processed.replace(/\*\*(Activity\s+\d+:)/gi, '$1');
  processed = processed.replace(/(Activity\s+\d+:[^\n]*)\*\*/gi, '$1');
  
  // Step 2: Ensure Activity starts on newline (if not at start)
  processed = processed.replace(/([^\n])\s*(Activity\s+\d+:)/gi, '$1\n$2');
  
  // Step 3: Wrap entire Activity line in bold markers
  // Match "Activity N: everything until end of line"
  processed = processed.replace(/^(Activity\s+\d+:\s*[^\n]*)$/gim, '**$1**');
  processed = processed.replace(/\n(Activity\s+\d+:\s*[^\n]*)/gi, '\n**$1**');
  
  // Handle "Step N:" patterns similarly
  processed = processed.replace(/\*\*(Step\s+\d+:)/gi, '$1');
  processed = processed.replace(/(Step\s+\d+:[^\n]*)\*\*/gi, '$1');
  processed = processed.replace(/([^\n])(\s*)(Step\s+\d+:)/gi, '$1\n$2$3');
  processed = processed.replace(/^(Step\s+\d+:\s*[^\n]*)$/gim, '**$1**');
  processed = processed.replace(/\n(Step\s+\d+:\s*[^\n]*)/gi, '\n**$1**');
  
  // Handle "Part N:" patterns
  processed = processed.replace(/\*\*(Part\s+\d+:)/gi, '$1');
  processed = processed.replace(/(Part\s+\d+:[^\n]*)\*\*/gi, '$1');
  processed = processed.replace(/([^\n])(\s*)(Part\s+\d+:)/gi, '$1\n$2$3');
  processed = processed.replace(/^(Part\s+\d+:\s*[^\n]*)$/gim, '**$1**');
  
  // Handle "Phase N:" patterns
  processed = processed.replace(/\*\*(Phase\s+\d+:)/gi, '$1');
  processed = processed.replace(/(Phase\s+\d+:[^\n]*)\*\*/gi, '$1');
  processed = processed.replace(/([^\n])(\s*)(Phase\s+\d+:)/gi, '$1\n$2$3');
  processed = processed.replace(/^(Phase\s+\d+:\s*[^\n]*)$/gim, '**$1**');
  
  // Handle "Group N:" patterns
  processed = processed.replace(/([^\n])(\s*)(Group\s+\d+[^:\n]*:)/gi, '$1\n**$3**');
  
  // Clean up any quadruple asterisks that got created
  processed = processed.replace(/\*\*\*\*+/g, '**');
  
  // Clean up multiple consecutive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  return processed.split('\n');
}

/**
 * Parses a line of text for Markdown formatting (bold, italic).
 */
export function parseMarkdownLine(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  
  let cleanedText = text;
  
  // Clean orphan trailing ** (e.g., "Activity 3: Using Cardinal Directions**")
  // This handles cases where ** appears at the end without a matching opening **
  cleanedText = cleanedText.replace(/([a-zA-Z0-9\.\)\]\!\?])\*\*\s*$/g, '$1');
  
  // Also clean ** that appear before punctuation at end
  cleanedText = cleanedText.replace(/\*\*([.\!\?])$/g, '$1');
  
  // Handle case: text has opening ** but trailing ** without content between them properly
  // e.g., "**Activity 3: Title**extra**" -> fix by removing orphan **
  const asteriskPairs = cleanedText.match(/\*\*/g) || [];
  if (asteriskPairs.length % 2 !== 0) {
    // Odd number - find and remove the orphan
    // Check if it's at the end
    if (cleanedText.endsWith('**')) {
      cleanedText = cleanedText.slice(0, -2);
    } else {
      // Find the last ** and remove it
      const lastIndex = cleanedText.lastIndexOf('**');
      if (lastIndex !== -1) {
        cleanedText = cleanedText.slice(0, lastIndex) + cleanedText.slice(lastIndex + 2);
      }
    }
  }
  
  // Now parse the cleaned text
  const parts = cleanedText.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      // Valid bold text
      tokens.push({ text: part.slice(2, -2), bold: true });
    } else if (part) {
      // Check for italic
      const italicParts = part.split(/(\*[^*]+\*)/g);
      for (const subPart of italicParts) {
        if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
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
