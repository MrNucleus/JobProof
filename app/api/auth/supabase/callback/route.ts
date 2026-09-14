import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const origin = url.origin;

  if (!code) return NextResponse.redirect(new URL("/account?error=cloud_auth_missing_code", origin));
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/account?error=cloud_auth_not_configured", origin));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/account?error=${encodeURIComponent("云端账号登录失败，请重新获取登录链接。")}`, origin));
  return NextResponse.redirect(new URL(safeNext, origin));
}
