"use client";

import { z } from "zod";
import { defaultProfile } from "./data";
import {
  Evidence,
  EvidenceSchema,
  Expression,
  ExpressionSchema,
  JobAnalysis,
  JobAnalysisSchema,
  Plan,
  PlanSchema,
  Task,
  TaskSchema,
  UserProfile,
  UserProfileSchema
} from "./domain";

const SCHEMA_VERSION = 2;
const PROFILE_V1_KEY = "jobproof.profile.v1";
const ANALYSIS_V1_KEY = "jobproof.analysis.v1";
const PROFILE_V2_KEY = "jobproof.v2.profile";
const ANALYSIS_V2_KEY = "jobproof.v2.analysis";
const PLANS_V2_KEY = "jobproof.v2.plans";
const EVIDENCE_V2_KEY = "jobproof.v2.evidence";
const EXPRESSIONS_V2_KEY = "jobproof.v2.expressions";
const LEGACY_PLAN_STARTED_KEY = "jobproof.plan.started";
const LEGACY_PLAN_TASKS_KEY = "jobproof.plan.tasks";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const envelope = z.object({
      schemaVersion: z.literal(SCHEMA_VERSION),
      updatedAt: z.string(),
      data: z.unknown()
    }).safeParse(JSON.parse(raw));
    if (!envelope.success) return null;
    const data = schema.safeParse(envelope.data.data);
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, schema: z.ZodType<T>, data: T) {
  if (typeof window === "undefined") return;
  const valid = schema.parse(data);
  window.localStorage.setItem(key, JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: valid
  }));
}

function readCollection<T>(key: string, itemSchema: z.ZodType<T>): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const envelope = z.object({
      schemaVersion: z.literal(SCHEMA_VERSION),
      updatedAt: z.string(),
      data: z.array(z.unknown())
    }).safeParse(JSON.parse(raw));
    if (!envelope.success) return [];
    return envelope.data.data.flatMap(item => {
      const parsed = itemSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, itemSchema: z.ZodType<T>, items: T[]) {
  if (typeof window === "undefined") return;
  const valid = z.array(itemSchema).parse(items);
  window.localStorage.setItem(key, JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: valid
  }));
}

function migrateLegacyPlan(): Plan[] {
  if (typeof window === "undefined") return [];
  const started = window.localStorage.getItem(LEGACY_PLAN_STARTED_KEY) === "true";
  let completed: Record<string, boolean> = {};
  try { completed = JSON.parse(window.localStorage.getItem(LEGACY_PLAN_TASKS_KEY) || "{}"); } catch { completed = {}; }
  if (!started && !Object.values(completed).some(Boolean)) return [];
  const now = new Date().toISOString();
  const plan: Plan = PlanSchema.parse({
    id: createId(),
    title: "7 天用户访谈微项目",
    targetCompetency: "interview",
    durationDays: 7,
    goal: "完成一轮真实用户访谈，形成可追溯的需求验证证据。",
    status: "active",
    profileFingerprint: "",
    analysisFingerprint: "",
    startedAt: now,
    updatedAt: now,
    createdAt: now,
    tasks: [
      { id: createId(), day: "DAY 1", title: "明确问题与访谈对象", instruction: "选择一个校园产品场景，写出目标用户和需要验证的 3 个假设。", deliverable: "1 页访谈计划 + 5 位目标用户名单", estimatedMinutes: 50, status: completed.scope ? "done" : "todo", competencyKeys: ["interview"], jdQuote: "" },
      { id: createId(), day: "DAY 2", title: "设计访谈提纲", instruction: "围绕真实行为设计 6–8 个开放问题，避免诱导式提问。", deliverable: "一份可直接使用的访谈提纲", estimatedMinutes: 50, status: completed.guide ? "done" : "todo", competencyKeys: ["interview"], jdQuote: "" },
      { id: createId(), day: "DAY 3–4", title: "完成 5 次用户访谈", instruction: "记录用户原话、行为、问题和现有替代方案。", deliverable: "5 份原始记录，至少保留 10 条用户原话", estimatedMinutes: 120, status: completed.talk ? "done" : "todo", competencyKeys: ["interview", "communication"], jdQuote: "" },
      { id: createId(), day: "DAY 5", title: "整理共性需求", instruction: "对记录做归类，区分高频问题与个别意见。", deliverable: "需求聚类表 + Top 3 问题", estimatedMinutes: 60, status: completed.cluster ? "done" : "todo", competencyKeys: ["interview", "data"], jdQuote: "" },
      { id: createId(), day: "DAY 6–7", title: "输出结论与建议", instruction: "提出 2 条可执行建议，并说明证据和优先级。", deliverable: "1 页结论 + 90 秒讲解", estimatedMinutes: 60, status: completed.report ? "done" : "todo", competencyKeys: ["communication"], jdQuote: "" }
    ]
  });
  writeCollection(PLANS_V2_KEY, PlanSchema, [plan]);
  return [plan];
}

