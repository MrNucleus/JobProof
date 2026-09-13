import { Evidence, EvidenceSchema } from "./domain";

export const evidenceFields = [
  { key: "background", label: "背景 / 问题", hint: "发生了什么，为什么值得解决？" },
  { key: "task", label: "个人任务", hint: "这次成果中你负责什么？" },
  { key: "action", label: "具体动作", hint: "你实际做了哪些步骤、用了什么方法或工具？" },
  { key: "result", label: "结果 / 数字", hint: "发生了什么变化？没有数字也可以写观察到的结果。" },
  { key: "reflection", label: "反思 / 下一步", hint: "你学到了什么，下一轮会怎么改？" }
] as const;

export type EvidenceDraft = Pick<Evidence, "planId" | "taskId" | "title" | "competencyKeys" | "background" | "task" | "action" | "result" | "reflection" | "url">;

export function evaluateEvidence(input: Pick<Evidence, "background" | "task" | "action" | "result" | "reflection">) {
  const completeness = {
    background: input.background.trim().length > 0,
    task: input.task.trim().length > 0,
    action: input.action.trim().length > 0,
    result: input.result.trim().length > 0,
    reflection: input.reflection.trim().length > 0
  };
  const completenessScore = Math.round(Object.values(completeness).filter(Boolean).length / evidenceFields.length * 100);
  return { completeness, completenessScore };
}

export function prepareEvidence(input: EvidenceDraft, existingId?: string): Evidence {
  const evaluated = evaluateEvidence(input);
  return EvidenceSchema.parse({
    ...input,
    id: existingId || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: evaluated.completenessScore === 100 ? "ready" : evaluated.completenessScore > 0 ? "needs_more_facts" : "draft",
    ...evaluated
  });
}
