-- TariScan POS Build 9: local-first expense records and cloud sync.
create table if not exists public.expenses (
 id text primary key,
 business_id uuid not null references public.businesses(id) on delete cascade,
 title text not null,
 category text not null,
 amount numeric(14,2) not null check(amount>0),
 payment_method text not null default 'cash',
 notes text not null default '',
 spent_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists expenses_business_spent_idx on public.expenses(business_id,spent_at desc);
alter table public.expenses enable row level security;
drop policy if exists "Business owners manage their expenses" on public.expenses;
create policy "Business owners manage their expenses" on public.expenses for all to authenticated
using (exists(select 1 from public.businesses b where b.id=expenses.business_id and b.owner_id=auth.uid()))
with check (exists(select 1 from public.businesses b where b.id=expenses.business_id and b.owner_id=auth.uid()));
grant select,insert,update,delete on public.expenses to authenticated;
