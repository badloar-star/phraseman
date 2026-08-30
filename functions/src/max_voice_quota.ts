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
// maxAllowanceMonthResetAtMs, maxAllowanceUsageBaselineSec,
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
import { resolveAccountDeleteIdentityClosure } from './account_delete';
import { MAX_VOICE_LIFETIME_TRIAL_RESERVE_SEC } from './max_voice_config';
import {
  VOICE_MINUTE_EVENT_COLLECTION,
  VOICE_MINUTE_WALLET_COLLECTION,
  projectVoiceMinuteWalletReserve,
  projectVoiceMinuteWalletSettle,
  reserveVoiceMinuteWalletInTransaction,
  settleVoiceMinuteWalletInTransaction,
  transferVoiceMinuteWalletReservationInTransaction,
  validateVoiceMinuteEventReplay,
  voiceMinuteWalletFromData,
  type VoiceMinuteAccessType,
  type VoiceMinuteCallChargeEvent,
  type VoiceMinuteEvent,
  type VoiceMinuteWallet,
} from './voice_minutes';

export const VOICE_QUOTA_COLLECTION = 'voice_call_quotas';

/** Минимальный осмысленный звонок: остаток меньше — отказ без токена. */
export const MIN_VOICE_RESERVE_SEC = 60;

/** Старый reason остаётся в HttpsError.details для уже выпущенных клиентов. */
export const LEGACY_VOICE_QUOTA_EXHAUSTED_REASON = 'voice_quota_exhausted';

export type VoiceQuotaExhaustedReason =
  | 'voice_daily_quota_exhausted'
  | 'voice_monthly_quota_exhausted';

/**
 * Точная причина отказа. Месяц имеет приоритет, когда закончились оба окна:
 * дневной reset тогда не вернёт человеку доступ на следующий день.
 */
export function voiceQuotaExhaustedReason(
  dayRemainingSec: number,
  monthRemainingSec: number,
): VoiceQuotaExhaustedReason | null {
  if (monthRemainingSec < MIN_VOICE_RESERVE_SEC) return 'voice_monthly_quota_exhausted';
  if (dayRemainingSec < MIN_VOICE_RESERVE_SEC) return 'voice_daily_quota_exhausted';
  return null;
}

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
 * Окно жизни резерва, по которому НЕ БЫЛО НИ ОДНОГО heartbeat (activatedAtMs=0).
 *
 * зачем (аудит 2026-08-24): такой резерв — это premint с пре-экрана, который
 * ещё не стал звонком. Убийство приложения на пре-экране не даёт клиенту
 * послать maxVoiceSessionEnd, и до этой правки заготовка блокировала новые
 * звонки на 12 минут (cap 600с + grace 20с + expiry grace 120с), отвечая
 * voice_session_active. Живому старту хватает секунд: минт → offer → SDP →
 * первый heartbeat. 45с дают тройной запас на медленную сеть и при этом не
 * дают брошенной заготовке держать линию.
 *
 * Два ПАРАЛЛЕЛЬНЫХ живых звонка по-прежнему невозможны: как только сессия
 * активирована, окно становится VOICE_DEAD_SESSION_SILENCE_MS, а живой клиент
 * шлёт heartbeat каждые ~30с.
 */
