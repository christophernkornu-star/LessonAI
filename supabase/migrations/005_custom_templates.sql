-- Create custom_templates table
CREATE TABLE IF NOT EXISTS public.custom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  category TEXT, -- e.g., 'ghana', 'basic', 'custom'
  tags TEXT[], -- array of tags for searching
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
ON public.custom_templates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can view public templates
CREATE POLICY "Users can view public templates"
ON public.custom_templates FOR SELECT
TO authenticated
USING (is_public = TRUE);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own templates"
ON public.custom_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
ON public.custom_templates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
ON public.custom_templates FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_custom_templates_user ON public.custom_templates(user_id);
CREATE INDEX idx_custom_templates_public ON public.custom_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_custom_templates_category ON public.custom_templates(category);

-- Storage bucket for custom templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-templates', 'custom-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for custom templates
-- Allow authenticated users to upload their own templates
CREATE POLICY "Users can upload own templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custom-templates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own templates
CREATE POLICY "Users can read own templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custom-templates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own templates
CREATE POLICY "Users can update own templates storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'custom-templates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own templates
CREATE POLICY "Users can delete own templates storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'custom-templates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read public templates
CREATE POLICY "Users can read public templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'custom-templates' AND
  EXISTS (
    SELECT 1 FROM public.custom_templates
    WHERE file_url LIKE '%' || name || '%' AND is_public = TRUE
  )
);
