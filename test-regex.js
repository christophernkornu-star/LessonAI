
const text = '1. In Pairs, Learners Discuss And List Three Traditional Ghanaian Symbols Or Patterns They Know (E.G., Adinkra Symbols Like Gye Nyame, Traditional Kente Patterns). 2. The Teacher Projects A Simple Slide Showing A Map Of Ghana\'S Regions. Learners Are Asked: "How Could We Use Shapes And Labels On This Map To Show The Capital Cities?" 3. Learners Share Their Ideas With The Class. The Teacher Connects The Discussion To The Day\'S Topic: Using Shapes And Text In Presentation Software.';

const text2 = '1. **Discovery Task (10 Mins):** In Mixed-Ability Groups Of 4-5, Learners Open A Presentation Software (E.G., PowerPoint, Impress). Their Task Is To Discover How To: A) Start A New Blank Slide. B) Find And Insert A \'Rectangle\' Shape. C) Find And Insert An \'Arrow\' Shape. One Group Member Records The Steps. 2. **Guided Practice - Creating A Ghanaian Market Scene (15 Mins):** The Teacher Demonstrates Inserting A Drawing Canvas. Each Group Then Creates A Slide Titled \'Kumasi Central Market\'. They Must: A) Insert A Large Rectangle As A \'Market Stall\'. B) Insert A Circle And Label It As \'Oranges\' Costing 5 Ghana Cedis. C) Insert An Arrow Pointing From The Stall To The Circle. D) Add Text Inside The Rectangle That Says "Ama\'S Fruit Stall". 3. **Differentiated Group Work (10 Mins):** Groups Choose One Task: **Tier 1 (Support):** Create A Slide Showing A Traffic Light In Accra Using Three Circles (Red, Yellow, Green) And Text Labels. **Tier 2 (Core):** Create A Slide Showing The Flow Of Cocoa Beans From Farm In Sunyani To Port In Tema Using Rectangles (Farm, Truck, Port) And Connecting Arrows With Labels. **Tier 3 (Extension):** Design A Simple Adinkra Symbol (Like A Heart For \'Sankofa\') Using Combined Shapes (Circles, Lines) And Add A Text Box Explaining Its Meaning.';

function process(input) {
    console.log("--- Input ---");
    console.log(input.substring(0, 50) + "...");
    
    if (input.match(/\s\d+\.\s/)) {
        const replaced = input.replace(/(\s)(\d+\.\s)/g, '\n$2');
        console.log("--- Replaced ---");
        console.log(replaced);
        const split = replaced.split('\n');
        console.log("--- Split Lines ---");
        console.log(split.length);
        split.forEach((l, i) => console.log(`${i}: ${l.substring(0, 30)}...`));
    } else {
        console.log("NO MATCH FOUND");
    }
}

process(text);
process(text2);
