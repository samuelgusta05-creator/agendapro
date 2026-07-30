create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  service text not null,
  professional text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  value numeric(10,2) not null default 0,
  status text not null default 'Pendente'
    check (status in ('Pendente', 'Confirmado', 'Em atendimento', 'Concluído', 'Cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists clients_organization_id_idx
  on public.clients(organization_id);
create index if not exists appointments_organization_id_idx
  on public.appointments(organization_id);

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  company_name text;
  base_slug text;
begin
  company_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''),
    'Minha empresa'
  );
  base_slug := regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'empresa'; end if;

  insert into public.organizations(name, slug, owner_id)
  values (company_name, base_slug || '-' || left(new.id::text, 8), new.id)
  returning id into new_organization_id;

  insert into public.profiles(
    id, organization_id, full_name, email, role, is_platform_admin
  )
  values (
    new.id,
    new_organization_id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'owner',
    lower(coalesce(new.email, '')) = 'samuelgusta05@gmail.com'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "organizations_tenant_read" on public.organizations;
create policy "organizations_tenant_read" on public.organizations
for select to authenticated
using (
  id = public.current_organization_id()
  or public.current_user_is_platform_admin()
);

drop policy if exists "profiles_tenant_read" on public.profiles;
create policy "profiles_tenant_read" on public.profiles
for select to authenticated
using (
  organization_id = public.current_organization_id()
  or id = auth.uid()
  or public.current_user_is_platform_admin()
);

drop policy if exists "clients_tenant_all" on public.clients;
create policy "clients_tenant_all" on public.clients
for all to authenticated
using (
  organization_id = public.current_organization_id()
  or public.current_user_is_platform_admin()
)
with check (organization_id = public.current_organization_id());

drop policy if exists "appointments_tenant_all" on public.appointments;
create policy "appointments_tenant_all" on public.appointments
for all to authenticated
using (
  organization_id = public.current_organization_id()
  or public.current_user_is_platform_admin()
)
with check (organization_id = public.current_organization_id());

grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.profiles to authenticated;
grant select, insert, update, delete on public.clients, public.appointments to authenticated;
