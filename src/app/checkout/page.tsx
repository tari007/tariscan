"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Search, ShoppingCart, WifiOff } from "lucide-react";
import { localDb, type LocalProduct, type LocalSale } from "@/lib/offline/database";
import { completeLocalSale } from "@/lib/offline/repository";

type CartLine = { product: LocalProduct; quantity: number };
const money = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 2
}).format(value);

export default function CheckoutPage() {
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("TariScan POS");
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("Walk-in Customer");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tendered, setTendered] = useState("");
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [completedSale, setCompletedSale] = useState<LocalSale | null>(null);

  const refresh = useCallback(async (id: string) => {
    const rows = await localDb.products.where("business_id").equals(id).toArray();
    setProducts(rows.filter(p => p.is_active));
  }, []);

  useEffect(() => {
    let active = true;
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    async function initialise() {
      try {
        const id = localStorage.getItem("tariscan_business_id") ?? "";
        if (!id) {
          setError("Complete business setup while connected to the internet before using checkout offline.");
          return;
        }
        if (!active) return;
        setBusinessId(id);
        setBusinessName(localStorage.getItem("tariscan_business_name") || "TariScan POS");
        await refresh(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load products.");
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
  }, [refresh]);

  const term = search.trim().toLowerCase();
  const results = useMemo(() => products.filter(p =>
    !term || [p.name, p.sku, p.barcode ?? ""].some(v => v.toLowerCase().includes(term))
  ).slice(0, 30), [products, term]);

  const subtotal = cart.reduce((sum, line) => sum + line.product.unit_price * line.quantity, 0);
  const discountValue = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.max(0, subtotal - discountValue);
  const tenderedValue = paymentMethod === "cash" ? Math.max(0, Number(tendered) || 0) : total;
  const change = Math.max(0, tenderedValue - total);

  function addProduct(product: LocalProduct) {
    setError(""); setNotice("");
    setCart(current => {
      const existing = current.find(line => line.product.id === product.id);
      if (existing) return current.map(line => line.product.id === product.id
        ? { ...line, quantity: Math.min(product.quantity, line.quantity + 1) } : line);
      if (product.quantity <= 0) return current;
      return [...current, { product, quantity: 1 }];
    });
  }

  function adjust(productId: string, amount: number) {
    setCart(current => current.flatMap(line => {
      if (line.product.id !== productId) return [line];
      const next = line.quantity + amount;
      if (next <= 0) return [];
      if (next > line.product.quantity) return [line];
      return [{ ...line, quantity: next }];
    }));
  }

  async function finishSale() {
    setError(""); setNotice("");
    if (!businessId) { setError("Business profile is not available."); return; }
    if (!cart.length) { setError("Add at least one product to the cart."); return; }
    if (paymentMethod === "cash" && tenderedValue < total) {
      setError("Amount received is less than the amount due."); return;
    }
    const now = new Date().toISOString();
    const reference = `TS-${Date.now().toString().slice(-9)}`;
    setSaving(true);
    try {
      const sale = await completeLocalSale({
        business_id: businessId,
        reference,
        customer_name: customer.trim() || "Walk-in Customer",
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discountValue.toFixed(2)),
        tax: 0,
        total: Number(total.toFixed(2)),
        payment_method: paymentMethod,
        amount_tendered: Number(tenderedValue.toFixed(2)),
        change_due: Number(change.toFixed(2)),
        items: cart.map(line => ({
          product_id: line.product.id,
          product_name: line.product.name,
          quantity: line.quantity,
          unit_price: line.product.unit_price,
          line_total: Number((line.product.unit_price * line.quantity).toFixed(2))
        })),
        sold_at: now
      });
      setCompletedSale(sale);
      setCart([]); setSearch(""); setDiscount("0"); setTendered("");
      await refresh(businessId);
      setNotice(online ? "Sale saved on this device and queued for cloud synchronisation." : "Sale completed offline. It is saved on this device and will sync when connected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete this sale.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (completedSale) {
      const handle = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(handle);
    }
  }, [completedSale]);

  return (
    <main className="checkout-page">
      <header className="checkout-header no-print">
        <div>
          <Link href="/" className="inventory-back"><ArrowLeft size={16}/> Dashboard</Link>
          <p className="inventory-eyebrow">SALES WORKSPACE</p>
          <h1>Point of Sale</h1>
          <p className="inventory-subtitle">{businessName} · Local-first checkout</p>
        </div>
        <span className={online ? "inventory-connect online" : "inventory-connect offline"}>
          {online ? "Online" : <><WifiOff size={14}/> Offline mode</>}
        </span>
      </header>

      {notice && <p className="checkout-notice no-print" role="status">{notice}</p>}
      {error && <p className="checkout-error no-print" role="alert">{error}</p>}

      <div className="checkout-grid no-print">
        <section className="checkout-panel">
          <h2>Find products</h2>
          <div className="checkout-search">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product, SKU or barcode" aria-label="Search products"/>
            <button type="button" onClick={() => {
              const exact = products.find(p => p.sku.toLowerCase() === term || (p.barcode ?? "").toLowerCase() === term);
              if (exact) addProduct(exact);
            }} disabled={!term}><Search size={15}/> Find</button>
          </div>
          {loading ? <p className="checkout-muted">Loading local product catalogue…</p> :
            !products.length ? <p className="checkout-muted">No products are saved on this device. Add products in Products &amp; Inventory first.</p> :
            !results.length ? <p className="checkout-muted">No matching products found.</p> :
            <div className="checkout-results">
              {results.map(product => <button type="button" className="checkout-product" key={product.id} onClick={() => addProduct(product)} disabled={product.quantity <= 0}>
                <span><strong>{product.name}</strong><small>{product.sku}{product.barcode ? ` · ${product.barcode}` : ""}</small><small className="checkout-stock">Stock available: {product.quantity}</small></span>
                <b>{money(product.unit_price)}</b>
              </button>)}
            </div>}
        </section>

        <section className="checkout-panel">
          <h2><ShoppingCart size={16} style={{display:"inline",verticalAlign:"-3px",marginRight:7}}/>Current sale ({cart.length})</h2>
          {!cart.length ? <p className="checkout-muted">Your cart is empty. Select products to begin a sale.</p> :
            cart.map(line => <div className="checkout-cart-row" key={line.product.id}>
              <div><div className="checkout-cart-name">{line.product.name}</div><div className="checkout-cart-meta">{money(line.product.unit_price)} each</div><div className="checkout-line-total">{money(line.product.unit_price * line.quantity)}</div></div>
              <div className="checkout-qty"><button type="button" onClick={() => adjust(line.product.id,-1)} aria-label="Decrease quantity"><Minus size={13}/></button><span>{line.quantity}</span><button type="button" onClick={() => adjust(line.product.id,1)} aria-label="Increase quantity" disabled={line.quantity >= line.product.quantity}><Plus size={13}/></button></div>
            </div>)}

          <div className="checkout-fields">
            <label className="checkout-field full">Customer name<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Walk-in Customer"/></label>
            <label className="checkout-field">Discount (₦)<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
            <label className="checkout-field">Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer (manual)</option><option value="card">Card (manual)</option></select></label>
            {paymentMethod === "cash" && <label className="checkout-field full">Amount received (₦)<input type="number" min={total} step="0.01" value={tendered} onChange={e=>setTendered(e.target.value)} placeholder={total.toFixed(2)}/></label>}
          </div>

          <div className="checkout-summary">
            <div className="checkout-total-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="checkout-total-row"><span>Discount</span><strong>- {money(discountValue)}</strong></div>
            <div className="checkout-total-row checkout-grand-total"><span>Total due</span><strong>{money(total)}</strong></div>
            {paymentMethod === "cash" && <div className="checkout-total-row"><span>Change</span><strong>{money(change)}</strong></div>}
          </div>
          <button type="button" className="checkout-pay-button" onClick={finishSale} disabled={saving || !cart.length || (paymentMethod === "cash" && tenderedValue < total)}>
            {saving ? "Completing sale…" : `Complete sale · ${money(total)}`}
          </button>
          <p className="checkout-muted" style={{marginTop:10}}>Cash, bank transfer and card are recorded as payment methods. This prototype does not process payments through a bank or payment gateway.</p>
        </section>
      </div>

      {completedSale && <section className="checkout-receipt">
        <div className="receipt-paper">
          <h2>{businessName}</h2>
          <p>SALES RECEIPT</p>
          <div className="receipt-rule"/>
          <div className="receipt-row"><span>Receipt</span><strong>{completedSale.reference}</strong></div>
          <div className="receipt-row"><span>Date</span><span>{new Date(completedSale.sold_at).toLocaleString()}</span></div>
          <div className="receipt-row"><span>Customer</span><span>{completedSale.customer_name}</span></div>
          <div className="receipt-rule"/>
          <div className="receipt-items">{completedSale.items.map((item,index)=><div className="receipt-item" key={index}><div><strong>{item.product_name}</strong><span>{money(item.line_total)}</span></div><div><span>{item.quantity} × {money(item.unit_price)}</span></div></div>)}</div>
          <div className="receipt-rule"/>
          <div className="receipt-row"><span>Subtotal</span><span>{money(completedSale.subtotal)}</span></div>
          <div className="receipt-row"><span>Discount</span><span>{money(completedSale.discount)}</span></div>
          <div className="receipt-row"><strong>TOTAL</strong><strong>{money(completedSale.total)}</strong></div>
          <div className="receipt-row"><span>Payment</span><span>{completedSale.payment_method.replace("_"," ")}</span></div>
          <div className="receipt-row"><span>Received</span><span>{money(completedSale.amount_tendered ?? completedSale.total)}</span></div>
          <div className="receipt-row"><span>Change</span><span>{money(completedSale.change_due ?? 0)}</span></div>
          <div className="receipt-rule"/>
          <p>Thank you for your patronage.</p>
        </div>
      </section>}
    </main>
  );
}
