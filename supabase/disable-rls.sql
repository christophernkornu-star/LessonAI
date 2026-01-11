-- =====================================================
-- SIMPLE FIX: Disable RLS on resource_files
-- We check admin access in application code, so RLS is redundant
-- =====================================================

-- Disable RLS completely on resource_files table
ALTER TABLE public.resource_files DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'resource_files';

-- You should see rls_enabled = false

-- Grant permissions just to be safe
GRANT ALL ON public.resource_files TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
