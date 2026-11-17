-- TariScan POS: initial account and business onboarding schema.
-- Run this migration in the Supabase SQL Editor.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  business_type text not null default 'Retail shop',
  phone text,
  country text not null default 'Nigeria',
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx
  on public.businesses(owner_id);

alter table public.businesses enable row level security;

drop policy if exists "Owners can view their businesses" on public.businesses;
create policy "Owners can view their businesses"
  on public.businesses for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can create their businesses" on public.businesses;
create policy "Owners can create their businesses"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their businesses" on public.businesses;
create policy "Owners can update their businesses"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete their businesses" on public.businesses;
create policy "Owners can delete their businesses"
  on public.businesses for delete
  using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.businesses to authenticated;
