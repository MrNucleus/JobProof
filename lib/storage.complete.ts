"use client";

import { defaultProfile } from "./data";
import { JobAnalysis, UserProfile } from "./types";

const PROFILE_KEY = "jobproof.profile.v1";
const ANALYSIS_KEY = "jobproof.analysis.v1";

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return defaultProfile;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: UserProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function saveAnalysis(analysis: JobAnalysis) {
  window.localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
}

export function loadAnalysis(): JobAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ANALYSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JobAnalysis;
  } catch {
    return null;
  }
}
