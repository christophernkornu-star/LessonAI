-- =====================================================
-- ADD ROLE COLUMN TO EXISTING PROFILES TABLE
-- Run this FIRST before running complete-setup.sql
-- =====================================================

-- Add role column to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index on role column
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Update any existing users to have 'user' role if they don't have one
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'role';
