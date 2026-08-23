// ═══════════════════════════════════════════════════════════════════════════
// max_voice_quota.ts — экономическая граница MAX-звонков (раздел 2 спеки).
//
// Коллекция voice_call_quotas, один док на ученика (docId по паттерну
// premium_dialog_quotas). Модель «резерв → сеттлмент»: минт РЕЗЕРВИРУЕТ секунды
// (сразу списывает из дня/месяца — параллельный минт видит честный остаток),
// завершение СПИСЫВАЕТ min(факт, резерв) и ВОЗВРАЩАЕТ неиспользованное.
// Клиенту в деньгах не верим: все переходы — транзакции Firestore.
//
// Поля дока: resetAtMs, monthResetAtMs, dailyUsedSec, monthlyUsedSec,
// trialUsedAtMs, activeSessionId, sessionStartedAtMs, activatedAtMs, reservedSec,
// expiresAtMs, lastHeartbeatMs, reconnectChain{rootId, count, gapSecTotal}.
//
// Два штампа времени сессии:
//   sessionStartedAtMs — момент МИНТА (резерв выдан);
//   activatedAtMs      — момент, когда звонок реально ожил (первый heartbeat).
// зачем: владелец 2026-08-16 хочет мгновенное соединение — клиент минтит заранее
// на пре-экране, и между минтом и «алло» может пройти до пары минут раздумий.
// Секунды разговора считаются от activatedAtMs, чтобы простой на пре-экране не
// списывался как разговор; без activatedAtMs (старый клиент) — от минта, как раньше.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import type { Firestore } from 'firebase-admin/firestore';

export const VOICE_QUOTA_COLLECTION = 'voice_call_quotas';

/** Минимальный осмысленный звонок: остаток меньше — отказ без токена. */
export const MIN_VOICE_RESERVE_SEC = 60;

/**
 * Хвост после исчерпания резерва, в течение которого сессия ещё считается
 * «живой» (teardown deadline+20с, heartbeat 30с, сетевые лаги). Watchdog
 * закрывает всё, что старше cap+120с.
 */
export const VOICE_RESERVE_EXPIRY_GRACE_SEC = 120;

/**
 * Живая сессия шлёт heartbeat каждые ~30с. Если по активной сессии тишина дольше
 * этого окна — она мертва (kill app, брошенный pre-mint без звонка), и СВЕЖИЙ минт
 * того же ученика её вытесняет (дозакрывает по последнему heartbeat), а не
 * упирается в voice_session_active на 7 минут. Два ПАРАЛЛЕЛЬНЫХ живых звонка
 * по-прежнему невозможны: у живого heartbeat всегда свежее окна.
 */
export const VOICE_DEAD_SESSION_SILENCE_MS = 75_000;

/**
 * Начало часов разговора: момент активации (первый heartbeat), а до неё —
 * момент минта. Единственный источник для settle/watchdog/transfer.
 */
export function voiceSessionClockStartMs(data: Record<string, unknown>): number {
  const activated = num(data.activatedAtMs);
  return activated > 0 ? activated : num(data.sessionStartedAtMs);
}

/** Пустой аккумулятор usage — свежий резерв стирает хвост прошлой сессии. */
export const VOICE_USAGE_ZERO = {
  audioInputTokens: 0,
  audioOutputTokens: 0,
  cachedTokens: 0,
  textTokens: 0,
} as const;

// Локальная копия docId из premium_dialog.ts (там она не экспортируется —
// намеренно не трогаем чужой модуль, но формат ID обязан совпадать по паттерну).
function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

