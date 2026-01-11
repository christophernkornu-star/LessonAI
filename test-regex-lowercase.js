
const text = "1. Task: a) Do this. b) Do that. A) Big task. B) Another big task.";

function process(input) {
    console.log("--- Input ---");
    console.log(input);
    
    let processed = input;
    
    // Lettered lists (A) or A. or a) or a.)
    if (processed.match(/\s[a-zA-Z][\)\.]\s/)) {
        processed = processed.replace(/(\s)([a-zA-Z][\)\.]\s)/g, '\n$2');
    }

    console.log("--- Output ---");
    console.log(processed);
}

process(text);
