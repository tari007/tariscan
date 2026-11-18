"use client";

import { useCallback, useEffect, useState } from "react";
import { localDb } from "@/lib/offline/database";
import { syncPendingChanges } from "@/lib/offline/sync";

export function useOfflineStatus(businessId?: string) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState("Waiting for connection");

  const refreshCount = useCallback(async () => {
    if (!businessId) { setPending(0); return; }
    const count = await localDb.syncQueue
      .where("[business_id+status]")
      .anyOf([[businessId, "pending"], [businessId, "failed"]])
      .count();
    setPending(count);
  }, [businessId]);

  const syncNow = useCallback(async () => {
    if (!businessId || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncPendingChanges(businessId);
      setLastMessage(result.message);
      setPending(result.pending);
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : "Sync could not complete");
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [businessId, refreshCount]);

  useEffect(() => {
    const updateOnline = () => {
      const connected = navigator.onLine;
      setOnline(connected);
      if (connected) void syncNow();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setOnline(navigator.onLine);
        void refreshCount();
        if (navigator.onLine) void syncNow();
      }
    };
    setOnline(navigator.onLine);
    void refreshCount();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    document.addEventListener("visibilitychange", onVisible);
    if (navigator.onLine) void syncNow();
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount, syncNow]);

  return { online, pending, syncing, lastMessage, syncNow };
}
