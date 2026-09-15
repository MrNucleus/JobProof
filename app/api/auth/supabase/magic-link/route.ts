import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({ email: z.string().trim().email().max(200) }).strict();

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ message: "云端账号尚未配置。" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "请求体必须是合法 JSON。" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "请输入有效邮箱。" }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ message: "云端账号尚未配置。" }, { status: 503 });
  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/api/auth/supabase/callback?next=${encodeURIComponent("/account?cloud=connected")}` }
  });
  if (error) return NextResponse.json({ message: "登录链接发送失败，请稍后重试。" }, { status: 502 });
  return NextResponse.json({ sent: true });
}

export async function GET() {
  const config = getSupabaseConfig();
  return NextResponse.json({ configured: Boolean(config.url && config.anonKey) });
}
