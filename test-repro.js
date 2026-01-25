// console.log("--- TEST 1: Activity Merging ---");
// const res1 = cleanAndSplitText_MOCK(activityInput).join('\n');
// console.log(JSON.stringify(res1));

// DO NOT USE REQUIRE, just inline logic for testing in this env since we have module issues via node terminal
const activityInput = "Activity 1:\nIdentifying External Body Parts (15 mins)\n\nSome content.";
const numberingInput = "1. Identify at least five external parts.\n2. Describe a simple function.\n3.\nExplain with a local example how two body parts work together.";

function testLogic(text) {
    let processed = text;
    
    // --- MOCKING THE CRITICAL LOGIC ---
    
    // 1. Activity Join (Step 2.5)
    processed = processed.replace(/(Activity\s+\d+:)\s*\n\s*/gi, '$1 ');
    
    // 2. Numbering Fix (At end)
    processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');
    
    return processed;
}

console.log("Activity Res:", JSON.stringify(testLogic(activityInput)));
console.log("Numbering Res:", JSON.stringify(testLogic(numberingInput)));