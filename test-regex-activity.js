
const input1 = "Activity 3:\nUnderstanding Interdependence";
const input2 = "**Activity 3:**\nUnderstanding Interdependence";
const input3 = "Activity 3:   \n   Understanding Interdependence";
const input4 = "Activity 3:\n\nUnderstanding Interdependence"; // Double newline

const regex = /(\**Activity\s+\d+\s*:?)\s*\n\s*/gi;

console.log("Input 1:", JSON.stringify(input1.replace(regex, '$1 ')));
console.log("Input 2:", JSON.stringify(input2.replace(regex, '$1 ')));
console.log("Input 3:", JSON.stringify(input3.replace(regex, '$1 ')));
console.log("Input 4:", JSON.stringify(input4.replace(regex, '$1 ')));
