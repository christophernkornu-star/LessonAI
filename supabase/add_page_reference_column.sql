-- Add page_reference column to curriculum table
ALTER TABLE public.curriculum ADD COLUMN IF NOT EXISTS page_reference TEXT;
