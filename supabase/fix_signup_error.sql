-- Fix 500 Error during Signup
-- This script ensures all necessary tables and triggers exist and are correctly configured.

-- 1. Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure profiles table structure is correct (handling recent additions)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_payment_exempt BOOLEAN DEFAULT FALSE;

-- 3. Ensure user_payment_profiles table exists (crucial for the trigger)
CREATE TABLE IF NOT EXISTS public.user_payment_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    is_payment_exempt BOOLEAN DEFAULT FALSE,
    exemption_reason TEXT,
    exempted_by UUID REFERENCES auth.users(id),
    exempted_at TIMESTAMP WITH TIME ZONE,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    total_tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fix permissions for user_payment_profiles
ALTER TABLE public.user_payment_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate basic ones
DROP POLICY IF EXISTS "Users can view own payment profile" ON public.user_payment_profiles;
DROP POLICY IF EXISTS "Users can insert own payment profile" ON public.user_payment_profiles;
DROP POLICY IF EXISTS "Admins can view all payment profiles" ON public.user_payment_profiles;
DROP POLICY IF EXISTS "Admins can modify payment profiles" ON public.user_payment_profiles;

CREATE POLICY "Users can view own payment profile" ON public.user_payment_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- IMPORTANT: Allow the trigger (security definer) or user to insert
CREATE POLICY "Users can insert own payment profile" ON public.user_payment_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment profiles" ON public.user_payment_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can modify payment profiles" ON public.user_payment_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 5. Fix the Payment Profile Creation Trigger
-- Redefine the function to be robust and explicitly use public schema
CREATE OR REPLACE FUNCTION public.create_payment_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_payment_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction (allows signup to succeed even if payment profile fails)
    RAISE WARNING 'Failed to create payment profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger on profiles
DROP TRIGGER IF EXISTS on_profile_created_payment ON public.profiles;

CREATE TRIGGER on_profile_created_payment
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_payment_profile_for_new_user();


-- 6. Ensure handle_new_user (Auth Trigger) is solid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_suspended, is_payment_exempt)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    'user',
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
    
  RETURN NEW;
END;
$$;

-- Ensure system_settings exists for signup check
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.system_settings;
CREATE POLICY "Allow public read access" ON public.system_settings FOR SELECT USING (true);

-- Grant permissions to authenticated and anon (for signup check)
GRANT SELECT ON public.system_settings TO authenticated, anon;
GRANT ALL ON public.user_payment_profiles TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

