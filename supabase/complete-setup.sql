-- =====================================================
-- LESSONAI - COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Add role column to existing profiles table (if it doesn't exist)
DO $$ 
BEGIN
  -- Check if table exists first to prevent error on fresh install
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
      ALTER TABLE public.profiles 
      ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;
  END IF;
END $$;

-- Create profiles table if it doesn't exist (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin', 'super_admin')),
  subscription_tier text default 'free' check (subscription_tier in ('free', 'premium', 'enterprise')),
  lessons_generated integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create templates table
create table if not exists public.templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  curriculum text default 'all',
  structure text not null,
  sections jsonb not null default '[]'::jsonb,
  is_public boolean default false,
  is_system boolean default false,
  usage_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create lesson_notes table
create table if not exists public.lesson_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  template_id uuid references public.templates(id) on delete set null,
  title text not null,
  curriculum text,
  subject text,
  grade_level text,
  strand text,
  sub_strand text,
  content_standard text,
  exemplars text,
  generated_content text not null,
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create favorites table (for templates)
create table if not exists public.template_favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  template_id uuid references public.templates(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, template_id)
);

-- Create curriculum table
create table if not exists public.curriculum (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  curriculum_name text not null,
  grade_level text not null,
  subject text not null,
  strand text,
  sub_strand text,
  content_standards jsonb not null default '[]'::jsonb,
  learning_indicators jsonb not null default '[]'::jsonb,
  exemplars text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create resource_files table for PDF/DOC uploads
create table if not exists public.resource_files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('curriculum', 'template', 'resource')),
  file_format text not null check (file_format in ('pdf', 'doc', 'docx')),
  file_size bigint,
  title text not null,
  description text,
  grade_level text,
  subject text,
  tags text[] default array[]::text[],
  is_public boolean default false,
  download_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists templates_user_id_idx on public.templates(user_id);
create index if not exists templates_is_public_idx on public.templates(is_public);
create index if not exists lesson_notes_user_id_idx on public.lesson_notes(user_id);
create index if not exists lesson_notes_created_at_idx on public.lesson_notes(created_at desc);
create index if not exists template_favorites_user_id_idx on public.template_favorites(user_id);
create index if not exists curriculum_grade_subject_idx on public.curriculum(grade_level, subject);
create index if not exists curriculum_user_id_idx on public.curriculum(user_id);
create index if not exists curriculum_is_public_idx on public.curriculum(is_public);
create index if not exists resource_files_user_id_idx on public.resource_files(user_id);
create index if not exists resource_files_type_idx on public.resource_files(file_type);
create index if not exists resource_files_is_public_idx on public.resource_files(is_public);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.template_favorites enable row level security;
alter table public.curriculum enable row level security;
alter table public.resource_files enable row level security;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Templates policies
drop policy if exists "Public templates are viewable by everyone" on public.templates;
create policy "Public templates are viewable by everyone"
  on public.templates for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users and admins can insert templates" on public.templates;
