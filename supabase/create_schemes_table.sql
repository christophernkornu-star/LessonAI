-- Create the schemes table
CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week TEXT,
    week_ending TEXT,
    term TEXT,
    subject TEXT,
    class_level TEXT,
    strand TEXT,
    sub_strand TEXT,
    content_standard TEXT,
    indicators TEXT,
    exemplars TEXT,
    resources TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own schemes" ON public.schemes;
DROP POLICY IF EXISTS "Users can insert their own schemes" ON public.schemes;
DROP POLICY IF EXISTS "Users can update their own schemes" ON public.schemes;
DROP POLICY IF EXISTS "Users can delete their own schemes" ON public.schemes;

-- Create policies
CREATE POLICY "Users can view their own schemes" 
    ON public.schemes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schemes" 
    ON public.schemes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schemes" 
    ON public.schemes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schemes" 
    ON public.schemes FOR DELETE 
    USING (auth.uid() = user_id);
