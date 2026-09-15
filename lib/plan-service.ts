import { competencyCatalog } from "./data";
import { CompetencyKey, JobAnalysis, Plan, ProjectSource, Task, UserProfile } from "./domain";
import { profileFingerprint } from "./profile-fingerprint";

type DurationDays = 7 | 14;
type PlanInput = {
  analysis: JobAnalysis;
  profile: UserProfile;
  targetCompetency: CompetencyKey;
  durationDays: DurationDays;
  theme: string;
  sources?: ProjectSource[];
};

type PracticeTemplate = {
  challenge: string;
  method: string;
  artifact: string;
  sample: string;
  quality: string;
  result: string;
};

const practiceTemplates: Record<CompetencyKey, PracticeTemplate> = {
  research: { challenge: "回答一个真实行业或用户问题", method: "制定关键词、来源优先级和交叉验证规则", artifact: "带引用的研究简报", sample: "整理至少 8 个可靠来源并标注发布日期", quality: "关键结论至少由 2 个独立来源支持", result: "输出 3 条有依据的洞察和 1 条行动建议" },
  interview: { challenge: "验证一组真实用户需求", method: "设计非诱导式提纲和受访者筛选标准", artifact: "访谈记录与需求结论", sample: "完成 3–5 次访谈并保留用户原话", quality: "区分事实、观点和自己的推断", result: "归纳 Top 3 问题并说明优先级依据" },
  competitor: { challenge: "判断同类产品的差异和机会", method: "建立用户、场景、功能和商业模式对比框架", artifact: "竞品矩阵与机会建议", sample: "深度体验并比较 3–5 个竞品", quality: "每个判断附页面、数据或使用记录", result: "提出 2 条有证据支持的差异化建议" },
  data: { challenge: "用数据回答一个可验证的业务问题", method: "定义字段、清洗规则和核心指标", artifact: "数据表、图表与结论", sample: "整理至少 30 条真实或公开数据", quality: "保留原始数据并说明异常值处理方式", result: "用 2–3 个指标解释现象并提出下一步动作" },
  content: { challenge: "为明确受众完成一次内容验证", method: "确定受众、信息目标、渠道和衡量指标", artifact: "内容成品与发布复盘", sample: "产出 2 个版本并收集真实反馈", quality: "内容主张与受众痛点一一对应", result: "根据阅读、互动或访谈反馈总结优化点" },
  delivery: { challenge: "推动一个小型协作任务按期完成", method: "拆分里程碑、责任人、风险和同步节奏", artifact: "项目看板与复盘", sample: "邀请至少 2 位协作者参与真实交付", quality: "每个任务有负责人、截止时间和完成定义", result: "说明进度偏差、处理动作和最终交付结果" },
  communication: { challenge: "让目标对象理解并采纳一个建议", method: "分析听众、组织论点并准备事实支撑", artifact: "书面方案与 90 秒口头表达", sample: "向至少 3 位目标听众演示并收集反馈", quality: "结论、证据和行动请求清晰对应", result: "记录听众理解度和采纳/质疑情况" },
  tools: { challenge: "用岗位常见工具解决一个真实任务", method: "先定义流程，再选择 Excel、飞书或 Figma 等工具", artifact: "可复用模板或自动化流程", sample: "邀请至少 2 位同学实际使用", quality: "保留输入、操作步骤和输出结果", result: "对比使用前后的时间、错误或协作效率" }
};

function entityId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function allocateMinutes(total: number, ratios: number[]) {
  let assigned = 0;
  return ratios.map((ratio, index) => {
    if (index === ratios.length - 1) return Math.max(1, total - assigned);
    const minutes = Math.max(1, Math.floor(total * ratio));
    assigned += minutes;
    return minutes;
  });
}

export function getPlanBudget(profile: UserProfile, durationDays: DurationDays) {
  return Math.max(60, Math.floor(profile.weeklyHours * 60 * durationDays / 7));
}

