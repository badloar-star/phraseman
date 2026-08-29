import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../app/personal_progress_store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, InteractionManager } from 'react-native';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { BONUS_ENERGY_KEY, readBonusEnergy, readBonusEnergyForMutation, type BonusEnergyState } from '../app/bonus_energy_store';
import { requireGiftAccountStorageKey } from '../app/gift_account_storage';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from '../app/premium_guard';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../app/account_generation';
import { readDevLocalPlusOverride } from '../app/dev_plus_controls';
import { applyAdminEnergyCommand, formatTimeUntilRecovery, getRecoveryIntervalMs, secondsUntilEnergyFull } from '../app/energy_system';
import { readLeagueChestEnergyOverrideMs } from '../app/services/league_chest_rewards';
import { isEnergyFreeWindowActive, readBoonEnergyOverrideMs } from '../app/boons/boon_effects_energy';
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
import { scheduleEnergyFullNotification, cancelEnergyFullNotification } from '../app/notifications';
import type { Lang } from '../constants/i18n';
import { energyCountdownClock } from './energy_countdown_clock';
import { getMaxEnergy as getConfiguredBaseEnergy } from '../app/remote_flags';
import { isFeatureFreeForEveryone } from '../app/feature_gates';
import { emitAppEvent } from '../app/events';
import type { EnergyStartResult } from './energy_start_confirmation';
import { peekEnergy, writePeekEnergy } from '../app/energy_peek_cache';
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

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5; // базовый минимум (уровень 1-9)
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

