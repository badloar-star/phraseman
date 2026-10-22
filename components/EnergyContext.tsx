import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, InteractionManager } from 'react-native';
import { BONUS_ENERGY_KEY, readBonusEnergyForMutation, type BonusEnergyState } from '../app/bonus_energy_store';
import { requireGiftAccountStorageKey } from '../app/gift_account_storage';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from '../app/premium_guard';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from '../app/account_generation';
import { persistPremiumEnergyRefill } from '../app/energy_premium_refill';
import { readDevLocalPlusOverride } from '../app/dev_plus_controls';
import { applyAdminEnergyCommand, formatTimeUntilRecovery, getRecoveryIntervalMs } from '../app/energy_system';
import { createCoalescedAsyncRunner } from '../app/app_resume_policy';
// зачем (аудит 2026-08-23, третий проход): ключ energy_state пишут ДЕВЯТЬ мест.
// Подарки уровня, сезонный «полный заряд» и покупка за жемчужины идут под общим
// withStorageLock, а EnergyContext писал мимо него — читал-менял-писал целиком.
// Пересечение окон (получил подарок энергии и тут же начал урок) молча теряло
// либо подарок, либо списание: побеждал тот, кто дописал последним. Теперь все
// девять писателей стоят в одной очереди.
// ВАЖНО: замок НЕреентерабельный (app/storage_mutex.ts — флаг + очередь, без
// счётчика владельца). Внутри залоченной секции нельзя звать spendOne/refundOne
// и любой другой код, который берёт этот же замок — будет вечная блокировка.
import { withStorageLock } from '../app/storage_mutex';
import { peekDevEnergyPinRaw } from '../app/dev_energy_tools';
import type { Lang } from '../constants/i18n';
import { resolveNotificationLang } from '../app/notification_lang';
import { energyCountdownClock } from './energy_countdown_clock';
import { useLang } from './LangContext';
import { isFeatureFreeForEveryone } from '../app/feature_gates';
import type { EnergyStartResult } from './energy_start_confirmation';
import { chargesEnergyOnMistake, isFreeInMistakeMode, peekEnergyMode } from '../app/energy_mode';
import { peekEnergy, writePeekEnergy } from '../app/energy_peek_cache';
import { markEnergySpendStage } from '../app/energy_spend_latency_trace';
import { soundDirector } from '../modules/audio/sound_director';
import {
  acknowledgeEnergySessionStart as acknowledgeEnergySessionStartInLedger,
  commitEnergySessionStart,
  createEnergySessionIntent,
  createEnergySessionBootId,
  readEnergySessionRefundCredit,
  recoverEnergySessionOperations,
  refundEnergySessionStart,
  type EnergySessionIntent,
  type EnergySessionProjection,
} from '../app/energy_session_operation_ledger';
import { DebugLogger } from '../app/debug-logger';
import { releaseReason } from '../app/release_reason'; // зачем (координатор 13.10): причина отказа списания видна в релизе
import { useFlashcardTrainingGrantBootMaintenance } from './use_flashcard_training_grant_boot_maintenance';
import {
  activityEnergyCost,
  ENERGY_BASE_CAPACITY,
  energyActivityForSessionKind,
  permanentEnergyCapacity,
  type EnergyActivityKey,
} from '../app/energy_contract';
import {
  coerceEnergyStateV2,
  createFullEnergyState,
  settleEnergyAcrossRateSegments,
  settleEnergyState,
  timeUntilEnergyAtLeast,
  type EnergyStateV2,
} from '../app/energy_state_v2';
import { energyVisualTransactions } from '../app/energy_visual_transactions';
import { isDevDialogEnergyFail } from '../app/dev_dialog_state';
import { noteSwallowedHandler, noteSwallowedAs } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type EnergyNotificationModule = Pick<
  typeof import('../app/notifications'),
  'scheduleEnergyFullNotification' | 'cancelEnergyFullNotification'
>;

let energyNotificationModulePromise: Promise<EnergyNotificationModule> | null = null;

function loadEnergyNotificationModule(): Promise<EnergyNotificationModule> {
  energyNotificationModulePromise ??= import('../app/notifications');
  return energyNotificationModulePromise;
}

async function scheduleEnergyFullNotificationLazy(secondsUntilFull: number, lang: Lang): Promise<void> {
  const { scheduleEnergyFullNotification } = await loadEnergyNotificationModule();
  await scheduleEnergyFullNotification(secondsUntilFull, lang);
}

async function cancelEnergyFullNotificationLazy(): Promise<void> {
  const { cancelEnergyFullNotification } = await loadEnergyNotificationModule();
  await cancelEnergyFullNotification();
}

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = ENERGY_BASE_CAPACITY;
// B2 (PERF_MASTER_PLAN): последнее известное значение энергии читается синхронно
// в useState-инициализаторах ниже, иначе провайдер стартует с MAX_ENERGY и шкала
// заметно "прыгает" (полная -> реальная), когда load() досчитает настоящее число.
//
// зачем (владелец, 2026-08-24, «энергия не показывает правильную цифру сразу при
// входе»): раньше кэш жил прямо здесь и переживал только ремаунты провайдера — на
// ХОЛОДНОМ старте он был пуст, и первый кадр рисовал полную шкалу. Теперь кэш живёт
// в app/energy_peek_cache.ts и заполняется ещё стартовой гидратацией, которая
// читает диск раньше, чем этот провайдер вообще смонтируется. Модуль вынесен
// отдельно намеренно: импортируй загрузчик сам EnergyContext — холодный старт
// потянул бы весь React-провайдер со всеми его зависимостями.

type StoredEnergy = EnergyStateV2;

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-5 permanent pool (PM-081: capacity is exactly 5)
  bonusEnergy: number;       // 0-200 temporary gift pool (expires next local midnight)
  /**
   * Временный ПОТОЛОК от подарка, живущий до полуночи независимо от остатка.
   *
   * Подарки +20/+40/+60 расширяют шкалу на день; бонусная
   * ёмкость складывается до +200 поверх постоянного лимита.
   * Потратив бонус, игрок обязан сохранить расширенный потолок, и
   * восстановление должно доливать энергию в золотую часть. Если хранить
   * только остаток, шкала схлопывалась бы сразу после первой траты.
   */
  bonusEnergyCapacity: number;
  bonusExpiresAt: number;    // epoch ms when bonus expires (0 if no bonus)
  maxEnergy: number;         // permanent pool cap; temporary gift capacity is separate
  recoveryIntervalMs: number;// current +1 energy recovery interval
  recoveryEndsAtMs: number;
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // e.g. ru "29м 12с", en "29m 12s" (единицы языка интерфейса) — ready to display // i18n-ok: пример в комментарии типа, не текст экрана
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  /** Start one priced activity using the canonical numeric-energy catalog. */
  confirmActivityStart: (activity: EnergyActivityKey, intent: EnergySessionIntent) => Promise<EnergyStartResult>;
  /**
   * Режим энергии Б (владелец 11.10): списать 1 энергию за ОШИБКУ в занятии с сердечками. Идемпотентно по
   * intent.operationId (номер ответа). 'insufficient' — энергии уже нет; 'unlimited' — Plus, ничего не снято.
   */
  spendMistakeEnergy: (activity: EnergyActivityKey, intent: EnergySessionIntent) => Promise<EnergyStartResult>;
  /** Режим Б: можно ли начать занятие (Plus или хотя бы 1 энергия). В режиме А всегда true — там решает цена старта. */
  canStartInMistakeMode: boolean;
  refundActivityStart: (operationId: string, reason: string) => Promise<void>;
  spendOne: (intent: EnergySessionIntent) => Promise<boolean>;  // returns false if no energy
  /** Ask before a paid start and return a distinct cancel/no-energy outcome. */
  confirmSpendOne: (intent: EnergySessionIntent) => Promise<EnergyStartResult>;
  /**
   * Синхронный прогноз старта БЕЗ списания: 'insufficient' — confirmActivityStart откажет из-за энергии;
   * 'ok' — пустит; 'unknown' — энергия ещё не прочитана (решит настоящий старт). Те же правила, что в старте.
   */
  predictStartRefusal: (activity: EnergyActivityKey) => 'ok' | 'insufficient' | 'unknown';
  /** Spend N units: bonus first, then base. Returns false if total available < n (atomic). */
  spendAmount: (n: number, intent: EnergySessionIntent) => Promise<boolean>;
  /** Multi-energy equivalent of confirmSpendOne. */
  confirmSpendAmount: (n: number, intent: EnergySessionIntent) => Promise<EnergyStartResult>;
  /**
   * Вернуть 1 единицу, если оплаченный старт НЕ состоялся (упала сеть, сервер
   * отказал, экран закрылся до входа).
   *
   * зачем: владелец 2026-08-23 — энергия платится за ВХОД. Если входа не
   * случилось, плата обязана вернуться: иначе игрок теряет заряд за чужую
   * сетевую ошибку. Живой бонус возвращается в тот же временный пул, а после
   * полуночи не превращается в постоянную базовую энергию.
   */
  refundOne: (operationId: string, reason: string) => Promise<void>;
  acknowledgeSessionStart: (operationId: string) => Promise<boolean>;
  reload: () => Promise<void>;       // force re-read (call after tester toggle)
  // lease — обязателен, если вызывающий уже держит замок аккаунта (покупка RevenueCat), иначе взаимная блокировка
  refillToMax: (isCurrent?: () => boolean, lease?: AccountTransitionLockLease) => Promise<boolean>; // immediate account-safe Premium refill
  /** First AsyncStorage load finished — safe to gate screens on real energy+bonus (not defaults). */
  energyReady: boolean;
}

