import { NextResponse } from "next/server";
import { getContents, ZhihuOAuthError } from "@/lib/zhihu-oauth";
import { getSession, SESSION_COOKIE } from "@/lib/zhihu-session";
export const runtime = "nodejs";
function sessionFrom(request: Request) { const id = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]; return getSession(id); }
export async function GET(request: Request) {
  const session = sessionFrom(request); if (!session) return NextResponse.json({ message: "请先登录知乎。" }, { status: 401 });
  const url = new URL(request.url), rawOffset = url.searchParams.get("offset") || "0", rawLimit = url.searchParams.get("limit") || "10", n = Number(rawLimit), offset = /^\d{1,12}$/.test(rawOffset) ? rawOffset : "0", limit = Number.isInteger(n) ? String(Math.min(50, Math.max(1, n))) : "10";
  try { return NextResponse.json(await getContents(session.token.accessToken, offset, limit), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { const status = error instanceof ZhihuOAuthError ? error.status : 502; return NextResponse.json({ message: error instanceof Error ? error.message : "创作列表加载失败。" }, { status }); }
}
