"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Users, ShieldCheck, History, UserPlus, RefreshCw } from "lucide-react";

type StaffRow = { member_id:string; user_id:string; email:string; role:string; is_active:boolean; created_at:string };
type AuditRow = { id:string; action:string; entity_type:string; entity_id:string|null; created_at:string; actor_id:string|null };
const roles = [
 {value:"manager",label:"Manager",description:"Business operations and staff oversight"},
 {value:"supervisor",label:"Supervisor",description:"Sales, inventory and daily operations"},
 {value:"cashier",label:"Cashier",description:"Checkout, sales and customer records"},
 {value:"stock_clerk",label:"Stock clerk",description:"Products, stock and purchases"}
];

export default function StaffPage(){
 const [businessId,setBusinessId]=useState("");
 const [staff,setStaff]=useState<StaffRow[]>([]);
 const [logs,setLogs]=useState<AuditRow[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState("cashier");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [tab,setTab]=useState<"staff"|"audit">("staff");
 const configured=isSupabaseConfigured();

 const load=useCallback(async()=>{
  if(!configured)return;
  const id=localStorage.getItem("tariscan_business_id")||"";
  setBusinessId(id);
  if(!id){setError("No business is selected on this device. Complete business setup first.");return;}
  const supabase=createClient();
  const {data:members,error:memberError}=await supabase.rpc("list_business_members",{p_business_id:id});
  if(memberError)throw memberError;
  setStaff((members||[]) as StaffRow[]);
  const {data:audit,error:auditError}=await supabase.from("audit_logs").select("id,action,entity_type,entity_id,created_at,actor_id").eq("business_id",id).order("created_at",{ascending:false}).limit(100);
  if(auditError && !auditError.message.toLowerCase().includes("permission"))throw auditError;
  setLogs((audit||[]) as AuditRow[]);
 },[configured]);

 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:"Unable to load staff data."));},[load]);

 async function addStaff(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const {error:rpcError}=await createClient().rpc("add_business_member",{p_business_id:businessId,p_email:email.trim(),p_role:role});
   if(rpcError)throw rpcError;
   setEmail("");setNotice("Staff access has been added. The staff member can sign in with their own account.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to add staff member.");}
  finally{setBusy(false);}
 }
 async function changeAccess(row:StaffRow,nextRole:string,active:boolean){
  setError("");setNotice("");
  const {error:rpcError}=await createClient().rpc("update_business_member",{p_member_id:row.member_id,p_role:nextRole,p_is_active:active});
  if(rpcError){setError(rpcError.message);return;}
  setNotice("Staff access updated.");await load();
 }

 return <main className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">T</div><div><div className="brand-name">TariScan</div><div className="brand-subtitle">POINT OF SALE</div></div></div><div className="nav-label">MANAGEMENT</div><a className="nav-item active" href="/staff"><Users/><span>Staff & Permissions</span></a><a className="nav-item" href="/">Dashboard</a></aside>
 <div className="main-area"><header className="topbar"><div className="topbar-left"><div><div className="page-heading">Staff & Permissions</div><div className="page-subheading">Manage access to this business</div></div></div><button className="date-button" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></header>
 <div className="dashboard-content">
  <div className="welcome-row"><div><div className="welcome-title">Team access</div><div className="welcome-description">Assign roles and review business activity.</div></div><div className="stock-badge stock-good">{staff.length} members</div></div>
  {!configured&&<div className="demo-notice">Connect Supabase to activate staff management.</div>}
  {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="staff-success">{notice}</p>}
  <div className="staff-tabs"><button className={tab==="staff"?"active":""} onClick={()=>setTab("staff")}><Users size={15}/> Staff</button><button className={tab==="audit"?"active":""} onClick={()=>setTab("audit")}><History size={15}/> Audit log</button></div>
  {tab==="staff"? <div className="staff-layout">
   <section className="panel"><div className="panel-heading"><div><div className="panel-title">Add a staff member</div><div className="panel-description">The person must already have a TariScan account.</div></div><UserPlus size={19}/></div>
    <form className="auth-form" onSubmit={addStaff}><label>Staff email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="staff@example.com"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label><button disabled={busy||!businessId}>{busy?"Adding staff...":"Add staff member"}</button></form>
   </section>
   <section className="panel"><div className="panel-heading"><div><div className="panel-title">Role permissions</div><div className="panel-description">Default access by staff role</div></div><ShieldCheck size={19}/></div>
    {roles.map(r=><div className="staff-role" key={r.value}><strong>{r.label}</strong><span>{r.description}</span></div>)}
   </section>
   <section className="panel staff-members"><div className="panel-heading"><div><div className="panel-title">Business team</div><div className="panel-description">Manage active access and assigned roles</div></div></div>
    {staff.length===0?<p className="empty-state">No staff memberships found. The owner membership is created by the database migration.</p>:staff.map(row=><div className="staff-member" key={row.member_id}><div className="avatar">{row.role.slice(0,2).toUpperCase()}</div><div className="staff-member-info"><strong>{row.email}</strong><span>{row.role.replace("_"," ")} · {row.is_active?"Active":"Disabled"}</span></div>{row.role!=="owner"&&<div className="staff-controls"><select aria-label="Staff role" value={row.role} onChange={e=>void changeAccess(row,e.target.value,row.is_active)}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select><button className="staff-toggle" onClick={()=>void changeAccess(row,row.role,!row.is_active)}>{row.is_active?"Disable":"Enable"}</button></div>}</div>)}
   </section>
  </div>:<section className="panel"><div className="panel-heading"><div><div className="panel-title">Recent audit events</div><div className="panel-description">Latest 100 recorded events for this business</div></div></div>{logs.length===0?<p className="empty-state">No audit events have been recorded yet. Events will appear as audited operations are connected.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>EVENT</th><th>RECORD</th><th>ACTOR</th><th>TIME</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td>{log.action}</td><td>{log.entity_type}{log.entity_id?" · "+log.entity_id:""}</td><td>{log.actor_id?.slice(0,8)||"System"}</td><td>{new Date(log.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>}
  <div className="demo-notice">Offline note: role information is enforced by Supabase when connected. Sensitive staff administration and cloud data access require an online authenticated session. Browser-cached roles are not tamper-proof offline security.</div>
 </div></div></main>;
}
