import { JobCompetency, MatchBreakdown, UserProfile } from "./domain";

const interestScore = {
  like: 100,
  neutral: 70,
  dislike: 10
} as const;

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(items: Array<{ value: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 0;
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function parseRequiredWeeklyHours(jdText: string) {
  const dayMatch = jdText.match(/(?:每周|一周)(?:至少)?\s*(\d)\s*天/i);
  if (dayMatch) return Number(dayMatch[1]) * 8;
  if (/全勤|全职实习/.test(jdText)) return 40;
  return null;
}

function constraintScore(jdText: string, profile: UserProfile) {
  const checks: Array<{ met: boolean; label: string }> = [];
  const requiredHours = parseRequiredWeeklyHours(jdText);
  if (requiredHours) checks.push({
    met: profile.weeklyHours >= requiredHours,
    label: profile.weeklyHours >= requiredHours ? "可投入时间满足 JD" : "每周可投入时间可能不足"
  });

  const listedCities = profile.cities.split(/[、,，/\s]+/).filter(Boolean);
  const jdMentionsPreferredCity = listedCities.some(city => city === "远程" ? /远程/.test(jdText) : jdText.includes(city));
  const hasLocationSignal = /北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|苏州|远程/.test(jdText);
  if (hasLocationSignal) checks.push({
    met: jdMentionsPreferredCity,
    label: jdMentionsPreferredCity ? "工作地点符合偏好" : "工作地点与当前偏好需确认"
  });

  const gradeRequirement = jdText.match(/大([一二三四])(?:及以上|以上)/);
  if (gradeRequirement) {
    const order: Record<string, number> = { "一": 1, "二": 2, "三": 3, "四": 4 };
    const userGrade = profile.grade.match(/大([一二三四])/)?.[1];
    const met = userGrade ? order[userGrade] >= order[gradeRequirement[1]] : true;
    checks.push({ met, label: met ? "年级要求已覆盖" : "年级可能不满足要求" });
  }

  if (!checks.length) return {
    score: 70,
    explanation: "JD 未明确城市、年级或出勤要求，暂按待确认计分。"
  };
  const passed = checks.filter(item => item.met).length;
  return {
    score: Math.round(passed / checks.length * 100),
    explanation: checks.map(item => item.label).join("；") + "。"
  };
}

export function calculateMatch(
  jdText: string,
  profile: UserProfile,
  competencies: JobCompetency[]
): { score: number; breakdown: MatchBreakdown } {
  const weightedCompetencies = competencies.map(item => ({
    weight: item.importance === "must" ? 1.5 : 1,
    coverage: Math.min(item.userLevel / 2, 1) * 100,
    evidence: Math.min((profile.competencies.find(entry => entry.key === item.key)?.evidenceLevel || 0) / 2, 1) * 100,
    preference: interestScore[profile.competencies.find(entry => entry.key === item.key)?.interest || "neutral"]
  }));
  const coverage = Math.round(weightedAverage(weightedCompetencies.map(item => ({ value: item.coverage, weight: item.weight }))));
  const evidence = Math.round(weightedAverage(weightedCompetencies.map(item => ({ value: item.evidence, weight: item.weight }))));
  const preference = Math.round(weightedAverage(weightedCompetencies.map(item => ({ value: item.preference, weight: item.weight }))));
  const constraints = constraintScore(jdText, profile);
  const recognizedRatio = competencies.length / 8;
  const evidenceFilled = average(profile.competencies.map(item => item.evidenceLevel > 0 || item.level === 0 ? 1 : 0));
  const confidence: MatchBreakdown["confidence"] =
    jdText.length >= 80 && competencies.length >= 4 && evidenceFilled >= 0.5
      ? "high"
      : jdText.length >= 40 && competencies.length >= 2
        ? "medium"
        : "low";
  const score = Math.round(coverage * 0.45 + evidence * 0.25 + preference * 0.15 + constraints.score * 0.15);

  return {
    score,
    breakdown: {
      coverage,
      evidence,
      preference,
      constraints: constraints.score,
      confidence,
      explanations: {
        coverage: competencies.filter(item => item.gap === 0).length + "/" + competencies.length + " 项要求达到可独立完成小任务的等级；必备项权重更高。",
        evidence: competencies.filter(item => (profile.competencies.find(entry => entry.key === item.key)?.evidenceLevel || 0) > 0).length + "/" + competencies.length + " 项岗位能力已有事实证据。",
        preference: "根据岗位涉及能力的兴趣选择计算，识别覆盖率为 " + Math.round(recognizedRatio * 100) + "%。",
        constraints: constraints.explanation
      }
    }
  };
}
