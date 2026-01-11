# Admin Portal - Quick Start

## What's New
You now have a complete admin system for uploading curriculum PDFs, DOC files, templates, and other resources.

## Key Files Created
- `src/services/adminService.ts` - File upload/management service
- `src/pages/AdminLogin.tsx` - Dedicated admin login
- `src/pages/AdminDashboard.tsx` - Admin file management interface
- `supabase/complete-setup.sql` - Updated with `resource_files` table + admin roles
- `ADMIN_SETUP.md` - Complete setup documentation

## Database Changes
1. **profiles table**: Added `role` column (user, admin, super_admin)
2. **resource_files table**: New table for PDF/DOC metadata
3. **RLS policies**: Admin-only access controls

## Setup Steps (Required!)

### 1. Run Database Migration
```
Supabase Dashboard → SQL Editor → New Query
Paste entire contents of supabase/complete-setup.sql
Click "Run"
```

### 2. Create Storage Buckets
```
Supabase Dashboard → Storage → New Bucket

Create 3 buckets:
- curriculum-files (for curriculum PDFs/DOCs)
- template-files (for template PDFs/DOCs)  
- resource-files (for general resource PDFs/DOCs)

Set all to "Public" for easier access
```

### 3. Create Your First Admin
```sql
-- Run this in Supabase SQL Editor
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@example.com';
```

### 4. Access Admin Portal
```
Navigate to: http://localhost:8080/admin
Login with your admin credentials
Upload your first file!
```

## Admin Features

### Upload Files
- PDF, DOC, DOCX support
- Add title, description, grade level, subject
- Tag files for easy searching
- Make public or private

### Manage Files
- View all uploaded files
- Toggle public/private status
- Download files
- Delete files
- Track download counts

### Three File Types
1. **Curriculum Files** - Upload curriculum PDFs organized by grade/subject
2. **Template Files** - Upload lesson plan template documents
3. **Resource Files** - Upload any other educational resources

## Routes
- `/admin` - Admin login page
- `/admin/dashboard` - File management dashboard

## TypeScript Errors
Expected errors until you run the SQL migrations:
```
Property 'resource_files' does not exist...
Property 'role' does not exist...
```

These will auto-resolve after:
1. Running complete-setup.sql
2. Restarting dev server

## File Upload Flow
```
1. Admin logs in → checks role in database
2. Selects file type tab (Curriculum/Template/Resource)
3. Uploads PDF/DOC + fills metadata
4. File → Supabase Storage bucket
5. Metadata → resource_files table
6. File appears in list immediately
```

## Security
- Only admin/super_admin roles can access
- Non-admins redirected on login
- RLS policies enforce database access
- Storage policies control file uploads

## Next Steps
See ADMIN_SETUP.md for:
- Detailed setup instructions
- Troubleshooting guide
- API reference
- Best practices
