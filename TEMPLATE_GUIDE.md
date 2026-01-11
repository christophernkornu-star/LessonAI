# How to Add Custom Lesson Note Templates

## Overview
Your LessonAI app now supports custom lesson note templates! Users can choose from 6 pre-built professional templates, and you can easily add more.

## Pre-Built Templates

1. **Standard Lesson Plan** - Traditional comprehensive format
2. **5E Instructional Model** - Engage, Explore, Explain, Elaborate, Evaluate
3. **Madeline Hunter Model** - Direct instruction design
4. **Gradual Release Model** - I Do, We Do, You Do scaffolding
5. **Inquiry-Based Learning** - Student-centered discovery
6. **Understanding by Design (UbD)** - Backward design approach

## How to Add Your Own Template

### Method 1: Edit the Templates File (Recommended)

1. Open `src/data/lessonTemplates.ts`

2. Add a new template object to the `lessonTemplates` array:

```typescript
{
  id: "your-template-id", // Unique identifier (lowercase, no spaces)
  name: "Your Template Name", // Display name
  description: "Brief description of your template", // One-line description
  curriculum: "all", // "all" or specific curriculum like "cambridge"
  structure: `
# {LESSON_TITLE}

## Your Section Name
{YOUR_PLACEHOLDER}

## Another Section
{ANOTHER_PLACEHOLDER}

... add as many sections as you need
`,
  sections: [
    "Your Section Name",
    "Another Section",
    // List all section names
  ]
}
```

### Template Structure Guidelines

**Placeholders** are variables the AI will fill in. Use curly braces:
- `{LESSON_TITLE}` - Lesson title
- `{SUBJECT}` - Subject name
- `{LEVEL}` - Grade level
- `{CURRICULUM}` - Curriculum type
- `{STRAND}` - Subject strand
- `{SUB_STRAND}` - Sub-strand
- `{CONTENT_STANDARD}` - Content standard
- `{OBJECTIVES}` - Learning objectives
- `{MATERIALS}` - Materials needed
- `{INTRODUCTION}` - Introduction section
- `{MAIN_ACTIVITIES}` - Main teaching activities
- `{ASSESSMENT}` - Assessment methods
- `{DIFFERENTIATION}` - Differentiation strategies
- `{CLOSURE}` - Lesson closure
- `{HOMEWORK}` - Homework/extension

**Create custom placeholders** for your specific needs:
- `{MY_CUSTOM_SECTION}`
- `{SPECIFIC_ACTIVITY}`
- `{TEACHER_NOTES}`

### Example Custom Template

```typescript
{
  id: "project-based",
  name: "Project-Based Learning",
  description: "Extended project with multiple phases",
  curriculum: "all",
  structure: `
# {LESSON_TITLE}

## Project Overview
- **Subject:** {SUBJECT}
- **Grade:** {LEVEL}
- **Duration:** {DURATION}
- **Driving Question:** {DRIVING_QUESTION}

## Project Goals
{PROJECT_GOALS}

## Phase 1: Project Launch
{LAUNCH}

## Phase 2: Building Knowledge
{BUILD_KNOWLEDGE}

## Phase 3: Creating Products
{CREATE_PRODUCTS}

## Phase 4: Presenting & Reflecting
{PRESENT_REFLECT}

## Assessment Rubric
{RUBRIC}

## Resources and Materials
{MATERIALS}
`,
  sections: [
    "Project Overview",
    "Project Goals",
    "Phase 1: Project Launch",
    "Phase 2: Building Knowledge",
    "Phase 3: Creating Products",
    "Phase 4: Presenting & Reflecting",
    "Assessment Rubric",
    "Resources and Materials"
  ]
}
```

### Method 2: Programmatic Addition (Advanced)

For dynamic template uploads, you can use the `TemplateService`:

```typescript
import { TemplateService } from "@/services/templateService";

const myTemplate: LessonTemplate = {
  id: "custom-upload-1",
  name: "My Custom Template",
  description: "Uploaded by user",
  curriculum: "all",
  structure: "...",
  sections: ["..."]
};

TemplateService.addCustomTemplate(myTemplate);
```

## Tips for Great Templates

### 1. Clear Structure
- Use markdown headings (`#`, `##`, `###`)
- Organize logically from start to end of lesson
- Include timing where relevant

### 2. Helpful Placeholders
- Name placeholders clearly: `{WARM_UP_ACTIVITY}` not `{WA}`
- Group related content: `{MATERIALS}`, `{RESOURCES}`
- Be specific when needed: `{ASSESSMENT_FORMATIVE}`, `{ASSESSMENT_SUMMATIVE}`

### 3. Comprehensive Sections
Include sections for:
- Learning objectives
- Materials/resources
- Step-by-step activities
- Assessment strategies
- Differentiation
- Time allocations
- Teacher notes/reflection

### 4. Flexibility
- Design for various subjects and grade levels
- Include sections that can be expanded or condensed
- Allow for different teaching styles

## Testing Your Template

1. Save your changes to `lessonTemplates.ts`
2. Restart the dev server
3. Go to the Generator page
4. Click "Browse Templates"
5. Find and select your new template
6. Fill in lesson details
7. Generate and review the output

## Template Categories

Consider organizing templates by:
- **Teaching Method**: Direct instruction, inquiry, flipped classroom
- **Lesson Duration**: Single period, block schedule, multi-day
- **Student Level**: Elementary, middle school, high school
- **Curriculum**: National, Cambridge, IB, Common Core
- **Subject**: Math-specific, Science lab, Language arts, etc.

## File Upload Feature (Future Enhancement)

To allow users to upload their own templates:

1. Add file input in `Generator.tsx`
2. Parse uploaded file (DOC, PDF, TXT)
3. Extract structure and convert to template format
4. Use `TemplateService.addCustomTemplate()`
5. Store in localStorage or backend database

## Need Help?

Check `src/data/lessonTemplates.ts` for complete working examples of all 6 built-in templates!
