export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  curriculum: string;
  structure: string;
  sections: string[];
}

// Ghana Education Service lesson template
export const lessonTemplates: LessonTemplate[] = [
  {
    id: "ghana-standard",
    name: "Ghana Standard Lesson Plan",
    description: "Official Ghana Education Service lesson plan format with three phases",
    curriculum: "Ghana",
    structure: `
{
  "term": "{TERM}",
  "weekEnding": "{WEEK_ENDING}",
  "day": "{DAY}",
  "subject": "{SUBJECT}",
  "duration": "{DURATION}",
  "strand": "{STRAND}",
  "class": "{LEVEL}",
  "classSize": "{CLASS_SIZE}",
  "subStrand": "{SUB_STRAND}",
  "contentStandard": "{CONTENT_STANDARD}",
  "indicator": "{INDICATOR}",
  "lesson": "1 of 1",
  "performanceIndicator": "{PERFORMANCE_INDICATOR}",
  "coreCompetencies": "{CORE_COMPETENCIES}",
  "keywords": "{KEYWORDS}",
  "reference": "{REFERENCE}",

  "phases": {
    "phase1_starter": {
      "duration": "{STARTER_DURATION}",
      "learnerActivities": "{STARTER_ACTIVITIES}",
      "resources": "{STARTER_RESOURCES}"
    },
    "phase2_newLearning": {
      "duration": "{NEW_LEARNING_DURATION}",
      "learnerActivities": "{NEW_LEARNING_ACTIVITIES}",
      "resources": "{NEW_LEARNING_RESOURCES}"
    },
    "phase3_reflection": {
      "duration": "{REFLECTION_DURATION}",
      "learnerActivities": "{REFLECTION_ACTIVITIES}",
      "resources": "{REFLECTION_RESOURCES}"
    }
  }
}
`,
    sections: [
      "Lesson Information",
      "Content Standard",
      "Indicators",
      "Performance Indicator",
      "Core Competencies",
      "Keywords",
      "Reference",
      "Phase 1: Starter",
      "Phase 2: New Learning",
      "Phase 3: Reflection"
    ]
  }
];
