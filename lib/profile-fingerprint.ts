import type { UserProfile } from "./domain";

function hash(value: unknown) {
  const text = JSON.stringify(value);
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}

export function backgroundFingerprint(profile: UserProfile) {
  return hash({
    name: profile.name,
    grade: profile.grade,
    major: profile.major,
    cities: profile.cities,
    weeklyHours: profile.weeklyHours,
    roleFamilies: profile.roleFamilies
  });
}

export function abilityFingerprint(profile: UserProfile) {
  return hash(profile.competencies.map(item => ({
    key: item.key,
    level: item.level,
    interest: item.interest
  })));
}

export function evidenceFingerprint(profile: UserProfile) {
  return hash(profile.competencies.map(item => ({
    key: item.key,
    evidenceLevel: item.evidenceLevel,
    evidenceNote: item.evidenceNote.trim()
  })));
}

export function profileFingerprint(profile: UserProfile) {
  return hash({
    background: backgroundFingerprint(profile),
    abilities: abilityFingerprint(profile),
    evidence: evidenceFingerprint(profile)
  });
}