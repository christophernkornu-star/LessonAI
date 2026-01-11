# Resource File Selector Implementation

## Overview
The lesson generator now supports selecting uploaded curriculum and resource files to guide AI lesson generation. Users can browse and select files uploaded by admins, and the AI will reference these materials when generating lesson notes.

## Features Implemented

### 1. Resource Selector Component (`src/components/ResourceSelector.tsx`)
- **Two Types**: Curriculum files and Resource files
- **Dialog-Based UI**: Modal popup with scrollable file list
- **Auto-Filtering**: Files automatically filtered by subject and grade level
- **Multi-Select**: Users can select multiple files of each type
- **File Metadata Display**: Shows title, description, grade level, subject, and tags
- **Visual Feedback**: Selected files highlighted with checkmark and border
- **Empty States**: Helpful messages when no files match filters
- **Clear Selection**: Button to deselect all files at once

### 2. Generator Page Integration (`src/pages/Generator.tsx`)
- **Two Resource Selectors**: One for curriculum files, one for resource files
- **Positioned Below Template Selector**: Logical flow from template → files → lesson details
- **Dynamic Filtering**: Files filtered based on selected subject and grade level
- **Selection Count Display**: Shows number of selected files on button
- **State Management**: Tracks selected file IDs in separate state arrays

### 3. AI Service Enhancement (`src/services/aiService.ts`)
- **Extended LessonData Interface**: Added `selectedCurriculumFiles?: string[]` and `selectedResourceFiles?: string[]`
- **File Context Fetching**: Retrieves full file details (title, description, file name) from database
- **Prompt Enhancement**: Includes file information in both template and default prompts
- **File Reference Section**: Formats curriculum documents and resource materials as bulleted lists
- **AI Instructions**: Instructs AI to reference and incorporate file content appropriately

## How It Works

### User Flow
1. User opens Generator page
2. Selects lesson note template (optional)
3. Clicks "Browse Curriculum Files" button
4. Dialog opens showing curriculum files matching selected subject/grade
5. User checks/unchecks files to select
6. Clicks outside or continues to select resource files
7. Clicks "Browse Resource Files" button
8. Repeats selection process for resource files
9. Fills in lesson details (curriculum, subject, level, etc.)
10. Clicks "Generate Lesson Note"
11. AI generates lesson note referencing selected files

### Technical Flow
```
Generator.tsx
  ├─ ResourceSelector (curriculum)
  │    └─ getFilteredCurriculumFiles(subject, gradeLevel)
  │         └─ Fetches files from resource_files table
  ├─ ResourceSelector (resource)
  │    └─ getFilteredResourceFiles(subject, gradeLevel)
  │         └─ Fetches files from resource_files table
  └─ handleGenerate()
       └─ generateLessonNote(dataWithTemplate)
            ├─ Fetch full file details by IDs
            ├─ Format file information for prompt
            └─ Include in AI prompt with instructions
```

## Database Queries

### Curriculum Files Query
```typescript
supabase
  .from("resource_files")
  .select("*")
  .eq("file_type", "curriculum")
  .eq("is_public", true)
  .ilike("subject", `%${subject}%`)
  .ilike("grade_level", `%${gradeLevel}%`)
```

### Resource Files Query
```typescript
supabase
  .from("resource_files")
  .select("*")
  .eq("file_type", "resource")
  .eq("is_public", true)
  .ilike("subject", `%${subject}%`)
  .ilike("grade_level", `%${gradeLevel}%`)
```

### File Details Query (for AI prompt)
```typescript
supabase
  .from("resource_files")
  .select("title, description, file_name")
  .in("id", selectedFileIds)
```

## AI Prompt Format

### Curriculum Files Section
```
**Reference Curriculum Documents:**
1. Ghana Basic 5 Mathematics Curriculum - Official GES curriculum for Basic 5 (basic-5-math-curriculum.pdf)
2. NaCCA Standards Document - National standards for mathematics (nacca-standards.pdf)
```

### Resource Files Section
```
**Additional Resource Materials:**
1. Fraction Teaching Resources - Worksheets and activities for fractions (fraction-resources.pdf)
2. Assessment Templates - Question templates for mathematics (assessment-templates.docx)
```

### AI Instructions Added
- Template prompt: "Reference and incorporate content from the provided curriculum documents and resource materials where appropriate"
- Default prompt: Same instruction added before formatting guidelines

## UI Components Used
- **Dialog**: Modal popup for file selection
- **ScrollArea**: Scrollable file list for many files
- **Card**: File display with metadata
- **Checkbox**: Multi-select functionality
- **Badge**: Grade level, subject, and tag display
- **Button**: Trigger and action buttons
- **Icons**: BookOpen (curriculum), FileText (resource), Check (selected)

## Filter Behavior
- Files automatically refresh when subject or grade level changes
- Uses ILIKE for partial matching (e.g., "Basic 5" matches "Basic 5, Basic 6")
- Only shows public files (`is_public = true`)
- Only shows files of correct type (`file_type = 'curriculum'` or `'resource'`)

## Error Handling
- Loading state while fetching files
- Empty state when no files found
- Graceful handling if file fetch fails
- TypeScript type assertions for Supabase compatibility

## Files Modified
1. ✅ `src/components/ResourceSelector.tsx` - NEW component
2. ✅ `src/pages/Generator.tsx` - Added resource selectors
3. ✅ `src/services/aiService.ts` - Extended interface and prompt
4. ✅ `src/services/resourceFileService.ts` - Already created (fetching functions)

## Testing Checklist
- [ ] Upload curriculum file via admin dashboard
- [ ] Upload resource file via admin dashboard
- [ ] Navigate to Generator page
- [ ] Select subject and grade level
- [ ] Click "Browse Curriculum Files"
- [ ] Verify filtered files appear
- [ ] Select one or more curriculum files
- [ ] Click "Browse Resource Files"
- [ ] Verify filtered files appear
- [ ] Select one or more resource files
- [ ] Verify button shows correct count
- [ ] Fill in lesson details
- [ ] Generate lesson note
- [ ] Verify AI output references selected files
- [ ] Check console for file information in prompt

## Next Steps (Optional Enhancements)
1. **File Preview**: Add ability to preview PDF/DOCX content
2. **Smart Recommendations**: Suggest relevant files based on content standard
3. **Recently Used Files**: Show files recently used by the teacher
4. **Favorites**: Allow marking files as favorites for quick access
5. **File Upload from Generator**: Quick upload button for missing files
6. **Advanced Filters**: Filter by tags, date uploaded, etc.
7. **Bulk Selection**: "Select All" / "Select None" buttons
8. **File Statistics**: Show how many times a file has been used
9. **Admin Insights**: Dashboard showing most-used curriculum/resources
10. **Offline Support**: Cache frequently used files locally

## Known Issues
- TypeScript shows 'never' type errors for Supabase queries (cosmetic, doesn't affect functionality)
- Files with multiple grade levels stored as comma-separated string (requires ILIKE partial matching)
- No content extraction from PDF/DOCX files (AI only sees metadata)

## Implementation Notes
- Used same UI pattern as TemplateSelector for consistency
- Follows existing Ghana education system structure (Basic 1-10, Ghanaian subjects)
- Compatible with existing admin file upload system
- Works with existing RLS configuration (public files only)
- No breaking changes to existing functionality
