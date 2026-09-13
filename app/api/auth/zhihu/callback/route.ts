import { NextResponse } from "next/server";
import { exchangeCode, getOAuthUser } from "@/lib/zhihu/client";
import { createSession, SESSION_COOKIE, STATE_COOKIE, validateOAuthState } from "@/lib/zhihu/session";

export const dynamic = "force-dynamic";

function redirectWithError(origin: string, message: string) {
  const url = new URL("/zhihu-profile", origin);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("authorization_code") || url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const cookieState = request.headers.get("cookie")?.match(/(?:^|; )jobproof\.zhihu\.oauth_state=([^;]+)/)?.[1];
  if (!code) return redirectWithError(url.origin, "知乎授权未返回授权码");
  if (!state || !cookieState || !validateOAuthState(state, decodeURIComponent(cookieState))) {
    return redirectWithError(url.origin, "登录请求已失效，请重新发起知乎授权");
  }

  try {
    const redirectUri = process.env.ZHIHU_OAUTH_REDIRECT_URI?.trim() || `${url.origin}/api/auth/zhihu/callback`;
    const token = await exchangeCode(code, redirectUri);
    const user = await getOAuthUser(token.accessToken);
    const sessionId = createSession(token.accessToken, token.expiresIn, user);
    const response = NextResponse.redirect(new URL("/zhihu-profile", url.origin));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: token.expiresIn
    });
    return response;
  } catch (error) {
    return redirectWithError(url.origin, error instanceof Error ? error.message : "知乎登录失败");
  }
}
