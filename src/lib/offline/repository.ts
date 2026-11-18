import { aggregateSaleQuantities, calculateRemainingStock } from "./stock.mjs";
import { localDb, type LocalProduct, type LocalSale, type LocalCustomer, type LocalSupplier, type LocalPurchase, type SyncQueueItem, type SyncEntity } from "./database";

function makeId() { return globalThis.crypto?.randomUUID?.() ?? `ts-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; }
function queueRecord(entity: SyncEntity, record: {id:string;business_id:string}, payload: Record<string,unknown>, now:string): SyncQueueItem {
  return { entity, record_id: record.id, business_id: record.business_id, operation:"upsert", payload, status:"pending", attempts:0, created_at:now };
}
async function replaceQueue(entity: SyncEntity, record: {id:string;business_id:string}, payload: Record<string,unknown>, now:string) {
  const old = await localDb.syncQueue.where("record_id").equals(record.id).toArray();
  const ids = old.filter(q=>q.entity===entity && q.business_id===record.business_id && q.id!==undefined).map(q=>q.id as number);
  if(ids.length) await localDb.syncQueue.bulkDelete(ids);
  await localDb.syncQueue.add(queueRecord(entity,record,payload,now));
}
export async function saveLocalProduct(input: Omit<LocalProduct,"id"|"created_at"|"updated_at"|"sync_state">&{id?:string}) {
  const now=new Date().toISOString(), existing=input.id?await localDb.products.get(input.id):undefined;
  const product:LocalProduct={...input,id:input.id??makeId(),created_at:existing?.created_at??now,updated_at:now,sync_state:"pending"};
  await localDb.transaction("rw",localDb.products,localDb.syncQueue,async()=>{await localDb.products.put(product);await replaceQueue("products",product,{...product,sync_state:undefined},now);});
  return product;
}
export async function recordLocalSale(input: Omit<LocalSale,"id"|"created_at"|"sync_state">&{id?:string}) {
  const now=new Date().toISOString(),sale:LocalSale={...input,id:input.id??makeId(),created_at:now,sync_state:"pending"};
  await localDb.transaction("rw",localDb.sales,localDb.syncQueue,async()=>{await localDb.sales.put(sale);await localDb.syncQueue.add(queueRecord("sales",sale,{...sale},now));});
  return sale;
}
export async function getLocalProducts(businessId:string){return localDb.products.where("business_id").equals(businessId).toArray();}
export async function getLocalSales(businessId:string){return localDb.sales.where("business_id").equals(businessId).reverse().sortBy("sold_at");}
export async function getPendingSyncCount(businessId?:string){
  if(!businessId)return localDb.syncQueue.where("status").anyOf("pending","failed").count();
  return localDb.syncQueue.where("[business_id+status]").anyOf([[businessId,"pending"],[businessId,"failed"]]).count();
}
export async function completeLocalSale(input: Omit<LocalSale,"id"|"created_at"|"sync_state">&{id?:string}) {
  const now=new Date().toISOString(),sale:LocalSale={...input,id:input.id??makeId(),created_at:now,sync_state:"pending"};
  await localDb.transaction("rw",localDb.products,localDb.sales,localDb.syncQueue,async()=>{
    const updates:LocalProduct[]=[];
    const quantities=aggregateSaleQuantities(sale.items);
    for(const [productId,soldQuantity] of quantities){
      const product=await localDb.products.get(productId);
      const saleLine=sale.items.find(line=>line.product_id===productId);
      if(!product||product.business_id!==sale.business_id||!product.is_active)throw new Error(`Product unavailable: ${saleLine?.product_name??productId}`);
      let remaining:number;
      try { remaining=calculateRemainingStock(product.quantity,soldQuantity); }
      catch { throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`); }
      updates.push({...product,quantity:remaining,updated_at:now,sync_state:"pending"});
    }
    await localDb.sales.add(sale);await localDb.syncQueue.add(queueRecord("sales",sale,{...sale},now));
    for(const product of updates){await localDb.products.put(product);await replaceQueue("products",product,{...product,sync_state:undefined},now);}
  });
  return sale;
}
export async function refundLocalSale(saleId:string,reason:string){
  const clean=reason.trim();if(!clean)throw new Error("Enter a reason for this refund.");
  const now=new Date().toISOString();
  return localDb.transaction("rw",localDb.sales,localDb.products,localDb.syncQueue,async()=>{
    const sale=await localDb.sales.get(saleId);if(!sale)throw new Error("Sale was not found on this device.");
    if(sale.status==="refunded")throw new Error("This sale has already been refunded.");
    const quantities=new Map<string,number>();for(const item of sale.items)quantities.set(item.product_id,(quantities.get(item.product_id)??0)+item.quantity);
    const updates:LocalProduct[]=[];
    for(const [id,qty] of quantities){const p=await localDb.products.get(id);if(!p)throw new Error("Cannot restore stock because a product is missing from this device.");updates.push({...p,quantity:Number((p.quantity+qty).toFixed(3)),updated_at:now,sync_state:"pending"});}
    const refunded:LocalSale={...sale,status:"refunded",refunded_at:now,refund_reason:clean,refunded_amount:sale.total,sync_state:"pending"};
    await localDb.sales.put(refunded);await replaceQueue("sales",refunded,{...refunded},now);
    for(const p of updates){await localDb.products.put(p);await replaceQueue("products",p,{...p,sync_state:undefined},now);}
    return refunded;
  });
}
export async function saveLocalCustomer(input:Omit<LocalCustomer,"id"|"created_at"|"updated_at"|"sync_state">&{id?:string}){
  const now=new Date().toISOString(),old=input.id?await localDb.customers.get(input.id):undefined;
  const row:LocalCustomer={...input,id:input.id??makeId(),created_at:old?.created_at??now,updated_at:now,sync_state:"pending"};
  await localDb.transaction("rw",localDb.customers,localDb.syncQueue,async()=>{await localDb.customers.put(row);await replaceQueue("customers",row,{...row,sync_state:undefined},now);});return row;
}
export async function saveLocalSupplier(input:Omit<LocalSupplier,"id"|"created_at"|"updated_at"|"sync_state">&{id?:string}){
  const now=new Date().toISOString(),old=input.id?await localDb.suppliers.get(input.id):undefined;
  const row:LocalSupplier={...input,id:input.id??makeId(),created_at:old?.created_at??now,updated_at:now,sync_state:"pending"};
  await localDb.transaction("rw",localDb.suppliers,localDb.syncQueue,async()=>{await localDb.suppliers.put(row);await replaceQueue("suppliers",row,{...row,sync_state:undefined},now);});return row;
}
export async function receiveLocalPurchase(input:{business_id:string;supplier_id:string;product_id:string;quantity:number;unit_cost:number}){
  if(!Number.isFinite(input.quantity)||input.quantity<=0)throw new Error("Enter a quantity greater than zero.");
  if(!Number.isFinite(input.unit_cost)||input.unit_cost<0)throw new Error("Enter a valid unit cost.");
  const now=new Date().toISOString(),id=makeId(),reference=`PO-${Date.now().toString().slice(-9)}`;
  return localDb.transaction("rw",localDb.products,localDb.suppliers,localDb.purchases,localDb.syncQueue,async()=>{
    const supplier=await localDb.suppliers.get(input.supplier_id);
    const product=await localDb.products.get(input.product_id);
    if(!supplier||supplier.business_id!==input.business_id)throw new Error("Select a valid supplier.");
    if(!product||product.business_id!==input.business_id)throw new Error("Select a valid product.");
    const purchase:LocalPurchase={id,business_id:input.business_id,reference,supplier_id:supplier.id,supplier_name:supplier.name,product_id:product.id,product_name:product.name,quantity:Number(input.quantity.toFixed(3)),unit_cost:Number(input.unit_cost.toFixed(2)),total_cost:Number((input.quantity*input.unit_cost).toFixed(2)),received_at:now,created_at:now,sync_state:"pending"};
    const updated:LocalProduct={...product,quantity:Number((product.quantity+input.quantity).toFixed(3)),cost_price:purchase.unit_cost,updated_at:now,sync_state:"pending"};
    await localDb.purchases.add(purchase);await localDb.products.put(updated);
    await localDb.syncQueue.add(queueRecord("purchases",purchase,{...purchase},now));
    await replaceQueue("products",updated,{...updated,sync_state:undefined},now);
    return purchase;
  });
}

export async function saveLocalExpense(input:{business_id:string;title:string;category:string;amount:number;payment_method:string;notes:string;spent_at?:string}){
 if(!input.title.trim())throw new Error("Expense description is required.");
 if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error("Enter an amount greater than zero.");
 const now=new Date().toISOString(),row={...input,id:makeId(),title:input.title.trim(),category:input.category.trim(),amount:Number(input.amount.toFixed(2)),notes:input.notes.trim(),spent_at:input.spent_at??now,created_at:now,sync_state:"pending" as const};
 await localDb.transaction("rw",localDb.expenses,localDb.syncQueue,async()=>{await localDb.expenses.add(row);await localDb.syncQueue.add(queueRecord("expenses",row,{...row,sync_state:undefined},now));});
 return row;
}
