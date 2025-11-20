-- Test script to verify folder_id column and RLS policies
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if folder_id column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'data_items' 
  AND column_name = 'folder_id';

-- 2. Check current RLS policies on data_items
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'data_items'
ORDER BY policyname;

-- 3. Check if you can see files with folder_id
SELECT 
  id,
  title,
  type,
  folder_id,
  created_by,
  updated_at
FROM data_items
WHERE folder_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Test update permission (replace with your user ID and a test file ID)
-- Uncomment and replace the IDs to test:
-- UPDATE data_items 
-- SET folder_id = '00000000-0000-0000-0000-000000000000'  -- Replace with actual folder ID
-- WHERE id = '00000000-0000-0000-0000-000000000000'  -- Replace with actual file ID
-- RETURNING id, title, folder_id;

