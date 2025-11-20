-- Fix RLS policies for team documents
-- This allows team members to view documents uploaded to their teams
-- Run this in your Supabase SQL editor

-- First, ensure team_id and visibility columns exist
DO $$ 
BEGIN
  -- Add team_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'data_items' 
    AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.data_items ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_data_items_team_id ON public.data_items(team_id);
  END IF;

  -- Add visibility column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'data_items' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.data_items ADD COLUMN visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'private'));
  END IF;
END $$;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their own data items" ON public.data_items;
DROP POLICY IF EXISTS "Team members can view team documents" ON public.data_items;

-- Create a policy that allows users to view:
-- 1. Their own documents (created_by = auth.uid())
-- 2. Public documents (visibility = 'public' OR visibility IS NULL)
-- 3. Team documents where user is a team member (team_id matches user's teams)
CREATE POLICY "Users can view accessible data items" ON public.data_items
FOR SELECT
USING (
  -- User's own documents
  created_by = auth.uid()
  OR
  -- Public documents
  (visibility IS NULL OR visibility = 'public')
  OR
  -- Team documents where user is a member
  (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM public.team_members 
      WHERE team_members.team_id = data_items.team_id 
      AND team_members.user_id = auth.uid()
    )
  )
  OR
  -- Documents shared with user (if allowed_users column exists)
  (
    allowed_users IS NOT NULL 
    AND auth.uid() = ANY(allowed_users)
  )
  OR
  -- Admins can see everything
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Allow team members to insert documents with team_id set to their team
CREATE POLICY "Team members can insert team documents" ON public.data_items
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    team_id IS NULL
    OR
    EXISTS (
      SELECT 1 
      FROM public.team_members 
      WHERE team_members.team_id = data_items.team_id 
      AND team_members.user_id = auth.uid()
    )
  )
);

-- Allow team members to update team documents (if they're the creator or team admin)
CREATE POLICY "Team members can update team documents" ON public.data_items
FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.team_id = data_items.team_id 
      AND tm.user_id = auth.uid()
      AND (tm.is_admin = true OR t.created_by = auth.uid())
    )
  )
  OR
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Allow team members to delete team documents (if they're the creator or team admin)
CREATE POLICY "Team members can delete team documents" ON public.data_items
FOR DELETE
USING (
  created_by = auth.uid()
  OR
  (
    team_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.team_id = data_items.team_id 
      AND tm.user_id = auth.uid()
      AND (tm.is_admin = true OR t.created_by = auth.uid())
    )
  )
  OR
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_items TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comment
COMMENT ON POLICY "Users can view accessible data items" ON public.data_items IS 
'Allows users to view their own documents, public documents, and team documents where they are members';

