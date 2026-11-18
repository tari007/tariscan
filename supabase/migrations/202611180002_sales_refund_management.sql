-- TariScan POS Build 7: persist refund state and receipt payment details.
-- Run after the Build 6 checkout migration.
alter table public.sales
  add column if not exists amount_tendered numeric(14,2) not null default 0,
  add column if not exists change_due numeric(14,2) not null default 0,
  add column if not exists status text not null default 'completed'
    check (status in ('completed','refunded')),
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text,
  add column if not exists refunded_amount numeric(14,2) not null default 0;
