# Admin Portal Setup Guide

## Overview
The Admin Portal allows administrators to upload and manage educational resources (PDFs and DOC files) including curriculum documents, lesson plan templates, and other teaching resources.

## Features
- 🔐 **Role-Based Access Control** - Admin, Super Admin roles
- 📁 **File Upload** - PDF, DOC, DOCX file support
- 📚 **Three Resource Types**:
  - Curriculum Files
  - Template Files  
  - Resource Files
- 🔍 **File Management** - Upload, view, download, delete files
- 🌐 **Public/Private Toggle** - Control file visibility
- 🏷️ **Metadata Support** - Title, description, grade level, subject, tags
- 📊 **Download Tracking** - Monitor file usage

## Database Setup

### 1. Run Complete Setup SQL
Navigate to your Supabase Dashboard → SQL Editor and run the `complete-setup.sql` file. This creates:
- `profiles` table with `role` column (user, admin, super_admin)
- `resource_files` table for file metadata
- Row Level Security policies for admin access

### 2. Create Storage Buckets
Go to Supabase Dashboard → Storage → Create New Bucket

Create three buckets with these exact names:
1. **curriculum-files**
2. **template-files**
3. **resource-files**

For each bucket:
- Set to **Public** if you want files accessible without authentication
- Or keep **Private** for authenticated access only

### 3. Set Bucket Policies (Optional)
If using private buckets, add these policies in Storage settings:

```sql
-- Allow admins to upload files
create policy "Admins can upload files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'curriculum-files' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  )
);

-- Allow admins to delete files
create policy "Admins can delete files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'curriculum-files' AND
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  )
);

-- Repeat for template-files and resource-files buckets
```

## User Roles

### User (Default)
- Can view public resources
- Can generate lesson notes
- Cannot access admin portal

### Admin
- Full access to admin portal
- Can upload/manage all resource types
- Can make files public or private
- Can delete any resource

### Super Admin
- All admin permissions
- Can promote users to admin role
- Manage system-wide settings

## Creating Admin Users

### Method 1: Manual Database Update
1. Sign up a regular user account
2. Go to Supabase Dashboard → Table Editor → profiles
3. Find the user's row
4. Update the `role` column to `'admin'` or `'super_admin'`

### Method 2: Using SQL
```sql
-- Update existing user to admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';

-- Update to super admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'superadmin@example.com';
```

### Method 3: Programmatically (Super Admin Only)
Use the `promoteToAdmin` function in `adminService.ts`:

```typescript
import { promoteToAdmin } from '@/services/adminService';

// Must be called by a super_admin user
await promoteToAdmin('user-uuid-here');
```

## Accessing the Admin Portal

### Admin Login
1. Navigate to `/admin` or click "Admin Portal" in the footer
2. Sign in with admin credentials
3. System verifies admin role
4. Redirects to admin dashboard

### Admin Dashboard Routes
- `/admin` - Admin login page
- `/admin/dashboard` - Main admin dashboard

## Using the Admin Dashboard

### Upload Files

1. **Select File Type Tab**
   - Curriculum Files
   - Template Files
   - Resource Files

2. **Fill in File Details**
   - **File**: Select PDF, DOC, or DOCX file
   - **Title**: Required, descriptive name
   - **Grade Level**: Optional, select 1-12
   - **Subject**: Optional, e.g., Mathematics, Science
   - **Tags**: Optional, comma-separated keywords
   - **Description**: Optional, brief explanation
   - **Public Toggle**: Enable for public access

3. **Click Upload**
   - File uploads to Supabase Storage
   - Metadata saved to database
   - Appears in file list immediately

### Manage Files

Each file in the list shows:
- Title and description
- Public/Private badge
- File format (PDF, DOC, DOCX)
- Grade level and subject
- File size and download count
- Upload date
- Tags

**Actions:**
- 🔽 **Download** - View/download file
- ✏️ **Edit** - Toggle public/private status
- 🗑️ **Delete** - Remove file (confirms first)

## File Size Limits

Supabase default limits:
- Free tier: 50MB per file
- Pro tier: 5GB per file

Update limits in Supabase Dashboard → Storage → Settings

## Security Features

### Authentication
- Only users with `role = 'admin'` or `role = 'super_admin'` can access
- Non-admin users are redirected on login attempt
- Session-based authentication via Supabase Auth

### Authorization
- Row Level Security policies enforce admin-only access
- Storage policies restrict uploads to admins
- Client-side role checks in `checkIsAdmin()` function

### File Validation
- Only PDF, DOC, DOCX files accepted
- File type verified before upload
- Sanitized filenames prevent path traversal

## TypeScript Errors

You may see TypeScript errors for database tables before running migrations:
```
Property 'resource_files' does not exist...
```

These errors will resolve automatically after:
1. Running `complete-setup.sql` in Supabase
2. Restarting the dev server (`npm run dev`)
3. Supabase auto-generates TypeScript types

## Troubleshooting

### "Unauthorized: Admin access required"
**Solution**: Verify user role in profiles table is set to 'admin' or 'super_admin'

### "Bucket does not exist"
**Solution**: Create storage buckets in Supabase Dashboard → Storage

### "Failed to upload file"
**Solution**: 
- Check bucket permissions
- Verify bucket name matches exactly (curriculum-files, template-files, resource-files)
- Check file size limits

### Files not appearing
**Solution**:
- Refresh page
- Check browser console for errors
- Verify RLS policies are correctly set

### Cannot delete files
**Solution**:
- Ensure storage policies allow deletion
- Check if file path is correct in database

## Best Practices

1. **Organize by Grade/Subject** - Use metadata fields consistently
2. **Descriptive Titles** - Make files easily searchable
3. **Add Tags** - Improve discoverability
4. **Use Public Wisely** - Only make appropriate content public
5. **Regular Cleanup** - Delete outdated or duplicate files
6. **Monitor Downloads** - Track popular resources

## API Reference

### Admin Service Functions

```typescript
// Check if current user is admin
checkIsAdmin(): Promise<boolean>

// Upload a resource file
uploadResourceFile({
  file: File,
  fileType: 'curriculum' | 'template' | 'resource',
  title: string,
  description?: string,
  gradeLevel?: string,
  subject?: string,
  tags?: string[],
  isPublic?: boolean
}): Promise<ResourceFile>

// Get all files (admin only)
getAllResourceFiles(fileType?: string): Promise<ResourceFile[]>

// Get public files (anyone)
getPublicResourceFiles(fileType?: string): Promise<ResourceFile[]>

// Delete a file (admin only)
deleteResourceFile(fileId: string): Promise<void>

// Update file metadata (admin only)
updateResourceFile(fileId: string, updates: Partial<ResourceFile>): Promise<ResourceFile>

// Search files
searchResourceFiles(searchTerm: string, filters?: object): Promise<ResourceFile[]>

// Promote user to admin (super admin only)
promoteToAdmin(userId: string): Promise<void>
```

## Next Steps

1. ✅ Run `complete-setup.sql` in Supabase SQL Editor
2. ✅ Create storage buckets (curriculum-files, template-files, resource-files)
3. ✅ Promote your first admin user
4. ✅ Log in to `/admin` portal
5. ✅ Upload your first resource files
6. 🎉 Start managing educational resources!

## Support

For issues or questions:
- Check Supabase Dashboard logs
- Review browser console errors
- Verify database migrations completed
- Ensure storage buckets exist
