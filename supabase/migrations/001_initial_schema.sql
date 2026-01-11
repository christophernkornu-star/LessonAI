-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
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

-- Create indexes for better query performance
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists templates_user_id_idx on public.templates(user_id);
create index if not exists templates_is_public_idx on public.templates(is_public);
create index if not exists lesson_notes_user_id_idx on public.lesson_notes(user_id);
create index if not exists lesson_notes_created_at_idx on public.lesson_notes(created_at desc);
create index if not exists template_favorites_user_id_idx on public.template_favorites(user_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.template_favorites enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Templates policies
create policy "Public templates are viewable by everyone"
  on public.templates for select
  using (is_public = true or is_system = true or auth.uid() = user_id);

create policy "Authenticated users can create templates"
  on public.templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own templates"
  on public.templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own templates"
  on public.templates for delete
  using (auth.uid() = user_id);

-- Lesson notes policies
create policy "Users can view their own lesson notes"
  on public.lesson_notes for select
  using (auth.uid() = user_id);

create policy "Users can create their own lesson notes"
  on public.lesson_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lesson notes"
  on public.lesson_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own lesson notes"
  on public.lesson_notes for delete
  using (auth.uid() = user_id);

-- Template favorites policies
create policy "Users can view their own favorites"
  on public.template_favorites for select
  using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.template_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on public.template_favorites for delete
  using (auth.uid() = user_id);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_templates_updated_at before update on public.templates
  for each row execute procedure public.handle_updated_at();

create trigger handle_lesson_notes_updated_at before update on public.lesson_notes
  for each row execute procedure public.handle_updated_at();