export const VOICE_UNACTIVATED_RESERVE_GRACE_MS = 45_000;

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
function docId(prefix: string, ...identities: string[]): string {
  const hash = createHash('sha256').update([prefix, ...identities].join('|')).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

/** Канонический владелец квоты — стабильный аккаунт, не сменяемый auth uid. */
export function voiceQuotaDocId(stableUid: string): string {
  return docId('vq', stableUid);
}

/** Старый auth+stable ID нужен только для fail-closed ленивой миграции. */
export function legacyVoiceQuotaDocId(authUid: string, stableUid: string): string {
  return docId('vq', authUid, stableUid);
}

export const VOICE_QUOTA_IDENTITY_VERSION = 2;
const MAX_VOICE_QUOTA_ALIAS_DOCS = 64;

export interface EnsureCanonicalVoiceQuotaArgs {
  authUid: string;
  stableUid: string;
  nowMs?: number;
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

function startOfNextUtcMonth(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0);
}

function startOfUtcMonth(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return String(value ?? '').trim();
}

export function voiceQuotaIdentityClosureProof(identities: readonly string[]): string {
  const normalized = [...new Set(identities.map(str).filter(Boolean))].sort();
  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return `v1:${normalized.length}:${hash}`;
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

function positiveMin(values: number[], fallback = 0): number {
  const positive = values.filter((value) => value > 0);
  return positive.length > 0 ? Math.min(...positive) : fallback;
}

/**
 * Расход lifetime-пробника ДОКАЗАН только подтверждённым минтом провайдера
 * (trialProviderMintedAtMs>0) или явной парой trialUsedAtMs+sessionId, которую
 * пишет одна транзакция резерва.
 *
 * зачем (владелец 2026-08-30, скрин «пробник был, но 0 минут»): прежний список
 * включал activatedAtMs/lastSettledAtMs/monthlyUsedSec — ЛЮБАЯ голосовая
 * активность строки (в т.ч. старой эпохи месячных минут) сжигала пробник при
 * мердже идентичностей, вопреки решению владельца 2026-08-24. Маркер мёртвой
 * НЕАКТИВИРОВАННОЙ заготовки (kill app на пре-экране) — провизорный, не
 * доказательство: резерв её вытеснит и вернёт маркер той же транзакцией.
 */
function hasLifetimeTrialEvidence(data: Record<string, unknown>, nowMs: number): boolean {
  const providerMintedAtMs = num(data.trialProviderMintedAtMs);
  const trialUsedAtMs = num(data.trialUsedAtMs);
  const reservationSessionId = str(data.trialReservationSessionId);
  const proven = providerMintedAtMs > 0 || (trialUsedAtMs > 0 && reservationSessionId !== '');
  if (!proven) return false;
  const holdsDeadUnactivatedPremint = reservationSessionId !== ''
    && str(data.activeSessionId) === reservationSessionId
    && num(data.reservedSec) > 0
    && num(data.activatedAtMs) <= 0
    && nowMs - num(data.lastHeartbeatMs, num(data.sessionStartedAtMs)) > VOICE_UNACTIVATED_RESERVE_GRACE_MS;
  return !holdsDeadUnactivatedPremint;
}

export function mergeLegacyVoiceQuotaData(
  rows: Record<string, unknown>[],
  args: EnsureCanonicalVoiceQuotaArgs,
): Record<string, unknown> {
  const now = args.nowMs ?? Date.now();
  const ranked = [...rows].sort((a, b) => num(b.updatedAtMs) - num(a.updatedAtMs));
  const base = ranked[0] ?? {};
  const windows = rows.map((row) => normalizeWindows(row, now));
  const dailyUsedSec = windows.reduce((sum, win) => sum + win.dailyUsedSec, 0);
  const monthlyUsedSec = windows.reduce((sum, win) => sum + win.monthlyUsedSec, 0);
  const active = ranked.find((row) => str(row.activeSessionId) !== '' && num(row.reservedSec) > 0);
  // зачем (владелец 2026-08-30): lifetime-маркер выводим ТОЛЬКО из доказанного
  // расхода (подтверждённый провайдером минт или явная пара резерва). Прежние
  // широкие сигналы (activatedAtMs/lastSettledAtMs/monthlyUsedSec) сжигали
  // неиспользованный пробник любому, у кого была ЛЮБАЯ голосовая история, —
  // вопреки решению 2026-08-24; голый lifetimeTrialUsedAtMs без доказательств
  // в той же строке — продукт прежнего широкого мерджа, его не переносим.
  const provenTrialUsedAt = (row: Record<string, unknown>): number => {
    const provider = num(row.trialProviderMintedAtMs);
    const used = num(row.trialUsedAtMs);
    // Штамп расхода — момент РЕЗЕРВА (used); подтверждение провайдера лишь
    // доказывает его и подстраховывает, если сам used потерялся.
    if (provider > 0) return used > 0 ? used : provider;
    return used > 0 && str(row.trialReservationSessionId) !== '' ? used : 0;
  };
  const lifetimeTrialUsedAtMs = positiveMin(rows.map(provenTrialUsedAt));
  const explicitTrialRows = [...rows]
    .filter((row) => provenTrialUsedAt(row) > 0)
    .sort((a, b) => num(a.trialUsedAtMs) - num(b.trialUsedAtMs));
  // Any confirmed provider mint must dominate an unconfirmed reservation.
  // Otherwise releasing the earlier unminted session could clear the merged
  // lifetime-trial marker even though another linked account already used it.
  const trialSource = explicitTrialRows.find((row) => num(row.trialProviderMintedAtMs) > 0)
    ?? explicitTrialRows[0];
  const resetAtMs = windows.reduce((value, win) => Math.max(value, win.resetAtMs), 0);
  const monthResetAtMs = windows.reduce((value, win) => Math.max(value, win.monthResetAtMs), 0);
  const hasCurrentMaxAllowanceMarker = rows.some((row, index) => (
    num(row.maxAllowanceMonthResetAtMs) === windows[index].monthResetAtMs
  ));
  const currentMonthStartedAtMs = startOfUtcMonth(now);
  const maxAllowanceUsageBaselineSec = hasCurrentMaxAllowanceMarker
    ? rows.reduce((sum, row, index) => {
        const win = windows[index];
        const existingBaselineSec = num(row.maxAllowanceMonthResetAtMs) === win.monthResetAtMs
          ? Math.min(win.monthlyUsedSec, Math.max(0, num(row.maxAllowanceUsageBaselineSec)))
          : 0;
        const trialUsedAtMs = num(row.trialUsedAtMs);
        const hasVerifiedCurrentMonthTrial = trialUsedAtMs >= currentMonthStartedAtMs
          && trialUsedAtMs <= now
          && str(row.trialReservationSessionId) !== ''
          && num(row.trialProviderMintedAtMs) > 0;
        const verifiedTrialUsageSec = hasVerifiedCurrentMonthTrial
          ? Math.min(win.monthlyUsedSec, MAX_VOICE_LIFETIME_TRIAL_RESERVE_SEC)
          : 0;
        // A valid row baseline may already include all or part of its trial.
        // Taking the larger contribution preserves prior MAX use without
        // forgiving the same confirmed trial twice on a later identity merge.
        return sum + Math.max(existingBaselineSec, verifiedTrialUsageSec);
      }, 0)
    : 0;
  return {
    ...base,
    quotaIdentityVersion: VOICE_QUOTA_IDENTITY_VERSION,
    authUid: args.authUid,
    stableUid: args.stableUid,
    resetAtMs,
    monthResetAtMs,
    dailyUsedSec,
    monthlyUsedSec,
    lifetimeTrialUsedAtMs: lifetimeTrialUsedAtMs || null,
    // Без доказанного источника пара не восстанавливается: голый штамп без
    // sessionId — то самое загрязнение, ради которого правило и сужено.
    trialUsedAtMs: trialSource
      ? Math.max(0, num(trialSource.trialUsedAtMs)) || null
      : null,
    trialReservationSessionId: trialSource ? str(trialSource.trialReservationSessionId) || null : null,
    trialProviderMintedAtMs: trialSource ? Math.max(0, num(trialSource.trialProviderMintedAtMs)) : 0,
    maxAllowanceMonthResetAtMs: hasCurrentMaxAllowanceMarker ? monthResetAtMs : 0,
    maxAllowanceUsageBaselineSec,
    activeSessionId: active ? str(active.activeSessionId) : null,
    reservedSec: active ? Math.max(0, Math.floor(num(active.reservedSec))) : 0,
    expiresAtMs: active ? Math.max(0, num(active.expiresAtMs)) : 0,
    migratedLegacyQuotaCount: rows.length,
    quotaIdentityMigratedAtMs: now,
    updatedAtMs: now,
  };
}

export async function ensureCanonicalVoiceQuota(
  db: Firestore,
  args: EnsureCanonicalVoiceQuotaArgs,
): Promise<Record<string, unknown>> {
  const now = args.nowMs ?? Date.now();
  const collection = db.collection(VOICE_QUOTA_COLLECTION);
  const canonicalRef = collection.doc(voiceQuotaDocId(args.stableUid));
  const canonicalSnap = await canonicalRef.get();
  const canonicalData = (canonicalSnap.data() ?? {}) as Record<string, unknown>;
  const identities = await resolveAccountDeleteIdentityClosure(db, args.stableUid, args.authUid);
  const closureProof = voiceQuotaIdentityClosureProof(identities);
  if (num(canonicalData.quotaIdentityVersion) >= VOICE_QUOTA_IDENTITY_VERSION
    && str(canonicalData.quotaIdentityClosureProof) === closureProof) return canonicalData;
  const querySnaps = await Promise.all(identities.map((stableAlias) => collection
    .where('stableUid', '==', stableAlias)
    .limit(MAX_VOICE_QUOTA_ALIAS_DOCS + 1)
    .get()));

  if (querySnaps.some((snap) => snap.docs.length > MAX_VOICE_QUOTA_ALIAS_DOCS)) {
    throw new HttpsError('resource-exhausted', 'voice_quota_identity_limit');
  }
  const legacyRefs = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const snap of querySnaps) {
    for (const doc of snap.docs) {
      if (doc.ref.path === canonicalRef.path) continue;
      legacyRefs.set(doc.ref.path, doc.ref);
      const migratedTo = str(doc.data()?.quotaIdentityMigratedTo);
      if (migratedTo && migratedTo !== canonicalRef.id) {
        const migratedTargetRef = collection.doc(migratedTo);
        legacyRefs.set(migratedTargetRef.path, migratedTargetRef);
      }
    }
  }
  const directLegacyRef = collection.doc(legacyVoiceQuotaDocId(args.authUid, args.stableUid));
  const directLegacySnap = await directLegacyRef.get();
  if (directLegacySnap.exists) {
    legacyRefs.set(directLegacyRef.path, directLegacyRef);
    const migratedTo = str(directLegacySnap.data()?.quotaIdentityMigratedTo);
    if (migratedTo && migratedTo !== canonicalRef.id) {
      const migratedTargetRef = collection.doc(migratedTo);
      legacyRefs.set(migratedTargetRef.path, migratedTargetRef);
    }
  }
  if (!canonicalSnap.exists && legacyRefs.size === 0) {
    return {
      quotaIdentityVersion: VOICE_QUOTA_IDENTITY_VERSION,
      quotaIdentityClosureProof: closureProof,
    };
  }

  return db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(canonicalRef);
    const currentData = (currentSnap.data() ?? {}) as Record<string, unknown>;
    if (num(currentData.quotaIdentityVersion) >= VOICE_QUOTA_IDENTITY_VERSION
      && str(currentData.quotaIdentityClosureProof) === closureProof) return currentData;
    const legacyEntries = [...legacyRefs.values()];
    const legacySnaps = await Promise.all(legacyEntries.map((ref) => tx.get(ref)));
    const presentDocIds = new Set([
      ...(currentSnap.exists ? [canonicalRef.id] : []),
      ...legacyEntries.filter((_, index) => legacySnaps[index].exists).map((ref) => ref.id),
    ]);
    const pendingRows = legacySnaps.flatMap((snap) => {
      if (!snap.exists) return [];
      const data = snap.data() as Record<string, unknown>;
      const migratedTo = str(data.quotaIdentityMigratedTo);
      // Recheck the marker from the transactional snapshot. Query-time data can
      // race another merge; recounting that tombstone would inflate usage.
      if (migratedTo && presentDocIds.has(migratedTo)) return [];
      return [data];
    });
    const rows = [
      ...(currentSnap.exists ? [currentData] : []),
      ...pendingRows,
    ];
    if (rows.length === 0) return {};
    const liveReservationSessionIds = new Set(rows.flatMap((row) => {
      const sessionId = str(row.activeSessionId);
      return sessionId && num(row.reservedSec) > 0 ? [sessionId] : [];
    }));
    if (liveReservationSessionIds.size > 1) {
      throw new HttpsError('failed-precondition', 'voice_quota_identity_sessions_conflict');
    }
    const merged = {
      ...mergeLegacyVoiceQuotaData(rows, { ...args, nowMs: now }),
      quotaIdentityClosureProof: closureProof,
    };
    tx.set(canonicalRef, merged, { merge: true });
    for (const ref of legacyRefs.values()) {
      tx.set(ref, {
        quotaIdentityMigratedTo: canonicalRef.id,
        activeSessionId: null,
        reservedSec: 0,
        expiresAtMs: 0,
        updatedAtMs: now,
      }, { merge: true });
    }
    return merged;
  });
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
  /** Fresh Free/Plus/Pro mint: consume the sole lifetime call with the reserve. */
  consumeLifetimeTrial?: boolean;
  /** MAX receives a separate 120-minute allowance over the shared raw counter. */
  maxMonthlyAllowance?: boolean;
  /** Maximum verified current-month trial usage that may precede MAX. */
  maxInitialTrialOffsetSec?: number;
  /** Proof returned by ensureCanonicalVoiceQuota; revalidated in the reserve transaction. */
  quotaIdentityClosureProof?: string;
  /** Paid packs are reserved from the non-expiring wallet, not calendar caps. */
  accessType?: VoiceMinuteAccessType;
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
  const collection = db.collection(VOICE_QUOTA_COLLECTION);
  const ref = collection.doc(voiceQuotaDocId(args.stableUid));
  return db.runTransaction(async (tx) => {
    const suppliedClosureProof = str(args.quotaIdentityClosureProof);
    let resolvedIdentities: string[] | null = null;
    if (suppliedClosureProof) {
      resolvedIdentities = await resolveAccountDeleteIdentityClosure(db, args.stableUid, args.authUid, tx);
      if (voiceQuotaIdentityClosureProof(resolvedIdentities) !== suppliedClosureProof) {
        throw new HttpsError('failed-precondition', 'voice_quota_identity_changed');
      }
    }
    if (args.consumeLifetimeTrial && resolvedIdentities) {
      const identityQueries = [...new Set(resolvedIdentities.map(str).filter(Boolean))].map((identity) => (
        collection.where('stableUid', '==', identity).limit(MAX_VOICE_QUOTA_ALIAS_DOCS + 1)
      ));
      const directLegacyRef = collection.doc(legacyVoiceQuotaDocId(args.authUid, args.stableUid));
      const [querySnaps, directLegacySnap] = await Promise.all([
        Promise.all(identityQueries.map((query) => tx.get(query))),
        tx.get(directLegacyRef),
      ]);
      if (querySnaps.some((snap) => snap.docs.length > MAX_VOICE_QUOTA_ALIAS_DOCS)) {
        throw new HttpsError('resource-exhausted', 'voice_quota_identity_limit');
      }
      const evidenceRows = new Map<string, Record<string, unknown>>();
      for (const snap of querySnaps) {
        for (const doc of snap.docs) {
          evidenceRows.set(doc.ref.path, (doc.data() ?? {}) as Record<string, unknown>);
        }
      }
      if (directLegacySnap.exists) {
        evidenceRows.set(
          directLegacyRef.path,
          (directLegacySnap.data() ?? {}) as Record<string, unknown>,
        );
      }
      // A tombstone is still authoritative negative evidence: an old revision
      // can merge-write trial fields after migration without changing closure.
      if ([...evidenceRows.values()].some((row) => hasLifetimeTrialEvidence(row, now))) {
        throw new HttpsError('permission-denied', 'voice_max_required');
      }
    }
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    // То же узкое правило, что в гейте и в closure-проверке выше: доказанный
    // расход жжёт, провизорный маркер мёртвой заготовки — нет (её вытеснит
    // блок ниже и перепишет маркеры этой же транзакцией).
    if (args.consumeLifetimeTrial && hasLifetimeTrialEvidence(data, now)) {
      throw new HttpsError('permission-denied', 'voice_max_required');
    }
    const win = normalizeWindows(data, now);

    const activeSessionId = str(data.activeSessionId);
    const prevReserved = Math.max(0, Math.floor(num(data.reservedSec)));
    let staleRefundedSec = 0;
    // зачем (аудит 2026-08-30, «платящий заперт до ~20 минут»): мёртвая ПЛАТНАЯ
    // сессия раньше не вытеснялась вовсе (безусловный voice_session_active до
    // проверок свежести) — kill app на пре-экране блокировал линию до прохода
    // watchdog-крона. Прежний страх «вытеснение по счётчикам квоты подвесит или
    // задвоит секунды кошелька» снят не отменой защиты, а атомарностью: кошелёк
    // закрывается ТОЙ ЖЕ транзакцией (проекции ниже), причём все чтения идут до
    // первой записи (правило транзакций Firestore) — поэтому здесь только
    // ГОТОВИМ вытеснение, а пишем его вместе с новым резервом в конце.
    let evictedPaid: {
      wallet: VoiceMinuteWallet | null;
      chargeEvent: VoiceMinuteCallChargeEvent | null;
      chargeEventRef: FirebaseFirestore.DocumentReference | null;
    } | null = null;
    /** Очистка провизорного trial-маркера мёртвой заготовки — в оба tx.set ниже. */
    let deadTrialMarkerClear: Record<string, unknown> | null = null;
    if (activeSessionId && prevReserved > 0) {
      const lastHeartbeatMs = num(data.lastHeartbeatMs, num(data.sessionStartedAtMs));
      // зачем (аудит 2026-08-24, владелец «связь не установилась»): резерв
      // пишет lastHeartbeatMs = now ПРИ СОЗДАНИИ, ещё до звонка. Поэтому
      // premint, брошенный убийством приложения на пре-экране, выглядел живым
      // и держал voice_session_active все 12 минут (cap+grace): в логах три
      // отказа подряд, человек видел «Связь не установилась. Проверь интернет».
      // Разделяем два случая по activatedAtMs (его ставит ПЕРВЫЙ heartbeat,
      // то есть реальное «алло»):
      //   • сессия активирована — окно прежнее, два живых звонка по-прежнему
      //     невозможны (у живого heartbeat всегда свежее окна);
      //   • резерв без единого heartbeat — живёт лишь короткое окно на долёт
      //     offer/SDP; дальше это брошенная заготовка, и свежий минт её
      //     вытесняет, дозакрыв нулём прожитых секунд (часы идут от активации,
      //     см. voiceSessionClockStartMs — человек ничего не теряет).
      const activated = num(data.activatedAtMs) > 0;
      const silenceWindowMs = activated
        ? VOICE_DEAD_SESSION_SILENCE_MS
        : VOICE_UNACTIVATED_RESERVE_GRACE_MS;
      const heartbeatFresh = now - lastHeartbeatMs <= silenceWindowMs;
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
      if (data.accessType === 'paid_minutes') {
        // Мёртвая платная сессия: закрываем её резервацию кошелька по последнему
        // heartbeat (premint без «алло» платит 0 — часы от активации, как выше).
        const deadWalletRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(args.stableUid);
        const deadWalletSnap = await tx.get(deadWalletRef);
        const deadWallet = voiceMinuteWalletFromData(
          args.stableUid,
          (deadWalletSnap.data() ?? {}) as Record<string, unknown>,
        );
        if (deadWallet.activeReservationSessionId !== activeSessionId
          || deadWallet.reservedSeconds <= 0) {
          // Рассинхрон: кошелёк уже свободен (watchdog/settle успели раньше, а
          // док квоты не дочистился). Чинится перезаписью дока квоты ниже;
          // деньги уже сведены той стороной, storno бюджета не наше.
          evictedPaid = { wallet: null, chargeEvent: null, chargeEventRef: null };
        } else {
          const reservationTotalSec = Math.max(prevReserved, Math.floor(num(data.paidReservationTotalSec)));
          const consumedBeforeSec = Math.min(
            reservationTotalSec,
            Math.max(0, Math.floor(num(data.paidConsumedSec))),
          );
          const settle = projectVoiceMinuteWalletSettle(deadWallet, {
            activeSessionId,
            rootSessionId: str(data.paidReservationRootSessionId) || activeSessionId,
            reservationTotalSeconds: reservationTotalSec,
            chargedSeconds: Math.min(reservationTotalSec, consumedBeforeSec + consumed),
            occurredAtMs: now,
          });
          let chargeEventRef: FirebaseFirestore.DocumentReference | null = null;
          if (settle.chargeEvent) {
            chargeEventRef = db.collection(VOICE_MINUTE_EVENT_COLLECTION).doc(settle.chargeEvent.eventId);
            const existingSnap = await tx.get(chargeEventRef);
            if (existingSnap.exists) {
              // Событие уже есть при живой резервации — сломанный инвариант;
              // replay-проверка отличит дубликат от подмены, но писать нельзя.
              validateVoiceMinuteEventReplay(
                (existingSnap.data() ?? {}) as unknown as VoiceMinuteEvent,
                settle.chargeEvent,
              );
              throw new Error('voice_minute_charge_already_applied');
            }
          }
          evictedPaid = { wallet: settle.wallet, chargeEvent: settle.chargeEvent, chargeEventRef };
          // Наружу — неиспользованный хвост: mint сторнирует его в дневном
          // бюджетном счётчике, как и для календарного вытеснения.
          staleRefundedSec = settle.refundedSeconds;
        }
      } else {
        staleRefundedSec = prevReserved - consumed;
        win.dailyUsedSec = Math.max(0, win.dailyUsedSec - staleRefundedSec);
        win.monthlyUsedSec = Math.max(0, win.monthlyUsedSec - staleRefundedSec);
        // Вытесняем мёртвую TRIAL-заготовку, не прожившую ни секунды, — её
        // lifetime-маркер возвращается той же транзакцией (владелец 2026-08-30:
        // «пробник был, но показывает 0 минут»; та же продуктовая позиция, что
        // возврат при chargedSec=0 в settle 2026-08-29). Новый trial-резерв
        // ниже перепишет маркеры свежими значениями сам; для нового admin-
        // доступа очистку добавляем явно.
        if (data.accessType === 'trial'
          && consumed === 0
          && str(data.trialReservationSessionId) === activeSessionId) {
          deadTrialMarkerClear = {
            trialUsedAtMs: null,
            lifetimeTrialUsedAtMs: null,
            trialReservationSessionId: null,
            trialProviderMintedAtMs: 0,
          };
        }
      }
    }

    if (args.accessType === 'paid_minutes') {
      let paidReserve: { reservedSeconds: number; availableSeconds: number };
      try {
        const requestedSeconds = Math.floor(
          Math.max(0, args.formatCapSec) + Math.max(0, args.graceTailSec),
        );
        if (evictedPaid?.wallet) {
          // База — кошелёк ПОСЛЕ вытеснения; повторное чтение хелпером запрещено
          // (все чтения транзакции уже сделаны), поэтому проекция + свои записи.
          const projected = projectVoiceMinuteWalletReserve(evictedPaid.wallet, {
            sessionId: args.sessionId,
            requestedSeconds,
            minimumSeconds: MIN_VOICE_RESERVE_SEC,
            occurredAtMs: now,
          });
          if (evictedPaid.chargeEvent && evictedPaid.chargeEventRef) {
            tx.set(evictedPaid.chargeEventRef, evictedPaid.chargeEvent, { merge: false });
          }
          tx.set(
            db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(args.stableUid),
            projected.wallet,
            { merge: false },
          );
          paidReserve = { reservedSeconds: projected.reservedSeconds, availableSeconds: projected.availableSeconds };
        } else {
          paidReserve = await reserveVoiceMinuteWalletInTransaction(tx, db, {
            ownerStableId: args.stableUid,
            sessionId: args.sessionId,
            requestedSeconds,
            minimumSeconds: MIN_VOICE_RESERVE_SEC,
            occurredAtMs: now,
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : '';
        if (reason === 'voice_minutes_insufficient') {
          throw new HttpsError('resource-exhausted', 'voice_minutes_insufficient');
        }
        if (reason === 'voice_minute_reservation_active') {
          throw new HttpsError('failed-precondition', 'voice_session_active');
        }
        throw error;
      }
      const reservedSec = paidReserve.reservedSeconds;
      tx.set(ref, {
        quotaIdentityVersion: VOICE_QUOTA_IDENTITY_VERSION,
        quotaIdentityClosureProof: suppliedClosureProof,
        authUid: args.authUid,
        stableUid: args.stableUid,
        resetAtMs: win.resetAtMs,
        monthResetAtMs: win.monthResetAtMs,
        dailyUsedSec: win.dailyUsedSec,
        monthlyUsedSec: win.monthlyUsedSec,
        accessType: 'paid_minutes',
        // Мёртвая trial-заготовка могла держать провизорный маркер — чистим.
        ...(deadTrialMarkerClear ?? {}),
        activeSessionId: args.sessionId,
        sessionStartedAtMs: now,
        activatedAtMs: 0,
        reservedSec,
        paidReservationRootSessionId: args.sessionId,
        paidReservationTotalSec: reservedSec,
        paidConsumedSec: 0,
        expiresAtMs: now + (reservedSec + VOICE_RESERVE_EXPIRY_GRACE_SEC) * 1000,
        lastHeartbeatMs: now,
        usageTotals: { ...VOICE_USAGE_ZERO },
        lastHeartbeatElapsedSec: 0,
        reconnectChain: { rootId: args.sessionId, count: 0, gapSecTotal: 0 },
        updatedAtMs: now,
      }, { merge: true });
      return {
        reservedSec,
        dayRemainingSec: paidReserve.availableSeconds,
        monthRemainingSec: paidReserve.availableSeconds,
        staleRefundedSec,
      };
    }

    const dayRemaining = Math.max(0, Math.floor(args.dailyVoiceSecMax) - win.dailyUsedSec);
    let maxAllowanceMonthResetAtMs = num(data.maxAllowanceMonthResetAtMs);
    let maxAllowanceUsageBaselineSec = Math.min(
      win.monthlyUsedSec,
      Math.max(0, num(data.maxAllowanceUsageBaselineSec)),
    );
    if (args.maxMonthlyAllowance && maxAllowanceMonthResetAtMs !== win.monthResetAtMs) {
      // First verified MAX reserve in this UTC month offsets only a verified
      // current-month trial, capped by its known reserve. The marker is written
      // in this same transaction, so a retry/reactivation cannot reset MAX use.
      maxAllowanceMonthResetAtMs = win.monthResetAtMs;
      const trialUsedAtMs = num(data.trialUsedAtMs);
      const trialIsFromCurrentMonth = trialUsedAtMs >= startOfUtcMonth(now)
        && trialUsedAtMs <= now
        && str(data.trialReservationSessionId) !== ''
        && num(data.trialProviderMintedAtMs) > 0;
      maxAllowanceUsageBaselineSec = trialIsFromCurrentMonth
        ? Math.min(
            win.monthlyUsedSec,
            Math.max(0, Math.floor(args.maxInitialTrialOffsetSec ?? 0)),
          )
        : 0;
    }
    const monthlyUsageForCap = args.maxMonthlyAllowance
      ? Math.max(0, win.monthlyUsedSec - maxAllowanceUsageBaselineSec)
      : win.monthlyUsedSec;
    const monthRemaining = Math.max(0, Math.floor(args.monthlyVoiceSecMax) - monthlyUsageForCap);
    const reservedSec = Math.floor(Math.min(
      Math.max(0, args.formatCapSec) + Math.max(0, args.graceTailSec),
      dayRemaining,
      monthRemaining,
    ));
    if (reservedSec < MIN_VOICE_RESERVE_SEC) {
      const quotaReason = voiceQuotaExhaustedReason(dayRemaining, monthRemaining);
      const reason = quotaReason ?? LEGACY_VOICE_QUOTA_EXHAUSTED_REASON;
      console.warn('max_voice_quota reserve rejected', {
        reason,
        dayRemaining,
        monthRemaining,
      });
      throw new HttpsError(
        'resource-exhausted',
        reason,
        quotaReason ? LEGACY_VOICE_QUOTA_EXHAUSTED_REASON : undefined,
      );
    }

    // Календарный резерв ПОСЛЕ вытеснения платной сессии (кошелёк опустел —
    // гейты увели в trial/admin): закрытие кошелька мёртвой сессии пишется
    // той же транзакцией, иначе её резервация повисла бы навсегда.
    if (evictedPaid?.wallet) {
      if (evictedPaid.chargeEvent && evictedPaid.chargeEventRef) {
        tx.set(evictedPaid.chargeEventRef, evictedPaid.chargeEvent, { merge: false });
      }
      tx.set(
        db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(args.stableUid),
        evictedPaid.wallet,
        { merge: false },
      );
    }
    tx.set(ref, {
      quotaIdentityVersion: VOICE_QUOTA_IDENTITY_VERSION,
      quotaIdentityClosureProof: suppliedClosureProof,
      authUid: args.authUid,
      stableUid: args.stableUid,
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      dailyUsedSec: win.dailyUsedSec + reservedSec,
      monthlyUsedSec: win.monthlyUsedSec + reservedSec,
      ...(args.maxMonthlyAllowance ? {
        maxAllowanceMonthResetAtMs,
        maxAllowanceUsageBaselineSec,
      } : {}),
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
      accessType: args.accessType ?? (args.consumeLifetimeTrial ? 'trial' : 'admin'),
      paidReservationRootSessionId: null,
      paidReservationTotalSec: 0,
      paidConsumedSec: 0,
      // Очистка провизорного маркера мёртвой заготовки — ДО consume-спреда:
      // свежий trial-резерв перепишет её новыми маркерами, admin — оставит чистой.
      ...(deadTrialMarkerClear ?? {}),
      ...(args.consumeLifetimeTrial ? {
        lifetimeTrialUsedAtMs: now,
        trialUsedAtMs: now,
        trialReservationSessionId: args.sessionId,
        trialProviderMintedAtMs: 0,
      } : {}),
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
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true };
    }
    const win = normalizeWindows(data, now);
    const chargedSec = Math.min(reservedSec, Math.max(0, Math.floor(num(args.actualSec))));
    const refundedSec = reservedSec - chargedSec;
    if (data.accessType === 'paid_minutes') {
      const reservationTotalSec = Math.max(reservedSec, Math.floor(num(data.paidReservationTotalSec)));
      const consumedBeforeSec = Math.min(
        reservationTotalSec,
        Math.max(0, Math.floor(num(data.paidConsumedSec))),
      );
      const paid = await settleVoiceMinuteWalletInTransaction(tx, db, {
        ownerStableId: args.stableUid,
        activeSessionId: args.sessionId,
        rootSessionId: str(data.paidReservationRootSessionId) || args.sessionId,
        reservationTotalSeconds: reservationTotalSec,
        chargedSeconds: Math.min(reservationTotalSec, consumedBeforeSec + chargedSec),
        occurredAtMs: now,
      });
      tx.set(ref, {
        activeSessionId: null,
        reservedSec: 0,
        expiresAtMs: 0,
        paidReservationRootSessionId: null,
        paidReservationTotalSec: 0,
        paidConsumedSec: 0,
        lastSettledSessionId: args.sessionId,
        lastSettledAtMs: now,
        lastEndReason: str(args.endReason).slice(0, 40) || 'completed',
        updatedAtMs: now,
      }, { merge: true });
      return {
        chargedSec: paid.chargedSeconds,
        refundedSec: paid.refundedSeconds,
        alreadySettled: false,
      };
    }
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
      lastSettledAtMs: now,
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
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.stableUid));
  return db.runTransaction(async (tx) => {
    const data = ((await tx.get(ref)).data() ?? {}) as Record<string, unknown>;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true, xpAwarded: 0, snapshot: data };
    }
    const win = normalizeWindows(data, now);
    const actualSec = args.resolveActualSec ? args.resolveActualSec(data) : num(args.actualSec);
    const currentSegmentChargedSec = Math.min(reservedSec, Math.max(0, Math.floor(actualSec)));
    const isPaidMinutes = data.accessType === 'paid_minutes';
    const reservationTotalSec = isPaidMinutes
      ? Math.max(reservedSec, Math.floor(num(data.paidReservationTotalSec)))
      : reservedSec;
    const consumedBeforeSec = isPaidMinutes
      ? Math.min(reservationTotalSec, Math.max(0, Math.floor(num(data.paidConsumedSec))))
      : 0;
    const chargedSec = isPaidMinutes
      ? Math.min(reservationTotalSec, consumedBeforeSec + currentSegmentChargedSec)
      : currentSegmentChargedSec;
    const refundedSec = reservationTotalSec - chargedSec;

    // Дневной XP-кэп применяется к НАКОПЛЕННОМУ за день, не к одной сессии,
    // иначе N сессий в день давали бы N×cap.
    const cap = Math.max(0, Math.floor(args.xpDailyCap));
    const alreadyToday = str(data.xpDayKey) === args.xpDayKey
      ? Math.max(0, Math.floor(num(data.xpAwardedToday)))
      : 0;
    const sessionXp = Math.max(0, Math.floor(args.computeXp(chargedSec, data)));
    const xpAwarded = Math.max(0, Math.min(sessionXp, cap - alreadyToday));

    if (isPaidMinutes) {
      await settleVoiceMinuteWalletInTransaction(tx, db, {
        ownerStableId: args.stableUid,
        activeSessionId: args.sessionId,
        rootSessionId: str(data.paidReservationRootSessionId) || args.sessionId,
        reservationTotalSeconds: reservationTotalSec,
        chargedSeconds: chargedSec,
        occurredAtMs: now,
      });
    }

    // зачем (инцидент владельца 2026-08-29): пробник помечается использованным
    // при РЕЗЕРВЕ — так двумя параллельными минтами нельзя выпросить два
    // бесплатных звонка. Но если звонок сорвался и не потратил НИ СЕКУНДЫ
    // (провайдер не отдал аудио: call_failed / no_remote_audio / empty
    // transcript), человек терял пробник навсегда, ни разу не поговорив.
    // Секунды в этом случае уже возвращаются — возвращаем и сам пробник.
    // Возврат строго по этой сессии: чужую отметку снять нельзя.
    const refundsLifetimeTrial = !isPaidMinutes
      && chargedSec === 0
      && data.accessType === 'trial'
      && str(data.trialReservationSessionId) === str(args.sessionId);

    tx.set(ref, {
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      // Кламп в 0: если день/месяц успел перещёлкнуться, возврат не уходит в минус.
      dailyUsedSec: isPaidMinutes ? win.dailyUsedSec : Math.max(0, win.dailyUsedSec - refundedSec),
      monthlyUsedSec: isPaidMinutes ? win.monthlyUsedSec : Math.max(0, win.monthlyUsedSec - refundedSec),
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      ...(isPaidMinutes ? {
        paidReservationRootSessionId: null,
        paidReservationTotalSec: 0,
        paidConsumedSec: 0,
      } : {}),
      ...(refundsLifetimeTrial ? {
        trialUsedAtMs: null,
        lifetimeTrialUsedAtMs: null,
        trialReservationSessionId: null,
        trialProviderMintedAtMs: 0,
      } : {}),
      lastSettledSessionId: args.sessionId,
      lastSettledAtMs: now,
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
  /** Caller proved that provider mint failed before any token was issued. */
  restoreLifetimeTrial?: boolean;
  /**
   * зачем (владелец 2026-08-30): watchdog закрывает заготовку, НЕ прожившую ни
   * секунды («алло» не было), у которой провайдер-токен УЖЕ был выпущен. По
   * продуктовой позиции 2026-08-29 (возврат при chargedSec=0) пробник в этом
   * случае возвращается, хотя trialProviderMintedAtMs > 0. Флаг ставит только
   * watchdog для briefing_abandoned; провал минта живёт прежним строгим путём.
   */
  allowMintedTrialRestore?: boolean;
  nowMs?: number;
}

export interface VoiceTrialMintArgs {
  authUid: string;
  stableUid: string;
  sessionId: string;
  nowMs?: number;
}

interface VoiceReservationOwner {
  ref: FirebaseFirestore.DocumentReference;
  data: Record<string, unknown>;
}

const MAX_VOICE_QUOTA_RESERVATION_OWNER_DOCS = MAX_VOICE_QUOTA_ALIAS_DOCS * 2;

/**
 * Finds the current quota document that owns this exact live reservation.
 * Account linking can move it to the winner and tombstone the original quota
 * between provider mint and confirmation/release, so closure resolution and
 * owner selection must happen inside the same transaction as the write.
 */
async function resolveVoiceReservationOwner(
  db: Firestore,
  tx: FirebaseFirestore.Transaction,
  args: Pick<VoiceTrialMintArgs, 'authUid' | 'stableUid' | 'sessionId'>,
): Promise<VoiceReservationOwner | null> {
  const identities = await resolveAccountDeleteIdentityClosure(
    db,
    args.stableUid,
    args.authUid,
    tx,
  );
  const collection = db.collection(VOICE_QUOTA_COLLECTION);
  const seenPaths = new Set<string>();
  const pending: FirebaseFirestore.DocumentReference[] = [];
  const snapshots: VoiceReservationOwner[] = [];
  const redirects = new Map<string, string>();
  const enqueue = (ref: FirebaseFirestore.DocumentReference) => {
    if (seenPaths.has(ref.path)) return;
    if (seenPaths.size >= MAX_VOICE_QUOTA_RESERVATION_OWNER_DOCS) {
      throw new HttpsError('resource-exhausted', 'voice_quota_identity_limit');
    }
    seenPaths.add(ref.path);
    pending.push(ref);
  };
  for (const identity of new Set([args.stableUid, args.authUid, ...identities].map(str).filter(Boolean))) {
    enqueue(collection.doc(voiceQuotaDocId(identity)));
  }

  while (pending.length > 0) {
    const refs = pending.splice(0, pending.length);
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (let index = 0; index < refs.length; index += 1) {
      if (!snaps[index].exists) continue;
      const data = (snaps[index].data() ?? {}) as Record<string, unknown>;
      snapshots.push({ ref: refs[index], data });
      const migratedTo = str(data.quotaIdentityMigratedTo);
      if (migratedTo) {
        const target = collection.doc(migratedTo);
        redirects.set(refs[index].path, target.path);
        enqueue(target);
      }
    }
  }

  for (const start of redirects.keys()) {
    const chain = new Set<string>();
    let path: string | undefined = start;
    while (path && redirects.has(path)) {
      if (chain.has(path)) {
        throw new HttpsError('failed-precondition', 'voice_quota_identity_cycle');
      }
      chain.add(path);
      path = redirects.get(path);
    }
  }

  const owners = snapshots.filter(({ data }) => (
    str(data.activeSessionId) === str(args.sessionId)
    && Math.max(0, Math.floor(num(data.reservedSec))) > 0
  ));
  if (owners.length > 1) {
    throw new HttpsError('failed-precondition', 'voice_session_identity_ambiguous');
  }
  return owners[0] ?? null;
}

export async function confirmVoiceTrialMinted(db: Firestore, args: VoiceTrialMintArgs): Promise<void> {
  const now = args.nowMs ?? Date.now();
  await db.runTransaction(async (tx) => {
    const owner = await resolveVoiceReservationOwner(db, tx, args);
    const validReservation = owner != null
      && str(owner.data.trialReservationSessionId) === args.sessionId
      && num(owner.data.trialUsedAtMs) > 0;
    if (!validReservation) throw new HttpsError('failed-precondition', 'voice_trial_reservation_missing');
    tx.set(owner.ref, {
      trialProviderMintedAtMs: now,
      updatedAtMs: now,
    }, { merge: true });
  });
}

/**
 * Полный возврат резерва (отмена до connect: уход с брифинга, maxVoiceCancel).
 * Идемпотентен так же, как settle. Возвращает освобождённые секунды.
 */
export async function releaseVoiceReservation(db: Firestore, args: VoiceReleaseArgs): Promise<VoiceSettleResult> {
  const now = args.nowMs ?? Date.now();
  return db.runTransaction(async (tx) => {
    const owner = await resolveVoiceReservationOwner(db, tx, args);
    if (!owner) return { chargedSec: 0, refundedSec: 0, alreadySettled: true };
    const { data, ref } = owner;
    const reservedSec = Math.max(0, Math.floor(num(data.reservedSec)));
    if (str(data.activeSessionId) !== str(args.sessionId) || reservedSec <= 0) {
      return { chargedSec: 0, refundedSec: 0, alreadySettled: true };
    }
    const win = normalizeWindows(data, now);
    if (data.accessType === 'paid_minutes') {
      const reservationTotalSec = Math.max(reservedSec, Math.floor(num(data.paidReservationTotalSec)));
      const consumedBeforeSec = Math.min(
        reservationTotalSec,
        Math.max(0, Math.floor(num(data.paidConsumedSec))),
      );
      const paid = await settleVoiceMinuteWalletInTransaction(tx, db, {
        ownerStableId: args.stableUid,
        activeSessionId: args.sessionId,
        rootSessionId: str(data.paidReservationRootSessionId) || args.sessionId,
        reservationTotalSeconds: reservationTotalSec,
        chargedSeconds: consumedBeforeSec,
        occurredAtMs: now,
      });
      tx.set(ref, {
        activeSessionId: null,
        reservedSec: 0,
        expiresAtMs: 0,
        paidReservationRootSessionId: null,
        paidReservationTotalSec: 0,
        paidConsumedSec: 0,
        lastReleaseReason: str(args.reason).slice(0, 40) || 'released',
        updatedAtMs: now,
      }, { merge: true });
      return {
        chargedSec: paid.chargedSeconds,
        refundedSec: paid.refundedSeconds,
        alreadySettled: false,
      };
    }
    const restoreUnmintedTrial = args.restoreLifetimeTrial === true
      && str(data.trialReservationSessionId) === args.sessionId
      && (num(data.trialProviderMintedAtMs) <= 0 || args.allowMintedTrialRestore === true);
    const restoreLifetimeMarker = restoreUnmintedTrial
      && (num(data.lifetimeTrialUsedAtMs) <= 0
        || num(data.lifetimeTrialUsedAtMs) === num(data.trialUsedAtMs));
    tx.set(ref, {
      resetAtMs: win.resetAtMs,
      monthResetAtMs: win.monthResetAtMs,
      dailyUsedSec: Math.max(0, win.dailyUsedSec - reservedSec),
      monthlyUsedSec: Math.max(0, win.monthlyUsedSec - reservedSec),
      activeSessionId: null,
      reservedSec: 0,
      expiresAtMs: 0,
      lastReleaseReason: str(args.reason).slice(0, 40) || 'released',
      ...(restoreUnmintedTrial ? {
        ...(restoreLifetimeMarker ? { lifetimeTrialUsedAtMs: null } : {}),
        trialUsedAtMs: null,
        trialReservationSessionId: null,
        trialProviderMintedAtMs: 0,
      } : {}),
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
  const ref = db.collection(VOICE_QUOTA_COLLECTION).doc(voiceQuotaDocId(args.stableUid));
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
    if (data.accessType === 'paid_minutes') {
      await transferVoiceMinuteWalletReservationInTransaction(tx, db, {
        ownerStableId: args.stableUid,
        previousSessionId: args.prevSessionId,
        newSessionId: args.newSessionId,
        occurredAtMs: now,
      });
    }
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
      ...(data.accessType === 'paid_minutes' ? {
        paidConsumedSec: Math.min(
          Math.max(reservedSec, Math.floor(num(data.paidReservationTotalSec))),
          Math.max(0, Math.floor(num(data.paidConsumedSec))) + consumedSec,
        ),
      } : {}),
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
