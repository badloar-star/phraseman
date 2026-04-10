import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5;
const RECOVERY_MS = 30 * 60 * 1000; // 30 minutes per 1 energy unit

interface StoredEnergy {
  current: number;
  lastRecoveryTime: number;
}

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-5
  maxEnergy: number;         // always 5
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // "29м" or "1ч 5м" — ready to display
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  spendOne: () => Promise<boolean>;  // returns false if no energy
  reload: () => Promise<void>;       // force re-read (call after tester toggle)
}

const EnergyContext = createContext<EnergyContextValue>({
  energy: MAX_ENERGY,
  maxEnergy: MAX_ENERGY,
  timeUntilNextMs: 0,
  formattedTime: '',
  isUnlimited: false,
  restoringPremium: false,
  spendOne: async () => true,
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
  const [prem, tester, noLimits, noPremium] = await Promise.all([
    AsyncStorage.getItem('premium_active'),
    AsyncStorage.getItem('tester_energy_disabled'),
    AsyncStorage.getItem('tester_no_limits'),
    AsyncStorage.getItem('tester_no_premium'),
  ]);
  // tester_no_premium overrides everything — force non-premium mode
  if (noPremium === 'true') return false;
  return prem === 'true' || tester === 'true' || noLimits === 'true';
}

async function readAndRecoverState(): Promise<StoredEnergy> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  let state: StoredEnergy = { current: MAX_ENERGY, lastRecoveryTime: Date.now() };

  if (raw) {
    state = JSON.parse(raw) as StoredEnergy;
  } else {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    return state;
  }

  if (state.current < MAX_ENERGY) {
    const now = Date.now();
    const elapsed = now - state.lastRecoveryTime;
    const recovered = Math.floor(elapsed / RECOVERY_MS);
    if (recovered > 0) {
      state.current = Math.min(state.current + recovered, MAX_ENERGY);
      // Advance lastRecoveryTime by completed full intervals (keeps remainder accurate)
      state.lastRecoveryTime = state.lastRecoveryTime + recovered * RECOVERY_MS;
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    }
  }

  return state;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function EnergyProvider({ children }: { children: React.ReactNode }) {
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [timeUntilNextMs, setTimeUntilNextMs] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);

  // Refs for use inside callbacks without stale closures
  const energyRef = useRef(MAX_ENERGY);
  const lastRecoveryRef = useRef(Date.now());
  const isUnlimitedRef = useRef(false);
  const restoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Load and apply recovery ────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const unlimited = await readUnlimited();
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
        // Читаем реальное сохранённое значение энергии (не ref — он может быть MAX при монтировании)
        const storedState = await readAndRecoverState();
        const storedEnergy = storedState.current;
        setTimeUntilNextMs(0);

        // Если переходим в премиум (wasUnlimited=false) и энергия < макс — анимируем
        if (!wasUnlimited && storedEnergy < MAX_ENERGY) {
          // Сначала показываем текущую энергию, потом анимируем до макс
          energyRef.current = storedEnergy;
          setEnergy(storedEnergy);
          isUnlimitedRef.current = true;
          setIsUnlimited(true);

          restoreTimersRef.current.forEach(t => clearTimeout(t));
          restoreTimersRef.current = [];
          setRestoringPremium(true);

          for (let i = storedEnergy + 1; i <= MAX_ENERGY; i++) {
            const delay = (i - storedEnergy) * 350;
            const t = setTimeout(() => {
              setEnergy(i);
              energyRef.current = i;
              if (i === MAX_ENERGY) setRestoringPremium(false);
            }, delay);
            restoreTimersRef.current.push(t);
          }
        } else {
          isUnlimitedRef.current = true;
          setIsUnlimited(true);
          setEnergy(MAX_ENERGY);
          energyRef.current = MAX_ENERGY;
        }
        return;
      }

      const state = await readAndRecoverState();
      energyRef.current = state.current;
      lastRecoveryRef.current = state.lastRecoveryTime;
      setEnergy(state.current);

      if (state.current < MAX_ENERGY) {
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

    return () => { stopInterval(); sub.remove(); };
  }, [load]);

  // Countdown every second when energy is not full
  useEffect(() => {
    if (energy >= MAX_ENERGY || isUnlimited) {
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
    if (energyRef.current <= 0) return false;

    const now = Date.now();
    // Start fresh 30-min timer when spending from full
    const newLastRecovery = energyRef.current >= MAX_ENERGY ? now : lastRecoveryRef.current;
    const newEnergy = energyRef.current - 1;

    energyRef.current = newEnergy;
    lastRecoveryRef.current = newLastRecovery;
    setEnergy(newEnergy);

    const state: StoredEnergy = { current: newEnergy, lastRecoveryTime: newLastRecovery };
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));

    return true;
  }, []);

  // ── Force reload (call after tester toggle in settings) ────────────────────
  const reload = useCallback(async () => { await load(); }, [load]);

  const formattedTime = energy < MAX_ENERGY && !isUnlimited ? formatMs(timeUntilNextMs) : '';

  return (
    <EnergyContext.Provider value={{ energy, maxEnergy: MAX_ENERGY, timeUntilNextMs, formattedTime, isUnlimited, restoringPremium, spendOne, reload }}>
      {children}
    </EnergyContext.Provider>
  );
}
