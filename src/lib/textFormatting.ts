export interface TextToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Cleans orphan asterisks from text
 */
function removeOrphanAsterisks(text: string): string {
  let result = text;
  
  // Remove trailing ** that don't have a matching opening
  // e.g., "Activity 3: Using Cardinal Directions**" -> "Activity 3: Using Cardinal Directions"
  
  // First, count ** pairs
  const matches = result.match(/\*\*/g) || [];
  
  if (matches.length % 2 !== 0) {
    // Odd number means orphan exists
    // Check if it's at the end
    if (result.trimEnd().endsWith('**')) {
      result = result.replace(/\*\*\s*$/, '');
    }
  }
  
  // Also handle inline orphan ** followed by space or end
  // e.g., "text** more text" where ** has no opening
  result = result.replace(/([a-zA-Z0-9\.\)\]\!\?,;])\*\*(?=\s|$)/g, '$1');
  
  return result;
}

/**
 * Pre-processes text to fix jumbled lists and standardize formatting.
 * Splits combined lines (e.g. "1. A 2. B") into separate lines.
 */
export function cleanAndSplitText(text: string): string[] {
  if (!text) return [];

  let processed = text;
  
  // FIRST: Remove ALL orphan trailing ** throughout
  processed = removeOrphanAsterisks(processed);

  // Fix jumbled numbered lists with period (e.g. "1. Item 2. Item")
  processed = processed.replace(/([^\n\d])(\s+)(\d+\.\s)/g, '$1\n$3');

  // Fix jumbled numbered lists with parenthesis (e.g. "text 1) Item 2) Item")
  processed = processed.replace(/([^\n\d])(\s*)(\d+\)\s)/g, '$1\n$3');
  
  // Fix jumbled lettered lists (e.g. " a) Item b) Item")
  processed = processed.replace(/([^\n])(\s+)([a-zA-Z][\)\.]\s)/g, '$1\n$3');

  // Fix jumbled Tiers (e.g. " Tier 1 ... Tier 2 ...")
  processed = processed.replace(/([^\n])(\s+)(Tier\s\d)/gi, '$1\n$3');

  // [MOVED] Fix Broken Numbering block moved to END of function to prevent other rules from splitting it again

  
  // Split on sentence-ending keywords that indicate new thoughts/sections
  const newThoughtKeywords = [
    // Sequence/Order
    'Next,', 'Then,', 'Finally,', 'First,', 'Second,', 'Third,', 'Firstly,', 'Secondly,', 'Thirdly,',
    'Lastly,', 'To begin,', 'To start,', 'Initially,',
    // Addition
    'Additionally,', 'Moreover,', 'Furthermore,', 'In addition,', 'Also,', 'Besides,',
    'Equally important,', 'What is more,',
    // Contrast/Transition
    'However,', 'Nevertheless,', 'On the other hand,', 'Conversely,', 'In contrast,',
    'Although,', 'Despite this,', 'Yet,', 'Still,', 'Nonetheless,',
    // Cause/Effect
    'Therefore,', 'As a result,', 'Consequently,', 'Hence,', 'Thus,', 'Accordingly,',
    'For this reason,', 'Because of this,',
    // Examples
    'For example,', 'For instance,', 'Such as,', 'Specifically,', 'In particular,',
    'To illustrate,', 'As an example,',
    // Summary/Conclusion
    'In conclusion,', 'To summarize,', 'In summary,', 'To conclude,', 'Overall,',
    'In short,', 'Briefly,', 'To sum up,',
    // Time
    'Meanwhile,', 'Subsequently,', 'Afterwards,', 'Before this,', 'After this,',
    'During this,', 'At the same time,', 'Later,', 'Earlier,',
    // Emphasis
    'Indeed,', 'In fact,', 'Certainly,', 'Undoubtedly,', 'Clearly,',
    'Obviously,', 'Of course,', 'Importantly,', 'Significantly,',
    // Instruction/Direction
    'Note that', 'Remember that', 'Ensure that', 'Make sure', 'Be sure to',
    'It is important to', 'Students should', 'Learners should', 'Teachers should',
    'Ask students to', 'Have students', 'Guide students', 'Allow students',
    'Encourage students', 'Instruct students'
  ];
  
  for (const keyword of newThoughtKeywords) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match after sentence ending OR at start of text after space
    const regex = new RegExp(`([.!?])\\s+(${escapedKeyword})`, 'gi');
    processed = processed.replace(regex, '$1\n$2');
    // Also handle cases where keyword appears mid-text after a period
    const regex2 = new RegExp(`\\.\\s+(${escapedKeyword})`, 'gi');
    processed = processed.replace(regex2, '.\n$1');
  }
  
  // Split long sentences that start new instructions (common in lesson notes)
  // Pattern: sentence ending + capital letter starting new instruction
  processed = processed.replace(/([.!?])\s{2,}([A-Z])/g, '$1\n$2');
  
  // Ensure "The teacher" / "The learner" / "Students" starts on new line when it begins a new instruction
  processed = processed.replace(/([.!?])\s+(The teacher|The learner|Students|Learners|Pupils)/g, '$1\n$2');
  processed = processed.replace(/([.!?])\s+(Ask |Tell |Show |Explain |Demonstrate |Guide |Have |Let |Allow |Encourage )/g, '$1\n$2');

  // ACTIVITY/STEP/PART/PHASE/GROUP FORMATTING
  // These headers should be on their own line and fully bolded
  
  // Step 1: Remove any existing ** around these headers to normalize processing
  const headerPattern = 'Activity|Step|Part|Phase|Group';
  
  // Case 1: **Activity X:** or **Activity X** (Strip surrounding keys)
  // We use replace function to handle case insensitivity and referencing groups carefully
  processed = processed.replace(new RegExp(`\\*\\*(${headerPattern})\\s+(\\d+:?)\\*\\*`, 'gi'), '$1 $2');
  
  // Case 2: **Activity X... (Leading only)
  processed = processed.replace(new RegExp(`\\*\\*(${headerPattern})\\s+(\\d+:?)`, 'gi'), '$1 $2');
  
  // Case 3: ...Activity X:** (Trailing only)
  processed = processed.replace(new RegExp(`(${headerPattern})\\s+(\\d+:?)\\*\\*`, 'gi'), '$1 $2');
  
  // Case 4: **Activity X** followed by colon (Caught by general logic often, but specific fix)
  processed = processed.replace(new RegExp(`\\*\\*(${headerPattern})\\s+(\\d+)\\*\\*(:)`, 'gi'), '$1 $2$3');
  
  
  // Step 2: Ensure headers start on new line
  // MOVED DOWN AFTER MERGE to ensure we don't accidentally split what we just merged 
  // if the merge logic creates a pattern that this regex matches.
  // Actually, wait, this ensures BEFORE logic. 
  // Let's keep it here but refine it to NOT split if it's start of string.
  // The regex ([^\n]) handles that.
  
  // Step 2.5: Ensure content follows on same line!
  // Robust Regex: 
  // 1. Matches optional leading **
  // 2. Matches Activity/Step/etc + Number
  // 3. Matches optional colon and trailing **
  // 4. Matches ANY amount of whitespace (including newlines) following it
  // Replaces with single space.
  const mergePattern = /(\**(?:Activity|Step|Part|Phase|Group)\s+\d+(?::|.*?:)?\**)\s*[\r\n]+\s*/gi;
  processed = processed.replace(mergePattern, '$1 ');

  // Step 2 (Re-applied/Moved): Ensure headers start on new line (but keep joined content)
  // Ensure "Activity X" is preceded by newline if there's text before it
  processed = processed.replace(/([^\n])\s*(Activity\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Step\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Part\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Phase\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Group\s+\d+)/gi, '$1\n\n$2');
  
  // Step 3: Wrap entire header lines in bold
  // Process line by line to properly wrap
  const lines = processed.split('\n');
  const processedLines = lines.map(line => {
    let trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return line;
    
    // Check if line starts with a header pattern
    if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(trimmed)) {
      // Remove any trailing ** first
      trimmed = trimmed.replace(/\*\*\s*$/, '');
      // Remove any leading ** 
      trimmed = trimmed.replace(/^\*\*/, '');
      // Now wrap in bold if not already wrapped
      if (!trimmed.startsWith('**')) {
        return `**${trimmed}**`;
      }
    }
    
    // Check if line starts with "Lesson:" header - ensure it's bolded
    if (/^Lesson:\s*\d+\s*of\s*\d+/i.test(trimmed)) {
      // Remove any existing bold markers
      trimmed = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '');
      if (!trimmed.startsWith('**')) {
        return `**${trimmed}**`;
      }
    }
    
    return line;
  });
  
  processed = processedLines.join('\n');
  
  // Final cleanup
  // Remove quadruple+ asterisks
  processed = processed.replace(/\*{4,}/g, '**');
  
  // Clean up multiple consecutive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');

  // Fix Broken Numbering (MOVED to end to ensure it persists)
  // Re-run this check one more time with a slightly more permissive regex for cases where the split logic above might have shifted things
  processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');

  // Feature: Force split for headers ending in colons that are inline
  // e.g. "The teacher asks: Students do X" -> "The teacher asks:\nStudents do X"
  // Look for: start of line, 3-60 chars of text, colon, whitespace, then capital letter or number
  // EXCLUDE: Activity/Step/Part/Phase/Group headers (using negative lookahead)
  processed = processed.replace(/(\n|^)(?!(?:Activity|Step|Part|Phase|Group)\s+\d+)([^:\n]{3,60}:)[ \t]+([A-Z0-9(])/g, '$1$2\n$3');
  
  return processed.split('\n');
}

