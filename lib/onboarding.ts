"use client";

import { z } from "zod";
import { CompetencyKey, UserProfile } from "./domain";
import {
  abilityFingerprint,
  backgroundFingerprint,
  evidenceFingerprint,
  profileFingerprint
} from "./profile-fingerprint";

export {
  abilityFingerprint,
  backgroundFingerprint,
  evidenceFingerprint,
  profileFingerprint
} from "./profile-fingerprint";

const ONBOARDING_KEY = "jobproof.v2.onboarding";
export const ONBOARDING_EVENT = "jobproof:onboarding-updated";

const OnboardingStateSchema = z.object({
  backgroundFingerprint: z.string(),
  abilityFingerprint: z.string(),
  abilityConfirmedKeys: z.array(z.string()),
  evidenceFingerprint: z.string(),
  evidenceConfirmedKeys: z.array(z.string()),
  completedFingerprint: z.string(),
  confirmedAt: z.string()
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export type OnboardingReadiness = {
  backgroundComplete: boolean;
  abilitiesComplete: boolean;
  evidenceComplete: boolean;
  fullyConfirmed: boolean;
  missingAbilityKeys: CompetencyKey[];
  missingEvidenceKeys: CompetencyKey[];
  nextHref: string;
  nextLabel: string;
};

const emptyState: OnboardingState = {
  backgroundFingerprint: "",
  abilityFingerprint: "",
  abilityConfirmedKeys: [],
  evidenceFingerprint: "",
  evidenceConfirmedKeys: [],
  completedFingerprint: "",
  confirmedAt: ""
};

function readState(): OnboardingState {
  if (typeof window === "undefined") return emptyState;
  const raw = window.localStorage.getItem(ONBOARDING_KEY);
  if (!raw) return emptyState;
  try {
    const parsed = OnboardingStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyState;
  } catch {
    return emptyState;
  }
}

function writeState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
}

export function getOnboardingReadiness(profile: UserProfile): OnboardingReadiness {
  const state = readState();
  const allKeys = profile.competencies.map(item => item.key);
  const requiredEvidenceKeys = profile.competencies.filter(item => item.level > 0).map(item => item.key);
  const missingAbilityKeys = allKeys.filter(key => !state.abilityConfirmedKeys.includes(key));
  const missingEvidenceKeys = requiredEvidenceKeys.filter(key => {
    const competency = profile.competencies.find(item => item.key === key);
    const evidenceIsValid = competency && (competency.evidenceLevel === 0 || competency.evidenceNote.trim().length > 0);
    return !state.evidenceConfirmedKeys.includes(key) || !evidenceIsValid;
  });
  const backgroundComplete = state.backgroundFingerprint === backgroundFingerprint(profile);
  const abilitiesComplete = backgroundComplete
    && state.abilityFingerprint === abilityFingerprint(profile)
    && missingAbilityKeys.length === 0;
  const evidenceComplete = abilitiesComplete
    && state.evidenceFingerprint === evidenceFingerprint(profile)
    && missingEvidenceKeys.length === 0;
  const fullyConfirmed = evidenceComplete
    && state.completedFingerprint === profileFingerprint(profile);

  if (!backgroundComplete) return { backgroundComplete, abilitiesComplete, evidenceComplete, fullyConfirmed, missingAbilityKeys, missingEvidenceKeys, nextHref: "/onboarding/background", nextLabel: "完成基本背景" };
  if (!abilitiesComplete) return { backgroundComplete, abilitiesComplete, evidenceComplete, fullyConfirmed, missingAbilityKeys, missingEvidenceKeys, nextHref: "/onboarding/abilities", nextLabel: "逐项确认 8 项能力" };
  if (!evidenceComplete) return { backgroundComplete, abilitiesComplete, evidenceComplete, fullyConfirmed, missingAbilityKeys, missingEvidenceKeys, nextHref: "/onboarding/evidence", nextLabel: "确认事实与证据" };
  return { backgroundComplete, abilitiesComplete, evidenceComplete, fullyConfirmed, missingAbilityKeys, missingEvidenceKeys, nextHref: "/onboarding/complete", nextLabel: "最终确认能力画像" };
}

export const onboardingRepository = {
  get: readState,
  confirmBackground(profile: UserProfile) {
    const state = readState();
    const nextFingerprint = backgroundFingerprint(profile);
    writeState(state.backgroundFingerprint === nextFingerprint ? state : {
      ...emptyState,
      backgroundFingerprint: nextFingerprint
    });
  },
  saveAbilityProgress(profile: UserProfile, confirmedKeys: CompetencyKey[]) {
    const state = readState();
    const nextFingerprint = abilityFingerprint(profile);
    const abilitiesChanged = state.abilityFingerprint !== nextFingerprint;
    writeState({
      ...state,
      backgroundFingerprint: backgroundFingerprint(profile),
      abilityFingerprint: nextFingerprint,
      abilityConfirmedKeys: Array.from(new Set(confirmedKeys)),
      evidenceFingerprint: abilitiesChanged ? "" : state.evidenceFingerprint,
      evidenceConfirmedKeys: abilitiesChanged ? [] : state.evidenceConfirmedKeys,
      completedFingerprint: "",
      confirmedAt: ""
    });
  },
  saveEvidenceProgress(profile: UserProfile, confirmedKeys: CompetencyKey[]) {
    const state = readState();
    writeState({
      ...state,
      evidenceFingerprint: evidenceFingerprint(profile),
      evidenceConfirmedKeys: Array.from(new Set(confirmedKeys)),
      completedFingerprint: "",
      confirmedAt: ""
    });
  },
  complete(profile: UserProfile) {
    const readiness = getOnboardingReadiness(profile);
    if (!readiness.evidenceComplete) return false;
    writeState({
      ...readState(),
      completedFingerprint: profileFingerprint(profile),
      confirmedAt: new Date().toISOString()
    });
    return true;
  }
};

export function subscribeToOnboarding(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === ONBOARDING_KEY || event.key?.startsWith("jobproof.v2.")) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ONBOARDING_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ONBOARDING_EVENT, callback);
  };
}
