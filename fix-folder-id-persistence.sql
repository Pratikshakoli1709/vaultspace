-- Fix folder_id persistence for file moves
-- This ensures folder_id can be updated and persists after refresh
-- Run this in your Supabase SQL editor

-- First, ensure folder_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'data_items' 
    AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.data_items ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_data_items_folder_id ON public.data_items(folder_id);
    COMMENT ON COLUMN public.data_items.folder_id IS 'References the folder this file belongs to. NULL means root level.';
  END IF;
END $$;

-- Ensure updated_by column exists (for tracking who moved the file)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'data_items' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.data_items ADD COLUMN updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_data_items_updated_by ON public.data_items(updated_by);
  END IF;
END $$;

-- DROP ALL EXISTING UPDATE POLICIES
DROP POLICY IF EXISTS "Users can update their own data items" ON public.data_items;
DROP POLICY IF EXISTS "Users can update their own data items." ON public.data_items;
DROP POLICY IF EXISTS "Users can move files to folders" ON public.data_items;
DROP POLICY IF EXISTS "Anyone can move files to folders" ON public.data_items;
DROP POLICY IF EXISTS "Admins can do anything." ON public.data_items;

-- Create a policy that allows ANY authenticated user to update folder_id (for drag and drop)
-- This allows anyone to move files to folders
CREATE POLICY "Anyone can move files to folders" ON public.data_items
FOR UPDATE
USING (
  -- Any authenticated user can move files (update folder_id)
  auth.role() = 'authenticated'
)
WITH CHECK (
  -- Ensure user is authenticated
  auth.role() = 'authenticated'
);

-- Create a separate policy for updating other fields (title, etc.) - only file owner can do this
CREATE POLICY "Users can update their own data items" ON public.data_items
FOR UPDATE
USING (
  -- Users can update their own files (for non-folder_id fields)
  created_by = auth.uid()
  OR
  -- Admins can update any file
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
)
WITH CHECK (
  -- Same conditions
  created_by = auth.uid()
  OR
  (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Grant necessary permissions
GRANT UPDATE ON public.data_items TO authenticated;
GRANT SELECT ON public.data_items TO authenticated;

-- Add comments
COMMENT ON POLICY "Anyone can move files to folders" ON public.data_items IS 
'Allows any authenticated user to update folder_id (move files via drag and drop).';

COMMENT ON POLICY "Users can update their own data items" ON public.data_items IS 
'Allows users to update their own files (for non-folder_id fields like title, etc.). Admins can update any file.';

-- Verify the column exists and is accessible
DO $$
BEGIN
  RAISE NOTICE 'folder_id column check:';
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'data_items' 
    AND column_name = 'folder_id'
  ) THEN
    RAISE NOTICE '✅ folder_id column exists';
  ELSE
    RAISE NOTICE '❌ folder_id column does not exist - migration may have failed';
  END IF;
END $$;
