import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasVerifiedCallablePermission } from './admin/permissions';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import { MISTAKE_COLLECTION } from './explain/mistake_explain_cache';

const ADMIN_EXPLAIN_CACHE_MAX_PAGE = 500;
const ADMIN_EXPLAIN_TEXT_MAX = 4_000;

type Row = Record<string, unknown>;

export interface AdminMistakeExplainCacheRow {
  readonly id: string;
  readonly status: string;
  readonly schemaVersion: number;
  readonly full: string | null;
  readonly eli5: string | null;
  readonly lang: string | null;
  readonly reason: string | null;
  readonly model: string | null;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly eli5PendingAtMs: number | null;
}

function record(value: unknown): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' ? value.slice(0, max) : null;
}

function nonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Authorize only framework-verified admins whose role may read reports. */
export function requireAdminExplainCacheRead(auth: unknown): void {
  if (!hasVerifiedCallablePermission(auth, 'reports.read')) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
}

/**
 * Explicit projection for the private mistake cache. Never spread the stored
 * document: old rows can contain learner input and identity/debug metadata.
 */
export function sanitizeAdminMistakeExplainCacheRow(
  id: string,
  value: unknown,
): AdminMistakeExplainCacheRow {
  const data = record(value);
  const status = ['ready', 'pending', 'rejected'].includes(String(data.status))
    ? String(data.status)
    : '?';
  const eli5PendingAtMs = data.eli5PendingAtMs == null
    ? null
    : nonNegativeNumber(data.eli5PendingAtMs);

  return Object.freeze({
    id: String(id).slice(0, 160),
    status,
    schemaVersion: Math.floor(nonNegativeNumber(data.schemaVersion)),
    full: text(data.full, ADMIN_EXPLAIN_TEXT_MAX),
    eli5: text(data.eli5, ADMIN_EXPLAIN_TEXT_MAX),
    lang: text(data.lang, 16),
    reason: text(data.reason, 120),
    model: text(data.model, 120),
    createdAtMs: nonNegativeNumber(data.createdAtMs),
    updatedAtMs: nonNegativeNumber(data.updatedAtMs),
    eli5PendingAtMs,
  });
}

function listLimit(value: unknown): number {
  const parsed = Math.floor(Number(value) || ADMIN_EXPLAIN_CACHE_MAX_PAGE);
  return Math.min(ADMIN_EXPLAIN_CACHE_MAX_PAGE, Math.max(1, parsed));
}

/**
 * Server-side list for the privacy-sealed mistake cache. Browser clients keep
 * direct delete-only reset access, but never gain direct read permission.
 */
export const adminListMistakeExplanationCache = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    requireAdminExplainCacheRead(request.auth);
    const limit = listLimit(record(request.data).limit);
    const snapshot = await admin.firestore()
      .collection(MISTAKE_COLLECTION)
      .orderBy('updatedAtMs', 'desc')
      .limit(limit + 1)
      .get();
    const truncated = snapshot.docs.length > limit;
    const items = snapshot.docs
      .slice(0, limit)
      .map((doc) => sanitizeAdminMistakeExplainCacheRow(doc.id, doc.data()));

    return { ok: true, items, truncated };
  },
);
