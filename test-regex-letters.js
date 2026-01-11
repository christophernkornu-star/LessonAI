
const text = "1. Discovery Task (10 Mins): In Mixed-Ability Groups Of 4-5, Learners Open A Presentation Software (E.G., PowerPoint, Impress). Their Task Is To Discover How To: A) Start A New Blank Slide. B) Find And Insert A 'Rectangle' Shape. C) Find And Insert An 'Arrow' Shape. One Group Member Records The Steps.";

const text2 = "3. Differentiated Group Work (10 Mins): Groups Choose One Task: Tier 1 (Support): Create A Slide Showing A Traffic Light In Accra Using Three Circles (Red, Yellow, Green) And Text Labels. Tier 2 (Core): Create A Slide Showing The Flow Of Cocoa Beans From Farm In Sunyani To Port In Tema Using Rectangles (Farm, Truck, Port) And Connecting Arrows With Labels. Tier 3 (Extension): Design A Simple Adinkra Symbol (Like A Heart For 'Sankofa') Using Combined Shapes (Circles, Lines) And Add A Text Box Explaining Its Meaning.";

function process(input) {
    console.log("--- Input ---");
    console.log(input);
    
    let processed = input;
    
    // Numbered lists
    if (processed.match(/\s\d+\.\s/)) {
        processed = processed.replace(/(\s)(\d+\.\s)/g, '\n$2');
    }
    
    // Lettered lists (A) or A.)
    if (processed.match(/\s[A-Z][\)\.]\s/)) {
        processed = processed.replace(/(\s)([A-Z][\)\.]\s)/g, '\n$2');
    }

    // Tiers
    if (processed.match(/\sTier\s\d/)) {
        processed = processed.replace(/(\s)(Tier\s\d)/g, '\n$2');
    }

    console.log("--- Output ---");
    console.log(processed);
}

process(text);
process(text2);