export function voiceQuotaDocId(authUid: string, stableUid: string): string {
  return docId('vq', authUid, stableUid);
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

function startOfNextUtcMonth(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return String(value ?? '').trim();
}

interface QuotaWindows {
  resetAtMs: number;
  monthResetAtMs: number;
  dailyUsedSec: number;
  monthlyUsedSec: number;
}

/**
 * Нормализация окон дня/месяца ВНУТРИ транзакции: просроченное окно обнуляет
 * счётчик. Месячный reset — строго по monthResetAtMs из дока (UTC-месяц).
 */
function normalizeWindows(data: Record<string, unknown>, nowMs: number): QuotaWindows {
  const dayFresh = nowMs >= num(data.resetAtMs);
  const monthFresh = nowMs >= num(data.monthResetAtMs);
  return {
    resetAtMs: dayFresh ? startOfNextUtcDay(nowMs) : num(data.resetAtMs),
    monthResetAtMs: monthFresh ? startOfNextUtcMonth(nowMs) : num(data.monthResetAtMs),
    dailyUsedSec: dayFresh ? 0 : Math.max(0, num(data.dailyUsedSec)),
    monthlyUsedSec: monthFresh ? 0 : Math.max(0, num(data.monthlyUsedSec)),
  };
}

export interface VoiceReserveArgs {
  authUid: string;
  stableUid: string;
  /** Новый sessionId, который станет activeSessionId. */
  sessionId: string;
  /** Кап формата (scenario/companion/trial) БЕЗ хвоста. */
  formatCapSec: number;
  graceTailSec: number;
  dailyVoiceSecMax: number;
  monthlyVoiceSecMax: number;
  nowMs?: number;
}

export interface VoiceReserveResult {
  reservedSec: number;
  /** Остаток дня/месяца ПОСЛЕ резервирования — питает пилюлю минут на клиенте. */
  dayRemainingSec: number;
  monthRemainingSec: number;
  /**
   * Секунды, возвращённые в день/месяц при дозакрытии ПРЕДЫДУЩЕЙ протухшей
   * сессии внутри этой же транзакции. Наружу — чтобы вызывающий mint сторнировал
   * ту же долю в дневном бюджетном счётчике (quota-модуль сам бюджет не трогает,
   * иначе возникла бы обратная зависимость от max_voice_mint).
   */
  staleRefundedSec: number;
}

/**
 * Транзакционный резерв секунд под сессию: min(cap+хвост, остаток дня, остаток
 * месяца). Отказ БЕЗ токена: остаток <60с → resource-exhausted; чужая живая
 * сессия → failed-precondition (анти-абуз: один activeSessionId на ученика).
 * Протухшая недоотчитавшаяся сессия дозакрывается по последнему heartbeat
 * (та же семантика, что у watchdog) — неиспользованный хвост возвращается.
 */
export async function reserveVoiceSeconds(db: Firestore, args: VoiceReserveArgs): Promise<VoiceReserveResult> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const win = normalizeWindows(data, now);

    const activeSessionId = str(data.activeSessionId);
    const prevReserved = Math.max(0, Math.floor(num(data.reservedSec)));
    let staleRefundedSec = 0;
    if (activeSessionId && prevReserved > 0) {
      const lastHeartbeatMs = num(data.lastHeartbeatMs, num(data.sessionStartedAtMs));
      const heartbeatFresh = now - lastHeartbeatMs <= VOICE_DEAD_SESSION_SILENCE_MS;
      // Живая = резерв не истёк И heartbeat свежий. Истёкшая ИЛИ замолчавшая
      // дольше окна — мертва и вытесняется (см. VOICE_DEAD_SESSION_SILENCE_MS).
      if (num(data.expiresAtMs) > now && heartbeatFresh) {
        console.warn('max_voice_quota reserve rejected', { reason: 'voice_session_active' });
        throw new HttpsError('failed-precondition', 'voice_session_active');
      }
      // Сессия умерла молча: списываем по последнему heartbeat, хвост возвращаем.
      // Часы — от активации (pre-mint без звонка = 0 прожитых секунд).
      const startedAt = voiceSessionClockStartMs(data);
      const hbElapsedSec = startedAt > 0
        ? Math.max(0, Math.ceil((num(data.lastHeartbeatMs, startedAt) - startedAt) / 1000))
        : prevReserved;
      const consumed = Math.min(prevReserved, hbElapsedSec);
      staleRefundedSec = prevReserved - consumed;
      win.dailyUsedSec = Math.max(0, win.dailyUsedSec - staleRefundedSec);
      win.monthlyUsedSec = Math.max(0, win.monthlyUsedSec - staleRefundedSec);
    }

    const dayRemaining = Math.max(0, Math.floor(args.dailyVoiceSecMax) - win.dailyUsedSec);
    const monthRemaining = Math.max(0, Math.floor(args.monthlyVoiceSecMax) - win.monthlyUsedSec);
    const reservedSec = Math.floor(Math.min(
      Math.max(0, args.formatCapSec) + Math.max(0, args.graceTailSec),
      dayRemaining,
      monthRemaining,
    ));
    if (reservedSec < MIN_VOICE_RESERVE_SEC) {
      console.warn('max_voice_quota reserve rejected', {
        reason: 'voice_quota_exhausted',
        dayRemaining,
        monthRemaining,
      });
      throw new HttpsError('resource-exhausted', 'voice_quota_exhausted');
    }

    tx.set(ref, {
      authUid: args.authUid,
      stableUid: args.stableUid,
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      dailyUsedSec: win.dailyUsedSec + reservedSec,
      monthlyUsedSec: win.monthlyUsedSec + reservedSec,
      activeSessionId: args.sessionId,
      sessionStartedAtMs: now,
      // Активацию поставит первый heartbeat; до него часы разговора не идут.
      activatedAtMs: 0,
      reservedSec,
      expiresAtMs: now + (reservedSec + VOICE_RESERVE_EXPIRY_GRACE_SEC) * 1000,
      lastHeartbeatMs: now,
      // Свежий минт стирает usage прошлой сессии: settle берёт max(heartbeat,
      // отчёт клиента), и без сброса токены прошлого звонка «переезжали» в
      // billing нового (найдено по одинаковым usage у соседних строк 2026-08-16).
      usageTotals: { ...VOICE_USAGE_ZERO },
      lastHeartbeatElapsedSec: 0,
      // Свежий минт = новый корень чейна реконнектов.
      reconnectChain: { rootId: args.sessionId, count: 0, gapSecTotal: 0 },
      updatedAtMs: now,
    }, { merge: true });

    return {
      reservedSec,
      dayRemainingSec: dayRemaining - reservedSec,
      monthRemainingSec: monthRemaining - reservedSec,
      staleRefundedSec,
    };
  });
}

