"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOnboardingReadiness, profileFingerprint, subscribeToOnboarding } from "@/lib/onboarding";
import { loadAnalysis, loadProfile } from "@/lib/repository";
import { JobAnalysis, UserProfile } from "@/lib/types";

const planTasks = [
  { id: "scope", day: "DAY 1", title: "明确问题与访谈对象", instruction: "选择一个校园产品场景，写出目标用户和需要验证的 3 个假设。", deliverable: "1 页访谈计划 + 5 位目标用户名单" },
  { id: "guide", day: "DAY 2", title: "设计访谈提纲", instruction: "围绕真实行为设计 6–8 个开放问题，避免诱导式提问。", deliverable: "一份可直接使用的访谈提纲" },
  { id: "talk", day: "DAY 3–4", title: "完成 5 次用户访谈", instruction: "记录用户原话、行为、问题和现有替代方案。", deliverable: "5 份原始记录，至少保留 10 条用户原话" },
  { id: "cluster", day: "DAY 5", title: "整理共性需求", instruction: "对记录做归类，区分高频问题与个别意见。", deliverable: "需求聚类表 + Top 3 问题" },
  { id: "report", day: "DAY 6–7", title: "输出结论与建议", instruction: "提出 2 条可执行建议，并说明证据和优先级。", deliverable: "1 页结论 + 90 秒讲解" }
];

type TaskState = Record<string, boolean>;
type GateState = { allowed: boolean; reason: string; href: string; action: string };

