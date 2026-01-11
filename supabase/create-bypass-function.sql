-- =====================================================
-- CREATE SECURITY DEFINER FUNCTION TO BYPASS RLS
-- This function runs with elevated privileges
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_insert_resource_file(
  p_user_id uuid,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_file_format text,
  p_file_size bigint,
  p_title text,
  p_description text,
  p_grade_level text,
  p_subject text,
  p_tags text[],
  p_is_public boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- This makes the function run with the privileges of the owner (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.resource_files (
    user_id,
    file_name,
    file_path,
    file_type,
    file_format,
    file_size,
    title,
    description,
    grade_level,
    subject,
    tags,
    is_public
  ) VALUES (
    p_user_id,
    p_file_name,
    p_file_path,
    p_file_type,
    p_file_format,
    p_file_size,
    p_title,
    p_description,
    p_grade_level,
    p_subject,
    p_tags,
    p_is_public
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_insert_resource_file TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_insert_resource_file TO anon;

-- Test the function
SELECT 'Function created successfully!' as status;