/**
 * Parses a line of text for Markdown formatting (bold, italic).
 */
export function parseMarkdownLine(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  
  let cleanedText = text;
  
  // Step 1: Remove orphan trailing **
  cleanedText = removeOrphanAsterisks(cleanedText);
  
  // Step 2: Verify even number of ** pairs, if not, clean up
  let pairCount = (cleanedText.match(/\*\*/g) || []).length;
  while (pairCount % 2 !== 0 && pairCount > 0) {
    // Remove the last ** 
    const lastIdx = cleanedText.lastIndexOf('**');
    if (lastIdx >= 0) {
      cleanedText = cleanedText.slice(0, lastIdx) + cleanedText.slice(lastIdx + 2);
    }
    pairCount = (cleanedText.match(/\*\*/g) || []).length;
  }
  
  // Step 3: Parse bold sections
  const parts = cleanedText.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      // Valid bold text - extract content
      const boldContent = part.slice(2, -2);
      if (boldContent.trim()) {
        tokens.push({ text: boldContent, bold: true });
      }
    } else if (part) {
      // Check for italic (*text*)
      const italicParts = part.split(/(\*[^*]+\*)/g);
      for (const subPart of italicParts) {
        if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2 && !subPart.startsWith('**')) {
          tokens.push({ text: subPart.slice(1, -1), italic: true });
        } else if (subPart) {
          // Plain text - remove any stray ** that might remain
          const cleanSubPart = subPart.replace(/\*\*/g, '');
          if (cleanSubPart) {
            tokens.push({ text: cleanSubPart });
          }
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
