"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { competencyCatalog, defaultProfile } from "@/lib/data";
import { loadProfile, saveProfile } from "@/lib/repository";
import { onboardingRepository } from "@/lib/onboarding";
import { CompetencyKey, Level, UserProfile } from "@/lib/types";

const evidenceLabels = ["暂无证据", "课程或社团", "个人项目", "实习或真实业务"];

export default function EvidencePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [confirmedKeys, setConfirmedKeys] = useState<string[]>([]);
  useEffect(() => {
    const currentProfile = loadProfile();
    setProfile(currentProfile);
    setConfirmedKeys(onboardingRepository.get().evidenceConfirmedKeys);
  }, []);
  const visible = useMemo(() => profile.competencies.map((item, index) => ({ item, index })).filter(({ item }) => item.level > 0), [profile]);

  function update(index: number, field: "evidenceLevel" | "evidenceNote", value: Level | string) {
    setProfile(current => ({ ...current, competencies: current.competencies.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  }

  function next() {
    const requiredKeys = visible.map(({ item }) => item.key);
    const hasIncompleteFact = visible.some(({ item }) => item.evidenceLevel > 0 && !item.evidenceNote.trim());
    if (requiredKeys.some(key => !confirmedKeys.includes(key)) || hasIncompleteFact) return;
    saveProfile(profile);
    onboardingRepository.saveEvidenceProgress(profile, confirmedKeys as CompetencyKey[]);
    router.push("/onboarding/complete");
  }

  return (
    <>
      <h1 className="page-title">哪些经历能证明这些能力？</h1>
      <p className="page-subtitle">只写真实做过的事情。没有证据的能力会进入“待验证”清单。</p>
      <OnboardingProgress current={3} />
      <section className="card panel onboarding-single">
        <div className="onboarding-heading"><div><span className="step-kicker">STEP 3 / 4</span><h2>事实与证据确认</h2></div><span className="muted">只追问你接触过的能力</span></div>
        {visible.length === 0 ? <div className="empty-state"><h3>你还没有选择接触过的能力</h3><p>返回上一步确认至少一项能力，或者继续完成注册，之后用微项目从零开始。</p></div> : visible.map(({ item, index }) => {
          const catalog = competencyCatalog.find(entry => entry.key === item.key)!;
          return <div className="evidence-form" key={item.key}>
            <div><b>{catalog.name}</b><small>你的自评：{["不了解", "接触过", "能独立完成小任务", "能交付完整结果"][item.level]}</small></div>
            <div className="field"><label>证据来自哪里？</label><select value={item.evidenceLevel} onChange={e => update(index, "evidenceLevel", Number(e.target.value) as Level)}>{evidenceLabels.map((label, level) => <option value={level} key={label}>{label}</option>)}</select></div>
            <div className="field"><label>用一句话描述你做过什么</label><input value={item.evidenceNote} onChange={e => update(index, "evidenceNote", e.target.value)} placeholder="例如：整理 20 篇资料并完成课程行业报告" disabled={item.evidenceLevel === 0} /></div>
            <button type="button" className={`evidence-status evidence-confirm ${confirmedKeys.includes(item.key) ? "ready" : "pending"}`} disabled={item.evidenceLevel > 0 && !item.evidenceNote.trim()} onClick={() => setConfirmedKeys(current => current.includes(item.key) ? current.filter(key => key !== item.key) : [...current, item.key])}>{item.evidenceLevel > 0 && !item.evidenceNote.trim() ? "先填写事实" : confirmedKeys.includes(item.key) ? "✓ 已确认" : item.evidenceLevel === 0 ? "确认待验证" : "确认此项"}</button>
          </div>;
        })}
        <div className="trust-note"><b>JobProof 不替你编经历</b><p>事实不完整时会显示“待补充”，不会自动生成数字或虚构项目结果。</p></div>
        <div className="actions onboarding-actions"><Link className="btn btn-secondary" href="/onboarding/abilities">← 返回</Link><button className="btn btn-primary" type="button" onClick={next} disabled={visible.some(({ item }) => !confirmedKeys.includes(item.key) || (item.evidenceLevel > 0 && !item.evidenceNote.trim()))}>{visible.some(({ item }) => !confirmedKeys.includes(item.key) || (item.evidenceLevel > 0 && !item.evidenceNote.trim())) ? `还需完成 ${visible.filter(({ item }) => !confirmedKeys.includes(item.key) || (item.evidenceLevel > 0 && !item.evidenceNote.trim())).length} 项证据确认` : "下一步：查看能力画像 →"}</button></div>
      </section>
    </>
  );
}
