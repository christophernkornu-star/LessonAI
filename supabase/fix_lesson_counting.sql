-- Fix Lesson Counting Logic
-- We will switch from counting rows in `lesson_notes` (blocked by RLS) to using a dedicated counter in `profiles`.
-- This is faster and more reliable.

-- 1. Ensure 'lessons_generated' column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lessons_generated INTEGER DEFAULT 0;

-- 2. Create function to count existing lessons and update the profile
-- This syncs the counter with reality (count(*) of lesson_notes)
CREATE OR REPLACE FUNCTION public.sync_lesson_counts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profiles with the count of lesson_notes
  UPDATE public.profiles p
  SET lessons_generated = (
    SELECT count(*)
    FROM public.lesson_notes l
    WHERE l.user_id = p.id
  );
END;
$$;

-- Run the sync once immediately
SELECT public.sync_lesson_counts();

-- 3. Create Trigger to automatically increment counter on new lesson note
CREATE OR REPLACE FUNCTION public.handle_lesson_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET lessons_generated = lessons_generated + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lesson_created_count ON public.lesson_notes;

CREATE TRIGGER on_lesson_created_count
  AFTER INSERT ON public.lesson_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lesson_created();

-- 4. Allow Admins to see lesson_notes (Optional, but good for debugging)
-- This fixes the original issue if we wanted to stick with counting rows on the client side.
-- But the server-side counter is better.
DROP POLICY IF EXISTS "Admins can view all lesson notes" ON lesson_notes;

-- Assuming lesson_notes has RLS enabled
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all lesson notes" ON lesson_notes
    FOR SELECT USING (
       exists (
         select 1 from profiles
         where id = auth.uid() and (role = 'admin' or role = 'super_admin')
       )
    );
