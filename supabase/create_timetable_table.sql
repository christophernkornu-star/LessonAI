-- Create timetables table
create table if not exists public.timetables (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  class_level text not null,
  term text default 'First Term',
  subject_config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, class_level, term)
);

-- Enable RLS
alter table public.timetables enable row level security;

-- Policies
create policy "Users can view their own timetables"
  on public.timetables for select
  using (auth.uid() = user_id);

create policy "Users can insert their own timetables"
  on public.timetables for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own timetables"
  on public.timetables for update
  using (auth.uid() = user_id);

create policy "Users can delete their own timetables"
  on public.timetables for delete
  using (auth.uid() = user_id);
