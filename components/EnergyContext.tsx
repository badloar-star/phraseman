import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, InteractionManager } from 'react-native';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { readBonusEnergy, BONUS_ENERGY_KEY } from '../app/level_gift_system';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { formatTimeUntilRecovery, getRecoveryIntervalMs, secondsUntilEnergyFull } from '../app/energy_system';
import { readLeagueChestEnergyOverrideMs } from '../app/services/league_chest_rewards';
import { isEnergyFreeWindowActive, readBoonEnergyOverrideMs } from '../app/boons/boon_effects_energy';
import { createCoalescedAsyncRunner } from '../app/app_resume_policy';
import { scheduleEnergyFullNotification, cancelEnergyFullNotification } from '../app/notifications';
import type { Lang } from '../constants/i18n';

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5; // базовый минимум (уровень 1-9)

interface StoredEnergy {
  current: number;
  lastRecoveryTime: number;
}

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-maxEnergy (base only, without bonus)
  bonusEnergy: number;       // 0-N extra energy from gifts (expires next day)
  bonusExpiresAt: number;    // epoch ms when bonus expires (0 if no bonus)
  maxEnergy: number;         // динамически: 5-10 в зависимости от уровня
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
  energyReady: false,
});

export function useEnergy(): EnergyContextValue {
  return useContext(EnergyContext);
}

export function useEnergyCountdown(): { timeUntilNextMs: number; formattedTime: string } {
  const { energy, maxEnergy, isUnlimited, recoveryIntervalMs, recoveryEndsAtMs } = useEnergy();
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const shouldTick =
      appActive
      && !isUnlimited
      && energy < maxEnergy
      && recoveryEndsAtMs > 0
      && recoveryIntervalMs > 0;

    setNow(Date.now());
    if (!shouldTick) return undefined;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [appActive, energy, isUnlimited, maxEnergy, recoveryEndsAtMs, recoveryIntervalMs]);

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
  const [tester, noLimits] = await Promise.all([
    AsyncStorage.getItem('tester_energy_disabled'),
    AsyncStorage.getItem('tester_no_limits'),
  ]);
  // getVerifiedPremiumStatus handles: tester_no_limits, __DEV__, RevenueCat
  const isPremium = await getVerifiedPremiumStatus();
  // Weekly Boon «окно без энергии»: в активный вечерний час энергия не тратится у всех.
  // EnergyContext.spendOne — основной путь траты (не energy_system.spendEnergy),
  // поэтому окно ОБЯЗАНО проверяться здесь, иначе бонус не работает.
  if (isEnergyFreeWindowActive()) return true;
  return isPremium || tester === 'true' || noLimits === 'true';
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
    state = JSON.parse(raw) as StoredEnergy;
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
    return getMaxEnergyForLevel(getLevelFromXP(xp));
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
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusExpiresAt, setBonusExpiresAt] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(MAX_ENERGY);
  const [recoveryIntervalMs, setRecoveryIntervalMs] = useState(getRecoveryIntervalMs(0));
  const [recoveryEndsAtMs, setRecoveryEndsAtMs] = useState(0);
  const [timeUntilNextMs, setTimeUntilNextMs] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);
  const [energyReady, setEnergyReady] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');

  // Refs for use inside callbacks without stale closures
  const energyRef = useRef(MAX_ENERGY);
  const bonusRef = useRef(0);
  const dynMaxRef = useRef(MAX_ENERGY);
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

  const formattedTime = energy < dynMaxRef.current && !isUnlimited ? formatTimeUntilRecovery(timeUntilNextMs) : '';

  const value = useMemo<EnergyContextValue>(() => ({
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, spendAmount, reload, energyReady,
  }), [
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, spendAmount, reload, energyReady,
  ]);

  return (
    <EnergyContext.Provider value={value}>
      {children}
    </EnergyContext.Provider>
  );
}