export function generatePlan(input: PlanInput): Plan {
  const { analysis, profile, targetCompetency, durationDays } = input;
  const target = analysis.competencies.find(item => item.key === targetCompetency) || analysis.competencies[0];
  const competencyName = competencyCatalog.find(item => item.key === targetCompetency)?.name || "目标能力";
  const template = practiceTemplates[targetCompetency];
  const theme = input.theme.trim() || "校园产品或服务";
  const totalMinutes = getPlanBudget(profile, durationDays);
  const quote = target?.jdQuote || "";
  const longPlan = durationDays === 14;
  const ratios = longPlan ? [0.1, 0.13, 0.17, 0.12, 0.2, 0.14, 0.14] : [0.14, 0.18, 0.3, 0.18, 0.2];
  const minutes = allocateMinutes(totalMinutes, ratios);
  const days = longPlan
    ? ["DAY 1", "DAY 2–3", "DAY 4–5", "DAY 6–7", "DAY 8–10", "DAY 11–12", "DAY 13–14"]
    : ["DAY 1", "DAY 2", "DAY 3–4", "DAY 5", "DAY 6–7"];
  const shared = { competencyKeys: [targetCompetency] as CompetencyKey[], jdQuote: quote };
  const definitions = [
    {
      title: "定义真实问题与成功标准",
      instruction: "围绕“" + theme + "”选择一个具体对象，目标是" + template.challenge + "。先写清现状、对象和验证问题。",
      deliverable: "1 页问题定义、目标对象和成功标准",
      acceptanceCriteria: ["问题来自真实场景", "成功标准可以被观察或计数", "明确本项目不解决什么"]
    },
    {
      title: "设计执行方法",
      instruction: template.method + "，并把步骤压缩到当前时间预算内。",
      deliverable: "执行清单、使用模板和时间安排",
      acceptanceCriteria: ["每一步有明确动作和输出", "方法能回到 JD 原文要求", "总用时不超过计划预算"]
    },
    {
      title: longPlan ? "完成第一轮真实实践" : "完成核心真实实践",
      instruction: template.sample + "，过程中同步保留原始记录，不只写事后总结。",
      deliverable: template.artifact + "（第一版）",
      acceptanceCriteria: [template.quality, "能说明本人完成的动作", "原始记录可追溯"]
    },
    ...(longPlan ? [{
      title: "中期复盘与修正",
      instruction: "检查第一轮记录中最薄弱的环节，邀请一位同学按验收标准给出反馈，并修改执行方案。",
      deliverable: "问题清单、同伴反馈和修订版方案",
      acceptanceCriteria: ["至少记录 3 个具体问题", "反馈来自真实他人", "说明接受或拒绝建议的理由"]
    }, {
      title: "完成第二轮验证",
      instruction: "按修订方案再次实践，重点验证第一轮仍不确定的结论。",
      deliverable: template.artifact + "（验证版）",
      acceptanceCriteria: [template.quality, "新一轮结果与旧结果可对比", "补齐最关键的事实缺口"]
    }] : []),
    {
      title: "整理结果与证据",
      instruction: template.result + "，同时标注哪些是事实、哪些仍是待验证判断。",
      deliverable: "结果摘要、关键数字和证据索引",
      acceptanceCriteria: ["至少包含一个可核验结果", "结论能回链原始记录", "没有数字时明确标记待补充"]
    },
    {
      title: "完成交付与表达",
      instruction: "将过程整理成一页案例，并用 90 秒讲清背景、个人任务、具体动作、结果和反思。",
      deliverable: "一页案例 + 90 秒讲解稿",
      acceptanceCriteria: ["个人贡献清晰", "不虚构结果或数字", "能回答证据来自哪里"]
    }
  ];
  const now = new Date().toISOString();
  const tasks: Task[] = definitions.map((definition, index) => ({
    id: entityId(),
    day: days[index],
    title: definition.title,
    instruction: definition.instruction,
    deliverable: definition.deliverable,
    estimatedMinutes: minutes[index],
    status: "todo",
    acceptanceCriteria: definition.acceptanceCriteria,
    ...shared
  }));

  return {
    id: entityId(),
    title: durationDays + " 天" + competencyName + "证据冲刺",
    targetCompetency,
    durationDays,
    tasks,
    createdAt: now,
    updatedAt: now,
    goal: "针对“" + analysis.title + "”的要求，在“" + theme + "”场景中产出可核验的" + competencyName + "证据。",
    status: "draft",
    profileFingerprint: profileFingerprint(profile),
    analysisFingerprint: analysis.profileFingerprint + ":" + analysis.analyzedAt,
    startedAt: null,
    theme,
    jobTitle: analysis.title,
    totalMinutes,
    sources: input.sources || []
  };
}
