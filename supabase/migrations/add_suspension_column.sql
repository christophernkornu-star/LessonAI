-- Add is_suspended column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Ensure RLS policies allow reading this column (usually authenticated users can read public profile info, but verify)
-- If policies are strict, add one for admins to update this column.

-- Policy for admin to update suspension status
create policy "Admins can update suspension status"
on profiles
for update
using (
  is_admin()
)
with check (
  is_admin()
);
