import { NextResponse } from "next/server";
import { getHotList } from "@/lib/zhihu/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 20;
  try {
    return NextResponse.json({ items: await getHotList(limit) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "热榜获取失败" }, { status: 502 });
  }
}
