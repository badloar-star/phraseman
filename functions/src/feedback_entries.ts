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
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';

const REGION = 'us-central1';

export const FEEDBACK_ENTRIES_COLLECTION = 'feedback_entries';

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
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return `${safe(stableUid)}__${kind}__${safe(entityId)}`;
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

    // Пустой отзыв без оценки писать незачем — это случайный тап.
    if (message.length < 2 && rating === 0) {
      throw new HttpsError('invalid-argument', 'message_required');
    }
    if (!entityId) throw new HttpsError('invalid-argument', 'entity_required');

    const now = Date.now();
    const ref = db.collection(FEEDBACK_ENTRIES_COLLECTION).doc(feedbackEntryDocId(stableUid, kind, entityId));

    // set/merge: повторная отправка правит свой же отзыв, не плодит мусор.
    await ref.set(
      {
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
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true, id: ref.id };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2) Админ: лента отзывов, с фильтром по разделу
// ─────────────────────────────────────────────────────────────────────────────
export const adminListFeedbackEntries = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
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

    let query: FirebaseFirestore.Query = db.collection(FEEDBACK_ENTRIES_COLLECTION);
    if (kindFilter) query = query.where('kind', '==', kindFilter);
    query = query.orderBy('createdAtMs', 'desc').limit(limit + 1);

    if (cursor && FEEDBACK_CURSOR_RE.test(cursor)) {
      const cursorSnap = await db.collection(FEEDBACK_ENTRIES_COLLECTION).doc(cursor).get();
      if (cursorSnap.exists) query = query.startAfter(cursorSnap);
    }

    const snap = await query.get();
    const docs = snap.docs.slice(0, limit);
    const items = docs.map((doc) => {
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
    });

    return {
      ok: true,
      items,
      nextCursor: snap.docs.length > limit ? docs[docs.length - 1]?.id ?? null : null,
    };
  },
);
