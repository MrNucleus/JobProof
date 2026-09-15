"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { exampleJd } from "@/lib/data";
import { JobAnalysis, UserProfile } from "@/lib/types";
import { loadProfile, saveAnalysis } from "@/lib/repository";
import { getOnboardingReadiness } from "@/lib/onboarding";

export default function JobsPage() {
  const [jd,setJd] = useState(exampleJd);
  const [profile,setProfile] = useState<UserProfile | null>(null);
  const [analysis,setAnalysis] = useState<JobAnalysis | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [profileReady,setProfileReady] = useState(false);
  const confidenceLabel = { high: "高置信度", medium: "中置信度", low: "低置信度" } as const;
  useEffect(()=>{
    const currentProfile = loadProfile();
    setProfile(currentProfile);
    setProfileReady(getOnboardingReadiness(currentProfile).fullyConfirmed);
  },[]);

  async function analyze() {
    if (!profileReady) { setError("请先完整确认个人能力，再分析 JD。"); return; }
    if (!profile || jd.trim().length < 20) { setError("请先填写至少 20 个字的 JD 内容。"); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/jobs/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jdText:jd,profile})});
      if(!response.ok) throw new Error("分析请求失败");
      const result = await response.json() as JobAnalysis;
      setAnalysis(result); saveAnalysis(result);
    } catch (err) { setError(err instanceof Error?err.message:"分析失败，请稍后重试"); }
    finally { setLoading(false); }
  }

  return <>
    <h1 className="page-title">分析目标 JD</h1><p className="page-subtitle">使用已确认的个人能力画像分析岗位；每项能力都保留 JD 原文依据。</p>{!profileReady&&<div className="profile-lock-banner"><b>能力画像尚未完整确认</b><span>完成四步确认后才能计算匹配并生成微项目。</span><Link href="/onboarding/background">继续确认 →</Link></div>}
    <div className="jd-layout">
      <section className="card panel"><div className="card-head"><h2>粘贴岗位描述</h2><button className="btn btn-link" onClick={()=>setJd(exampleJd)}>恢复示例</button></div><textarea className="jd-input" value={jd} onChange={e=>setJd(e.target.value)} aria-label="岗位描述"/><div className="actions"><Link className="btn btn-secondary" href="/onboarding">修改能力画像</Link><button className="btn btn-primary" onClick={analyze} disabled={loading||!profileReady}>{loading?"正在分析…":"分析匹配度 →"}</button></div>{error&&<p className="error">{error}</p>}</section>
      <section className="card panel">
        {!analysis?<div className="empty"><div><div style={{fontSize:42}}>◎</div><h2>等待分析</h2><p>结果将展示岗位能力、你的匹配点、缺口和下一步微项目。</p></div></div>:<div><div className="analysis-summary"><div className="card-head"><div><h3>{analysis.title}</h3><div className="analysis-meta"><span className={`analysis-mode ${analysis.analysisMode === "ai" ? "ai" : "rules"}`}>{analysis.analysisMode === "ai" ? "AI 结构化分析" : "规则引擎分析"}</span>{analysis.breakdown&&<span className={"confidence-tag "+analysis.breakdown.confidence}>{confidenceLabel[analysis.breakdown.confidence]}</span>}</div></div><span className="match-score">{analysis.matchScore}%</span></div><p>{analysis.summary}</p>{analysis.analysisNotice&&<div className="analysis-notice">{analysis.analysisNotice}</div>}</div>{analysis.breakdown&&<div className="match-breakdown">{([{key:"coverage",label:"能力覆盖",weight:"45%"},{key:"evidence",label:"证据强度",weight:"25%"},{key:"preference",label:"兴趣偏好",weight:"15%"},{key:"constraints",label:"硬性约束",weight:"15%"}] as const).map(item=><div className="breakdown-item" key={item.key}><div><b>{item.label}</b><small>权重 {item.weight}</small></div><strong>{analysis.breakdown![item.key]}</strong><div className="meter"><i style={{width:analysis.breakdown![item.key]+"%"}}/></div><p>{analysis.breakdown!.explanations[item.key]}</p></div>)}</div>}<h3>能力要求与原文依据</h3>{analysis.competencies.map(item=><div className="competency-result" key={item.key}><div className="result-top"><div><b>{item.name}</b><div className="muted">你的等级：{item.userLevel}/3 · 差距：{item.gap}</div></div><span className={`badge ${item.gap===0?"good":""}`}>{item.gap===0?"已覆盖":item.importance==="must"?"需优先补":"加分项"}</span></div><p className="quote">“{item.jdQuote}”</p></div>)}<div className="callout"><b>匹配点</b><p>{analysis.strengths.join("；")||"暂无明确证据，请先完善能力画像。"}</p><b>主要缺口</b><p>{analysis.gaps.join("；")||"当前能力已覆盖主要要求。"}</p><b>下一步</b><p>{analysis.nextAction}</p></div><div className="actions"><span></span><Link className="btn btn-primary" href="/plan">生成 7 天微项目 →</Link></div></div>}
      </section>
    </div>
  </>;
}

