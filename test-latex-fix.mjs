// Test the malformed LaTeX normalization

const text = `P(\\textHead) = (\\textNumber of ways to get Head)/(\\textTotal number of possible outcomes) = 1/2
Learners repeat this for getting a Tail.
The teacher then demonstrates for a die:
P(\\textgetting a 3) = 1/6
Learners calculate the probability of getting an even number on a die: possible even numbers are 2, 4, 6 (3 ways), so P(\\texteven) = 3/6 = 1/2.`;

console.log('=== ORIGINAL TEXT ===');
console.log(text);
console.log('\n=== TESTING FIX ===');

const validTextMacros = new Set([
  'bf', 'it', 'tt', 'sl', 'sc', 'sf', 'md', 'up', 'rm',
  'normal', 'color', 'style', 'size', 'width', 'height', 'kern',
  'large', 'large', 'small', 'tiny', 'huge', 'Huge', 'scriptsize',
  'footnotesize', 'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle'
]);

const result = text.replace(/\\text(?!\{)([A-Za-z]+(?:\s+[A-Za-z]+)*)/g, (match, content) => {
  const normalized = content.trim();
  const lower = normalized.toLowerCase();
  
  console.log(`  Found: "${match}" -> capture: "${normalized}" (lowercase: "${lower}")`);
  
  if (validTextMacros.has(lower) || lower.startsWith('color') || lower.startsWith('normal')) {
    console.log(`    → SKIPPED (valid macro)`);
    return match;
  }
  
  console.log(`    → FIXED to \\text{${normalized}}`);
  return `\\text{${normalized}}`;
});

console.log('\n=== RESULT TEXT ===');
console.log(result);
