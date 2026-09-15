"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { competencyCatalog, defaultProfile } from "@/lib/data";
import { loadProfile } from "@/lib/repository";
import { getOnboardingReadiness, onboardingRepository } from "@/lib/onboarding";
import { UserProfile } from "@/lib/types";

export default function CompletePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(true);

  useEffect(() => {
    const currentProfile = loadProfile();
    const readiness = getOnboardingReadiness(currentProfile);
    if (!readiness.backgroundComplete) {
      router.replace("/onboarding/background");
      return;
    }
    if (!readiness.abilitiesComplete) {
      router.replace("/onboarding/abilities");
      return;
    }
    if (!readiness.evidenceComplete) {
      router.replace("/onboarding/evidence");
      return;
    }
    setProfile(currentProfile);
    setReadyToConfirm(readiness.evidenceComplete);
    setConfirmed(readiness.fullyConfirmed);
    setCheckingOrder(false);
  }, [router]);

  const rows = useMemo(() => profile.competencies
    .filter(item => item.level > 0)
    .map(item => ({ ...item, catalog: competencyCatalog.find(entry => entry.key === item.key)! })), [profile]);
  const verified = rows.filter(item => item.evidenceLevel > 0 && item.evidenceNote.trim()).length;
  const pending = rows.length - verified;

  function confirmAndOpen(href: string) {
    if (!readyToConfirm) return;
    if (!onboardingRepository.complete(profile)) return;
    setConfirmed(true);
    router.push(href);
  }

  if (checkingOrder) return <div className="card account-loading">正在检查回答顺序…</div>;

  return (
    <>
      <h1 className="page-title">你的初始能力画像已生成</h1>
      <p className="page-subtitle">提交最终确认后，JD 分析与微项目将同步使用这份画像。</p>
      <OnboardingProgress current={4} />
      <div className="completion-layout">
        <section className="card panel">
          <div className="onboarding-heading"><div><span className="step-kicker">STEP 4 / 4</span><h2>{profile.name}的能力确认表</h2></div><Link className="btn btn-link" href="/onboarding/abilities">修改能力</Link></div>
          <div className="profile-summary"><span>{profile.grade}</span><span>{profile.major}</span><span>{profile.cities}</span><span>每周 {profile.weeklyHours} 小时</span></div>
          <div className="summary-stats"><div><strong>{rows.length}</strong><span>项接触过的能力</span></div><div><strong>{verified}</strong><span>项已有事实证据</span></div><div><strong>{pending}</strong><span>项待补充或验证</span></div></div>
          <div className="ability-table">
            <div className="ability-table-head"><span>能力</span><span>自评</span><span>证据</span><span>系统判断</span></div>
            {rows.map(item => {
              const hasFactEvidence = item.evidenceLevel > 0 && item.evidenceNote.trim();
              const judgment = hasFactEvidence ? "已有基础证据" : item.evidenceLevel > 0 ? "需要补充事实" : "建议安排验证任务";
              return <div className="ability-table-row" key={item.key}><b>{item.catalog.name}</b><span>{item.level}/3</span><span>{item.evidenceLevel}/3</span><span className={hasFactEvidence ? "text-good" : "text-warn"}>{judgment}</span></div>;
            })}
          </div>
        </section>
        <aside className="entry-column">
          <div className={`confirmation-box ${confirmed ? "complete" : ""}`}><span>{confirmed ? "✓" : "4"}</span><div><b>{confirmed ? "能力画像已确认" : "最后一步：提交完整确认"}</b><p>{confirmed ? "微项目与匹配页会同步使用这份画像。" : "确认后才能分析 JD 并开始微项目。"}</p></div></div>
          <button className="card entry-card recommended" onClick={() => confirmAndOpen("/jobs")} disabled={!readyToConfirm}><span className="entry-label">推荐入口</span><h2>确认并分析目标 JD</h2><p>提交当前能力画像，然后分析匹配点、能力缺口和下一步。</p><b>{readyToConfirm ? "确认并继续 →" : "请先完成前面的确认"}</b></button>
          <button className="card entry-card" onClick={() => confirmAndOpen("/dashboard")} disabled={!readyToConfirm}><span className="entry-label">个人中心</span><h2>确认并进入个人中心</h2><p>查看能力画像、证据状态，以及后续与 JD 同步的微项目。</p><b>{readyToConfirm ? "确认并进入 →" : "暂不可进入"}</b></button>
          <Link className="btn btn-secondary" href="/onboarding/evidence">← 返回修改证据</Link>
        </aside>
      </div>
    </>
  );
}