export interface VoiceSettleArgs {
  authUid: string;
  stableUid: string;
  sessionId: string;
  /** Фактические секунды сессии (серверная оценка, не клиентская). */
  actualSec: number;
  /** completed | capped | dropped | watchdog | background | … — для аудита. */
  endReason?: string;
  nowMs?: number;
}

export interface VoiceSettleResult {
  chargedSec: number;
  refundedSec: number;
  /** true — резерв этой сессии уже закрыт (двойной end/гонка с watchdog). */
  alreadySettled: boolean;
}

/**
 * Сеттлмент: списать min(факт, резерв), вернуть остаток в день/месяц, закрыть
 * activeSessionId. Идемпотентен: чужой/уже закрытый sessionId → no-op (двойной
 * maxVoiceSessionEnd или гонка с watchdog не должны списывать дважды).
 */
export async function settleVoiceSession(db: Firestore, args: VoiceSettleArgs): Promise<VoiceSettleResult> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true };
    }
    const win = normalizeWindows(data, now);
    const chargedSec = Math.min(reservedSec, Math.max(0, Math.floor(num(args.actualSec))));
    const refundedSec = reservedSec - chargedSec;
    tx.set(ref, {
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      // Кламп в 0: если день/месяц успел перещёлкнуться, возврат не уходит в минус.
      dailyUsedSec: Math.max(0, win.dailyUsedSec - refundedSec),
      monthlyUsedSec: Math.max(0, win.monthlyUsedSec - refundedSec),
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastSettledSessionId: args.sessionId,
      lastEndReason: str(args.endReason).slice(0, 40) || 'completed',
      updatedAtMs: now,
    }, { merge: true });
    return { chargedSec, refundedSec, alreadySettled: false };
  });
}

/** Снимок дока квоты ДО сеттлмента: после него activeSessionId/reservedSec стёрты. */
export interface VoiceSettleSnapshot {
  /** Сырые поля дока — вызывающему нужны usageTotals, reconnectChain, часы сессии. */
  data: Record<string, unknown>;
}

