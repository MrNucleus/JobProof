import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/zhihu-session";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ authenticated: true, user: session.user }, { headers: { "Cache-Control": "no-store" } });
}
