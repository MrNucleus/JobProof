import { NextResponse } from "next/server";
import { z } from "zod";
import { UserProfileSchema } from "@/lib/domain";
import { fromCloudProfile, toCloudCompetencies, toCloudProfile, type CloudCompetencyRow, type CloudProfileRow } from "@/lib/supabase/profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SaveProfileSchema = z.object({
  profile: UserProfileSchema,
  onboardingStatus: z.enum(["in_progress", "profile_ready", "first_action_selected"]).default("in_progress")
}).strict();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

async function currentContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, unavailable: true } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, unavailable: false } as const;
  return { supabase, user: data.user, unavailable: false } as const;
}

export async function GET() {
  const context = await currentContext();
  if (context.unavailable) return json({ message: "云端数据尚未配置。" }, 503);
  if (!context.user || !context.supabase) return json({ message: "请先登录云端账号。" }, 401);

  const { data: profileRow, error: profileError } = await context.supabase
    .from("profiles")
    .select("*")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (profileError) return json({ message: "云端画像读取失败。" }, 502);
  if (!profileRow) return json({ profile: null, onboardingStatus: "in_progress" });

  const { data: competencyRows, error: competencyError } = await context.supabase
    .from("profile_competencies")
    .select("*")
    .eq("profile_id", profileRow.id);
  if (competencyError) return json({ message: "云端能力数据读取失败。" }, 502);

  try {
    const profile = fromCloudProfile(profileRow as CloudProfileRow, (competencyRows || []) as CloudCompetencyRow[]);
    return json({ profile, onboardingStatus: profileRow.onboarding_status || "in_progress", updatedAt: profileRow.updated_at });
  } catch {
    return json({ message: "云端画像数据格式异常，请重新保存。" }, 502);
  }
}

export async function PUT(request: Request) {
  const context = await currentContext();
  if (context.unavailable) return json({ message: "云端数据尚未配置。" }, 503);
  if (!context.user || !context.supabase) return json({ message: "请先登录云端账号。" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "请求体必须是合法 JSON。" }, 400);
  }
  const candidate = body && typeof body === "object" && "profile" in body
    ? body
    : { profile: body, onboardingStatus: "in_progress" };
  const parsed = SaveProfileSchema.safeParse(candidate);
  if (!parsed.success) return json({ message: "画像字段不完整或格式不正确。" }, 400);

  const { profile, onboardingStatus } = parsed.data;
  const { data: profileRow, error: profileError } = await context.supabase
    .from("profiles")
    .upsert(toCloudProfile(context.user.id, profile, onboardingStatus), { onConflict: "user_id" })
    .select("*")
    .single();
  if (profileError || !profileRow) return json({ message: "云端画像保存失败。" }, 502);

  const competencyRows = toCloudCompetencies(profileRow.id, profile);
  const { error: competencyError } = await context.supabase
    .from("profile_competencies")
    .upsert(competencyRows, { onConflict: "profile_id,competency_key" });
  if (competencyError) return json({ message: "云端能力数据保存失败。" }, 502);

  return json({ profile, onboardingStatus: profileRow.onboarding_status || "in_progress", syncedAt: profileRow.updated_at || new Date().toISOString() });
}
