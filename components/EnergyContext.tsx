import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, InteractionManager } from 'react-native';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { readBonusEnergy, BONUS_ENERGY_KEY } from '../app/level_gift_system';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from '../app/premium_guard';
import { formatTimeUntilRecovery, getRecoveryIntervalMs, secondsUntilEnergyFull } from '../app/energy_system';
import { readLeagueChestEnergyOverrideMs } from '../app/services/league_chest_rewards';
import { isEnergyFreeWindowActive, readBoonEnergyOverrideMs } from '../app/boons/boon_effects_energy';
import { createCoalescedAsyncRunner } from '../app/app_resume_policy';
import { scheduleEnergyFullNotification, cancelEnergyFullNotification } from '../app/notifications';
import type { Lang } from '../constants/i18n';
import { energyCountdownClock } from './energy_countdown_clock';
import { getMaxEnergy as getConfiguredBaseEnergy } from '../app/remote_flags';

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5; // базовый минимум (уровень 1-9)

// B2 (PERF_MASTER_PLAN): модульный peek-кеш последнего известного значения
// энергии. EnergyProvider стартует с MAX_ENERGY, реальное значение приходит
// асинхронно из load() — это даёт видимый "прыжок" (полная → реальная) на
// каждом холодном старте/ремаунте провайдера. Кешируем последнее известное
// {energy, maxEnergy} в модульной переменной (переживает ремаунты компонента
// в рамках одного JS-процесса, как peekProfilesCache/peekFriendsTabSwrWarm)
// и читаем её синхронно в useState-инициализаторах ниже. Если кеша ещё нет
// (первый запуск процесса) — поведение не меняется: MAX_ENERGY, как раньше.
let peekEnergyState: { energy: number; maxEnergy: number } | null = null;
function peekEnergy(): { energy: number; maxEnergy: number } | null {
  return peekEnergyState;
}
function writePeekEnergy(energy: number, maxEnergy: number): void {
  peekEnergyState = { energy, maxEnergy };
}

interface StoredEnergy {
  current: number;
  lastRecoveryTime: number;
}

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-maxEnergy (base only, without bonus)
  bonusEnergy: number;       // 0-N extra energy from gifts (expires next day)
  bonusExpiresAt: number;    // epoch ms when bonus expires (0 if no bonus)
  maxEnergy: number;         // динамически: 5-6 в зависимости от уровня
  recoveryIntervalMs: number;// current +1 energy recovery interval
  recoveryEndsAtMs: number;
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // e.g. "29м 12с" or "1ч 5м 3с" — ready to display
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  spendOne: () => Promise<boolean>;  // returns false if no energy
  /** Spend N units: bonus first, then base. Returns false if total available < n (atomic). */
  spendAmount: (n: number) => Promise<boolean>;
  reload: () => Promise<void>;       // force re-read (call after tester toggle)
  refillToMax: (isCurrent?: () => boolean) => Promise<boolean>; // immediate account-safe Premium refill
  /** First AsyncStorage load finished — safe to gate screens on real energy+bonus (not defaults). */
  energyReady: boolean;
}

const EnergyContext = createContext<EnergyContextValue>({
  energy: MAX_ENERGY,
  bonusEnergy: 0,
  bonusExpiresAt: 0,
  maxEnergy: MAX_ENERGY,
  recoveryIntervalMs: getRecoveryIntervalMs(0),
  recoveryEndsAtMs: 0,
  timeUntilNextMs: 0,
  formattedTime: '',
  isUnlimited: false,
  restoringPremium: false,
  spendOne: async () => true,
  spendAmount: async () => true,
  reload: async () => {},
  refillToMax: async () => true,
  energyReady: false,
});

export function useEnergy(): EnergyContextValue {
  return useContext(EnergyContext);
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
  // Weekly Boon «окно без энергии»: в активный вечерний час энергия не тратится у всех.
  // EnergyContext.spendOne — основной путь траты (не energy_system.spendEnergy),
  // поэтому окно ОБЯЗАНО проверяться здесь, иначе бонус не работает.
  if (isEnergyFreeWindowActive()) return true;
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
async function readAndRecoverState(dynMax: number, recoveryMs: number): Promise<StoredEnergy> {
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
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    }
  }

  return state;
}

