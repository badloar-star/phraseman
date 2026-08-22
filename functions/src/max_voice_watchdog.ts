// ═══════════════════════════════════════════════════════════════════════════
// max_voice_watchdog.ts — финальная гарантия закрытия висящих voice-резервов.
//
// Клиент может умереть молча (kill app, потеря сети, разряженная батарея) —
// тогда maxVoiceSessionEnd не приходит, а резерв держит день/месяц и блокирует
// новые звонки. Watchdog каждые 10 минут дожимает резервы, у которых истёк
// expiresAtMs (= старт + cap + 120с), списывая ПО ПОСЛЕДНЕМУ HEARTBEAT, а не
// полным резервом: недоотчитавшийся честный юзер платит только за прожитое.
//
// runMaxVoiceWatchdogOnce — чистая (db и nowMs инжектятся) и тестируемая;
// scheduled-обёртка лишь вызывает её (паттерн premiumExpiryCron).
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import type { Firestore } from 'firebase-admin/firestore';
import {
  VOICE_QUOTA_COLLECTION,
  releaseVoiceReservation,
  settleVoiceSession,
  voiceSessionClockStartMs,
} from './max_voice_quota';
import {
  VOICE_EST_COST_USD_PER_MIN,
  decrementVoiceMintCount,
  refundVoiceBudgetEstimate,
  runMaxVoiceProviderProbe,
} from './max_voice_mint';
import { estimateVoiceCostUsd, sanitizeVoiceUsage, writeVoiceBillingRow } from './max_voice_session_end';
import { resolveMaxVoiceConfig } from './max_voice_config';
import {
  MAX_VOICE_OPS_EVENT_SCHEMA,
  recordMaxVoiceOpsOnce,
  type MaxVoiceOpsEventV1,
} from './max_voice_ops';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/** Provider probe cadence: catches contract/key/model drift before user traffic. */
export const MAX_VOICE_PROVIDER_HEALTH_SCHEDULE = 'every 10 minutes';

/**
 * Свежий heartbeat = сессия ещё жива (например, reconnect-чейн в процессе или
 * settle в полёте) — такие НЕ трогаем, дожмём на следующем проходе, если замолчат.
 */
export const VOICE_WATCHDOG_HEARTBEAT_GRACE_MS = 120_000;

/** Размер страницы скана: висящих резервов много не бывает, 500 хватает с запасом. */
export const VOICE_WATCHDOG_PAGE_LIMIT = 500;