export interface VoiceSettleWithXpArgs extends VoiceSettleArgs {
  /**
   * Считает фактические секунды сессии ИЗ СНИМКА дока (серверные часы разговора).
   * Раньше вызывающий читал док отдельным get() и передавал готовое число —
   * теперь снимок доступен только внутри транзакции, поэтому расчёт передаётся
   * сюда. Обязана быть чистой; если не задана, берётся args.actualSec.
   */
  resolveActualSec?: (quotaData: Record<string, unknown>) => number;
  /**
   * Считает XP этой сессии из ФАКТИЧЕСКИ списанных секунд и снимка дока.
   * Вызывается ВНУТРИ транзакции, поэтому обязана быть чистой (никаких
   * обращений к БД/сети) — иначе транзакция станет недетерминированной
   * при ретрае Firestore.
   */
  computeXp: (chargedSec: number, quotaData: Record<string, unknown>) => number;
  /** UTC-ключ дня для дневного XP-кэпа (вычисляет вызывающий: quota не знает про utcDayKey). */
  xpDayKey: string;
  xpDailyCap: number;
}

export interface VoiceSettleWithXpResult extends VoiceSettleResult {
  /** Фактически начисленный XP (0, если дневной кэп уже выбран). */
  xpAwarded: number;
  /** Снимок дока ДО записи — заменяет отдельный quotaRef.get() у вызывающего. */
  snapshot: Record<string, unknown>;
}

/**
 * Сеттлмент + дневной XP + снимок дока ОДНОЙ транзакцией.
 *
 * зачем (P1-13, 2026-08-23): maxVoiceSessionEnd делал три последовательных
 * обращения к ОДНОМУ документу voice_call_quotas — get() ради снимка, затем
 * транзакция settle, затем транзакция начисления XP. Три раунд-трипа на каждый
 * звонок; при этом между ними документ мог измениться (watchdog, второй end),
 * то есть XP начислялся уже по другому состоянию, чем то, что прочитал снимок.
 *
 * Здесь всё читается один раз и пишется одним `tx.set`: дешевле на 2 раунд-трипа
 * и честнее по гонкам. `settleVoiceSession` НЕ трогаем — её отдельно зовёт
 * watchdog, которому XP не нужен.
 *
 * Идемпотентность прежняя: чужой/закрытый sessionId → no-op, XP не начисляется
 * (иначе двойной end давал бы XP дважды).
 */
export async function settleVoiceSessionWithXp(
  db: Firestore,
  args: VoiceSettleWithXpArgs,
): Promise<VoiceSettleWithXpResult> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true, xpAwarded: 0, snapshot: data };
    }
    const win = normalizeWindows(data, now);
    const actualSec = args.resolveActualSec ? args.resolveActualSec(data) : num(args.actualSec);
    const chargedSec = Math.min(reservedSec, Math.max(0, Math.floor(actualSec)));
    const refundedSec = reservedSec - chargedSec;

    // Дневной XP-кэп применяется к НАКОПЛЕННОМУ за день, не к одной сессии,
    // иначе N сессий в день давали бы N×cap.
    const cap = Math.max(0, Math.floor(args.xpDailyCap));
    const alreadyToday = str(data.xpDayKey) === args.xpDayKey
      ? Math.max(0, Math.floor(num(data.xpAwardedToday)))
      : 0;
    const sessionXp = Math.max(0, Math.floor(args.computeXp(chargedSec, data)));
    const xpAwarded = Math.max(0, Math.min(sessionXp, cap - alreadyToday));

    tx.set(ref, {
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      // Кламп в 0: если день/месяц успел перещёлкнуться, возврат не уходит в минус.
      dailyUsedSec: Math.max(0, win.dailyUsedSec - refundedSec),
      monthlyUsedSec: Math.max(0, win.monthlyUsedSec - refundedSec),
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastSettledSessionId: args.sessionId,
      lastEndReason: str(args.endReason).slice(0, 40) || 'completed',
      xpDayKey: args.xpDayKey,
      xpAwardedToday: alreadyToday + xpAwarded,
      updatedAtMs: now,
    }, { merge: true });

    return { chargedSec, refundedSec, alreadySettled: false, xpAwarded, snapshot: data };
  });
}

export interface VoiceReleaseArgs {
  authUid: string;
  stableUid: string;
  sessionId: string;
  /** Например 'briefing_abandoned' — отмена до connect. */
  reason?: string;
  nowMs?: number;
}

/**
 * Полный возврат резерва (отмена до connect: уход с брифинга, maxVoiceCancel).
 * Идемпотентен так же, как settle. Возвращает освобождённые секунды.
 */
