"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOfflineStatus } from "@/hooks/use-offline-status";

export function OfflineSyncStatus() {
  const [businessId, setBusinessId] = useState<string>();
  const { online, pending, syncing, lastMessage, syncNow } = useOfflineStatus(businessId);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    const loadBusiness = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("businesses")
          .select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (active && data?.id) setBusinessId(data.id);
      } catch {
        // Keep the status display available when cloud configuration is incomplete.
      }
    };
    void loadBusiness();
    return () => { active = false; };
  }, []);

  return (
    <div className="offline-status-wrap">
      <div className="offline-indicator" title={lastMessage}>
        {online ? <Cloud size={14} /> : <CloudOff size={14} />}
        <span>{!online ? "Offline mode" : syncing ? "Synchronising" : pending > 0 ? `${pending} changes pending` : "Connected"}</span>
        {syncing && <RefreshCw size={12} className="sync-spin" />}
      </div>
      {lastMessage && <span className="sync-message">{lastMessage}</span>}
      {online && pending > 0 && (
        <button type="button" className="sync-now-button" onClick={() => void syncNow()} disabled={syncing}>
          {syncing ? "Synchronising…" : "Sync now"}
        </button>
      )}
    </div>
  );
}
