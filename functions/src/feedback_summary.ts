// ═══════════════════════════════════════════════════════════════════════════
// AI-сводка отзывов по разделу за период. Владелец 2026-08-25: «ии суммрайз
// каждого раздела отдельно», по кнопке в админке, кэш на несколько часов —
// не пересчитывать на каждый заход (Firebase-экономия, см. AGENTS.md).
//
// Читает feedback_entries (kind = lesson/vocab/dialogue/arena_blitz/
// arena_rating) ИЛИ max_voice_feedback (kind = 'max_call' — старая коллекция,
// см. feedback_entries.ts). Кэш — один документ на (kind, periodDays) в
// feedback_summary_cache, TTL 6 часов; повторный клик в окне TTL возвращает
// кэш без нового вызова модели.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';
import { openAiChat } from './explain/explain_provider';
import { FEEDBACK_ENTRIES_COLLECTION, FEEDBACK_KINDS, type FeedbackKind } from './feedback_entries';
import { VOICE_FEEDBACK_COLLECTION } from './max_voice_feedback';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const SUMMARY_CACHE_COLLECTION = 'feedback_summary_cache';
/** Не пересчитывать чаще: ручная кнопка + кэш, а не автоматический прогон на каждый заход. */
const SUMMARY_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const SUMMARY_MODEL = 'gpt-4o-mini';
const SUMMARY_SAMPLE_LIMIT = 200;

const MAX_CALL_KIND = 'max_call';
type SummaryKind = FeedbackKind | typeof MAX_CALL_KIND;
const SUMMARY_KINDS: readonly SummaryKind[] = [...FEEDBACK_KINDS, MAX_CALL_KIND];

export function isSummaryKind(value: unknown): value is SummaryKind {
  return typeof value === 'string' && (SUMMARY_KINDS as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function cacheDocId(kind: SummaryKind, periodDays: number): string {
  return `${kind}__${periodDays}d`;
}

interface SampleRow {
  rating: number;
  message: string;
  createdAtMs: number;
}

async function loadSample(db: FirebaseFirestore.Firestore, kind: SummaryKind, sinceMs: number): Promise<SampleRow[]> {
  const collectionName = kind === MAX_CALL_KIND ? VOICE_FEEDBACK_COLLECTION : FEEDBACK_ENTRIES_COLLECTION;
  let query: FirebaseFirestore.Query = db.collection(collectionName);
  if (kind !== MAX_CALL_KIND) query = query.where('kind', '==', kind);
  query = query.where('createdAtMs', '>=', sinceMs).orderBy('createdAtMs', 'desc').limit(SUMMARY_SAMPLE_LIMIT);
  const snap = await query.get();
  return snap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      rating: Math.max(0, Math.min(5, Math.round(Number(d.rating) || 0))),
      message: String(d.message ?? '').trim(),
      createdAtMs: Number(d.createdAtMs) || 0,
    };
  });
}

const SUMMARY_SYSTEM_PROMPT = `Ты аналитик продукта языкового приложения. Тебе дают отзывы учеников об одном
разделе приложения (оценки 1-5 звёзд + свободный текст). Составь короткую сводку на русском:
1) общее настроение и средняя оценка;
2) 2-4 повторяющиеся темы похвалы;
3) 2-4 повторяющиеся жалобы или проблемы (если есть);
4) если что-то требует внимания владельца — отдельной строкой "Стоит проверить: ...".
Пиши по-деловому, без воды, простыми словами. Не выдумывай темы, которых нет в отзывах.
Если отзывов мало или они пустые — честно скажи, что данных недостаточно для выводов.`;

function buildSummaryPrompt(kind: SummaryKind, periodDays: number, rows: SampleRow[]): string {
  const rated = rows.filter((r) => r.rating > 0);
  const avg = rated.length ? (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(2) : 'нет оценок';
  const lines = rows
    .filter((r) => r.message.length > 0)
    .slice(0, SUMMARY_SAMPLE_LIMIT)
    .map((r) => `[${r.rating > 0 ? `${r.rating}★` : 'без оценки'}] ${r.message}`)
    .join('\n');
  return `Раздел: ${kind}. Период: последние ${periodDays} дней. Всего отзывов: ${rows.length}, из них с оценкой: ${rated.length}, средняя оценка: ${avg}.\n\nТексты отзывов:\n${lines || '(текстов нет, только оценки)'}`;
}

export const adminSummarizeFeedback = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 5,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true || !hasAdminRole(role) || !hasPermission(role, 'reports.read')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const data = asRecord(request.data);
    const kind = data.kind;
    if (!isSummaryKind(kind)) throw new HttpsError('invalid-argument', 'kind_invalid');
    const periodDaysRaw = Math.floor(Number(data.periodDays) || 7);
    const periodDays = Math.min(3650, Math.max(1, periodDaysRaw));
    const force = data.force === true;

    const db = admin.firestore();
    const cacheRef = db.collection(SUMMARY_CACHE_COLLECTION).doc(cacheDocId(kind, periodDays));

    if (!force) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const c = cached.data() || {};
        const computedAtMs = Number(c.computedAtMs) || 0;
        if (Date.now() - computedAtMs < SUMMARY_CACHE_TTL_MS) {
          return {
            ok: true,
            summary: String(c.summary ?? ''),
            sampleSize: Number(c.sampleSize) || 0,
            computedAtMs,
            cached: true,
          };
        }
      }
    }

    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const sinceMs = Date.now() - periodDays * 24 * 60 * 60 * 1_000;
    const rows = await loadSample(db, kind, sinceMs);

    if (rows.length === 0) {
      const empty = { ok: true, summary: '', sampleSize: 0, computedAtMs: Date.now(), cached: false };
      await cacheRef.set({ summary: '', sampleSize: 0, computedAtMs: Date.now(), kind, periodDays }, { merge: true });
      return empty;
    }

    const result = await openAiChat({
      apiKey,
      model: SUMMARY_MODEL,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: buildSummaryPrompt(kind, periodDays, rows) },
      ],
      maxTokens: 700,
      temperature: 0.3,
    });

    const summary = result.text.trim();
    const computedAtMs = Date.now();
    await cacheRef.set(
      { summary, sampleSize: rows.length, computedAtMs, kind, periodDays },
      { merge: true },
    );

    return { ok: true, summary, sampleSize: rows.length, computedAtMs, cached: false };
  },
);
