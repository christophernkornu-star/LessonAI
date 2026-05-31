import { supabase } from '@/integrations/supabase/client';
// Helper to handle grade level format differences (e.g., "basic1" vs "Basic 1")
const formatGradeForSearch = (grade) => {
    if (!grade)
        return grade;
    // Convert "basic1" to "Basic 1"
    if (grade.toLowerCase().startsWith('basic') && !grade.includes(' ')) {
        const num = grade.toLowerCase().replace('basic', '');
        return `Basic ${num}`;
    }
    return grade;
};
/**
 * Get public curriculum files
 */
export const getPublicCurriculumFiles = async () => {
    const { data, error } = await supabase
        .from('resource_files')
        .select('*')
        .eq('file_type', 'curriculum')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching curriculum files:', error);
        return [];
    }
    return data;
};
/**
 * Get public resource files
 */
export const getPublicResourceFiles = async () => {
    const { data, error } = await supabase
        .from('resource_files')
        .select('*')
        .eq('file_type', 'resource')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching resource files:', error);
        return [];
    }
    return data;
};
/**
 * Get resource files filtered by subject and grade
 * Uses OR logic: shows files that match EITHER subject OR grade level (or both)
 */
export const getFilteredResourceFiles = async (subject, gradeLevel) => {
    let query = supabase
        .from('resource_files')
        .select('*')
        .eq('file_type', 'resource')
        .eq('is_public', true);
    // Build OR conditions to match either subject OR grade level
    if (subject && gradeLevel) {
        const formattedGrade = formatGradeForSearch(gradeLevel);
        // Show files that match EITHER the subject OR the grade level (checking both formats)
        query = query.or(`subject.ilike.%${subject}%,grade_level.ilike.%${gradeLevel}%,grade_level.ilike.%${formattedGrade}%`);
    }
    else if (subject) {
        query = query.ilike('subject', `%${subject}%`);
    }
    else if (gradeLevel) {
        const formattedGrade = formatGradeForSearch(gradeLevel);
        query = query.or(`grade_level.ilike.%${gradeLevel}%,grade_level.ilike.%${formattedGrade}%`);
    }
    // If neither subject nor gradeLevel is provided, return all resource files
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching filtered resources:', error);
        return [];
    }
    console.log('Filtered resource files:', { subject, gradeLevel, count: data?.length || 0, files: data });
    return data;
};
/**
 * Get curriculum files filtered by subject and grade
 */
export const getFilteredCurriculumFiles = async (subject, gradeLevel) => {
    let query = supabase
        .from('resource_files')
        .select('*')
        .eq('file_type', 'curriculum')
        .eq('is_public', true);
    // Build OR conditions to match either subject OR grade level
    if (subject && gradeLevel) {
        const formattedGrade = formatGradeForSearch(gradeLevel);
        // Show files that match EITHER the subject OR the grade level (checking both formats)
        query = query.or(`subject.ilike.%${subject}%,grade_level.ilike.%${gradeLevel}%,grade_level.ilike.%${formattedGrade}%`);
    }
    else if (subject) {
        query = query.ilike('subject', `%${subject}%`);
    }
    else if (gradeLevel) {
        const formattedGrade = formatGradeForSearch(gradeLevel);
        query = query.or(`grade_level.ilike.%${gradeLevel}%,grade_level.ilike.%${formattedGrade}%`);
    }
    // If neither subject nor gradeLevel is provided, return all curriculum files
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching filtered curriculum:', error);
        return [];
    }
    console.log('Filtered curriculum files:', { subject, gradeLevel, count: data?.length || 0, files: data });
    return data;
};
