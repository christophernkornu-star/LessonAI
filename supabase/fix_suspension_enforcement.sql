-- Fix Suspension RLS and Enforcement
-- This script ensures users can read their own suspension status, AND updates the profiles policy.

-- 1. Ensure PROFILES RLS allows users to see their own status
-- Often profiles are publicly readable, but if strict RLS is on, user might not see 'is_suspended' if not explicitly allowed or if not 'public'.
-- Let's make sure users can read their own rows FULLY.

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Ensure Admin can read/write all profiles (including suspension)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (
        exists (
            select 1 from profiles
            where id = auth.uid() and (role = 'admin' or role = 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        exists (
            select 1 from profiles
            where id = auth.uid() and (role = 'admin' or role = 'super_admin')
        )
    );

-- 3. Also allow public read of basic profile info if needed (optional, keeping safe)
-- CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING ( true ); 
-- If the above exists, it might cover it. But we want to be sure suspension is checked.

-- 4. Double check is_suspended column default
ALTER TABLE profiles ALTER COLUMN is_suspended SET DEFAULT FALSE;

-- 5. Force update existing nulls to false (handling legacy users)
UPDATE profiles SET is_suspended = FALSE WHERE is_suspended IS NULL;
