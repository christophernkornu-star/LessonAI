-- Insert system templates (6 pre-built templates)
-- These are marked as system templates and visible to all users

insert into public.templates (id, user_id, name, description, curriculum, structure, sections, is_public, is_system)
values 
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  null,
  'Standard Lesson Plan',
  'Traditional comprehensive lesson plan format',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Information\n- **Subject:** {SUBJECT}\n- **Grade/Level:** {LEVEL}\n- **Duration:** {DURATION}\n- **Date:** {DATE}\n\n## Curriculum Details\n- **Curriculum:** {CURRICULUM}\n- **Strand:** {STRAND}\n- **Sub-Strand:** {SUB_STRAND}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials and Resources\n{MATERIALS}\n\n## Introduction/Warm-up (5-10 minutes)\n{INTRODUCTION}\n\n## Main Teaching Activities (30-40 minutes)\n{MAIN_ACTIVITIES}\n\n## Assessment\n{ASSESSMENT}\n\n## Differentiation Strategies\n{DIFFERENTIATION}\n\n## Conclusion/Summary (5 minutes)\n{CONCLUSION}\n\n## Homework/Extension\n{HOMEWORK}\n\n## Teacher''s Reflection\n{REFLECTION}',
  '["Lesson Information", "Curriculum Details", "Learning Objectives", "Materials and Resources", "Introduction/Warm-up", "Main Teaching Activities", "Assessment", "Differentiation Strategies", "Conclusion/Summary", "Homework/Extension", "Teacher''s Reflection"]'::jsonb,
  true,
  true
),
(
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  null,
  '5E Instructional Model',
  'Engage, Explore, Explain, Elaborate, Evaluate',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Overview\n- **Subject:** {SUBJECT}\n- **Grade/Level:** {LEVEL}\n- **Strand:** {STRAND}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials Needed\n{MATERIALS}\n\n## 1. ENGAGE (10 minutes)\n**Purpose:** Capture students'' attention and assess prior knowledge\n\n{ENGAGE}\n\n## 2. EXPLORE (15 minutes)\n**Purpose:** Allow students to investigate and discover\n\n{EXPLORE}\n\n## 3. EXPLAIN (15 minutes)\n**Purpose:** Introduce formal terminology and concepts\n\n{EXPLAIN}\n\n## 4. ELABORATE (20 minutes)\n**Purpose:** Apply concepts in new contexts\n\n{ELABORATE}\n\n## 5. EVALUATE (10 minutes)\n**Purpose:** Assess student understanding\n\n{EVALUATE}\n\n## Differentiation\n{DIFFERENTIATION}\n\n## Extension Activities\n{EXTENSION}',
  '["Lesson Overview", "Learning Objectives", "Materials Needed", "Engage", "Explore", "Explain", "Elaborate", "Evaluate", "Differentiation", "Extension Activities"]'::jsonb,
  true,
  true
),
(
  'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
  null,
  'Madeline Hunter Model',
  'Direct instruction lesson design',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Details\n- **Subject:** {SUBJECT}\n- **Grade:** {LEVEL}\n- **Duration:** {DURATION}\n- **Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Anticipatory Set (Hook)\n{ANTICIPATORY_SET}\n\n## Teaching (Input, Modeling, and Check for Understanding)\n### Input\n{INPUT}\n\n### Modeling\n{MODELING}\n\n### Checking for Understanding\n{CHECK_UNDERSTANDING}\n\n## Guided Practice\n{GUIDED_PRACTICE}\n\n## Independent Practice\n{INDEPENDENT_PRACTICE}\n\n## Closure\n{CLOSURE}\n\n## Assessment\n{ASSESSMENT}',
  '["Lesson Details", "Learning Objectives", "Anticipatory Set", "Teaching Input", "Modeling", "Checking for Understanding", "Guided Practice", "Independent Practice", "Closure", "Assessment"]'::jsonb,
  true,
  true
),
(
  'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
  null,
  'Gradual Release Model (I Do, We Do, You Do)',
  'Scaffolded instruction approach',
  'all',
  E'# {LESSON_TITLE}\n\n## Overview\n- **Subject:** {SUBJECT}\n- **Grade Level:** {LEVEL}\n- **Strand/Topic:** {STRAND}\n- **Learning Standard:** {CONTENT_STANDARD}\n\n## Learning Targets\n{OBJECTIVES}\n\n## Required Materials\n{MATERIALS}\n\n## I DO - Teacher Modeling (15 minutes)\n**Teacher demonstrates and thinks aloud**\n\n{I_DO}\n\n## WE DO - Guided Practice (20 minutes)\n**Teacher and students work together**\n\n{WE_DO}\n\n## YOU DO TOGETHER - Collaborative Practice (15 minutes)\n**Students work in pairs/groups with teacher monitoring**\n\n{YOU_DO_TOGETHER}\n\n## YOU DO ALONE - Independent Practice (20 minutes)\n**Individual student work**\n\n{YOU_DO_ALONE}\n\n## Assessment and Feedback\n{ASSESSMENT}\n\n## Differentiation Support\n{DIFFERENTIATION}\n\n## Closure and Next Steps\n{CLOSURE}',
  '["Overview", "Learning Targets", "Required Materials", "I Do - Teacher Modeling", "We Do - Guided Practice", "You Do Together - Collaborative", "You Do Alone - Independent", "Assessment and Feedback", "Differentiation Support", "Closure and Next Steps"]'::jsonb,
  true,
  true
),
(
  'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
  null,
  'Inquiry-Based Learning',
  'Student-centered discovery learning',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Context\n- **Subject:** {SUBJECT}\n- **Grade:** {LEVEL}\n- **Big Question:** {BIG_QUESTION}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Essential Question\n{ESSENTIAL_QUESTION}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials and Resources\n{MATERIALS}\n\n## Phase 1: Ask - Questioning (10 minutes)\n{ASK}\n\n## Phase 2: Investigate - Research and Exploration (25 minutes)\n{INVESTIGATE}\n\n## Phase 3: Create - Construct Understanding (20 minutes)\n{CREATE}\n\n## Phase 4: Discuss - Share and Reflect (15 minutes)\n{DISCUSS}\n\n## Phase 5: Reflect - Metacognition (10 minutes)\n{REFLECT}\n\n## Assessment Strategies\n{ASSESSMENT}\n\n## Scaffolding and Support\n{SCAFFOLDING}',
  '["Lesson Context", "Essential Question", "Learning Objectives", "Materials and Resources", "Ask - Questioning", "Investigate - Research", "Create - Understanding", "Discuss - Share", "Reflect - Metacognition", "Assessment Strategies", "Scaffolding and Support"]'::jsonb,
  true,
  true
),
(
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  null,
  'Understanding by Design (UbD)',
  'Backward design focusing on desired results',
  'all',
  E'# {LESSON_TITLE}\n\n## Stage 1: Desired Results\n### Established Goals\n**Standard:** {CONTENT_STANDARD}\n**Strand:** {STRAND}\n\n### Transfer Goals\n{TRANSFER_GOALS}\n\n### Understanding\nStudents will understand that...\n{UNDERSTANDINGS}\n\n### Essential Questions\n{ESSENTIAL_QUESTIONS}\n\n### Students will know...\n{KNOWLEDGE}\n\n### Students will be able to...\n{SKILLS}\n\n## Stage 2: Evidence of Learning\n### Performance Tasks\n{PERFORMANCE_TASKS}\n\n### Other Evidence\n{OTHER_EVIDENCE}\n\n## Stage 3: Learning Plan\n### Materials\n{MATERIALS}\n\n### Learning Activities (Sequence)\n{LEARNING_ACTIVITIES}\n\n### Differentiation\n{DIFFERENTIATION}\n\n## Notes and Reflections\n{NOTES}',
  '["Established Goals", "Transfer Goals", "Understandings", "Essential Questions", "Knowledge", "Skills", "Performance Tasks", "Other Evidence", "Materials", "Learning Activities", "Differentiation", "Notes and Reflections"]'::jsonb,
  true,
  true
);
