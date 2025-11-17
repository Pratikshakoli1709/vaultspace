-- ============================================================================
-- VaultSpace Supabase Setup
-- ============================================================================
-- Execute the following blocks sequentially in the Supabase SQL Editor.
-- Each block is idempotent and safe to re-run.
-- ============================================================================

/*-----------------------------------------------------------------------------
 Block 1: Core Profiles and Role Function
-----------------------------------------------------------------------------*/
begin;

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
  ) then
    create type public.user_role as enum ('admin', 'user');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.touch_profiles_updated_at();

create or replace function public.is_admin(target_user uuid)
returns boolean
language sql
stable
security definer set search_path = public as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = target_user
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'user',
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;

/*-----------------------------------------------------------------------------
 Block 2: Data, Logs, and Notifications Tables
-----------------------------------------------------------------------------*/
begin;

create table if not exists public.data_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  item_type text not null check (item_type in ('secret', 'document', 'link', 'credential')),
  secret_value text,
  file_path text,
  tags text[] default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_items_owner_idx on public.data_items (owner_id);
create index if not exists data_items_type_idx on public.data_items (item_type);

create or replace function public.touch_data_items_updated_at()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists data_items_set_updated_at on public.data_items;
create trigger data_items_set_updated_at
before update on public.data_items
for each row
execute function public.touch_data_items_updated_at();

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  data_item_id uuid references public.data_items(id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'deleted', 'viewed', 'copied', 'downloaded')),
  ip_address inet,
  user_agent text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_actor_idx on public.activity_logs (actor_id);
create index if not exists activity_logs_item_idx on public.activity_logs (data_item_id);
create index if not exists activity_logs_action_idx on public.activity_logs (action);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  data_item_id uuid references public.data_items(id) on delete cascade,
  notification_type text not null check (notification_type in ('key_rotation', 'new_activity', 'admin_broadcast')),
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id);
create index if not exists notifications_type_idx on public.notifications (notification_type);

commit;

/*-----------------------------------------------------------------------------
 Block 3: Row-Level Security (RLS) Policies
-----------------------------------------------------------------------------*/
begin;

alter table public.profiles enable row level security;
alter table public.data_items enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Profiles are viewable by owner or admins" on public.profiles;
create policy "Profiles are viewable by owner or admins"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

drop policy if exists "Profiles are updatable by owner or admins" on public.profiles;
create policy "Profiles are updatable by owner or admins"
on public.profiles
for update
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

drop policy if exists "Data items accessible to owners and admins" on public.data_items;
create policy "Data items accessible to owners and admins"
on public.data_items
for select
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Data items insert restricted to self or admins" on public.data_items;
create policy "Data items insert restricted to self or admins"
on public.data_items
for insert
with check (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Data items update restricted to owner or admins" on public.data_items;
create policy "Data items update restricted to owner or admins"
on public.data_items
for update
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Data items delete restricted to owner or admins" on public.data_items;
create policy "Data items delete restricted to owner or admins"
on public.data_items
for delete
using (
  owner_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Activity logs viewable by related users or admins" on public.activity_logs;
create policy "Activity logs viewable by related users or admins"
on public.activity_logs
for select
using (
  public.is_admin(auth.uid())
  or actor_id = auth.uid()
  or exists (
    select 1
    from public.data_items di
    where di.id = public.activity_logs.data_item_id
      and di.owner_id = auth.uid()
  )
);

drop policy if exists "Activity logs insertable by actor" on public.activity_logs;
create policy "Activity logs insertable by actor"
on public.activity_logs
for insert
with check (
  actor_id = auth.uid()
);

drop policy if exists "Notifications viewable by recipient or admins" on public.notifications;
create policy "Notifications viewable by recipient or admins"
on public.notifications
for select
using (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists "Notifications insertable by admins" on public.notifications;
create policy "Notifications insertable by admins"
on public.notifications
for insert
with check (
  public.is_admin(auth.uid())
);

drop policy if exists "Notifications updatable by recipient or admins" on public.notifications;
create policy "Notifications updatable by recipient or admins"
on public.notifications
for update
using (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
)
with check (
  recipient_id = auth.uid()
  or public.is_admin(auth.uid())
);

alter publication supabase_realtime add table public.data_items;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.notifications;

commit;

