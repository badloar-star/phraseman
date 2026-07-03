// ═══════════════════════════════════════════════════════════════════════════
// admin_daily_digest.ts — «что случилось за сутки» одним взглядом (для владельца).
//
// Зачем: каждое утро приходится вручную обходить репорты, отмены, health и
// safety, чтобы понять, всё ли в порядке. Эта функция читает те же источники за
// последние 24ч, сводит компактную статистику и просит ИИ написать короткую
// человеческую сводку с приоритетами и списком «сделай сегодня». Результат
// кладём в admin_digests/{dayKey} (читает вкладка админки) + короткую запись в
// admin_log (видно в Audit-log без нового UI).
//
// Приватность/дёшево: в ИИ уходит АГРЕГАТ (числа, топ-категории, короткие
// сэмплы), не сырые тексты пользователей целиком. Один вызов OpenAI на прогон.
//
// Архитектура: чистые aggregateDigestFacts / buildDigestPrompt (unit-тестируемы)
// отделены от I/O (loadDigestSources / runAdminDailyDigest). Модель и kill-switch —
// через resolveJobConfig(db,'digest') (тот же тюнинг, что у остальных ИИ-джобов).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { openAiChat } from './explain/explain_provider';
import { resolveJobConfig, assertJobEnabled } from './openai_jobs_config';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const DAY_MS = 24 * 60 * 60 * 1000;
const DIGESTS_COLLECTION = 'admin_digests';

// ── Типы фактов, собираемых из источников ─────────────────────────────────────
export interface DigestSourceRows {
  /** error_reports за 24ч: {status, category, screen}. */
  reports: Array<{ status?: string; category?: string; screen?: string }>;
  /** subscription_cancel_surveys за 24ч: {reason, reasonText}. */
  cancels: Array<{ reason?: string; reasonText?: string }>;
  /** app_errors за 24ч: {severity}. */
  appErrors: Array<{ severity?: string }>;
  /** safety_flags за 24ч: {category, handled}. */
  safety: Array<{ category?: string; handled?: boolean }>;
}

export interface DigestFacts {
  windowHours: number;
  reports: { total: number; open: number; byCategory: Record<string, number>; topScreens: Array<[string, number]> };
  cancels: { total: number; byReason: Record<string, number>; sampleTexts: string[] };
  appErrors: { total: number; critical: number };
  safety: { total: number; open: number; byCategory: Record<string, number> };
}

