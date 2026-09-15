import { NextResponse } from "next/server";
import { z } from "zod";
import { CompetencyKeySchema } from "@/lib/domain";
import { isUserDataConfigured, searchZhihu, type ZhihuSearchItem, ZhihuOAuthError } from "@/lib/zhihu-oauth";

export const runtime = "nodejs";

const RequestSchema = z.object({
  jdTitle: z.string().trim().min(1).max(120),
  targetCompetency: CompetencyKeySchema,
  targetName: z.string().trim().min(1).max(40),
  theme: z.string().trim().max(80).optional()
}).strict();

const competencyQueries: Record<z.infer<typeof CompetencyKeySchema>, string> = {
  research: "信息搜集 用户研究",
  interview: "用户访谈 用户调研",
  competitor: "竞品分析 产品对比",
  data: "数据整理 数据分析",
  content: "内容策划 内容运营",
  delivery: "项目推进 运营协作",
  communication: "表达汇报 项目复盘",
  tools: "Excel 飞书 Figma 实习"
};

function shorten(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function sourceScore(item: ZhihuSearchItem) {
  const authority = Number(item.authorityLevel) || 0;
  return authority * 100 + Math.log10(item.voteUpCount + item.commentCount + 1) * 10;
}

function toCandidate(item: ZhihuSearchItem, targetName: string, index: number) {
  const excerpt = shorten(item.contentText || item.title, 180);
  const source = {
    provider: "zhihu" as const,
    sourceId: item.contentId || item.url,
    title: item.title,
    url: item.url,
    excerpt,
    authorName: item.authorName || "知乎用户",
    authorityLevel: item.authorityLevel || "未标注",
    engagement: item.voteUpCount + item.commentCount,
    retrievedAt: new Date().toISOString()
  };
  return {
    id: `zhihu-${item.contentId || index}`,
    title: `${targetName}实践：${shorten(item.title, 30)}`,
    problem: excerpt || "从真实讨论中提炼一个可验证的问题。",
    rationale: `基于知乎${item.contentType || "内容"}，把真实讨论转化为一次可交付的${targetName}练习。`,
    suggestedTheme: shorten(item.title, 38),
    difficulty: index === 0 ? "推荐" : index === 1 ? "可尝试" : "拓展",
    source
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "请求体必须是合法 JSON。" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "缺少有效的 JD 标题或目标能力。" }, { status: 400 });
  if (!isUserDataConfigured()) {
    return NextResponse.json({
      configured: false,
      code: "missing_access_secret",
      candidates: [],
      message: "之所以出现这个提示，是因为当前运行环境没有配置 ZHIHU_ACCESS_SECRET。知乎登录用的 App Key 只负责 OAuth 登录，不能调用知乎站内搜索；请在本地 .env.local 或 Netlify 的 Production 环境变量中配置 Access Secret，然后重启或重新部署。"
    });
  }

  const query = `${competencyQueries[parsed.data.targetCompetency]} ${parsed.data.jdTitle}${parsed.data.theme ? ` ${parsed.data.theme}` : ""}`.trim();
  try {
    const items = (await searchZhihu(query, 8)).sort((a, b) => sourceScore(b) - sourceScore(a));
    return NextResponse.json({
      configured: true,
      query,
      candidates: items.slice(0, 3).map((item, index) => toCandidate(item, parsed.data.targetName, index))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof ZhihuOAuthError ? error.message : "知乎选题检索失败，请稍后重试。";
    const status = error instanceof ZhihuOAuthError ? error.status : 502;
    return NextResponse.json({ configured: true, candidates: [], message }, { status });
  }
}