const EnergyContext = createContext<EnergyContextValue>({
  energy: MAX_ENERGY,
  bonusEnergy: 0,
  bonusEnergyCapacity: 0,
  bonusExpiresAt: 0,
  maxEnergy: MAX_ENERGY,
  recoveryIntervalMs: getRecoveryIntervalMs(0),
  recoveryEndsAtMs: 0,
  timeUntilNextMs: 0,
  formattedTime: '',
  isUnlimited: false,
  restoringPremium: false,
  confirmActivityStart: async () => 'spent',
  spendMistakeEnergy: async () => 'spent',
  canStartInMistakeMode: true,
  refundActivityStart: async () => {},
  spendOne: async () => true,
  confirmSpendOne: async () => 'spent',
  predictStartRefusal: () => 'unknown',
  spendAmount: async () => true,
  confirmSpendAmount: async () => 'spent',
  refundOne: async () => {},
  acknowledgeSessionStart: async () => true,
  reload: async () => {},
  refillToMax: async () => true,
  energyReady: false,
});

export function useEnergy(): EnergyContextValue {
  return useContext(EnergyContext);
}

/** One stable operation/grant identity for the lifetime of a mounted activity. */
export function useEnergySessionIntent(
  kind: string,
  subjectId: string,
  attemptId?: string,
): EnergySessionIntent {
  const key = `${kind}\u0000${subjectId}\u0000${attemptId ?? ''}`;
  const intentRef = useRef<{ key: string; intent: EnergySessionIntent } | null>(null);
  if (intentRef.current?.key !== key) {
    intentRef.current = { key, intent: createEnergySessionIntent(kind, subjectId, attemptId) };
  }
  return intentRef.current.intent;
}

