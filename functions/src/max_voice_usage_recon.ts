// ═══════════════════════════════════════════════════════════════════════════
// max_voice_usage_recon.ts — ежедневная сверка нашей себестоимости MAX со
// счётчиками самого OpenAI (Usage API).
//
// зачем (владелец 2026-08-30, «сколько стоило РЕАЛЬНО (точно)» + жёлтый пункт
// аудита): дневной бюджет-предохранитель и админ-цифры считаются из
// КЛИЕНТСКИХ usage-токенов (voice_call_billing). Если клиент занизит usage
// (баг/старая сборка), перерасход был бы невидим. Этот крон раз в сутки
// сравнивает наши суммы токенов за UTC-день с тем, что намерил OpenAI по
// realtime-моделям, пишет итог в max_voice_usage_recon/{день} и поднимает
// критический алерт (канал app_errors → Telegram) при расхождении.
//
// Usage API требует АДМИН-ключ организации (обычный проектный ключ получает
// 401): секрет OPENAI_ADMIN_API_KEY. Пока там заглушка — крон честно пишет
// статус no_admin_key и ничем не шумит; после `firebase functions:secrets:set
// OPENAI_ADMIN_API_KEY` сверка оживает без правок кода.
//
// Сравнение — по токенам (яблоки с яблоками): аудио-вход/выход realtime-моделей
// + стоимость обеих сторон по одной прайс-таблице VOICE_PRICES. Счёт Costs API
// намеренно не используется: он общий на всю организацию (диалоги, разборы,
// TTS) и с голосом несравним.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { AggregateField } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import type { Firestore } from 'firebase-admin/firestore';

import { withCronHeartbeat } from './cron_heartbeat';
import { ALLOWED_REALTIME_MODELS } from './max_voice_config';
import { VOICE_BILLING_COLLECTION, VOICE_PRICES } from './max_voice_session_end';
import { utcDayKey } from './max_voice_mint';

if (!admin.apps.length) admin.initializeApp();

const REGION = 'us-central1';
const OPENAI_ADMIN_API_KEY = defineSecret('OPENAI_ADMIN_API_KEY');
const OPENAI_USAGE_COMPLETIONS_URL = 'https://api.openai.com/v1/organization/usage/completions';
const USAGE_FETCH_TIMEOUT_MS = 20_000;
const USAGE_MAX_PAGES = 8;

export const MAX_VOICE_USAGE_RECON_COLLECTION = 'max_voice_usage_recon';
/** Относительный порог дрейфа + денежный пол: шум крошечных дней не алертит. */
export const RECON_DRIFT_REL_THRESHOLD = 0.12;
export const RECON_DRIFT_MIN_ABS_USD = 0.5;
const DAY_MS = 86_400_000;

export interface ReconTokenTotals {
  audioInputTokens: number;
  audioOutputTokens: number;
  cachedTokens: number;
  textInputTokens: number;
  textOutputTokens: number;
  estCostUsd: number;
}

export interface OursDayTotals extends ReconTokenTotals {
  calls: number;
  seconds: number;
}

export type ReconStatus = 'ok' | 'drift' | 'no_admin_key' | 'api_error' | 'no_data';

