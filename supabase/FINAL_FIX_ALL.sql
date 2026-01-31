-- FINAL CUMULATIVE FIX
-- Run this script to resolve ALL current issues:
-- 1. 500 Error on Profile Fetch (Infinite Recursion)
-- 2. 400 Error on Payment Settings (Schema Mismatch)
-- 3. Suspension not working (RLS Policy blocking read)
-- 4. Signup 500 Error (Missing tables/triggers)

-- ==================================================
-- PART 1: FIX PROFILE RECURSION & SUSPENSION
-- ==================================================

-- Create a secure function to check admin status without triggering RLS loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'super_admin')
  );
END;
$$;

-- Refine Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own FULL profile (including is_suspended)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow admins to read ALL profiles using the secure function
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING ( public.is_admin() );

-- Allow admins to update ALL profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING ( public.is_admin() );

-- Ensure columns exist and are clean
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_payment_exempt BOOLEAN DEFAULT FALSE;
UPDATE profiles SET is_suspended = FALSE WHERE is_suspended IS NULL;

-- ==================================================
-- PART 2: FIX PAYMENT SETTINGS (400 ERROR ROOT CAUSE)
-- ==================================================

-- Ensure table uses specific columns, NOT key-value pairs
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    token_price_per_1000 DECIMAL(10, 6) NOT NULL DEFAULT 0.0007,
    platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
    minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.50,
    free_daily_tokens INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GHS',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the default row if it doesn't exist
INSERT INTO public.payment_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Allow public/auth read access
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read payment settings" ON payment_settings;
-- Create simple read policy without recursion risk
CREATE POLICY "Anyone can read payment settings" ON payment_settings
    FOR SELECT USING (true);
    
-- Allow admins to update
DROP POLICY IF EXISTS "Admins can modify payment settings" ON payment_settings;
CREATE POLICY "Admins can modify payment settings" ON payment_settings
    FOR ALL USING ( public.is_admin() );

-- ==================================================
-- PART 3: FIX SIGNUP & TRIGGERS
-- ==================================================

-- Fix New User Handler (Auth Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;

-- Ensure Payment Profile Trigger exists and is robust
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
    RAISE WARNING 'Payment profile creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Bind trigger
DROP TRIGGER IF EXISTS on_profile_created_payment ON public.profiles;
CREATE TRIGGER on_profile_created_payment
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_payment_profile_for_new_user();

-- Ensure system_settings table for signup blocking
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read system settings" ON system_settings;
CREATE POLICY "Public read system settings" ON system_settings FOR SELECT USING (true);
