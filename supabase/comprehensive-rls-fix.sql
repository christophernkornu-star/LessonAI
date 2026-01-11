-- =====================================================
-- COMPREHENSIVE RLS FIX - Check and disable ALL tables
-- =====================================================

-- Check RLS status on ALL relevant tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'resource_files', 'curriculum', 'templates', 'lesson_notes');

-- Disable RLS on resource_files (main issue)
ALTER TABLE public.resource_files DISABLE ROW LEVEL SECURITY;

-- Also disable on curriculum just in case
ALTER TABLE public.curriculum DISABLE ROW LEVEL SECURITY;

-- Make sure profiles table allows reads for everyone (needed for role checks)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Grant all necessary permissions
GRANT ALL ON public.resource_files TO authenticated;
GRANT ALL ON public.curriculum TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the changes
SELECT 'resource_files RLS status:' as info;
SELECT rowsecurity FROM pg_tables WHERE tablename = 'resource_files';

SELECT 'curriculum RLS status:' as info;
SELECT rowsecurity FROM pg_tables WHERE tablename = 'curriculum';

SELECT 'profiles RLS status:' as info;
SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles';
