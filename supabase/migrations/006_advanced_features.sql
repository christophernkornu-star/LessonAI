-- Create standards_coverage table to track which standards have been taught
CREATE TABLE IF NOT EXISTS public.standards_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  strand TEXT NOT NULL,
  sub_strand TEXT,
  content_standard TEXT NOT NULL,
  lesson_note_id UUID, -- Optional reference to lesson_notes table
  date_taught DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resource_library table
CREATE TABLE IF NOT EXISTS public.resource_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'image', 'video', 'document', 'link', 'activity'
  file_url TEXT,
  external_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[],
  subject TEXT,
  level TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create curriculum_files table for better organization
CREATE TABLE IF NOT EXISTS public.curriculum_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  subject TEXT,
  level TEXT,
  tags TEXT[],
  is_system_wide BOOLEAN DEFAULT FALSE, -- Admin-uploaded files available to all
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  use_count INTEGER DEFAULT 0
);

-- Create ai_usage_logs table for tracking API usage
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'lesson', 'assessment', 'worksheet', etc.
  model TEXT,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 4),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_analytics table
CREATE TABLE IF NOT EXISTS public.system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.standards_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for standards_coverage
CREATE POLICY "Users can view own standards coverage"
ON public.standards_coverage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own standards coverage"
ON public.standards_coverage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own standards coverage"
ON public.standards_coverage FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own standards coverage"
ON public.standards_coverage FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for resource_library
CREATE POLICY "Users can view own resources"
ON public.resource_library FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own resources"
ON public.resource_library FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
ON public.resource_library FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resources"
ON public.resource_library FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for curriculum_files
CREATE POLICY "Users can view own curriculum files"
ON public.curriculum_files FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_system_wide = TRUE);

CREATE POLICY "Users can insert own curriculum files"
ON public.curriculum_files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own curriculum files"
ON public.curriculum_files FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own curriculum files"
ON public.curriculum_files FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for ai_usage_logs
CREATE POLICY "Users can view own usage logs"
ON public.ai_usage_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
ON public.ai_usage_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can view all logs
CREATE POLICY "Admins can view all usage logs"
ON public.ai_usage_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- RLS Policies for system_analytics
CREATE POLICY "Admins can view analytics"
ON public.system_analytics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert analytics"
ON public.system_analytics FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_standards_coverage_user ON public.standards_coverage(user_id);
CREATE INDEX idx_standards_coverage_subject ON public.standards_coverage(subject, level);
CREATE INDEX idx_standards_coverage_date ON public.standards_coverage(date_taught);

CREATE INDEX idx_resource_library_user ON public.resource_library(user_id);
CREATE INDEX idx_resource_library_public ON public.resource_library(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_resource_library_subject ON public.resource_library(subject);
CREATE INDEX idx_resource_library_type ON public.resource_library(resource_type);

CREATE INDEX idx_curriculum_files_user ON public.curriculum_files(user_id);
CREATE INDEX idx_curriculum_files_subject ON public.curriculum_files(subject);
CREATE INDEX idx_curriculum_files_system ON public.curriculum_files(is_system_wide) WHERE is_system_wide = TRUE;

CREATE INDEX idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_date ON public.ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_type ON public.ai_usage_logs(request_type);

CREATE INDEX idx_system_analytics_metric ON public.system_analytics(metric_name);
CREATE INDEX idx_system_analytics_date ON public.system_analytics(recorded_at);

-- Storage bucket for resource library
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resources
CREATE POLICY "Users can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own resources storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view public resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

CREATE POLICY "Users can update own resources storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own resources storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to increment resource view count
CREATE OR REPLACE FUNCTION increment_resource_views(resource_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.resource_library
  SET view_count = view_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment resource download count
CREATE OR REPLACE FUNCTION increment_resource_downloads(resource_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.resource_library
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_user_id UUID,
  p_request_type TEXT,
  p_model TEXT,
  p_tokens_used INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_cost_estimate DECIMAL(10, 4);
BEGIN
  -- Simple cost calculation (adjust based on actual pricing)
  v_cost_estimate := (p_tokens_used::DECIMAL / 1000) * 0.0001;
  
  INSERT INTO public.ai_usage_logs (
    user_id,
    request_type,
    model,
    tokens_used,
    cost_estimate,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_request_type,
    p_model,
    p_tokens_used,
    v_cost_estimate,
    p_success,
    p_error_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
