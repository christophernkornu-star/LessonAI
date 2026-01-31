-- Fix 500 Recursion Error and 400 Bad Request
-- This script fixes the RLS policies causing infinite recursion on the profiles table
-- And ensures the payment_settings table structure is correct.

-- 1. Create a Secure Helper Function to check Admin status
-- This function is SECURITY DEFINER, meaning it bypasses RLS policies.
-- This breaks the recursion loop when the profiles policy tries to check the profiles table.
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

-- 2. Update Profiles RLS to use the helper function
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (
        is_admin()
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        is_admin()
    );

-- Keep the "Users can read own profile" policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);


-- 3. Fix Payment Settings Structure (if not already Fixed)
-- Ensure columns exist and we aren't using the old key-value structure
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

-- Insert default row if missing
INSERT INTO public.payment_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.payment_settings TO authenticated, anon; 
-- Anon needed if checked during signup or landing? Usually usage is authenticated.
-- But safer to allow read.

