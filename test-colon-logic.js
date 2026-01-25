
const lines = [
    "The teacher asks practical questions:",
    "**The teacher asks:**",
    "Activity 3: doing something",
    "Simple Header:",
    "Header with trailing space: ",
    "Header with **bold** markers inside:", 
    "Just a normal line ending with colon:"
];

lines.forEach(line => {
    let trimmedLine = line.trim();
    const isBold = trimmedLine.replace(/[\*_]+$/, '').trim().endsWith(':');
    console.log(`'${line}' -> Bold: ${isBold}`);
});
