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
  const blockMathPlaceholders: string[] = [];
  const placeholderPrefix = '@@LATEX_BLOCK_';
  const placeholderSuffix = '@@';

  // Normalize math delimiters before protecting block math.
  processed = normalizeLatexMathDelimiters(processed);

    // Protect complete block math blocks so line splitting doesn't break them.
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `${placeholderPrefix}${blockMathPlaceholders.length}${placeholderSuffix}`;
    blockMathPlaceholders.push(match);
    return placeholder;
  });

  // ALSO protect inline $...$ math blocks so line splitting doesn't break them.
  const inlineMathPrefix = '@@INLINE_LATEX_';
  const inlineMathPlaceholders: string[] = [];
  processed = processed.replace(/\$[^$\n]+\$/g, (match) => {
    const placeholder = `${inlineMathPrefix}${inlineMathPlaceholders.length}${placeholderSuffix}`;
    inlineMathPlaceholders.push(match);
    return placeholder;
  });

    // FIRST: Remove ALL orphan trailing ** throughout
  processed = removeOrphanAsterisks(processed);

  // Fix jumbled numbered lists with period (e.g. "1. Item 2. Item")
  // Avoid splitting math expressions such as "x + 5 = 11." by excluding common operators.
  // Only split when the next text looks like a list item, not when it is an equation or formula.
  processed = processed.replace(/([^\n])\s+(\d+\.\s+(?=[A-Za-z]))/g, '$1\n$2');

    // Fix jumbled numbered lists with parenthesis (e.g. "text 1) Item 2) Item")
  // CRITICAL: Exclude math operators (+, -, *, /, =, <, >) as the preceding character
  // to avoid splitting math expressions like "(5 + 3) * 2" where "3)" is mistaken as numbering
  processed = processed.replace(/([^\n\d+\-*/=<>\^])\s+(\d+\)\s+(?=[A-Za-z]))/g, '$1\n$2');
  
  // Fix jumbled lettered lists (e.g. "a) Item b) Item")
  // Only split when the marker is followed by a word start, not a standalone parenthetical expression.
  processed = processed.replace(/([^\n])\s+([a-zA-Z][\)\.])\s+(?=[A-Za-z])/g, '$1\n$2 ');

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
  
  // Step 2 (Re-applied/Moved): Ensure headers start on new line (but keep joined content)
  // Ensure "Activity X" is preceded by newline if there's text before it
  processed = processed.replace(/([^\n])\s*(Activity\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Step\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Part\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Phase\s+\d+:)/gi, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(Group\s+\d+)/gi, '$1\n\n$2');
  
  // Step 2.5: Ensure content follows on same line!
  // Robust Regex: 
  // 1. Matches optional leading **
  // 2. Matches Activity/Step/etc + Number (Allowing for interspersed **)
  // 3. Matches optional colon and trailing **
  // 4. Matches ANY amount of whitespace (including newlines) following it
  // Replaces with single space.
  
  // Regex Explanation:
  // (\*+)? matches optional leading asterisks
  // (Activity|Step|...) matches keyword
  // (\*+)? matches optional asterisks after keyword
  // \s+ matches space
  // \d+ matches number
  // ((?:\*+)?:|:)? matches optional colon with potential asterisks
  // (\*+)? matches optional split trailing asterisks
  
  // Simplified Helper: First normalize "Activity X" lines by removing internal/surrounding ** so we can match cleanly
  // This is safe because we re-bold completely in Step 3
  
  // Replace: "**Activity** 3:" or "**Activity 3**:" or "Activity 3:" followed by newline -> "Activity 3: "
  const mergePattern = /(?:^|\n)(?:\*+)?(Activity|Step|Part|Phase|Group)(?:\*+)?\s+(\d+)(?:(?:\*+)?(:|.*?:))?(?:\*+)?\s*[\r\n]+\s*/gi;
  processed = processed.replace(mergePattern, '\n$1 $2$3 ');

  // Final Numbering Check (e.g. Activity 1: 1. Item... -- ensuring numbering integrity if messy)
  
  // Final Numbering Check (e.g. Activity 1: 1. Item... -- ensuring numbering integrity if messy)
  // Join lines where a line ends with a number and period (or paren) and the next line starts with text
  processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');
  
  // Step 3: Wrap entire header lines in bold
  // Process line by line to properly wrap
  const headerLines = processed.split('\n');
  const processedLines = headerLines.map(line => {
    let trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return line;
    
    // Check if line starts with a header pattern
    if (/^(Activity|Step|Part|Phase|Group)\s+\d+/i.test(trimmed)) {
      // Remove any trailing ** first
      trimmed = trimmed.replace(/\*\*\s*$/, '');
      // Remove any leading ** 
      trimmed = trimmed.replace(/^\*\*/, '');
      
      // CRITICAL FIX: Remove inner ** to avoid nested bold issues (e.g. "**Activity 3: **Title**")
      // We want the WHOLE line to be one bold block.
      trimmed = trimmed.replace(/\*\*/g, '');
      
      // Now wrap in bold
      return `**${trimmed}**`;
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
  
  // Explicitly check for lone "3." or similar that might be on its own line after all processing
  processed = processed.replace(/\n(\s*\d+\.\s*)\n/g, '\n$1'); // Ensure it doesn't get double spaced if empty line
  
  // CRITICAL FIX: If we have "3.\nText" at the end, join it.
  // The global regex above handles it, but let's be sure about the final split.

  // Join broken parenthetical fragments across accidental newlines, e.g. "2 (sectors 2 and\n4)"
  // This preserves inline parenthetical expressions while leaving real sentence breaks intact.
  processed = processed.replace(/\(([^\n]*)\n([^\n]*)\)/g, '($1 $2)');

  // Feature: Force split for headers ending in colons that are inline
  // e.g. "The teacher asks: Students do X" -> "The teacher asks:\nStudents do X"
  // Look for: start of line, 3-60 chars of text, colon, whitespace, then capital letter or number
  // EXCLUDE: Activity/Step/Part/Phase/Group headers (using negative lookahead) - now robust for ** wrapper
  processed = processed.replace(/(\n|^)(?!(?:\*\*)?(?:Activity|Step|Part|Phase|Group)\s+\d+)([^:\n]{3,60}:)[ \t]+([A-Z0-9(])/g, '$1$2\n$3');
  
    const lines = processed.split('\n').map((line) => {
    // Restore both block math and inline math placeholders
    let restored = line.replace(/@@LATEX_BLOCK_(\d+)@@/g, (_match, index) => {
      const idx = Number(index);
      return blockMathPlaceholders[idx] || '';
    });
    restored = restored.replace(/@@INLINE_LATEX_(\d+)@@/g, (_match, index) => {
      const idx = Number(index);
      return inlineMathPlaceholders[idx] || '';
    });
    return restored;
  });

  return lines;
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

const latexSymbolMap: Record<string, string> = {
  '\\geq': '≥',
  '\\leq': '≤',
  '\\neq': '≠',
  '\\gt': '>',
  '\\lt': '<',
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\approx': '≈',
  '\\le': '≤',
  '\\ge': '≥',
  '\\sqrt': '√',
};

function replaceLatexSymbols(text: string): string {
  return text.replace(/\\(geq|leq|neq|gt|lt|times|div|pm|approx|le|ge|sqrt)/g, (match) => {
    return latexSymbolMap[match] || match;
  });
}

export type MathTextSegment =
  | { type: 'text'; text: string }
  | { type: 'math'; text: string };

function normalizeCancelArguments(text: string): string {
  if (!text) return text;
  return text.replace(/\\(cancel|bcancel|xcancel)(?!\{)\s*([^\s\\{][^\s\\]*)/g, (_match, command, body) => {
    return `\\${command}{${body}}`;
  });
}

/**
 * Fixes malformed \text commands in LaTeX.
 * Converts \textevent, \textnumber, etc. to \text{event}, \text{number}
 */
function fixMalformedTextCommands(text: string): string {
  if (!text) return text;
  const validTextMacros = new Set([
    'bf', 'it', 'tt', 'sl', 'sc', 'sf', 'md', 'up', 'rm',
    'normal', 'color', 'style', 'size', 'width', 'height', 'kern',
    'large', 'large', 'small', 'tiny', 'huge', 'Huge', 'scriptsize',
    'footnotesize', 'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle'
  ]);

  return text.replace(/\\text(?!\{)([A-Za-z]+(?:\s+[A-Za-z]+)*)/g, (match, content) => {
    const normalized = content.trim();
    const lower = normalized.toLowerCase();

    if (validTextMacros.has(lower) || lower.startsWith('color') || lower.startsWith('normal')) {
      return match;
    }

    return `\\text{${normalized}}`;
  });
}

export function normalizeLatexMathDelimiters(text: string): string {
  if (!text) return text;
  let normalizedText = normalizeCancelArguments(text);
  normalizedText = fixMalformedTextCommands(normalizedText);
  normalizedText = normalizedText.replace(/(\${3,})([\s\S]*?)(\${3,})/g, (match, open, body, close) => {
    if (open.length !== close.length) return match;
    const delimiter = body.includes('\n') ? '$$' : '$';
    return `${delimiter}${body}${delimiter}`;
  });

  // Convert single-dollar math containing newlines into block math.
  normalizedText = normalizedText.replace(/\$(?!\$)((?:[^$\n]|\n)*?)\$(?!\$)/g, (match, body) => {
    if (body.includes('\n')) {
      return `$$${body}$$`;
    }
    return match;
  });

  return normalizedText;
}

export function splitTextByLatexMath(text: string): MathTextSegment[] {
  if (!text) return [];
  const normalizedText = normalizeLatexMathDelimiters(text);
  // First, protect bare LaTeX commands that lack $ delimiters by wrapping them.
  // This handles cases where the AI outputs \text{...} or \frac{...}{...} without $...$ wrapping.
  const protectedText = wrapBareLatexInMathDelimiters(normalizedText);
  const parts = protectedText.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\(?:cancel|bcancel|xcancel|frac|sqrt|leq|geq|neq|lt|gt|times|div|pm|approx)\{[^}\n]+\}(?:\{[^}\n]+\})?)/g);
  return parts.filter(Boolean).map((segment) => {
    if (segment.startsWith('$$') && segment.endsWith('$$')) {
      return { type: 'math', text: segment.slice(2, -2).trim() };
    }
    if (segment.startsWith('$') && segment.endsWith('$')) {
      return { type: 'math', text: segment.slice(1, -1).trim() };
    }
    return { type: 'text', text: segment };
  });
}

/**
 * Automatically wraps bare LaTeX commands (like \text{}, \frac{}, \sqrt{}, etc.)
 * that are NOT already wrapped in $...$ or $$...$$ delimiters.
 * This handles cases where the AI generates LaTeX without proper $ delimiters.
 * 
 * We use a targeted approach: only wrap text that contains known math LaTeX 
 * command patterns with braces (\text{...}, \frac{...}{...}, etc.) since these 
 * are unambiguous indicators of math content.
 */
function wrapBareLatexInMathDelimiters(text: string): string {
  if (!text) return text;
  
  const result: string[] = [];
  // Split by existing math delimiters to avoid double-wrapping
  const segments = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  
  for (const segment of segments) {
    // If this segment is already wrapped in $...$ or $$...$$, keep it as-is
    if ((segment.startsWith('$$') && segment.endsWith('$$')) || 
        (segment.startsWith('$') && segment.endsWith('$'))) {
      result.push(segment);
      continue;
    }
    
    // Check if this text segment contains bare LaTeX math commands.
    // We use a precise pattern to match common math LaTeX commands with brace arguments:
    // \frac{...}{...}, \text{...}, \sqrt{...}, \cancel{...}, \bcancel{...}, \xcancel{...}
    // Also match command sequences like \leq, \geq, \neq enclosed in the expression
    const hasBareFraction = /\\frac\s*\{[^}]*\}\s*\{[^}]*\}/.test(segment);
    const hasBareText = /\\text\s*\{[^}]*\}/.test(segment);
    const hasBareSqrt = /\\sqrt\s*\{[^}]*\}/.test(segment);
    const hasBareCancel = /\\(?:cancel|bcancel|xcancel)\s*\{[^}]*\}/.test(segment);
    
    if (hasBareFraction || hasBareText || hasBareSqrt || hasBareCancel) {
      // Wrap the entire segment in $...$ if it contains bare LaTeX
      result.push('$' + segment + '$');
    } else {
      result.push(segment);
    }
  }
  
  return result.join('');
}

function simplifyLatexBody(mathText: string): string {
  let simplified = mathText;
  simplified = simplified.replace(/\\frac\s*\{\s*([^}]+)\s*\}\s*\{\s*([^}]+)\s*\}/g, '$1/$2');
  simplified = replaceLatexSymbols(simplified);
  simplified = simplified.replace(/[{}]/g, '');
  simplified = simplified.replace(/\s+/g, ' ').trim();
  return simplified;
}

export function stripLatexMathForDocx(text: string): string {
  if (!text) return text;
  let processed = normalizeLatexMathDelimiters(text);
  // Replace common LaTeX commands with Unicode equivalents for plain text fallback
  processed = processed.replace(/\\(cancel|bcancel|xcancel)\s*\{([^}]*)\}/g, '$2');
  processed = processed.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '$1/$2');
  processed = processed.replace(/\\(sqrt)\s*\{([^}]*)\}/g, '√$2');
  processed = replaceLatexSymbols(processed);
  // Remove remaining $ delimiters
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  processed = processed.replace(/\$([^$\n]+)\$/g, '$1');
  return processed;
}

/**
 * Helper to capitalize first letter only
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
