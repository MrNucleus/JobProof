import { randomBytes } from "node:crypto";
import type { ZhihuToken, ZhihuUser } from "./zhihu-oauth";

export const SESSION_COOKIE = "jobproof_session";
export const STATE_COOKIE = "jobproof_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

type Session = { token: ZhihuToken; user: ZhihuUser; createdAt: number };
const sessions = new Map<string, Session>();
const states = new Map<string, number>();

function randomId() { return randomBytes(32).toString("base64url"); }

export function createOAuthState() {
  const state = randomId();
  states.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

export function consumeOAuthState(state: string, cookieState: string | undefined) {
  if (!state || !cookieState || state !== cookieState) return false;
  const expiresAt = states.get(state);
  states.delete(state);
  return Boolean(expiresAt && expiresAt > Date.now());
}

export function createSession(token: ZhihuToken, user: ZhihuUser) {
  const sessionId = randomId();
  sessions.set(sessionId, { token, user, createdAt: Date.now() });
  return sessionId;
}

export function getSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.token.expiresAt <= Date.now()) { sessions.delete(sessionId); return null; }
  return session;
}

export function deleteSession(sessionId: string | undefined) { if (sessionId) sessions.delete(sessionId); }

export function clearExpiredAuthState() {
  const now = Date.now();
  states.forEach((expiresAt, state) => { if (expiresAt <= now) states.delete(state); });
  sessions.forEach((session, id) => { if (session.token.expiresAt <= now) sessions.delete(id); });
}
