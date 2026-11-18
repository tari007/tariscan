-- TariScan POS Build 8: customer, supplier and goods-received records.
-- Run after migrations 202611170001 through 202611180002.

create table if not exists public.customers (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_business_name_idx on public.customers(business_id, name);

create table if not exists public.suppliers (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists suppliers_business_name_idx on public.suppliers(business_id, name);

create table if not exists public.purchases (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reference text not null,
  supplier_id text not null,
  supplier_name text not null,
  product_id text not null,
  product_name text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  total_cost numeric(14,2) not null check (total_cost >= 0),
  received_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (business_id, reference)
);
create index if not exists purchases_business_received_idx on public.purchases(business_id, received_at desc);

alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Business owners manage their customers" on public.customers;
create policy "Business owners manage their customers" on public.customers for all to authenticated
using (exists (select 1 from public.businesses b where b.id=customers.business_id and b.owner_id=auth.uid()))
with check (exists (select 1 from public.businesses b where b.id=customers.business_id and b.owner_id=auth.uid()));

drop policy if exists "Business owners manage their suppliers" on public.suppliers;
create policy "Business owners manage their suppliers" on public.suppliers for all to authenticated
using (exists (select 1 from public.businesses b where b.id=suppliers.business_id and b.owner_id=auth.uid()))
with check (exists (select 1 from public.businesses b where b.id=suppliers.business_id and b.owner_id=auth.uid()));

drop policy if exists "Business owners manage their purchases" on public.purchases;
create policy "Business owners manage their purchases" on public.purchases for all to authenticated
using (exists (select 1 from public.businesses b where b.id=purchases.business_id and b.owner_id=auth.uid()))
with check (exists (select 1 from public.businesses b where b.id=purchases.business_id and b.owner_id=auth.uid()));

grant select, insert, update, delete on public.customers, public.suppliers, public.purchases to authenticated;

-- Credit is a recorded tender type, not an electronic payment.
alter table public.sales drop constraint if exists sales_payment_method_check;
