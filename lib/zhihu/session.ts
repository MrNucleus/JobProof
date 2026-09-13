import { randomBytes, timingSafeEqual } from "crypto";
import type { ZhihuUser } from "./types";

export const SESSION_COOKIE = "jobproof.zhihu.session";
export const STATE_COOKIE = "jobproof.zhihu.oauth_state";

interface SessionRecord {
  accessToken: string;
  expiresAt: number;
  user: ZhihuUser;
}

declare global {
  // eslint-disable-next-line no-var
  var jobProofZhihuSessions: Map<string, SessionRecord> | undefined;
}

const sessions = globalThis.jobProofZhihuSessions ?? new Map<string, SessionRecord>();
globalThis.jobProofZhihuSessions = sessions;

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function validateOAuthState(state: string, cookieState: string) {
  const actual = Buffer.from(state);
  const expected = Buffer.from(cookieState);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSession(accessToken: string, expiresIn: number, user: ZhihuUser) {
  const id = randomBytes(32).toString("base64url");
  sessions.set(id, {
    accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
    user
  });
  return id;
}

export function getSession(id?: string): SessionRecord | null {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function deleteSession(id?: string) {
  if (id) sessions.delete(id);
}
