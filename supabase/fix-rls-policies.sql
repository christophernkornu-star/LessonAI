-- =====================================================
-- DEBUG AND FIX RLS POLICIES FOR ADMIN UPLOADS
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Check your current user and role
SELECT 
  auth.uid() as your_user_id,
  p.email,
  p.role
FROM public.profiles p
WHERE p.id = auth.uid();

-- STEP 2: Check if RLS is enabled on resource_files
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'resource_files';

-- STEP 3: View existing policies on resource_files
SELECT 
  policyname, 
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'resource_files';

-- STEP 4: TEMPORARILY disable RLS to test (DO THIS FIRST)
ALTER TABLE public.resource_files DISABLE ROW LEVEL SECURITY;

-- Now try uploading a file through the UI
-- If it works, RLS is the problem

-- STEP 5: Re-enable RLS and recreate policies properly
ALTER TABLE public.resource_files ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public resources viewable by everyone" ON public.resource_files;
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resource_files;
DROP POLICY IF EXISTS "Admins can update resources" ON public.resource_files;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resource_files;

-- Create new policies with proper checks
CREATE POLICY "Anyone can view public resources"
  ON public.resource_files FOR SELECT
  USING (
    is_public = true 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert resources"
  ON public.resource_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update resources"
  ON public.resource_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete resources"
  ON public.resource_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- STEP 6: Grant necessary permissions
GRANT ALL ON public.resource_files TO authenticated;
GRANT ALL ON public.resource_files TO service_role;

-- STEP 7: Verify policies are working
-- Test if you can insert (this should work if you're admin)
DO $$
DECLARE
  test_user_id uuid;
  test_role text;
BEGIN
  SELECT id, role INTO test_user_id, test_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'User Role: %', test_role;
  
  IF test_role IN ('admin', 'super_admin') THEN
    RAISE NOTICE 'SUCCESS: You have admin privileges!';
  ELSE
    RAISE NOTICE 'ERROR: You need admin role. Current role: %', test_role;
  END IF;
END $$;
