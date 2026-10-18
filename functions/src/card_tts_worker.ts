// ═══════════════════════════════════════════════════════════════════════════
// card_tts_worker.ts — фоновая озвучка опубликованного набора (D128).
//
// Поток: одобрение набора (community_packs.ts) → card_tts_jobs/{packId}
// status 'queued' → этот триггер → план (card_tts_core) → проверка Storage
// (клип уже есть → не платим) → суточный бюджет символов → OpenAI TTS
// (≤4 параллельно, тайм-аут на запрос) → Storage → строка биллинга
// card_tts_billing → сводка `cardTts` в документе набора → job 'done'.
//
// Деплой — только после релиза 2.0 (D91). Экспортирован, но НЕ задеплоен.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { isPaidAiFetchAbort, paidAiFetchFailureReason } from './paid_ai_fetch_timeout';
import { aiGloballyDisabled, resolveRemoteBool } from './remote_gates';
import {
  CARD_TTS_CONCURRENCY,
  CARD_TTS_DAILY_CHAR_CAP,
  CARD_TTS_FETCH_TIMEOUT_MS,
  CARD_TTS_MAX_CHARS_PER_RUN,
  CARD_TTS_MAX_RUNS_PER_PACK_PER_DAY,
  CARD_TTS_MODEL,
  CARD_TTS_SPEED,
  CARD_TTS_STYLE_VERSION,
  CARD_TTS_VOICE_BY_LANGUAGE,
  cardTtsCharCount,
  cardTtsDayKey,
  cardTtsDownloadToken,
  cardTtsEstimateUsd,
  cardTtsInstructions,
  mapWithConcurrency,
  planPackCardTts,
  type CardTtsItem,
  type CardTtsLanguage,
} from './card_tts_core';
import { CARD_TTS_JOBS, enqueueCardTtsJob, isValidCardTtsPackId } from './card_tts_jobs';
import { reserveDailySpend } from './spend_cap';

const REGION = 'us-central1';
const COMMUNITY_PACKS = 'community_packs';
export const CARD_TTS_BILLING = 'card_tts_billing';
export const CARD_TTS_DAILY_BUDGET = 'card_tts_daily_budget';
/** Аренда job дольше потолка функции (300 с): упавший инстанс не блокирует набор навсегда. */
const CARD_TTS_LEASE_MS = 6 * 60 * 1000;
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const MIN_VALID_AUDIO_BYTES = 500;

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

export type CardTtsSpeechRequest = Readonly<{
  text: string;
  language: CardTtsLanguage;
  model: string;
  voice: string;
  speed: number;
  instructions: string;
}>;

type StorageFileLike = {
  exists(): Promise<[boolean]>;
  save(data: Buffer, options: Record<string, unknown>): Promise<void>;
};

export type CardTtsWorkerDeps = Readonly<{
  db: FirebaseFirestore.Firestore;
  bucket: { name: string; file(path: string): StorageFileLike };
  generateSpeech: (request: CardTtsSpeechRequest) => Promise<Buffer>;
  now: () => number;
}>;

export type CardTtsRunStatus =
  | 'done'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'deferred_budget'
  | 'deferred_daily_cap'
  | 'not_claimed';

