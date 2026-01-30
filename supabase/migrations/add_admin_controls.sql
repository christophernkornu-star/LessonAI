-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Turn on RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON system_settings FOR SELECT USING (true);

-- Allow write access only to admins
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


-- Add is_payment_exempt to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_payment_exempt BOOLEAN DEFAULT FALSE;

-- Ensure admin can update this column (existing policies might cover update logic, but explicit check implies reliance on RLS)
-- We assume "Admins can update suspension status" policies or similar broad admin policies exist. 
-- Ideally we'd add specific policy or rely on a "Admins can update all profiles" policy.
