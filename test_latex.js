// Test the wrapMathInLatex function
function wrapMathInLatex(text) {
  if (!text) return text;
  let formatted = text;
  formatted = formatted.replace(/(\b\d+(?:\.\d+)?|\b[a-zA-Z])\s*([+\-*/=^])\s*(\d+(?:\.\d+)?|\b[a-zA-Z])(?:\s*([+\-*/=^])\s*(\d+(?:\.\d+)?|\b[a-zA-Z]))*/g, (match) => {
    if (match.includes('=') || (match.match(/[+\-*/^]/g) || []).length > 1) {
      return `$${match}$`;
    }
    return match;
  });
  formatted = formatted.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
    return `$${num}/${den}$`;
  });
  formatted = formatted.replace(/(\d+|[a-zA-Z])\s*\^\s*(\d+|[a-zA-Z])/g, (match, base, exp) => {
    return `$${base}^{${exp}}$`;
  });
  formatted = formatted.replace(/√\s*(\d+|[a-zA-Z])/g, (match, num) => {
    return `$\sqrt{${num}}$`;
  });
  formatted = formatted.replace(/sqrt\s*\(\s*(\d+|[a-zA-Z])\s*\)/gi, (match, num) => {
    return `$\sqrt{${num}}$`;
  });
  formatted = formatted.replace(/(\b[a-zA-Z]\w*\b|\d+(?:\.\d+)?)\s*([+\-*/=^])\s*(\b[a-zA-Z]\w*\b|\d+(?:\.\d+)?)(?:\s*([+\-*/=^])\s*(\b[a-zA-Z]\w*\b|\d+(?:\.\d+)?))*/g, (match) => {
    const operators = match.match(/[+\-*/=^]/g);
    if (operators && operators.length >= 1) {
      return `$${match}$`;
    }
    return match;
  });
  return formatted;
}

const testText = '1. Model and solve: x + 5 = 11. Write the answer. Also 2 + 2 = 4 and 1/2 fraction.';
console.log('Original:', testText);
console.log('Wrapped:', wrapMathInLatex(testText));