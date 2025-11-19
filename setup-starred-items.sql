-- Create starred_items table for persisting starred files
-- Run this in Supabase SQL Editor

-- Create starred_items junction table
create table if not exists public.starred_items (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id uuid not null, -- Can be file (data_items.id) or folder (folders.id)
    item_type text not null check (item_type in ('file', 'folder')),
    created_at timestamptz not null default now(),
    
    primary key (id),
    unique (user_id, item_id, item_type)
);

-- Create index for faster queries
create index if not exists idx_starred_items_user_id on public.starred_items(user_id);
create index if not exists idx_starred_items_item_id on public.starred_items(item_id);
create index if not exists idx_starred_items_item_type on public.starred_items(item_type);

-- Enable RLS
alter table public.starred_items enable row level security;

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

-- Add is_starred column to data_items if not exists (for backward compatibility)
alter table public.data_items 
add column if not exists is_starred boolean default false;

-- Add is_starred column to folders if not exists
alter table public.folders 
add column if not exists is_starred boolean default false;

-- Create indexes
create index if not exists idx_data_items_is_starred on public.data_items(is_starred);
create index if not exists idx_folders_is_starred on public.folders(is_starred);

