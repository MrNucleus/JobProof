export type Level = 0 | 1 | 2 | 3;
export type Interest = "like" | "neutral" | "dislike";

export type CompetencyKey =
  | "research"
  | "interview"
  | "competitor"
  | "data"
  | "content"
  | "delivery"
  | "communication"
  | "tools";

export interface CompetencyProfile {
  key: CompetencyKey;
  level: Level;
  evidenceLevel: Level;
  interest: Interest;
  evidenceNote: string;
}

export interface UserProfile {
  name: string;
  grade: string;
  major: string;
  cities: string;
  weeklyHours: number;
  roleFamilies: string[];
  competencies: CompetencyProfile[];
}

export interface JobCompetency {
  key: CompetencyKey;
  name: string;
  importance: "must" | "bonus";
  jdQuote: string;
  userLevel: Level;
  gap: number;
}

export interface JobAnalysis {
  title: string;
  summary: string;
  competencies: JobCompetency[];
  matchScore: number;
  strengths: string[];
  gaps: string[];
  nextAction: string;
}
