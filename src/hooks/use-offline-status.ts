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
    if (!businessId) {
      setPending(0);
      return;
    }
    const pendingCount = await localDb.syncQueue
      .where("[business_id+status]")
      .anyOf([[businessId, "pending"], [businessId, "failed"]])
      .count();
    setPending(pendingCount);
  }, [businessId]);

  const syncNow = useCallback(async () => {
    if (!businessId || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncPendingChanges(businessId);
      setLastMessage(result.message);
      setPending(result.pending);
    } finally {
      setSyncing(false);
    }
  }, [businessId]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncNow();
    };
    setOnline(navigator.onLine);
    void refreshCount();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const interval = window.setInterval(() => {
      void refreshCount();
      if (navigator.onLine) void syncNow();
    }, 30000);
    const onDbChange = () => void refreshCount();
    localDb.on("changes", onDbChange);

    if (navigator.onLine) void syncNow();

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.clearInterval(interval);
      localDb.on("changes").unsubscribe(onDbChange);
    };
  }, [refreshCount, syncNow]);

  return { online, pending, syncing, lastMessage, syncNow };
}
