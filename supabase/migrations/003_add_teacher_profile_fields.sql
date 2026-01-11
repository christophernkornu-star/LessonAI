-- Add teacher profile fields to profiles table
alter table public.profiles
add column if not exists school_name text,
add column if not exists first_name text,
add column if not exists middle_name text,
add column if not exists last_name text,
add column if not exists subjects_taught jsonb default '[]'::jsonb,
add column if not exists classes_taught jsonb default '[]'::jsonb,
add column if not exists default_class_size integer;

-- Create index for faster queries
create index if not exists idx_profiles_school on public.profiles(school_name);

-- Update the full_name to be computed from first, middle, last names if needed
-- Users can still use full_name or individual name fields
