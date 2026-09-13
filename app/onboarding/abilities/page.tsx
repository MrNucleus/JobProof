"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { competencyCatalog, defaultProfile } from "@/lib/data";
import { loadProfile, saveProfile } from "@/lib/storage.complete";
import { Interest, Level, UserProfile } from "@/lib/types";

const levelLabels = ["不了解", "接触过", "能独立完成小任务", "能交付完整结果"];
const interestLabels: Record<Interest, string> = { like: "喜欢", neutral: "可以尝试", dislike: "不想做" };

export default function AbilitiesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  useEffect(() => setProfile(loadProfile()), []);

  const confirmed = useMemo(() => profile.competencies.filter(item => item.level > 0).length, [profile]);

  function update(index: number, field: "level" | "interest", value: Level | Interest) {
    setProfile(current => ({ ...current, competencies: current.competencies.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  }

  function next() {
    saveProfile(profile);
    router.push("/onboarding/evidence");
  }

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
              <div className="ability-name"><b>{catalog.name}</b><small>{catalog.description}</small></div>
              <div className="level-buttons" role="group" aria-label={`${catalog.name}能力等级`}>
                {levelLabels.map((label, level) => <button type="button" key={label} className={item.level === level ? "selected" : ""} onClick={() => update(index, "level", level as Level)}>{label}</button>)}
              </div>
              <div className="interest-select"><label>你愿意继续做吗？</label><select value={item.interest} onChange={e => update(index, "interest", e.target.value as Interest)}>{Object.entries(interestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            </div>;
          })}
        </div>
        <div className="actions onboarding-actions"><Link className="btn btn-secondary" href="/onboarding/background">← 返回</Link><button className="btn btn-primary" type="button" onClick={next}>下一步：确认事实与证据 →</button></div>
      </section>
    </>
  );
}
