import { supabase } from '@/integrations/supabase/client';

export interface ResourceFile {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: 'curriculum' | 'template' | 'resource';
  file_format: 'pdf' | 'doc' | 'docx';
  file_size?: number;
  title: string;
  description?: string;
  grade_level?: string;
  subject?: string;
  tags?: string[];
  is_public: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

interface UploadFileParams {
  file: File;
  fileType: 'curriculum' | 'template' | 'resource';
  title: string;
  description?: string;
  gradeLevel?: string;
  subject?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Check if current user is admin
 */
export const checkIsAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin' || profile?.role === 'super_admin';
};

/**
 * Upload a file (PDF/DOC) to Supabase Storage and create database record
 */
export const uploadResourceFile = async ({
  file,
  fileType,
  title,
  description = '',
  gradeLevel = '',
  subject = '',
  tags = [],
  isPublic = false,
}: UploadFileParams): Promise<ResourceFile> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify admin role
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  // Validate file type
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'doc', 'docx', 'csv', 'xlsx', 'xls'].includes(fileExt || '')) {
    throw new Error('Invalid file format. Only PDF, DOC, DOCX, CSV, and Excel files are allowed.');
  }

  // Determine storage bucket based on file type
  const bucketName = `${fileType}-files`;
  
  // Create unique file path
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  // Create database record using admin client
  console.log('Attempting to insert resource_files record with data:', {
    user_id: user.id,
    file_name: file.name,
    file_path: publicUrl,
    file_type: fileType,
    file_format: fileExt,
    file_size: file.size,
    title,
    description,
    grade_level: gradeLevel,
    subject,
    tags,
    is_public: isPublic,
  });

  // Use raw SQL insert to completely bypass RLS
  const { data, error } = await supabase.rpc('admin_insert_resource_file', {
    p_user_id: user.id,
    p_file_name: file.name,
    p_file_path: publicUrl,
    p_file_type: fileType,
    p_file_format: fileExt,
    p_file_size: file.size,
    p_title: title,
    p_description: description || '',
    p_grade_level: gradeLevel || '',
    p_subject: subject || '',
    p_tags: tags,
    p_is_public: isPublic,
  });

  if (error) {
    console.error('Supabase insert error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // Delete uploaded file if database insert fails
    await supabase.storage.from(bucketName).remove([filePath]);
    throw new Error(`Database error: ${error.message} (Code: ${error.code}, Details: ${error.details})`);
  }

  // Fetch the created resource file record
  const { data: resourceFile, error: fetchError } = await supabase
    .from('resource_files')
    .select('*')
    .eq('id', data)
    .single();

  if (fetchError || !resourceFile) {
    throw new Error('Failed to fetch created resource file');
  }

  return resourceFile as ResourceFile;
};

/**
 * Get all resource files (admin only)
 */
export const getAllResourceFiles = async (
  fileType?: 'curriculum' | 'template' | 'resource'
): Promise<ResourceFile[]> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  let query = supabase
    .from('resource_files')
    .select('*')
    .order('created_at', { ascending: false });

  if (fileType) {
    query = query.eq('file_type', fileType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch resource files: ${error.message}`);
  }

  return (data as unknown as ResourceFile[]) || [];
};

/**
 * Get public resource files (available to all users)
 */
export const getPublicResourceFiles = async (
  fileType?: 'curriculum' | 'template' | 'resource'
): Promise<ResourceFile[]> => {
  let query = supabase
    .from('resource_files')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (fileType) {
    query = query.eq('file_type', fileType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch public resource files: ${error.message}`);
  }

  return (data as unknown as ResourceFile[]) || [];
};

/**
 * Delete a resource file (admin only)
 */
export const deleteResourceFile = async (fileId: string): Promise<void> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  // Get file details
  const { data: file, error: fetchError } = await supabase
    .from('resource_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (fetchError || !file) {
    throw new Error('File not found');
  }

  // Extract storage path from public URL
  const bucketName = `${file.file_type}-files`;
  const urlParts = file.file_path.split(`${bucketName}/`);
  const storagePath = urlParts[1];

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([storagePath]);

  if (storageError) {
    console.error('Storage deletion error:', storageError);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('resource_files')
    .delete()
    .eq('id', fileId);

  if (deleteError) {
    throw new Error(`Failed to delete file: ${deleteError.message}`);
  }
};

/**
 * Update resource file metadata (admin only)
 */
export const updateResourceFile = async (
  fileId: string,
  updates: Partial<Pick<ResourceFile, 'title' | 'description' | 'grade_level' | 'subject' | 'tags' | 'is_public'>>
): Promise<ResourceFile> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { data, error } = await supabase
    .from('resource_files')
    .update(updates)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update file: ${error.message}`);
  }

  return data as unknown as ResourceFile;
};

/**
 * Increment download count
 */
export const incrementDownloadCount = async (fileId: string): Promise<void> => {
  // Get current count first
  const { data: current } = await supabase
    .from('resource_files')
    .select('download_count')
    .eq('id', fileId)
    .single();

  if (current) {
    const { error } = await supabase
      .from('resource_files')
      .update({ download_count: current.download_count + 1 })
      .eq('id', fileId);

    if (error) {
      console.error('Failed to increment download count:', error);
    }
  }
};

/**
 * Search resource files
 */
export const searchResourceFiles = async (
  searchTerm: string,
  filters?: {
    fileType?: 'curriculum' | 'template' | 'resource';
    gradeLevel?: string;
    subject?: string;
  }
): Promise<ResourceFile[]> => {
  let query = supabase
    .from('resource_files')
    .select('*')
    .eq('is_public', true)
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (filters?.fileType) {
    query = query.eq('file_type', filters.fileType);
  }

  if (filters?.gradeLevel) {
    query = query.eq('grade_level', filters.gradeLevel);
  }

  if (filters?.subject) {
    query = query.ilike('subject', `%${filters.subject}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return (data as unknown as ResourceFile[]) || [];
};