export async function releaseVoiceReservation(db: Firestore, args: VoiceReleaseArgs): Promise<VoiceSettleResult> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true };
    }
    const win = normalizeWindows(data, now);
    tx.set(ref, {
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      dailyUsedSec: Math.max(0, win.dailyUsedSec - reservedSec),
      monthlyUsedSec: Math.max(0, win.monthlyUsedSec - reservedSec),
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastReleaseReason: str(args.reason).slice(0, 40) || 'released',
      updatedAtMs: now,
    }, { merge: true });
    return { chargedSec: 0, refundedSec: reservedSec, alreadySettled: false };
  });
}

/**
 * Клиентская фаза 1 реконнекта — grace 4с при iceConnectionState=disconnected
 * (спека, max_call_reconnect). Реальный обрыв даёт ре-минт в течение СЕКУНД.
 */
export const VOICE_RECONNECT_GRACE_MS = 4_000;

/**
 * Окно «подтверждённого обрыва»: бесплатным признаётся только gap, попадающий в
 * последние 3×grace перед реконнектом. Всё, что раньше, — не обрыв, а тишина в
 * heartbeat-канале, которую контролирует клиент (heartbeat шлёт он); иначе
 * минута замалчивания heartbeat превращалась бы в минуту бесплатного разговора.
 */
export const VOICE_CONFIRMED_GAP_WINDOW_SEC = Math.ceil((VOICE_RECONNECT_GRACE_MS * 3) / 1000);

/** Дефолт heartbeat-интервала (конфиг heartbeatSec), если минт его не передал. */
export const VOICE_DEFAULT_HEARTBEAT_SEC = 30;

export interface VoiceTransferArgs {
  authUid: string;
  stableUid: string;
  /** Сессия, с которой переносим (reconnectOf из минта). */
  prevSessionId: string;
  newSessionId: string;
  /** Elapsed из последнего heartbeat клиента (0, если heartbeat не доехал). */
  heartbeatElapsedSec: number;
  /** Бесплатный суммарный gap чейна (конфиг reconnectFreeGapSecTotal, 60с). */
  freeGapCapSec?: number;
  /** Кап длины чейна (2 авто + 1 ручной = 3); undefined = не проверять тут. */
  maxChainCount?: number;
  /** Интервал heartbeat из конфига — питает детект «клиент замалчивал». */
  heartbeatSec?: number;
  nowMs?: number;
}

export interface VoiceTransferResult {
  reservedSec: number;
  chainCount: number;
  rootSessionId: string;
}

/**
 * Атомарный перенос остатка резерва на новую сессию при реконнекте.
 * Остаток = reservedSec − max(heartbeat elapsed, now − startedAt) — пессимистично,
 * клиентскому elapsed не верим в меньшую сторону. Бесплатен только
 * ПОДТВЕРЖДЁННЫЙ обрыв: gap клампится окном VOICE_CONFIRMED_GAP_WINDOW_SEC
 * (реальный обрыв ре-минтится за секунды), «ни одного heartbeat за ≥2 интервала»
 * — замалчивание, не обрыв (gap 0); плюс суммарный кап freeGapCapSec на чейн.
 * Остаток <60с → resource-exhausted (реконнект бессмыслен), чужая/закрытая
 * сессия → failed-precondition.
 */
