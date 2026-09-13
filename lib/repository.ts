"use client";

import { z } from "zod";
import { defaultProfile } from "./data";
import {
  JobAnalysis,
  JobAnalysisSchema,
  UserProfile,
  UserProfileSchema
} from "./domain";

const SCHEMA_VERSION = 2;
const PROFILE_V1_KEY = "jobproof.profile.v1";
const ANALYSIS_V1_KEY = "jobproof.analysis.v1";
const PROFILE_V2_KEY = "jobproof.v2.profile";
const ANALYSIS_V2_KEY = "jobproof.v2.analysis";

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const envelope = z.object({
      schemaVersion: z.literal(SCHEMA_VERSION),
      updatedAt: z.string(),
      data: z.unknown()
    }).safeParse(JSON.parse(raw));
    if (!envelope.success) return null;
    const data = schema.safeParse(envelope.data.data);
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, schema: z.ZodType<T>, data: T) {
  if (typeof window === "undefined") return;
  const valid = schema.parse(data);
  window.localStorage.setItem(key, JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: valid
  }));
}

function readLegacy<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const profileRepository = {
  get(): UserProfile {
    const current = read(PROFILE_V2_KEY, UserProfileSchema);
    if (current) return current;
    const legacy = readLegacy(PROFILE_V1_KEY, UserProfileSchema);
    if (legacy) {
      write(PROFILE_V2_KEY, UserProfileSchema, legacy);
      return legacy;
    }
    return UserProfileSchema.parse(defaultProfile);
  },
  save(profile: UserProfile) {
    write(PROFILE_V2_KEY, UserProfileSchema, profile);
  }
};

export const analysisRepository = {
  get(): JobAnalysis | null {
    const current = read(ANALYSIS_V2_KEY, JobAnalysisSchema);
    if (current) return current;
    const legacy = readLegacy(ANALYSIS_V1_KEY, JobAnalysisSchema);
    if (legacy) {
      write(ANALYSIS_V2_KEY, JobAnalysisSchema, legacy);
      return legacy;
    }
    return null;
  },
  save(analysis: JobAnalysis) {
    write(ANALYSIS_V2_KEY, JobAnalysisSchema, analysis);
  }
};

export const loadProfile = () => profileRepository.get();
export const saveProfile = (profile: UserProfile) => profileRepository.save(profile);
export const loadAnalysis = () => analysisRepository.get();
export const saveAnalysis = (analysis: JobAnalysis) => analysisRepository.save(analysis);

