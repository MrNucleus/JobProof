import "server-only";

import { z } from "zod";
import { CompetencyKeySchema, type CompetencyKey } from "@/lib/domain";

const LLM_TIMEOUT_MS = 15_000;
const DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_LLM_MODEL = "gpt-4o-mini";

const AiCompetencySchema = z.object({
  key: CompetencyKeySchema,
  importance: z.enum(["must", "bonus"]),
  jdQuote: z.string().trim().min(1).max(240),
  rationale: z.string().trim().max(300).optional()
}).strict();

const AiJobExtractionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().max(500).optional(),
  competencies: z.array(AiCompetencySchema).min(1).max(8)
}).strict();

export type AiJobExtraction = z.infer<typeof AiJobExtractionSchema>;

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export class LlmJobAnalyzerError extends Error {
  constructor(
    message: string,
    public readonly kind: "timeout" | "request" | "invalid_output" | "unavailable" = "request"
  ) {
    super(message);
    this.name = "LlmJobAnalyzerError";
  }
}

export function getLlmConfig(): LlmConfig {
  return {
    apiKey: process.env.LLM_API_KEY?.trim() || "",
    baseUrl: (process.env.LLM_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL).replace(/\/+$/, ""),
    model: process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL
  };
}

export function isLlmConfigured() {
  return Boolean(getLlmConfig().apiKey);
}

function redactSensitive(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[邮箱已脱敏]")
    .replace(/(?<!\d)(?:1[3-9]\d{9})(?!\d)/g, "[手机号已脱敏]")
    .replace(/(?<!\d)(?:\d{17}[\dXx]|\d{15})(?!\d)/g, "[证件号已脱敏]");
}

function systemPrompt() {
  return `你是 JobProof 的 JD 结构化抽取器。你的任务是从用户提供的岗位描述中提取与产品/运营实习相关的能力要求。

只允许使用以下能力 key：
- research：信息搜集
- interview：用户访谈
- competitor：竞品分析
- data：数据整理
- content：内容策划
- delivery：项目推进
- communication：表达与汇报
- tools：工具使用

规则：
1. 只能从 JD 原文抽取能力，不能根据常识补充 JD 没有提到的能力。
2. 每项能力必须带一段来自 JD 的原文引用 jdQuote，不能编造或改写成不存在的句子。
3. 明确职责、硬性要求、熟练要求通常标记 must；协助、优先、有经验者优先通常标记 bonus。
4. 如果岗位描述较短，只返回能被原文支持的能力。
5. 只返回 JSON，不要 Markdown，不要解释 JSON 之外的内容。

JSON 格式：
{"title":"岗位标题（可选）","summary":"一句话岗位概述（可选）","competencies":[{"key":"data","importance":"must","jdQuote":"来自 JD 的原文","rationale":"不超过一句话的判断依据（可选）"}]}`;
}

function userPrompt(jdText: string) {
  return `请分析以下岗位描述。原文可能包含个人联系方式，已在发送前脱敏；不要输出任何联系方式。\n\n${redactSensitive(jdText)}`;
}

function extractContent(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length) return "";
  const message = choices[0] && typeof choices[0] === "object"
    ? (choices[0] as { message?: unknown }).message
    : null;
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((item): item is { text: string } => Boolean(item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"))
      .map(item => item.text)
      .join("\n")
      .trim();
  }
  return "";
}

function parseJson(content: string): unknown {
  const withoutFence = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start < 0 || end <= start) throw new LlmJobAnalyzerError("AI 返回的内容不是有效 JSON。", "invalid_output");
    try {
      return JSON.parse(withoutFence.slice(start, end + 1));
    } catch {
      throw new LlmJobAnalyzerError("AI 返回的内容不是有效 JSON。", "invalid_output");
    }
  }
}

export async function analyzeJobWithLlm(jdText: string): Promise<AiJobExtraction> {
  const config = getLlmConfig();
  if (!config.apiKey) throw new LlmJobAnalyzerError("尚未配置 AI 模型密钥。", "unavailable");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(jdText) }
        ]
      }),
      signal: controller.signal,
      cache: "no-store"
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmJobAnalyzerError("AI 分析超时。", "timeout");
    }
    throw new LlmJobAnalyzerError("无法连接 AI 分析服务。", "request");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new LlmJobAnalyzerError("AI 模型密钥无效或没有调用权限。", "request");
    }
    if (response.status === 429) {
      throw new LlmJobAnalyzerError("AI 服务当前受到频率或额度限制。", "request");
    }
    throw new LlmJobAnalyzerError("AI 分析服务暂时不可用。", "request");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new LlmJobAnalyzerError("AI 返回了无法解析的响应。", "invalid_output");
  }
  const content = extractContent(body);
  if (!content) throw new LlmJobAnalyzerError("AI 没有返回分析内容。", "invalid_output");
  const parsed = AiJobExtractionSchema.safeParse(parseJson(content));
  if (!parsed.success) throw new LlmJobAnalyzerError("AI 返回的能力结构不符合要求。", "invalid_output");

  const unique = new Map<CompetencyKey, AiJobExtraction["competencies"][number]>();
  parsed.data.competencies.forEach(item => {
    if (!unique.has(item.key)) unique.set(item.key, item);
  });
  return { ...parsed.data, competencies: Array.from(unique.values()) };
}
