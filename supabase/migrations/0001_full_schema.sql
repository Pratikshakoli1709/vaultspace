-- 0001_full_schema.sql
-- One-stop setup for VaultSpace: enums, tables, RLS, storage, and seed data.

begin;

-- Required extensions --------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Enumerated types -----------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'user_role' and nsp.nspname = 'public'
  ) then
    create type public.user_role as enum ('admin', 'user');
  end if;

  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'data_item_type' and nsp.nspname = 'public'
  ) then
    create type public.data_item_type as enum ('document', 'link', 'key', 'image');
  end if;

  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'activity_log_action' and nsp.nspname = 'public'
  ) then
    create type public.activity_log_action as enum ('UPLOADED', 'EDITED', 'VIEWED', 'COPIED', 'DELETED', 'BROADCAST');
  end if;

  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'notification_type' and nsp.nspname = 'public'
  ) then
    create type public.notification_type as enum ('broadcast', 'personal');
  end if;

  if not exists (
    select 1 from pg_type typ
    join pg_namespace nsp on nsp.oid = typ.typnamespace
    where typ.typname = 'project_status' and nsp.nspname = 'public'
  ) then
    create type public.project_status as enum ('To Do', 'In Progress', 'Done');
  end if;
end;
$$;

-- Profiles + auth trigger ---------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles select authenticated'
  ) then
    drop policy "profiles select authenticated" on public.profiles;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles insert self'
  ) then
    drop policy "profiles insert self" on public.profiles;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles update self'
  ) then
    drop policy "profiles update self" on public.profiles;
  end if;
end;
$$;

create policy "profiles select authenticated"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

create policy "profiles insert self"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles update self"
  on public.profiles
  for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Projects ------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  status public.project_status not null default 'To Do',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'projects'
  loop
    execute format('drop policy %I on public.projects', policy_name);
  end loop;
end;
$$;

create policy "projects select authenticated"
  on public.projects
  for select
  to authenticated
  using (true);

create policy "projects admin manage"
  on public.projects
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Assignments ---------------------------------------------------------------
create table if not exists public.assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  primary key (project_id, user_id)
);

alter table public.assignments enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'assignments'
  loop
    execute format('drop policy %I on public.assignments', policy_name);
  end loop;
end;
$$;

create policy "assignments select own or admin"
  on public.assignments
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "assignments admin manage"
  on public.assignments
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index if not exists idx_assignments_user_id on public.assignments(user_id);
create index if not exists idx_assignments_project_id on public.assignments(project_id);

-- Data items ----------------------------------------------------------------
create table if not exists public.data_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type public.data_item_type not null,
  file_url text,
  link_url text,
  text_content text,
  storage_path text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.data_items enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'data_items'
  loop
    execute format('drop policy %I on public.data_items', policy_name);
  end loop;
end;
$$;

create policy "data_items select all"
  on public.data_items
  for select
  to authenticated
  using (true);

create policy "data_items insert own"
  on public.data_items
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "data_items update own"
  on public.data_items
  for update
  to authenticated
  using (auth.uid() = created_by);

create policy "data_items delete own"
  on public.data_items
  for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "data_items admin manage"
  on public.data_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Activity logs -------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.data_items(id) on delete set null,
  action public.activity_log_action not null,
  item_title text,
  timestamp timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'activity_logs'
  loop
    execute format('drop policy %I on public.activity_logs', policy_name);
  end loop;
end;
$$;

create policy "activity_logs select own or admin"
  on public.activity_logs
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "activity_logs insert own"
  on public.activity_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Notifications -------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  message text not null,
  type public.notification_type not null,
  is_read boolean not null default false,
  timestamp timestamptz not null default now()
);

alter table public.notifications enable row level security;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format('drop policy %I on public.notifications', policy_name);
  end loop;
end;
$$;

create policy "notifications select broadcast"
  on public.notifications
  for select
  to authenticated
  using (
    type = 'broadcast'
    or receiver_id = auth.uid()
  );

