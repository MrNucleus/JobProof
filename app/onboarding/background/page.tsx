"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { defaultProfile } from "@/lib/data";
import { loadProfile, saveProfile } from "@/lib/repository";
import { onboardingRepository } from "@/lib/onboarding";
import { UserProfile } from "@/lib/types";

const roleOptions = [
  { value: "产品", icon: "◈", title: "产品方向", description: "洞察需求、设计方案，并推进产品迭代" },
  { value: "运营", icon: "✦", title: "运营方向", description: "连接用户、内容与增长，推动业务结果" }
] as const;

export default function BackgroundPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => setProfile(loadProfile()), []);

  function toggleRole(role: string) {
    setProfile(current => ({
      ...current,
      roleFamilies: current.roleFamilies.includes(role)
        ? current.roleFamilies.filter(item => item !== role)
        : [...current.roleFamilies, role]
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveProfile(profile);
    onboardingRepository.confirmBackground(profile);
    router.push("/onboarding/abilities");
  }

  return (
    <>
      <h1 className="page-title">先认识一下你</h1>
      <p className="page-subtitle">这些基本约束会影响岗位匹配结果和微项目安排。</p>
      <OnboardingProgress current={1} />

      <form className="card panel onboarding-single" onSubmit={submit}>
        <div className="onboarding-heading">
          <div><span className="step-kicker">STEP 1 / 4</span><h2>基本背景与求职约束</h2></div>
          <span className="muted">约 1 分钟</span>
        </div>
        <div className="form-grid">
          <div className="field"><label>你的称呼</label><input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="怎么称呼你？" required /></div>
          <div className="field"><label>年级</label><select value={profile.grade} onChange={e => setProfile({ ...profile, grade: e.target.value })}><option>大一</option><option>大二</option><option>大三</option><option>大四</option><option>研究生</option></select></div>
          <div className="field"><label>专业</label><input value={profile.major} onChange={e => setProfile({ ...profile, major: e.target.value })} placeholder="例如：市场营销" required /></div>
          <div className="field"><label>期望工作地点</label><input value={profile.cities} onChange={e => setProfile({ ...profile, cities: e.target.value })} placeholder="例如：上海、杭州或远程" aria-describedby="cities-hint" required /><small id="cities-hint" className="field-hint">可填写多个城市，用顿号分隔；也可以填写“远程”。</small></div>
          <div className="field"><label>每周可投入时间</label><select value={profile.weeklyHours} onChange={e => setProfile({ ...profile, weeklyHours: Number(e.target.value) })}><option value={3}>3 小时</option><option value={5}>5 小时</option><option value={8}>8 小时以上</option></select></div>
        </div>
        <hr className="divider" />
        <h3>你想探索哪些岗位方向？</h3>
        <p className="muted">可以多选，目前先聚焦产品与运营两个方向。</p>
        <div className="role-pills role-option-grid" role="group" aria-label="想探索的岗位方向">
          {roleOptions.map(option => {
            const selected = profile.roleFamilies.includes(option.value);
            return <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={`role-pill role-option ${selected ? "selected" : ""}`}
              onClick={() => toggleRole(option.value)}
            >
              <span className="role-option-icon" aria-hidden="true">{option.icon}</span>
              <span className="role-option-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
              <span className="role-option-check" aria-hidden="true">✓</span>
            </button>;
          })}
        </div>
        <div className="actions onboarding-actions"><span className="muted">本地流程数据保存在当前浏览器</span><button className="btn btn-primary" type="submit">下一步：能力自评 →</button></div>
      </form>
    </>
  );
}
