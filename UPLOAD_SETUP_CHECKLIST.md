# Upload Setup Checklist

You already have all the admin code! Now complete these 3 quick setup steps:

## ✅ Step 1: Run Database SQL (2 minutes)

1. Open: https://supabase.com/dashboard/project/uihhwjloceffyksuscmg/sql/new
2. Copy **ALL** content from `supabase/complete-setup.sql` (421 lines)
3. Paste into SQL Editor
4. Click **"Run"**
5. You should see: "Success. No rows returned"

This creates:
- `role` column in profiles table
- `resource_files` table for your uploads
- Admin access policies

---

## ✅ Step 2: Create Storage Buckets (1 minute)

1. Open: https://supabase.com/dashboard/project/uihhwjloceffyksuscmg/storage/buckets
2. Click **"New bucket"** (3 times)

**Bucket 1:**
- Name: `curriculum-files`
- Public bucket: ✅ YES
- Click "Create bucket"

**Bucket 2:**
- Name: `template-files`
- Public bucket: ✅ YES
- Click "Create bucket"

**Bucket 3:**
- Name: `resource-files`
- Public bucket: ✅ YES
- Click "Create bucket"

---

## ✅ Step 3: Make Yourself Admin (30 seconds)

1. Open: https://supabase.com/dashboard/project/uihhwjloceffyksuscmg/sql/new
2. Paste this SQL (replace with YOUR email):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your_email@example.com';
```

3. Click **"Run"**
4. You should see: "Success. 1 row updated"

---

## 🎉 Step 4: Upload Your Files!

1. Go to: http://localhost:8080/admin-login
2. Login with your account credentials
3. You'll see the Admin Dashboard with 3 tabs:
   - **Curriculum Files** - Upload your Ghana curriculum PDFs
   - **Template Files** - Upload professional lesson note templates
   - **Resource Files** - Upload any other resources

4. Click **"Upload New File"** on any tab
5. Fill in:
   - Select your PDF/DOC file
   - Title
   - Description
   - Grade Level (Basic 1-10)
   - Subject
   - Tags (optional)
   - Public/Private toggle

6. Click **"Upload"**

---

## File Format Support
✅ PDF files (.pdf)
✅ Word documents (.doc, .docx)

## What Happens After Upload?
- Files are stored in Supabase Storage
- Metadata saved in database
- Files appear in the admin dashboard
- Public files can be accessed by all users
- Private files only accessible by admins

---

## Troubleshooting

**"Not authorized" error?**
- Make sure you ran Step 3 to set your role to 'admin'
- Logout and login again

**"Bucket not found" error?**
- Make sure you created all 3 storage buckets in Step 2
- Check bucket names match exactly: curriculum-files, template-files, resource-files

**Can't see uploaded files?**
- Check browser console (F12) for errors
- Verify buckets are set to "Public"
- Refresh the page