export type CardTtsRunResult = Readonly<{
  status: CardTtsRunStatus;
  reason?: string;
  synthesized?: number;
  reused?: number;
  failed?: number;
  characters?: number;
}>;

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Один запрос OpenAI TTS → mp3. Тайм-аут через AbortSignal (PM-231). */
export async function requestCardSpeech(request: CardTtsSpeechRequest): Promise<Buffer> {
  const startedAt = Date.now();
  let response: Response;
  try {
    // зачем (владелец 18.10: «не больше 20 $ в день в принципе»): общий дневной потолок расходов — резерв до платного вызова.
    await reserveDailySpend({ fn: 'cardTts', kind: 'tts' });
    response = await fetch(OPENAI_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY.value().trim()}`,
        'Content-Type': 'application/json',
      },
      // зачем: D128 privacy — в OpenAI уходит ТОЛЬКО текст карточки и язык
      // (через инструкцию). Ни uid, ни id набора, ни профиля.
      body: JSON.stringify({
        model: request.model,
        voice: request.voice,
        input: request.text,
        speed: request.speed,
        instructions: request.instructions,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(CARD_TTS_FETCH_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    console.error('[CARD-TTS] openai:fetch_failed', JSON.stringify({
      language: request.language,
      chars: request.text.length,
      reason: isPaidAiFetchAbort(error) ? paidAiFetchFailureReason(error) : 'provider_exception',
      ms: Date.now() - startedAt,
      error: errorText(error),
    }));
    throw error;
  }
  if (!response.ok) {
    const detail = await response.text().catch((e: unknown) => `body_unreadable: ${errorText(e)}`);
    console.error('[CARD-TTS] openai:http_error', JSON.stringify({
      language: request.language,
      status: response.status,
      ms: Date.now() - startedAt,
      detail: detail.slice(0, 240),
    }));
    throw new Error(`card_tts_http_${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

type ClaimResult =
  | { claimed: true; claimedRequestedAtMs: number }
  | { claimed: false; status: CardTtsRunStatus; reason: string };

async function claimJob(deps: CardTtsWorkerDeps, packId: string): Promise<ClaimResult> {
  const jobRef = deps.db.collection(CARD_TTS_JOBS).doc(packId);
  return deps.db.runTransaction(async (tx) => {
    const nowMs = deps.now();
    const snap = await tx.get(jobRef);
    const job = (snap.data() ?? {}) as Record<string, unknown>;
    if (!snap.exists) return { claimed: false, status: 'not_claimed', reason: 'job_missing' } as const;
    if (job.status === 'running' && Number(job.leaseUntilMs ?? 0) > nowMs) {
      return { claimed: false, status: 'not_claimed', reason: 'already_running' } as const;
    }
    if (job.status !== 'queued' && job.status !== 'running') {
      return { claimed: false, status: 'not_claimed', reason: `status_${String(job.status)}` } as const;
    }
    const day = cardTtsDayKey(nowMs);
    const runsToday = job.runDay === day ? Number(job.runsToday ?? 0) : 0;
    if (runsToday >= CARD_TTS_MAX_RUNS_PER_PACK_PER_DAY) {
      tx.set(jobRef, { status: 'deferred_daily_cap', updatedAtMs: nowMs, lastReason: 'per_pack_daily_cap' }, { merge: true });
      return { claimed: false, status: 'deferred_daily_cap', reason: `runs_today_${runsToday}` } as const;
    }
    const claimedRequestedAtMs = Number(job.requestedAtMs ?? nowMs);
    tx.set(jobRef, {
      status: 'running',
      leaseUntilMs: nowMs + CARD_TTS_LEASE_MS,
      claimedRequestedAtMs,
      runDay: day,
      runsToday: runsToday + 1,
      attempts: Number(job.attempts ?? 0) + 1,
      startedAtMs: nowMs,
      updatedAtMs: nowMs,
    }, { merge: true });
    return { claimed: true, claimedRequestedAtMs } as const;
  });
}

/**
 * Завершить job. Если за время прогона набор поставили снова (правка карточек),
 * возвращаем 'queued' — триггер сработает ещё раз и озвучит новую ревизию.
 */
async function finishJob(
  deps: CardTtsWorkerDeps,
  packId: string,
  claimedRequestedAtMs: number,
  result: CardTtsRunResult,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const jobRef = deps.db.collection(CARD_TTS_JOBS).doc(packId);
  try {
    await deps.db.runTransaction(async (tx) => {
      const nowMs = deps.now();
      const snap = await tx.get(jobRef);
      const requestedAtMs = Number(snap.data()?.requestedAtMs ?? 0);
      const requeue = requestedAtMs > claimedRequestedAtMs;
      if (requeue) console.log('[CARD-TTS] finish:requeue — набор поставлен снова во время прогона', JSON.stringify({ packId, requestedAtMs, claimedRequestedAtMs }));
      tx.set(jobRef, {
        status: requeue ? 'queued' : result.status,
        lastResult: { ...result },
        lastFinishedAtMs: nowMs,
        leaseUntilMs: 0,
        updatedAtMs: nowMs,
        ...extra,
      }, { merge: true });
    });
  } catch (error: unknown) {
    // Аренда истечёт сама (CARD_TTS_LEASE_MS) — повтор возможен через admin requeue.
    console.error('[CARD-TTS] finish:write_failed', JSON.stringify({ packId, status: result.status, error: errorText(error) }));
  }
}

/** Суточный бюджет символов: одна транзакция на прогон (не на карточку). */
async function reserveDailyChars(deps: CardTtsWorkerDeps, chars: number): Promise<{ ok: boolean; used: number }> {
  const nowMs = deps.now();
  const ref = deps.db.collection(CARD_TTS_DAILY_BUDGET).doc(cardTtsDayKey(nowMs));
  return deps.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = Number(snap.data()?.chars ?? 0);
    const safeUsed = Number.isFinite(used) && used >= 0 ? used : CARD_TTS_DAILY_CHAR_CAP;
    if (safeUsed + chars > CARD_TTS_DAILY_CHAR_CAP) return { ok: false, used: safeUsed };
    tx.set(ref, { chars: safeUsed + chars, cap: CARD_TTS_DAILY_CHAR_CAP, updatedAtMs: nowMs }, { merge: true });
    return { ok: true, used: safeUsed + chars };
  });
}

function speechRequestFor(item: CardTtsItem): CardTtsSpeechRequest {
  return {
    text: item.text,
    language: item.language,
    model: CARD_TTS_MODEL,
    voice: CARD_TTS_VOICE_BY_LANGUAGE[item.language],
    speed: CARD_TTS_SPEED,
    instructions: cardTtsInstructions(item.language),
  };
}

type ItemOutcome = 'reused' | 'synthesized' | 'failed';

async function synthesizeItem(deps: CardTtsWorkerDeps, packId: string, item: CardTtsItem): Promise<ItemOutcome> {
  const file = deps.bucket.file(item.objectPath);
  try {
    const audio = await deps.generateSpeech(speechRequestFor(item));
    if (!audio || audio.length < MIN_VALID_AUDIO_BYTES) {
      console.error('[CARD-TTS] item:audio_too_small', JSON.stringify({ packId, key: item.key, bytes: audio?.length ?? 0 }));
      return 'failed';
    }
    await file.save(audio, {
      resumable: false,
      contentType: 'audio/mpeg',
      metadata: {
        // Токен детерминирован от пути — клиент строит ту же ссылку сам.
        metadata: {
          firebaseStorageDownloadTokens: cardTtsDownloadToken(item.objectPath),
          language: item.language,
          voice: CARD_TTS_VOICE_BY_LANGUAGE[item.language],
          model: CARD_TTS_MODEL,
          styleVersion: CARD_TTS_STYLE_VERSION,
        },
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return 'synthesized';
  } catch (error: unknown) {
    console.error('[CARD-TTS] item:failed', JSON.stringify({ packId, key: item.key, language: item.language, error: errorText(error) }));
    return 'failed';
  }
}

async function writePackSummary(
  deps: CardTtsWorkerDeps,
  packId: string,
  summary: Record<string, unknown>,
): Promise<void> {
  try {
    // update, а не set: удалённый за время прогона набор не воскрешаем.
    await deps.db.collection(COMMUNITY_PACKS).doc(packId).update({ cardTts: summary });
  } catch (error: unknown) {
    console.warn('[CARD-TTS] pack:summary_write_failed', JSON.stringify({ packId, error: errorText(error) }));
  }
}

/**
 * Ядро прогона — с внедряемыми зависимостями (тесты без эмулятора и OpenAI).
 */
export async function runCardTtsJob(packId: string, deps: CardTtsWorkerDeps): Promise<CardTtsRunResult> {
  console.log('[CARD-TTS] run:start', JSON.stringify({ packId }));
  if (!isValidCardTtsPackId(packId)) {
    console.warn('[CARD-TTS] run:skip invalid_pack_id', JSON.stringify({ packId: String(packId as unknown).slice(0, 80) }));
    return { status: 'skipped', reason: 'invalid_pack_id' };
  }
  let claim: ClaimResult;
  try {
    claim = await claimJob(deps, packId);
  } catch (error: unknown) {
    console.error('[CARD-TTS] run:claim_failed', JSON.stringify({ packId, error: errorText(error) }));
    return { status: 'not_claimed', reason: 'claim_failed' };
  }
  if (!claim.claimed) {
    console.log('[CARD-TTS] run:not_claimed', JSON.stringify({ packId, status: claim.status, reason: claim.reason }));
    return { status: claim.status, reason: claim.reason };
  }
  const claimedAt = claim.claimedRequestedAtMs;

  let pack: Record<string, unknown> | null = null;
  try {
    const snap = await deps.db.collection(COMMUNITY_PACKS).doc(packId).get();
    pack = snap.exists ? ((snap.data() ?? {}) as Record<string, unknown>) : null;
  } catch (error: unknown) {
    console.error('[CARD-TTS] run:pack_read_failed', JSON.stringify({ packId, error: errorText(error) }));
    const result = { status: 'failed', reason: 'pack_read_failed' } as const;
    await finishJob(deps, packId, claimedAt, result);
    return result;
  }

  const plan = planPackCardTts(packId, pack);
  if (!plan.ok) {
    console.log('[CARD-TTS] run:skip', JSON.stringify({ packId, reason: plan.reason, listingStatus: pack?.listingStatus ?? null }));
    const result = { status: 'skipped', reason: plan.reason } as const;
    await finishJob(deps, packId, claimedAt, result);
    return result;
  }

  const prior = (pack?.cardTts ?? null) as Record<string, unknown> | null;
  if (prior?.status === 'done' && prior.revision === plan.revision) {
    console.log('[CARD-TTS] run:skip already_voiced', JSON.stringify({ packId, revision: plan.revision }));
    const result = { status: 'done', reason: 'revision_already_voiced', synthesized: 0, reused: plan.items.length, failed: 0 } as const;
    await finishJob(deps, packId, claimedAt, result);
    return result;
  }

  // Глобальный дедуп: клип этой фразы мог уже появиться из другого набора.
  let existsFlags: boolean[];
  try {
    existsFlags = await mapWithConcurrency(plan.items, 8, async (item) => {
      const [exists] = await deps.bucket.file(item.objectPath).exists();
      return exists;
    });
  } catch (error: unknown) {
    console.error('[CARD-TTS] run:storage_probe_failed', JSON.stringify({ packId, error: errorText(error) }));
    const result = { status: 'failed', reason: 'storage_probe_failed' } as const;
    await finishJob(deps, packId, claimedAt, result);
    return result;
  }
  const missingAll = plan.items.filter((_, index) => !existsFlags[index]);
  const reused = plan.items.length - missingAll.length;

  // Потолок на прогон: берём префикс в пределах лимита, хвост — следующим прогоном.
  const missing: CardTtsItem[] = [];
  let chars = 0;
  for (const item of missingAll) {
    if (chars + item.text.length > CARD_TTS_MAX_CHARS_PER_RUN) break;
    missing.push(item);
    chars += item.text.length;
  }
  const deferredByRunCap = missingAll.length - missing.length;
  console.log('[CARD-TTS] run:plan', JSON.stringify({
    packId, language: plan.language, cards: plan.cardCount, unique: plan.items.length,
    reused, toSynthesize: missing.length, deferredByRunCap, chars, skipped: plan.skipped,
  }));

  if (missing.length > 0) {
    // зачем (PM-224): глобальный рубильник ИИ «Пульта» (remote_config/app.bools.ai_global_disable)
    // останавливал диалоги и объяснения, но не озвучку карточек — платный TTS шёл мимо него.
    // Проверяем только когда реально есть что синтезировать: повторное использование клипов бесплатно.
    // Набор не теряется: статус deferred_budget, вернуть в очередь — adminCardTtsRequeuePack.
    if (await aiGloballyDisabled(deps.db)) {
      console.warn('[CARD-TTS] run:deferred ai_globally_disabled', JSON.stringify({ packId, chars, toSynthesize: missing.length }));
      const result = { status: 'deferred_budget', reason: 'ai_globally_disabled', characters: chars } as const;
      await finishJob(deps, packId, claimedAt, result);
      return result;
    }
    let budget: { ok: boolean; used: number };
    try {
      budget = await reserveDailyChars(deps, chars);
    } catch (error: unknown) {
      console.error('[CARD-TTS] run:budget_failed', JSON.stringify({ packId, chars, error: errorText(error) }));
      const result = { status: 'failed', reason: 'budget_failed' } as const;
      await finishJob(deps, packId, claimedAt, result);
      return result;
    }
    if (!budget.ok) {
      console.warn('[CARD-TTS] run:deferred daily_char_cap', JSON.stringify({ packId, chars, used: budget.used, cap: CARD_TTS_DAILY_CHAR_CAP }));
      const result = { status: 'deferred_budget', reason: 'daily_char_cap', characters: chars } as const;
      await finishJob(deps, packId, claimedAt, result);
      return result;
    }
  }

  const outcomes = await mapWithConcurrency(missing, CARD_TTS_CONCURRENCY, (item) => synthesizeItem(deps, packId, item));
  const synthesized = outcomes.filter((o) => o === 'synthesized').length;
  const failed = outcomes.filter((o) => o === 'failed').length;
  const synthesizedChars = cardTtsCharCount(missing.filter((_, index) => outcomes[index] === 'synthesized'));

  if (missing.length > 0) {
    try {
      // зачем: дашборд трат OpenAI (openai_budget_dashboard.ts) читает эту коллекцию.
      // Идентификаторов пользователя здесь нет: только набор, язык и объём.
      await deps.db.collection(CARD_TTS_BILLING).add({
        operation: 'card_tts',
        model: CARD_TTS_MODEL,
        voice: CARD_TTS_VOICE_BY_LANGUAGE[plan.language],
        language: plan.language,
        characters: synthesizedChars,
        requests: missing.length,
        failedRequests: failed,
        estCostUsd: cardTtsEstimateUsd(synthesizedChars),
        packId,
        revision: plan.revision,
        createdAtMs: deps.now(),
      });
    } catch (error: unknown) {
      console.error('[CARD-TTS] billing:write_failed', JSON.stringify({ packId, synthesizedChars, error: errorText(error) }));
    }
  }

  const status: CardTtsRunStatus = failed > 0 || deferredByRunCap > 0
    ? (synthesized + reused > 0 ? 'partial' : 'failed')
    : 'done';
  const voicedCount = reused + synthesized;
  await writePackSummary(deps, packId, {
    status,
    revision: plan.revision,
    language: plan.language,
    voice: CARD_TTS_VOICE_BY_LANGUAGE[plan.language],
    model: CARD_TTS_MODEL,
    styleVersion: CARD_TTS_STYLE_VERSION,
    voicedCount,
    uniqueCount: plan.items.length,
    updatedAtMs: deps.now(),
  });
  const result: CardTtsRunResult = { status, synthesized, reused, failed, characters: synthesizedChars };
  console.log('[CARD-TTS] run:finish', JSON.stringify({ packId, ...result }));
  await finishJob(deps, packId, claimedAt, result);
  return result;
}

function defaultDeps(): CardTtsWorkerDeps {
  const bucket = admin.storage().bucket();
  return {
    db: admin.firestore(),
    bucket: {
      name: bucket.name,
      file: (path: string) => {
        const f = bucket.file(path);
        return {
          exists: () => f.exists() as Promise<[boolean]>,
          save: (data: Buffer, options: Record<string, unknown>) => f.save(data, options),
        };
      },
    },
    generateSpeech: requestCardSpeech,
    now: () => Date.now(),
  };
}

/**
 * Серверный рубильник озвучки карточек (remote_config/app.bools.card_tts_enabled), по умолчанию ВЫКЛ.
 * зачем (координатор 12.10, решение советника п.60(8)): политика §13 пока обещает, что озвучка только на устройстве.
 * Даже случайный полный `firebase deploy --only functions` не должен начать слать текст карточек в OpenAI —
 * без явного включения в «Пульте» триггер и перепостановка выходят, ничего не вызывая. Чтение кэшируется в памяти
 * инстанса на 10 мин: одно чтение документа, а не на каждую задачу. Ошибка чтения → ВЫКЛ (безопасная сторона).
 */
const CARD_TTS_GATE_KEY = 'card_tts_enabled';
const CARD_TTS_GATE_TTL_MS = 10 * 60 * 1000;
let cardTtsGateCache: { enabled: boolean; readAtMs: number } | null = null;

export async function isCardTtsEnabled(db: FirebaseFirestore.Firestore, nowMs: number = Date.now()): Promise<boolean> {
  if (cardTtsGateCache && nowMs - cardTtsGateCache.readAtMs < CARD_TTS_GATE_TTL_MS) {
    return cardTtsGateCache.enabled;
  }
  const enabled = await resolveRemoteBool(db, CARD_TTS_GATE_KEY, false);
  cardTtsGateCache = { enabled, readAtMs: nowMs };
  console.log('[CARD-TTS-GATE] read', JSON.stringify({ key: CARD_TTS_GATE_KEY, enabled }));
  return enabled;
}

/** Только для тестов. */
export function __resetCardTtsGateForTests(): void {
  cardTtsGateCache = null;
}

/**
 * Триггер очереди. retry:false — повтор через admin requeue, а не бесконечные
 * автоповторы с риском платить OpenAI по кругу. maxInstances:2 — очередь
 * маленькая, распараллеливать наборы незачем.
 */
export const cardTtsPackWorker = onDocumentWritten({
  document: `${CARD_TTS_JOBS}/{packId}`,
  region: REGION,
  secrets: [OPENAI_API_KEY],
  timeoutSeconds: 300,
  memory: '512MiB',
  retry: false,
  maxInstances: 2,
}, async (event) => {
  const after = event.data?.after;
  const packId = String(event.params?.packId ?? '');
  if (!after?.exists) {
    console.log('[CARD-TTS] trigger:skip job_deleted', JSON.stringify({ packId }));
    return;
  }
  const status = after.data()?.status;
  // Каждая смена статуса (running/done) будит триггер ещё раз — выходим дёшево.
  if (status !== 'queued') {
    console.log('[CARD-TTS] trigger:skip', JSON.stringify({ packId, status: String(status) }));
    return;
  }
  if (!(await isCardTtsEnabled(admin.firestore()))) {
    // Задача остаётся queued: после включения её вернёт в работу adminCardTtsRequeuePack.
    console.warn('[CARD-TTS-GATE] skipped:disabled', JSON.stringify({ packId, source: 'trigger' }));
    return;
  }
  await runCardTtsJob(packId, defaultDeps());
});

/**
 * Повторная постановка набора (после сбоя/бюджета). Только custom claim admin.
 * Кнопку в админке делает сессия, владеющая admin/v2/legacy.html (см. отчёт D128).
 */
export const adminCardTtsRequeuePack = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    console.warn('[CARD-TTS] requeue:denied', JSON.stringify({ hasAuth: !!request.auth }));
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const packId = String(request.data?.packId ?? '').trim();
  if (!isValidCardTtsPackId(packId)) {
    console.warn('[CARD-TTS] requeue:invalid_pack_id', JSON.stringify({ packId: String(packId as unknown).slice(0, 80) }));
    throw new HttpsError('invalid-argument', 'packId required');
  }
  if (!(await isCardTtsEnabled(admin.firestore()))) {
    console.warn('[CARD-TTS-GATE] skipped:disabled', JSON.stringify({ packId, source: 'admin_requeue' }));
    throw new HttpsError('failed-precondition', 'card_tts_disabled');
  }
  const ok = await enqueueCardTtsJob(admin.firestore(), packId, 'admin_requeue');
  if (!ok) throw new HttpsError('unavailable', 'enqueue_failed');
  return { ok: true, packId };
});
