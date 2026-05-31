function normalizeCancelArguments(text) {
  if (!text) return text;
  return text.replace(/\\(cancel|bcancel|xcancel)(?!\{)\s*([^\s\\{][^\s\\]*)/g, (_match, command, body) => {
    return `\\${command}{${body}}`;
  });
}

function normalizeLatexMathDelimiters(text) {
  if (!text) return text;
  let normalizedText = normalizeCancelArguments(text);
  normalizedText = normalizedText.replace(/(\${3,})([\s\S]*?)(\${3,})/g, (match, open, body, close) => {
    if (open.length !== close.length) return match;
    const delimiter = body.includes('\n') ? '$$' : '$';
    return `${delimiter}${body}${delimiter}`;
  });

  normalizedText = normalizedText.replace(/\$(?!\$)([\s\S]*?\n[\s\S]*?)\$(?!\$)/g, (_match, body) => {
    return `$$${body}$$`;
  });

  return normalizedText;
}

function removeOrphanAsterisks(text) {
  let result = text;
  const matches = result.match(/\*\*/g) || [];
  if (matches.length % 2 !== 0) {
    if (result.trimEnd().endsWith('**')) {
      result = result.replace(/\*\*\s*$/, '');
    }
  }
  result = result.replace(/([a-zA-Z0-9\.\)\]\!\?,;])\*\*(?=\s|$)/g, '$1');
  return result;
}

function cleanAndSplitText(text) {
  if (!text) return [];
  let processed = text;
  const blockMathPlaceholders = [];
  const placeholderPrefix = '@@LATEX_BLOCK_';
  const placeholderSuffix = '@@';
  processed = normalizeLatexMathDelimiters(processed);
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `${placeholderPrefix}${blockMathPlaceholders.length}${placeholderSuffix}`;
    blockMathPlaceholders.push(match);
    return placeholder;
  });
  processed = removeOrphanAsterisks(processed);
  processed = processed.replace(/([^\n\d=+\-*/^%])(\s+)(\d+\.\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n\d])(\s+)(\d+\)\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n])(\s+)([a-zA-Z][\)\.]56\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n])(\s+)(Tier\s\d)/gi, '$1\n$3');
  const newThoughtKeywords = ['Next,', 'Then,', 'Finally,', 'First,'];
  for (const keyword of newThoughtKeywords) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([.!?])\\s+(${escapedKeyword})`, 'gi');
    processed = processed.replace(regex, '$1\n$2');
    const regex2 = new RegExp(`\\.\\s+(${escapedKeyword})`, 'gi');
    processed = processed.replace(regex2, '.\n$1');
  }
  processed = processed.replace(/(\n|^)(?:\*+)?(Activity|Step|Part|Phase|Group)(?:\*+)?\s+(\d+)(?:(?:\*+)?(:|.*?:))?(?:\*+)?\s*[\r\n]+\s*/gi, '\n$1 $2$3 ');
  processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');
  processed = processed.replace(/(\n|^)(?!(?:\*\*)?(?:Activity|Step|Part|Phase|Group)\s+\d+)([^:\n]{3,60}:)[ \t]+([A-Z0-9(])/g, '$1$2\n$3');
  const lines = processed.split('\n').map((line) =>
    line.replace(/@@LATEX_BLOCK_(\d+)@@/g, (_match, index) => {
      const idx = Number(index);
      return blockMathPlaceholders[idx] || '';
    })
  );
  return lines;
}

const test = '$x = 10$ and $4 + 6 \\times 2 = 4 + 12 = 16$ and $(4 +\n6) \\times 2 = 10 \\times 2 = 20$ and $3 * 2 = 5$ + 6 = 11 cedis.';
console.log(cleanAndSplitText(test));
console.log(normalizeLatexMathDelimiters(test));