/**
 * Update user role to admin (super_admin only)
 */
export const promoteToAdmin = async (userId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    throw new Error('Unauthorized: Super admin access required');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to promote user: ${error.message}`);
  }
};

/**
 * Get user statistics for admin dashboard
 */
export const getUserStats = async () => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo.toISOString());

    // New users this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth.toISOString());

    // Users by role
    const { data: roleData } = await supabase
      .from('profiles')
      .select('role');

    const usersByRole: { [key: string]: number } = {};
    roleData?.forEach((profile: any) => {
      const role = profile.role || 'user';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      usersByRole,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsersThisMonth: 0,
      usersByRole: {},
    };
  }
};

/**
 * Get content statistics
 */
export const getContentStats = async () => {
  try {
    // Total lessons
    const { count: totalLessons } = await supabase
      .from('lesson_notes')
      .select('*', { count: 'exact', head: true });

    // Total templates
    const { count: totalTemplates } = await supabase
      .from('custom_templates')
      .select('*', { count: 'exact', head: true });

    // Total resources
    const { count: totalResources } = await supabase
      .from('resource_library')
      .select('*', { count: 'exact', head: true });

    // Lessons this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { count: lessonsThisMonth } = await supabase
      .from('lesson_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth.toISOString());

    return {
      totalLessons: totalLessons || 0,
      totalTemplates: totalTemplates || 0,
      totalResources: totalResources || 0,
      lessonsThisMonth: lessonsThisMonth || 0,
    };
  } catch (error) {
    console.error("Error fetching content stats:", error);
    return {
      totalLessons: 0,
      totalTemplates: 0,
      totalResources: 0,
      lessonsThisMonth: 0,
    };
  }
};

/**
 * Get AI usage statistics
 */
export const getAIUsageStats = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: logs, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const totalRequests = logs?.length || 0;
    const successfulRequests = logs?.filter((l: any) => l.success).length || 0;
    const failedRequests = totalRequests - successfulRequests;
    
    const totalTokensUsed = logs?.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0) || 0;
    const estimatedCost = logs?.reduce((sum: number, log: any) => sum + (parseFloat(log.cost_estimate as any) || 0), 0) || 0;

    // Group by request type
    const requestsByType: { [key: string]: number } = {};
    logs?.forEach((log: any) => {
      requestsByType[log.request_type] = (requestsByType[log.request_type] || 0) + 1;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokensUsed,
      estimatedCost,
      requestsByType,
    };
  } catch (error) {
    console.error("Error fetching AI usage stats:", error);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
      requestsByType: {},
    };
  }
};

/**
 * Log AI usage
 */
export const logAIUsage = async (
  requestType: string,
  model: string,
  tokensUsed: number,
  success: boolean,
  errorMessage?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.rpc('log_ai_usage', {
      p_user_id: user?.id || null,
      p_request_type: requestType,
      p_model: model,
      p_tokens_used: tokensUsed,
      p_success: success,
      p_error_message: errorMessage || null,
    });
  } catch (error) {
    console.error("Error logging AI usage:", error);
  }
};

export interface UserLessonCount {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  lessonCount: number;
  isSuspended: boolean;
  isPaymentExempt: boolean;
}

/**
 * Toggle user suspension status
 */
export const toggleUserSuspension = async (userId: string, isSuspended: boolean): Promise<void> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_suspended: isSuspended } as any)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user suspension: ${error.message}`);
  }
};

/**
 * Toggle user payment exemption status
 */
export const togglePaymentExemption = async (userId: string, isExempt: boolean): Promise<void> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_payment_exempt: isExempt } as any)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update payment exemption: ${error.message}`);
  }
};

/**
 * Get system setting
 */
export const getSystemSetting = async (key: string): Promise<any> => {
  const { data, error } = await (supabase
    .from('system_settings' as any) as any)
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    // Return default values if not found or error
    if (key === 'allow_signups') return true;
    return null;
  }

  return (data as any).value;
};

/**
 * Update system setting (admin only)
 */
export const updateSystemSetting = async (key: string, value: any): Promise<void> => {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  const { error } = await (supabase
    .from('system_settings' as any) as any)
    .upsert({ 
      key, 
      value,
      updated_by: (await supabase.auth.getUser()).data.user?.id 
    } as any);

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`);
  }
};

/**
 * Get all users with their lesson generation counts
 */
export const getAllUserLessonCounts = async (): Promise<UserLessonCount[]> => {
  try {
    // Fetch profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profileError) throw profileError;

    // Use the pre-calculated count from the profile itself
    // This assumes specific DB trigger logic is protecting 'lessons_generated' integrity
    return profiles.map((p: any) => ({
      userId: p.id,
      email: p.email || 'N/A', 
      fullName: p.full_name || 'Unknown',
      role: p.role || 'user',
      lessonCount: p.lessons_generated || 0, // Use the DB column directly
      isSuspended: p.is_suspended || false,
      isPaymentExempt: p.is_payment_exempt || false,
    })).sort((a, b) => b.lessonCount - a.lessonCount);

  } catch (error) {
    console.error("Error fetching user lesson counts:", error);
    return [];
  }
};
