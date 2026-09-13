"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAnalysis } from "@/lib/storage.complete";
import { JobAnalysis } from "@/lib/types";

const baseTasks = [
  {day:"DAY 1",title:"明确问题与访谈对象",instruction:"选择一个校园产品场景，写出目标用户和需要验证的 3 个假设。",deliverable:"1 页访谈计划 + 5 位目标用户名单"},
  {day:"DAY 2",title:"设计访谈提纲",instruction:"围绕真实行为设计 6–8 个开放问题，避免诱导式提问。",deliverable:"一份可直接使用的访谈提纲"},
  {day:"DAY 3–4",title:"完成 5 次用户访谈",instruction:"记录用户原话、行为、问题和现有替代方案。",deliverable:"5 份原始记录，至少保留 10 条用户原话"},
  {day:"DAY 5",title:"整理共性需求",instruction:"对记录做归类，区分高频问题与个别意见。",deliverable:"需求聚类表 + Top 3 问题"},
  {day:"DAY 6–7",title:"输出结论与建议",instruction:"提出 2 条可执行建议，并说明证据和优先级。",deliverable:"1 页结论 + 90 秒讲解"}
];

export default function PlanPage(){
  const [analysis,setAnalysis]=useState<JobAnalysis|null>(null);
  useEffect(()=>setAnalysis(loadAnalysis()),[]);
  const target = analysis?.gaps[0] || "用户访谈与需求提炼";
  return <>
    <h1 className="page-title">7 天能力微项目</h1><p className="page-subtitle">目标缺口：{target}。每个任务都有交付物和验收标准。</p>
    <div className="plan-grid"><section>{baseTasks.map(task=><article className="card day-card" key={task.day}><div className="day-label">{task.day}</div><h3>{task.title}</h3><p>{task.instruction}</p><div className="deliverable"><b>交付物：</b>{task.deliverable}</div></article>)}</section><aside className="card panel sticky"><h2>项目目标</h2><p>为校园二手交易产品完成一次小型用户需求验证，证明你能独立设计访谈、整理事实并输出建议。</p><hr className="divider"/><h3>最终验收标准</h3><ul><li>完成 5 位真实用户访谈</li><li>保留原始记录和用户原话</li><li>形成至少 3 个共性发现</li><li>提出 2 条有依据的建议</li><li>能用 90 秒讲清过程与结果</li></ul><div className="note"><b>完成后可生成</b><br/>简历 bullet、作品集案例和 STAR 面试故事。</div><div className="actions"><Link className="btn btn-secondary" href="/jobs">返回 JD</Link><button className="btn btn-primary">开始项目</button></div></aside></div>
  </>;
}

