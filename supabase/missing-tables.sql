-- =====================================================
-- MISSING TABLES SETUP
-- Run this file in Supabase SQL Editor to fix 404 errors
-- =====================================================

-- 1. Create ai_usage_logs table
create table if not exists public.ai_usage_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  request_type text not null,
  model text not null,
  tokens_used integer default 0,
  success boolean default true,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create custom_templates table
create table if not exists public.custom_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  file_url text not null,
  file_name text not null,
  file_size bigint,
  is_public boolean default false,
  is_favorite boolean default false,
  category text,
  tags text[] default array[]::text[],
  download_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create resource_library table
create table if not exists public.resource_library (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  resource_type text not null check (resource_type in ('image', 'video', 'document', 'link', 'activity')),
  file_url text,
  external_url text,
  thumbnail_url text,
  tags text[] default array[]::text[],
  subject text,
  level text,
  is_public boolean default false,
  is_featured boolean default false,
  download_count integer default 0,
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.ai_usage_logs enable row level security;
alter table public.custom_templates enable row level security;
alter table public.resource_library enable row level security;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- ai_usage_logs policies
drop policy if exists "Admins can view all logs" on public.ai_usage_logs;
create policy "Admins can view all logs"
  on public.ai_usage_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));

drop policy if exists "Users can insert logs" on public.ai_usage_logs;
create policy "Users can insert logs"
  on public.ai_usage_logs for insert
  with check (auth.uid() = user_id or user_id is null);

-- custom_templates policies
drop policy if exists "Public custom templates are viewable by everyone" on public.custom_templates;
create policy "Public custom templates are viewable by everyone"
  on public.custom_templates for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can insert their own custom templates" on public.custom_templates;
create policy "Users can insert their own custom templates"
  on public.custom_templates for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own custom templates" on public.custom_templates;
create policy "Users can update their own custom templates"
  on public.custom_templates for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own custom templates" on public.custom_templates;
create policy "Users can delete their own custom templates"
  on public.custom_templates for delete
  using (auth.uid() = user_id);

-- resource_library policies
drop policy if exists "Public library resources viewable by everyone" on public.resource_library;
create policy "Public library resources viewable by everyone"
  on public.resource_library for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can insert library resources" on public.resource_library;
create policy "Users can insert library resources"
  on public.resource_library for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own library resources" on public.resource_library;
create policy "Users can update their own library resources"
  on public.resource_library for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own library resources" on public.resource_library;
create policy "Users can delete their own library resources"
  on public.resource_library for delete
  using (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

drop trigger if exists handle_custom_templates_updated_at on public.custom_templates;
create trigger handle_custom_templates_updated_at before update on public.custom_templates
  for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_resource_library_updated_at on public.resource_library;
create trigger handle_resource_library_updated_at before update on public.resource_library
  for each row execute procedure public.handle_updated_at();