create policy "Users and admins can insert templates"
  on public.templates for insert
  with check (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Users can update their own templates, admins can update any" on public.templates;
create policy "Users can update their own templates, admins can update any"
  on public.templates for update
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Users can delete their own templates, admins can delete any" on public.templates;
create policy "Users can delete their own templates, admins can delete any"
  on public.templates for delete
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

-- Lesson notes policies
drop policy if exists "Users can view their own lesson notes" on public.lesson_notes;
create policy "Users can view their own lesson notes"
  on public.lesson_notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own lesson notes" on public.lesson_notes;
create policy "Users can create their own lesson notes"
  on public.lesson_notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own lesson notes" on public.lesson_notes;
create policy "Users can update their own lesson notes"
  on public.lesson_notes for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own lesson notes" on public.lesson_notes;
create policy "Users can delete their own lesson notes"
  on public.lesson_notes for delete
  using (auth.uid() = user_id);

-- Template favorites policies
drop policy if exists "Users can view their own favorites" on public.template_favorites;
create policy "Users can view their own favorites"
  on public.template_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add favorites" on public.template_favorites;
create policy "Users can add favorites"
  on public.template_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove favorites" on public.template_favorites;
create policy "Users can remove favorites"
  on public.template_favorites for delete
  using (auth.uid() = user_id);

-- Curriculum policies
drop policy if exists "Public curriculum viewable by everyone" on public.curriculum;
create policy "Public curriculum viewable by everyone"
  on public.curriculum for select
  using (is_public = true or auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can insert curriculum" on public.curriculum;
create policy "Admins can insert curriculum"
  on public.curriculum for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can update curriculum" on public.curriculum;
create policy "Admins can update curriculum"
  on public.curriculum for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can delete curriculum" on public.curriculum;
create policy "Admins can delete curriculum"
  on public.curriculum for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

-- Resource files policies
drop policy if exists "Public resources viewable by everyone" on public.resource_files;
create policy "Public resources viewable by everyone"
  on public.resource_files for select
  using (is_public = true or auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can insert resources" on public.resource_files;
create policy "Admins can insert resources"
  on public.resource_files for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can update resources" on public.resource_files;
create policy "Admins can update resources"
  on public.resource_files for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Admins can delete resources" on public.resource_files;
create policy "Admins can delete resources"
  on public.resource_files for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Function to increment lesson count
create or replace function increment_lessons_count(user_id uuid)
returns void as $$
begin
  update public.profiles
  set lessons_generated = lessons_generated + 1
  where id = user_id;
end;
$$ language plpgsql security definer;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Triggers for updated_at
drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_templates_updated_at on public.templates;
create trigger handle_templates_updated_at before update on public.templates
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_lesson_notes_updated_at on public.lesson_notes;
create trigger handle_lesson_notes_updated_at before update on public.lesson_notes
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_curriculum_updated_at on public.curriculum;
create trigger handle_curriculum_updated_at before update on public.curriculum
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_resource_files_updated_at on public.resource_files;
create trigger handle_resource_files_updated_at before update on public.resource_files
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 7. SEED SYSTEM TEMPLATES
-- =====================================================

insert into public.templates (id, user_id, name, description, curriculum, structure, sections, is_public, is_system)
values 
(
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  null,
  'Standard Lesson Plan',
  'Traditional comprehensive lesson plan format',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Information\n- **Subject:** {SUBJECT}\n- **Grade/Level:** {LEVEL}\n- **Duration:** {DURATION}\n- **Date:** {DATE}\n\n## Curriculum Details\n- **Curriculum:** {CURRICULUM}\n- **Strand:** {STRAND}\n- **Sub-Strand:** {SUB_STRAND}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials and Resources\n{MATERIALS}\n\n## Introduction/Warm-up (5-10 minutes)\n{INTRODUCTION}\n\n## Main Teaching Activities (30-40 minutes)\n{MAIN_ACTIVITIES}\n\n## Assessment\n{ASSESSMENT}\n\n## Differentiation Strategies\n{DIFFERENTIATION}\n\n## Conclusion/Summary (5 minutes)\n{CONCLUSION}\n\n## Homework/Extension\n{HOMEWORK}\n\n## Teacher''s Reflection\n{REFLECTION}',
  '["Lesson Information", "Curriculum Details", "Learning Objectives", "Materials and Resources", "Introduction/Warm-up", "Main Teaching Activities", "Assessment", "Differentiation Strategies", "Conclusion/Summary", "Homework/Extension", "Teacher''s Reflection"]'::jsonb,
  true,
  true
),
(
  'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
  null,
  '5E Instructional Model',
  'Engage, Explore, Explain, Elaborate, Evaluate',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Overview\n- **Subject:** {SUBJECT}\n- **Grade/Level:** {LEVEL}\n- **Strand:** {STRAND}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials Needed\n{MATERIALS}\n\n## 1. ENGAGE (10 minutes)\n**Purpose:** Capture students'' attention and assess prior knowledge\n\n{ENGAGE}\n\n## 2. EXPLORE (15 minutes)\n**Purpose:** Allow students to investigate and discover\n\n{EXPLORE}\n\n## 3. EXPLAIN (15 minutes)\n**Purpose:** Introduce formal terminology and concepts\n\n{EXPLAIN}\n\n## 4. ELABORATE (20 minutes)\n**Purpose:** Apply concepts in new contexts\n\n{ELABORATE}\n\n## 5. EVALUATE (10 minutes)\n**Purpose:** Assess student understanding\n\n{EVALUATE}\n\n## Differentiation\n{DIFFERENTIATION}\n\n## Extension Activities\n{EXTENSION}',
  '["Lesson Overview", "Learning Objectives", "Materials Needed", "Engage", "Explore", "Explain", "Elaborate", "Evaluate", "Differentiation", "Extension Activities"]'::jsonb,
  true,
  true
),
(
  'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
  null,
  'Madeline Hunter Model',
  'Direct instruction lesson design',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Details\n- **Subject:** {SUBJECT}\n- **Grade:** {LEVEL}\n- **Duration:** {DURATION}\n- **Standard:** {CONTENT_STANDARD}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Anticipatory Set (Hook)\n{ANTICIPATORY_SET}\n\n## Teaching (Input, Modeling, and Check for Understanding)\n### Input\n{INPUT}\n\n### Modeling\n{MODELING}\n\n### Checking for Understanding\n{CHECK_UNDERSTANDING}\n\n## Guided Practice\n{GUIDED_PRACTICE}\n\n## Independent Practice\n{INDEPENDENT_PRACTICE}\n\n## Closure\n{CLOSURE}\n\n## Assessment\n{ASSESSMENT}',
  '["Lesson Details", "Learning Objectives", "Anticipatory Set", "Teaching Input", "Modeling", "Checking for Understanding", "Guided Practice", "Independent Practice", "Closure", "Assessment"]'::jsonb,
  true,
  true
),
(
  'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
  null,
  'Gradual Release Model (I Do, We Do, You Do)',
  'Scaffolded instruction approach',
  'all',
  E'# {LESSON_TITLE}\n\n## Overview\n- **Subject:** {SUBJECT}\n- **Grade Level:** {LEVEL}\n- **Strand/Topic:** {STRAND}\n- **Learning Standard:** {CONTENT_STANDARD}\n\n## Learning Targets\n{OBJECTIVES}\n\n## Required Materials\n{MATERIALS}\n\n## I DO - Teacher Modeling (15 minutes)\n**Teacher demonstrates and thinks aloud**\n\n{I_DO}\n\n## WE DO - Guided Practice (20 minutes)\n**Teacher and students work together**\n\n{WE_DO}\n\n## YOU DO TOGETHER - Collaborative Practice (15 minutes)\n**Students work in pairs/groups with teacher monitoring**\n\n{YOU_DO_TOGETHER}\n\n## YOU DO ALONE - Independent Practice (20 minutes)\n**Individual student work**\n\n{YOU_DO_ALONE}\n\n## Assessment and Feedback\n{ASSESSMENT}\n\n## Differentiation Support\n{DIFFERENTIATION}\n\n## Closure and Next Steps\n{CLOSURE}',
  '["Overview", "Learning Targets", "Required Materials", "I Do - Teacher Modeling", "We Do - Guided Practice", "You Do Together - Collaborative", "You Do Alone - Independent", "Assessment and Feedback", "Differentiation Support", "Closure and Next Steps"]'::jsonb,
  true,
  true
),
(
  'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
  null,
  'Inquiry-Based Learning',
  'Student-centered discovery learning',
  'all',
  E'# {LESSON_TITLE}\n\n## Lesson Context\n- **Subject:** {SUBJECT}\n- **Grade:** {LEVEL}\n- **Big Question:** {BIG_QUESTION}\n- **Content Standard:** {CONTENT_STANDARD}\n\n## Essential Question\n{ESSENTIAL_QUESTION}\n\n## Learning Objectives\n{OBJECTIVES}\n\n## Materials and Resources\n{MATERIALS}\n\n## Phase 1: Ask - Questioning (10 minutes)\n{ASK}\n\n## Phase 2: Investigate - Research and Exploration (25 minutes)\n{INVESTIGATE}\n\n## Phase 3: Create - Construct Understanding (20 minutes)\n{CREATE}\n\n## Phase 4: Discuss - Share and Reflect (15 minutes)\n{DISCUSS}\n\n## Phase 5: Reflect - Metacognition (10 minutes)\n{REFLECT}\n\n## Assessment Strategies\n{ASSESSMENT}\n\n## Scaffolding and Support\n{SCAFFOLDING}',
  '["Lesson Context", "Essential Question", "Learning Objectives", "Materials and Resources", "Ask - Questioning", "Investigate - Research", "Create - Understanding", "Discuss - Share", "Reflect - Metacognition", "Assessment Strategies", "Scaffolding and Support"]'::jsonb,
  true,
  true
),
(
  'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
  null,
  'Understanding by Design (UbD)',
  'Backward design focusing on desired results',
  'all',
  E'# {LESSON_TITLE}\n\n## Stage 1: Desired Results\n### Established Goals\n**Standard:** {CONTENT_STANDARD}\n**Strand:** {STRAND}\n\n### Transfer Goals\n{TRANSFER_GOALS}\n\n### Understanding\nStudents will understand that...\n{UNDERSTANDINGS}\n\n### Essential Questions\n{ESSENTIAL_QUESTIONS}\n\n### Students will know...\n{KNOWLEDGE}\n\n### Students will be able to...\n{SKILLS}\n\n## Stage 2: Evidence of Learning\n### Performance Tasks\n{PERFORMANCE_TASKS}\n\n### Other Evidence\n{OTHER_EVIDENCE}\n\n## Stage 3: Learning Plan\n### Materials\n{MATERIALS}\n\n### Learning Activities (Sequence)\n{LEARNING_ACTIVITIES}\n\n### Differentiation\n{DIFFERENTIATION}\n\n## Notes and Reflections\n{NOTES}',
  '["Established Goals", "Transfer Goals", "Understandings", "Essential Questions", "Knowledge", "Skills", "Performance Tasks", "Other Evidence", "Materials", "Learning Activities", "Differentiation", "Notes and Reflections"]'::jsonb,
  true,
  true
)
on conflict (id) do nothing;

-- =====================================================
-- SETUP COMPLETE! 
-- You should now have:
-- - 6 tables: profiles, templates, lesson_notes, template_favorites, curriculum, resource_files
-- - 6 pre-built lesson templates
-- - Admin role-based access control
-- - All security policies and triggers
-- 
-- NEXT STEP: Create Storage Buckets for file uploads
-- Go to Storage in Supabase Dashboard and create these buckets:
-- - curriculum-files (for PDF/DOC curriculum files)
-- - template-files (for PDF/DOC template files)
-- - resource-files (for PDF/DOC resource files)
-- Set all buckets to "Public" if you want files accessible without auth
-- =====================================================
