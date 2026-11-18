-- Build 11 security hardening: constrain cashier sync writes and protect transaction integrity.

-- Cashiers may sync a stock decrease caused by checkout, but cannot edit product details.
drop policy if exists "Products writable by permitted members" on public.products;
create policy "Products insertable by permitted members" on public.products
for insert to authenticated with check(public.has_business_permission(business_id,'products.write'));
create policy "Products updateable by permitted members" on public.products
for update to authenticated
using(public.has_business_permission(business_id,'products.write') or public.has_business_permission(business_id,'sales.create'))
with check(public.has_business_permission(business_id,'products.write') or public.has_business_permission(business_id,'sales.create'));

create or replace function public.guard_product_stock_update()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if not public.has_business_permission(old.business_id,'products.write') then
  if not public.has_business_permission(old.business_id,'sales.create')
   or new.business_id is distinct from old.business_id
   or new.name is distinct from old.name
   or new.sku is distinct from old.sku
   or new.barcode is distinct from old.barcode
   or new.category is distinct from old.category
   or new.unit_price is distinct from old.unit_price
   or new.cost_price is distinct from old.cost_price
   or new.reorder_level is distinct from old.reorder_level
   or new.is_active is distinct from old.is_active
   or new.created_at is distinct from old.created_at
   or new.quantity >= old.quantity then
    raise exception 'This role may only reduce stock through checkout';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists guard_product_stock_update_trigger on public.products;
create trigger guard_product_stock_update_trigger before update on public.products
for each row execute function public.guard_product_stock_update();

-- Sales are immutable after creation except for a refund performed by an authorised role.
create or replace function public.guard_sale_update()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.business_id is distinct from old.business_id
  or new.reference is distinct from old.reference
  or new.customer_name is distinct from old.customer_name
  or new.subtotal is distinct from old.subtotal
  or new.discount is distinct from old.discount
  or new.tax is distinct from old.tax
  or new.total is distinct from old.total
  or new.payment_method is distinct from old.payment_method
  or new.items is distinct from old.items
  or new.sold_at is distinct from old.sold_at
  or new.amount_tendered is distinct from old.amount_tendered
  or new.change_due is distinct from old.change_due then
  raise exception 'Completed sale details cannot be edited';
 end if;
 if (old.status='refunded' and (
   new.status is distinct from old.status
   or new.refunded_at is distinct from old.refunded_at
   or new.refund_reason is distinct from old.refund_reason
   or new.refunded_amount is distinct from old.refunded_amount)) then
  raise exception 'A completed refund cannot be reversed or edited';
 end if;
 if (new.status is distinct from old.status
  or new.refunded_at is distinct from old.refunded_at
  or new.refund_reason is distinct from old.refund_reason
  or new.refunded_amount is distinct from old.refunded_amount)
  and not public.has_business_permission(old.business_id,'sales.refund') then
  raise exception 'This role cannot refund sales';
 end if;
 if new.status='refunded' and (
   new.refunded_at is null or coalesce(trim(new.refund_reason),'')=''
   or new.refunded_amount is distinct from new.total) then
  raise exception 'A valid full refund reason and amount are required';
 end if;
 return new;
end;
$$;
drop trigger if exists guard_sale_update_trigger on public.sales;
create trigger guard_sale_update_trigger before update on public.sales
for each row execute function public.guard_sale_update();
