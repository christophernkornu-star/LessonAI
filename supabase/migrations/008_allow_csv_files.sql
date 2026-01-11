-- Allow CSV and Excel files in resource_files table
-- Drop the existing check constraint
ALTER TABLE public.resource_files 
DROP CONSTRAINT IF EXISTS resource_files_file_format_check;

-- Add new check constraint that includes CSV and Excel formats
ALTER TABLE public.resource_files 
ADD CONSTRAINT resource_files_file_format_check 
CHECK (file_format IN ('pdf', 'doc', 'docx', 'csv', 'xlsx', 'xls'));
