// Ghana National Pre-tertiary Education Curriculum - Subjects and Strands

export interface CurriculumStrand {
  value: string;
  label: string;
  subStrands?: string[];
}

export interface Subject {
  value: string;
  label: string;
  strands: CurriculumStrand[];
  levels?: string[]; // Optional array of class levels this subject applies to
}

export const SUBJECTS: Subject[] = [
  {
    value: "mathematics",
    label: "Mathematics",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "number",
        label: "Number",
        subStrands: ["Whole Numbers", "Fractions", "Decimals", "Percentages", "Ratio and Proportion"]
      },
      {
        value: "algebra",
        label: "Algebra",
        subStrands: ["Patterns", "Expressions", "Equations", "Inequalities"]
      },
      {
        value: "geometry-measurement",
        label: "Geometry and Measurement",
        subStrands: ["2D Shapes", "3D Shapes", "Length", "Area", "Volume", "Time", "Money"]
      },
      {
        value: "data",
        label: "Data",
        subStrands: ["Data Collection", "Data Representation", "Data Analysis", "Probability"]
      }
    ]
  },
  {
    value: "english",
    label: "English Language",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "oral-language",
        label: "Oral Language",
        subStrands: ["Listening", "Speaking", "Oral Comprehension"]
      },
      {
        value: "reading",
        label: "Reading",
        subStrands: ["Reading Fluency", "Comprehension", "Vocabulary"]
      },
      {
        value: "writing",
        label: "Writing",
        subStrands: ["Grammar", "Composition", "Spelling", "Handwriting"]
      },
      {
        value: "literature",
        label: "Literature",
        subStrands: ["Poetry", "Prose", "Drama"]
      }
    ]
  },
  {
    value: "science",
    label: "Science",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "diversity-living-things",
        label: "Diversity of Living Things",
        subStrands: ["Plants", "Animals", "Microorganisms", "Classification"]
      },
      {
        value: "cycles",
        label: "Cycles",
        subStrands: ["Life Cycles", "Water Cycle", "Rock Cycle"]
      },
      {
        value: "systems",
        label: "Systems",
        subStrands: ["Human Body Systems", "Earth Systems", "Ecosystems"]
      },
      {
        value: "energy",
        label: "Energy",
        subStrands: ["Forms of Energy", "Energy Transformations", "Heat", "Light", "Sound"]
      },
      {
        value: "forces-motion",
        label: "Forces and Motion",
        subStrands: ["Types of Forces", "Motion", "Simple Machines"]
      },
      {
        value: "earth-space",
        label: "Earth and Space",
        subStrands: ["Earth's Features", "Weather", "Solar System"]
      }
    ]
  },
  {
    value: "social-studies",
    label: "Social Studies",
    levels: ["basic7", "basic8", "basic9"],
    strands: [
      {
        value: "all-about-us",
        label: "All About Us",
        subStrands: ["Family", "Community", "Culture", "Identity"]
      },
      {
        value: "my-nation-ghana",
        label: "My Nation Ghana",
        subStrands: ["Geography", "History", "Government", "Citizenship"]
      },
      {
        value: "living-together",
        label: "Living Together",
        subStrands: ["Rights and Responsibilities", "Social Issues", "Peace Building"]
      }
    ]
  },
  {
    value: "computing",
    label: "Computing",
    levels: ["basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "computing-systems",
        label: "Computing Systems",
        subStrands: ["Hardware", "Software", "Networks", "Internet Safety"]
      },
      {
        value: "digital-literacy",
        label: "Digital Literacy",
        subStrands: ["Word Processing", "Spreadsheets", "Presentations", "Digital Research"]
      },
      {
        value: "computational-thinking",
        label: "Computational Thinking",
        subStrands: ["Algorithms", "Programming Concepts", "Problem Solving", "Debugging"]
      },
      {
        value: "technology-society",
        label: "Technology and Society",
        subStrands: ["Digital Citizenship", "Online Safety", "Ethical Use"]
      }
    ]
  },
  {
    value: "rme",
    label: "Religious and Moral Education (RME)",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"], 
    strands: [
      {
        value: "religious-practices",
        label: "Religious Practices",
        subStrands: ["Christianity", "Islam", "Traditional Religion"]
      },
      {
        value: "moral-values",
        label: "Moral Values",
        subStrands: ["Honesty", "Respect", "Responsibility", "Integrity"]
      },
      {
        value: "cultural-heritage",
        label: "Cultural Heritage",
        subStrands: ["Traditions", "Festivals", "Rites of Passage"]
      }
    ]
  },
  {
    value: "creative-arts-design",
    label: "Creative Arts & Design",
    levels: ["basic7", "basic8", "basic9"],
    strands: [
      {
        value: "visual-arts",
        label: "Visual Arts",
        subStrands: ["Drawing", "Painting", "Sculpture", "Craft"]
      },
      {
        value: "performing-arts",
        label: "Performing Arts",
        subStrands: ["Music", "Dance", "Drama"]
      },
      {
        value: "design",
        label: "Design",
        subStrands: ["Graphic Design", "Fashion Design", "Interior Design"]
      }
    ]
  },
  {
    value: "ghanaian-language",
    label: "Ghanaian Language",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "listening-speaking",
        label: "Listening and Speaking",
        subStrands: ["Oral Communication", "Pronunciation", "Conversation"]
      },
      {
        value: "reading-comprehension",
        label: "Reading and Comprehension",
        subStrands: ["Reading Skills", "Vocabulary", "Comprehension"]
      },
      {
        value: "writing",
        label: "Writing",
        subStrands: ["Grammar", "Composition", "Spelling"]
      }
    ]
  },
  {
    value: "french",
    label: "French",
    levels: ["basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "oral-communication",
        label: "Oral Communication",
        subStrands: ["Listening", "Speaking", "Pronunciation"]
      },
      {
        value: "reading-writing",
        label: "Reading and Writing",
        subStrands: ["Reading Comprehension", "Grammar", "Composition"]
      },
      {
        value: "culture",
        label: "Culture",
        subStrands: ["French Culture", "Francophone Countries"]
      }
    ]
  },
  {
    value: "career-technology",
    label: "Career Technology",
    levels: ["basic7", "basic8", "basic9"],
    strands: [
      {
        value: "materials",
        label: "Materials",
        subStrands: ["Wood", "Metal", "Textiles", "Plastics"]
      },
      {
        value: "tools-equipment",
        label: "Tools and Equipment",
        subStrands: ["Hand Tools", "Power Tools", "Safety"]
      },
      {
        value: "production",
        label: "Production",
        subStrands: ["Design Process", "Manufacturing", "Quality Control"]
      }
    ]
  },
  {
    value: "physical-education",
    label: "Physical Education",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6", "basic7", "basic8", "basic9"],
    strands: [
      {
        value: "games-sports",
        label: "Games and Sports",
        subStrands: ["Individual Sports", "Team Sports", "Traditional Games"]
      },
      {
        value: "health-fitness",
        label: "Health and Fitness",
        subStrands: ["Physical Fitness", "Nutrition", "Health Education"]
      },
      {
        value: "movement-dance",
        label: "Movement and Dance",
        subStrands: ["Gymnastics", "Dance", "Creative Movement"]
      }
    ]
  },
  {
    value: "our-world-our-people",
    label: "Our World Our People",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6"], 
    strands: [
      {
        value: "all-about-us",
        label: "All About Us",
        subStrands: ["Family", "School", "Community"]
      },
      {
        value: "all-around-us",
        label: "All Around Us",
        subStrands: ["Environment", "Weather", "Plants", "Animals"]
      },
      {
        value: "our-beliefs",
        label: "Our Beliefs and Values",
        subStrands: ["Religious Leaders", "Festivals", "Moral Values"]
      },
      {
        value: "our-nation",
        label: "Our Nation Ghana",
        subStrands: ["History", "Leaders", "Symbols"]
      },
      {
        value: "my-global-community",
        label: "My Global Community",
        subStrands: ["Neighbors", "Trade", "Communication"]
      }
    ]
  },
  {
    value: "history",
    label: "History",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6"],
    strands: [
      {
        value: "history-as-subject",
        label: "History as a Subject",
        subStrands: ["Importance of History", "Sources of History"]
      },
      {
        value: "my-country-ghana",
        label: "My Country Ghana",
        subStrands: ["Major Historical Locations", "Outstanding Men and Women"]
      },
      {
        value: "europeans-in-ghana",
        label: "Europeans in Ghana",
        subStrands: ["Arrival of Europeans", "Missionary Activities", "Impact of Presence"]
      },
      {
        value: "colonization",
        label: "Colonization",
        subStrands: ["Colonial Rule", "Formation of Political Parties", "Independence"]
      }
    ]
  },
  {
    value: "creative-arts", // Primary Level Creative Arts
    label: "Creative Arts",
    levels: ["basic1", "basic2", "basic3", "basic4", "basic5", "basic6"],
    strands: [
        {
            value: "visual-arts",
            label: "Visual Arts",
            subStrands: ["Media and Techniques", "Creative Expression", "Aesthetics"]
        },
        {
            value: "performing-arts",
            label: "Performing Arts",
            subStrands: ["Music", "Dance", "Drama"]
        }
    ]
  }
];

export const CLASS_LEVELS = [
  { value: "basic1", label: "Basic 1" },
  { value: "basic2", label: "Basic 2" },
  { value: "basic3", label: "Basic 3" },
  { value: "basic4", label: "Basic 4" },
  { value: "basic5", label: "Basic 5" },
  { value: "basic6", label: "Basic 6" },
  { value: "basic7", label: "Basic 7" },
  { value: "basic8", label: "Basic 8" },
  { value: "basic9", label: "Basic 9" },
];

export function getSubjectStrands(subjectValue: string): CurriculumStrand[] {
  const subject = SUBJECTS.find(s => s.value === subjectValue);
  return subject?.strands || [];
}

export function getStrandSubStrands(subjectValue: string, strandValue: string): string[] {
  const subject = SUBJECTS.find(s => s.value === subjectValue);
  const strand = subject?.strands.find(st => st.value === strandValue);
  return strand?.subStrands || [];
}
