// ═══════════════════════════════════════════════════════════════════════════
// Обобщённый отзыв ученика: оценка звёздами + свободный текст, с любого
// экрана завершения (урок / словарь / диалог / арена-блиц / арена-рейтинг /
// звонок MAX).
//
// зачем (владелец 2026-08-25): «надо чтобы такой же блок [звёзды + текст]
// был на экране завершения везде: уроки, сессии словарь, диалог, арена блиц
// или рейтинг. В админке — раздел с фильтром, чтобы видеть, что люди пишут
// и как оценивают каждый урок/диалог, с фильтром по датам и AI-саммари
// каждого раздела отдельно».
//
// Одна коллекция на все разделы (kind), а не пять отдельных — дешевле по
// чтениям (один composite-индекс на kind+createdAtMs, а не пять) и один
// набор функций/один экран админки вместо пяти. max_voice_feedback (звонок
// MAX) НЕ переехал сюда: он уже в проде с собственной формой и клиентами,
// переезд без выгоды — только риск. Новый раздел 'max_call' здесь не создаём;
// админка объединяет обе коллекции только на чтении (см. legacy.html).
//
// Паттерн (санитизация, callable-опции, детерминированный id, форма
// документа) — копия max_voice_feedback.ts / user_ideas.ts.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';
import {
  collectFilteredFeedbackPage,
  parseAdminFeedbackFilters,
  parseAdminFeedbackPeriod,
} from './feedback_admin_logic';

const REGION = 'us-central1';

export const FEEDBACK_ENTRIES_COLLECTION = 'feedback_entries';
export const FEEDBACK_SUBMISSION_QUOTAS_COLLECTION = 'feedback_submission_quotas';
export const FEEDBACK_DAILY_SUBMISSION_LIMIT = 30;
export const FEEDBACK_AI_SUMMARY_CONSENT_VERSION = 'feedback-ai-summary-v2';

/** Разделы, из которых можно отправить отзыв. Держать в синхроне с админкой (FEEDBACK_KIND_META). */
export const FEEDBACK_KINDS = [
  'lesson',
  'vocab',
  'dialogue',
  'arena_blitz',
  'arena_rating',
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === 'string' && (FEEDBACK_KINDS as readonly string[]).includes(value);
}

export const FEEDBACK_TEXT_MAX = 2000;
const FEEDBACK_MAX_LIST_LIMIT = 100;
const FEEDBACK_ADMIN_SCAN_BATCH = 100;
const FEEDBACK_CURSOR_RE = /^[A-Za-z0-9_-]{1,200}$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function nullableText(value: unknown, max: number): string | null {
  const out = text(value, max);
  return out || null;
}

/** Оценка 1–5; 0 — «не поставили», это допустимо (текст важнее звёзд). */
export function sanitizeFeedbackRating(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) return 0;
  return n;
}

/**
 * Детерминированный id: один отзыв на попытку (entityId — id урока/сессии
 * словаря/диалога/матча арены). Двоеточие и слэш в id Firestore недопустимы.
 */
export function feedbackEntryDocId(stableUid: string, kind: FeedbackKind, entityId: string): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([stableUid, kind, entityId]), 'utf8')
    .digest('base64url');
  return `fbe_v2_${digest}`;
}

export function feedbackQuotaDocId(stableUid: string): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([stableUid]), 'utf8')
    .digest('base64url');
  return `fbq_v2_${digest}`;
}

export function feedbackUtcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

type FeedbackQuotaIdentity = {
  stableUid: string;
  authUid: string;
  utcDay: string;
};

/**
 * Atomically creates one immutable feedback receipt and consumes one daily
 * quota unit. A replay checks the receipt first, so it neither overwrites the
 * original nor consumes quota again, including after the daily cap is reached.
 */
