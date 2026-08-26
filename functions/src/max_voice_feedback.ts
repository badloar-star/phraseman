// ═══════════════════════════════════════════════════════════════════════════
// Отзыв ученика о звонке с MAX.
//
// зачем (владелец 2026-08-23): «когда диалог закончен, на экране результатов
// в самом верху добавь окно ввода фидбека с кнопкой отправить; в админке сделай
// раздел где можно читать эти фидбеки. Ключевой вопрос — как прошёл разговор,
// что понравилось, что улучшить».
//
// Один отзыв НА ЗВОНОК (решение владельца): повторная отправка с того же экрана
// перезаписывает свой же отзыв, а не плодит новый. Поэтому id документа —
// детерминированный (uid + sessionId), и защита от спама не требует отдельного
// счётчика: сколько звонков, столько и отзывов.
//
// Паттерн (санитизация, callable-опции, форма документа) — копия user_ideas.ts.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';

const REGION = 'us-central1';

export const VOICE_FEEDBACK_COLLECTION = 'max_voice_feedback';

/** Свободный текст: щедро для развёрнутого ответа, но не безразмерно. */
export const VOICE_FEEDBACK_TEXT_MAX = 2000;
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
export function sanitizeVoiceFeedbackRating(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 5) return 0;
  return n;
}

/**
 * Детерминированный id: один отзыв на звонок. Двоеточие и слэш в id Firestore
 * недопустимы, поэтому склеиваем через '__' и чистим небезопасные символы.
 */
export function voiceFeedbackDocId(stableUid: string, sessionId: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  return `${safe(stableUid)}__${safe(sessionId)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Ученик отправляет отзыв о звонке
// ─────────────────────────────────────────────────────────────────────────────
export const submitMaxVoiceFeedback = onCall(
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

    const message = text(payload.message, VOICE_FEEDBACK_TEXT_MAX);
    const rating = sanitizeVoiceFeedbackRating(payload.rating);
    const sessionId = text(payload.sessionId, 120);

    // Пустой отзыв без оценки писать незачем — это случайный тап.
    if (message.length < 2 && rating === 0) {
      throw new HttpsError('invalid-argument', 'message_required');
    }
    if (!sessionId) throw new HttpsError('invalid-argument', 'session_required');

    const now = Date.now();
    const ref = db.collection(VOICE_FEEDBACK_COLLECTION).doc(voiceFeedbackDocId(stableUid, sessionId));

    // set/merge, а не create: владелец разрешил один отзыв на звонок, поэтому
    // повторная отправка правит свой же отзыв и не плодит мусор в админке.
    await ref.set(
      {
        uid: stableUid,
        authUid,
        sessionId,
        message,
        rating,
        status: 'new',
        userName: nullableText(payload.userName, 120),
        lang: nullableText(payload.lang, 16),
        cefr: nullableText(payload.cefr, 8),
        format: nullableText(payload.format, 24),
        callSeconds: Math.max(0, Math.floor(Number(payload.callSeconds) || 0)),
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
// 2) Админ: лента отзывов
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Курсор — id последнего документа страницы (сортировка createdAtMs desc),
 * тот же паттерн, что и adminListUserIdeas. Читаем страницами по лимиту,
 * коллекцию целиком не выкачиваем.
 */
export const adminListMaxVoiceFeedback = onCall(
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

    let query = db
      .collection(VOICE_FEEDBACK_COLLECTION)
      .orderBy('createdAtMs', 'desc')
      .limit(limit + 1);

    if (cursor && FEEDBACK_CURSOR_RE.test(cursor)) {
      const cursorSnap = await db.collection(VOICE_FEEDBACK_COLLECTION).doc(cursor).get();
      if (cursorSnap.exists) query = query.startAfter(cursorSnap);
    }

    const snap = await query.get();
    const docs = snap.docs.slice(0, limit);
    const items = docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        uid: String(d.uid ?? ''),
        sessionId: String(d.sessionId ?? ''),
        message: String(d.message ?? ''),
        rating: sanitizeVoiceFeedbackRating(d.rating),
        status: String(d.status ?? 'new'),
        userName: d.userName ? String(d.userName) : null,
        lang: d.lang ? String(d.lang) : null,
        cefr: d.cefr ? String(d.cefr) : null,
        format: d.format ? String(d.format) : null,
        callSeconds: Number(d.callSeconds) || 0,
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
