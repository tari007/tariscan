"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Barcode, PackagePlus, Pencil, Search, Trash2, WifiOff } from "lucide-react";
import { localDb, type LocalProduct } from "@/lib/offline/database";
import { saveLocalProduct } from "@/lib/offline/repository";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ProductForm = {
  name: string; sku: string; barcode: string; category: string;
  cost_price: string; unit_price: string; quantity: string; reorder_level: string;
};
const emptyForm: ProductForm = {
  name: "", sku: "", barcode: "", category: "", cost_price: "0",
  unit_price: "0", quantity: "0", reorder_level: "5"
};

export default function ProductsPage() {
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("Your business");
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);

  const refreshProducts = useCallback(async (id: string) => {
    const rows = await localDb.products.where("business_id").equals(id).toArray();
    rows.sort((a,b) => a.name.localeCompare(b.name));
    setProducts(rows);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    let active = true;
    async function initialise() {
      try {
        let id = localStorage.getItem("tariscan_business_id") ?? "";
        setBusinessName(localStorage.getItem("tariscan_business_name") ?? "Your business");
        if (isSupabaseConfigured() && navigator.onLine) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from("businesses").select("id,name")
              .eq("owner_id", user.id).limit(1).maybeSingle();
            if (data?.id) {
              id = data.id;
              localStorage.setItem("tariscan_business_id", id);
              setBusinessName(data.name || "Your business");
            }
          }
        }
        if (!id) {
          setError("No business profile is available on this device yet. Connect to the internet, sign in and complete business setup once before using inventory offline.");
          return;
        }
        if (!active) return;
        setBusinessId(id);
        await refreshProducts(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load the local inventory.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => {
      active = false;
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [refreshProducts]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p => [p.name,p.sku,p.barcode ?? "",p.category ?? ""].some(v => v.toLowerCase().includes(term)));
  }, [products, search]);

  function updateField(key: keyof ProductForm, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!businessId) { setError("Business profile is not loaded."); return; }
    if (!form.name.trim() || !form.sku.trim()) { setError("Product name and SKU are required."); return; }
    const unitPrice = Number(form.unit_price), costPrice = Number(form.cost_price);
    const quantity = Number(form.quantity), reorder = Number(form.reorder_level);
    if ([unitPrice,costPrice,quantity,reorder].some(n => !Number.isFinite(n) || n < 0)) {
      setError("Prices and stock values must be valid non-negative numbers."); return;
    }
    setSaving(true);
    try {
      await saveLocalProduct({
        id: editingId ?? undefined, business_id: businessId,
        name: form.name.trim(), sku: form.sku.trim(),
        barcode: form.barcode.trim() || null, category: form.category.trim() || null,
        cost_price: costPrice, unit_price: unitPrice, quantity,
        reorder_level: reorder, is_active: true
      });
      await refreshProducts(businessId);
      setForm(emptyForm); setEditingId(null);
      setNotice(navigator.onLine
        ? "Product saved on this device. It is queued for cloud synchronisation."
        : "Product saved on this device while offline. It will sync when connection is available.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save product.");
    } finally { setSaving(false); }
  }

  function editProduct(product: LocalProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name, sku: product.sku, barcode: product.barcode ?? "",
      category: product.category ?? "", cost_price: String(product.cost_price),
      unit_price: String(product.unit_price), quantity: String(product.quantity),
      reorder_level: String(product.reorder_level)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(product: LocalProduct) {
    if (!window.confirm(`Delete ${product.name} from this device?`)) return;
    await localDb.products.delete(product.id);
    await refreshProducts(businessId);
    setNotice("Product removed from this device. Cloud deletion is not yet enabled.");
  }

  const currency = (value: number) => new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 2
  }).format(value);

  return (
    <main className="inventory-page">
      <header className="inventory-header">
        <div>
          <Link href="/" className="inventory-back"><ArrowLeft size={16}/> Dashboard</Link>
          <p className="inventory-eyebrow">INVENTORY MANAGEMENT</p>
          <h1>Products &amp; Inventory</h1>
          <p className="inventory-subtitle">{businessName} · Local-first product catalogue</p>
        </div>
        <span className={online ? "inventory-connect online" : "inventory-connect offline"}>
          {online ? "Online" : <><WifiOff size={14}/> Offline mode</>}
        </span>
      </header>

      {notice && <p className="inventory-notice" role="status">{notice}</p>}
      {error && <p className="inventory-error" role="alert">{error}</p>}

      <section className="inventory-card">
        <div className="inventory-card-heading">
          <div><h2>{editingId ? "Edit product" : "Add a product"}</h2><p>Changes are stored locally first.</p></div>
          <PackagePlus size={22}/>
        </div>
        <form className="inventory-form" onSubmit={handleSubmit}>
          <label>Product name<input required value={form.name} onChange={e=>updateField("name",e.target.value)} placeholder="e.g. Peak Milk 400g"/></label>
          <label>SKU / Product code<input required value={form.sku} onChange={e=>updateField("sku",e.target.value)} placeholder="e.g. MILK-400"/></label>
          <label>Barcode<input value={form.barcode} onChange={e=>updateField("barcode",e.target.value)} placeholder="Scan or enter barcode"/></label>
          <label>Category<input value={form.category} onChange={e=>updateField("category",e.target.value)} placeholder="e.g. Groceries"/></label>
          <label>Cost price (₦)<input type="number" min="0" step="0.01" value={form.cost_price} onChange={e=>updateField("cost_price",e.target.value)}/></label>
          <label>Selling price (₦)<input required type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>updateField("unit_price",e.target.value)}/></label>
          <label>Opening stock<input type="number" min="0" step="0.001" value={form.quantity} onChange={e=>updateField("quantity",e.target.value)}/></label>
          <label>Low-stock alert level<input type="number" min="0" step="0.001" value={form.reorder_level} onChange={e=>updateField("reorder_level",e.target.value)}/></label>
          <div className="inventory-form-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update product" : "Save product"}</button>
            {editingId && <button type="button" className="inventory-cancel" onClick={()=>{setEditingId(null);setForm(emptyForm);}}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="inventory-card">
        <div className="inventory-list-heading">
          <div><h2>Product catalogue</h2><p>{products.length} products stored on this device</p></div>
          <div className="inventory-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, SKU or barcode"/></div>
        </div>
        {loading ? <p className="inventory-empty">Loading local inventory…</p> :
          visibleProducts.length === 0 ? <div className="inventory-empty"><Barcode size={26}/><p>{products.length ? "No products match your search." : "No products yet. Add your first product above."}</p></div> :
          <div className="inventory-table-wrap"><table className="inventory-table">
            <thead><tr><th>PRODUCT</th><th>SKU</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>{visibleProducts.map(product=><tr key={product.id}>
              <td><strong>{product.name}</strong><small>{product.category || "Uncategorised"}</small></td>
              <td>{product.sku}</td><td>{currency(product.unit_price)}</td><td>{product.quantity}</td>
              <td><span className={product.quantity <= product.reorder_level ? "inventory-low" : "inventory-good"}>{product.quantity <= product.reorder_level ? "Low stock" : "In stock"}</span></td>
              <td><div className="inventory-actions"><button type="button" aria-label={`Edit ${product.name}`} onClick={()=>editProduct(product)}><Pencil size={15}/></button><button type="button" aria-label={`Delete ${product.name}`} onClick={()=>void deleteProduct(product)}><Trash2 size={15}/></button></div></td>
            </tr>)}</tbody>
          </table></div>
        }
      </section>
      <p className="inventory-footnote">Build 4 foundation: product creation, editing, local search and stock alerts. Barcode camera scanning and cloud deletion/synchronisation are scheduled for later builds.</p>
    </main>
  );
}
