-- Create the timetables table
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_level TEXT NOT NULL,
    term TEXT NOT NULL DEFAULT 'First Term',
    subject_config JSONB DEFAULT '{}'::jsonb,
    class_size NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, class_level, term)
);

-- Enable RLS
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts on re-run
DROP POLICY IF EXISTS "Users can view their own timetables" ON public.timetables;
DROP POLICY IF EXISTS "Users can insert their own timetables" ON public.timetables;
DROP POLICY IF EXISTS "Users can update their own timetables" ON public.timetables;
DROP POLICY IF EXISTS "Users can delete their own timetables" ON public.timetables;

-- Create policies
CREATE POLICY "Users can view their own timetables" 
    ON public.timetables FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetables" 
    ON public.timetables FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetables" 
    ON public.timetables FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timetables" 
    ON public.timetables FOR DELETE 
    USING (auth.uid() = user_id);