export function useEnergyCountdown(options: { visible?: boolean } = {}): { timeUntilNextMs: number; formattedTime: string } {
  const { energy, bonusEnergy, bonusEnergyCapacity, maxEnergy, isUnlimited, recoveryIntervalMs, recoveryEndsAtMs } = useEnergy();
  const { lang: uiLang } = useLang();
  const activeEnergy = energy + bonusEnergy;
  const activeMaxEnergy = maxEnergy + bonusEnergyCapacity;
  const [now, setNow] = useState(() => Date.now());
  const visible = options.visible ?? true;

  useEffect(() => {
    const shouldTick =
      visible
      && !isUnlimited
      && activeEnergy < activeMaxEnergy
      && recoveryEndsAtMs > 0
      && recoveryIntervalMs > 0;

    setNow(Date.now());
    if (!shouldTick) return undefined;

    return energyCountdownClock.subscribe(setNow);
  }, [activeEnergy, activeMaxEnergy, isUnlimited, recoveryEndsAtMs, recoveryIntervalMs, visible]);

  if (isUnlimited || activeEnergy >= activeMaxEnergy || recoveryEndsAtMs <= 0 || recoveryIntervalMs <= 0) {
    return { timeUntilNextMs: 0, formattedTime: '' };
  }

  const startedAt = recoveryEndsAtMs - recoveryIntervalMs;
  const elapsed = Math.max(0, now - startedAt);
  const step = elapsed % recoveryIntervalMs;
  const remaining = step === 0 && elapsed > 0 ? recoveryIntervalMs : recoveryIntervalMs - step;
  const timeUntilNextMs = Math.max(0, Math.min(recoveryIntervalMs, remaining));

  return {
    timeUntilNextMs,
    formattedTime: formatTimeUntilRecovery(timeUntilNextMs, uiLang),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * ПОЧЕМУ энергия не тратится — источник безлимита одной строкой.
 *
 * зачем (владелец 2026-09-03, «энергия не отнимается вообще при любом занятии»):
 * безлимит включают ПЯТЬ независимых причин, и все они молча возвращали true.
 * В `spendOne` стоит ранний выход `if (isUnlimitedRef.current) return true` —
 * трата успешно «проходила», ничего не списывая и не оставляя следа в логе.
 * Разбор приходилось вести перебором пяти мест вместо одного grep.
 * Причина пишется ВСЕГДА, по закону «каждый ранний выход называет себя».
 */
let _lastUnlimitedReason = 'unknown';
export function getEnergyUnlimitedReason(): string {
  return _lastUnlimitedReason;
}

/**
 * зачем (владелец 2026-09-15, «потратил сердечки, вышел-зашёл — восстановились»):
 * причина безлимита вычислялась ЧЕСТНО и молча терялась — getEnergyUnlimitedReason
 * не звал НИКТО, это был мёртвый экспорт. Пять источников безлимита приводят к
 * двум эффектам сразу: трата возвращает 'unlimited' не списав ничего, а каждая
 * загрузка заливает пул до потолка (fillPermanentPool=unlimited). Снаружи это
 * выглядит ровно как «энергия восстанавливается сама». Теперь причина ГОВОРИТ.
 */
// Голая ссылка на __DEV__ падает в jest — читаем через globalThis (память
// project_dev_guard_bare_dev_global_jest).
const ENERGY_RESTORE_TRACE = Boolean(
  (globalThis as { __DEV__?: boolean }).__DEV__,
) || process.env.EXPO_PUBLIC_ENERGY_RESTORE_TRACE === '1';

function announceUnlimitedReason(where: string, unlimited: boolean): void {
  if (!ENERGY_RESTORE_TRACE) return;
  // Текст сообщения латиницей намеренно: это диагностика для metro-console, а
  // сторож непереведённого UI считает русские литералы забытым UI-текстом,
  // когда вызов логгера стоит не в той же строке (перенос ради длины).
  traceEnergyRestore(`${where}: unlimited=${unlimited} reason=${_lastUnlimitedReason}`);
}

function traceEnergyRestore(message: string): void {
  if (!ENERGY_RESTORE_TRACE) return;
  console.log(`[ENERGY-RESTORE] ${message}`);
}

async function readUnlimited(): Promise<boolean> {
  const [tester, noLimits, isPremium] = await Promise.all([
    AsyncStorage.getItem('tester_energy_disabled'),
    isTesterNoLimitsActive(),
    getVerifiedPremiumStatus(),
  ]);
  // Пульт управления может снять энергетический лимит для всех. EnergyContext —
  // основной runtime-путь траты, поэтому этот gate обязан проверяться здесь, а
  // не только во вторичном energy_system.spendEnergy().
  if (isFeatureFreeForEveryone('energy')) {
    _lastUnlimitedReason = 'remote_gate_energy_free_for_everyone';
    return true;
  }

  // зачем (владелец 2026-08-24): DEV-центр → «Снять Plus» переключает только
  // PremiumContext (dev_local_plus_override_v1), а EnergyContext спрашивал
  // getVerifiedPremiumStatus() напрямую — эта функция override не видит.
  // Итог: кнопка молчаливо не действовала на энергию — трата и вся связанная
  // с ней анимация не включались, хотя PremiumContext честно писал «неактивен».
  // Override должен побеждать здесь так же, как в PremiumContext.
  const devAccountGeneration = captureAccountGeneration();
  const devStableId = devAccountGeneration.phase === 'active' ? devAccountGeneration.stableId : null;
  const devOverride = devStableId
    ? await readDevLocalPlusOverride(devStableId).catch(noteSwallowedAs('EnergyContext:promise_1', 'inherit' as const))
    : 'inherit';
  if (devOverride === 'removed') {
    _lastUnlimitedReason = 'none:dev_override_removed';
    return false;
  }
  if (devOverride === 'granted') {
    _lastUnlimitedReason = 'dev_local_plus_override_granted';
    return true;
  }

  // Каждая оставшаяся причина называет СЕБЯ, а не общее «true»: перебор пяти
  // источников вручную и был главной потерей времени при разборе.
  if (isPremium) {
    _lastUnlimitedReason = 'premium_active';
    return true;
  }
  if (tester === 'true') {
    _lastUnlimitedReason = 'tester_energy_disabled(AsyncStorage)';
    return true;
  }
  if (noLimits) {
    _lastUnlimitedReason = 'tester_no_limits(dev build)';
    return true;
  }
  _lastUnlimitedReason = 'none:limited';
  return false;
}

async function readRecoveryIntervalMs(): Promise<number> {
  return getRecoveryIntervalMs();
}

type RecoveryOverrideSnapshot = Readonly<{ recoveryMs: number; startedAt: number; expiresAt: number }>;

export function buildEnergyRecoveryRateSegments(
  startAtMs: number,
  endAtMs: number,
  baseUnitMs: number,
  overrides: readonly (RecoveryOverrideSnapshot | null)[],
): readonly { endAtMs: number; unitMs: number }[] {
  const start = Math.min(startAtMs, endAtMs);
  const end = Math.max(startAtMs, endAtMs);
  const valid = overrides.filter((item): item is RecoveryOverrideSnapshot => Boolean(
    item && item.recoveryMs > 0 && item.expiresAt > start && item.startedAt < end,
  ));
  const boundaries = new Set<number>([start, end]);
  for (const item of valid) {
    boundaries.add(Math.max(start, item.startedAt));
    boundaries.add(Math.min(end, item.expiresAt));
  }
  const ordered = [...boundaries].sort((a, b) => a - b);
  return ordered.slice(1).map((segmentEnd, index) => {
    const segmentStart = ordered[index];
    const midpoint = segmentStart + (segmentEnd - segmentStart) / 2;
    const active = valid.filter((item) => item.startedAt <= midpoint && midpoint < item.expiresAt);
    return {
      endAtMs: segmentEnd,
      unitMs: Math.min(baseUnitMs, ...active.map((item) => item.recoveryMs)),
    };
  });
}

export function estimateEnergyFullRecoveryMs(input: Readonly<{
  nowMs: number;
  current: number;
  maxEnergy: number;
  bonusEnergy: number;
  bonusCapacity: number;
  bonusExpiresAt: number;
  recoveryCreditMicrounits: number;
  recoveryDivisionRemainder: number;
  baseUnitMs: number;
  overrides: readonly (RecoveryOverrideSnapshot | null)[];
}>): number {
  const now = Math.max(0, Math.floor(input.nowMs));
  const baseUnitMs = Math.max(1, Math.floor(input.baseUnitMs));
  const validOverrides = input.overrides.filter((override): override is RecoveryOverrideSnapshot => Boolean(
    override && override.recoveryMs > 0 && override.expiresAt > now,
  ));
  const initialBonusCapacity = input.bonusExpiresAt > now ? Math.max(0, input.bonusCapacity) : 0;
  const initialBonusEnergy = Math.min(initialBonusCapacity, Math.max(0, input.bonusEnergy));
  const boundaries = new Set<number>();
  for (const override of validOverrides) {
    if (override.startedAt > now) boundaries.add(override.startedAt);
    boundaries.add(override.expiresAt);
  }
  if (initialBonusCapacity > 0) boundaries.add(input.bonusExpiresAt);

  let cursor = now;
  let projected = {
    state: {
      schemaVersion: 2 as const,
      current: input.current,
      lastSettledAt: now,
      recoveryCreditMicrounits: input.recoveryCreditMicrounits,
      recoveryDivisionRemainder: input.recoveryDivisionRemainder,
    },
    bonusEnergy: initialBonusEnergy,
    bonusCapacity: initialBonusCapacity,
    bonusExpiresAt: initialBonusCapacity > 0 ? input.bonusExpiresAt : 0,
  };

  const estimateWithinSegment = (unitMs: number): number => timeUntilEnergyAtLeast({
    current: projected.state.current + projected.bonusEnergy,
    required: input.maxEnergy + projected.bonusCapacity,
    unitMs,
    recoveryCreditMicrounits: projected.state.recoveryCreditMicrounits,
    recoveryDivisionRemainder: projected.state.recoveryDivisionRemainder,
  });

  for (const boundary of [...boundaries].sort((a, b) => a - b)) {
    if (boundary <= cursor) continue;
    const midpoint = cursor + (boundary - cursor) / 2;
    const unitMs = Math.min(baseUnitMs, ...validOverrides
      .filter((override) => override.startedAt <= midpoint && midpoint < override.expiresAt)
      .map((override) => override.recoveryMs));
    const withinSegment = estimateWithinSegment(unitMs);
    if (withinSegment <= boundary - cursor) return cursor - now + withinSegment;
    projected = settleEnergyState(projected.state, {
      nowMs: boundary,
      unitMs,
      bonusEnergy: projected.bonusEnergy,
      bonusCapacity: projected.bonusCapacity,
      bonusExpiresAt: projected.bonusExpiresAt,
      maxEnergy: input.maxEnergy,
    });
    cursor = boundary;
  }

  return cursor - now + estimateWithinSegment(baseUnitMs);
}

/** Читает и восстанавливает состояние энергии с учётом динамического максимума */
/**
 * Читает базовую энергию и подарочный бонус ОДНОЙ операцией и доводит их
 * восстановлением до актуального момента.
 *
 * зачем: восстановление обязано знать про временный потолок подарка. Базовая
 * энергия доливается до `dynMax`, а сверх него до полуночи живут золотые слоты
 * подарка — их ёмкость хранится отдельно от остатка (`capacity` в
 * bonus_energy_store), поэтому читаем обе величины вместе и возвращаем парой.
 */
async function readAndRecoverState(
  dynMax: number,
  recoveryMs: number,
  accountToken: AccountGenerationToken,
  fillPermanentPool = false,
): Promise<{ state: StoredEnergy; bonus: BonusEnergyState | null }> {
  return withStorageLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) throw new Error('energy_account_changed_before_recovery');
    const now = Date.now();
    const [bonus, diskRaw] = await Promise.all([
      readBonusEnergyForMutation(accountToken),
      AsyncStorage.getItem(ENERGY_KEY),
    ]);
    // зачем (координатор 13.10, energy-modes-003/007): dev-подмена энергии стиралась сменой аккаунта на свежей установке →
    // пустой ключ → полный бак 5. Только dev: пустой ключ + закреп подмены → берём подмену. В релизе закреп всегда null.
    const devPinRaw = diskRaw === null ? peekDevEnergyPinRaw() : null;
    if (devPinRaw) console.warn('[DEV-STATE] энергия: energy_state пуст после подмены (смена/сброс аккаунта) → подмена возвращена', devPinRaw); // guard-ok: dev-ветка видна в журнале робота
    const raw = diskRaw ?? devPinRaw;
    let parsed: unknown = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (error) {
        console.warn('[ENERGY-LOAD] energy_state не разобран — полный бак', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
        parsed = null;
      }
    }
    const opening = raw ? coerceEnergyStateV2(parsed, now) : createFullEnergyState(now, dynMax);
    const openingPools = {
      state: opening,
      bonusEnergy: bonus?.amount ?? 0,
      bonusCapacity: bonus?.capacity ?? 0,
      bonusExpiresAt: bonus?.expiresAt ?? 0,
    };
    const segments = buildEnergyRecoveryRateSegments(
      opening.lastSettledAt,
      now,
      getRecoveryIntervalMs(),
      [],
    ).map((segment) => ({ ...segment, maxEnergy: dynMax }));
    const settled = settleEnergyAcrossRateSegments(
      openingPools,
      segments.length > 0 ? segments : [{ endAtMs: now, unitMs: recoveryMs, maxEnergy: dynMax }],
    );
    const settledState = fillPermanentPool ? {
      ...settled.state,
      current: dynMax,
      lastSettledAt: now,
      recoveryCreditMicrounits: 0,
      recoveryDivisionRemainder: 0,
    } : settled.state;
    // зачем (владелец 2026-09-15, «вышел-зашёл — сердечки восстановились»): это
    // единственное место, где значение с диска превращается в то, что увидит
    // человек. Печатаем ОБА конца цепочки и то, что их развело: прошедшее время
    // (честный долив) или fillPermanentPool (безлимит залил пул до потолка).
    const restoreTrace = `readAndRecoverState: onDisk=${raw === null ? 'EMPTY' : String(opening.current)}`
      + ` lastSettledAt=${opening.lastSettledAt} elapsedMs=${Math.max(0, now - opening.lastSettledAt)}`
      + ` unitMs=${recoveryMs} cap=${dynMax}`
      + ` -> afterRecovery=${settled.state.current}`
      + ` -> final=${settledState.current} fillPermanentPool=${fillPermanentPool}`;
    traceEnergyRestore(restoreTrace);
    const nextBonus: BonusEnergyState | null = settled.bonusCapacity > 0 ? {
      schemaVersion: 2,
      amount: settled.bonusEnergy,
      capacity: settled.bonusCapacity,
      expiresAt: settled.bonusExpiresAt,
    } : null;
    const bonusStorageKey = requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken);
    const writes: [string, string][] = [[ENERGY_KEY, JSON.stringify(settledState)]];
    if (nextBonus) writes.push([bonusStorageKey, JSON.stringify(nextBonus)]);
    await AsyncStorage.multiSet(writes);
    if (!nextBonus && bonus) await AsyncStorage.removeItem(bonusStorageKey);
    return { state: settledState, bonus: nextBonus };
  });
}

