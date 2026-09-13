import { NextResponse } from "next/server";
import { createOAuthState, STATE_COOKIE } from "@/lib/zhihu/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appId = process.env.ZHIHU_OAUTH_APP_ID?.trim();
  if (!appId) return NextResponse.json({ message: "缺少 ZHIHU_OAUTH_APP_ID" }, { status: 503 });

  const requestUrl = new URL(request.url);
  const redirectUri = process.env.ZHIHU_OAUTH_REDIRECT_URI?.trim() || `${requestUrl.origin}/api/auth/zhihu/callback`;
  const state = createOAuthState();
  const authorizeUrl = new URL("https://openapi.zhihu.com/authorize");
  authorizeUrl.search = new URLSearchParams({
    redirect_uri: redirectUri,
    app_id: appId,
    response_type: "code",
    state
  }).toString();

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });
  return response;
}
