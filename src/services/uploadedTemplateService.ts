import { supabase } from '@/integrations/supabase/client';
import type { LessonTemplate } from '@/data/lessonTemplates';
import { lessonTemplates } from '@/data/lessonTemplates';

/**
 * Get all uploaded template files from database and convert to LessonTemplate format
 */
export const getUploadedTemplates = async (): Promise<LessonTemplate[]> => {
  const { data, error } = await supabase
    .from('resource_files')
    .select('*')
    .eq('file_type', 'template')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching uploaded templates:', error);
    return [];
  }

  // Convert uploaded files to LessonTemplate format
  return data.map(file => ({
    id: file.id,
    name: file.title,
    description: file.description || 'Custom uploaded template',
    curriculum: file.subject || 'all',
    structure: `# {LESSON_TITLE}

**Template:** ${file.title}
**Source:** ${file.file_name}

Please structure the lesson note based on the template document structure found at: ${file.file_path}

Use this format and adapt it to include:
- Subject: {SUBJECT}
- Grade Level: {LEVEL}
- Strand: {STRAND}
- Content Standard: {CONTENT_STANDARD}
- Learning Indicators: {EXEMPLARS}

Fill in all sections of the template with appropriate content for the given lesson details.`,
    sections: ['Introduction', 'Main Content', 'Activities', 'Assessment', 'Conclusion'],
  }));
};

/**
 * Get all templates (both built-in and uploaded)
 */
export const getAllTemplates = async (): Promise<LessonTemplate[]> => {
  const uploadedTemplates = await getUploadedTemplates();
  
  // Combine built-in templates with uploaded ones
  return [...lessonTemplates, ...uploadedTemplates];
};

/**
 * Get a specific uploaded template by ID
 */
export const getTemplateById = async (id: string): Promise<LessonTemplate | null> => {
  // Check built-in templates first
  const builtIn = lessonTemplates.find(t => t.id === id);
  if (builtIn) return builtIn;

  // Check uploaded templates
  const { data, error } = await supabase
    .from('resource_files')
    .select('*')
    .eq('id', id)
    .eq('file_type', 'template')
    .single();

  if (error || !data) {
    console.error('Error fetching template:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.title,
    description: data.description || 'Custom uploaded template',
    curriculum: data.subject || 'all',
    structure: `# {LESSON_TITLE}

**Template:** ${data.title}
**Based on:** ${data.file_name}

Create a comprehensive lesson note following the structure of the uploaded template.
Include all necessary sections and adapt the format for:
- Subject: {SUBJECT}
- Grade: {LEVEL}  
- Strand: {STRAND}
- Content Standard: {CONTENT_STANDARD}`,
    sections: ['Template-based sections'],
  };
};
