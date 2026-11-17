"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName,setFullName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const configured = isSupabaseConfigured();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!configured) {
      setError("Supabase is not configured yet. Add the project URL and publishable anon key before creating accounts.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        router.replace("/setup");
        router.refresh();
      } else {
        setMessage("Your account has been created. Check your email for the confirmation link, then sign in to continue.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="auth-mark">T</span><span>TariScan <small>POINT OF SALE</small></span></Link>
        <p className="auth-eyebrow">GET STARTED</p>
        <h1>Create your account</h1>
        <p className="auth-muted">Set up your secure owner account before registering your business.</p>
        {!configured && <div className="auth-notice">Account creation is ready for connection. Supabase credentials are still required.</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Full name<input required autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" /></label>
          <label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" /></label>
          <label>Password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button type="submit" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
        </form>
        <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
      </section>
      <p className="auth-footnote">Your business data will be separated by account and protected with database access policies.</p>
    </main>
  );
}