export async function transferReserve(db: Firestore, args: VoiceTransferArgs): Promise<VoiceTransferResult> {
  const now = args.nowMs ?? Date.now();
  const freeGapCapSec = Math.max(0, Math.floor(args.freeGapCapSec ?? 60));
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.prevSessionId) || reservedSec <= 0) {
      console.warn('max_voice_quota transfer rejected', { reason: 'voice_session_mismatch' });
      throw new HttpsError('failed-precondition', 'voice_session_mismatch');
    }

    const chain = (data.reconnectChain ?? {}) as Record<string, unknown>;
    const chainCount = Math.max(0, Math.floor(num(chain.count)));
    const gapTotal = Math.max(0, num(chain.gapSecTotal));
    if (args.maxChainCount != null && chainCount + 1 > args.maxChainCount) {
      console.warn('max_voice_quota transfer rejected', { reason: 'voice_reconnect_chain_exhausted', chainCount });
      throw new HttpsError('failed-precondition', 'voice_reconnect_chain_exhausted');
    }

    // Часы разговора — от активации (см. voiceSessionClockStartMs): простой
    // pre-mint на пре-экране не должен списываться при переносе остатка.
    const startedAt = voiceSessionClockStartMs(data) || now;
    const wallElapsedSec = Math.max(0, Math.ceil((now - startedAt) / 1000));
    const elapsedSec = Math.max(Math.max(0, Math.ceil(num(args.heartbeatElapsedSec))), wallElapsedSec);
    // Бесплатный gap — ТОЛЬКО подтверждённый обрыв, не «время без heartbeat»:
    //   1) окно VOICE_CONFIRMED_GAP_WINDOW_SEC — реальный обрыв даёт ре-минт за
    //      секунды, старый хвост тишины бесплатным не признаём;
    //   2) ни одного heartbeat вообще (lastHeartbeatMs == startedAt) при
    //      wallElapsed >= 2×heartbeatSec — клиент замалчивал, gap = 0;
    //   3) как и раньше, суммарный кап freeGapCapSec на весь чейн.
    // Пессимизм в пользу денег (принцип (б) спеки): любые сомнения → полный
    // wallElapsed списывается, бесплатного gap нет.
    const heartbeatSec = Math.max(1, Math.floor(args.heartbeatSec ?? VOICE_DEFAULT_HEARTBEAT_SEC));
    const lastHeartbeatMs = num(data.lastHeartbeatMs, startedAt);
    const rawGapSec = Math.max(0, Math.floor((now - lastHeartbeatMs) / 1000));
    const neverHeartbeat = lastHeartbeatMs <= startedAt;
    const silentTooLong = neverHeartbeat && wallElapsedSec >= 2 * heartbeatSec;
    const confirmedGapSec = silentTooLong ? 0 : Math.min(rawGapSec, VOICE_CONFIRMED_GAP_WINDOW_SEC);
    const freeGapSec = Math.min(confirmedGapSec, Math.max(0, freeGapCapSec - gapTotal));
    const consumedSec = Math.min(reservedSec, Math.max(0, elapsedSec - freeGapSec));
    const remainingSec = reservedSec - consumedSec;
    if (remainingSec < MIN_VOICE_RESERVE_SEC) {
      console.warn('max_voice_quota transfer rejected', { reason: 'voice_quota_exhausted', remainingSec });
      throw new HttpsError('resource-exhausted', 'voice_quota_exhausted');
    }

    const rootSessionId = str(chain.rootId) || str(args.prevSessionId);
    tx.set(ref, {
      activeSessionId: args.newSessionId,
      sessionStartedAtMs: now,
      // Реконнект оживает за секунды: новая сессия активна с момента переноса
      // (первый heartbeat нового транспорта её не «сдвинет»).
      activatedAtMs: now,
      // Списанная часть остаётся списанной (была зарезервирована при минте);
      // day/month счётчики не трогаем — финальный settle новой сессии вернёт хвост.
      reservedSec: remainingSec,
      expiresAtMs: now + (remainingSec + VOICE_RESERVE_EXPIRY_GRACE_SEC) * 1000,
      lastHeartbeatMs: now,
      reconnectChain: {
        rootId: rootSessionId,
        count: chainCount + 1,
        gapSecTotal: gapTotal + freeGapSec,
      },
      updatedAtMs: now,
    }, { merge: true });

    return { reservedSec: remainingSec, chainCount: chainCount + 1, rootSessionId };
  });
}

// зачем (P1-14, 2026-08-23): recordVoiceHeartbeat + VoiceHeartbeatArgs удалены —
// мёртвый путь. Прод отмечает heartbeat через recordVoiceHeartbeatLifecycle
// в max_voice_session_end.ts; здешнюю функцию не вызывал ни клиент, ни другой
// серверный модуль, ни index.ts — только собственный тест. Живой путь умеет
// больше (lifecycle-результат), и наличие второй, более слабой реализации на
// тот же документ voice_call_quotas — приглашение случайно позвать не ту.

export interface VoiceTrialArgs {
  authUid: string;
  stableUid: string;
  nowMs?: number;
}

/** Штамп использования пробника (ре-триал через trialRefreshDays решает mint). */
export async function markVoiceTrialUsed(db: Firestore, args: VoiceTrialArgs): Promise<void> {
  const now = args.nowMs ?? Date.now();
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.authUid, args.stableUid));
  await ref.set({
    authUid: args.authUid,
    stableUid: args.stableUid,
    trialUsedAtMs: now,
    updatedAtMs: now,
  }, { merge: true });
}