interface StoredEnergy {
  current: number;
  lastRecoveryTime: number;
}

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-maxEnergy (base only, without bonus)
  bonusEnergy: number;       // 0-N extra energy from gifts (expires next day)
  /**
   * Временный ПОТОЛОК от подарка, живущий до полуночи независимо от остатка.
   *
   * зачем: подарок «+3» — это не три единицы, а расширенная шкала на день.
   * Потратив бонус, игрок обязан сохранить восемь делений вместо пяти, и
   * восстановление должно доливать энергию в золотые слоты. Если хранить
   * только остаток, шкала схлопывалась бы сразу после первой траты.
   */
  bonusEnergyCapacity: number;
  bonusExpiresAt: number;    // epoch ms when bonus expires (0 if no bonus)
  maxEnergy: number;         // динамически: 5-6 в зависимости от уровня
  recoveryIntervalMs: number;// current +1 energy recovery interval
  recoveryEndsAtMs: number;
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // e.g. "29м 12с" or "1ч 5м 3с" — ready to display
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  spendOne: (intent: EnergySessionIntent) => Promise<boolean>;  // returns false if no energy
  /** Ask before a paid start and return a distinct cancel/no-energy outcome. */
  confirmSpendOne: (intent: EnergySessionIntent) => Promise<EnergyStartResult>;
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
  refillToMax: (isCurrent?: () => boolean) => Promise<boolean>; // immediate account-safe Premium refill
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
  spendOne: async () => true,
  confirmSpendOne: async () => 'spent',
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
  const { energy, maxEnergy, isUnlimited, recoveryIntervalMs, recoveryEndsAtMs } = useEnergy();
  const [now, setNow] = useState(() => Date.now());
  const visible = options.visible ?? true;

  useEffect(() => {
    const shouldTick =
      visible
      && !isUnlimited
      && energy < maxEnergy
      && recoveryEndsAtMs > 0
      && recoveryIntervalMs > 0;

    setNow(Date.now());
    if (!shouldTick) return undefined;

    return energyCountdownClock.subscribe(setNow);
  }, [energy, isUnlimited, maxEnergy, recoveryEndsAtMs, recoveryIntervalMs, visible]);

  if (isUnlimited || energy >= maxEnergy || recoveryEndsAtMs <= 0 || recoveryIntervalMs <= 0) {
    return { timeUntilNextMs: 0, formattedTime: '' };
  }

  const startedAt = recoveryEndsAtMs - recoveryIntervalMs;
  const elapsed = Math.max(0, now - startedAt);
  const step = elapsed % recoveryIntervalMs;
  const remaining = step === 0 && elapsed > 0 ? recoveryIntervalMs : recoveryIntervalMs - step;
  const timeUntilNextMs = Math.max(0, Math.min(recoveryIntervalMs, remaining));

  return {
    timeUntilNextMs,
    formattedTime: formatTimeUntilRecovery(timeUntilNextMs),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function readUnlimited(): Promise<boolean> {
  const [tester, noLimits, isPremium] = await Promise.all([
    AsyncStorage.getItem('tester_energy_disabled'),
    isTesterNoLimitsActive(),
    getVerifiedPremiumStatus(),
  ]);
  // Пульт управления может снять энергетический лимит для всех. EnergyContext —
  // основной runtime-путь траты, поэтому этот gate обязан проверяться здесь, а
  // не только во вторичном energy_system.spendEnergy().
  if (isFeatureFreeForEveryone('energy')) return true;

  // Weekly Boon «окно без энергии»: в активный вечерний час энергия не тратится у всех.
  // EnergyContext.spendOne — основной путь траты (не energy_system.spendEnergy),
  // поэтому окно ОБЯЗАНО проверяться здесь, иначе бонус не работает.
  if (isEnergyFreeWindowActive()) return true;

  // зачем (владелец 2026-08-24): DEV-центр → «Снять Plus» переключает только
  // PremiumContext (dev_local_plus_override_v1), а EnergyContext спрашивал
  // getVerifiedPremiumStatus() напрямую — эта функция override не видит.
  // Итог: кнопка молчаливо не действовала на энергию — трата и вся связанная
  // с ней анимация не включались, хотя PremiumContext честно писал «неактивен».
  // Override должен побеждать здесь так же, как в PremiumContext.
  const devAccountGeneration = captureAccountGeneration();
  const devStableId = devAccountGeneration.phase === 'active' ? devAccountGeneration.stableId : null;
  const devOverride = devStableId
    ? await readDevLocalPlusOverride(devStableId).catch(() => 'inherit' as const)
    : 'inherit';
  if (devOverride === 'removed') return false;
  if (devOverride === 'granted') return true;

  return isPremium || tester === 'true' || noLimits;
}

async function readRecoveryIntervalMs(): Promise<number> {
  try {
    // Override-ы интервала: league-chest и weekly-boon (turbo_regen). Берём наименьший
    // (быстрейшее восстановление). EnergyContext — основной читатель интервала, поэтому
    // boon-override ОБЯЗАН учитываться здесь (energy_system.ts даёт его только spendEnergy).
    const [leagueChestMs, boonMs] = await Promise.all([
      readLeagueChestEnergyOverrideMs(),
      readBoonEnergyOverrideMs(),
    ]);
    const overrides = [leagueChestMs, boonMs].filter(
      (v): v is number => typeof v === 'number' && v > 0,
    );
    if (overrides.length > 0) return Math.min(...overrides);
    return getRecoveryIntervalMs();
  } catch {
    return getRecoveryIntervalMs();
  }
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
): Promise<{ state: StoredEnergy; bonus: BonusEnergyState | null }> {
  const bonus = await readBonusEnergy(accountToken);
  const state = await readAndRecoverBaseState(dynMax, recoveryMs);
  return { state, bonus };
}

async function readAndRecoverBaseState(dynMax: number, recoveryMs: number): Promise<StoredEnergy> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  let state: StoredEnergy = { current: dynMax, lastRecoveryTime: Date.now() };

  if (raw) {
    // зачем: битый JSON в AsyncStorage (обрыв записи, миграция, ручная правка) раньше
    // бросал исключение и обрывал ВЕСЬ runLoad — энергия оставалась не загруженной до
    // переустановки. Падаем на дефолт и самолечимся, а не роняем загрузку.
    try {
      state = JSON.parse(raw) as StoredEnergy;
    } catch {
      state = { current: dynMax, lastRecoveryTime: Date.now() };
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)).catch(() => {});
      return state;
    }
    if (state === null || typeof state !== 'object') {
      state = { current: dynMax, lastRecoveryTime: Date.now() };
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)).catch(() => {});
      return state;
    }
    // Guard against corrupt/stale storage (NaN, negative, above cap)
    if (!Number.isFinite(state.current) || state.current < 0) state.current = dynMax;
    else if (state.current > dynMax) state.current = dynMax;
    if (!Number.isFinite(state.lastRecoveryTime) || state.lastRecoveryTime <= 0) state.lastRecoveryTime = Date.now();
  } else {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    return state;
  }

  if (state.current < dynMax) {
    const now = Date.now();
    const elapsed = now - state.lastRecoveryTime;
    const recovered = Math.floor(elapsed / recoveryMs);
    if (recovered > 0) {
      state.current = Math.min(state.current + recovered, dynMax);
      // Advance lastRecoveryTime by completed full intervals (keeps remainder accurate)
      state.lastRecoveryTime = state.lastRecoveryTime + recovered * recoveryMs;
      // Под общим замком: восстановление идёт при каждой загрузке и легко
      // пересекается с подарком энергии или покупкой за жемчужины.
      await withStorageLock(async () => {
        await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
      });
    }
  }

  return state;
}

