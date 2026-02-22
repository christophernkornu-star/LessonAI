export const GHANA_CONTEXT = {
  curriculum_standards: {
    primary: "NaCCA Standards-Based Curriculum for Primary Schools",
    jhs: "Junior High School Curriculum Framework",
    shs: "WASSCE (West African Senior School Certificate Examination) Syllabus"
  },
  local_materials: [
    "Locally available counting beads (abacus)",
    "Recycled materials (bottle caps, cardboard)",
    "Local natural resources (stones, sticks, seeds)",
    "Picture charts from local scenes",
    "Ghanaian textbooks approved by MoE",
    "Local newspaper cuttings",
    "Community resource persons"
  ],
  ghanaian_examples: {
    mathematics: [
      "Market transactions in Ghana cedis",
      "Measuring land in local units",
      "Local business profit calculations",
      "Using cedi notes and pesewa coins",
      "Data from local football leagues"
    ],
    science: [
      "Ghanaian ecosystems (Kakum Forest, Mole National Park)",
      "Local plants and herbs (neem, moringa)",
      "Traditional farming methods",
      "Local weather patterns (Harmattan, Rainy Season)",
      "Hydroelectric power (Akosombo Dam)"
    ],
    english: [
      "Ghanaian literature and folklore (Ananse stories)",
      "Local proverbs and idioms",
      "Ghanaian authors (Ama Ata Aidoo, Efua Sutherland)",
      "Describing local festivals (Homowo, Hogbetsotso)",
      "Debates on local social issues",
      "Grammar examples using Ghanaian names and places (e.g., 'Kofi is eating fufu', 'We travelled to Kumasi')",
      "Sentence structure exercises based on daily Ghanaian life"
    ],
    history: [
      "Ashanti Kingdom and Golden Stool",
      "Independence struggle and The Big Six",
      "National heroes (Kwame Nkrumah, Yaa Asantewaa)",
      "Trans-Atlantic Slave Trade (Cape Coast Castle)",
      "Republic Days"
    ],
    geography: [
      "Volta River and Lake Volta",
      "Akosombo Dam",
      "Ghana's regions and capitals",
      "Cash crops (Cocoa, Shea nut)",
      "Mining resources (Gold, Bauxite)"
    ],
    rme: [
      "Traditional religious practices",
      "Christian missions in Ghana",
      "Islamic history in Ghana",
      "Moral values in Ghanaian culture",
      "Rites of passage (Naming ceremonies, Puberty rites)"
    ],
    ict: [
      "Mobile money transactions",
      "Digital addressing system",
      "Local tech startups",
      "Internet cafes in communities",
      "Using phones for agriculture"
    ],
    "creative-arts": [
      "Kente weaving patterns",
      "Adinkra symbols",
      "Traditional drumming and dance (Adowa, Kpanlogo)",
      "Pottery and bead making",
      "Highlife and Hiplife music"
    ]
  }
};

export const DIFFERENTIATION_STRATEGIES = {
  slow: [
    "Use more concrete examples from local environment",
    "Provide step-by-step guidance",
    "Use peer support from faster learners",
    "Give extra time and simplified tasks"
  ],
  average: [
    "Standard activities with local examples",
    "Group work with mixed abilities",
    "Scaffolded support as needed"
  ],
  fast: [
    "Extension activities with deeper Ghanaian context",
    "Research tasks on local applications",
    "Challenge to teach peers"
  ],
  mixed: [
    "Tiered activities based on Ghanaian context",
    "Flexible grouping for collaborative learning",
    "Choice boards with different Ghanaian topics",
    "Multiple entry points to the lesson"
  ]
};

export function getCurriculumStandard(level: string): string {
  const lowerLevel = level.toLowerCase();
  if (lowerLevel.includes("basic 7") || lowerLevel.includes("basic 8") || lowerLevel.includes("basic 9") || lowerLevel.includes("jhs")) {
    return GHANA_CONTEXT.curriculum_standards.jhs;
  }
  if (lowerLevel.includes("shs") || lowerLevel.includes("form")) {
    return GHANA_CONTEXT.curriculum_standards.shs;
  }
  return GHANA_CONTEXT.curriculum_standards.primary;
}

export function getSubjectExamples(subject: string): string[] {
  const lowerSubject = subject.toLowerCase();
  for (const [key, examples] of Object.entries(GHANA_CONTEXT.ghanaian_examples)) {
    if (lowerSubject.includes(key)) {
      return examples;
    }
  }
  return ["Use appropriate Ghanaian context and examples"];
}

export function getDifferentiationStrategy(ability: string = "mixed"): string {
  const key = ability.toLowerCase() as keyof typeof DIFFERENTIATION_STRATEGIES;
  const strategies = DIFFERENTIATION_STRATEGIES[key] || DIFFERENTIATION_STRATEGIES.mixed;
  return strategies.map(s => `- ${s}`).join("\n");
}
