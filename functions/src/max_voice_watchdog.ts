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
import type { Firestore } from 'firebase-admin/firestore';
import {
  VOICE_QUOTA_COLLECTION,
  releaseVoiceReservation,
  settleVoiceSession,
} from './max_voice_quota';
import {
  VOICE_EST_COST_USD_PER_MIN,
  decrementVoiceMintCount,
  refundVoiceBudgetEstimate,
} from './max_voice_mint';
import { sanitizeVoiceUsage, writeVoiceBillingRow } from './max_voice_session_end';
import { resolveMaxVoiceConfig } from './max_voice_config';

const REGION = 'us-central1';

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

      const startedAtMs = num(data.sessionStartedAtMs);
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
            await writeVoiceBillingRow(db, {
              uid: stableUid,
              authUid,
              sessionId,
              callGroupId: str(chain.rootId) || sessionId,
              model: config.model,
              seconds: result.chargedSec,
              usage: sanitizeVoiceUsage(data.usageTotals),
              endReason: 'watchdog',
              channel: 'realtime',
              // Сценарий/уровень/вариант пробника в доке квоты не хранятся —
              // watchdog честно пишет null, сверке важны токены и секунды.
              scenarioId: null,
              cefr: null,
              trialVariant: null,
              clientSpeechSec: 0,
              xpAwarded: 0,
              nowMs,
            });
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
