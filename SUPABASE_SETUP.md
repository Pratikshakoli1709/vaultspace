# Supabase Setup Guide

## Fix RLS Policy Error for Folders

The error "new row violates row-level security policy for table 'folders'" occurs because server-side API routes don't have the user's authentication context.

## Solution: Use Service Role Key

I've updated the code to use a server-side Supabase client with the service role key. This bypasses RLS (which is safe because we validate permissions in the API routes).

### Steps to Fix:

1. **Get your Service Role Key from Supabase:**
   - Go to your Supabase Dashboard
   - Click on "Settings" → "API"
   - Find "service_role" key (NOT the anon key - this is secret!)
   - Copy it

2. **Add to your `.env.local` file:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Run the SQL setup script:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `setup-supabase-tables.sql`
   - Click "Run"

4. **Restart your Next.js dev server:**
   ```bash
   npm run dev
   ```

## What Changed:

- Created `src/lib/supabaseServer.ts` - Server-side Supabase client
- Updated all API routes to use `supabaseServer` instead of `supabase`
- This bypasses RLS for server-side operations (safe because we validate `userId` in API routes)

## Alternative (if you don't want to use service role key):

If you prefer not to use the service role key, you can modify the RLS policy in Supabase:

```sql
-- More permissive policy (allows inserts when owner_id is provided)
drop policy if exists "Users can create their own folders" on public.folders;

create policy "Users can create their own folders" 
    on public.folders for insert 
    with check (true); -- Allow all inserts, validate in API route
```

However, using the service role key is the recommended approach for server-side API routes.

