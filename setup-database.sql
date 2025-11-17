-- VaultSpace Database Setup Script
-- Run this script in your Supabase SQL editor to set up the database tables

-- First, drop existing tables if they exist (be careful with this in production!)
-- drop table if exists public.notifications cascade;
-- drop table if exists public.activity_logs cascade;
-- drop table if exists public.data_items cascade;
-- drop table if exists public.profiles cascade;
-- drop function if exists public.handle_new_user() cascade;

-- Create custom types
create type public.user_role as enum ('admin', 'user');
create type public.data_item_type as enum ('document', 'link', 'key', 'image');
create type public.activity_log_action as enum ('UPLOADED', 'EDITED', 'VIEWED', 'COPIED', 'DELETED', 'BROADCAST');
create type public.notification_type as enum ('broadcast', 'personal');

-- USERS
-- Create a table for public profiles
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role user_role default 'user'::public.user_role,
  created_at timestamptz default now(),

  primary key (id)
);

-- Set up Row Level Security (RLS)
alter table public.profiles
  enable row level security;

create policy "Public profiles are viewable by authenticated users." on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- DATA ITEMS
create table public.data_items (
    id uuid not null default gen_random_uuid(),
    title text not null,
    type data_item_type not null,
    file_url text,
    link_url text,
    text_content text,
    created_by uuid not null references public.profiles(id) on delete cascade,
    updated_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    primary key (id)
);

alter table public.data_items enable row level security;
create policy "Data items are viewable by everyone." on public.data_items for select using (true);
create policy "Users can insert their own data items." on public.data_items for insert with check (auth.uid() = created_by);
create policy "Users can update their own data items." on public.data_items for update using (auth.uid() = created_by);
create policy "Users can delete their own data items." on public.data_items for delete using (auth.uid() = created_by);
create policy "Admins can do anything." on public.data_items for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
);


-- ACTIVITY LOGS
create table public.activity_logs (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    item_id uuid references public.data_items(id) on delete set null,
    action activity_log_action not null,
    item_title text,
    timestamp timestamptz not null default now(),

    primary key (id)
);

alter table public.activity_logs enable row level security;
create policy "Activity logs are viewable by everyone." on public.activity_logs for select using (true);
create policy "Users can insert their own activity." on public.activity_logs for insert with check (auth.uid() = user_id);
create policy "Admins can see all logs." on public.activity_logs for select using ((select role from public.profiles where id = auth.uid()) = 'admin');


-- NOTIFICATIONS
create table public.notifications (
    id uuid not null default gen_random_uuid(),
    sender_id uuid references public.profiles(id),
    receiver_id uuid references public.profiles(id),
    message text not null,
    type notification_type not null,
    is_read boolean default false,
    timestamp timestamptz not null default now(),

    primary key (id)
);

alter table public.notifications enable row level security;
create policy "All users can see broadcast notifications." on public.notifications for select using (type = 'broadcast');
create policy "Users can see their own notifications." on public.notifications for select using (auth.uid() = receiver_id);
create policy "Users can insert notifications." on public.notifications for insert with check (true);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- Insert sample data for testing (uncomment to use)
-- Sample admin user (you'll need to replace the UUID with an actual auth user ID)
-- insert into public.profiles (id, full_name, email, role) 
-- values ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@example.com', 'admin');

-- Sample regular user (you'll need to replace the UUID with an actual auth user ID)
-- insert into public.profiles (id, full_name, email, role) 
-- values ('00000000-0000-0000-0000-000000000002', 'Regular User', 'user@example.com', 'user');