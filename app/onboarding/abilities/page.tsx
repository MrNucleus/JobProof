"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { competencyCatalog, defaultProfile } from "@/lib/data";
import { competencyAnchors, levelLabels } from "@/lib/competency-anchors";
import { loadProfile, saveProfile } from "@/lib/repository";
import { getOnboardingReadiness, onboardingRepository } from "@/lib/onboarding";
import { CompetencyKey, Interest, Level, UserProfile } from "@/lib/types";

const interestLabels: Record<Interest, string> = { like: "喜欢", neutral: "可以尝试", dislike: "不想做" };

export default function AbilitiesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [confirmedKeys, setConfirmedKeys] = useState<string[]>([]);
  const [checkingOrder, setCheckingOrder] = useState(true);
  useEffect(() => {
    const currentProfile = loadProfile();
    if (!getOnboardingReadiness(currentProfile).backgroundComplete) {
      router.replace("/onboarding/background");
      return;
    }
    setProfile(currentProfile);
    setConfirmedKeys(onboardingRepository.get().abilityConfirmedKeys);
    setCheckingOrder(false);
  }, [router]);

  const confirmed = useMemo(() => confirmedKeys.length, [confirmedKeys]);

  function update(index: number, field: "level" | "interest", value: Level | Interest) {
    setProfile(current => ({ ...current, competencies: current.competencies.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
    const key = profile.competencies[index].key;
    setConfirmedKeys(current => current.includes(key) ? current : [...current, key]);
  }

  function next() {
    if (confirmedKeys.length !== profile.competencies.length) return;
    saveProfile(profile);
    onboardingRepository.saveAbilityProgress(profile, confirmedKeys as CompetencyKey[]);
    router.push("/onboarding/evidence");
  }

  if (checkingOrder) return <div className="card account-loading">正在检查回答顺序…</div>;

  return (
    <>
      <h1 className="page-title">你现在能独立完成什么？</h1>
      <p className="page-subtitle">按真实水平选择。能力证据将在下一步单独确认。</p>
      <OnboardingProgress current={2} />
      <section className="card panel onboarding-single">
        <div className="onboarding-heading"><div><span className="step-kicker">STEP 2 / 4</span><h2>能力自评</h2></div><span className="muted">已确认 {confirmed} / 8 项</span></div>
        <div className="ability-list">
          {profile.competencies.map((item, index) => {
            const catalog = competencyCatalog.find(entry => entry.key === item.key)!;
            return <div className="ability-choice" key={item.key}>
              <div className="ability-name"><b>{catalog.name}</b><small>{catalog.description}</small>{confirmedKeys.includes(item.key) && <span className="confirmed-mark">✓ 已确认</span>}</div>
              <div className="level-buttons" role="group" aria-label={`${catalog.name}能力等级`}>
                {levelLabels.map((label, level) => <button type="button" title={competencyAnchors[item.key][level]} key={label} className={item.level === level ? "selected" : ""} onClick={() => update(index, "level", level as Level)}><span>{label}</span><small>{competencyAnchors[item.key][level]}</small></button>)}
              </div>
              <div className="interest-select"><label>你愿意继续做吗？</label><select value={item.interest} onChange={e => update(index, "interest", e.target.value as Interest)}>{Object.entries(interestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            </div>;
          })}
        </div>
        <div className="actions onboarding-actions"><Link className="btn btn-secondary" href="/onboarding/background">← 返回</Link><button className="btn btn-primary" type="button" onClick={next} disabled={confirmedKeys.length !== profile.competencies.length}>{confirmedKeys.length === profile.competencies.length ? "下一步：确认事实与证据 →" : `还需确认 ${profile.competencies.length - confirmedKeys.length} 项能力`}</button></div>
      </section>
    </>
  );
}
