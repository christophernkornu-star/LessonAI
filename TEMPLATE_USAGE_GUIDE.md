# How to Use Template-Based DOCX Generation

## Quick Setup

The template-based service worker is now ready! Here's how to use it:

## Option 1: Use Public Folder (Simplest)

1. **Create your template** in Microsoft Word with placeholders like `{weekEnding}`, `{subject}`, etc.
2. **Save as** `GHANA_LESSON_TEMPLATE.docx`
3. **Place in** `public/templates/` folder in your project
4. **Set template URL** when generating:

```typescript
// In Generator.tsx or wherever you handle lesson generation
sessionStorage.setItem("ghanaTemplateUrl", "/templates/GHANA_LESSON_TEMPLATE.docx");
```

## Option 2: Use Supabase Storage (Flexible)

1. **Upload template** to Supabase Storage:
   - Go to Supabase Dashboard → Storage
   - Select `template-files` bucket
   - Upload `GHANA_LESSON_TEMPLATE.docx`

2. **Get public URL** and store it:

```typescript
import { supabase } from "@/integrations/supabase/client";

const { data } = await supabase
  .storage
  .from('template-files')
  .getPublicUrl('GHANA_LESSON_TEMPLATE.docx');

sessionStorage.setItem("ghanaTemplateUrl", data.publicUrl);
```

## Template Placeholders Reference

### Example Word Template Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    GHANA LESSON PLAN                         │
│                                                              │
│ Week Ending: {weekEnding}     DAY: {day}     Subject: {subject}
│                                                              │
│ Duration: {duration}              Strand: {strand}          │
│                                                              │
│ Class: {class}   Class Size: {classSize}   Sub Strand: {subStrand}
│                                                              │
│ Content Standard: {contentStandard}                         │
│                                                              │
│ Indicator: {indicator}            Lesson: {lesson}          │
│                                                              │
│ Performance Indicator: {performanceIndicator}               │
│                                                              │
│ Core Competencies: {coreCompetencies}                       │
│                                                              │
│ Key words: {keywords}                                       │
│                                                              │
│ Reference: {reference}                                      │
│                                                              │
│ ┌──────────────────┬──────────────────┬─────────────────┐  │
│ │ Phase/Duration   │ Learner Activities│ Resources      │  │
│ ├──────────────────┼──────────────────┼─────────────────┤  │
│ │ PHASE 1: STARTER │ {phase1_activities}│{phase1_resources}│
│ │({phase1_duration})│                  │                 │  │
│ ├──────────────────┼──────────────────┼─────────────────┤  │
│ │PHASE 2: NEW      │{phase2_activities}│{phase2_resources}│
│ │LEARNING          │                  │                 │  │
│ │({phase2_duration})│                  │                 │  │
│ ├──────────────────┼──────────────────┼─────────────────┤  │
│ │PHASE 3:          │{phase3_activities}│{phase3_resources}│
│ │REFLECTION        │                  │                 │  │
│ │({phase3_duration})│                  │                 │  │
│ └──────────────────┴──────────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Complete Integration Example

### 1. Update Generator.tsx

Add this when the Ghana template is selected:

```typescript
// In Generator.tsx, after template selection
useEffect(() => {
  if (lessonData.template === "ghana-standard") {
    // Set the template URL - choose one of these options:
    
    // Option A: Public folder
    sessionStorage.setItem("ghanaTemplateUrl", "/templates/GHANA_LESSON_TEMPLATE.docx");
    
    // Option B: Supabase Storage
    const loadTemplate = async () => {
      const { data } = await supabase
        .storage
        .from('template-files')
        .getPublicUrl('GHANA_LESSON_TEMPLATE.docx');
      
      sessionStorage.setItem("ghanaTemplateUrl", data.publicUrl);
    };
    loadTemplate();
  }
}, [lessonData.template]);
```

### 2. Download.tsx (Already Updated)

The Download page now automatically:
- Checks for `ghanaTemplateUrl` in session storage
- Uses template-based generation if URL exists
- Falls back to programmatic generation if no template

## Testing the Template

1. **Create a simple test template**:
   - Open Word
   - Type: `Week Ending: {weekEnding}, Subject: {subject}`
   - Save as `TEST_TEMPLATE.docx`

2. **Test in your app**:
   ```typescript
   import { generateLessonFromJson } from "@/services/templateDocxService";
   
   const testData = {
     weekEnding: "January 15, 2025",
     subject: "Mathematics",
     day: "Monday",
     // ... other required fields
   };
   
   await generateLessonFromJson(testData, "/templates/TEST_TEMPLATE.docx");
   ```

3. **Open downloaded file** and verify placeholders were replaced

## Advantages Over Programmatic Generation

| Feature | Template-Based | Programmatic |
|---------|---------------|--------------|
| **Exact Format** | ✅ 100% matches Word template | ❌ Approximate recreation |
| **Custom Styling** | ✅ Colors, fonts, images preserved | ⚠️ Limited styling |
| **Easy Updates** | ✅ Edit Word file, no code changes | ❌ Requires code modifications |
| **Complex Layouts** | ✅ Headers, footers, page breaks | ⚠️ More difficult |
| **Branding** | ✅ Logos, letterheads maintained | ❌ Must add programmatically |
| **Admin Friendly** | ✅ Non-developers can modify | ❌ Requires developer |

## Troubleshooting

### Template not loading
```typescript
// Check if template URL is set
const templateUrl = sessionStorage.getItem("ghanaTemplateUrl");
console.log("Template URL:", templateUrl);
```

### Placeholders not replaced
- Verify placeholder names match data keys exactly
- Check for typos: `{weekEnding}` not `{WeekEnding}`
- Ensure no extra spaces: `{subject}` not `{ subject }`

### CORS errors
If loading from external URL:
```typescript
// Add CORS proxy or move template to same domain
const templateUrl = "/templates/GHANA_LESSON_TEMPLATE.docx"; // Same domain - works
```

## Production Deployment

1. **Upload template to Supabase Storage**
2. **Make bucket public** or use signed URLs
3. **Cache template URL** for performance
4. **Version templates** (e.g., `template_v1.docx`, `template_v2.docx`)
5. **Test thoroughly** with real lesson data

## Next Steps

1. Create your Ghana lesson plan template in Word
2. Add all required placeholders from the list above
3. Save and upload to `public/templates/` or Supabase
4. Update Generator.tsx to set template URL
5. Test download functionality
6. Adjust template formatting as needed

The system now supports both approaches:
- **Template-based** (recommended): For exact formatting control
- **Programmatic**: Fallback for when no template is available
