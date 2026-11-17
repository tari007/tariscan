"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BusinessSetupPage() {
  const router = useRouter();
  const [businessName,setBusinessName] = useState("");
  const [businessType,setBusinessType] = useState("Retail shop");
  const [phone,setPhone] = useState("");
  const [country,setCountry] = useState("Nigeria");
  const [currency,setCurrency] = useState("NGN");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [email,setEmail] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    const loadAccountEmail = async () => {\n      const response = await supabase.auth.getUser();\n      setEmail(response.data.user?.email ?? "");\n    };\n    void loadAccountEmail();
  }, [configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Connect Supabase before saving your business profile.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Your session has expired. Sign in again.");
      const { error: saveError } = await supabase.from("businesses").insert({
        owner_id: user.id,
        name: businessName.trim(),
        business_type: businessType,
        phone: phone.trim() || null,
        country,
        currency
      });
      if (saveError) throw saveError;
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your business details.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (configured) await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <div className="auth-brand"><span className="auth-mark">T</span><span>TariScan <small>POINT OF SALE</small></span></div>
        <p className="auth-eyebrow">BUSINESS ONBOARDING</p>
        <h1>Set up your business</h1>
        <p className="auth-muted">Tell us a little about your store. You can update these details later.</p>
        {email && <p className="auth-account">Signed in as <strong>{email}</strong></p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Business name<input required maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="e.g. Tari Retail Store" /></label>
          <label>Business type<select value={businessType} onChange={e=>setBusinessType(e.target.value)}><option>Retail shop</option><option>Supermarket</option><option>Pharmacy</option><option>Wholesale / Distribution</option><option>Fashion / Clothing</option><option>Electronics</option><option>Food and beverages</option><option>Other</option></select></label>
          <label>Business phone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+234..." /></label>
          <div className="auth-two-col">
            <label>Country<select value={country} onChange={e=>setCountry(e.target.value)}><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option><option>United States</option><option>United Kingdom</option><option>Other</option></select></label>
            <label>Default currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="NGN">NGN - Naira</option><option value="GHS">GHS - Cedi</option><option value="KES">KES - Shilling</option><option value="ZAR">ZAR - Rand</option><option value="USD">USD - Dollar</option><option value="GBP">GBP - Pound</option></select></label>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Saving business..." : "Save and continue"}</button>
        </form>
        <button type="button" className="auth-link-button" onClick={signOut}>Sign out</button>
      </section>
      <p className="auth-footnote">Business information is stored securely under your owner account.</p>
    </main>
  );
}
