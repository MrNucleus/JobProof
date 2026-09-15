import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE, clearExpiredAuthState } from "@/lib/zhihu-session";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const sessionId = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  await deleteSession(sessionId); await clearExpiredAuthState();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
