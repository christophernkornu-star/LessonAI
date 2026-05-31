create table if not exists public.class_cover_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_level text not null,
  school_name text default '',
  teacher_name text default '',
  subject_teachers jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, class_level)
);

alter table public.class_cover_profiles enable row level security;

create policy "Select own class profiles" on public.class_cover_profiles
  for select using (auth.uid() = user_id);

create policy "Insert own class profiles" on public.class_cover_profiles
  for insert with check (auth.uid() = user_id);

create policy "Update own class profiles" on public.class_cover_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Delete own class profiles" on public.class_cover_profiles
  for delete using (auth.uid() = user_id);
