-- 1. Create system_settings table for global configurations
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (so Signup page can check status)
CREATE POLICY "Allow public read access" ON system_settings FOR SELECT USING (true);

-- Allow admin write access
CREATE POLICY "Allow admin write access" ON system_settings FOR ALL USING (
  exists (
    select 1 from profiles
    where id = auth.uid() and (role = 'admin' or role = 'super_admin')
  )
);

-- Insert default settings
INSERT INTO system_settings (key, value)
VALUES ('allow_signups', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- 2. Add is_payment_exempt to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_payment_exempt BOOLEAN DEFAULT FALSE;

-- 3. Update RLS policies to allow admins to update profiles (if not already present)
-- This ensures admins can toggle suspension and exemption
CREATE POLICY "Allow admins to update any profile" ON profiles
  FOR UPDATE USING (
    exists (
      select 1 from profiles
      where id = auth.uid() and (role = 'admin' or role = 'super_admin')
    )
  );

-- 4. Add is_suspended logic (if not already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