function readLegacy<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const profileRepository = {
  get(): UserProfile {
    const current = read(PROFILE_V2_KEY, UserProfileSchema);
    if (current) return current;
    const legacy = readLegacy(PROFILE_V1_KEY, UserProfileSchema);
    if (legacy) {
      write(PROFILE_V2_KEY, UserProfileSchema, legacy);
      return legacy;
    }
    return UserProfileSchema.parse(defaultProfile);
  },
  save(profile: UserProfile) {
    write(PROFILE_V2_KEY, UserProfileSchema, profile);
  }
};

export const analysisRepository = {
  get(): JobAnalysis | null {
    const current = read(ANALYSIS_V2_KEY, JobAnalysisSchema);
    if (current) return current;
    const legacy = readLegacy(ANALYSIS_V1_KEY, JobAnalysisSchema);
    if (legacy) {
      write(ANALYSIS_V2_KEY, JobAnalysisSchema, legacy);
      return legacy;
    }
    return null;
  },
  save(analysis: JobAnalysis) {
    write(ANALYSIS_V2_KEY, JobAnalysisSchema, analysis);
  }
};

export const planRepository = {
  list(): Plan[] {
    const current = readCollection(PLANS_V2_KEY, PlanSchema);
    return current.length ? current as Plan[] : migrateLegacyPlan();
  },
  get(id: string): Plan | null {
    return this.list().find(plan => plan.id === id) || null;
  },
  save(plan: Plan) {
    const next = [...this.list().filter(item => item.id !== plan.id), PlanSchema.parse({ ...plan, updatedAt: new Date().toISOString() })];
    writeCollection(PLANS_V2_KEY, PlanSchema, next);
  },
  updateTask(planId: string, taskId: string, status: Task["status"]): Plan | null {
    const plan = this.get(planId);
    if (!plan) return null;
    const tasks = plan.tasks.map(task => task.id === taskId ? { ...task, status } : task);
    const next = PlanSchema.parse({ ...plan, tasks, status: tasks.every(task => task.status === "done") ? "completed" : plan.status === "draft" ? "active" : plan.status });
    this.save(next);
    return next;
  }
};

export const evidenceRepository = {
  list(): Evidence[] { return readCollection(EVIDENCE_V2_KEY, EvidenceSchema); },
  get(id: string): Evidence | null { return this.list().find(item => item.id === id) || null; },
  save(evidence: Evidence) {
    const next = [...this.list().filter(item => item.id !== evidence.id), EvidenceSchema.parse(evidence)];
    writeCollection(EVIDENCE_V2_KEY, EvidenceSchema, next);
  },
  create(input: Omit<Evidence, "id" | "createdAt" | "status">): Evidence {
    const evidence = EvidenceSchema.parse({ ...input, id: createId(), createdAt: new Date().toISOString(), status: "draft" });
    this.save(evidence);
    return evidence;
  }
};

export const expressionRepository = {
  list(): Expression[] { return readCollection(EXPRESSIONS_V2_KEY, ExpressionSchema); },
  get(id: string): Expression | null { return this.list().find(item => item.id === id) || null; },
  save(expression: Expression) {
    const next = [...this.list().filter(item => item.id !== expression.id), ExpressionSchema.parse(expression)];
    writeCollection(EXPRESSIONS_V2_KEY, ExpressionSchema, next);
  }
};

export const createPlan = (plan: Omit<Plan, "id" | "createdAt" | "updatedAt">) => {
  const now = new Date().toISOString();
  const next = PlanSchema.parse({ ...plan, id: createId(), createdAt: now, updatedAt: now });
  planRepository.save(next);
  return next;
};

export const loadProfile = () => profileRepository.get();
export const saveProfile = (profile: UserProfile) => profileRepository.save(profile);
export const loadAnalysis = () => analysisRepository.get();
export const saveAnalysis = (analysis: JobAnalysis) => analysisRepository.save(analysis);

