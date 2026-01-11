-- Enable RLS on the table
ALTER TABLE curriculum ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own curriculum" ON curriculum;
DROP POLICY IF EXISTS "Users can view public curriculum" ON curriculum;
DROP POLICY IF EXISTS "Users can insert their own curriculum" ON curriculum;
DROP POLICY IF EXISTS "Users can update their own curriculum" ON curriculum;
DROP POLICY IF EXISTS "Users can delete their own curriculum" ON curriculum;

-- Drop potentially conflicting new policies (if re-running script)
DROP POLICY IF EXISTS "Enable read access for users" ON curriculum;
DROP POLICY IF EXISTS "Enable insert access for users" ON curriculum;
DROP POLICY IF EXISTS "Enable update access for users" ON curriculum;
DROP POLICY IF EXISTS "Enable delete access for users" ON curriculum;

-- Create comprehensive policies

-- 1. SELECT: Users can see their own data OR any public data
CREATE POLICY "Enable read access for users" ON curriculum
FOR SELECT
USING (
    auth.uid() = user_id 
    OR 
    is_public = true
);

-- 2. INSERT: Users can insert their own data
CREATE POLICY "Enable insert access for users" ON curriculum
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- 3. UPDATE: Users can update their own data
CREATE POLICY "Enable update access for users" ON curriculum
FOR UPDATE
USING (
    auth.uid() = user_id
);

-- 4. DELETE: Users can delete their own data
CREATE POLICY "Enable delete access for users" ON curriculum
FOR DELETE
USING (
    auth.uid() = user_id
);

-- Grant access to authenticated users
GRANT ALL ON curriculum TO authenticated;
GRANT ALL ON curriculum TO service_role;
