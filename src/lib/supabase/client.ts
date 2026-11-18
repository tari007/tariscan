import { createBrowserClient } from "@supabase/ssr";

let supabaseClient: ReturnType<typeof createBrowserClient> | undefined;

function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();

  if (!url || !key) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment variables.");
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient(url, key);
  }

  return supabaseClient;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    getSupabasePublicKey()
  );
}
