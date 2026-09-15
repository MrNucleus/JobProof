import { randomBytes } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { ZhihuToken, ZhihuUser } from "./zhihu-oauth";

export const SESSION_COOKIE = "jobproof_session";
export const STATE_COOKIE = "jobproof_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000;

type Session = { token: ZhihuToken; user: ZhihuUser; createdAt: number };
const sessions = new Map<string, Session>();
const states = new Map<string, number>();
const AUTH_STORE_NAME = "jobproof-auth";

function randomId() { return randomBytes(32).toString("base64url"); }

function sharedStore() {
  return getStore({ name: AUTH_STORE_NAME, consistency: "strong" });
}

export async function createOAuthState() {
  const state = randomId();
  const expiresAt = Date.now() + STATE_TTL_MS;
  try { await sharedStore().setJSON(`state/${state}`, { expiresAt, consumedAt: null }); }
  catch { states.set(state, expiresAt); }
  return state;
}

export async function consumeOAuthState(state: string, cookieState: string | undefined) {
  const candidate = state || cookieState || "";
  if (!candidate || !cookieState || (state && state !== cookieState)) return false;
  try {
    const store = sharedStore();
    const record = await store.getWithMetadata(`state/${candidate}`, { type: "json", consistency: "strong" }) as { data?: { expiresAt?: number; consumedAt?: number | null }; etag?: string } | null;
    if (!record || typeof record.data?.expiresAt !== "number" || record.data.expiresAt <= Date.now() || record.data.consumedAt) return false;
    const result = await store.setJSON(`state/${candidate}`, { ...record.data, consumedAt: Date.now() }, { onlyIfMatch: record.etag });
    return result.modified;
  } catch {
    const expiresAt = states.get(candidate); states.delete(candidate);
    return Boolean(expiresAt && expiresAt > Date.now());
  }
}

export async function createSession(token: ZhihuToken, user: ZhihuUser) {
  const sessionId = randomId();
  const session = { token, user, createdAt: Date.now() };
  try { await sharedStore().setJSON(`session/${sessionId}`, session); }
  catch { sessions.set(sessionId, session); }
  return sessionId;
}

export async function getSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  let session: Session | null = null;
  try { session = await sharedStore().get(`session/${sessionId}`, { type: "json", consistency: "strong" }) as Session | null; }
  catch { session = sessions.get(sessionId) || null; }
  if (!session) return null;
  if (session.token.expiresAt <= Date.now()) { await deleteSession(sessionId); return null; }
  return session;
}

export async function deleteSession(sessionId: string | undefined) {
  if (!sessionId) return;
  sessions.delete(sessionId);
  try { await sharedStore().delete(`session/${sessionId}`); } catch { /* local fallback or already deleted */ }
}

export function clearExpiredAuthState() {
  const now = Date.now();
  states.forEach((expiresAt, state) => { if (expiresAt <= now) states.delete(state); });
  sessions.forEach((session, id) => { if (session.token.expiresAt <= now) sessions.delete(id); });
}
