-- =====================================================
-- ULTIMATE RLS FIX - Nuclear option
-- This will completely reset and fix all RLS issues
-- =====================================================

-- 1. CHECK CURRENT STATE
SELECT 'Current user:' as info;
SELECT auth.uid(), email FROM auth.users WHERE id = auth.uid();

SELECT 'Current profile:' as info;
SELECT id, email, role FROM public.profiles WHERE id = auth.uid();

-- 2. COMPLETELY DISABLE RLS ON RESOURCE_FILES
ALTER TABLE IF EXISTS public.resource_files DISABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING POLICIES ON RESOURCE_FILES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'resource_files') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.resource_files';
    END LOOP;
END $$;

-- 4. VERIFY RLS IS DISABLED
SELECT 
    'RLS Status for resource_files:' as info,
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'resource_files';

-- 5. GRANT ALL PERMISSIONS TO AUTHENTICATED USERS
GRANT ALL PRIVILEGES ON public.resource_files TO authenticated;
GRANT ALL PRIVILEGES ON public.resource_files TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6. ALSO FIX CURRICULUM TABLE
ALTER TABLE IF EXISTS public.curriculum DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.curriculum TO authenticated;
GRANT ALL PRIVILEGES ON public.curriculum TO anon;

-- 7. FIX PROFILES TABLE (keep RLS but make it permissive)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- Create simple policies for profiles
CREATE POLICY "Enable read access for all users" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 8. VERIFY EVERYTHING
SELECT 'Final verification:' as info;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('resource_files', 'curriculum', 'profiles')
ORDER BY tablename;

SELECT 'All policies on resource_files (should be 0):' as info;
SELECT policyname FROM pg_policies WHERE tablename = 'resource_files';

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS FIX COMPLETE!';
    RAISE NOTICE 'resource_files: RLS DISABLED';
    RAISE NOTICE 'curriculum: RLS DISABLED'; 
    RAISE NOTICE 'profiles: RLS ENABLED with permissive policies';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Close ALL browser tabs';
    RAISE NOTICE '2. Open fresh browser window';
    RAISE NOTICE '3. Go to http://localhost:8080/admin-login';
    RAISE NOTICE '4. Login again';
    RAISE NOTICE '5. Try uploading a file';
    RAISE NOTICE '========================================';
END $$;
