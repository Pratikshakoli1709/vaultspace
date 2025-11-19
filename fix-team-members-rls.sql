-- Fix infinite recursion in team_members RLS policies
-- Run this in Supabase SQL editor

-- Drop the problematic policy
drop policy if exists "Team members are viewable by team members and admins." on public.team_members;
drop policy if exists "Team members are viewable by authenticated users." on public.team_members;

-- Solution 1: Simple - Allow all authenticated users to see team members
-- (Team membership info is not highly sensitive and needed for collaboration)
create policy "Team members are viewable by authenticated users." 
    on public.team_members for select 
    using (auth.role() = 'authenticated');

-- Solution 2: More restrictive (uncomment if you prefer this)
-- Only allow users to see their own memberships and admins to see everything
-- create policy "Team members are viewable by users and admins." 
--     on public.team_members for select 
--     using (
--         user_id = auth.uid() or
--         (select role from public.profiles where id = auth.uid()) = 'admin'
--     );

