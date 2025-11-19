-- File Versions Table
-- Run this in Supabase SQL editor to add versioning support

-- Create file_versions table
create table if not exists public.file_versions (
    id uuid not null default gen_random_uuid(),
    file_id uuid not null references public.data_items(id) on delete cascade,
    version_number integer not null,
    uploaded_by uuid not null references public.profiles(id) on delete cascade,
    file_url text,
    storage_path text,
    size bigint,
    changelog text,
    diff text, -- for text files
    created_at timestamptz not null default now(),

    primary key (id),
    unique (file_id, version_number)
);

-- Add index for faster queries
create index if not exists idx_file_versions_file_id on public.file_versions(file_id);
create index if not exists idx_file_versions_version_number on public.file_versions(file_id, version_number desc);

-- Add current_version column to data_items
alter table public.data_items 
add column if not exists current_version integer default 1;

-- Enable RLS
alter table public.file_versions enable row level security;

-- RLS Policies
create policy "File versions are viewable by everyone." 
    on public.file_versions for select using (true);

create policy "Users can insert versions for their own files." 
    on public.file_versions for insert 
    with check (
        auth.uid() = uploaded_by and
        exists (
            select 1 from public.data_items 
            where id = file_id and created_by = auth.uid()
        )
    );

create policy "Admins can insert versions for any file." 
    on public.file_versions for insert 
    with check (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

create policy "Users can update versions for their own files." 
    on public.file_versions for update 
    using (
        exists (
            select 1 from public.data_items 
            where id = file_id and created_by = auth.uid()
        )
    );

create policy "Admins can update any version." 
    on public.file_versions for update 
    using (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

