"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOnboardingReadiness, profileFingerprint, subscribeToOnboarding } from "@/lib/onboarding";
import { loadAnalysis, loadProfile, planRepository } from "@/lib/repository";
import { generatePlan, getPlanBudget } from "@/lib/plan-service";
import { CompetencyKey, JobAnalysis, Plan, UserProfile } from "@/lib/types";

type GateState = { allowed: boolean; reason: string; href: string; action: string };

export function InteractivePlan() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [gate, setGate] = useState<GateState>({ allowed: false, reason: "正在同步能力画像…", href: "/onboarding/background", action: "返回能力确认" });
  const [selectedId, setSelectedId] = useState("");
  const [targetKey, setTargetKey] = useState<CompetencyKey>("interview");
  const [durationDays, setDurationDays] = useState<7 | 14>(7);
  const [theme, setTheme] = useState("校园产品或服务");

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
    const fingerprint = currentAnalysis.profileFingerprint + ":" + currentAnalysis.analyzedAt;
    const existing = planRepository.list().find(item => item.analysisFingerprint === fingerprint) || null;
    const suggested = currentAnalysis.competencies.find(item => item.gap > 0) || currentAnalysis.competencies[0];
    setTargetKey(suggested?.key || "interview");
    setPlan(existing);
    setSelectedId(existing?.tasks[0]?.id || "");
    setGate({ allowed: true, reason: "", href: "/plan", action: "" });
  }

  useEffect(() => {
    sync();
    const unsubscribe = subscribeToOnboarding(sync);
    window.addEventListener("focus", sync);
    return () => { unsubscribe(); window.removeEventListener("focus", sync); };
  }, []);

  const tasks = plan?.tasks || [];
  const doneCount = tasks.filter(task => task.status === "done").length;
  const progress = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
  const selected = tasks.find(task => task.id === selectedId) || tasks[0];
  const target = analysis?.competencies.find(item => item.key === plan?.targetCompetency)?.name || "待分析能力";
  const started = plan?.status === "active" || plan?.status === "completed";
  const budgetMinutes = profile ? getPlanBudget(profile, durationDays) : 0;

  function createSelectedPlan() {
    if (!analysis || !profile) return;
    const next = generatePlan({ analysis, profile, targetCompetency: targetKey, durationDays, theme });
    planRepository.save(next);
    setPlan(next);
    setSelectedId(next.tasks[0]?.id || "");
  }

  function revisePlan() {
    if (!plan || plan.status !== "draft") return;
    planRepository.remove(plan.id);
    setTargetKey(plan.targetCompetency);
    setDurationDays(plan.durationDays);
    setTheme(plan.theme || "校园产品或服务");
    setPlan(null);
  }

  function start() {
    if (!gate.allowed || !plan) return;
    const next = { ...plan, status: "active" as const, startedAt: plan.startedAt || new Date().toISOString() };
    planRepository.save(next);
    setPlan(next);
  }

  function toggle(id: string) {
    if (!gate.allowed || !started || !plan) return;
    const task = plan.tasks.find(item => item.id === id);
    if (!task) return;
    const next = planRepository.updateTask(plan.id, id, task.status === "done" ? "todo" : "done");
    if (!next) return;
    setPlan(next);
    setSelectedId(id);
  }

  if (!gate.allowed) return <div className="gate-layout">
    <section className="card gate-card"><div className="lock-orbit">🔒</div><span className="step-kicker">MICRO PROJECT LOCKED</span><h1>完成能力确认后才能开始微项目</h1><p>{gate.reason}</p><Link className="btn btn-primary" href={gate.href}>{gate.action} →</Link></section>
    <aside className="card gate-steps"><h3>开启微项目需要</h3><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).backgroundComplete ? "done" : ""}>1</span><div><b>基本背景</b><small>年级、专业、城市和时间预算</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).abilitiesComplete ? "done" : ""}>2</span><div><b>8 项能力逐项确认</b><small>包括等级和兴趣偏好</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).evidenceComplete ? "done" : ""}>3</span><div><b>证据状态确认</b><small>已有证据或明确待验证</small></div></div><div className="gate-step"><span className={getOnboardingReadiness(profile || loadProfile()).fullyConfirmed ? "done" : ""}>4</span><div><b>提交最终确认</b><small>锁定本次匹配使用的画像版本</small></div></div><div className="gate-step"><span className={analysis && profile && analysis.profileFingerprint === profileFingerprint(profile) ? "done" : ""}>5</span><div><b>使用当前画像分析 JD</b><small>微项目与岗位缺口保持同步</small></div></div></aside>
  </div>;

  if (!plan && analysis && profile) {
    const options = analysis.competencies.filter(item => item.gap > 0).length
      ? analysis.competencies.filter(item => item.gap > 0)
      : analysis.competencies;
    const selectedGap = analysis.competencies.find(item => item.key === targetKey);
    return <>
      <div className="sync-banner"><span>✓</span><div><b>能力画像与目标 JD 已同步</b><small>{profile.name} · {analysis.title} · 下一步选择要补强的能力</small></div><Link href="/jobs">查看 JD</Link></div>
      <section className="card plan-config">
        <div className="plan-config-head"><div><span className="step-kicker">CREATE PROOF SPRINT</span><h1>创建一份真正做得完的微项目</h1><p>计划会绑定 JD 原文，所有任务总时长不超过你的投入预算。</p></div><div className="budget-card"><small>当前总预算</small><strong>{Math.round(budgetMinutes / 6) / 10} 小时</strong><span>{durationDays} 天 · 每周 {profile.weeklyHours} 小时</span></div></div>
        <div className="config-section"><b>1. 选择重点补强能力</b><div className="gap-options">{options.map(item=><button type="button" key={item.key} className={targetKey===item.key?"selected":""} onClick={()=>setTargetKey(item.key)}><span>{item.name}</span><small>{item.gap===0?"已有基础，补强证据":"差距 "+item.gap+" 级"} · {item.importance==="must"?"JD 必备":"加分项"}</small></button>)}</div>{selectedGap&&<p className="config-quote">JD 原文：“{selectedGap.jdQuote}”</p>}</div>
        <div className="config-columns"><div className="config-section"><b>2. 选择冲刺周期</b><div className="duration-options"><button type="button" className={durationDays===7?"selected":""} onClick={()=>setDurationDays(7)}><strong>7 天</strong><small>快速做出第一版证据</small></button><button type="button" className={durationDays===14?"selected":""} onClick={()=>setDurationDays(14)}><strong>14 天</strong><small>包含两轮实践和同伴反馈</small></button></div></div><div className="config-section"><b>3. 选择真实项目主题</b><div className="theme-suggestions">{["校园二手交易","社团招新","校园学习工具","本地生活服务"].map(item=><button type="button" className={theme===item?"selected":""} key={item} onClick={()=>setTheme(item)}>{item}</button>)}</div><input className="theme-input" value={theme} maxLength={40} onChange={event=>setTheme(event.target.value)} aria-label="微项目主题" placeholder="也可以输入你自己的真实场景"/></div></div>
        <div className="plan-preview"><div><b>将生成</b><span>{durationDays===7?5:7} 个可验收任务</span></div><div><b>总时长上限</b><span>{budgetMinutes} 分钟</span></div><div><b>最终成果</b><span>案例 + 原始证据 + 讲解稿</span></div></div>
        <div className="actions"><Link className="btn btn-secondary" href="/jobs">← 返回 JD</Link><button type="button" className="btn btn-primary" onClick={createSelectedPlan} disabled={!theme.trim()}>生成我的 {durationDays} 天计划 →</button></div>
      </section>
    </>;
  }

  if (!plan) return <div className="card account-loading">正在同步计划数据…</div>;

  return <>
    <div className="sync-banner"><span>✓</span><div><b>已同步最新能力画像</b><small>{profile?.name} · {analysis?.title} · 分析于 {analysis?.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString("zh-CN") : "刚刚"}</small></div><Link href="/onboarding/complete">查看画像</Link></div>
    <div className="plan-hero card"><div><span className="step-kicker">{plan.durationDays}-DAY PROOF SPRINT</span><h1>把“{target}”变成一份真实证据</h1><p>{plan.theme} · 总预算 {plan.totalMinutes} 分钟 · 目标岗位：{analysis?.title}</p></div><div className="progress-ring" style={{ background: "conic-gradient(var(--green) " + progress + "%, #e7ecef " + progress + "% 100%)" }}><span>{progress}%</span></div></div>
    <div className="plan-workspace"><aside className="card plan-timeline"><div className="card-head"><h3>任务路线</h3><span className="muted">{doneCount} / {tasks.length} 完成</span></div><div className="meter"><i style={{ width: progress + "%", background: "var(--green)" }} /></div>{tasks.map(task => <button key={task.id} className={"timeline-task " + (selectedId === task.id ? "active" : "")} onClick={() => setSelectedId(task.id)}><span className={"task-dot " + (task.status === "done" ? "done" : "")}>{task.status === "done" ? "✓" : ""}</span><span><small>{task.day}</small><b>{task.title}</b></span></button>)}</aside>
      <section className="card plan-detail">{selected ? <><div className="detail-top"><div><span className="day-label">{selected.day}</span><h2>{selected.title}</h2></div><span className="time-chip">预计 {selected.estimatedMinutes} 分钟</span></div><div className="detail-block"><span className="detail-index">01</span><div><b>今天要完成什么</b><p>{selected.instruction}</p></div></div><div className="detail-block"><span className="detail-index">02</span><div><b>需要提交的成果</b><p>{selected.deliverable}</p></div></div><div className="detail-block"><span className="detail-index">03</span><div><b>对应 JD 原文</b><p className="quote">{selected.jdQuote ? "“" + selected.jdQuote + "”" : "当前岗位没有提取到可引用原文，请人工补充。"}</p></div></div><div className="detail-block"><span className="detail-index">04</span><div><b>验收标准</b><ul>{selected.acceptanceCriteria.map(item=><li key={item}>{item}</li>)}</ul></div></div><div className="task-action-bar"><button className={"btn " + (selected.status === "done" ? "btn-secondary" : "btn-primary")} onClick={() => toggle(selected.id)} disabled={!started}>{!started ? "请先开始挑战" : selected.status === "done" ? "↶ 标记为未完成" : "✓ 完成这项任务"}</button><button className="btn btn-secondary" onClick={() => alert("证据提交工作台将在下一模块开放。")} disabled={!started}>提交成果</button></div></> : <div className="empty-state"><h2>计划正在生成</h2><p>请稍候刷新页面。</p></div>}</section>
      <aside className="card plan-side"><span className="step-kicker">为什么做这个</span><h3>你的主要缺口</h3><div className="gap-pill">{target} · 待验证</div><p className="muted">{plan.goal}</p><hr className="divider"/><h3>最终可以获得</h3><ul className="outcome-list"><li>一条简历项目描述</li><li>一页作品集案例</li><li>一组 STAR 面试故事</li></ul>{!started ? <><button className="btn btn-primary full" onClick={start}>开始 {plan.durationDays} 天挑战</button><button className="btn btn-link full" onClick={revisePlan}>重新选择计划</button></> : <div className="started-note">● {plan.status === "completed" ? "挑战已完成" : "挑战进行中"}<br/><small>进度已保存在当前浏览器</small></div>}<Link className="btn btn-link full" href="/jobs">返回查看 JD</Link></aside></div>
  </>;
}
