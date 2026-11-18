-- TariScan POS Build 6: cash tender and change captured at checkout.
-- Run after 202611170002_offline_sync_tables.sql in Supabase SQL Editor.
alter table public.sales
  add column if not exists amount_tendered numeric(14,2) not null default 0,
  add column if not exists change_due numeric(14,2) not null default 0;
