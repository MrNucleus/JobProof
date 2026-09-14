import { NextResponse } from "next/server";
import { z } from "zod";
import { competencyCatalog } from "@/lib/data";
import { CompetencyKey, JobAnalysis, Level, UserProfile } from "@/lib/types";
import { UserProfileSchema } from "@/lib/domain";
import { profileFingerprint } from "@/lib/profile-fingerprint";
import { calculateMatch } from "@/lib/matching";

const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

const requestSchema = z.object({
  jdText: z.string().trim().min(20).max(10000),
  profile: UserProfileSchema
}).strict();

const rules: Array<{key:CompetencyKey;terms:string[]}> = [
  {key:"research",terms:["信息搜集","资料","行业研究","市场调研"]},
  {key:"interview",terms:["用户调研","用户访谈","需求分析","用户研究"]},
  {key:"competitor",terms:["竞品","竞争分析","市场分析"]},
  {key:"data",terms:["数据","周报","指标","复盘","excel","分析"]},
  {key:"content",terms:["内容","文案","策划","公众号","视频"]},
  {key:"delivery",terms:["跟进","推进","项目进度","协作","落地"]},
  {key:"communication",terms:["沟通","表达","汇报","协调"]},
  {key:"tools",terms:["excel","飞书","figma","sql","办公工具"]}
];

function jsonResponse(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientKey(request: Request) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => { if (entry.resetAt <= now) rateLimitStore.delete(key); });
  const key = clientKey(request);
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  return { allowed: true, retryAfter: 0 };
}

function sentenceFor(text:string,term:string){return text.split(/[。；;\n]/).map(s=>s.trim()).find(s=>s.toLowerCase().includes(term.toLowerCase()))||term;}

export async function POST(request:Request){
  const rate = consumeRateLimit(request);
  if (!rate.allowed) return jsonResponse({ message: "请求过于频繁，请稍后再试。" }, 429, { "Retry-After": String(rate.retryAfter) });
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return jsonResponse({ message: "请求内容过大。" }, 413);
  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) return jsonResponse({ message: "请求内容过大。" }, 413);
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ message: "请求体必须是合法 JSON。" }, 400);
  }
  const parsed=requestSchema.safeParse(payload);
  if(!parsed.success)return jsonResponse({message:"输入格式不正确。"},400);
  const {jdText,profile}=parsed.data as {jdText:string;profile:UserProfile};
  const found=rules.flatMap(rule=>{const term=rule.terms.find(t=>jdText.toLowerCase().includes(t.toLowerCase()));if(!term)return[];const cat=competencyCatalog.find(c=>c.key===rule.key)!;const user=profile.competencies.find(c=>c.key===rule.key);return[{key:rule.key,name:cat.name,importance:/负责|熟练|必须|要求/.test(sentenceFor(jdText,term))?"must" as const:"bonus" as const,jdQuote:sentenceFor(jdText,term),userLevel:(user?.level||0) as Level,gap:Math.max(0,2-(user?.level||0))}];});
  const competencies=found.length?found:rules.slice(0,3).map(rule=>{const cat=competencyCatalog.find(c=>c.key===rule.key)!;const user=profile.competencies.find(c=>c.key===rule.key);return{key:rule.key,name:cat.name,importance:"bonus" as const,jdQuote:"JD 描述较模糊，建议人工确认",userLevel:(user?.level||0) as Level,gap:Math.max(0,2-(user?.level||0))};});
  const { score, breakdown } = calculateMatch(jdText, profile, competencies);
  const strengths=competencies.filter(c=>c.gap===0).map(c=>`${c.name}达到可独立完成小任务的水平`);
  const gaps=competencies.filter(c=>c.gap>0).map(c=>`${c.name}还缺少可验证成果`);
  const analyzedAt = new Date().toISOString();
  const title = jdText.split(/\n/).find(Boolean)?.slice(0,30)||"目标岗位";
  const result:JobAnalysis={title,summary:`识别到 ${competencies.length} 项核心能力。综合能力、证据、兴趣和约束后，当前匹配度为 ${score}%。`,competencies,matchScore:score,strengths,gaps,nextAction:gaps.length?`优先用 7 天微项目补强“${competencies.find(c=>c.gap>0)?.name}”，完成后再投递。`:"主要能力已经覆盖，可以开始针对 JD 整理简历证据。",profileFingerprint:profileFingerprint(profile),analyzedAt,breakdown,job:{id:crypto.randomUUID(),source:"manual",sourceUrl:"",company:"",title,city:"",rawText:jdText,createdAt:analyzedAt}};
  return jsonResponse(result);
}
