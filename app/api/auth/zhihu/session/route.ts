import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/zhihu/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = request.headers.get("cookie")?.match(/(?:^|; )jobproof\.zhihu\.session=([^;]+)/)?.[1];
  const session = getSession(id && decodeURIComponent(id));
  return NextResponse.json(session ? { authenticated: true, user: session.user } : { authenticated: false });
}
