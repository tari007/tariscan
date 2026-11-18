"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { getSafeInternalPath } from "@/lib/security/redirect.mjs";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Authentication is not connected yet. Configure your Supabase environment variables to continue.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const destination = new URLSearchParams(window.location.search).get("next");
      const { data: { user } } = await supabase.auth.getUser();
      const { data: businesses, error: businessError } = await supabase
        .from("businesses").select("id").eq("owner_id", user?.id ?? "").limit(1);
      if (businessError) throw businessError;
      const defaultPath = businesses && businesses.length > 0 ? "/" : "/setup";
      const nextPath = getSafeInternalPath(destination, defaultPath);
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="auth-mark">T</span><span>TariScan <small>POINT OF SALE</small></span></Link>
        <p className="auth-eyebrow">WELCOME BACK</p>
        <h1>Sign in to your account</h1>
        <p className="auth-muted">Manage your store, sales and inventory from one place.</p>
        {!configured && <div className="auth-notice">Supabase setup is pending. The sign-in interface is ready, but authentication will work after the project keys are added.</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" /></label>
          <label>Password<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
        <p className="auth-switch">New to TariScan? <Link href="/register">Create an account</Link></p>
      </section>
      <p className="auth-footnote">Secure retail management · Built for connected and low-connectivity environments</p>
    </main>
  );
}
