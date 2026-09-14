import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, authenticated: false }, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null }, error: new Error("Supabase is unavailable") };

  if (error || !data.user) {
    return NextResponse.json({ configured: true, authenticated: false }, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  return NextResponse.json({
    configured: true,
    authenticated: true,
    user: {
      id: data.user.id,
      email: data.user.email || "",
      createdAt: data.user.created_at
    }
  }, { headers: { "Cache-Control": "no-store" } });
}
