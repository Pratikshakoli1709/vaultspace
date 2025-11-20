-- RLS Policies for allowing anyone to move files (drag and drop)
-- Run this in your Supabase SQL editor

-- DROP ALL EXISTING UPDATE POLICIES
DROP POLICY IF EXISTS "Users can update their own data items" ON public.data_items;
DROP POLICY IF EXISTS "Users can update their own data items." ON public.data_items;
DROP POLICY IF EXISTS "Users can move files to folders" ON public.data_items;
DROP POLICY IF EXISTS "Anyone can move files to folders" ON public.data_items;
DROP POLICY IF EXISTS "Admins can do anything." ON public.data_items;

-- Create a policy that allows ANY authenticated user to update folder_id (for drag and drop)
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

