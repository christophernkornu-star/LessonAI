
const text = `
Here is a list:
- Item 1
- Item 2
* Item 3

### Section Header
Some text.

Note: This is important.
`;

function process(input) {
    console.log("--- Input ---");
    console.log(input);
    
    let processed = input;
    
    // Current logic
    if (processed.match(/\s\d+\.\s/)) processed = processed.replace(/(\s)(\d+\.\s)/g, '\n$2');
    if (processed.match(/\s[a-zA-Z][\)\.]\s/)) processed = processed.replace(/(\s)([a-zA-Z][\)\.]\s)/g, '\n$2');
    if (processed.match(/\sTier\s\d/)) processed = processed.replace(/(\s)(Tier\s\d)/g, '\n$2');

    const lines = processed.split('\n');
    console.log("--- Lines ---");
    lines.forEach(line => {
        console.log(`[${line}]`);
    });
}

process(text);