export interface ReconVerdict {
  status: ReconStatus;
  drift: { audioInPct: number; audioOutPct: number; costPct: number } | null;
  note: string;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Стоимость по НАШЕЙ прайс-таблице от агрегированных токенов одной стороны. */
export function reconCostUsd(totals: Omit<ReconTokenTotals, 'estCostUsd'>): number {
  const freshAudioIn = Math.max(0, totals.audioInputTokens - totals.cachedTokens);
  return (freshAudioIn / 1_000_000) * VOICE_PRICES.audioInputPerM
    + (totals.audioOutputTokens / 1_000_000) * VOICE_PRICES.audioOutputPerM
    + (totals.cachedTokens / 1_000_000) * VOICE_PRICES.cachedPerM
    + (totals.textInputTokens / 1_000_000) * VOICE_PRICES.textInputPerM
    + (totals.textOutputTokens / 1_000_000) * VOICE_PRICES.textOutputPerM;
}

function relDiff(a: number, b: number): number {
  const base = Math.max(a, b);
  if (base <= 0) return 0;
  return Math.abs(a - b) / base;
}

/**
 * Чистый вердикт сверки одного дня. Пороги: относительный дрейф по
 * аудио-токенам ИЛИ по стоимости выше 12%, при денежной разнице ≥ $0.50.
 */
export function compareVoiceUsageDay(
  ours: OursDayTotals,
  openai: ReconTokenTotals | null,
): ReconVerdict {
  if (openai === null) {
    return { status: 'api_error', drift: null, note: 'OpenAI Usage API не ответил — сверка не состоялась.' };
  }
  const ourAudio = ours.audioInputTokens + ours.audioOutputTokens;
  const theirAudio = openai.audioInputTokens + openai.audioOutputTokens;
  if (ourAudio === 0 && theirAudio === 0) {
    return { status: 'no_data', drift: null, note: 'За день не было голосового трафика ни у нас, ни у OpenAI.' };
  }
  const ourCost = ours.estCostUsd;
  const theirCost = openai.estCostUsd;
  const drift = {
    audioInPct: Math.round(relDiff(ours.audioInputTokens, openai.audioInputTokens) * 1000) / 10,
    audioOutPct: Math.round(relDiff(ours.audioOutputTokens, openai.audioOutputTokens) * 1000) / 10,
    costPct: Math.round(relDiff(ourCost, theirCost) * 1000) / 10,
  };
  const moneyGapUsd = Math.abs(ourCost - theirCost);
  const drifted = (relDiff(ours.audioInputTokens, openai.audioInputTokens) > RECON_DRIFT_REL_THRESHOLD
    || relDiff(ours.audioOutputTokens, openai.audioOutputTokens) > RECON_DRIFT_REL_THRESHOLD
    || relDiff(ourCost, theirCost) > RECON_DRIFT_REL_THRESHOLD)
    && moneyGapUsd >= RECON_DRIFT_MIN_ABS_USD;
  if (drifted) {
    return {
      status: 'drift',
      drift,
      note: `Расхождение с OpenAI: у нас $${ourCost.toFixed(2)}, у них $${theirCost.toFixed(2)} (гэп $${moneyGapUsd.toFixed(2)}).`,
    };
  }
  return { status: 'ok', drift, note: 'Наши токены совпадают со счётчиками OpenAI в пределах порога.' };
}

/**
 * Разбор ответа Usage API (completions, bucket_width=1d, group_by=model):
 * суммируем ТОЛЬКО realtime-модели из нашего whitelist. Незнакомые поля и
 * формы игнорируются молча — API моложе нашего кода и меняется.
 */
export function parseOpenAiUsagePage(
  raw: unknown,
  allowedModels: readonly string[] = ALLOWED_REALTIME_MODELS,
): { totals: Omit<ReconTokenTotals, 'estCostUsd'>; nextPage: string | null } {
  const totals = {
    audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0,
    textInputTokens: 0, textOutputTokens: 0,
  };
  const root = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const buckets = Array.isArray(root.data) ? root.data : [];
  for (const bucket of buckets) {
    const results = bucket && typeof bucket === 'object' && Array.isArray((bucket as Record<string, unknown>).results)
      ? (bucket as Record<string, unknown>).results as unknown[]
      : [];
    for (const row of results) {
      if (!row || typeof row !== 'object') continue;
      const item = row as Record<string, unknown>;
      const model = String(item.model ?? '').trim();
      if (!allowedModels.includes(model)) continue;
      totals.audioInputTokens += num(item.input_audio_tokens);
      totals.audioOutputTokens += num(item.output_audio_tokens);
      totals.cachedTokens += num(item.input_cached_tokens);
      // input_tokens в этом API — текстовый вход (аудио идёт отдельным полем).
      totals.textInputTokens += num(item.input_tokens);
      totals.textOutputTokens += num(item.output_tokens);
    }
  }
  const nextPage = root.has_more === true && typeof root.next_page === 'string' && root.next_page !== ''
    ? root.next_page
    : null;
  return { totals, nextPage };
}

/** UTC-границы дня по его ключу YYYY-MM-DD. */
export function dayBoundsMs(dayKey: string): { startMs: number; endMs: number } {
  const startMs = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(startMs)) throw new Error(`recon_bad_day_key:${dayKey}`);
  return { startMs, endMs: startMs + DAY_MS };
}