create policy "notifications insert authenticated"
  on public.notifications
  for insert
  to authenticated
  with check (true);

-- Storage bucket + policies -------------------------------------------------
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('vault', 'vault', true)
  on conflict (id) do nothing;
end;
$$;

do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'vault %'
  loop
    execute format('drop policy %I on storage.objects', policy_name);
  end loop;
end;
$$;

create policy "vault public read"
  on storage.objects
  for select
  using (bucket_id = 'vault');

create policy "vault authenticated insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'vault');

create policy "vault authenticated update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'vault');

create policy "vault authenticated delete own"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'vault' and owner = auth.uid());

-- Seed accounts -------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, encrypted_password, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'atharv@gmail.com', now(), crypt('Admin123!', gen_salt('bf')), jsonb_build_object('full_name', 'Atharv'), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'alex.j@example.com', now(), crypt('Password123!', gen_salt('bf')), jsonb_build_object('full_name', 'Alex Johnson'), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'maria.g@example.com', now(), crypt('Password123!', gen_salt('bf')), jsonb_build_object('full_name', 'Maria Garcia'), now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'chen.w@example.com', now(), crypt('Password123!', gen_salt('bf')), jsonb_build_object('full_name', 'Chen Wei'), now(), now()),
  ('55555555-5555-5555-5555-555555555555', 'sarah.m@example.com', now(), crypt('Password123!', gen_salt('bf')), jsonb_build_object('full_name', 'Sarah Miller'), now(), now())
on conflict (id) do nothing;

update public.profiles
set
  full_name = 'Atharv',
  email = 'atharv@gmail.com',
  role = 'admin',
  avatar_url = null
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set
  full_name = 'Alex Johnson',
  email = 'alex.j@example.com',
  role = 'admin',
  avatar_url = 'https://i.pravatar.cc/150?u=user-1'
where id = '22222222-2222-2222-2222-222222222222';

update public.profiles
set
  full_name = 'Maria Garcia',
  email = 'maria.g@example.com',
  role = 'user',
  avatar_url = 'https://i.pravatar.cc/150?u=user-2'
where id = '33333333-3333-3333-3333-333333333333';

update public.profiles
set
  full_name = 'Chen Wei',
  email = 'chen.w@example.com',
  role = 'user',
  avatar_url = 'https://i.pravatar.cc/150?u=user-3'
where id = '44444444-4444-4444-4444-444444444444';

update public.profiles
set
  full_name = 'Sarah Miller',
  email = 'sarah.m@example.com',
  role = 'user',
  avatar_url = 'https://i.pravatar.cc/150?u=user-4'
where id = '55555555-5555-5555-5555-555555555555';

-- Seed projects -------------------------------------------------------------
insert into public.projects (id, name, description, status, created_by, created_at, updated_at)
values
  ('aaaaaaa1-0000-4000-8000-000000000001', 'Website Redesign', 'Refresh the marketing site with new branding collateral.', 'In Progress', '11111111-1111-1111-1111-111111111111', now() - interval '45 days', now() - interval '5 days'),
  ('aaaaaaa2-0000-4000-8000-000000000002', 'Mobile App Launch', 'Deliver the partner mobile app MVP to product marketing.', 'To Do', '11111111-1111-1111-1111-111111111111', now() - interval '40 days', now() - interval '10 days'),
  ('aaaaaaa3-0000-4000-8000-000000000003', 'API Hardening', 'Audit and secure public APIs ahead of SOC2 review.', 'Done', '22222222-2222-2222-2222-222222222222', now() - interval '60 days', now() - interval '30 days')
on conflict (id) do nothing;

-- Seed assignments ----------------------------------------------------------
insert into public.assignments (project_id, user_id, assigned_at, assigned_by)
values
  ('aaaaaaa1-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333333', now() - interval '20 days', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaa1-0000-4000-8000-000000000001', '55555555-5555-5555-5555-555555555555', now() - interval '18 days', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaa2-0000-4000-8000-000000000002', '44444444-4444-4444-4444-444444444444', now() - interval '15 days', '22222222-2222-2222-2222-222222222222')