/** Читает текущий максимум энергии из уровня пользователя */
async function readDynMax(): Promise<number> {
  try {
    await hydratePersonalProgress();
    const xp = getPersonalProgressSnapshot().totalXp;
    return getMaxEnergyForLevel(getLevelFromXP(xp), getConfiguredBaseEnergy());
  } catch {
    return MAX_ENERGY;
  }
}

/** Язык интерфейса для текста уведомления (тот же источник, что в _layout). */
async function readNotificationLang(): Promise<Lang> {
  try {
    const raw = await AsyncStorage.getItem('app_lang');
    return raw === 'uk' ? 'uk' : raw === 'es' ? 'es' : 'ru';
  } catch {
    return 'ru';
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function EnergyProvider({ children }: { children: React.ReactNode }) {
  const initialPeek = peekEnergy();
  const [energy, setEnergy] = useState(() => initialPeek?.energy ?? MAX_ENERGY);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusEnergyCapacity, setBonusEnergyCapacity] = useState(0);
  const [refundCredit, setRefundCredit] = useState(0);
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
  const restoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const syncEnergyPushRef = useRef<(() => Promise<void>) | null>(null);
  // Точка, ОТКУДА вылетает молния списания. Её задавала модалка подтверждения;
  // после её удаления (владелец 2026-08-24) остаётся null, и EnergySpendFlightHost
  // сам берёт запасной путь — от счётчика энергии вверху экрана.
  const motionTargetRef = useRef<{ x: number; y: number } | null>(null);

  const applySessionProjection = useCallback((projection: EnergySessionProjection) => {
    energyRef.current = projection.baseEnergy;
    bonusRef.current = projection.bonusEnergy;
    // зачем: срок подарка держится за ПОТОЛОК, а не за остаток. Иначе трата
    // последней бонусной единицы обнуляла бы срок, и расширенная шкала
    // исчезала бы раньше полуночи.
    bonusExpiresAtRef.current = bonusCapacityRef.current > 0 ? projection.bonusExpiresAt : 0;
    refundCreditRef.current = projection.refundCredit;
    lastRecoveryRef.current = projection.lastRecoveryTime;
    setEnergy(projection.baseEnergy);
    setBonusEnergy(projection.bonusEnergy);
    setRefundCredit(projection.refundCredit);
    setBonusExpiresAt(bonusCapacityRef.current > 0 ? projection.bonusExpiresAt : 0);
    writePeekEnergy(projection.baseEnergy, projection.maxEnergy);

    // Восстановление идёт до ОБЩЕЙ ёмкости: пустые золотые слоты обязаны
    // доливаться, пока подарок не сгорел в полночь.
    if (projection.baseEnergy + projection.bonusEnergy
      < projection.maxEnergy + bonusCapacityRef.current) {
      const now = Date.now();
      const elapsed = now - projection.lastRecoveryTime;
      const remaining = recoveryMsRef.current - (elapsed % recoveryMsRef.current);
      const safeRemaining = remaining > 0 ? remaining : 0;
      setTimeUntilNextMs(safeRemaining);
      setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
    } else {
      setTimeUntilNextMs(0);
      setRecoveryEndsAtMs(0);
    }
  }, []);

  const currentSessionProjection = useCallback((): EnergySessionProjection => ({
    baseEnergy: energyRef.current,
    bonusEnergy: bonusRef.current,
    bonusCapacity: bonusCapacityRef.current,
    bonusExpiresAt: bonusExpiresAtRef.current,
    refundCredit: refundCreditRef.current,
    lastRecoveryTime: lastRecoveryRef.current,
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
      await withAccountTransitionLock(async (accountTransitionLockLease) => {
        if (!isCurrentAccountGeneration(accountToken)) return;
        // Admin drain/fill applies before energy_state is read and under the
        // same account lock as spend/refund, so it cannot land in another user.
        await applyAdminEnergyCommand();
        if (!isCurrentAccountGeneration(accountToken)) return;
        if (!isCurrentAccountGeneration(accountToken)) return;
        let loadSucceeded = false;
        try {
          const initialRecovery = await readAndRecoverState(dynMax, recoveryMs, accountToken);
          const state = initialRecovery.state;
          const bonusState = initialRecovery.bonus;
          const storedRefundCredit = await readEnergySessionRefundCredit(accountToken);
          await recoverEnergySessionOperations({
            baseEnergy: state.current,
            bonusEnergy: bonusState?.amount ?? 0,
            bonusCapacity: bonusState?.capacity ?? 0,
            bonusExpiresAt: bonusState?.expiresAt ?? 0,
            refundCredit: storedRefundCredit,
            lastRecoveryTime: state.lastRecoveryTime,
            maxEnergy: dynMax,
          }, energySessionBootIdRef.current, {
            accountToken,
            accountTransitionLockLease,
          });
          if (!isCurrentAccountGeneration(accountToken)) return;
          // A recovered prepared debit republishes its exact crash-time
          // projection. Re-run ordinary elapsed-time recovery afterwards so
          // completed refill intervals during the stopped process are kept.
          const settledRecovery = await readAndRecoverState(dynMax, recoveryMs, accountToken);
          const settledState = settledRecovery.state;
          const settledBonus = settledRecovery.bonus;
          const settledRefundCredit = await readEnergySessionRefundCredit(accountToken);
          const recovered: EnergySessionProjection = {
            baseEnergy: settledState.current,
            bonusEnergy: settledBonus?.amount ?? 0,
            bonusCapacity: settledBonus?.capacity ?? 0,
            bonusExpiresAt: settledBonus?.expiresAt ?? 0,
            refundCredit: settledRefundCredit,
            lastRecoveryTime: settledState.lastRecoveryTime,
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
            restoreTimersRef.current.forEach(t => clearTimeout(t));
            restoreTimersRef.current = [];
            setRestoringPremium(false);
          }

          if (unlimited) {
            setTimeUntilNextMs(0);
            setRecoveryEndsAtMs(0);
            // Premium changes only the visible current value. The durable
            // projection remains on disk and is reloaded when Premium ends.
            if (!wasUnlimited && recovered.baseEnergy < dynMax) {
              setRestoringPremium(true);
              for (let i = recovered.baseEnergy + 1; i <= dynMax; i++) {
                const delay = (i - recovered.baseEnergy) * 350;
                const timer = setTimeout(() => {
                  setEnergy(i);
                  if (i === dynMaxRef.current) setRestoringPremium(false);
                }, delay);
                restoreTimersRef.current.push(timer);
              }
            } else {
              setEnergy(dynMax);
            }
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
      restoreTimersRef.current.forEach((timer) => clearTimeout(timer));
      restoreTimersRef.current = [];
      setRestoringPremium(false);
      isUnlimitedRef.current = false;
      setIsUnlimited(false);
      bonusRef.current = 0;
      bonusCapacityRef.current = 0;
      bonusExpiresAtRef.current = 0;
      setBonusEnergy(0);
      setBonusEnergyCapacity(0);
      setBonusExpiresAt(0);
      refundCreditRef.current = 0;
      setRefundCredit(0);
      energyReadyRef.current = false;
      setEnergyReady(false);
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

    // Перезагружаем энергию по событию от xp_manager при level-up / смене Premium.
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

  // ── Spend 1 energy ─────────────────────────────────────────────────────────
  const spendOne = useCallback(async (intent: EnergySessionIntent): Promise<boolean> => {
    if (!energyReadyRef.current) await load();
    if (!energyReadyRef.current) throw new Error('energy_state_unavailable');
    const accountToken = captureAccountGeneration();
    return withAccountTransitionLock(async (accountTransitionLockLease) => {
      if (!isCurrentAccountGeneration(accountToken)) return false;
      if (isUnlimitedRef.current) return true;
      const result = await commitEnergySessionStart(
        intent,
        1,
        currentSessionProjection(),
        energySessionBootIdRef.current,
        { accountToken, accountTransitionLockLease },
      );
      if (result.status === 'insufficient') return false;
      if (result.status === 'failed') throw new Error(`energy_session_start_failed:${result.reason}`);
      applySessionProjection(result.projection);
      if (result.status === 'applied') {
        emitAppEvent('energy_spent_on_start', { amount: 1, target: motionTargetRef.current ?? undefined });
        // зачем: списание энергии проходило беззвучно — значок молнии в шапке
        // просто уменьшался. Звук ставим только на 'applied' (реальное списание),
        // а не на 'insufficient': отказ озвучивает pm.energy.empty из своей модалки.
        soundDirector.request('pm.energy.spend', { scope: 'energy-spend' });
      }
      void syncEnergyPushRef.current?.();
      return true;
    });
  }, [applySessionProjection, currentSessionProjection, load]);

  // ── Refund 1 energy (старт не состоялся) ──────────────────────────────────
  const refundOne = useCallback(async (operationId: string, reason: string): Promise<void> => {
    if (!energyReadyRef.current) await load();
    if (!energyReadyRef.current) throw new Error('energy_state_unavailable');
    const accountToken = captureAccountGeneration();
    await withAccountTransitionLock(async (accountTransitionLockLease) => {
      if (!isCurrentAccountGeneration(accountToken)) return;
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
      if (result.status === 'failed') throw new Error(`energy_session_refund_failed:${result.reason}`);
      if (result.status === 'applied' || result.status === 'already-applied') {
        applySessionProjection(result.projection);
        void syncEnergyPushRef.current?.();
      }
    });
  }, [applySessionProjection, currentSessionProjection, load]);

  const acknowledgeSessionStart = useCallback(async (operationId: string): Promise<boolean> => {
    return acknowledgeEnergySessionStartInLedger(operationId, captureAccountGeneration());
  }, []);

  // ── Spend N energy (bonus first, then base) in one pass ───────────────────
  const spendAmount = useCallback(async (n: number, intent: EnergySessionIntent): Promise<boolean> => {
    if (n <= 0) return true;
    // Та же защита, что в spendOne: не тратим по placeholder-статусу.
    if (!energyReadyRef.current) {
      await load();
    }
    if (!energyReadyRef.current) throw new Error('energy_state_unavailable');
    const accountToken = captureAccountGeneration();
    return withAccountTransitionLock(async (accountTransitionLockLease) => {
      if (!isCurrentAccountGeneration(accountToken)) return false;
      if (isUnlimitedRef.current) return true;
      const result = await commitEnergySessionStart(
        intent,
        Math.floor(n),
        currentSessionProjection(),
        energySessionBootIdRef.current,
        { accountToken, accountTransitionLockLease },
      );
      if (result.status === 'insufficient') return false;
      if (result.status === 'failed') throw new Error(`energy_session_start_failed:${result.reason}`);

      applySessionProjection(result.projection);
      if (result.status === 'applied') {
        emitAppEvent('energy_spent_on_start', { amount: n, target: motionTargetRef.current ?? undefined });
      }
      void syncEnergyPushRef.current?.();

      return true;
    });
  }, [applySessionProjection, currentSessionProjection, load]);

  const confirmSpendAmount = useCallback(async (n: number, intent: EnergySessionIntent): Promise<EnergyStartResult> => {
    try {
      const cost = Math.max(0, Math.floor(n));
      if (cost <= 0) return 'unlimited';
      if (!energyReadyRef.current) await load();
      if (!energyReadyRef.current) return 'cancelled';
      if (isUnlimitedRef.current) return 'unlimited';
      if (bonusRef.current + refundCreditRef.current + energyRef.current < cost) return 'insufficient';

    // зачем: владелец 2026-08-24 — окно «Потратить 1 энергию и начать?» убрано.
    // Лишний тап на каждый старт мешал, а цена и так видна прямо на кнопке
    // знаком «−1 ⚡». Тап по кнопке = согласие: списываем сразу.
    // Остальные ветки не тронуты — безлимит и нехватка энергии решаются выше,
    // до этой точки, и экран «энергия кончилась» остаётся на месте.
    // Анимация полёта энергии сохранена: без модалки у неё нет точки старта,
    // поэтому она летит от счётчика энергии по запасному пути (см.
    // EnergySpendFlightHost — target необязателен).
    //
    // Ждать её окончания больше НЕЛЬЗЯ: раньше эти ~1.15 с прятались за
    // модалкой, а без модалки они превратились бы в заметную паузу между тапом
    // и стартом. Молния летит фоном поверх уже открывшегося экрана —
    // отклик мгновенный, а списание всё равно видно.
      const spent = cost === 1 ? await spendOne(intent) : await spendAmount(cost, intent);
      if (!spent) return 'insufficient';
      return 'spent';
    } catch {
      // Storage/account-generation failures are not lack of energy. They use
      // the existing no-entry path and, crucially, never start for free.
      return 'cancelled';
    }
  }, [load, spendAmount, spendOne]);

  const confirmSpendOne = useCallback(
    (intent: EnergySessionIntent): Promise<EnergyStartResult> => confirmSpendAmount(1, intent),
    [confirmSpendAmount],
  );

  // ── Sync energy-full push с текущим состоянием ──────────────────────────────
  // Безлимит/полная энергия → отменяем пуш. Иначе планируем на момент полного
  // восстановления. Best-effort: не должен ломать трату энергии при ошибке.
  const syncEnergyFullNotification = useCallback(async () => {
    try {
      if (isUnlimitedRef.current) {
        await cancelEnergyFullNotification();
        return;
      }
      // «Полная» считается по активной ёмкости: пока жив подарок, шкала
      // заполнена только когда залиты и золотые слоты.
      const current = bonusRef.current + energyRef.current;
      const dynMax = bonusCapacityRef.current + dynMaxRef.current;
      if (current >= dynMax) {
        await cancelEnergyFullNotification();
        return;
      }
      const secondsUntilFull = secondsUntilEnergyFull(
        current,
        dynMax,
        recoveryMsRef.current,
        lastRecoveryRef.current,
      );
      const lang = await readNotificationLang();
      await scheduleEnergyFullNotification(secondsUntilFull, lang);
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
  ): Promise<boolean> => {
    if (!isCurrent()) return false;
    const freshDynMax = await readDynMax();
    if (!isCurrent()) return false;
    dynMaxRef.current = freshDynMax;
    restoreTimersRef.current.forEach(timer => clearTimeout(timer));
    restoreTimersRef.current = [];
    setRestoringPremium(false);

    const fullEnergy = Math.max(1, Math.floor(freshDynMax));
    const now = Date.now();
    const state: StoredEnergy = { current: fullEnergy, lastRecoveryTime: now };
    /**
     * зачем: премиум заливает шкалу ЦЕЛИКОМ, включая временные золотые слоты
     * подарка. Заливать только базу значило бы оставить пустые деления на
     * полной шкале. Потолок подарка при этом не трогаем — он живёт до полуночи
     * сам по себе, меняется только остаток.
     */
    const accountToken = captureAccountGeneration();
    let bonusWrite: readonly [string, string] | null = null;
    let refilledBonus = 0;
    try {
      const currentBonus = await readBonusEnergyForMutation(accountToken);
      if (currentBonus && currentBonus.capacity > currentBonus.amount) {
        refilledBonus = currentBonus.capacity;
        bonusWrite = [
          requireGiftAccountStorageKey(BONUS_ENERGY_KEY, accountToken),
          JSON.stringify({
            amount: currentBonus.capacity,
            capacity: currentBonus.capacity,
            expiresAt: currentBonus.expiresAt,
          }),
        ];
      } else if (currentBonus) {
        refilledBonus = currentBonus.amount;
      }
    } catch (e) {
      // Подарок недоступен/испорчен — премиум всё равно заливает базу.
      DebugLogger.error('EnergyContext:currentBonus', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    if (!isCurrent()) return false;
    energyRef.current = fullEnergy;
    lastRecoveryRef.current = now;
    isUnlimitedRef.current = true;
    setEnergy(fullEnergy);
    setMaxEnergy(fullEnergy);
    setIsUnlimited(true);
    if (bonusWrite) {
      bonusRef.current = refilledBonus;
      setBonusEnergy(refilledBonus);
    }
    setTimeUntilNextMs(0);
    setRecoveryEndsAtMs(0);
    energyReadyRef.current = true;
    setEnergyReady(true);
    writePeekEnergy(fullEnergy, fullEnergy);

    let persisted = false;
    for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1) {
      try {
        await withStorageLock(async () => {
          // Обе величины уходят одной записью: премиум не должен оставить
          // базу залитой, а золотые слоты пустыми при обрыве между записями.
          const writes: [string, string][] = [[ENERGY_KEY, JSON.stringify(state)]];
          if (bonusWrite) writes.push([bonusWrite[0], bonusWrite[1]]);
          await AsyncStorage.multiSet(writes);
        });
        persisted = true;
        break;
      } catch (e) {
      // One immediate retry covers a transient native-storage failure without // adding a timer, listener, or background worker.
      DebugLogger.error('EnergyContext:attempt', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
    if (!persisted || !isCurrent()) return false;
    await cancelEnergyFullNotification().catch(() => {});
    return isCurrent();
  }, []);

  const formattedTime = energy < dynMaxRef.current && !isUnlimited ? formatTimeUntilRecovery(timeUntilNextMs) : '';

  const value = useMemo<EnergyContextValue>(() => ({
    energy, bonusEnergy, bonusEnergyCapacity, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, confirmSpendOne, spendAmount, confirmSpendAmount,
    refundOne, acknowledgeSessionStart, reload, refillToMax, energyReady,
  }), [
    energy, bonusEnergy, bonusEnergyCapacity, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, confirmSpendOne, spendAmount, confirmSpendAmount,
    refundOne, acknowledgeSessionStart, reload, refillToMax, energyReady,
  ]);

  return (
    <EnergyContext.Provider value={value}>
      {children}
    </EnergyContext.Provider>
  );
}
