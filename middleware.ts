import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function hasValidSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();
  if (!url || !key || key.startsWith("YOUR_")) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.hostname === "localhost") &&
      Boolean(parsed.hostname) && !parsed.hostname.includes("YOUR_PROJECT_ID");
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!hasValidSupabaseConfig()) {
    if (path === "/configuration-required") return NextResponse.next();
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = "/configuration-required";
    setupUrl.search = "";
    return NextResponse.redirect(setupUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = getSupabasePublicKey()!;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  const isPublicRoute = path === "/login" || path === "/register" || path.startsWith("/auth/") || path === "/configuration-required";
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }
  if (user && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
