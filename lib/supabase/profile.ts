import { competencyCatalog } from "@/lib/data";
import { UserProfile, UserProfileSchema } from "@/lib/domain";

export type CloudProfileRow = {
  id: string;
  user_id: string;
  name: string;
  grade: string;
  major: string;
  cities: string;
  weekly_hours: number;
  role_families: string[];
  onboarding_status: string;
};

export type CloudCompetencyRow = {
  profile_id: string;
  competency_key: UserProfile["competencies"][number]["key"];
  self_level: number;
  evidence_level: number;
  interest: UserProfile["competencies"][number]["interest"];
  evidence_note: string;
};

export function toCloudProfile(userId: string, profile: UserProfile) {
  return {
    user_id: userId,
    name: profile.name,
    grade: profile.grade,
    major: profile.major,
    cities: profile.cities,
    weekly_hours: profile.weeklyHours,
    role_families: profile.roleFamilies,
    onboarding_status: "in_progress"
  };
}

export function toCloudCompetencies(profileId: string, profile: UserProfile): CloudCompetencyRow[] {
  return profile.competencies.map((item) => ({
    profile_id: profileId,
    competency_key: item.key,
    self_level: item.level,
    evidence_level: item.evidenceLevel,
    interest: item.interest,
    evidence_note: item.evidenceNote
  }));
}

export function fromCloudProfile(row: CloudProfileRow, rows: CloudCompetencyRow[]): UserProfile {
  const byKey = new Map(rows.map((item) => [item.competency_key, item]));
  return UserProfileSchema.parse({
    name: row.name,
    grade: row.grade,
    major: row.major,
    cities: row.cities,
    weeklyHours: row.weekly_hours,
    roleFamilies: Array.isArray(row.role_families) ? row.role_families : [],
    competencies: competencyCatalog.map((item) => {
      const cloud = byKey.get(item.key);
      return {
        key: item.key,
        level: cloud?.self_level ?? 0,
        evidenceLevel: cloud?.evidence_level ?? 0,
        interest: cloud?.interest ?? "neutral",
        evidenceNote: cloud?.evidence_note ?? ""
      };
    })
  });
}
