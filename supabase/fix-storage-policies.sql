-- =====================================================
-- FIX STORAGE BUCKET POLICIES
-- Allow authenticated users to upload files
-- =====================================================

-- Check existing buckets
SELECT id, name, public FROM storage.buckets;

-- Enable public access and configure policies for all three buckets
-- Note: Bucket policies in Supabase are separate from table RLS

-- For curriculum-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum-files', 'curriculum-files', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- For template-files bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-files', 'template-files', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- For resource-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- Drop existing policies first (ignore errors if they don't exist)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated uploads to curriculum-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read from curriculum-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete from curriculum-files" ON storage.objects;
    
    DROP POLICY IF EXISTS "Allow authenticated uploads to template-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read from template-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete from template-files" ON storage.objects;
    
    DROP POLICY IF EXISTS "Allow authenticated uploads to resource-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read from resource-files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete from resource-files" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create storage policies to allow uploads
-- Policy for curriculum-files
CREATE POLICY "Allow authenticated uploads to curriculum-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'curriculum-files');

CREATE POLICY "Allow public read from curriculum-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'curriculum-files');

CREATE POLICY "Allow authenticated delete from curriculum-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'curriculum-files');

-- Policy for template-files
CREATE POLICY "Allow authenticated uploads to template-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'template-files');

CREATE POLICY "Allow public read from template-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'template-files');

CREATE POLICY "Allow authenticated delete from template-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'template-files');

-- Policy for resource-files
CREATE POLICY "Allow authenticated uploads to resource-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-files');

CREATE POLICY "Allow public read from resource-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'resource-files');

CREATE POLICY "Allow authenticated delete from resource-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'resource-files');

-- Verify policies were created
SELECT 
    policyname,
    tablename
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- Success message
SELECT 'Storage policies configured! Try uploading now.' as status;
