
const inputs = [
    "Activity 3:\nUnderstanding Interdependence",
    "**Activity 3:**\nUnderstanding Interdependence",
    "**Activity 3**:\nUnderstanding Interdependence",
    "Activity 3**:**\nUnderstanding Interdependence",
    "Activity 3: **Understanding Interdependence**"
];

function testCleaning(text) {
    let processed = text;
    
    // Simulate Step 1 (Current Implementation)
    const headerTypes = ['Activity', 'Step', 'Part', 'Phase', 'Group'];
    for (const name of headerTypes) {
        // Current:
        processed = processed.replace(new RegExp(`\\*\\*(${name}\\s+\\d+:?)`, 'gi'), '$1');
        processed = processed.replace(new RegExp(`(${name}\\s+\\d+:[^\\n]*)\\*\\*`, 'gi'), '$1');
    }
    
    // Simulate Step 2.5 (Current)
    processed = processed.replace(/(Activity\s+\d+:)\s*\n\s*/gi, '$1 ');
    
    return processed;
}

function testProposed(text) {
    let processed = text;
    
    // Proposed Pre-Clean: Aggressively remove ** around headers
    const headers = 'Activity|Step|Part|Phase|Group';
    // Case 1: **Activity X:**
    processed = processed.replace(new RegExp(`\\*\\*(${headers})\\s+(\\d+:?)\\*\\*`, 'gi'), '$1 $2');
    // Case 2: **Activity X** (colon or no colon)
    processed = processed.replace(new RegExp(`\\*\\*(${headers})\\s+(\\d+)(:?)\\*\\*`, 'gi'), '$1 $2$3');
    // Case 3: **Activity X:
    processed = processed.replace(new RegExp(`\\*\\*(${headers})\\s+(\\d+:?)`, 'gi'), '$1 $2');
    // Case 4: Activity X:**
    processed = processed.replace(new RegExp(`(${headers})\\s+(\\d+:?)\\*\\*`, 'gi'), '$1 $2');
    
    // Merge
    processed = processed.replace(new RegExp(`(${headers})\\s+(\\d+:?)\\s*\\n\\s*`, 'gi'), '$1 $2 ');
    
    return processed;
}

console.log("--- CURRENT LOGIC ---");
inputs.forEach(i => console.log(`'${i.replace(/\n/g, '\\n')}' -> '${testCleaning(i).replace(/\n/g, '\\n')}'`));

console.log("\n--- PROPOSED LOGIC ---");
inputs.forEach(i => console.log(`'${i.replace(/\n/g, '\\n')}' -> '${testProposed(i).replace(/\n/g, '\\n')}'`));
