import { NextResponse } from "next/server";
import { exchangeAuthorizationCode, fetchZhihuUser, ZhihuOAuthError } from "@/lib/zhihu-oauth";
import { consumeOAuthState, createSession, STATE_COOKIE, SESSION_COOKIE } from "@/lib/zhihu-session";
export const runtime = "nodejs";
function accountUrl(request: Request, query: string) { return new URL(`/account?${query}`, request.url); }
export async function GET(request: Request) {
  const url = new URL(request.url), state = url.searchParams.get("state") || "";
  const cookieState = request.headers.get("cookie")?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1];
  if (!await consumeOAuthState(state, cookieState)) return NextResponse.redirect(accountUrl(request, "error=invalid_state"));
  const code = url.searchParams.get("authorization_code") || url.searchParams.get("code") || "";
  const providerError = url.searchParams.get("error");
  if (providerError && !code) return NextResponse.redirect(accountUrl(request, `error=${encodeURIComponent(`知乎授权未完成：${providerError}`)}`));
  if (!code || code.length > 2048) return NextResponse.redirect(accountUrl(request, "error=missing_code"));
  try {
    const token = await exchangeAuthorizationCode(code), user = await fetchZhihuUser(token.accessToken), sessionId = await createSession(token, user);
    const response = NextResponse.redirect(accountUrl(request, "login=success"));
    response.cookies.set(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: Math.max(60, Math.floor((token.expiresAt - Date.now()) / 1000)), path: "/" });
    response.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    const message = error instanceof ZhihuOAuthError ? error.message : "知乎登录失败，请稍后重试。";
    return NextResponse.redirect(accountUrl(request, `error=${encodeURIComponent(message)}`));
  }
}
