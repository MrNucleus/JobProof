"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { competencyCatalog, defaultProfile } from "@/lib/data";
import { loadProfile } from "@/lib/storage.complete";
import { UserProfile } from "@/lib/types";

export default function CompletePage() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  useEffect(() => setProfile(loadProfile()), []);

  const rows = useMemo(() => profile.competencies.filter(item => item.level > 0).map(item => ({ ...item, catalog: competencyCatalog.find(entry => entry.key === item.key)! })), [profile]);
  const verified = rows.filter(item => item.evidenceLevel > 0 && item.evidenceNote.trim()).length;

  return (
    <>
      <h1 className="page-title">你的初始能力画像已生成</h1>
      <p className="page-subtitle">确认结果后，选择从匹配 JD 还是分析目标 JD 开始。</p>
      <OnboardingProgress current={4} />
      <div className="completion-layout">
        <section className="card panel">
          <div className="onboarding-heading"><div><span className="step-kicker">STEP 4 / 4</span><h2>{profile.name}的能力确认表</h2></div><Link className="btn btn-link" href="/onboarding/abilities">修改能力</Link></div>
          <div className="profile-summary"><span>{profile.grade}</span><span>{profile.major}</span><span>{profile.cities}</span><span>每周 {profile.weeklyHours} 小时</span></div>
          <div className="summary-stats"><div><strong>{rows.length}</strong><span>项接触过的能力</span></div><div><strong>{verified}</strong><span>项已有事实证据</span></div><div><strong>{rows.length - verified}</strong><span>项等待微项目验证</span></div></div>
          <div className="ability-table">
            <div className="ability-table-head"><span>能力</span><span>自评</span><span>证据</span><span>系统判断</span></div>
            {rows.map(item => <div className="ability-table-row" key={item.key}><b>{item.catalog.name}</b><span>{item.level}/3</span><span>{item.evidenceLevel}/3</span><span className={item.evidenceLevel > 0 && item.evidenceNote.trim() ? "text-good" : "text-warn"}>{item.evidenceLevel > 0 && item.evidenceNote.trim() ? "已有基础证据" : "建议安排验证任务"}</span></div>)}
          </div>
        </section>
        <aside className="entry-column">
          <Link className="card entry-card recommended" href="/jobs"><span className="entry-label">推荐入口</span><h2>我已有目标 JD</h2><p>粘贴岗位描述，用刚确认的能力画像分析匹配点、缺口和下一步。</p><b>分析一份 JD →</b></Link>
          <Link className="card entry-card" href="/dashboard"><span className="entry-label">浏览入口</span><h2>按我的能力找 JD</h2><p>先进入个人中心，查看推荐岗位、能力证据和正在进行的微项目。</p><b>进入个人中心 →</b></Link>
          <Link className="btn btn-secondary" href="/onboarding/evidence">← 返回修改证据</Link>
        </aside>
      </div>
    </>
  );
}