/**
 * Постоянный потолок энергии — ровно 5 (PM-081, BIBLE, D06/D07).
 *
 * зачем без чтения диска: прибавки от яруса карточки профиля и от лиги
 * отменены, поэтому `profile_card_level` больше не нужен — на каждой
 * загрузке энергии на одно обращение к хранилищу меньше. Async оставлен,
 * чтобы не трогать Promise.all в runLoad/refillToMax.
 */
async function readDynMax(): Promise<number> {
  return permanentEnergyCapacity({ base: 5 });
}

/** Язык интерфейса для текста уведомления (тот же источник, что в _layout). */
async function readNotificationLang(): Promise<Lang> {
  // зачем (§AUTH-0110): прежде всё, кроме uk/es, превращалось в ru — пуш по-русски для 6 языков интерфейса.
  try {
    const raw = await AsyncStorage.getItem('app_lang');
    return resolveNotificationLang(raw, 'energy_full');
  } catch (error: unknown) {
    console.warn(`[LANG-SWITCH] notification_lang source=energy_full read_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`); // guard-ok: ранний выход из catch пишет причину
    return resolveNotificationLang(null, 'energy_full');
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function EnergyProvider({ children }: { children: React.ReactNode }) {
  // зачем (владелец 12.10, английский интерфейс в R1): время до +1 энергии — единицами языка интерфейса, не «ч/м/с» всем.
  const { lang: uiLang } = useLang();
  const initialPeek = peekEnergy();
  const [energy, setEnergy] = useState(() => initialPeek?.energy ?? MAX_ENERGY);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusEnergyCapacity, setBonusEnergyCapacity] = useState(0);
  const [, setRefundCredit] = useState(0);
  const [bonusExpiresAt, setBonusExpiresAt] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(() => initialPeek?.maxEnergy ?? MAX_ENERGY);
  const [recoveryIntervalMs, setRecoveryIntervalMs] = useState(getRecoveryIntervalMs(0));
  const [recoveryEndsAtMs, setRecoveryEndsAtMs] = useState(0);
  const [timeUntilNextMs, setTimeUntilNextMs] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);
  // Peek уже показывает последнее известное значение, поэтому энергия не
  // "прыгнет" от MAX к реальной. energyReady остаётся честным по факту первого
  // load() (тестерские тумблеры/точные гейты продолжают ждать live-данные).
  const [energyReady, setEnergyReady] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  // зачем (координатор 22.10, Сверка «чип энергии на старте "—"», «сперва логи»): когда провайдер встал,
  // был ли у него заряд из кэша и через сколько мс energyReady стал true.
  const providerMountedAtRef = useRef(Date.now());
  useEffect(() => {
    console.warn('[ENERGY-CHIP] provider_mount', JSON.stringify({ peek: initialPeek ?? null })); // guard-ok: раз на монтирование, диагностика «—» на старте
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз на монтирование, initialPeek — снимок первого кадра
  }, []);

  // Refs for use inside callbacks without stale closures
  const energyRef = useRef(initialPeek?.energy ?? MAX_ENERGY);
  const bonusRef = useRef(0);
  // Потолок живёт отдельно от остатка: остаток тратится, потолок держит шкалу
  // расширенной до полуночи (см. bonusEnergyCapacity в типе контекста).
  const bonusCapacityRef = useRef(0);
  const bonusExpiresAtRef = useRef(0);
  const refundCreditRef = useRef(0);
  const dynMaxRef = useRef(initialPeek?.maxEnergy ?? MAX_ENERGY);
  const recoveryMsRef = useRef(getRecoveryIntervalMs(0));
  const lastRecoveryRef = useRef(Date.now());
  const recoveryCreditMicrounitsRef = useRef(0);
  const recoveryDivisionRemainderRef = useRef(0);
  const isUnlimitedRef = useRef(false);
  /**
   * Прочитан ли реальный статус (премиум / тестер / окно без лимитов) из
   * хранилища. До этого момента isUnlimitedRef держит placeholder `false`.
   *
   * зачем: аудит 2026-08-23 нашёл класс бага — экраны списывали энергию сразу
   * при монтировании, и на холодном старте (пока идёт runLoad) у ПОДПИСЧИКА
   * снималась единица, которой у него сниматься не должно вовсе. Ждать
   * energyReady на каждом из одиннадцати экранов — значит добавить задержку
   * до первого тапа везде. Дешевле и надёжнее закрыть дыру в одной точке:
   * трата просто не проходит, пока статус неизвестен.
   */
  const energyReadyRef = useRef(false);
  const energySessionBootIdRef = useRef(createEnergySessionBootId());
  const loadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const syncEnergyPushRef = useRef<(() => Promise<void>) | null>(null);
  const applySessionProjection = useCallback((projection: EnergySessionProjection) => {
    energyRef.current = projection.baseEnergy;
    bonusRef.current = projection.bonusEnergy;
    // зачем: срок подарка держится за ПОТОЛОК, а не за остаток. Иначе трата
    // последней бонусной единицы обнуляла бы срок, и расширенная шкала
    // исчезала бы раньше полуночи.
    bonusCapacityRef.current = projection.bonusCapacity;
    bonusExpiresAtRef.current = projection.bonusCapacity > 0 ? projection.bonusExpiresAt : 0;
    refundCreditRef.current = projection.refundCredit;
    lastRecoveryRef.current = projection.lastSettledAt;
    recoveryCreditMicrounitsRef.current = projection.recoveryCreditMicrounits;
    recoveryDivisionRemainderRef.current = projection.recoveryDivisionRemainder;
    setEnergy(projection.baseEnergy);
    setBonusEnergy(projection.bonusEnergy);
    setBonusEnergyCapacity(projection.bonusCapacity);
    setRefundCredit(projection.refundCredit);
    setBonusExpiresAt(bonusCapacityRef.current > 0 ? projection.bonusExpiresAt : 0);
    writePeekEnergy(projection.baseEnergy, projection.maxEnergy);

    // Восстановление идёт до ОБЩЕЙ ёмкости: пустые золотые слоты обязаны
    // доливаться, пока подарок не сгорел в полночь.
    if (projection.baseEnergy + projection.bonusEnergy
      < projection.maxEnergy + bonusCapacityRef.current) {
      const now = Date.now();
      const remaining = timeUntilEnergyAtLeast({
        current: projection.baseEnergy + projection.bonusEnergy,
        required: projection.baseEnergy + projection.bonusEnergy + 1,
        unitMs: recoveryMsRef.current,
        recoveryCreditMicrounits: projection.recoveryCreditMicrounits,
        recoveryDivisionRemainder: projection.recoveryDivisionRemainder,
      });
      const safeRemaining = remaining > 0 ? remaining : 0;
      setTimeUntilNextMs(safeRemaining);
      setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
    } else {
      setTimeUntilNextMs(0);
      setRecoveryEndsAtMs(0);
    }
  }, []);

  const currentSessionProjection = useCallback((): EnergySessionProjection => ({
    schemaVersion: 2,
    baseEnergy: energyRef.current,
    bonusEnergy: bonusRef.current,
    bonusCapacity: bonusCapacityRef.current,
    bonusExpiresAt: bonusExpiresAtRef.current,
    refundCredit: refundCreditRef.current,
    lastSettledAt: lastRecoveryRef.current,
    recoveryCreditMicrounits: recoveryCreditMicrounitsRef.current,
    recoveryDivisionRemainder: recoveryDivisionRemainderRef.current,
    maxEnergy: dynMaxRef.current,
  }), []);

  // ── Load and apply recovery ────────────────────────────────────────────────
  const runLoad = useCallback(async () => {
    const accountToken = captureAccountGeneration();
    try {
      const [unlimited, dynMax, recoveryMs] = await Promise.all([
        readUnlimited(),
        readDynMax(),
        readRecoveryIntervalMs(),
      ]);
      if (!isCurrentAccountGeneration(accountToken)) return;
      announceUnlimitedReason('runLoad', unlimited);
      await withAccountTransitionLock(async (accountTransitionLockLease) => {
        // зачем (координатор 05.10, пакет 02:26: безымянный держатель замка аккаунта 3,4 с на холодном старте;
        // runLoad — стрелка в useCallback, в стеке без имени): шаги под замком с длительностями — подтвердить или
        // снять подозрение. Печать только если весь проход под замком дольше 500 мс.
        const energyLockStartedAt = Date.now();
        const energyLockStages: Record<string, number> = {};
        let energyLockStageAt = energyLockStartedAt;
        const energyLockStage = (name: string) => {
          const now = Date.now();
          energyLockStages[name] = now - energyLockStageAt;
          energyLockStageAt = now;
        };
        const logEnergyLockIfSlow = (outcome: string) => {
          const heldMs = Date.now() - energyLockStartedAt;
          if (heldMs < 500) return;
          console.warn('[ENERGY-LOAD] lock_slow', JSON.stringify({ outcome, heldMs, stages: energyLockStages }));
        };
        if (!isCurrentAccountGeneration(accountToken)) { logEnergyLockIfSlow('generation_changed_at_entry'); return; }
        // Admin drain/fill applies before energy_state is read and under the
        // same account lock as spend/refund, so it cannot land in another user.
        await applyAdminEnergyCommand();
        energyLockStage('admin_command');
        if (!isCurrentAccountGeneration(accountToken)) { logEnergyLockIfSlow('generation_changed_after_admin'); return; }
        let loadSucceeded = false;
        try {
          const initialRecovery = await readAndRecoverState(dynMax, recoveryMs, accountToken, unlimited);
          energyLockStage('read_recover_state_1');
          const state = initialRecovery.state;
          const bonusState = initialRecovery.bonus;
          const storedRefundCredit = await readEnergySessionRefundCredit(accountToken);
          await recoverEnergySessionOperations({
            schemaVersion: 2,
            baseEnergy: state.current,
            bonusEnergy: bonusState?.amount ?? 0,
            bonusCapacity: bonusState?.capacity ?? 0,
            bonusExpiresAt: bonusState?.expiresAt ?? 0,
            refundCredit: storedRefundCredit,
            lastSettledAt: state.lastSettledAt,
            recoveryCreditMicrounits: state.recoveryCreditMicrounits,
            recoveryDivisionRemainder: state.recoveryDivisionRemainder,
            maxEnergy: dynMax,
          }, energySessionBootIdRef.current, {
            accountToken,
            accountTransitionLockLease,
          });
          energyLockStage('refund_credit_and_session_operations');
          if (!isCurrentAccountGeneration(accountToken)) { logEnergyLockIfSlow('generation_changed_after_operations'); return; }
          // A recovered prepared debit republishes its exact crash-time
          // projection. Re-run ordinary elapsed-time recovery afterwards so
          // completed refill intervals during the stopped process are kept.
          const settledRecovery = await readAndRecoverState(dynMax, recoveryMs, accountToken, unlimited);
          energyLockStage('read_recover_state_2');
          const settledState = settledRecovery.state;
          const settledBonus = settledRecovery.bonus;
          const settledRefundCredit = await readEnergySessionRefundCredit(accountToken);
          const recovered: EnergySessionProjection = {
            schemaVersion: 2,
            baseEnergy: settledState.current,
            bonusEnergy: settledBonus?.amount ?? 0,
            bonusCapacity: settledBonus?.capacity ?? 0,
            bonusExpiresAt: settledBonus?.expiresAt ?? 0,
            refundCredit: settledRefundCredit,
            lastSettledAt: settledState.lastSettledAt,
            recoveryCreditMicrounits: settledState.recoveryCreditMicrounits,
            recoveryDivisionRemainder: settledState.recoveryDivisionRemainder,
            maxEnergy: dynMax,
          };

          dynMaxRef.current = dynMax;
          recoveryMsRef.current = recoveryMs;
          // Потолок применяем ДО проекции: она считает по нему таймер долива
          // золотых слотов и срок сгорания подарка.
          bonusCapacityRef.current = settledBonus?.capacity ?? 0;
          setBonusEnergyCapacity(settledBonus?.capacity ?? 0);
          setMaxEnergy(dynMax);
          setRecoveryIntervalMs(recoveryMs);
          applySessionProjection(recovered);

          const wasUnlimited = isUnlimitedRef.current;
          isUnlimitedRef.current = unlimited;
          setIsUnlimited(unlimited);

          // Premium removed — clear any pending restore animation timers.
          if (wasUnlimited && !unlimited) {
            setRestoringPremium(false);
          }

          if (unlimited) {
            setTimeUntilNextMs(0);
            setRecoveryEndsAtMs(0);
            // Plus is represented by ∞. Numeric transitions are owned by the
            // shared indicator, never by dozens of JS timers in the provider.
            setRestoringPremium(false);
          }
          loadSucceeded = true;
        } catch (e) {
      DebugLogger.error('EnergyContext:timer', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
          if (isCurrentAccountGeneration(accountToken)) {
            // Public readiness means the initial load attempt has finished, so
            // gated screens do not wait forever on a broken storage read.
            // Mutations still require the private ready ref and fail closed.
            setEnergyReady(true);
            console.warn('[ENERGY-CHIP] provider_ready', JSON.stringify({ // guard-ok: раз на чтение хранилища, диагностика «—» на старте
              loadSucceeded, energy: energyRef.current, unlimited: isUnlimitedRef.current,
              msSinceMount: Date.now() - providerMountedAtRef.current,
            }));
            if (loadSucceeded) {
              energyReadyRef.current = true;
              // B2: обновляем peek-кеш последним известным значением после каждого
              // успешного load — следующий маунт провайдера (навигация назад/вперёд,
              // Fast Refresh) стартует с этого значения вместо MAX_ENERGY.
              writePeekEnergy(energyRef.current, dynMaxRef.current);
              // Синхронизируем energy-full пуш с актуальным состоянием:
              // полная/безлимит → отмена, неполная → (пере)планирование на точный момент.
              void syncEnergyPushRef.current?.();
            }
          }
          energyLockStage('publish');
          logEnergyLockIfSlow(loadSucceeded ? 'ok' : 'load_failed');
        }
      });
    } catch (e) {
      DebugLogger.error('EnergyContext:timer', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
      // Fail-open only for rendering readiness: callers may leave a loading
      // gate, but mutation readiness remains false and confirm fails closed.
      if (isCurrentAccountGeneration(accountToken)) setEnergyReady(true);
    }
  }, [applySessionProjection]);
  const load = useCallback(async () => {
    loadRunnerRef.current ??= createCoalescedAsyncRunner(runLoad);
    await loadRunnerRef.current();
  }, [runLoad]);

  // EnergyProvider lives above account screens and is not guaranteed to remount
  // on logout/login. Reset volatile account-owned state, then reload only after
  // the new generation becomes active; runLoad's lock waits for restore/wipe.
  useEffect(() => {
    const subscription = subscribeAccountGeneration((accountToken) => {
      setRestoringPremium(false);
      isUnlimitedRef.current = false;
      setIsUnlimited(false);
      bonusRef.current = 0;
      bonusCapacityRef.current = 0;
      bonusExpiresAtRef.current = 0;
      energyRef.current = MAX_ENERGY;
      dynMaxRef.current = MAX_ENERGY;
      setEnergy(MAX_ENERGY);
      setMaxEnergy(MAX_ENERGY);
      setBonusEnergy(0);
      setBonusEnergyCapacity(0);
      setBonusExpiresAt(0);
      refundCreditRef.current = 0;
      setRefundCredit(0);
      energyReadyRef.current = false;
      setEnergyReady(false);
      console.warn('[ENERGY-CHIP] provider_reset_account', JSON.stringify({ // guard-ok: раз на смену аккаунта
        phase: accountToken.phase, msSinceMount: Date.now() - providerMountedAtRef.current,
      }));
      loadRunnerRef.current = null;
      if (accountToken.phase === 'active') void load();
    });
    return () => subscription.remove();
  }, [load]);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Foreground/events reload. Recovery polling lives in a separate gated effect below.
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let resumeTask: { cancel?: () => void } | null = null;

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setAppActive(true);
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTask?.cancel?.();
        resumeTimer = setTimeout(() => {
          resumeTimer = null;
          resumeTask = InteractionManager.runAfterInteractions(() => {
            load();
          });
        }, 300);
      } else {
        setAppActive(false);
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        resumeTask?.cancel?.();
      }
    });

    // Перезагружаем энергию по событию при смене Premium.
    const levelSub = DeviceEventEmitter.addListener('energy_reload', () => { load(); });
    const premiumOnSub = DeviceEventEmitter.addListener('premium_activated', () => { load(); });
    const premiumOffSub = DeviceEventEmitter.addListener('premium_deactivated', () => { load(); });
    const vipOnSub = DeviceEventEmitter.addListener('vip_activated', () => { load(); });
    const vipOffSub = DeviceEventEmitter.addListener('vip_deactivated', () => { load(); });
    const accessSub = DeviceEventEmitter.addListener('premium_access_changed', () => { load(); });
    const remoteConfigSub = DeviceEventEmitter.addListener('remote_config_changed', () => { load(); });

    return () => {
      sub.remove();
      levelSub.remove();
      premiumOnSub.remove();
      premiumOffSub.remove();
      vipOnSub.remove();
      vipOffSub.remove();
      accessSub.remove();
      remoteConfigSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTask?.cancel?.();
    };
  }, [load]);

  // Check recovery near the next real refill instead of polling while the app is idle.
  // зачем: пока жив подарок, «полной» считается расширенная шкала — иначе долив
  // золотых слотов останавливался бы на базовом максимуме.
  const activeEnergy = energy + bonusEnergy;
  const activeMaxEnergy = maxEnergy + bonusEnergyCapacity;
  useEffect(() => {
    if (!appActive || isUnlimited || !(activeEnergy < activeMaxEnergy)) return;
    const remaining = timeUntilNextMs > 0 ? timeUntilNextMs : recoveryIntervalMs;
    const delay = Math.max(1000, remaining + 250);
    const timeoutId = setTimeout(load, delay);
    return () => clearTimeout(timeoutId);
  }, [appActive, activeEnergy, activeMaxEnergy, isUnlimited, load, recoveryIntervalMs, timeUntilNextMs]);

  // Бонус обязан исчезнуть ровно по своему expiresAt даже если приложение
  // остаётся открытым всю ночь. В фоне таймер не держим: foreground-load выше
  // сразу перечитает account-scoped состояние.
  useEffect(() => {
    if (!appActive || bonusExpiresAt <= 0) return;
    if (bonusExpiresAt <= Date.now()) {
      void load();
      return;
    }
    const delay = Math.max(1, bonusExpiresAt - Date.now() + 25);
    const timeoutId = setTimeout(load, delay);
    return () => clearTimeout(timeoutId);
  }, [appActive, bonusExpiresAt, load]);

  const sourceForActivity = useCallback((activity: EnergyActivityKey) => {
    if (activity === 'arena_match') return 'arena' as const;
    if (activity === 'flashcards' || activity === 'lesson_words'
      || activity === 'irregular_verbs' || activity === 'preposition_drill'
      || activity === 'mistake_practice') return 'training' as const;
    return 'lesson' as const;
  }, []);

  // One authoritative activity-first entry point. Visual state changes only
  // after the durable composite ledger operation has succeeded.
  const confirmActivityStart = useCallback(async (
    activity: EnergyActivityKey,
    intent: EnergySessionIntent,
    options?: Readonly<{ mistakeCharge?: boolean }>,
  ): Promise<EnergyStartResult> => {
    const traceKey = intent.grant?.subjectId ? `spend:${intent.grant.subjectId}` : 'spend';
    // зачем (координатор 12.10, energy-modes-017: «урок открылся при ⚡0, окна нет» — сначала логи): каждое решение старта
    // одной строкой — режим, Plus и причина, из чего сложилась энергия (основная + бонусная + кредит возвратов журнала;
    // dev-ссылка energy=0 обнуляет только основную), решение и причина. Логи выходов остаются навсегда.
    const gateSnapshot = () => ({
      activity,
      op: intent.operationId,
      subject: intent.grant?.subjectId ?? null,
      mode: peekEnergyMode(),
      plusOrUnlimited: isUnlimitedRef.current,
      unlimitedReason: _lastUnlimitedReason,
      base: energyRef.current,
      bonus: bonusRef.current,
      refundCredit: refundCreditRef.current,
      available: energyRef.current + bonusRef.current + refundCreditRef.current,
      energyReady: energyReadyRef.current,
    });
    const gateDecision = (decision: string, reason: string, extra?: Record<string, unknown>): void => {
      console.log('[ENERGY-GATE] start decision', JSON.stringify({ decision, reason, ...gateSnapshot(), ...extra })); // guard-ok: каждый выход старта называет причину
      // зачем (координатор 13.10, RELEASE_LOGGING_R1): console.log вырезается в релизе — отказ старта пишем кодом причины в журнал обращения.
      if (decision === 'insufficient' || decision === 'cancelled') releaseReason('energy', reason, decision === 'insufficient' ? 'blocked' : 'error');
    };
    console.log('[ENERGY-GATE] start enter', JSON.stringify({ ...gateSnapshot(), mistakeCharge: options?.mistakeCharge === true })); // guard-ok: вход старта
    try {
      const cost = activityEnergyCost(activity);
      if (cost === 0) {
        gateDecision('unlimited', 'activity_cost_zero', { cost });
        return 'unlimited';
      }
      if (!energyReadyRef.current) {
        markEnergySpendStage(traceKey, 'waiting for load (cold context: energyReady=false)');
        await load();
      }
      if (!energyReadyRef.current) {
        /**
         * зачем (аудит 2026-09-13, требование владельца «исправить проблему
         * целиком»): это самый широкий немой выход в приложении — он гасит вход
         * в урок, карточки, экзамен, диагностику, арену, личный план и диалоги
         * (~15 точек), потому что чтение энергии не удалось. Экраны трактуют
         * 'cancelled' как «человек передумал» и молча уводят назад, не показав
         * ничего. Отказ остаётся fail-closed (тратить энергию вслепую нельзя),
         * но теперь он ОБЯЗАН называть причину: без этой строки выяснить,
         * почему активность не открылась, было физически невозможно.
         */
        console.warn(`[ENERGY-START] отказ: энергия не прочиталась (activity=${activity}, стоимость=${activityEnergyCost(activity)}) — экран покажет «отменено»`);
        markEnergySpendStage(traceKey, 'refused: energy storage unreadable after load()');
        gateDecision('cancelled', 'energy_storage_unreadable_after_load', { cost });
        return 'cancelled';
      }
      if (isUnlimitedRef.current) {
        // зачем: самый частый «энергия не тратится» — вот этот выход. Молчал.
        const skipTrace = `spend SKIPPED (activity=${activity}, cost=${cost}):`
          + ` unlimited, reason=${_lastUnlimitedReason}`;
        traceEnergyRestore(skipTrace);
        gateDecision('unlimited', `plus_or_unlimited:${_lastUnlimitedReason}`, { cost });
        return 'unlimited';
      }
      // зачем (владелец 11.10, режим энергии Б): старт занятия с сердечками бесплатный, энергия снимается за ошибку
      // (spendMistakeEnergy). Но без энергии и без Plus начать нельзя — шторка «Нужна энергия».
      // зачем (координатор 11.10): в режиме Б отработка ошибок бесплатна целиком — без списания и без требования энергии.
      if (!options?.mistakeCharge && isFreeInMistakeMode(activity)) {
        traceEnergyRestore(`spend SKIPPED (activity=${activity}): mode=mistake_charge, free activity`);
        gateDecision('unlimited', 'mode_b_free_activity', { cost });
        return 'unlimited';
      }
      if (!options?.mistakeCharge && chargesEnergyOnMistake(activity)) {
        const available = bonusRef.current + refundCreditRef.current + energyRef.current;
        if (available < 1) {
          console.warn(`[ENERGY-MODE] старт отклонён: режим Б, энергии нет (activity=${activity}, available=${available})`); // guard-ok: ранний выход логируется
          gateDecision('insufficient', 'mode_b_no_energy_for_start', { cost });
          return 'insufficient';
        }
        traceEnergyRestore(`spend SKIPPED (activity=${activity}): mode=mistake_charge, free start, available=${available}`);
        gateDecision('unlimited', 'mode_b_free_start_energy_present', { cost });
        return 'unlimited';
      }
      if (bonusRef.current + refundCreditRef.current + energyRef.current < cost) {
        gateDecision('insufficient', 'mode_a_available_below_cost', { cost });
        return 'insufficient';
      }

      const accountToken = captureAccountGeneration();
      return await withAccountTransitionLock(async (accountTransitionLockLease) => {
        if (!isCurrentAccountGeneration(accountToken)) {
          gateDecision('cancelled', 'account_changed_before_commit', { cost });
          return 'cancelled';
        }
        const before = energyRef.current + bonusRef.current + refundCreditRef.current;
        const result = await commitEnergySessionStart(
          intent,
          cost,
          currentSessionProjection(),
          energySessionBootIdRef.current,
          { accountToken, accountTransitionLockLease },
        );
        markEnergySpendStage(traceKey, `ledger commit (activity=${activity}, cost=${cost}, status=${result.status})`);
        if (result.status === 'insufficient') {
          gateDecision('insufficient', 'ledger_commit_insufficient', { cost, before });
          return 'insufficient';
        }
        if (result.status === 'failed') {
          gateDecision('cancelled', `ledger_commit_failed:${result.reason}`, { cost, before });
          throw new Error(`energy_session_start_failed:${result.reason}`);
        }
        // Финал траты: что ушло на диск. Если после перезахода число другое —
        // виновато восстановление, а не списание (логи readAndRecoverState).
        const spendTrace = `spend COMMITTED (activity=${activity}, cost=${cost}, status=${result.status}):`
          + ` before=${before} after=${result.projection.baseEnergy}`
          + ` lastSettledAt=${result.projection.lastSettledAt}`
          + ` recoveryCredit=${result.projection.recoveryCreditMicrounits}`;
        traceEnergyRestore(spendTrace);
        applySessionProjection(result.projection);
        if (result.status === 'applied') {
          const after = result.projection.baseEnergy
            + result.projection.bonusEnergy
            + result.projection.refundCredit;
          energyVisualTransactions.publish({
            operationId: intent.operationId,
            from: before,
            to: after,
            reason: 'spend',
            source: sourceForActivity(activity),
          });
          soundDirector.request('pm.energy.spend', { scope: 'energy-spend' });
        }
        void syncEnergyPushRef.current?.();
        gateDecision('spent', `ledger_${result.status}`, {
          cost,
          before,
          after: result.projection.baseEnergy + result.projection.bonusEnergy + result.projection.refundCredit,
        });
        return 'spent';
      });
    } catch (error) {
      console.warn('[ENERGY-GATE] start decision', JSON.stringify({ decision: 'cancelled', reason: 'exception', message: error instanceof Error ? error.message : String(error), activity, op: intent.operationId })); // guard-ok: catch называет причину
      DebugLogger.error(
        'EnergyContext:confirmActivityStart',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
      return 'cancelled';
    }
  }, [applySessionProjection, currentSessionProjection, load, sourceForActivity]);

  const spendMistakeEnergy = useCallback(async (
    activity: EnergyActivityKey,
    intent: EnergySessionIntent,
  ): Promise<EnergyStartResult> => {
    // зачем: тот же журнал энергии, что и старт (идемпотентно по operationId), — двойной тап не снимет дважды.
    const result = await confirmActivityStart(activity, intent, { mistakeCharge: true });
    console.log('[ENERGY-MODE] mistake spend', JSON.stringify({ activity, operationId: intent.operationId, result, mode: peekEnergyMode() }));
    return result;
  }, [confirmActivityStart]);

  const spendOne = useCallback(async (intent: EnergySessionIntent): Promise<boolean> => {
    const result = await confirmActivityStart(energyActivityForSessionKind(intent.grant.kind), intent);
    return result === 'spent' || result === 'unlimited';
  }, [confirmActivityStart]);

  const spendAmount = useCallback(async (_n: number, intent: EnergySessionIntent): Promise<boolean> => {
    const result = await confirmActivityStart(energyActivityForSessionKind(intent.grant.kind), intent);
    return result === 'spent' || result === 'unlimited';
  }, [confirmActivityStart]);

  const confirmSpendAmount = useCallback(async (_n: number, intent: EnergySessionIntent): Promise<EnergyStartResult> => (
    confirmActivityStart(energyActivityForSessionKind(intent.grant.kind), intent)
  ), [confirmActivityStart]);

  const confirmSpendOne = useCallback((intent: EnergySessionIntent): Promise<EnergyStartResult> => {
    // зачем (координатор 12.10, R1 dialogs-gap-017): dev `dev_energy_fail=1` — отказ старта диалога ДО списания (тост «Не получилось начать диалог»); в стор-сборке false.
    if (intent.grant.kind === 'ai_dialog' && isDevDialogEnergyFail()) {
      console.log('[DEV-STATE] energy: confirmSpendOne(ai_dialog) → cancelled (dev_energy_fail)'); // guard-ok: dev-ветка
      return Promise.resolve('cancelled');
    }
    return confirmActivityStart(energyActivityForSessionKind(intent.grant.kind), intent);
  }, [confirmActivityStart]);

  // зачем (аудит R48, координатор 15.10): «Мои ошибки» при 0 энергии сначала тратили суточную Free-попытку, а потом старт
  // отказывал и экран молча закрывался. Экраны входа спрашивают прогноз ДО траты попытки. Правила — зеркало confirmActivityStart
  // (режимы А/Б, бонус, кредит возвратов), только чтение рефов, без списания и без сети.
  const predictStartRefusal = useCallback((activity: EnergyActivityKey): 'ok' | 'insufficient' | 'unknown' => {
    const cost = activityEnergyCost(activity);
    const available = bonusRef.current + refundCreditRef.current + energyRef.current;
    const verdict: 'ok' | 'insufficient' | 'unknown' = cost === 0 ? 'ok'
      : !energyReadyRef.current ? 'unknown'
        : isUnlimitedRef.current ? 'ok'
          : isFreeInMistakeMode(activity) ? 'ok'
            : chargesEnergyOnMistake(activity) ? (available < 1 ? 'insufficient' : 'ok')
              : available < cost ? 'insufficient' : 'ok';
    console.log('[ENERGY-GATE] predict', JSON.stringify({ activity, cost, available, ready: energyReadyRef.current, unlimited: isUnlimitedRef.current, mode: peekEnergyMode(), verdict })); // guard-ok: одна строка на тап входа
    return verdict;
  }, []);

  const refundActivityStart = useCallback(async (operationId: string, reason: string): Promise<void> => {
    if (!energyReadyRef.current) await load();
    if (!energyReadyRef.current) throw new Error('energy_state_unavailable');
    const accountToken = captureAccountGeneration();
    await withAccountTransitionLock(async (accountTransitionLockLease) => {
      if (!isCurrentAccountGeneration(accountToken)) {
        console.warn('[ENERGY-REFUND] skipped: account changed before refund', JSON.stringify({ operationId, reason })); // guard-ok: редкое событие возврата, ранний выход пишет причину навсегда
        return;
      }
      const before = energyRef.current + bonusRef.current + refundCreditRef.current;
      let result = await refundEnergySessionStart(
        operationId, reason, currentSessionProjection(), energySessionBootIdRef.current,
        { accountToken, accountTransitionLockLease },
      );
      // One bounded retry covers a transient AsyncStorage write failure. The
      // operation id is stable, so a partial first write cannot refund twice.
      if (result.status === 'failed') {
        result = await refundEnergySessionStart(
          operationId, reason, currentSessionProjection(), energySessionBootIdRef.current,
          { accountToken, accountTransitionLockLease },
        );
      }
      // зачем (E10, координатор 12.10): каждый возврат виден одной строкой — причина, статус журнала и энергия до/после.
      const after = result.status === 'failed'
        ? null
        : result.projection.baseEnergy + result.projection.bonusEnergy + result.projection.refundCredit;
      // guard-ok: возврат энергии — редкое событие, строка журнала остаётся навсегда
      console.log('[ENERGY-REFUND] ledger', JSON.stringify({
        operationId, reason, status: result.status, failReason: result.status === 'failed' ? result.reason : null, before, after,
      }));
      if (result.status === 'failed') throw new Error(`energy_session_refund_failed:${result.reason}`);
      if (result.status === 'applied' || result.status === 'already-applied') {
        applySessionProjection(result.projection);
        if (result.status === 'applied') {
          energyVisualTransactions.publish({
            operationId: `${operationId}:refund`,
            from: before,
            to: result.projection.baseEnergy + result.projection.bonusEnergy + result.projection.refundCredit,
            reason: 'refund',
            source: 'system',
          });
        }
        void syncEnergyPushRef.current?.();
      }
    });
  }, [applySessionProjection, currentSessionProjection, load]);

  const refundOne = refundActivityStart;
  // зачем (PM-210): разовая локальная чистка журнала оборванных входов в тренировки
  // карточек после первого кадра; возврат энергии — тем же адаптером, что у экранов.
  useFlashcardTrainingGrantBootMaintenance(energyReady, refundActivityStart);

  const acknowledgeSessionStart = useCallback(async (operationId: string): Promise<boolean> => {
    return acknowledgeEnergySessionStartInLedger(operationId, captureAccountGeneration());
  }, []);

  // ── Sync energy-full push с текущим состоянием ──────────────────────────────
  // Безлимит/полная энергия → отменяем пуш. Иначе планируем на момент полного
  // восстановления. Best-effort: не должен ломать трату энергии при ошибке.
  const syncEnergyFullNotification = useCallback(async () => {
    try {
      if (isUnlimitedRef.current) {
        await cancelEnergyFullNotificationLazy();
        return;
      }
      // «Полная» считается по активной ёмкости: пока жив подарок, шкала
      // заполнена только когда залиты и золотые слоты.
      const current = bonusRef.current + energyRef.current;
      const dynMax = bonusCapacityRef.current + dynMaxRef.current;
      if (current >= dynMax) {
        await cancelEnergyFullNotificationLazy();
        return;
      }
      const now = Date.now();
      const fullMs = estimateEnergyFullRecoveryMs({
        nowMs: now,
        current: energyRef.current,
        maxEnergy: dynMaxRef.current,
        bonusEnergy: bonusRef.current,
        bonusCapacity: bonusCapacityRef.current,
        bonusExpiresAt: bonusExpiresAtRef.current,
        recoveryCreditMicrounits: recoveryCreditMicrounitsRef.current,
        recoveryDivisionRemainder: recoveryDivisionRemainderRef.current,
        baseUnitMs: getRecoveryIntervalMs(),
        overrides: [],
      });
      const secondsUntilFull = Math.ceil(fullMs / 1000);
      const lang = await readNotificationLang();
      await scheduleEnergyFullNotificationLazy(secondsUntilFull, lang);
    } catch (e) {
      // best-effort: пуш не критичен
      DebugLogger.error('EnergyContext:lang', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }, []);
  syncEnergyPushRef.current = syncEnergyFullNotification;

  // ── Force reload (call after tester toggle in settings) ────────────────────
  const reload = useCallback(async () => { await load(); }, [load]);

  // Confirmed Premium must feel immediate: update refs/UI/peek first, then persist
  // the same full state locally. No Firebase work and no animation timer is added.
  const refillToMax = useCallback(async (
    isCurrent: () => boolean = () => true,
    lease?: AccountTransitionLockLease,
  ): Promise<boolean> => {
    if (!isCurrent()) return false;
    const accountToken = captureAccountGeneration();
    // зачем (координатор 12.10, 🔴 взаимная блокировка после оплаты): запись вынесена в energy_premium_refill и получает lease
    // держателя замка — покупка RevenueCat зовёт refill ИЗНУТРИ замка аккаунта; без lease это вечное ожидание.
    const committed = await persistPremiumEnergyRefill({ isCurrent, accountToken, readDynMax, lease });
    if (!committed || !isCurrent() || !isCurrentAccountGeneration(accountToken)) return false;
    const { freshDynMax, refilledBonus, state } = committed;
    dynMaxRef.current = freshDynMax;
    setRestoringPremium(false);
    const fullEnergy = freshDynMax;
    energyRef.current = fullEnergy;
    lastRecoveryRef.current = state.lastSettledAt;
    recoveryCreditMicrounitsRef.current = 0;
    recoveryDivisionRemainderRef.current = 0;
    isUnlimitedRef.current = true;
    setEnergy(fullEnergy);
    setMaxEnergy(fullEnergy);
    setIsUnlimited(true);
    bonusRef.current = refilledBonus;
    setBonusEnergy(refilledBonus);
    setTimeUntilNextMs(0);
    setRecoveryEndsAtMs(0);
    energyReadyRef.current = true;
    setEnergyReady(true);
    writePeekEnergy(fullEnergy, fullEnergy);

    await cancelEnergyFullNotificationLazy().catch(noteSwallowedHandler('EnergyContext:promise_2'));
    return isCurrent();
  }, []);

  const formattedTime = activeEnergy < activeMaxEnergy && !isUnlimited ? formatTimeUntilRecovery(timeUntilNextMs, uiLang) : '';
  const canStartInMistakeMode = isUnlimited || energy + bonusEnergy >= 1;

  const value = useMemo<EnergyContextValue>(() => ({
    energy, bonusEnergy, bonusEnergyCapacity, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    confirmActivityStart, spendMistakeEnergy, canStartInMistakeMode, refundActivityStart,
    spendOne, confirmSpendOne, predictStartRefusal, spendAmount, confirmSpendAmount,
    refundOne, acknowledgeSessionStart, reload, refillToMax, energyReady,
  }), [
    energy, bonusEnergy, bonusEnergyCapacity, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    confirmActivityStart, spendMistakeEnergy, canStartInMistakeMode, refundActivityStart,
    spendOne, confirmSpendOne, predictStartRefusal, spendAmount, confirmSpendAmount,
    refundOne, acknowledgeSessionStart, reload, refillToMax, energyReady,
  ]);

  return (
    <EnergyContext.Provider value={value}>
      {children}
    </EnergyContext.Provider>
  );
}
