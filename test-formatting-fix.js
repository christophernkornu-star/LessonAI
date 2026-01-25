
// const { cleanAndSplitText } = require('./src/lib/textFormatting'); 

function runTest() {
    console.log("Running Formatting Tests...");

    // Test 1: Broken Numbering
    const input1 = "Here is a list:\n4.\nThis is an example.\n5.\nAnother example.";
    const expected1 = "Here is a list:\n4. This is an example.\n5. Another example.";
    
    // Note: cleanAndSplitText returns an array of lines, so we join for comparison
    const result1Arr = cleanAndSplitText(input1);
    const result1 = result1Arr.join('\n'); // Note: cleanAndSplitText might add extras due to other rules

    console.log(`Test 1 Input:\n${JSON.stringify(input1)}`);
    console.log(`Test 1 Output:\n${JSON.stringify(result1)}`);
    
    // Check if "4. This" is together
    if (result1.includes("4. This")) {
        console.log("PASS: 4. joined correctly");
    } else {
        console.log("FAIL: 4. still separated");
    }

     // Test 2: Bolding Headers ending in Colon (Logic simulates docx service)
     const colLine1 = "The teacher asks practical questions:";
     const colLine2 = "**The teacher asks:**";
     const colLine3 = "Activity 3: Doing Things"; // Should NOT end with colon logically for the bold check (ends with 'Things')

     function checkBold(line) {
        return line.replace(/[\*_]+$/, '').trim().endsWith(':');
     }

     console.log(`Check "The teacher asks practical questions:": ${checkBold(colLine1)} (Expected: true)`);
     console.log(`Check "**The teacher asks:**": ${checkBold(colLine2)} (Expected: true)`);
     console.log(`Check "Activity 3: Doing Things": ${checkBold(colLine3)} (Expected: false)`);
}

// Mocking required parts since I can't import TS directly easily without compilation in this env
// I will just copy the relevant functions into this test file for verification

// --- COPIED CODE START ---
function cleanAndSplitText_MOCK(text) {
  if (!text) return [];

  let processed = text;
  
  // processed = removeOrphanAsterisks(processed); // Skipping for brevity

  // Fix jumbled numbered lists
  processed = processed.replace(/([^\n\d])(\s+)(\d+\.\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n\d])(\s*)(\d+\)\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n])(\s+)([a-zA-Z][\)\.]\s)/g, '$1\n$3');
  processed = processed.replace(/([^\n])(\s+)(Tier\s\d)/gi, '$1\n$3');

  // Fix Broken Numbering
  processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');
 
  // Skipping split on keywords for this specific test as it might interfere
  
  // Return split
  return processed.split('\n');
}
// --- COPIED CODE END ---

// Redefine test to use mock
const processed = cleanAndSplitText_MOCK("4.\nThis is an example");
console.log("Result:", processed);
