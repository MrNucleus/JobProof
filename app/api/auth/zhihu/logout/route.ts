import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/zhihu/session";

export async function POST(request: Request) {
  const id = request.headers.get("cookie")?.match(/(?:^|; )jobproof\.zhihu\.session=([^;]+)/)?.[1];
  deleteSession(id && decodeURIComponent(id));
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
