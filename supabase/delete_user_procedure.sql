-- Run this SQL in your Supabase SQL Editor to allow admins to delete users
-- This creates a secure RPC function that only admins can execute.

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the executing user is an admin by checking their profile role
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;

  -- Delete the user from the auth.users table
  -- Because auth.users is the parent table, deleting here cascades 
  -- and deletes associated records in public.profiles automatically.
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;
