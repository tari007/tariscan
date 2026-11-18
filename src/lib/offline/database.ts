import Dexie, { type Table } from "dexie";

export type SyncState = "pending" | "syncing" | "synced" | "failed";
export type SyncEntity = "products" | "sales" | "customers" | "suppliers" | "purchases" | "expenses";

export interface LocalProduct {
  id: string; business_id: string; name: string; sku: string; barcode?: string | null;
  category?: string | null; unit_price: number; cost_price: number; quantity: number;
  reorder_level: number; is_active: boolean; created_at: string; updated_at: string; sync_state: SyncState;
}
export interface LocalSale {
  id: string; business_id: string; reference: string; customer_name: string;
  subtotal: number; discount: number; tax: number; total: number; payment_method: string;
  amount_tendered?: number; change_due?: number;
  items: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; cost_price?: number; line_total: number }>;
  sold_at: string; created_at: string; sync_state: SyncState;
  status?: "completed" | "refunded"; refunded_at?: string; refund_reason?: string; refunded_amount?: number;
}
export interface LocalCustomer {
  id: string; business_id: string; name: string; phone: string; email: string;
  address: string; notes: string; created_at: string; updated_at: string; sync_state: SyncState;
}
export interface LocalSupplier {
  id: string; business_id: string; name: string; contact_person: string; phone: string;
  email: string; address: string; notes: string; created_at: string; updated_at: string; sync_state: SyncState;
}
export interface LocalPurchase {
  id: string; business_id: string; reference: string; supplier_id: string; supplier_name: string;
  product_id: string; product_name: string; quantity: number; unit_cost: number; total_cost: number;
  received_at: string; created_at: string; sync_state: SyncState;
}
export interface LocalExpense { id:string; business_id:string; title:string; category:string; amount:number; payment_method:string; notes:string; spent_at:string; created_at:string; sync_state:SyncState; }
export interface SyncQueueItem {
  id?: number; entity: SyncEntity; record_id: string; business_id: string; operation: "upsert";
  payload: Record<string, unknown>; status: "pending" | "failed"; attempts: number;
  last_error?: string; created_at: string;
}
class TariScanDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>;
  customers!: Table<LocalCustomer, string>;
  suppliers!: Table<LocalSupplier, string>;
  purchases!: Table<LocalPurchase, string>;
  expenses!: Table<LocalExpense, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  constructor() {
    super("tariscan-pos-local");
    this.version(1).stores({
      products: "id, business_id, sku, barcode, name, sync_state, updated_at, [business_id+sku]",
      sales: "id, business_id, reference, sold_at, sync_state, [business_id+sold_at]",
      syncQueue: "++id, entity, record_id, business_id, status, created_at, [business_id+status]"
    });
    this.version(2).stores({
      products: "id, business_id, sku, barcode, name, sync_state, updated_at, [business_id+sku]",
      sales: "id, business_id, reference, sold_at, sync_state, [business_id+sold_at]",
      customers: "id, business_id, name, phone, email, sync_state, [business_id+name]",
      suppliers: "id, business_id, name, phone, email, sync_state, [business_id+name]",
      purchases: "id, business_id, reference, supplier_id, product_id, received_at, sync_state, [business_id+received_at]",
      syncQueue: "++id, entity, record_id, business_id, status, created_at, [business_id+status]"
    });
    this.version(3).stores({
      products: "id, business_id, sku, barcode, name, sync_state, updated_at, [business_id+sku]",
      sales: "id, business_id, reference, sold_at, sync_state, [business_id+sold_at]",
      customers: "id, business_id, name, phone, email, sync_state, [business_id+name]",
      suppliers: "id, business_id, name, phone, email, sync_state, [business_id+name]",
      purchases: "id, business_id, reference, supplier_id, product_id, received_at, sync_state, [business_id+received_at]",
      expenses: "id, business_id, category, spent_at, sync_state, [business_id+spent_at]",
      syncQueue: "++id, entity, record_id, business_id, status, created_at, [business_id+status]"
    });
  }
}
export const localDb = new TariScanDatabase();
