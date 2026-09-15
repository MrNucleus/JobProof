import { z } from "zod";

export const LevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

export const InterestSchema = z.enum(["like", "neutral", "dislike"]);
export const CompetencyKeySchema = z.enum([
  "research",
  "interview",
  "competitor",
  "data",
  "content",
  "delivery",
  "communication",
  "tools"
]);

export const CompetencyProfileSchema = z.object({
  key: CompetencyKeySchema,
  level: LevelSchema,
  evidenceLevel: LevelSchema,
  interest: InterestSchema,
  evidenceNote: z.string().max(300)
});

export const UserProfileSchema = z.object({
  name: z.string().min(1).max(40),
  grade: z.string().min(1).max(20),
  major: z.string().min(1).max(60),
  cities: z.string().max(120),
  weeklyHours: z.number().int().min(1).max(80),
  roleFamilies: z.array(z.string().min(1)).max(8),
  competencies: z.array(CompetencyProfileSchema).length(8)
});

export const JobCompetencySchema = z.object({
  key: CompetencyKeySchema,
  name: z.string(),
  importance: z.enum(["must", "bonus"]),
  jdQuote: z.string(),
  userLevel: LevelSchema,
  gap: z.number().int().min(0).max(3)
});

export const JobSchema = z.object({
  id: z.string().uuid(),
  source: z.string().min(1).max(40),
  sourceUrl: z.string().url().or(z.literal("")),
  company: z.string().max(120),
  title: z.string().min(1).max(120),
  city: z.string().max(80),
  rawText: z.string().min(20).max(10000),
  createdAt: z.string()
});

export const MatchBreakdownSchema = z.object({
  coverage: z.number().min(0).max(100),
  evidence: z.number().min(0).max(100),
  preference: z.number().min(0).max(100),
  constraints: z.number().min(0).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  explanations: z.object({
    coverage: z.string(),
    evidence: z.string(),
    preference: z.string(),
    constraints: z.string()
  })
});

export const JobAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  analysisMode: z.enum(["ai", "rules"]).optional(),
  analysisNotice: z.string().max(300).optional(),
  analysisModel: z.string().max(80).optional(),
  competencies: z.array(JobCompetencySchema),
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  nextAction: z.string(),
  profileFingerprint: z.string(),
  analyzedAt: z.string(),
  job: JobSchema.optional(),
  breakdown: MatchBreakdownSchema.optional()
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  day: z.string(),
  title: z.string(),
  instruction: z.string(),
  deliverable: z.string(),
  estimatedMinutes: z.number().int().positive(),
  status: z.enum(["todo", "doing", "done"]),
  competencyKeys: z.array(CompetencyKeySchema).default([]),
  jdQuote: z.string().default(""),
  acceptanceCriteria: z.array(z.string()).default([])
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  targetCompetency: CompetencyKeySchema,
  durationDays: z.union([z.literal(7), z.literal(14)]),
  tasks: z.array(TaskSchema),
  createdAt: z.string(),
  goal: z.string().default(""),
  status: z.enum(["draft", "active", "completed"]).default("draft"),
  profileFingerprint: z.string().default(""),
  analysisFingerprint: z.string().default(""),
  startedAt: z.string().nullable().default(null),
  updatedAt: z.string().default(""),
  theme: z.string().default(""),
  jobTitle: z.string().default(""),
  totalMinutes: z.number().int().nonnegative().default(0),
  sources: z.array(z.object({
    provider: z.literal("zhihu"),
    sourceId: z.string().min(1),
    title: z.string(),
    url: z.string().url(),
    excerpt: z.string().max(300),
    authorName: z.string(),
    authorityLevel: z.string(),
    engagement: z.number().int().nonnegative(),
    retrievedAt: z.string()
  })).default([])
});

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  title: z.string(),
  competencyKeys: z.array(CompetencyKeySchema),
  background: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  reflection: z.string(),
  url: z.string().url().or(z.literal("")),
  status: z.enum(["draft", "needs_more_facts", "ready"]),
  createdAt: z.string(),
  completeness: z.object({
    background: z.boolean(),
    task: z.boolean(),
    action: z.boolean(),
    result: z.boolean(),
    reflection: z.boolean()
  }),
  completenessScore: z.number().int().min(0).max(100)
});

export const ExpressionSchema = z.object({
  id: z.string().uuid(),
  evidenceId: z.string().uuid(),
  format: z.enum(["resume", "portfolio", "interview"]),
  content: z.string(),
  status: z.enum(["draft", "confirmed"]),
  createdAt: z.string()
});

export type Level = z.infer<typeof LevelSchema>;
export type Interest = z.infer<typeof InterestSchema>;
export type CompetencyKey = z.infer<typeof CompetencyKeySchema>;
export type CompetencyProfile = z.infer<typeof CompetencyProfileSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type JobCompetency = z.infer<typeof JobCompetencySchema>;
export type Job = z.infer<typeof JobSchema>;
export type MatchBreakdown = z.infer<typeof MatchBreakdownSchema>;
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type ProjectSource = z.infer<typeof PlanSchema>["sources"][number];
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Expression = z.infer<typeof ExpressionSchema>;