export async function commitFeedbackEntryWithQuota(
  db: FirebaseFirestore.Firestore,
  feedbackRef: FirebaseFirestore.DocumentReference,
  quotaRef: FirebaseFirestore.DocumentReference,
  document: FirebaseFirestore.DocumentData,
  identity: FeedbackQuotaIdentity,
  nowMs: number,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(feedbackRef);
    if (existing.exists) return true;

    const quotaSnapshot = await tx.get(quotaRef);
    const quotaData = quotaSnapshot.data() || {};
    const currentCount = quotaData.utcDay === identity.utcDay
      ? Math.max(0, Math.floor(Number(quotaData.count) || 0))
      : 0;
    if (currentCount >= FEEDBACK_DAILY_SUBMISSION_LIMIT) {
      throw new HttpsError('resource-exhausted', 'feedback_daily_limit');
    }

    tx.create(feedbackRef, document);
    tx.set(quotaRef, {
      stableUid: identity.stableUid,
      authUid: identity.authUid,
      utcDay: identity.utcDay,
      count: currentCount + 1,
      updatedAtMs: nowMs,
      serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(!quotaSnapshot.exists ? {
        createdAtMs: nowMs,
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } : {}),
    }, { merge: true });
    return false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Ученик отправляет отзыв
// ─────────────────────────────────────────────────────────────────────────────
export const submitFeedbackEntry = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUidForAuth(db, authUid);
    const payload = asRecord(request.data?.payload ?? request.data);

    const kind = payload.kind;
    if (!isFeedbackKind(kind)) throw new HttpsError('invalid-argument', 'kind_invalid');
    const message = text(payload.message, FEEDBACK_TEXT_MAX);
    const rating = sanitizeFeedbackRating(payload.rating);
    const entityId = text(payload.entityId, 120);
    const consentGranted = payload.aiSummaryConsent === true
      && text(payload.aiSummaryConsentVersion, 80) === FEEDBACK_AI_SUMMARY_CONSENT_VERSION;

    // Пустой отзыв без оценки писать незачем — это случайный тап.
    if (message.length < 2 && rating === 0) {
      throw new HttpsError('invalid-argument', 'message_required');
    }
    if (!entityId) throw new HttpsError('invalid-argument', 'entity_required');

    const now = Date.now();
    const ref = db.collection(FEEDBACK_ENTRIES_COLLECTION).doc(feedbackEntryDocId(stableUid, kind, entityId));
    const utcDay = feedbackUtcDay(now);
    const quotaRef = db.collection(FEEDBACK_SUBMISSION_QUOTAS_COLLECTION)
      .doc(feedbackQuotaDocId(stableUid));
    const document = {
      uid: stableUid,
      authUid,
      kind,
      entityId,
      entityLabel: nullableText(payload.entityLabel, 160),
      message,
      rating,
      status: 'new',
      userName: nullableText(payload.userName, 120),
      lang: nullableText(payload.lang, 16),
      platform: text(payload.platform, 40) || 'unknown',
      appVersion: text(payload.appVersion, 80) || 'unknown',
      aiSummaryConsent: consentGranted,
      aiSummaryConsentVersion: consentGranted ? FEEDBACK_AI_SUMMARY_CONSENT_VERSION : null,
      aiSummaryConsentAt: consentGranted ? admin.firestore.FieldValue.serverTimestamp() : null,
      createdAt: new Date(now).toISOString(),
      createdAtMs: now,
      serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // A retry replays the original immutable receipt. It cannot edit message,
    // consent, timestamps, or moderation status after the first accepted send.
    const replayed = await commitFeedbackEntryWithQuota(
      db,
      ref,
      quotaRef,
      document,
      { stableUid, authUid, utcDay },
      now,
    );

    return { ok: true, id: ref.id, replayed };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2) Админ: лента отзывов, с фильтром по разделу
// ─────────────────────────────────────────────────────────────────────────────
export const adminListFeedbackEntries = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'reports.read')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();

    const data = asRecord(request.data);
    const rawLimit = Math.floor(Number(data.limit) || 30);
    const limit = Math.min(FEEDBACK_MAX_LIST_LIMIT, Math.max(1, rawLimit));
    const cursor = text(data.cursor, 200);
    const kindFilter = isFeedbackKind(data.kind) ? data.kind : null;
    let filters;
    let periodDays;
    try {
      filters = parseAdminFeedbackFilters(data);
    } catch {
      throw new HttpsError('invalid-argument', 'feedback_filter_invalid');
    }
    try {
      periodDays = parseAdminFeedbackPeriod(data.periodDays ?? 0);
    } catch {
      throw new HttpsError('invalid-argument', 'feedback_period_invalid');
    }

    let baseQuery: FirebaseFirestore.Query = db.collection(FEEDBACK_ENTRIES_COLLECTION);
    if (kindFilter) baseQuery = baseQuery.where('kind', '==', kindFilter);
    const sinceMs = periodDays > 0 ? Date.now() - periodDays * 86_400_000 : 0;
    if (sinceMs > 0) baseQuery = baseQuery.where('createdAtMs', '>=', sinceMs);
    baseQuery = baseQuery.orderBy('createdAtMs', 'desc');

    const page = await collectFilteredFeedbackPage(async (scanCursor) => {
      let pageQuery = baseQuery.limit(FEEDBACK_ADMIN_SCAN_BATCH);
      if (scanCursor) {
        const cursorSnap = await db.collection(FEEDBACK_ENTRIES_COLLECTION).doc(scanCursor).get();
        if (cursorSnap.exists) pageQuery = pageQuery.startAfter(cursorSnap);
      }
      const snap = await pageQuery.get();
      return {
        rows: snap.docs.map((doc) => {
          const d = doc.data() || {};
          return {
            id: doc.id,
            uid: String(d.uid ?? ''),
            kind: String(d.kind ?? ''),
            entityId: String(d.entityId ?? ''),
            entityLabel: d.entityLabel ? String(d.entityLabel) : null,
            message: String(d.message ?? ''),
            rating: sanitizeFeedbackRating(d.rating),
            status: String(d.status ?? 'new'),
            userName: d.userName ? String(d.userName) : null,
            lang: d.lang ? String(d.lang) : null,
            platform: String(d.platform ?? 'unknown'),
            appVersion: String(d.appVersion ?? 'unknown'),
            createdAtMs: Number(d.createdAtMs) || 0,
          };
        }),
        exhausted: snap.docs.length < FEEDBACK_ADMIN_SCAN_BATCH,
      };
    }, filters, limit, cursor && FEEDBACK_CURSOR_RE.test(cursor) ? cursor : null);

    return { ok: true, items: page.items, nextCursor: page.nextCursor };
  },
);
