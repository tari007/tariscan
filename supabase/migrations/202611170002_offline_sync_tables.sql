-- TariScan POS Build 3: cloud tables used by the offline sync queue.
-- Run after 202611170001_initial_business_setup.sql in Supabase SQL Editor.

create table if not exists public.products (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sku text not null,
  barcode text,
  category text,
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create index if not exists products_business_id_idx on public.products(business_id);
create index if not exists products_business_barcode_idx on public.products(business_id, barcode);

create table if not exists public.sales (
  id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  reference text not null,
  customer_name text not null default 'Walk-in Customer',
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_method text not null,
  items jsonb not null default '[]'::jsonb,
  sold_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (business_id, reference)
);

create index if not exists sales_business_sold_at_idx on public.sales(business_id, sold_at desc);

alter table public.products enable row level security;
alter table public.sales enable row level security;

drop policy if exists "Business owners manage their products" on public.products;
create policy "Business owners manage their products" on public.products
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = products.business_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = products.business_id and b.owner_id = auth.uid()
  ));

drop policy if exists "Business owners manage their sales" on public.sales;
create policy "Business owners manage their sales" on public.sales
  for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = sales.business_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = sales.business_id and b.owner_id = auth.uid()
  ));

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.sales to authenticated;
