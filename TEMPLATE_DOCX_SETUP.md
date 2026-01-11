# DOCX Template Setup Guide

This guide explains how to create and use DOCX templates with the template-based service worker.

## Overview

The `templateDocxService.ts` uses **docxtemplater** to fill pre-designed Word templates with lesson data. This approach:
- ✅ Preserves exact template formatting and styling
- ✅ Maintains tables, headers, footers, and images
- ✅ Allows admins to customize templates without code changes
- ✅ Works with uploaded template files from Supabase storage

## How to Create a Template

### 1. Create the Word Document

Open Microsoft Word and create your lesson plan template with the desired layout, tables, and styling.

### 2. Add Placeholders

Use `{placeholderName}` syntax for fields that should be filled with data:

**Available Placeholders:**

#### Basic Information
- `{weekEnding}` - Week ending date
- `{day}` - Day of the week
- `{subject}` - Subject name
- `{duration}` - Lesson duration
- `{strand}` - Curriculum strand
- `{class}` - Class level
- `{classSize}` - Number of students
- `{subStrand}` - Sub-strand details
- `{contentStandard}` - Content standard
- `{indicator}` - Learning indicator
- `{lesson}` - Lesson number (e.g., "1 of 3")
- `{performanceIndicator}` - Performance indicator
- `{coreCompetencies}` - Core competencies
- `{keywords}` - Keywords
- `{reference}` - Reference materials

#### Phase 1: Starter
- `{phase1_duration}` - Duration
- `{phase1_activities}` - Learner activities
- `{phase1_resources}` - Resources needed

#### Phase 2: New Learning
- `{phase2_duration}` - Duration
- `{phase2_activities}` - Learner activities
- `{phase2_resources}` - Resources needed

#### Phase 3: Reflection
- `{phase3_duration}` - Duration
- `{phase3_activities}` - Learner activities
- `{phase3_resources}` - Resources needed

### 3. Example Template Structure

```
GHANA LESSON PLAN
==================

Week Ending: {weekEnding}          DAY: {day}          Subject: {subject}

Duration: {duration}                       Strand: {strand}

Class: {class}          Class Size: {classSize}          Sub Strand: {subStrand}

Content Standard: {contentStandard}

Indicator: {indicator}                     Lesson: {lesson}

Performance Indicator: {performanceIndicator}

Core Competencies: {coreCompetencies}

Key words: {keywords}

Reference: {reference}

LESSON ACTIVITIES
=================

| Phase/Duration          | Learner Activities      | Resources              |
|-------------------------|-------------------------|------------------------|
| PHASE 1: STARTER        | {phase1_activities}     | {phase1_resources}     |
| ({phase1_duration})     |                         |                        |
|-------------------------|-------------------------|------------------------|
| PHASE 2: NEW LEARNING   | {phase2_activities}     | {phase2_resources}     |
| ({phase2_duration})     |                         |                        |
|-------------------------|-------------------------|------------------------|
| PHASE 3: REFLECTION     | {phase3_activities}     | {phase3_resources}     |
| ({phase3_duration})     |                         |                        |
```

### 4. Save the Template

1. Save the document as `GHANA_LESSON_TEMPLATE.docx`
2. Upload it to Supabase storage bucket (e.g., `template-files`)
3. Get the public URL for the template

## Usage in Code

### Update Download.tsx

```typescript
import { generateLessonFromJson, parseAIJsonResponse } from "@/services/templateDocxService";

// In handleDownload function:
if (isJsonFormat) {
  try {
    const parsedData = parseAIJsonResponse(content);
    const templateUrl = "/templates/GHANA_LESSON_TEMPLATE.docx"; // Or from Supabase
    await generateLessonFromJson(parsedData, templateUrl);
    toast.success("Lesson plan downloaded successfully!");
  } catch (error) {
    console.error("Template generation error:", error);
    toast.error("Failed to generate lesson from template.");
  }
}
```

### Load Template from Supabase

```typescript
import { supabase } from "@/integrations/supabase/client";

// Get template URL from storage
const { data } = await supabase
  .storage
  .from('template-files')
  .getPublicUrl('GHANA_LESSON_TEMPLATE.docx');

const templateUrl = data.publicUrl;
await generateLessonFromJson(lessonData, templateUrl);
```

### Store Template in Public Folder

1. Create `public/templates/` folder
2. Place `GHANA_LESSON_TEMPLATE.docx` inside
3. Reference as `/templates/GHANA_LESSON_TEMPLATE.docx`

## Template Placeholders Best Practices

### DO:
✅ Use simple placeholder names: `{fieldName}`
✅ Keep placeholders consistent with data structure
✅ Test template with sample data before deploying
✅ Use tables for structured data (like phases)
✅ Add formatting (bold, colors, etc.) to template itself

### DON'T:
❌ Use special characters in placeholder names
❌ Nest placeholders: `{{fieldName}}`
❌ Leave unclosed tags: `{fieldName`
❌ Use spaces in placeholder names: `{field name}`

## Advanced Features

### Conditional Content

Show content only if data exists:

```
{#hasObjectives}
Objectives: {objectives}
{/hasObjectives}
```

### Loops

Repeat sections for arrays:

```
{#activities}
- {description}
{/activities}
```

### Line Breaks

Use `linebreaks: true` option (already enabled) to preserve line breaks in multi-line content.

## Troubleshooting

### Error: "Unclosed tag"
- Check all placeholders have closing `}`
- Ensure no typos in placeholder names

### Error: "Unopened tag"
- Check all placeholders have opening `{`
- Verify no extra `}` characters

### Template not loading
- Verify template URL is correct and accessible
- Check CORS settings if loading from external URL
- Ensure template file is valid DOCX format

### Data not filling
- Verify placeholder names match data keys exactly
- Check data structure matches LessonNoteData interface
- Use browser console to debug data being passed

## Migration from Current System

To switch from `ghanaLessonDocxService.ts` to template-based:

1. Create DOCX template with placeholders
2. Upload template to public folder or Supabase
3. Update Download.tsx to use `templateDocxService`
4. Test with sample lesson data
5. Deploy template to production

## Benefits

- **Flexibility**: Admins can modify templates without touching code
- **Consistency**: Guaranteed format matches approved educational standards
- **Professional**: Maintains all Word formatting, styles, and branding
- **Easy Updates**: Change template design without redeploying app
