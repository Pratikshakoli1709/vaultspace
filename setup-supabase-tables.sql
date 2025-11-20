-- ============================================================
-- COMPLETE SUPABASE SETUP FOR FILES & FOLDERS SYSTEM
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CREATE FOLDERS TABLE
-- ============================================================
create table if not exists public.folders (
    id uuid not null default gen_random_uuid(),
    name text not null,
    parent_id uuid references public.folders(id) on delete cascade,
    owner_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    is_starred boolean default false,
    primary key (id)
);

-- Create index for faster folder queries
create index if not exists idx_folders_owner_id on public.folders(owner_id);
create index if not exists idx_folders_parent_id on public.folders(parent_id);
create index if not exists idx_folders_is_starred on public.folders(is_starred);

-- Enable RLS on folders table
alter table public.folders enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view their own folders" on public.folders;
drop policy if exists "Users can create their own folders" on public.folders;
drop policy if exists "Users can update their own folders" on public.folders;
drop policy if exists "Users can delete their own folders" on public.folders;

-- RLS Policies for folders
create policy "Users can view their own folders" 
    on public.folders for select 
    using (owner_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can create their own folders" 
    on public.folders for insert 
    with check (owner_id = auth.uid());

create policy "Users can update their own folders" 
    on public.folders for update 
    using (owner_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can delete their own folders" 
    on public.folders for delete 
    using (owner_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

-- ============================================================
-- 2. ADD FOLDER_ID COLUMN TO DATA_ITEMS (if not exists)
-- ============================================================
alter table public.data_items 
add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- Create index for faster folder queries
create index if not exists idx_data_items_folder_id on public.data_items(folder_id);

-- ============================================================
-- 3. CREATE STARRED_ITEMS TABLE
-- ============================================================
create table if not exists public.starred_items (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id uuid not null, -- Can be file (data_items.id) or folder (folders.id)
    item_type text not null check (item_type in ('file', 'folder')),
    created_at timestamptz not null default now(),
    
    primary key (id),
    unique (user_id, item_id, item_type)
);

-- Create indexes for faster queries
create index if not exists idx_starred_items_user_id on public.starred_items(user_id);
create index if not exists idx_starred_items_item_id on public.starred_items(item_id);
create index if not exists idx_starred_items_item_type on public.starred_items(item_type);

-- Enable RLS
alter table public.starred_items enable row level security;

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can view their own starred items" on public.starred_items;
drop policy if exists "Users can create their own starred items" on public.starred_items;
drop policy if exists "Users can delete their own starred items" on public.starred_items;

-- RLS Policies
create policy "Users can view their own starred items" 
    on public.starred_items for select 
    using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Users can create their own starred items" 
    on public.starred_items for insert 
    with check (user_id = auth.uid());

create policy "Users can delete their own starred items" 
    on public.starred_items for delete 
    using (user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');

-- ============================================================
-- 4. ADD IS_STARRED COLUMN TO DATA_ITEMS (optional, for backward compatibility)
-- Note: The code now uses starred_items table, but this column can exist for compatibility
-- ============================================================
alter table public.data_items 
add column if not exists is_starred boolean default false;

-- Create index
create index if not exists idx_data_items_is_starred on public.data_items(is_starred);

-- ============================================================
-- VERIFICATION QUERIES (optional - run these to verify setup)
-- ============================================================

-- Check if folders table exists and has correct structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'folders';

-- Check if starred_items table exists
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'starred_items';

-- Check if folder_id column exists in data_items
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'data_items' AND column_name = 'folder_id';

-- ============================================================
-- DONE! Your Supabase database is now set up for Files & Folders
-- ============================================================

