-- Ensure every newly created business immediately has an owner membership.
create or replace function public.create_business_owner_membership()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.business_members(business_id,user_id,role,is_active)
 values(new.id,new.owner_id,'owner',true)
 on conflict(business_id,user_id) do update set role='owner',is_active=true,updated_at=now();
 return new;
end;
$$;
drop trigger if exists businesses_create_owner_membership on public.businesses;
create trigger businesses_create_owner_membership after insert on public.businesses
for each row execute function public.create_business_owner_membership();
