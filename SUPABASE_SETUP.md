# Supabase Setup Guide

## Complete Implementation Overview

Your LessonAI app now has full Supabase integration with:

✅ **User Authentication** - Login/Signup with Supabase Auth
✅ **Database Storage** - Templates and lesson notes in PostgreSQL
✅ **User Dashboard** - View saved lessons, favorites, and stats
✅ **Template Management** - Store custom templates in database
✅ **Lesson History** - All generated lessons auto-saved
✅ **Favorites System** - Mark templates and lessons as favorites

## Quick Setup (3 Steps)

### Step 1: Run Database Migrations

You need to execute the SQL migrations in your Supabase project:

1. Go to https://supabase.com/dashboard
2. Select your project: **uihhwjloceffyksuscmg**
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
6. Click "Run" or press Ctrl+Enter
7. Repeat for `supabase/migrations/002_seed_templates.sql`

**OR** use the Supabase CLI (if installed):

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref uihhwjloceffyksuscmg

# Run migrations
supabase db push
```

### Step 2: Add Helper Function

Run this in SQL Editor to increment lesson counts:

```sql
create or replace function increment_lessons_count(user_id uuid)
returns void as $$
begin
  update public.profiles
  set lessons_generated = lessons_generated + 1
  where id = user_id;
end;
$$ language plpgsql security definer;
```

### Step 3: Restart Your App

```bash
npm run dev
```

## What's New

### 🔐 Authentication Pages

- **`/login`** - User login
- **`/signup`** - New user registration  
- **`/dashboard`** - User dashboard (protected)

### 📊 Dashboard Features

- **My Lessons** - View all generated lesson notes
- **Favorites** - Quick access to favorite lessons
- **Stats** - Total lessons, favorites count, subscription tier
- **Download** - Download any previous lesson
- **Create New** - Quick access to generator

### 💾 Auto-Save System

Every generated lesson note is automatically saved to the database including:
- All lesson details (subject, grade, curriculum, etc.)
- Complete AI-generated content
- Template used
- Timestamp
- User association

### 📝 Template System

**6 Pre-Built Templates** (from database):
1. Standard Lesson Plan
2. 5E Instructional Model
3. Madeline Hunter Model
4. Gradual Release (I Do, We Do, You Do)
5. Inquiry-Based Learning
6. Understanding by Design (UbD)

**Custom Templates**:
- Users can create and save their own templates
- Templates can be private or shared publicly
- Template usage is tracked

### 🗄️ Database Schema

**Tables Created:**

1. **profiles** - User information
   - Extends Supabase auth.users
   - Tracks lesson count, subscription tier
   
2. **templates** - Lesson note templates
   - System templates (pre-built)
   - User-created custom templates
   - Public/private visibility

3. **lesson_notes** - Generated lessons
   - Full lesson details
   - AI-generated content
   - Favorite marking
   
4. **template_favorites** - Template favorites
   - User-template relationships

## Usage Flow

### For New Users:

1. Visit `/signup` and create account
2. Redirected to `/dashboard`
3. Click "New Lesson Note"
4. Select template → Fill details → Generate
5. Lesson auto-saved to database
6. View/download from dashboard anytime

### For Returning Users:

1. Visit `/login`
2. Go to `/dashboard`
3. See all previous lessons
4. Mark favorites
5. Download any lesson
6. Create new lessons

## Security (Row Level Security)

All tables have RLS policies:
- ✅ Users can only see/edit their own data
- ✅ Public templates visible to all
- ✅ System templates protected
- ✅ Auth required for all operations

## API Endpoints (via Supabase Client)

### Authentication
```typescript
// Sign up
await supabase.auth.signUp({ email, password })

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### Lesson Notes
```typescript
// Save lesson
await LessonNotesService.saveLessonNote(userId, lessonData, content, templateId)

// Get user's lessons
await LessonNotesService.getUserLessonNotes(userId)

// Toggle favorite
await LessonNotesService.toggleFavorite(id, currentStatus)
```

### Templates
```typescript
// Get all templates
await TemplateService.getAllTemplates()

// Get user's custom templates
await TemplateService.getUserTemplates(userId)

// Create custom template
await TemplateService.addCustomTemplate(template, userId)
```

## Files Added/Modified

### New Files:
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `supabase/migrations/002_seed_templates.sql` - System templates
- `src/pages/Login.tsx` - Login page
- `src/pages/Signup.tsx` - Signup page
- `src/pages/Dashboard.tsx` - User dashboard
- `src/services/lessonNotesService.ts` - Lesson notes management

### Modified Files:
- `src/services/templateService.ts` - Now uses Supabase
- `src/App.tsx` - Added new routes
- `src/pages/Generator.tsx` - Saves to database (when user logged in)

## Troubleshooting

### Error: "relation does not exist"
→ You haven't run the migrations yet. Run them in Supabase SQL Editor.

### Error: "RLS policy violated"
→ User not authenticated. Redirect to `/login`.

### Templates not showing
→ Run the seed migration (`002_seed_templates.sql`).

### TypeScript errors
→ After running migrations, TypeScript types will auto-generate.

## Next Steps

1. **Run the migrations** in Supabase (see Step 1 above)
2. **Create a test account** at `/signup`
3. **Generate a lesson** and see it save
4. **View dashboard** to see your saved lessons
5. **Add custom templates** for your users

## Free Tier Limits

Supabase Free Tier includes:
- ✅ 500 MB database
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth
- ✅ 50 MB file storage
- ✅ Unlimited API requests

Perfect for your LessonAI app! 🚀

## Support

Having issues? Check:
1. Supabase project is active
2. Migrations have been run
3. Environment variables are set
4. User is authenticated for protected routes

Your app is now a complete SaaS platform with user accounts, data persistence, and full authentication! 🎉
