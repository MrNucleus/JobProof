import { NextResponse } from "next/server";
import { buildAuthorizationUrl, isOAuthConfigured, ZhihuOAuthError } from "@/lib/zhihu-oauth";
import { createOAuthState, STATE_COOKIE } from "@/lib/zhihu-session";
export const runtime = "nodejs";
export async function GET() {
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!isOAuthConfigured()) return NextResponse.redirect(new URL("/account?error=oauth_not_configured", fallback));
  try {
    const state = await createOAuthState();
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    const message = error instanceof ZhihuOAuthError ? error.message : "知乎登录暂时不可用。";
    return NextResponse.redirect(new URL(`/account?error=${encodeURIComponent(message)}`, fallback));
  }
}
