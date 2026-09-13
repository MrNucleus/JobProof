"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { competencyCatalog, defaultProfile, recommendedJobs } from "@/lib/data";
import { Evidence, JobAnalysis, Plan, UserProfile } from "@/lib/types";
import { evidenceRepository, loadAnalysis, loadProfile, planRepository } from "@/lib/repository";

export default function DashboardPage() {
  const [profile,setProfile] = useState<UserProfile>(defaultProfile);
  const [currentPlan,setCurrentPlan] = useState<Plan|null>(null);
  const [analysis,setAnalysis] = useState<JobAnalysis|null>(null);
  const [evidence,setEvidence] = useState<Evidence[]>([]);
  useEffect(()=>{
    function sync(){
      setProfile(loadProfile());
      setAnalysis(loadAnalysis());
      setCurrentPlan(planRepository.list().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]||null);
      setEvidence(evidenceRepository.list().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    }
    sync();
    window.addEventListener("focus",sync);
    return()=>window.removeEventListener("focus",sync);
  },[]);
  const completion = useMemo(()=>Math.round(profile.competencies.filter(c=>c.level>0).length/profile.competencies.length*100),[profile]);
  const topSkills = [...profile.competencies].sort((a,b)=>(b.level*2+b.evidenceLevel)-(a.level*2+a.evidenceLevel)).slice(0,4);
  return <>
    <div className="section-head" style={{marginTop:0}}><div><h1 className="page-title">你好，{profile.name} 👋</h1><p className="page-subtitle" style={{marginBottom:0}}>今天也向目标岗位靠近一点。</p></div><Link className="btn btn-primary" href="/jobs">＋ 分析一份 JD</Link></div>
    <div className="dash-grid">
      <section className="card profile-card"><div className="avatar">{profile.name.slice(0,1)}</div><div><h2>{profile.name}</h2><div className="meta">{profile.grade} · {profile.major} · {profile.cities}</div><div className="tags">{profile.roleFamilies.map(role=><span className="tag" key={role}>{role}</span>)}<span className="tag">每周 {profile.weeklyHours} 小时</span></div></div><Link className="btn btn-link" href="/onboarding">编辑资料 →</Link></section>
      <section className="card metric-card"><div className="card-head"><h3>能力画像完成度</h3><span className="muted">本地保存</span></div><div className="score-big">{completion}%</div><div className="meter"><i style={{width:`${completion}%`}}/></div><p className="muted">补充真实证据，可以提升 JD 匹配可信度。</p></section>
    </div>
    <div className="section-head"><h2>我的能力画像</h2><p>自评能力与证据强度分开计算</p></div>
    <div className="dash-grid">
      <section className="card panel"><div className="card-head"><h3>核心能力</h3><Link className="btn btn-link" href="/onboarding">查看完整表格 →</Link></div>{topSkills.map(item=>{const cat=competencyCatalog.find(c=>c.key===item.key)!;const score=Math.round((item.level/3*.65+item.evidenceLevel/3*.35)*100);return <div className="skill-row" key={item.key}><div><b>{cat.name}</b><small>{item.evidenceLevel?"已有基础证据":"证据待补充"}</small></div><div className="skillbar"><i style={{width:`${score}%`}}/></div><span>{score}</span></div>})}</section>
      <section className="card panel"><div className="card-head"><h3>最近的能力证据</h3><span className="muted">{evidence.length ? "本地保存" : "等待提交"}</span></div>{evidence.length ? evidence.slice(0,3).map(item=><Link className="evidence-item" href={"/evidence?evidenceId="+item.id} key={item.id}><b>{item.title}</b><small>{item.completenessScore}% 完整 · {item.status==="ready"?"可用于求职表达":item.status==="needs_more_facts"?"待补事实":"草稿"}</small></Link>) : <div className="empty-state"><p>完成微项目任务并提交成果后，会在这里形成能力证据。</p><Link className="btn btn-secondary" href="/evidence">去提交证据</Link></div>}</section>
    </div>
    <div className="section-head"><h2>正在进行</h2><p>把能力缺口变成可完成的任务包</p></div>
    <div className="dash-grid">
      <section className="card panel"><div className="card-head"><h3>{currentPlan?.title||"还没有微项目"}</h3><Link className="btn btn-link" href="/plan">{currentPlan?"继续项目":"创建计划"} →</Link></div>{currentPlan?<><div className="plan-box"><b>{currentPlan.goal}</b><div className="muted">{currentPlan.theme} · {currentPlan.tasks.filter(task=>task.status==="done").length}/{currentPlan.tasks.length} 项完成 · 总预算 {currentPlan.totalMinutes||currentPlan.tasks.reduce((sum,task)=>sum+task.estimatedMinutes,0)} 分钟</div></div>{currentPlan.tasks.slice(0,3).map(task=><div className="task-row" key={task.id}><span className={"check "+(task.status==="done"?"done":"")}>{task.status==="done"?"✓":""}</span><div><b>{task.title}</b><small>{task.day} · 预计 {task.estimatedMinutes} 分钟</small></div><span>{task.status==="done"?"完成":task.status==="doing"?"进行中":"待开始"}</span></div>)}</>:<div className="empty-state"><p>分析一份目标 JD 后，选择能力缺口创建 7/14 天计划。</p><Link className="btn btn-primary" href="/jobs">分析目标 JD</Link></div>}</section>
      <section className="card panel"><div className="card-head"><h3>{analysis?"最近分析的 JD":"为你匹配的 JD"}</h3><Link className="btn btn-link" href="/jobs">查看分析 →</Link></div>{analysis?<div className="job-row"><div><b>{analysis.title}</b><small>{analysis.summary}</small><div className="tags">{analysis.competencies.slice(0,3).map(item=><span className="tag" key={item.key}>{item.name}</span>)}{analysis.breakdown&&<span className="tag">{analysis.breakdown.confidence==="high"?"高":analysis.breakdown.confidence==="medium"?"中":"低"}置信度</span>}</div></div><span className="match-score">{analysis.matchScore}%</span></div>:recommendedJobs.map(job=><div className="job-row" key={job.title}><div><b>{job.title}</b><small>{job.company} · {job.city}</small><div className="tags">{job.tags.map(tag=><span className="tag" key={tag}>{tag}</span>)}</div></div><span className="match-score">{job.score}%</span></div>)}</section>
    </div>
  </>;
}