/** Читает текущий максимум энергии из уровня пользователя */
async function readDynMax(): Promise<number> {
  try {
    const xpRaw = await AsyncStorage.getItem('user_total_xp');
    const xp = parseInt(xpRaw || '0') || 0;
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
  const dynMaxRef = useRef(initialPeek?.maxEnergy ?? MAX_ENERGY);
  const recoveryMsRef = useRef(getRecoveryIntervalMs(0));
  const lastRecoveryRef = useRef(Date.now());
  const isUnlimitedRef = useRef(false);
  const restoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const syncEnergyPushRef = useRef<(() => Promise<void>) | null>(null);

  // ── Load and apply recovery ────────────────────────────────────────────────
  const runLoad = useCallback(async () => {
    try {
      const [unlimited, dynMax, recoveryMs, bonusState] = await Promise.all([readUnlimited(), readDynMax(), readRecoveryIntervalMs(), readBonusEnergy()]);
      const bonus = bonusState?.amount ?? 0;
      bonusRef.current = bonus;
      setBonusEnergy(bonus);
      setBonusExpiresAt(bonusState?.expiresAt ?? 0);
      dynMaxRef.current = dynMax;
      recoveryMsRef.current = recoveryMs;
      setMaxEnergy(dynMax);
      setRecoveryIntervalMs(recoveryMs);

      const wasUnlimited = isUnlimitedRef.current;
      isUnlimitedRef.current = unlimited;
      setIsUnlimited(unlimited);

      // Premium removed — clear any pending restore animation timers
      if (wasUnlimited && !unlimited) {
        restoreTimersRef.current.forEach(t => clearTimeout(t));
        restoreTimersRef.current = [];
        setRestoringPremium(false);
      }

      if (unlimited) {
        // Читаем реальное сохранённое значение энергии
        const storedState = await readAndRecoverState(dynMax, recoveryMs);
        const storedEnergy = storedState.current;
        setTimeUntilNextMs(0);
        setRecoveryEndsAtMs(0);

        // Если переходим в премиум (wasUnlimited=false) и энергия < макс — анимируем
        if (!wasUnlimited && storedEnergy < dynMax) {
          energyRef.current = storedEnergy;
          setEnergy(storedEnergy);
          isUnlimitedRef.current = true;
          setIsUnlimited(true);

          restoreTimersRef.current.forEach(t => clearTimeout(t));
          restoreTimersRef.current = [];
          setRestoringPremium(true);

          for (let i = storedEnergy + 1; i <= dynMax; i++) {
            const delay = (i - storedEnergy) * 350;
            const t = setTimeout(() => {
              setEnergy(i);
              energyRef.current = i;
              if (i === dynMaxRef.current) setRestoringPremium(false);
            }, delay);
            restoreTimersRef.current.push(t);
          }
        } else {
          isUnlimitedRef.current = true;
          setIsUnlimited(true);
          setEnergy(dynMax);
          energyRef.current = dynMax;
        }
        return;
      }

      const state = await readAndRecoverState(dynMax, recoveryMs);
      energyRef.current = state.current;
      lastRecoveryRef.current = state.lastRecoveryTime;
      setEnergy(state.current);

      if (state.current < dynMax) {
        const now = Date.now();
        const elapsed = now - state.lastRecoveryTime;
        const remaining = recoveryMs - (elapsed % recoveryMs);
        const safeRemaining = remaining > 0 ? remaining : 0;
        setTimeUntilNextMs(safeRemaining);
        setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
      } else {
        setTimeUntilNextMs(0);
        setRecoveryEndsAtMs(0);
      }
    } catch {
    } finally {
      setEnergyReady(true);
      // B2: обновляем peek-кеш последним известным значением после каждого
      // успешного load — следующий маунт провайдера (навигация назад/вперёд,
      // Fast Refresh) стартует с этого значения вместо MAX_ENERGY.
      writePeekEnergy(energyRef.current, dynMaxRef.current);
      // Синхронизируем energy-full пуш с актуальным состоянием:
      // полная/безлимит → отмена, неполная → (пере)планирование на точный момент.
      void syncEnergyPushRef.current?.();
    }
  }, []);
  const load = useCallback(async () => {
    loadRunnerRef.current ??= createCoalescedAsyncRunner(runLoad);
    await loadRunnerRef.current();
  }, [runLoad]);

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

    return () => {
      sub.remove();
      levelSub.remove();
      premiumOnSub.remove();
      premiumOffSub.remove();
      vipOnSub.remove();
      vipOffSub.remove();
      accessSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTask?.cancel?.();
    };
  }, [load]);

  // Check recovery near the next real refill instead of polling while the app is idle.
  useEffect(() => {
    if (!appActive || isUnlimited || energy >= maxEnergy) return;
    const remaining = timeUntilNextMs > 0 ? timeUntilNextMs : recoveryIntervalMs;
    const delay = Math.max(1000, remaining + 250);
    const timeoutId = setTimeout(load, delay);
    return () => clearTimeout(timeoutId);
  }, [appActive, energy, maxEnergy, isUnlimited, load, recoveryIntervalMs, timeUntilNextMs]);

  // ── Spend 1 energy ─────────────────────────────────────────────────────────
  const spendOne = useCallback(async (): Promise<boolean> => {
    if (isUnlimitedRef.current) return true;
    if (bonusRef.current <= 0 && energyRef.current <= 0) return false;

    // Spend from bonus first (it expires tomorrow, use it before base energy)
    if (bonusRef.current > 0) {
      const newBonus = bonusRef.current - 1;
      bonusRef.current = newBonus;
      setBonusEnergy(newBonus);
      try {
        if (newBonus === 0) {
          await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
        } else {
          const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
          if (raw) {
            const b = JSON.parse(raw);
            await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify({ ...b, amount: newBonus }));
          }
        }
      } catch {}
      // База могла быть неполной от прошлых трат — синхронизируем пуш.
      void syncEnergyPushRef.current?.();
      return true;
    }

    const now = Date.now();
    // Start fresh recovery timer when spending from full
    const newLastRecovery = energyRef.current >= dynMaxRef.current ? now : lastRecoveryRef.current;
    const newEnergy = energyRef.current - 1;

    energyRef.current = newEnergy;
    lastRecoveryRef.current = newLastRecovery;
    setEnergy(newEnergy);
    const recoveryMs = recoveryMsRef.current;
    const elapsed = now - newLastRecovery;
    const remaining = recoveryMs - (elapsed % recoveryMs);
    const safeRemaining = remaining > 0 ? remaining : 0;
    setTimeUntilNextMs(safeRemaining);
    setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);

    const state: StoredEnergy = { current: newEnergy, lastRecoveryTime: newLastRecovery };
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    writePeekEnergy(newEnergy, dynMaxRef.current);

    // Энергия упала ниже максимума → (пере)планируем пуш о восстановлении.
    void syncEnergyPushRef.current?.();

    return true;
  }, []);

  // ── Spend N energy (bonus first, then base) in one pass ───────────────────
  const spendAmount = useCallback(async (n: number): Promise<boolean> => {
    if (n <= 0) return true;
    if (isUnlimitedRef.current) return true;
    if (bonusRef.current + energyRef.current < n) return false;

    const takeB = Math.min(n, bonusRef.current);
    const nFromBase = n - takeB;
    const e = energyRef.current;
    if (e < nFromBase) return false;

    const newBonus = bonusRef.current - takeB;
    const newE = e - nFromBase;
    const now = Date.now();
    const wasFull = e >= dynMaxRef.current;
    const newLastRecovery = wasFull && nFromBase > 0 ? now : lastRecoveryRef.current;

    bonusRef.current = newBonus;
    setBonusEnergy(newBonus);
    try {
      if (newBonus === 0) {
        await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
      } else {
        const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
        if (raw) {
          const b = JSON.parse(raw) as { amount?: number; expiresAt?: number };
          await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify({ ...b, amount: newBonus }));
        }
      }
    } catch { /* best-effort */ }

    if (nFromBase > 0) {
      lastRecoveryRef.current = newLastRecovery;
      energyRef.current = newE;
      setEnergy(newE);
      const recoveryMs = recoveryMsRef.current;
      const elapsed = now - newLastRecovery;
      const remaining = recoveryMs - (elapsed % recoveryMs);
      const safeRemaining = remaining > 0 ? remaining : 0;
      setTimeUntilNextMs(safeRemaining);
      setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
      const state: StoredEnergy = { current: newE, lastRecoveryTime: newLastRecovery };
      try { await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)); } catch { /* best-effort */ }
      writePeekEnergy(newE, dynMaxRef.current);
    }

    // Энергия потрачена → (пере)планируем пуш о полном восстановлении.
    void syncEnergyPushRef.current?.();

    return true;
  }, []);

  // ── Sync energy-full push с текущим состоянием ──────────────────────────────
  // Безлимит/полная энергия → отменяем пуш. Иначе планируем на момент полного
  // восстановления. Best-effort: не должен ломать трату энергии при ошибке.
  const syncEnergyFullNotification = useCallback(async () => {
    try {
      if (isUnlimitedRef.current) {
        await cancelEnergyFullNotification();
        return;
      }
      const current = energyRef.current;
      const dynMax = dynMaxRef.current;
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
    } catch { /* best-effort: пуш не критичен */ }
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
    energyRef.current = fullEnergy;
    lastRecoveryRef.current = now;
    isUnlimitedRef.current = true;
    setEnergy(fullEnergy);
    setMaxEnergy(fullEnergy);
    setIsUnlimited(true);
    setTimeUntilNextMs(0);
    setRecoveryEndsAtMs(0);
    setEnergyReady(true);
    writePeekEnergy(fullEnergy, fullEnergy);

    let persisted = false;
    for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1) {
      try {
        await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
        persisted = true;
        break;
      } catch {
        // One immediate retry covers a transient native-storage failure without
        // adding a timer, listener, or background worker.
      }
    }
    if (!persisted || !isCurrent()) return false;
    await cancelEnergyFullNotification().catch(() => {});
    return isCurrent();
  }, []);

  const formattedTime = energy < dynMaxRef.current && !isUnlimited ? formatTimeUntilRecovery(timeUntilNextMs) : '';

  const value = useMemo<EnergyContextValue>(() => ({
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, spendAmount, reload, refillToMax, energyReady,
  }), [
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, spendAmount, reload, refillToMax, energyReady,
  ]);

  return (
    <EnergyContext.Provider value={value}>
      {children}
    </EnergyContext.Provider>
  );
}