async function fetchOpenAiRealtimeUsageDay(
  adminKey: string,
  dayKey: string,
): Promise<ReconTokenTotals | null> {
  const { startMs, endMs } = dayBoundsMs(dayKey);
  const sums = {
    audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0,
    textInputTokens: 0, textOutputTokens: 0,
  };
  let page: string | null = null;
  for (let i = 0; i < USAGE_MAX_PAGES; i += 1) {
    const params = new URLSearchParams({
      start_time: String(Math.floor(startMs / 1000)),
      end_time: String(Math.floor(endMs / 1000)),
      bucket_width: '1d',
      limit: '1',
    });
    params.append('group_by[]', 'model');
    if (page) params.set('page', page);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), USAGE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(`${OPENAI_USAGE_COMPLETIONS_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('[MAX-USAGE-RECON] usage api failed', {
          dayKey, status: response.status, detail: detail.slice(0, 300), pageIndex: i,
        });
        return null;
      }
      const parsed = parseOpenAiUsagePage(await response.json().catch(() => ({})));
      sums.audioInputTokens += parsed.totals.audioInputTokens;
      sums.audioOutputTokens += parsed.totals.audioOutputTokens;
      sums.cachedTokens += parsed.totals.cachedTokens;
      sums.textInputTokens += parsed.totals.textInputTokens;
      sums.textOutputTokens += parsed.totals.textOutputTokens;
      if (!parsed.nextPage) break;
      page = parsed.nextPage;
    } catch (error) {
      console.error('[MAX-USAGE-RECON] usage api request error', {
        dayKey, pageIndex: i, error: String((error as Error)?.message ?? error).slice(0, 300),
      });
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return { ...sums, estCostUsd: reconCostUsd(sums) };
}

async function readOursDay(db: Firestore, dayKey: string): Promise<OursDayTotals> {
  const { startMs, endMs } = dayBoundsMs(dayKey);
  const snapshot = await db.collection(VOICE_BILLING_COLLECTION)
    .where('createdAtMs', '>=', startMs)
    .where('createdAtMs', '<', endMs)
    .aggregate({
      calls: AggregateField.count(),
      seconds: AggregateField.sum('seconds'),
      estCostUsd: AggregateField.sum('estCostUsd'),
      audioInputTokens: AggregateField.sum('audioInputTokens'),
      audioOutputTokens: AggregateField.sum('audioOutputTokens'),
      cachedTokens: AggregateField.sum('cachedTokens'),
      textInputTokens: AggregateField.sum('textInputTokens'),
      textOutputTokens: AggregateField.sum('textOutputTokens'),
    }).get();
  const data = snapshot.data();
  return {
    calls: Math.floor(num(data.calls)),
    seconds: num(data.seconds),
    estCostUsd: num(data.estCostUsd),
    audioInputTokens: num(data.audioInputTokens),
    audioOutputTokens: num(data.audioOutputTokens),
    cachedTokens: num(data.cachedTokens),
    textInputTokens: num(data.textInputTokens),
    textOutputTokens: num(data.textOutputTokens),
  };
}

function reconAlertId(dayKey: string): string {
  return `max_voice_usage_recon_${dayKey}`;
}

async function recordDriftAlert(db: Firestore, dayKey: string, note: string, nowMs: number): Promise<void> {
  // Тот же канал, что provider health: app_errors → Telegram; id по дню — дедуп.
  await db.collection('app_errors').doc(reconAlertId(dayKey)).set({
    severity: 'critical',
    feature: 'max_voice',
    context: 'max_voice_usage_recon',
    errorName: 'MaxVoiceUsageDrift',
    message: `Сверка ${dayKey}: ${note}`.slice(0, 900),
    fingerprint: `max_voice_usage_recon_${dayKey}`,
    platform: 'server',
    appVersion: 'cloud-functions',
    createdAtMs: nowMs,
    createdAt: new Date(nowMs).toISOString(),
    status: 'new',
  }, { merge: true });
}

export interface UsageReconRunDeps {
  readOurs(dayKey: string): Promise<OursDayTotals>;
  fetchOpenAi(dayKey: string): Promise<ReconTokenTotals | null>;
  adminKeyPresent: boolean;
  nowMs(): number;
}

/** Сверка одного дня: агрегат наш + агрегат OpenAI → вердикт → док + алерт. */
export async function runMaxVoiceUsageReconDay(
  db: Firestore,
  dayKey: string,
  deps: UsageReconRunDeps,
): Promise<ReconVerdict> {
  const nowMs = deps.nowMs();
  const ours = await deps.readOurs(dayKey);
  let openai: ReconTokenTotals | null = null;
  let verdict: ReconVerdict;
  if (!deps.adminKeyPresent) {
    verdict = {
      status: 'no_admin_key',
      drift: null,
      note: 'Нужен админ-ключ OpenAI: firebase functions:secrets:set OPENAI_ADMIN_API_KEY (ключ организации с правом чтения usage).',
    };
  } else {
    openai = await deps.fetchOpenAi(dayKey);
    verdict = compareVoiceUsageDay(ours, openai);
  }
  await db.collection(MAX_VOICE_USAGE_RECON_COLLECTION).doc(dayKey).set({
    schemaVersion: 1,
    dayKey,
    status: verdict.status,
    note: verdict.note,
    drift: verdict.drift,
    ours,
    openai,
    checkedAtMs: nowMs,
  }, { merge: true });
  console.log('[MAX-USAGE-RECON]', {
    dayKey,
    status: verdict.status,
    oursCostUsd: ours.estCostUsd,
    openaiCostUsd: openai?.estCostUsd ?? null,
    drift: verdict.drift,
  });
  if (verdict.status === 'drift') {
    await recordDriftAlert(db, dayKey, verdict.note, nowMs).catch((e) => {
      console.error('[MAX-USAGE-RECON] alert write failed', dayKey, e);
    });
  }
  return verdict;
}

/**
 * Дневной крон: сверяет ВЧЕРА и пересверяет позавчера (usage у OpenAI может
 * дозаполняться). Ошибка одного дня не мешает другому.
 */
export const maxVoiceUsageRecon = functions.scheduler.onSchedule(
  {
    schedule: '20 5 * * *',
    timeZone: 'UTC',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 1,
    secrets: [OPENAI_ADMIN_API_KEY],
  },
  withCronHeartbeat('maxVoiceUsageRecon', async () => {
    const db = admin.firestore();
    const nowMs = Date.now();
    const adminKey = String(OPENAI_ADMIN_API_KEY.value() || '').trim();
    // Заглушка/пусто = ключа нет: короткие строки настоящими ключами не бывают.
    const adminKeyPresent = adminKey.length >= 40;
    const deps: UsageReconRunDeps = {
      readOurs: (dayKey) => readOursDay(db, dayKey),
      fetchOpenAi: (dayKey) => fetchOpenAiRealtimeUsageDay(adminKey, dayKey),
      adminKeyPresent,
      nowMs: () => Date.now(),
    };
    for (const dayKey of [utcDayKey(nowMs - DAY_MS), utcDayKey(nowMs - 2 * DAY_MS)]) {
      try {
        await runMaxVoiceUsageReconDay(db, dayKey, deps);
      } catch (error) {
        console.error('[MAX-USAGE-RECON] day failed', dayKey, error);
      }
    }
  }),
);
