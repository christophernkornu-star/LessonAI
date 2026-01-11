-- Function to increment lessons_generated count
create or replace function public.increment_lessons_count(user_id uuid)
returns void as $$
begin
  update public.profiles
  set lessons_generated = lessons_generated + 1
  where id = user_id;
end;
$$ language plpgsql security definer;
