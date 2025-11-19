-- Teams and Visibility System
-- Run this in Supabase SQL editor to add teams and visibility support

-- Create teams table
create table if not exists public.teams (
    id uuid not null default gen_random_uuid(),
    name text not null,
    created_by uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (id),
    unique (name)
);

-- Create team_members junction table
create table if not exists public.team_members (
    id uuid not null default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    is_admin boolean not null default false,
    added_by uuid not null references public.profiles(id) on delete cascade,
    added_at timestamptz not null default now(),

    primary key (id),
    unique (team_id, user_id)
);

-- Add visibility fields to data_items
alter table public.data_items 
add column if not exists visibility text default 'public' check (visibility in ('public', 'team', 'private')),
add column if not exists team_id uuid references public.teams(id) on delete set null,
add column if not exists allowed_users uuid[] default '{}';

-- Add visibility fields to folders (if you have a folders table)
-- If using a folders table, uncomment and adjust:
-- alter table public.folders
-- add column if not exists visibility text default 'public' check (visibility in ('public', 'team', 'private')),
-- add column if not exists team_id uuid references public.teams(id) on delete set null,
-- add column if not exists allowed_users uuid[] default '{}';

-- Create indexes for performance
create index if not exists idx_teams_created_by on public.teams(created_by);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_data_items_visibility on public.data_items(visibility);
create index if not exists idx_data_items_team_id on public.data_items(team_id);
create index if not exists idx_data_items_allowed_users on public.data_items using gin(allowed_users);

-- Enable RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- RLS Policies for teams
create policy "Teams are viewable by everyone." 
    on public.teams for select using (true);

create policy "Only admins can create teams." 
    on public.teams for insert 
    with check (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

create policy "Only admins can update teams." 
    on public.teams for update 
    using (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

create policy "Only admins can delete teams." 
    on public.teams for delete 
    using (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

-- RLS Policies for team_members
-- Fix: Avoid recursion - don't query team_members within the policy
-- Allow all authenticated users to see team members for collaboration
-- (Team membership info is needed for visibility checks and isn't highly sensitive)
create policy "Team members are viewable by authenticated users." 
    on public.team_members for select 
    using (auth.role() = 'authenticated');

create policy "Only admins can add team members." 
    on public.team_members for insert 
    with check (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

create policy "Only admins can update team members." 
    on public.team_members for update 
    using (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

create policy "Only admins can remove team members." 
    on public.team_members for delete 
    using (
        (select role from public.profiles where id = auth.uid()) = 'admin'
    );

