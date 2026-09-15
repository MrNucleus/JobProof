import { NextResponse } from "next/server";
import { getHotList, ZhihuOAuthError } from "@/lib/zhihu-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 20;
  try {
    return NextResponse.json(
      { items: await getHotList(limit) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status = error instanceof ZhihuOAuthError ? error.status : 502;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "热榜获取失败" },
      { status }
    );
  }
}
