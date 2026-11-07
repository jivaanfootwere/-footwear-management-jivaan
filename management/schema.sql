-- JIVAAN Footwear Management: shared online database
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin','supervisor','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text not null default '',
  customer_name text not null default '',
  event_date date,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.stands (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  staff_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(event_id,name)
);

create table if not exists public.bags (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stand_id uuid not null references public.stands(id) on delete cascade,
  bag_code text not null,
  status text not null default 'available' check (status in ('available','occupied','maintenance')),
  created_at timestamptz not null default now(),
  unique(event_id,bag_code)
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  stand_id uuid not null references public.stands(id),
  bag_id uuid not null references public.bags(id),
  bag_code text not null,
  token_id text not null unique,
  mobile text not null,
  customer_name text not null default '',
  expires_at timestamptz not null,
  status text not null default 'with_customer' check (status in ('with_customer','returned','recovery')),
  issued_by uuid references auth.users(id),
  issued_at timestamptz not null default now(),
  returned_by uuid references auth.users(id),
  returned_at timestamptz
);

create index if not exists deposits_event_status_idx on public.deposits(event_id,status);
create index if not exists deposits_mobile_idx on public.deposits(mobile);
create index if not exists bags_event_status_idx on public.bags(event_id,status);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.stands enable row level security;
alter table public.bags enable row level security;
alter table public.deposits enable row level security;

-- Signed-in staff can read operational records. Writes are restricted by role.
drop policy if exists "profiles self or admin read" on public.profiles;
create policy "profiles self or admin read" on public.profiles for select to authenticated
using (user_id = auth.uid() or exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin' and p.active));

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage" on public.profiles for all to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin' and p.active))
with check (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin' and p.active));

drop policy if exists "active staff read events" on public.events;
create policy "active staff read events" on public.events for select to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

drop policy if exists "admins manage events" on public.events;
create policy "admins manage events" on public.events for all to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active))
with check (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active));

drop policy if exists "active staff read stands" on public.stands;
create policy "active staff read stands" on public.stands for select to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

drop policy if exists "admins manage stands" on public.stands;
create policy "admins manage stands" on public.stands for all to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active))
with check (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active));

drop policy if exists "active staff read bags" on public.bags;
create policy "active staff read bags" on public.bags for select to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

drop policy if exists "admins manage bags" on public.bags;
create policy "admins manage bags" on public.bags for all to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active))
with check (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('admin','supervisor') and p.active));

drop policy if exists "active staff read deposits" on public.deposits;
create policy "active staff read deposits" on public.deposits for select to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

drop policy if exists "active staff create deposits" on public.deposits;
create policy "active staff create deposits" on public.deposits for insert to authenticated
with check (issued_by=auth.uid() and exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

drop policy if exists "active staff update deposits" on public.deposits;
create policy "active staff update deposits" on public.deposits for update to authenticated
using (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active))
with check (exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.active));

-- Keep bag status synchronized with deposit/return activity.
create or replace function public.jivaan_sync_bag_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    update public.bags set status='occupied' where id=new.bag_id;
    return new;
  elsif tg_op='UPDATE' and new.status='returned' and old.status<>'returned' then
    update public.bags set status='available' where id=new.bag_id;
    return new;
  end if;
  return new;
end; $$;

drop trigger if exists jivaan_deposit_bag_status on public.deposits;
create trigger jivaan_deposit_bag_status after insert or update of status on public.deposits
for each row execute function public.jivaan_sync_bag_status();

-- Add newly registered users as staff. An existing admin can promote them in Profiles.
create or replace function public.jivaan_new_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(user_id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'staff')
  on conflict(user_id) do nothing;
  return new;
end; $$;

drop trigger if exists jivaan_auth_user_profile on auth.users;
create trigger jivaan_auth_user_profile after insert on auth.users
for each row execute function public.jivaan_new_profile();

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.stands;
alter publication supabase_realtime add table public.bags;
alter publication supabase_realtime add table public.deposits;
