"use client";

import { defaultProfile } from "./data";
import { UserProfile } from "./types";

const PROFILE_KEY = "jobproof.profile.v1";

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
