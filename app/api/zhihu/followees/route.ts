import { NextResponse } from "next/server";
import { getFollowees, ZhihuOAuthError } from "@/lib/zhihu-oauth";
import { getSession, SESSION_COOKIE } from "@/lib/zhihu-session";
export const runtime = "nodejs";
async function sessionFrom(request: Request) { const id = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]; return getSession(id); }
function paging(request: Request) { const url = new URL(request.url), rawOffset = url.searchParams.get("offset") || "0", rawLimit = url.searchParams.get("limit") || "10", n = Number(rawLimit); return { offset: /^\d{1,12}$/.test(rawOffset) ? rawOffset : "0", limit: Number.isInteger(n) ? String(Math.min(50, Math.max(1, n))) : "10" }; }
export async function GET(request: Request) {
  const session = await sessionFrom(request); if (!session) return NextResponse.json({ message: "请先登录知乎。" }, { status: 401 });
  try { const { offset, limit } = paging(request); return NextResponse.json(await getFollowees(session.token.accessToken, offset, limit), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { const status = error instanceof ZhihuOAuthError ? error.status : 502; return NextResponse.json({ message: error instanceof Error ? error.message : "关注列表加载失败。" }, { status }); }
}