function countBy<T>(rows: T[], key: (r: T) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = (key(r) || '').trim() || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function topN(counts: Record<string, number>, n: number): Array<[string, number]> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/**
 * Сводит сырые строки источников в компактные факты (чистая функция).
 * Именно факты, а не сырьё, уходят в промпт — дёшево и приватно.
 */
export function aggregateDigestFacts(rows: DigestSourceRows, windowHours = 24): DigestFacts {
  const openReports = rows.reports.filter((r) => {
    const s = (r.status || '').toLowerCase();
    return s !== 'fixed' && s !== 'archived' && s !== 'answered';
  }).length;

  const sampleTexts = rows.cancels
    .map((c) => (c.reasonText || '').trim())
    .filter((t) => t.length > 0)
    .slice(0, 5)
    .map((t) => t.slice(0, 160));

  return {
    windowHours,
    reports: {
      total: rows.reports.length,
      open: openReports,
      byCategory: countBy(rows.reports, (r) => r.category),
      topScreens: topN(countBy(rows.reports, (r) => r.screen), 5),
    },
    cancels: {
      total: rows.cancels.length,
      byReason: countBy(rows.cancels, (c) => c.reason),
      sampleTexts,
    },
    appErrors: {
      total: rows.appErrors.length,
      critical: rows.appErrors.filter((e) => (e.severity || '').toLowerCase() === 'critical').length,
    },
    safety: {
      total: rows.safety.length,
      open: rows.safety.filter((s) => !s.handled).length,
      byCategory: countBy(rows.safety, (s) => s.category),
    },
  };
}

/** true, если за сутки вообще ничего не произошло (нет смысла звать ИИ). */
export function isDigestEmpty(facts: DigestFacts): boolean {
  return (
    facts.reports.total === 0 &&
    facts.cancels.total === 0 &&
    facts.appErrors.total === 0 &&
    facts.safety.total === 0
  );
}

const DIGEST_SYSTEM_PROMPT = [
  'Ты — толковый операционный помощник основателя мобильного приложения для изучения английского.',
  'Тебе дают СВОДКУ событий за последние сутки (числа и короткие примеры). Напиши краткий утренний дайджест НА РУССКОМ.',
  'Структура ответа (обычный текст, без markdown-заголовков):',
  '1) Одна строка-итог: спокойно всё или есть на что смотреть.',
  '2) 3-6 пунктов списком «•»: что важное произошло (сгруппируй одинаковое, называй числа).',
  '3) Блок «Сделай сегодня:» — 1-4 конкретных действия по приоритету; если действий нет — так и скажи.',
  'Тон: спокойный, по делу, как коллега. Без воды и канцелярита. Безопасность (safety-флаги) — всегда наверх, если они есть.',
  'Не выдумывай того, чего нет в данных. Если данных мало — честно скажи «сутки тихие».',
].join('\n');

/** Собирает user-payload для ИИ из фактов (чистая функция). */
export function buildDigestPrompt(facts: DigestFacts): string {
  return JSON.stringify(facts, null, 2);
}

// ── I/O: чтение источников за 24ч ──────────────────────────────────────────────
/**
 * Читает 4 коллекции по единому полю createdAtMs >= since. Каждый источник в
 * своём try — сбой одного (напр. нет индекса) не роняет весь дайджест.
 */
export async function loadDigestSources(
  db: FirebaseFirestore.Firestore,
  since: number,
  limitPer = 1000,
): Promise<DigestSourceRows> {
  const rows: DigestSourceRows = { reports: [], cancels: [], appErrors: [], safety: [] };

  const safeQuery = async <T>(
    collection: string,
    map: (d: FirebaseFirestore.QueryDocumentSnapshot) => T,
  ): Promise<T[]> => {
    try {
      const snap = await db
        .collection(collection)
        .where('createdAtMs', '>=', since)
        .limit(limitPer)
        .get();
      return snap.docs.map(map);
    } catch (e) {
      console.warn(`admin_daily_digest: read ${collection} failed`, e);
      return [];
    }
  };

  const [reports, cancels, appErrors, safety] = await Promise.all([
    safeQuery('error_reports', (d) => {
      const x = d.data();
      return { status: x.status as string, category: x.category as string, screen: x.screen as string };
    }),
    safeQuery('subscription_cancel_surveys', (d) => {
      const x = d.data();
      return { reason: x.reason as string, reasonText: x.reasonText as string };
    }),
    safeQuery('app_errors', (d) => ({ severity: d.data().severity as string })),
    safeQuery('safety_flags', (d) => {
      const x = d.data();
      return { category: x.category as string, handled: !!x.handled };
    }),
  ]);

  rows.reports = reports;
  rows.cancels = cancels;
  rows.appErrors = appErrors;
  rows.safety = safety;
  return rows;
}

/** UTC день-ключ (YYYY-MM-DD) — один документ дайджеста на сутки. */
export function utcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export interface DigestResult {
  ok: boolean;
  empty: boolean;
  dayKey: string;
  summary: string;
  facts: DigestFacts;
  model: string;
}

/**
 * Полный прогон: читает источники, агрегирует, зовёт ИИ, пишет в
 * admin_digests/{dayKey} и admin_log. Идемпотентно перезаписывает документ дня
 * (повторный вызов = свежий дайджест за те же сутки).
 */
export async function runAdminDailyDigest(
  apiKey: string,
  actorEmail: string,
  now: number = Date.now(),
): Promise<DigestResult> {
  const db = admin.firestore();
  const cfg = await resolveJobConfig(db, 'digest');
  assertJobEnabled(cfg, 'digest');

  const since = now - DAY_MS;
  const rows = await loadDigestSources(db, since);
  const facts = aggregateDigestFacts(rows, 24);
  const dayKey = utcDayKey(now);

  let summary: string;
  const empty = isDigestEmpty(facts);
  if (empty) {
    summary = 'За последние сутки заметных событий нет — репортов, отмен, критических ошибок и safety-флагов не поступало. Спокойные сутки.';
  } else {
    const result = await openAiChat({
      apiKey,
      model: cfg.model,
      messages: [
        { role: 'system', content: DIGEST_SYSTEM_PROMPT },
        { role: 'user', content: buildDigestPrompt(facts) },
      ],
      maxTokens: 700,
      temperature: 0.5,
    });
    summary = result.text.trim();
  }

  const nowIso = new Date(now).toISOString();
  await db.collection(DIGESTS_COLLECTION).doc(dayKey).set({
    dayKey,
    summary,
    facts,
    model: empty ? 'none' : cfg.model,
    generatedAt: nowIso,
    generatedAtMs: now,
    generatedBy: actorEmail || 'admin',
  });

  // Короткая запись в общий admin_log (виден в Audit-log без нового UI).
  await db.collection('admin_log').add({
    ts: nowIso,
    adminEmail: actorEmail || 'admin',
    action: 'ai_daily_digest',
    details: {
      dayKey,
      reports: facts.reports.total,
      cancels: facts.cancels.total,
      appErrorsCritical: facts.appErrors.critical,
      safetyOpen: facts.safety.open,
    },
  });

  return { ok: true, empty, dayKey, summary, facts, model: empty ? 'none' : cfg.model };
}

// ── Admin CF: сгенерировать дайджест по кнопке ────────────────────────────────
/**
 * adminGenerateDailyDigest — генерирует/перегенерирует дайджест за сутки.
 * data: {} (ничего не нужно). Возвращает { ok, empty, dayKey, summary, facts }.
 */
export const adminGenerateDailyDigest = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] },
  async (request) => {
    if (request.auth?.token?.admin !== true) {
      throw new HttpsError('permission-denied', 'Admin only');
    }
    // Do NOT clamp the secret — project-scoped keys can be long; truncation breaks auth.
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const actorEmail = String(request.auth?.token?.email ?? '');
    try {
      return await runAdminDailyDigest(apiKey, actorEmail);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('adminGenerateDailyDigest failed', e);
      throw new HttpsError('internal', e instanceof Error ? e.message : 'digest_failed');
    }
  },
);
