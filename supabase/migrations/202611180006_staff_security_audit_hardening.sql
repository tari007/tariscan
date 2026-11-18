-- Build 10 hardening: owner-only staff administration, member listing and automatic audit.
drop policy if exists "Owners can update memberships" on public.business_members;
create policy "Owners can update memberships" on public.business_members
for update to authenticated
using (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()))
with check (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));

create or replace function public.list_business_members(p_business_id uuid)
returns table(member_id uuid,user_id uuid,email text,role text,is_active boolean,created_at timestamptz)
language sql security definer set search_path=public,auth
as $$
 select m.id,m.user_id,u.email::text,m.role,m.is_active,m.created_at
 from public.business_members m join auth.users u on u.id=m.user_id
 where m.business_id=p_business_id
 and exists(select 1 from public.businesses b where b.id=p_business_id and b.owner_id=auth.uid())
 order by m.created_at asc;
$$;
grant execute on function public.list_business_members(uuid) to authenticated;

create or replace function public.audit_business_member_change()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.audit_logs(business_id,actor_id,action,entity_type,entity_id,details)
 values(coalesce(new.business_id,old.business_id),auth.uid(),
  case when tg_op='INSERT' then 'staff.member_added' else 'staff.member_updated' end,
  'business_member',coalesce(new.id,old.id)::text,
  jsonb_build_object('role',coalesce(new.role,old.role),'active',coalesce(new.is_active,old.is_active)));
 if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
drop trigger if exists business_members_audit_trigger on public.business_members;
create trigger business_members_audit_trigger after insert or update on public.business_members
for each row execute function public.audit_business_member_change();
