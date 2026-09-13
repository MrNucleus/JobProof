"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { competencyCatalog } from "@/lib/data";
import { evidenceFields, evaluateEvidence, prepareEvidence } from "@/lib/evidence-service";
import { evidenceRepository, loadAnalysis, loadProfile, planRepository } from "@/lib/repository";
import { Evidence, Plan, UserProfile } from "@/lib/types";

type Draft = {
  title: string;
  background: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  url: string;
};

const emptyDraft: Draft = { title: "", background: "", task: "", action: "", result: "", reflection: "", url: "" };

function queryValue(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function EvidencePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [saved, setSaved] = useState<Evidence[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const currentProfile = loadProfile();
    const currentPlanId = queryValue("planId");
    const currentTaskId = queryValue("taskId");
    const currentPlan = (currentPlanId ? planRepository.get(currentPlanId) : planRepository.list()[0]) || null;
    const existing = evidenceRepository.list();
    setProfile(currentProfile);
    setPlan(currentPlan);
    setSaved(existing);
    const task = currentPlan?.tasks.find(item => item.id === currentTaskId) || currentPlan?.tasks.find(item => item.status === "done") || currentPlan?.tasks[0];
    if (task) setDraft({ ...emptyDraft, title: task.title + " · 成果记录", task: task.deliverable });
  }, []);

  const evaluated = useMemo(() => evaluateEvidence(draft), [draft]);
  const planTask = plan ? plan.tasks.find(task => task.id === queryValue("taskId")) : null;
  const targetName = plan ? competencyCatalog.find(item => item.key === plan.targetCompetency)?.name || "目标能力" : "目标能力";

  function update(field: keyof Draft, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setNotice("");
  }

  function save(status: "draft" | "submit") {
    if (!profile) return;
    const sourceTask = planTask || plan?.tasks[0];
    const competencyKeys = sourceTask?.competencyKeys.length ? sourceTask.competencyKeys : plan ? [plan.targetCompetency] : [];
    const evidence = prepareEvidence({
      planId: plan?.id || null,
      taskId: sourceTask?.id || null,
      title: draft.title.trim() || "未命名成果",
      competencyKeys,
      background: draft.background,
      task: draft.task,
      action: draft.action,
      result: draft.result,
      reflection: draft.reflection,
      url: draft.url.trim()
    }, editingId);
    const finalEvidence = status === "draft" ? { ...evidence, status: "draft" as const } : evidence;
    evidenceRepository.save(finalEvidence);
    setSaved(evidenceRepository.list());
    setEditingId(finalEvidence.id);
    setNotice(status === "draft" ? "草稿已保存，可稍后继续补充。" : finalEvidence.status === "ready" ? "证据已提交，可用于生成求职表达。" : "已提交，但还有事实待补充。");
  }

  function edit(item: Evidence) {
    setEditingId(item.id);
    setDraft({ title: item.title, background: item.background, task: item.task, action: item.action, result: item.result, reflection: item.reflection, url: item.url });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <>
    <div className="section-head" style={{ marginTop: 0 }}><div><h1 className="page-title">证据工作台</h1><p className="page-subtitle" style={{ marginBottom: 0 }}>把任务过程记录成可追溯的事实，不替自己编造结果。</p></div><Link className="btn btn-secondary" href="/plan">返回微项目</Link></div>
    <div className="evidence-layout">
      <section className="card panel evidence-editor">
        <div className="evidence-context"><span className="step-kicker">PROOF RECORD</span><b>{plan?.title || "独立成果记录"}</b><small>{targetName} · {plan?.theme || "请关联一个真实场景"}</small></div>
        <div className="field"><label>成果标题</label><input value={draft.title} onChange={event => update("title", event.target.value)} placeholder="例如：校园二手交易访谈记录" maxLength={100}/></div>
        {evidenceFields.map(field => <div className="field evidence-field" key={field.key}><div className="evidence-label-row"><label htmlFor={"evidence-" + field.key}>{field.label}</label><span className={draft[field.key].trim() ? "field-state filled" : "field-state"}>{draft[field.key].trim() ? "已填写 · 20 分" : "待填写 · 0 分"}</span></div><textarea id={"evidence-" + field.key} value={draft[field.key]} onChange={event => update(field.key, event.target.value)} placeholder={field.hint} maxLength={2000}/></div>)}
        <div className="field"><label>外部成果链接（可选）</label><input type="url" value={draft.url} onChange={event => update("url", event.target.value)} placeholder="https://..." /></div>
        {notice && <p className="success-note">{notice}</p>}
        <div className="actions"><button className="btn btn-secondary" onClick={() => save("draft")}>保存草稿</button><button className="btn btn-primary" onClick={() => save("submit")}>{evaluated.completenessScore === 100 ? "提交为可用证据" : "提交并标记待补事实"}</button></div>
      </section>
      <aside className="entry-column">
        <section className="card panel evidence-score-card"><div className="card-head"><h3>完整度</h3><strong className={evaluated.completenessScore === 100 ? "text-good" : "text-warn"}>{evaluated.completenessScore}%</strong></div><div className="meter"><i style={{ width: evaluated.completenessScore + "%" }} /></div><p className="muted">完整度只表示信息是否齐全，不代表作品质量。缺少数字时请明确写“待补充”。</p>{evidenceFields.map(field => <div className="score-row" key={field.key}><span className={"score-dot " + (evaluated.completeness[field.key] ? "done" : "")}>{evaluated.completeness[field.key] ? "✓" : ""}</span><span>{field.label}</span><b>{evaluated.completeness[field.key] ? 20 : 0}</b></div>)}</section>
        <section className="card panel evidence-list"><div className="card-head"><h3>已保存证据</h3><span className="muted">{saved.length} 条</span></div>{saved.length ? saved.slice().reverse().map(item => <button className="saved-evidence" key={item.id} onClick={() => edit(item)}><span><b>{item.title}</b><small>{item.completenessScore}% 完整 · {item.status === "ready" ? "可用" : item.status === "needs_more_facts" ? "待补事实" : "草稿"}</small></span><span>编辑 →</span></button>) : <div className="empty-state"><p>提交第一份成果后，会出现在这里。</p></div>}</section>
      </aside>
    </div>
  </>;
}
