-- Add class_sizes column to profiles table to store per-class size data
-- This allows storing a map of class names to their specific class sizes
-- Example format: {"Basic 1": 35, "Basic 2": 40}

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS class_sizes jsonb DEFAULT '{}'::jsonb;
