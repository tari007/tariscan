"use client";

import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useOfflineStatus } from "@/hooks/use-offline-status";

export function OfflineSyncStatus({ businessId }: { businessId?: string }) {
  const { online, pending, syncing, lastMessage, syncNow } = useOfflineStatus(businessId);

  return (
    <div className="offline-status-wrap">
      <div className="offline-indicator" title={lastMessage}>
        {online ? <Cloud size={14} /> : <CloudOff size={14} />}
        <span>{!online ? "Offline mode" : syncing ? "Synchronising" : pending > 0 ? `${pending} changes pending` : "Connected"}</span>
        {syncing && <RefreshCw size={12} className="sync-spin" />}
      </div>
      {online && pending > 0 && (
        <button type="button" className="sync-now-button" onClick={() => void syncNow()} disabled={syncing}>
          Sync now
        </button>
      )}
    </div>
  );
}
