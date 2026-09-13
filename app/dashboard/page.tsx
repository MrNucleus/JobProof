"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { competencyCatalog, defaultProfile, recommendedJobs } from "@/lib/data";
import { UserProfile } from "@/lib/types";
import { loadProfile } from "@/lib/storage";

export default function DashboardPage() {
  const [profile,setProfile] = useState<UserProfile>(defaultProfile);
  useEffect(()=>setProfile(loadProfile()),[]);
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
      <section className="card panel"><div className="card-head"><h3>最近的能力证据</h3><span className="muted">示例数据</span></div><div className="evidence-item"><b>校园二手平台竞品分析</b><small>竞品分析 · 5 个竞品 · 2 条建议</small></div><div className="evidence-item"><b>社团公众号迎新推文</b><small>内容策划 · 4 篇 · 最高阅读 1200</small></div><div className="evidence-item"><b>用户访谈微项目 · 待验证</b><small>建议访谈 5 人并保留原始记录</small></div></section>
    </div>
    <div className="section-head"><h2>正在进行</h2><p>把能力缺口变成可完成的任务包</p></div>
    <div className="dash-grid">
      <section className="card panel"><div className="card-head"><h3>7 天用户访谈微项目</h3><Link className="btn btn-link" href="/plan">继续项目 →</Link></div><div className="plan-box"><b>为校园二手交易产品做需求验证</b><div className="muted">目标：用户访谈 · 需求提炼 · 结论表达</div></div><div className="task-row"><span className="check done">✓</span><div><b>明确对象和 6 个问题</b><small>已完成</small></div><span>完成</span></div><div className="task-row"><span className="check"></span><div><b>完成 5 次访谈并整理共性</b><small>截止明天</small></div><span>进行中</span></div></section>
      <section className="card panel"><div className="card-head"><h3>为你匹配的 JD</h3><Link className="btn btn-link" href="/jobs">查看分析 →</Link></div>{recommendedJobs.map(job=><div className="job-row" key={job.title}><div><b>{job.title}</b><small>{job.company} · {job.city}</small><div className="tags">{job.tags.map(tag=><span className="tag" key={tag}>{tag}</span>)}</div></div><span className="match-score">{job.score}%</span></div>)}</section>
    </div>
  </>;
}
