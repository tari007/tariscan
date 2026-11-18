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


/**
 * Records a completed checkout and reduces stock in one IndexedDB transaction.
 * If any product has insufficient stock, no sale or stock change is committed.
 */
export async function completeLocalSale(
  input: Omit<LocalSale, "id" | "created_at" | "sync_state"> & { id?: string }
) {
  const now = new Date().toISOString();
  const sale: LocalSale = {
    ...input,
    id: input.id ?? makeId(),
    created_at: now,
    sync_state: "pending"
  };

  await localDb.transaction("rw", localDb.products, localDb.sales, localDb.syncQueue, async () => {
    const updates: LocalProduct[] = [];
    for (const line of sale.items) {
      const product = await localDb.products.get(line.product_id);
      if (!product || product.business_id !== sale.business_id || !product.is_active) {
        throw new Error(`Product unavailable: ${line.product_name}`);
      }
      if (product.quantity < line.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
      }
      updates.push({
        ...product,
        quantity: Number((product.quantity - line.quantity).toFixed(3)),
        updated_at: now,
        sync_state: "pending"
      });
    }

    await localDb.sales.add(sale);
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

    for (const product of updates) {
      await localDb.products.put(product);
      const previous = await localDb.syncQueue.where("record_id").equals(product.id).toArray();
      const productQueueIds = previous
        .filter(item => item.entity === "products" && item.id !== undefined)
        .map(item => item.id as number);
      if (productQueueIds.length) await localDb.syncQueue.bulkDelete(productQueueIds);
      await localDb.syncQueue.add({
        entity: "products",
        record_id: product.id,
        business_id: product.business_id,
        operation: "upsert",
        payload: { ...product, sync_state: undefined },
        status: "pending",
        attempts: 0,
        created_at: now
      });
    }
  });

  return sale;
}


/**
 * Full refunds only. Restores inventory and queues both the sale update and
 * product updates atomically, preventing duplicate refunds on this device.
 */
export async function refundLocalSale(saleId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) throw new Error("Enter a reason for this refund.");
  const now = new Date().toISOString();

  return localDb.transaction("rw", localDb.sales, localDb.products, localDb.syncQueue, async () => {
    const sale = await localDb.sales.get(saleId);
    if (!sale) throw new Error("Sale was not found on this device.");
    if (sale.status === "refunded") throw new Error("This sale has already been refunded.");

    const quantities = new Map<string, number>();
    for (const item of sale.items) {
      quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity);
    }

    const updatedProducts: LocalProduct[] = [];
    for (const [productId, quantity] of quantities) {
      const product = await localDb.products.get(productId);
      if (!product) throw new Error(`Cannot restore stock because ${sale.items.find(i => i.product_id === productId)?.product_name ?? "a product"} is missing from this device.`);
      updatedProducts.push({
        ...product,
        quantity: Number((product.quantity + quantity).toFixed(3)),
        updated_at: now,
        sync_state: "pending"
      });
    }

    const refundedSale: LocalSale = {
      ...sale,
      status: "refunded",
      refunded_at: now,
      refund_reason: cleanReason,
      refunded_amount: sale.total,
      sync_state: "pending"
    };

    await localDb.sales.put(refundedSale);
    const oldSaleQueue = await localDb.syncQueue.where("record_id").equals(sale.id).toArray();
    const saleQueueIds = oldSaleQueue.filter(q => q.entity === "sales" && q.id !== undefined).map(q => q.id as number);
    if (saleQueueIds.length) await localDb.syncQueue.bulkDelete(saleQueueIds);
    await localDb.syncQueue.add({
      entity: "sales", record_id: sale.id, business_id: sale.business_id,
      operation: "upsert", payload: { ...refundedSale }, status: "pending",
      attempts: 0, created_at: now
    });

    for (const product of updatedProducts) {
      await localDb.products.put(product);
      const oldQueue = await localDb.syncQueue.where("record_id").equals(product.id).toArray();
      const ids = oldQueue.filter(q => q.entity === "products" && q.id !== undefined).map(q => q.id as number);
      if (ids.length) await localDb.syncQueue.bulkDelete(ids);
      await localDb.syncQueue.add({
        entity: "products", record_id: product.id, business_id: product.business_id,
        operation: "upsert", payload: { ...product, sync_state: undefined },
        status: "pending", attempts: 0, created_at: now
      });
    }
    return refundedSale;
  });
}
