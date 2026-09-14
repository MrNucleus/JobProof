import { Evidence, Expression, ExpressionSchema } from "./domain";

function fact(value: string) {
  return value.trim() || "待补充";
}

function expressionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

export function generateExpression(evidence: Evidence, format: Expression["format"], existingId?: string): Expression {
  const background = fact(evidence.background);
  const task = fact(evidence.task);
  const action = fact(evidence.action);
  const result = fact(evidence.result);
  const reflection = fact(evidence.reflection);
  const content = format === "resume"
    ? "• " + task + "；" + action + "；结果：" + result + "。"
    : format === "portfolio"
      ? "## 背景 / 问题\n" + background + "\n\n## 我的任务\n" + task + "\n\n## 具体过程\n" + action + "\n\n## 结果\n" + result + "\n\n## 反思与下一步\n" + reflection
      : "【Situation】" + background + "\n\n【Task】" + task + "\n\n【Action】" + action + "\n\n【Result】" + result + "\n\n面试追问：\n1. 你为什么选择这个方法？\n2. 哪一条事实最能证明结果？\n3. 如果再做一次，你会如何改进？\n\n【Reflection】" + reflection;
  return ExpressionSchema.parse({
    id: existingId || expressionId(),
    evidenceId: evidence.id,
    format,
    content,
    status: "draft",
    createdAt: new Date().toISOString()
  });
}
