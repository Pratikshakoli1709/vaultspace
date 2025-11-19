-- Add folder_id column to data_items table
-- Run this in Supabase SQL Editor

-- First, ensure folders table exists (if not already created)
-- If you already have a folders table, skip this section
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

-- Enable RLS on folders table
alter table public.folders enable row level security;

-- RLS Policies for folders (users can see their own folders and admins see all)
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

-- Add folder_id column to data_items table
alter table public.data_items 
add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- Create index for faster folder queries
create index if not exists idx_data_items_folder_id on public.data_items(folder_id);

-- Update RLS policy to allow users to update folder_id for their own files
-- (This should already be covered by existing policies, but we ensure it works)
-- The existing "Users can update their own data items" policy should cover this