export interface VoiceWatchdogStats {
  scanned: number;
  /** Дожаты по heartbeat с причиной 'watchdog'. */
  settled: number;
  /** Возвращены целиком: минт без единого heartbeat после старта ('briefing_abandoned'). */
  released: number;
  /** Пропущены: expiresAtMs истёк, но heartbeat свежий — сессия ещё дышит. */
  skippedAlive: number;
  errors: number;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * Один проход watchdog'а. Для каждого протухшего резерва:
 *   - heartbeat свежее 120с → пропуск (не рвём живое);
 *   - ни одного heartbeat после старта → release целиком, 'briefing_abandoned'
 *     + декремент неиспользованного минта в rate limit (floor внутри);
 *   - иначе → settle по elapsed до ПОСЛЕДНЕГО heartbeat, 'watchdog'.
 * Сеттл-транзакции квоты идемпотентны — гонка с опоздавшим maxVoiceSessionEnd
 * безопасна в обе стороны.
 */
export async function runMaxVoiceWatchdogOnce(db: Firestore, nowMs: number = Date.now()): Promise<VoiceWatchdogStats> {
  const stats: VoiceWatchdogStats = { scanned: 0, settled: 0, released: 0, skippedAlive: 0, errors: 0 };

  const snap = await db.collection(VOICE_QUOTA_COLLECTION)
    .where('expiresAtMs', '>', 0)
    .where('expiresAtMs', '<=', nowMs)
    .limit(VOICE_WATCHDOG_PAGE_LIMIT)
    .get();

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    stats.scanned += 1;
    try {
      const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
      const sessionId = str(data.activeSessionId);
      const authUid = str(data.authUid);
      const stableUid = str(data.stableUid);
      if (reservedSec <= 0 || !sessionId || !authUid || !stableUid) continue;

      // Часы разговора — от активации (первый heartbeat); pre-mint без звонка
      // так и остаётся «ни одной прожитой секунды» → briefing_abandoned ниже.
      const startedAtMs = voiceSessionClockStartMs(data);
      const lastHeartbeatMs = num(data.lastHeartbeatMs, startedAtMs);
      if (nowMs - lastHeartbeatMs <= VOICE_WATCHDOG_HEARTBEAT_GRACE_MS) {
        stats.skippedAlive += 1;
        continue;
      }

      const heartbeatElapsedSec = startedAtMs > 0
        ? Math.max(0, Math.ceil((lastHeartbeatMs - startedAtMs) / 1000))
        : 0;

      if (heartbeatElapsedSec <= 0) {
        // Минт был, но звонок так и не начался (бросил брифинг / SDP не дошёл):
        // полный возврат резерва + минт не считается в rate limit (floor 1 внутри).
        const result = await releaseVoiceReservation(db, {
          authUid, stableUid, sessionId, reason: 'briefing_abandoned', nowMs,
        });
        if (!result.alreadySettled) {
          stats.released += 1;
          await decrementVoiceMintCount(db, authUid, stableUid, nowMs).catch(() => {});
          // Сторно бюджета: минт зарезервировал оценку всего резерва, settle не
          // наступит — иначе брошенные минты надували бы лестницу до конца дня.
          await refundVoiceBudgetEstimate(db, (result.refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, nowMs)
            .catch(() => {});
          for (const event of [
            { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'watchdog_end' },
            { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'watchdog_settled' },
          ] as MaxVoiceOpsEventV1[]) {
            await recordMaxVoiceOpsOnce(db, { markerRef: doc.ref, markerId: sessionId, event, nowMs }).catch(() => undefined);
          }
        }
      } else {
        const result = await settleVoiceSession(db, {
          authUid, stableUid, sessionId, actualSec: heartbeatElapsedSec, endReason: 'watchdog', nowMs,
        });
        if (!result.alreadySettled) {
          stats.settled += 1;
          // Сторно неиспользованного хвоста резерва в дневном бюджетном счётчике —
          // зеркально тому, что делает maxVoiceSessionEnd. Идемпотентность settle
          // гарантирует ровно одного победителя гонки с опоздавшим end.
          await refundVoiceBudgetEstimate(db, (result.refundedSec / 60) * VOICE_EST_COST_USD_PER_MIN, nowMs)
            .catch(() => {});
          // Billing-строка watchdog-сеттла: токены реально потрачены (usage из
          // heartbeat-аккумулятора), без записи дневная сверка с Usage API
          // систематически недосчитывала бы тихо умершие сессии. Свой try/catch:
          // сбой записи биллинга не должен отменить уже состоявшийся settle
          // и не должен портить settled-статистику.
          try {
            const config = await resolveMaxVoiceConfig(db);
            const chain = (data.reconnectChain ?? {}) as Record<string, unknown>;
            const usage = sanitizeVoiceUsage(data.usageTotals);
            await writeVoiceBillingRow(db, {
              uid: stableUid,
              authUid,
              sessionId,
              callGroupId: str(chain.rootId) || sessionId,
              model: config.model,
              seconds: result.chargedSec,
              usage,
              endReason: 'watchdog',
              channel: 'realtime',
              // Сценарий/уровень/вариант пробника в доке квоты не хранятся —
              // watchdog честно пишет null, сверке важны токены и секунды.
              scenarioId: null,
              cefr: null,
              trialVariant: null,
              clientSpeechSec: 0,
              xpAwarded: 0,
              sessionStartedAtMs: voiceSessionClockStartMs(data),
              nowMs,
            });
            const { estCostUsd } = estimateVoiceCostUsd(usage, result.chargedSec);
            const events: MaxVoiceOpsEventV1[] = [
              {
                schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA,
                stage: 'call_failed',
                durationSec: result.chargedSec,
                endReason: 'dropped',
                providerUsage: {
                  audioInputTokens: usage.audioInputTokens,
                  audioOutputTokens: usage.audioOutputTokens,
                  cachedTokens: usage.cachedTokens,
                  textTokens: usage.textTokens,
                  estimatedCostMicros: Math.max(0, Math.round(estCostUsd * 1_000_000)),
                },
              },
              { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'watchdog_end' },
              { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'quota_settled' },
              { schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'watchdog_settled' },
            ];
            if (usage.audioOutputTokens === 0) {
              events.push({ schemaVersion: MAX_VOICE_OPS_EVENT_SCHEMA, stage: 'no_remote_audio' });
            }
            for (const event of events) {
              await recordMaxVoiceOpsOnce(db, { markerRef: doc.ref, markerId: sessionId, event, nowMs }).catch(() => undefined);
            }
          } catch (e) {
            console.error('max_voice_watchdog billing row failed', doc.id, e);
          }
        }
      }
    } catch (e) {
      stats.errors += 1;
      console.error('max_voice_watchdog doc failed', doc.id, e);
    }
  }

  console.log(
    `maxVoiceWatchdog: scanned=${stats.scanned} settled=${stats.settled} released=${stats.released}`,
    stats.skippedAlive ? `alive=${stats.skippedAlive}` : '',
    stats.errors ? `errors=${stats.errors}` : '',
  );
  return stats;
}

export const maxVoiceWatchdog = functions.scheduler.onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'UTC', region: REGION, memory: '256MiB', timeoutSeconds: 300 },
  async () => {
    await runMaxVoiceWatchdogOnce(admin.firestore(), Date.now());
  },
);

