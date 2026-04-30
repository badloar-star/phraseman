import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { readBonusEnergy, BONUS_ENERGY_KEY } from '../app/level_gift_system';
import { getVerifiedPremiumStatus } from '../app/premium_guard';

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5; // базовый минимум (уровень 1-9)
const RECOVERY_MS = 30 * 60 * 1000; // 30 minutes per 1 energy unit

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
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // "29м" or "1ч 5м" — ready to display
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  spendOne: () => Promise<boolean>;  // returns false if no energy
  /** Spend N units: bonus first, then base. Returns false if total available < n (atomic). */
  spendAmount: (n: number) => Promise<boolean>;
  reload: () => Promise<void>;       // force re-read (call after tester toggle)
}

const EnergyContext = createContext<EnergyContextValue>({
  energy: MAX_ENERGY,
  bonusEnergy: 0,
  bonusExpiresAt: 0,
  maxEnergy: MAX_ENERGY,
  timeUntilNextMs: 0,
  formattedTime: '',
  isUnlimited: false,
  restoringPremium: false,
  spendOne: async () => true,
  spendAmount: async () => true,
  reload: async () => {},
});

export function useEnergy(): EnergyContextValue {
  return useContext(EnergyContext);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

async function readUnlimited(): Promise<boolean> {
  const [tester, noLimits] = await Promise.all([
    AsyncStorage.getItem('tester_energy_disabled'),
    AsyncStorage.getItem('tester_no_limits'),
  ]);
  // getVerifiedPremiumStatus handles: tester_no_limits, __DEV__, RevenueCat
  const isPremium = await getVerifiedPremiumStatus();
  return isPremium || tester === 'true' || noLimits === 'true';
}

/** Читает и восстанавливает состояние энергии с учётом динамического максимума */
async function readAndRecoverState(dynMax: number): Promise<StoredEnergy> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  let state: StoredEnergy = { current: dynMax, lastRecoveryTime: Date.now() };

  if (raw) {
    state = JSON.parse(raw) as StoredEnergy;
    // Если уровень повысился и current меньше нового макса — не обрезаем,
    // просто даём восстановиться до нового макса естественно
  } else {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    return state;
  }

  if (state.current < dynMax) {
    const now = Date.now();
    const elapsed = now - state.lastRecoveryTime;
    const recovered = Math.floor(elapsed / RECOVERY_MS);
    if (recovered > 0) {
      state.current = Math.min(state.current + recovered, dynMax);
      // Advance lastRecoveryTime by completed full intervals (keeps remainder accurate)
      state.lastRecoveryTime = state.lastRecoveryTime + recovered * RECOVERY_MS;
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

// ── Provider ─────────────────────────────────────────────────────────────────
export function EnergyProvider({ children }: { children: React.ReactNode }) {
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusExpiresAt, setBonusExpiresAt] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(MAX_ENERGY);
  const [timeUntilNextMs, setTimeUntilNextMs] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);

  // Refs for use inside callbacks without stale closures
  const energyRef = useRef(MAX_ENERGY);
  const bonusRef = useRef(0);
  const dynMaxRef = useRef(MAX_ENERGY);
  const lastRecoveryRef = useRef(Date.now());
  const isUnlimitedRef = useRef(false);
  const restoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Load and apply recovery ────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [unlimited, dynMax, bonusState] = await Promise.all([readUnlimited(), readDynMax(), readBonusEnergy()]);
      const bonus = bonusState?.amount ?? 0;
      bonusRef.current = bonus;
      setBonusEnergy(bonus);
      setBonusExpiresAt(bonusState?.expiresAt ?? 0);
      dynMaxRef.current = dynMax;
      setMaxEnergy(dynMax);

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
        const storedState = await readAndRecoverState(dynMax);
        const storedEnergy = storedState.current;
        setTimeUntilNextMs(0);

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

      const state = await readAndRecoverState(dynMax);
      energyRef.current = state.current;
      lastRecoveryRef.current = state.lastRecoveryTime;
      setEnergy(state.current);

      if (state.current < dynMax) {
        const now = Date.now();
        const elapsed = now - state.lastRecoveryTime;
        const remaining = RECOVERY_MS - (elapsed % RECOVERY_MS);
        setTimeUntilNextMs(remaining > 0 ? remaining : 0);
      } else {
        setTimeUntilNextMs(0);
      }
    } catch {}
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Poll every 30s for recovery — paused while in background to prevent AsyncStorage deadlocks
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(load, 30_000);
    };
    const stopInterval = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    };

    startInterval();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        load();        // reload once on foreground resume
        startInterval(); // restart polling
      } else {
        stopInterval(); // stop polling while in background
      }
    });

    // Перезагружаем энергию по событию от xp_manager при level-up
    const levelSub = DeviceEventEmitter.addListener('energy_reload', () => { load(); });

    return () => { stopInterval(); sub.remove(); levelSub.remove(); };
  }, [load]);

  // Countdown every second when energy is not full
  useEffect(() => {
    if (energy >= dynMaxRef.current || isUnlimited) {
      setTimeUntilNextMs(0);
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastRecoveryRef.current;
      const remaining = RECOVERY_MS - (elapsed % RECOVERY_MS);
      setTimeUntilNextMs(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [energy, isUnlimited]);

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
      return true;
    }

    const now = Date.now();
    // Start fresh 30-min timer when spending from full
    const newLastRecovery = energyRef.current >= dynMaxRef.current ? now : lastRecoveryRef.current;
    const newEnergy = energyRef.current - 1;

    energyRef.current = newEnergy;
    lastRecoveryRef.current = newLastRecovery;
    setEnergy(newEnergy);

    const state: StoredEnergy = { current: newEnergy, lastRecoveryTime: newLastRecovery };
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));

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
      const state: StoredEnergy = { current: newE, lastRecoveryTime: newLastRecovery };
      try { await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)); } catch { /* best-effort */ }
    }

    return true;
  }, []);

  // ── Force reload (call after tester toggle in settings) ────────────────────
  const reload = useCallback(async () => { await load(); }, [load]);

  const formattedTime = energy < dynMaxRef.current && !isUnlimited ? formatMs(timeUntilNextMs) : '';

  return (
    <EnergyContext.Provider value={{ energy, bonusEnergy, bonusExpiresAt, maxEnergy, timeUntilNextMs, formattedTime, isUnlimited, restoringPremium, spendOne, spendAmount, reload }}>
      {children}
    </EnergyContext.Provider>
  );
}
