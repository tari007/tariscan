-- TariScan POS Build 11: enforce staff permissions on every cloud data table.
-- Run after Build 10 migrations 202611180005 through 202611180007.

-- Products: owners, managers, supervisors and stock clerks can maintain stock.
drop policy if exists "Business owners manage their products" on public.products;
drop policy if exists "Products visible to permitted members" on public.products;
drop policy if exists "Products writable by permitted members" on public.products;
create policy "Products visible to permitted members" on public.products
for select to authenticated using(public.has_business_permission(business_id,'products.read'));
create policy "Products writable by permitted members" on public.products
for all to authenticated
using(public.has_business_permission(business_id,'products.write'))
with check(public.has_business_permission(business_id,'products.write'));

-- Sales: cashier access is limited to sales. Refund permission is separate.
drop policy if exists "Business owners manage their sales" on public.sales;
drop policy if exists "Sales readable by permitted members" on public.sales;
drop policy if exists "Sales insertable by permitted members" on public.sales;
drop policy if exists "Sales updateable by permitted members" on public.sales;
create policy "Sales readable by permitted members" on public.sales
for select to authenticated using(public.has_business_permission(business_id,'sales.read'));
create policy "Sales insertable by permitted members" on public.sales
for insert to authenticated with check(public.has_business_permission(business_id,'sales.create'));
create policy "Sales updateable by permitted members" on public.sales
for update to authenticated
using(public.has_business_permission(business_id,'sales.create') or public.has_business_permission(business_id,'sales.refund'))
with check(public.has_business_permission(business_id,'sales.create') or public.has_business_permission(business_id,'sales.refund'));

-- Customer access supports checkout and customer management.
drop policy if exists "Business owners manage their customers" on public.customers;
drop policy if exists "Customers readable by permitted members" on public.customers;
drop policy if exists "Customers writable by permitted members" on public.customers;
create policy "Customers readable by permitted members" on public.customers
for select to authenticated using(public.has_business_permission(business_id,'customers.manage'));
create policy "Customers writable by permitted members" on public.customers
for all to authenticated
using(public.has_business_permission(business_id,'customers.manage'))
with check(public.has_business_permission(business_id,'customers.manage'));

-- Supplier and purchase records.
drop policy if exists "Business owners manage their suppliers" on public.suppliers;
drop policy if exists "Suppliers readable by permitted members" on public.suppliers;
drop policy if exists "Suppliers writable by permitted members" on public.suppliers;
create policy "Suppliers readable by permitted members" on public.suppliers
for select to authenticated using(public.has_business_permission(business_id,'suppliers.manage') or public.has_business_permission(business_id,'purchases.manage'));
create policy "Suppliers writable by permitted members" on public.suppliers
for all to authenticated
using(public.has_business_permission(business_id,'suppliers.manage') or public.has_business_permission(business_id,'purchases.manage'))
with check(public.has_business_permission(business_id,'suppliers.manage') or public.has_business_permission(business_id,'purchases.manage'));

drop policy if exists "Business owners manage their purchases" on public.purchases;
drop policy if exists "Purchases readable by permitted members" on public.purchases;
drop policy if exists "Purchases writable by permitted members" on public.purchases;
create policy "Purchases readable by permitted members" on public.purchases
for select to authenticated using(public.has_business_permission(business_id,'purchases.manage'));
create policy "Purchases writable by permitted members" on public.purchases
for all to authenticated
using(public.has_business_permission(business_id,'purchases.manage'))
with check(public.has_business_permission(business_id,'purchases.manage'));

-- Expenses and management reports.
drop policy if exists "Business owners manage their expenses" on public.expenses;
drop policy if exists "Expenses readable by permitted members" on public.expenses;
drop policy if exists "Expenses writable by permitted members" on public.expenses;
create policy "Expenses readable by permitted members" on public.expenses
for select to authenticated using(public.has_business_permission(business_id,'expenses.manage'));
create policy "Expenses writable by permitted members" on public.expenses
for all to authenticated
using(public.has_business_permission(business_id,'expenses.manage'))
with check(public.has_business_permission(business_id,'expenses.manage'));

-- Audit history is append-only for application users. Trigger inserts run as the function owner.
drop policy if exists "Members can append audit logs" on public.audit_logs;
drop policy if exists "Audit logs cannot be changed by users" on public.audit_logs;
create policy "Audit logs cannot be changed by users" on public.audit_logs
for all to authenticated using(false) with check(false);
drop policy if exists "Permitted members can read audit logs" on public.audit_logs;
create policy "Permitted members can read audit logs" on public.audit_logs
for select to authenticated using(public.has_business_permission(business_id,'audit.read'));

-- Record changes centrally. Store field names, not full row contents or customer data.
create or replace function public.audit_business_data_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
 v_business_id uuid;
 v_record_id text;
 v_action text;
 v_changed text[];
begin
 if tg_op='DELETE' then
  v_business_id:=old.business_id;
  v_record_id:=old.id::text;
  v_action:=lower(tg_table_name)||'.deleted';
  v_changed:=array[]::text[];
 else
  v_business_id:=new.business_id;
  v_record_id:=new.id::text;
  if tg_op='INSERT' then
   v_action:=lower(tg_table_name)||'.created';
   v_changed:=array[]::text[];
  else
   v_action:=lower(tg_table_name)||'.updated';
   select coalesce(array_agg(key order by key),array[]::text[]) into v_changed
   from jsonb_each(to_jsonb(new)) n
   where n.value is distinct from (to_jsonb(old)->n.key)
    and n.key not in ('updated_at','sync_state');
  end if;
 end if;
 insert into public.audit_logs(business_id,actor_id,action,entity_type,entity_id,details)
 values(v_business_id,auth.uid(),v_action,tg_table_name,v_record_id,
  jsonb_build_object('changed_fields',v_changed,'source','database_trigger'));
 if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists audit_products_changes on public.products;
create trigger audit_products_changes after insert or update or delete on public.products
for each row execute function public.audit_business_data_change();
drop trigger if exists audit_sales_changes on public.sales;
create trigger audit_sales_changes after insert or update or delete on public.sales
for each row execute function public.audit_business_data_change();
drop trigger if exists audit_customers_changes on public.customers;
create trigger audit_customers_changes after insert or update or delete on public.customers
for each row execute function public.audit_business_data_change();
drop trigger if exists audit_suppliers_changes on public.suppliers;
create trigger audit_suppliers_changes after insert or update or delete on public.suppliers
for each row execute function public.audit_business_data_change();
drop trigger if exists audit_purchases_changes on public.purchases;
create trigger audit_purchases_changes after insert or update or delete on public.purchases
for each row execute function public.audit_business_data_change();
drop trigger if exists audit_expenses_changes on public.expenses;
create trigger audit_expenses_changes after insert or update or delete on public.expenses
for each row execute function public.audit_business_data_change();

-- Grant only the table operations that the RLS policies above can authorise.
grant select,insert,update on public.products,public.sales,public.customers,public.suppliers,public.purchases,public.expenses to authenticated;
revoke delete on public.products,public.sales,public.customers,public.suppliers,public.purchases,public.expenses from authenticated;
