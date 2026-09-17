import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const oauthError = searchParams.get("error");
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, site));
    }
  }

  const login = new URL("/login", site);
  login.searchParams.set("error", "oauth");
  if (oauthError) login.searchParams.set("reason", oauthError);
  return NextResponse.redirect(login);
}
