# Fix: Team Documents Visibility for All Team Members

## Problem
Currently, only the original uploader can see documents uploaded to a team. All team members should be able to view team documents.

## Root Cause
The issue is likely caused by Row Level Security (RLS) policies in Supabase that are blocking team members from viewing documents uploaded by other team members.

## Solution

### Step 1: Run the RLS Policy Migration

Run the SQL migration file `fix-team-documents-rls.sql` in your Supabase SQL editor. This will:

1. Add `team_id` and `visibility` columns if they don't exist
2. Create proper RLS policies that allow:
   - Team members to view all documents in their teams (not just their own)
   - Team members to insert documents with `team_id` set
   - Team members to update/delete team documents (with proper permissions)

**To run the migration:**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-team-documents-rls.sql`
4. Click "Run"

### Step 2: Verify Database Schema

Ensure these columns exist in your `data_items` table:
- `team_id` (uuid, references teams.id)
- `visibility` (text, default 'public', check: 'public', 'team', 'private')

### Step 3: Test the Fix

1. **As Pratiksha (app dev team member):**
   - Upload a document to the "app dev" team
   - Check browser console for: `✅ Asset team_id correctly set`
   - Verify the document appears in the team view

2. **As Abhi (app dev team member):**
   - Log in to the dashboard
   - Navigate to Teams → "app dev"
   - The document uploaded by Pratiksha should be visible
   - Also check the "Files & Folders" tab - team documents should appear there too

3. **Check Console Logs:**
   - Look for: `Loading team assets for team [teamId], user [userId]`
   - Look for: `Query result: X documents found`
   - Look for: `Documents found:` with list of all team documents

## How It Works

### API Route (`/api/files`)
- Fetches user's team memberships
- Queries for:
  1. Non-team files (`team_id IS NULL`)
  2. Team files where `team_id IN (user's teams)`
- Combines and returns all accessible files

### TeamsView Component
- Loads all documents where `team_id = selectedTeam.id`
- This query should return ALL team documents, regardless of `created_by`
- RLS policies ensure only team members can see team documents

### Upload Process
- When uploading to a team, `team_id` is set on the document
- `visibility` is set to `'team'`
- All team members can then view the document via RLS policies

## Troubleshooting

### If documents still don't appear:

1. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'data_items';
   ```
   Ensure the "Users can view accessible data items" policy exists and is active.

2. **Verify team_id is set:**
   ```sql
   SELECT id, title, team_id, created_by, visibility 
   FROM data_items 
   WHERE team_id IS NOT NULL;
   ```
   Check that uploaded documents have `team_id` set correctly.

3. **Check team membership:**
   ```sql
   SELECT tm.*, t.name as team_name
   FROM team_members tm
   JOIN teams t ON t.id = tm.team_id
   WHERE tm.user_id = '[userId]';
   ```
   Verify the user is actually a member of the team.

4. **Check console logs:**
   - Open browser DevTools → Console
   - Look for error messages or warnings
   - Check the query results logged by TeamsView

## Files Modified

1. `fix-team-documents-rls.sql` - SQL migration for RLS policies
2. `src/app/api/files/route.ts` - Updated to fetch team documents correctly
3. `src/components/dashboard/TeamsView.tsx` - Added better logging
4. `src/lib/asset-service.ts` - Added verification logging for team_id

## Next Steps

After running the migration:
1. Test uploading a document as one team member
2. Log in as another team member
3. Verify the document appears in both:
   - Teams tab → Team Documents
   - Files & Folders tab (main dashboard)

If issues persist, check the console logs and share the error messages.

