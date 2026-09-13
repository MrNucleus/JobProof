import { NextResponse } from "next/server";
import { getFollowees } from "@/lib/zhihu/client";
import { getSession, SESSION_COOKIE } from "@/lib/zhihu/session";

export const dynamic = "force-dynamic";

function offsetFrom(url: URL) {
  const value = url.searchParams.get("offset") || "0";
  return /^\d{1,12}$/.test(value) ? value : "0";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = request.headers.get("cookie")?.match(/(?:^|; )jobproof\.zhihu\.session=([^;]+)/)?.[1];
  const session = getSession(id && decodeURIComponent(id));
  if (!session) return NextResponse.json({ message: "请先登录知乎" }, { status: 401 });
  try {
    return NextResponse.json(await getFollowees(session.accessToken, offsetFrom(url)));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "关注列表获取失败" }, { status: 502 });
  }
}
