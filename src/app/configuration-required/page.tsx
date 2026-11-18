import Link from "next/link";

export default function ConfigurationRequiredPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#f4f6fa", color: "#172033" }}>
      <section style={{ width: "100%", maxWidth: "620px", padding: "clamp(24px, 5vw, 42px)", borderRadius: "22px", background: "#fff", boxShadow: "0 18px 55px rgba(20, 35, 65, .09)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "13px", background: "#e9efff", color: "#2449a5", fontWeight: 800, fontSize: "22px" }}>T</div>
        <p style={{ margin: "24px 0 8px", color: "#52658a", fontSize: "12px", fontWeight: 800, letterSpacing: ".14em" }}>TARISCAN POS · SETUP REQUIRED</p>
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 5vw, 36px)", lineHeight: 1.15 }}>Connect your Supabase project</h1>
        <p style={{ marginTop: "14px", color: "#596579", lineHeight: 1.7 }}>TariScan is deployed, but its authentication database has not been configured correctly. Add the two public Supabase project values below, then redeploy the application.</p>
        <ol style={{ paddingLeft: "22px", color: "#344054", lineHeight: 1.9 }}>
          <li>Create or open your project in Supabase.</li>
          <li>Copy the Project URL and publishable key from the project's Connect dialog or Settings → API Keys.</li>
          <li>Add these variables to your Vercel project under Settings → Environment Variables:</li>
        </ol>
        <pre style={{ overflowX: "auto", padding: "16px", borderRadius: "12px", background: "#101828", color: "#e5edff", fontSize: "13px", lineHeight: 1.8 }}>NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</pre>
        <p style={{ color: "#596579", lineHeight: 1.7 }}>Use only the public publishable key in this browser application. Never add a Supabase secret or service-role key to a NEXT_PUBLIC variable or client-side code.</p>
        <p style={{ marginBottom: 0, color: "#596579", lineHeight: 1.7 }}>After adding the variables, redeploy and run the database migrations listed in the project README.</p>
        <p style={{ marginTop: "24px" }}><Link href="https://supabase.com/dashboard" style={{ color: "#2449a5", fontWeight: 700 }}>Open Supabase Dashboard ↗</Link></p>
      </section>
    </main>
  );
}
