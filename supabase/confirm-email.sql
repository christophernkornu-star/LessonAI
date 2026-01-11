-- Run this in your Supabase SQL Editor to manually confirm a user's email
-- Replace 'teacher@school.com' with the email address you are trying to login with

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'teacher@school.com';
