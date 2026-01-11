-- =====================================================
-- PROMOTE USER TO ADMIN
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Find your user ID and current role
SELECT id, email, role 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 2: Copy your email from the results above, then run this:
-- (Replace 'your_email@example.com' with your actual email)

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your_email@example.com';

-- STEP 3: Verify the update worked
SELECT id, email, role 
FROM public.profiles 
WHERE role IN ('admin', 'super_admin');

-- You should see your account with role = 'admin'