on conflict (project_id, user_id) do nothing;

-- Seed assets ---------------------------------------------------------------
insert into public.data_items (id, title, type, file_url, link_url, text_content, storage_path, created_by, updated_by, created_at, updated_at)
values
  ('bbbbbbb1-0000-4000-8000-000000000001', 'Q3 Financial Report', 'document', 'https://example.com/files/q3-report.pdf', null, null, '11111111-1111-1111-1111-111111111111/q3-report.pdf', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', now() - interval '10 days', now() - interval '5 days'),
  ('bbbbbbb2-0000-4000-8000-000000000002', 'Production API Key - OpenAI', 'key', null, null, 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx', null, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', now() - interval '12 days', now() - interval '12 days'),
  ('bbbbbbb3-0000-4000-8000-000000000003', 'New Logo Mockups', 'image', 'https://picsum.photos/seed/brand-refresh/1200/800', null, null, '33333333-3333-3333-3333-333333333333/logo-mockups.png', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', now() - interval '8 days', now() - interval '4 days'),
  ('bbbbbbb4-0000-4000-8000-000000000004', 'Project Phoenix GitHub Repo', 'link', null, 'https://github.com/example/project-phoenix', null, null, '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', now() - interval '20 days', now() - interval '9 days'),
  ('bbbbbbb5-0000-4000-8000-000000000005', 'Social Media Campaign Images', 'image', 'https://picsum.photos/seed/campaign/1200/800', null, null, '33333333-3333-3333-3333-333333333333/social-campaign.zip', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', now() - interval '6 days', now() - interval '3 days')
on conflict (id) do nothing;

-- Seed activity logs --------------------------------------------------------
insert into public.activity_logs (id, user_id, item_id, action, item_title, timestamp)
values
  ('ccccccc1-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbb1-0000-4000-8000-000000000001', 'UPLOADED', 'Q3 Financial Report', now() - interval '10 days'),
  ('ccccccc2-0000-4000-8000-000000000002', '33333333-3333-3333-3333-333333333333', 'bbbbbbb1-0000-4000-8000-000000000001', 'VIEWED', 'Q3 Financial Report', now() - interval '9 days 20 minutes'),
  ('ccccccc3-0000-4000-8000-000000000003', '22222222-2222-2222-2222-222222222222', 'bbbbbbb2-0000-4000-8000-000000000002', 'UPLOADED', 'Production API Key - OpenAI', now() - interval '12 days'),
  ('ccccccc4-0000-4000-8000-000000000004', '44444444-4444-4444-4444-444444444444', 'bbbbbbb2-0000-4000-8000-000000000002', 'COPIED', 'Production API Key - OpenAI', now() - interval '11 days 3 hours'),
  ('ccccccc5-0000-4000-8000-000000000005', '33333333-3333-3333-3333-333333333333', 'bbbbbbb3-0000-4000-8000-000000000003', 'UPLOADED', 'New Logo Mockups', now() - interval '8 days')
on conflict (id) do nothing;

-- Seed notifications --------------------------------------------------------
insert into public.notifications (id, sender_id, receiver_id, message, type, is_read, timestamp)
values
  ('ddddddd1-0000-4000-8000-000000000001', null, null, 'Scheduled maintenance is planned for this Sunday at 2 AM UTC.', 'broadcast', false, now() - interval '5 minutes'),
  ('ddddddd2-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Please review the Q3 financial report I just uploaded.', 'personal', true, now() - interval '2 hours'),
  ('ddddddd3-0000-4000-8000-000000000003', null, null, 'A new security policy has been implemented. Please review the documentation.', 'broadcast', true, now() - interval '1 day')
on conflict (id) do nothing;

commit;
