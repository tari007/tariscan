-- TariScan POS Build 10: staff membership, role permissions and audit trail.
create table if not exists public.business_members (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','manager','supervisor','cashier','stock_clerk')),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,user_id)
);
create index if not exists business_members_user_idx on public.business_members(user_id,business_id);
insert into public.business_members(business_id,user_id,role)
select id,owner_id,'owner' from public.businesses
on conflict(business_id,user_id) do update set role='owner',is_active=true;

create or replace function public.has_business_permission(p_business_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path=public
as $$
 select exists(select 1 from public.businesses b where b.id=p_business_id and b.owner_id=auth.uid())
 or exists(select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=auth.uid() and m.is_active and (
 m.role='owner'
 or (m.role='manager' and p_permission in ('sales.read','sales.create','sales.refund','products.read','products.write','inventory.adjust','customers.manage','suppliers.manage','purchases.manage','expenses.manage','reports.read','staff.read','staff.manage','audit.read'))
 or (m.role='supervisor' and p_permission in ('sales.read','sales.create','sales.refund','products.read','products.write','inventory.adjust','customers.manage','suppliers.manage','purchases.manage','expenses.manage','reports.read','staff.read','audit.read'))
 or (m.role='cashier' and p_permission in ('sales.read','sales.create','products.read','customers.manage'))
 or (m.role='stock_clerk' and p_permission in ('products.read','products.write','inventory.adjust','suppliers.manage','purchases.manage'))
 ));
$$;
grant execute on function public.has_business_permission(uuid,text) to authenticated;

alter table public.business_members enable row level security;
drop policy if exists "Members can view their business memberships" on public.business_members;
create policy "Members can view their business memberships" on public.business_members for select to authenticated
using(user_id=auth.uid() or public.has_business_permission(business_id,'staff.read'));
drop policy if exists "Owners can update memberships" on public.business_members;
create policy "Owners can update memberships" on public.business_members for update to authenticated
using(public.has_business_permission(business_id,'staff.manage')) with check(public.has_business_permission(business_id,'staff.manage'));
grant select,update on public.business_members to authenticated;

create or replace function public.add_business_member(p_business_id uuid,p_email text,p_role text)
returns uuid language plpgsql security definer set search_path=public,auth
as $$
declare v_user_id uuid; v_member_id uuid;
begin
 if not exists(select 1 from public.businesses where id=p_business_id and owner_id=auth.uid()) then raise exception 'Only the business owner can add staff members'; end if;
 if p_role not in ('manager','supervisor','cashier','stock_clerk') then raise exception 'Select a valid staff role'; end if;
 select id into v_user_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if v_user_id is null then raise exception 'This email has not registered with TariScan yet. Ask the staff member to create an account first.'; end if;
 insert into public.business_members(business_id,user_id,role,is_active) values(p_business_id,v_user_id,p_role,true)
 on conflict(business_id,user_id) do update set role=excluded.role,is_active=true,updated_at=now() returning id into v_member_id;
 return v_member_id;
end;
$$;
grant execute on function public.add_business_member(uuid,text,text) to authenticated;

create or replace function public.update_business_member(p_member_id uuid,p_role text,p_is_active boolean)
returns void language plpgsql security definer set search_path=public
as $$
declare v_business_id uuid;
begin
 if p_role not in ('manager','supervisor','cashier','stock_clerk') then raise exception 'Invalid staff role'; end if;
 select business_id into v_business_id from public.business_members where id=p_member_id;
 if v_business_id is null or not exists(select 1 from public.businesses where id=v_business_id and owner_id=auth.uid()) then raise exception 'Only the business owner can change staff access'; end if;
 update public.business_members set role=p_role,is_active=p_is_active,updated_at=now() where id=p_member_id and role<>'owner';
end;
$$;
grant execute on function public.update_business_member(uuid,text,boolean) to authenticated;

create table if not exists public.audit_logs(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id text,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_logs_business_created_idx on public.audit_logs(business_id,created_at desc);
alter table public.audit_logs enable row level security;
drop policy if exists "Permitted members can read audit logs" on public.audit_logs;
create policy "Permitted members can read audit logs" on public.audit_logs for select to authenticated
using(public.has_business_permission(business_id,'audit.read'));
drop policy if exists "Members can append audit logs" on public.audit_logs;
create policy "Members can append audit logs" on public.audit_logs for insert to authenticated
with check(actor_id=auth.uid() and public.has_business_permission(business_id,'sales.read'));
grant select,insert on public.audit_logs to authenticated;