function providerHealthErrorId(nowMs: number): string {
  // Один app_errors document в час: Telegram/Jarvis получают сигнал, но outage
  // не создаёт 6 одинаковых критических алертов подряд.
  return `max_voice_provider_health_${Math.floor(nowMs / 3_600_000)}`;
}

async function recordProviderHealthFailure(
  db: Firestore,
  nowMs: number,
  message: string,
): Promise<void> {
  await db.collection('app_errors').doc(providerHealthErrorId(nowMs)).set({
    severity: 'critical',
    feature: 'max_voice',
    context: 'max_voice_provider_health',
    errorName: 'MaxVoiceProviderHealthError',
    message: message.slice(0, 900),
    fingerprint: 'max_voice_provider_health',
    platform: 'server',
    appVersion: 'cloud-functions',
    createdAtMs: nowMs,
    createdAt: new Date(nowMs).toISOString(),
    status: 'new',
  }, { merge: true });
}

/**
 * Живой control-plane probe OpenAI без открытия звонка: client secret сразу
 * забывается, поэтому ни пользовательской сессии, ни audio inference нет.
 */
export const maxVoiceProviderHealth = functions.scheduler.onSchedule(
  {
    schedule: MAX_VOICE_PROVIDER_HEALTH_SCHEDULE,
    timeZone: 'UTC',
    region: REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 1,
    secrets: [OPENAI_API_KEY],
  },
  async () => {
    const nowMs = Date.now();
    const db = admin.firestore();
    const startedAtMs = nowMs;
    try {
      const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
      if (!apiKey) throw new Error('openai_key_missing');
      const config = await resolveMaxVoiceConfig(db);
      const result = await runMaxVoiceProviderProbe(apiKey, config);
      const latencyMs = Date.now() - startedAtMs;
      if (result.profile !== 'full') {
        const message = `MAX Voice provider accepted only compatibility profile; model=${config.model}; latencyMs=${latencyMs}`;
        console.error('max_voice_provider_health degraded', { model: config.model, latencyMs });
        await recordProviderHealthFailure(db, nowMs, message);
        return;
      }
      console.log('max_voice_provider_health ok', { model: config.model, latencyMs });
    } catch (error) {
      const message = String((error as Error)?.message ?? error).slice(0, 700);
      console.error('max_voice_provider_health failed', { message });
      await recordProviderHealthFailure(db, nowMs, message).catch((writeError) => {
        console.error('max_voice_provider_health alert write failed', writeError);
      });
      throw error;
    }
  },
);
