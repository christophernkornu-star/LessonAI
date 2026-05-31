const sample = '$x = 10$ and $4 + 6 \\times 2 = 4 + 12 = 16$ and $(4 +\n6) \\times 2 = 10 \\times 2 = 20$ and $3 * 2 = 5$ + 6 = 11 cedis.';
const regex = /\$(?!\$)((?:[^$\n]|\n)*?)\$(?!\$)/g;
let match;
console.log('sample:', sample);
while ((match = regex.exec(sample)) !== null) {
  console.log('match:', match[0], 'body=', JSON.stringify(match[1]), 'index=', match.index);
}
const replaced = sample.replace(regex, (m, body) => body.includes('\n') ? `$$${body}$$` : m);
console.log('replaced:', replaced);
