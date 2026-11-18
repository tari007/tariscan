"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Search, RotateCcw } from "lucide-react";
import { localDb, type LocalSale } from "@/lib/offline/database";
import { refundLocalSale } from "@/lib/offline/repository";

const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:2}).format(n);
const day=(value:string)=>new Date(value).toLocaleDateString();
export default function SalesPage(){
 const [businessId,setBusinessId]=useState("");
 const [sales,setSales]=useState<LocalSale[]>([]);
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [payment,setPayment]=useState("all");
 const [status,setStatus]=useState("all");
 const [from,setFrom]=useState("");
 const [to,setTo]=useState("");
 const [selected,setSelected]=useState<LocalSale|null>(null);
 const [refundReason,setRefundReason]=useState("");
 const [refundTarget,setRefundTarget]=useState<LocalSale|null>(null);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const refresh=useCallback(async(id:string)=>{
  const rows=await localDb.sales.where("business_id").equals(id).toArray();
  rows.sort((a,b)=>new Date(b.sold_at).getTime()-new Date(a.sold_at).getTime());
  setSales(rows);
 },[]);
 useEffect(()=>{
  let active=true;
  async function load(){
   const id=localStorage.getItem("tariscan_business_id")||"";
   if(!id){setError("Business profile not found. Complete setup while online first.");setLoading(false);return;}
   setBusinessId(id);
   try{await refresh(id);}catch(e){setError(e instanceof Error?e.message:"Unable to load sales.");}
   if(active)setLoading(false);
  }
  void load();return()=>{active=false;};
 },[refresh]);

 const filtered=useMemo(()=>sales.filter(s=>{
  const text=query.trim().toLowerCase();
  const matchText=!text||[s.reference,s.customer_name].some(v=>v.toLowerCase().includes(text));
  const matchPayment=payment==="all"||s.payment_method===payment;
  const matchStatus=status==="all"||(status==="refunded"?s.status==="refunded":s.status!=="refunded");
  const date=s.sold_at.slice(0,10);
  return matchText&&matchPayment&&matchStatus&&(!from||date>=from)&&(!to||date<=to);
 }),[sales,query,payment,status,from,to]);

 const completed=sales.filter(s=>s.status!=="refunded");
 const revenue=completed.reduce((sum,s)=>sum+s.total,0);
 const refunded=sales.filter(s=>s.status==="refunded").reduce((sum,s)=>sum+(s.refunded_amount??s.total),0);

 async function confirmRefund(){
  if(!refundTarget)return;
  setError("");setNotice("");
  try{
   await refundLocalSale(refundTarget.id,refundReason);
   setRefundTarget(null);setRefundReason("");
   await refresh(businessId);
   setNotice("Refund recorded. The full sale amount has been marked refunded and stock has been restored locally.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to process refund.");}
 }
 function printReceipt(sale:LocalSale){setSelected(sale);window.setTimeout(()=>window.print(),250);}

 return <main className="sales-page">
  <header className="sales-header no-print">
   <div><Link href="/" className="inventory-back"><ArrowLeft size={16}/> Dashboard</Link><p className="inventory-eyebrow">TRANSACTION MANAGEMENT</p><h1>Sales History</h1><p className="inventory-subtitle">Search, review, print receipts and manage refunds</p></div>
   <Link href="/checkout" className="checkout-primary">New sale</Link>
  </header>
  {notice&&<p className="checkout-notice no-print">{notice}</p>}
  {error&&<p className="checkout-error no-print">{error}</p>}
  <section className="sales-summary no-print">
   <div className="sales-summary-card"><span>Completed transactions</span><strong>{completed.length}</strong></div>
   <div className="sales-summary-card"><span>Recorded sales revenue</span><strong>{money(revenue)}</strong></div>
   <div className="sales-summary-card"><span>Refunded amount</span><strong>{money(refunded)}</strong></div>
  </section>
  <section className="sales-filters no-print">
   <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search receipt reference or customer"/>
   <select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All payment methods</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="credit">Customer credit</option></select>
   <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="refunded">Refunded</option></select>
   <div style={{display:"flex",gap:7}}><input type="date" aria-label="From date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" aria-label="To date" value={to} onChange={e=>setTo(e.target.value)}/></div>
  </section>
  {refundTarget&&<section className="refund-box no-print"><strong>Refund {refundTarget.reference}?</strong><p>This is a full refund of {money(refundTarget.total)}. Inventory quantities sold in this transaction will be restored. This action cannot be reversed from this screen.</p><input className="refund-reason" value={refundReason} onChange={e=>setRefundReason(e.target.value)} placeholder="Reason for refund (required)"/><div className="refund-controls"><button className="refund-confirm" onClick={confirmRefund}>Confirm full refund</button><button className="refund-cancel" onClick={()=>{setRefundTarget(null);setRefundReason("");}}>Cancel</button></div></section>}
  <section className="sales-table-panel no-print"><div className="table-wrap"><table className="sales-table"><thead><tr><th>TRANSACTION</th><th>CUSTOMER</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
   {loading?<tr><td colSpan={7} className="sales-empty">Loading local sales…</td></tr>:filtered.length===0?<tr><td colSpan={7} className="sales-empty">No matching transactions found on this device.</td></tr>:filtered.map(s=><tr key={s.id}><td><div className="sales-reference">{s.reference}</div><div className="sales-secondary">{s.items.length} item line(s)</div></td><td>{s.customer_name}</td><td>{day(s.sold_at)}</td><td>{s.payment_method.replace("_"," ")}</td><td><strong>{money(s.total)}</strong></td><td><span className={s.status==="refunded"?"sales-status refunded":"sales-status"}>{s.status==="refunded"?"Refunded":"Completed"}</span></td><td><div className="sales-actions"><button className="sales-action" onClick={()=>printReceipt(s)}><Printer size={12}/> Receipt</button>{s.status!=="refunded"&&<button className="sales-action danger" onClick={()=>{setRefundTarget(s);setRefundReason("");}}><RotateCcw size={12}/> Refund</button>}</div></td></tr>)}
  </tbody></table></div></section>
  {selected&&<section className="sales-receipt"><div className="receipt-paper"><h2>TariScan POS</h2><p>SALES RECEIPT</p><div className="receipt-rule"/><div className="receipt-row"><span>Receipt</span><strong>{selected.reference}</strong></div><div className="receipt-row"><span>Date</span><span>{new Date(selected.sold_at).toLocaleString()}</span></div><div className="receipt-row"><span>Customer</span><span>{selected.customer_name}</span></div><div className="receipt-rule"/>{selected.items.map((item,i)=><div className="receipt-item" key={i}><div><strong>{item.product_name}</strong><span>{money(item.line_total)}</span></div><div><span>{item.quantity} × {money(item.unit_price)}</span></div></div>)}<div className="receipt-rule"/><div className="receipt-row"><span>Subtotal</span><span>{money(selected.subtotal)}</span></div><div className="receipt-row"><span>Discount</span><span>{money(selected.discount)}</span></div><div className="receipt-row"><strong>TOTAL</strong><strong>{money(selected.total)}</strong></div><div className="receipt-row"><span>Payment</span><span>{selected.payment_method.replace("_"," ")}</span></div><div className="receipt-row"><span>Amount received</span><span>{money(selected.amount_tendered??selected.total)}</span></div><div className="receipt-row"><span>Change</span><span>{money(selected.change_due??0)}</span></div>{selected.status==="refunded"&&<><div className="receipt-rule"/><p>REFUNDED · {selected.refund_reason}</p></>}<div className="receipt-rule"/><p>Thank you for your patronage.</p></div></section>}
 </main>;
}
