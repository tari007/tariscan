import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { localDb, type SyncQueueItem } from "./database";

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
  message: string;
}

let activeSync: Promise<SyncResult> | null = null;

export function syncPendingChanges(businessId: string): Promise<SyncResult> {
  if (activeSync) return activeSync;
  activeSync = runSync(businessId).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function runSync(businessId: string): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, pending: await countQueue(businessId), message: "Device is offline" };
  }
  if (!isSupabaseConfigured()) {
    return { synced: 0, failed: 0, pending: await countQueue(businessId), message: "Cloud sync is not configured" };
  }

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { synced: 0, failed: 0, pending: await countQueue(businessId), message: "Sign in to synchronise" };
  }

  const { data: ownedBusiness, error: businessError } = await supabase
    .from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();

  if (businessError || !ownedBusiness) {
    return { synced: 0, failed: 0, pending: await countQueue(businessId), message: "Business access could not be verified" };
  }

  const queue = await localDb.syncQueue
    .where("[business_id+status]")
    .anyOf([[businessId, "pending"], [businessId, "failed"]])
    .sortBy("created_at");

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    await localDb.syncQueue.update(item.id!, { status: "failed" });
    try {
      await pushItem(supabase, item);
      await localDb.transaction("rw", localDb.syncQueue, localDb.products, localDb.sales, async () => {
        await localDb.syncQueue.delete(item.id!);
        if (item.entity === "products") await localDb.products.update(item.record_id, { sync_state: "synced" });
        if (item.entity === "sales") await localDb.sales.update(item.record_id, { sync_state: "synced" });
      });
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown synchronisation error";
      await localDb.syncQueue.update(item.id!, {
        status: "failed",
        attempts: (item.attempts ?? 0) + 1,
        last_error: message
      });
      failed += 1;
    }
  }

  const pending = await countQueue(businessId);
  return {
    synced,
    failed,
    pending,
    message: failed > 0 ? "Some records need attention" : pending === 0 ? "All local changes are synchronised" : "More changes remain"
  };
}

async function pushItem(supabase: ReturnType<typeof createClient>, item: SyncQueueItem) {
  const table = item.entity;
  const payload = { ...item.payload, business_id: item.business_id };
  delete (payload as Record<string, unknown>).sync_state;

  const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

async function countQueue(businessId: string) {
  const pending = await localDb.syncQueue.where("[business_id+status]").equals([businessId, "pending"]).count();
  const failed = await localDb.syncQueue.where("[business_id+status]").equals([businessId, "failed"]).count();
  return pending + failed;
}
