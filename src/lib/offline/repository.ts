import { localDb, type LocalProduct, type LocalSale, type SyncQueueItem } from "./database";

function makeId() {
  return globalThis.crypto?.randomUUID?.() ??
    `ts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveLocalProduct(
  input: Omit<LocalProduct, "id" | "created_at" | "updated_at" | "sync_state"> & { id?: string }
) {
  const now = new Date().toISOString();
  const existing = input.id ? await localDb.products.get(input.id) : undefined;
  const product: LocalProduct = {
    ...input,
    id: input.id ?? makeId(),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    sync_state: "pending"
  };

  await localDb.transaction("rw", localDb.products, localDb.syncQueue, async () => {
    await localDb.products.put(product);
    const oldQueueItems = await localDb.syncQueue
      .where("record_id").equals(product.id).toArray();
    await localDb.syncQueue.bulkDelete(oldQueueItems.map(item => item.id).filter((id): id is number => id !== undefined));
    const queueItem: SyncQueueItem = {
      entity: "products",
      record_id: product.id,
      business_id: product.business_id,
      operation: "upsert",
      payload: { ...product, sync_state: undefined },
      status: "pending",
      attempts: 0,
      created_at: now
    };
    await localDb.syncQueue.add(queueItem);
  });
  return product;
}

export async function recordLocalSale(
  input: Omit<LocalSale, "id" | "created_at" | "sync_state"> & { id?: string }
) {
  const now = new Date().toISOString();
  const sale: LocalSale = {
    ...input,
    id: input.id ?? makeId(),
    created_at: now,
    sync_state: "pending"
  };

  await localDb.transaction("rw", localDb.sales, localDb.syncQueue, async () => {
    await localDb.sales.put(sale);
    await localDb.syncQueue.add({
      entity: "sales",
      record_id: sale.id,
      business_id: sale.business_id,
      operation: "upsert",
      payload: { ...sale },
      status: "pending",
      attempts: 0,
      created_at: now
    });
  });
  return sale;
}

export async function getLocalProducts(businessId: string) {
  return localDb.products.where("business_id").equals(businessId).toArray();
}

export async function getLocalSales(businessId: string) {
  return localDb.sales.where("business_id").equals(businessId).reverse().sortBy("sold_at");
}

export async function getPendingSyncCount(businessId?: string) {
  if (!businessId) return localDb.syncQueue.where("status").anyOf("pending", "failed").count();
  return localDb.syncQueue.where("[business_id+status]")
    .anyOf([[businessId, "pending"], [businessId, "failed"]]).count();
}