export function InteractivePlan() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [gate, setGate] = useState<GateState>({ allowed: false, reason: "正在同步能力画像…", href: "/onboarding/background", action: "返回能力确认" });
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState<TaskState>({});
  const [selectedId, setSelectedId] = useState(planTasks[0].id);

  function sync() {
    const currentProfile = loadProfile();
    const readiness = getOnboardingReadiness(currentProfile);
    const currentAnalysis = loadAnalysis();
    setProfile(currentProfile);
    setAnalysis(currentAnalysis);
    if (!readiness.fullyConfirmed) {
      setGate({ allowed: false, reason: "必须完成四步能力确认并提交最终确认，才能开始微项目。", href: readiness.nextHref, action: readiness.nextLabel });
      return;
    }
    if (!currentAnalysis) {
      setGate({ allowed: false, reason: "能力画像已确认。请先选择或粘贴一份 JD，微项目必须针对真实岗位缺口生成。", href: "/jobs", action: "分析目标 JD" });
      return;
    }
    if (currentAnalysis.profileFingerprint !== profileFingerprint(currentProfile)) {
      setGate({ allowed: false, reason: "能力画像已更新，之前的 JD 分析已过期。请使用最新画像重新分析。", href: "/jobs", action: "重新分析 JD" });
      return;
    }
    setGate({ allowed: true, reason: "", href: "/plan", action: "" });
  }

  useEffect(() => {
    sync();
    setStarted(window.localStorage.getItem("jobproof.plan.started") === "true");
    try { setCompleted(JSON.parse(window.localStorage.getItem("jobproof.plan.tasks") || "{}") as TaskState); } catch { setCompleted({}); }
    const unsubscribe = subscribeToOnboarding(sync);
    window.addEventListener("focus", sync);
    return () => { unsubscribe(); window.removeEventListener("focus", sync); };
  }, []);

  const doneCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round(doneCount / planTasks.length * 100);
  const selected = planTasks.find(task => task.id === selectedId) || planTasks[0];
  const target = analysis?.competencies.find(item => item.gap > 0)?.name || "待分析能力";

  function start() {
    if (!gate.allowed) return;
    setStarted(true);
    window.localStorage.setItem("jobproof.plan.started", "true");
  }

  function toggle(id: string) {
    if (!gate.allowed || !started) return;
    const next = { ...completed, [id]: !completed[id] };
    setCompleted(next);
    setSelectedId(id);
    window.localStorage.setItem("jobproof.plan.tasks", JSON.stringify(next));
  }

  if (!gate.allowed) return <div className="gate-layout">
    <section className="card gate-card"><div className="lock-orbit">🔒</div><span className="step-kicker">MICRO PROJECT LOCKED</span><h1>完成能力确认后才能开始微项目</h1><p>{gate.reason}</p><Link className="btn btn-primary" href={gate.href}>{gate.action} →</Link></section>
    <aside className="card gate-steps"><h3>开启微项目需要</h3><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).backgroundComplete ? "done" : ""}>1</span><div><b>基本背景</b><small>年级、专业、城市和时间预算</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).abilitiesComplete ? "done" : ""}>2</span><div><b>8 项能力逐项确认</b><small>包括等级和兴趣偏好</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).evidenceComplete ? "done" : ""}>3</span><div><b>证据状态确认</b><small>已有证据或明确待验证</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).fullyConfirmed ? "done" : ""}>4</span><div><b>提交最终确认</b><small>锁定本次匹配使用的画像版本</small></div></div><div className="gate-step"><span className={analysis && profile && analysis.profileFingerprint === profileFingerprint(profile) ? "done" : ""}>5</span><div><b>使用当前画像分析 JD</b><small>微项目与岗位缺口保持同步</small></div></div></aside>
  </div>;

  return <>
    <div className="sync-banner"><span>✓</span><div><b>已同步最新能力画像</b><small>{profile?.name} · {analysis?.title} · 分析于 {analysis?.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString("zh-CN") : "刚刚"}</small></div><Link href="/onboarding/complete">查看画像</Link></div>
    <div className="plan-hero card"><div><span className="step-kicker">7-DAY PROOF SPRINT</span><h1>把“{target}”变成一份真实证据</h1><p>目标岗位：{analysis?.title} · 每周约 {profile?.weeklyHours} 小时</p></div><div className="progress-ring" style={{ background: `conic-gradient(var(--green) ${progress}%, #e7ecef ${progress}% 100%)` }}><span>{progress}%</span></div></div>
    <div className="plan-workspace"><aside className="card plan-timeline"><div className="card-head"><h3>任务路线</h3><span className="muted">{doneCount} / {planTasks.length} 完成</span></div><div className="meter"><i style={{ width: `${progress}%`, background: "var(--green)" }} /></div>{planTasks.map(task => <button key={task.id} className={`timeline-task ${selectedId === task.id ? "active" : ""}`} onClick={() => setSelectedId(task.id)}><span className={`task-dot ${completed[task.id] ? "done" : ""}`}>{completed[task.id] ? "✓" : ""}</span><span><small>{task.day}</small><b>{task.title}</b></span></button>)}</aside>
      <section className="card plan-detail"><div className="detail-top"><div><span className="day-label">{selected.day}</span><h2>{selected.title}</h2></div><span className="time-chip">预计 45–60 分钟</span></div><div className="detail-block"><span className="detail-index">01</span><div><b>今天要完成什么</b><p>{selected.instruction}</p></div></div><div className="detail-block"><span className="detail-index">02</span><div><b>需要提交的成果</b><p>{selected.deliverable}</p></div></div><div className="detail-block"><span className="detail-index">03</span><div><b>验收标准</b><ul><li>内容来自真实观察或操作</li><li>能说明你本人完成的具体动作</li><li>保留原始记录或外部成果链接</li></ul></div></div><div className="task-action-bar"><button className={`btn ${completed[selected.id] ? "btn-secondary" : "btn-primary"}`} onClick={() => toggle(selected.id)} disabled={!started}>{!started ? "请先开始挑战" : completed[selected.id] ? "↶ 标记为未完成" : "✓ 完成这项任务"}</button><button className="btn btn-secondary" onClick={() => alert("证据提交工作台将在下一模块开放。")} disabled={!started}>提交成果</button></div></section>
      <aside className="card plan-side"><span className="step-kicker">为什么做这个</span><h3>你的主要缺口</h3><div className="gap-pill">{target} · 待验证</div><p className="muted">完成全部任务后，这份成果将为目标 JD 提供一项可追溯的能力证据。</p><hr className="divider"/><h3>最终可以获得</h3><ul className="outcome-list"><li>一条简历项目描述</li><li>一页作品集案例</li><li>一组 STAR 面试故事</li></ul>{!started ? <button className="btn btn-primary full" onClick={start}>开始 7 天挑战</button> : <div className="started-note">● 挑战进行中<br/><small>进度已保存在当前浏览器</small></div>}<Link className="btn btn-link full" href="/jobs">返回查看 JD</Link></aside></div>
  </>;
}

