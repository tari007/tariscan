"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Upload, ShieldCheck } from "lucide-react";
import { localDb } from "@/lib/offline/database";

const TABLES = ["products", "sales", "customers", "suppliers", "purchases", "expenses"] as const;
type TableName = typeof TABLES[number];
type BackupPayload = {
  format: "tariscan-local-backup";
  version: 1;
  createdAt: string;
  businessId: string;
  businessName: string;
  tables: Record<TableName, unknown[]>;
  syncQueue: Array<Record<string, unknown>>;
};

export default function BackupPage() {
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("Your business");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBusinessId(localStorage.getItem("tariscan_business_id") ?? "");
    setBusinessName(localStorage.getItem("tariscan_business_name") ?? "Your business");
  }, []);

  async function createBackup() {
    if (!businessId) { setError("Business profile was not found on this device. Sign in and open your business first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const tables = {} as BackupPayload["tables"];
      for (const name of TABLES) {
        tables[name] = await (localDb.table(name).where("business_id").equals(businessId).toArray());
      }
      const syncQueue = await localDb.syncQueue.where("business_id").equals(businessId).toArray();
      const backup: BackupPayload = {
        format: "tariscan-local-backup", version: 1, createdAt: new Date().toISOString(),
        businessId, businessName, tables, syncQueue: syncQueue.map(({ id, ...item }) => item as unknown as Record<string, unknown>)
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tariscan-backup-${businessId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Backup file created. Store it somewhere safe.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create backup.");
    } finally { setBusy(false); }
  }

  async function restoreBackup(file?: File) {
    if (!file) return;
    if (!businessId) { setError("Business profile was not found on this device."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupPayload>;
      if (parsed.format !== "tariscan-local-backup" || parsed.version !== 1 || parsed.businessId !== businessId || !parsed.tables || !Array.isArray(parsed.syncQueue) || typeof parsed.createdAt !== "string" || Number.isNaN(Date.parse(parsed.createdAt))) {
        throw new Error("This backup is invalid, unsupported, or belongs to a different business.");
      }
      for (const name of TABLES) {
        if (!Array.isArray(parsed.tables[name])) throw new Error(`Backup is missing the ${name} records.`);
        const rows = parsed.tables[name] as Array<Record<string, unknown>>;
        const ids = new Set<string>();
        if (rows.some(row => {
          if (!row || typeof row !== "object" || row.business_id !== businessId || typeof row.id !== "string" || !row.id || ids.has(row.id)) return true;
          ids.add(row.id);
          return false;
        })) {
          throw new Error(`The ${name} section contains invalid or duplicate business records.`);
        }
      }
      const queue = parsed.syncQueue;
      const allowedEntities = new Set<string>(TABLES);
      if (queue.some(row =>
        !row || typeof row !== "object" ||
        row.business_id !== businessId ||
        typeof row.record_id !== "string" || !row.record_id ||
        typeof row.entity !== "string" || !allowedEntities.has(row.entity) ||
        row.operation !== "upsert" ||
        !row.payload || typeof row.payload !== "object" ||
        (row.payload as Record<string, unknown>).business_id !== businessId ||
        (row.payload as Record<string, unknown>).id !== row.record_id ||
        !Number.isFinite(row.attempts) || Number(row.attempts) < 0
      )) {
        throw new Error("The backup sync queue is invalid or contains unsupported records.");
      }
      const confirmed = window.confirm("Restore this backup? It will replace this business's local records on this device. Export a fresh backup first if you need to preserve current data.");
      if (!confirmed) return;
      await localDb.transaction("rw", [...TABLES.map(name => localDb.table(name)), localDb.syncQueue], async () => {
        for (const name of TABLES) {
          const table = localDb.table(name);
          await table.where("business_id").equals(businessId).delete();
          const rows = parsed.tables![name] as Array<Record<string, unknown>>;
          if (rows.length) await table.bulkPut(rows);
        }
        await localDb.syncQueue.where("business_id").equals(businessId).delete();
        if (queue.length) {
          await localDb.syncQueue.bulkAdd(queue.map(({ id, ...item }) => ({ ...item, status: item.status === "failed" ? "failed" : "pending" })) as never[]);
        }
      });
      setMessage("Local records restored. Reconnect to continue synchronising queued changes.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore this backup.");
    } finally { setBusy(false); }
  }

  return (
    <main className="backup-page">
      <header className="backup-header">
        <Link href="/" className="backup-back"><ArrowLeft size={16} /> Dashboard</Link>
        <span className="backup-eyebrow">DATA PROTECTION</span>
        <h1>Backup and restore</h1>
        <p>Export a copy of this device's TariScan records or restore a previous backup for the same business.</p>
      </header>
      <section className="backup-card">
        <div className="backup-icon"><Download size={21} /></div>
        <h2>Create local backup</h2>
        <p>Download products, sales, customers, suppliers, purchases, expenses and the pending sync queue as a JSON file.</p>
        <button type="button" onClick={() => void createBackup()} disabled={busy || !businessId}><Download size={16} /> {busy ? "Working..." : "Download backup"}</button>
      </section>
      <section className="backup-card">
        <div className="backup-icon"><Upload size={21} /></div>
        <h2>Restore local backup</h2>
        <p>Choose a TariScan JSON backup created for this business. Restoring replaces the business's current local records on this device.</p>
        <label className="backup-file">Choose backup file<input type="file" accept="application/json,.json" disabled={busy || !businessId} onChange={event => { void restoreBackup(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
      </section>
      {message && <p className="backup-message" role="status">{message}</p>}
      {error && <p className="backup-error" role="alert">{error}</p>}
      <section className="backup-warning">
        <ShieldCheck size={19} />
        <div><strong>Important</strong><p>Backup files contain sensitive business and customer information. Keep them private and store them securely. A local backup is not a cloud backup and does not replace Supabase synchronisation.</p></div>
      </section>
      <p className="backup-business">Business: {businessName}</p>
    </main>
  );
}
