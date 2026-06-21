import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { getVerifiedPremiumStatus } from './premium_guard';
import { isFeatureFreeForEveryone } from './feature_gates';
import { readLeagueChestEnergyOverrideMs } from './services/league_chest_rewards';
import { getMaxEnergy, getEnergyRecoveryIntervalMs } from './remote_flags';
import { isEnergyFreeWindowActive, readBoonEnergyOverrideMs } from './boons/boon_effects_energy';

export interface EnergyState {
  current: number;
  lastRecoveryTime: number;
}

const ENERGY_STORAGE_KEY = 'energy_state';
const ENERGY_PER_LESSON = 1;
/** Build-time default; runtime uses remote-tunable getEnergyRecoveryIntervalMs(). */
export const ENERGY_RECOVERY_INTERVAL_MS = 10 * 60 * 1000;

/** Remote-tunable max energy (cap). Read at call time so admin changes apply live. */
function MAX_ENERGY_VALUE(): number {
  return getMaxEnergy();
}

// Время восстановления 1 единицы энергии фиксированное:
// цепочка дней влияет на XP, но не ускоряет энергию.
export function getRecoveryIntervalMs(_streakDays: number = 0): number {
  return getEnergyRecoveryIntervalMs();
}

async function getCurrentRecoveryIntervalMs(): Promise<number> {
  try {
    // Активные override-ы интервала: league-chest и weekly-boon (turbo_regen).
    // Берём наименьший (быстрейшее восстановление), чтобы один не перетирал другой.
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
    return getEnergyRecoveryIntervalMs();
  }
}

const DEFAULT_STATE: EnergyState = {
  current: getMaxEnergy(),
  lastRecoveryTime: Date.now(),
};

/**
 * Получить текущее состояние энергии из хранилища.
 * Если данные отсутствуют, инициализирует с максимальной энергией.
 */
export async function getEnergyState(): Promise<EnergyState> {
  try {
    const stored = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
    if (!stored) {
      // Инициализация: первый раз у пользователя
      const initialState: EnergyState = {
        ...DEFAULT_STATE,
        lastRecoveryTime: Date.now(),
      };
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(initialState));
      return initialState;
    }
    const parsed = JSON.parse(stored) as EnergyState;
    const maxE = MAX_ENERGY_VALUE();
    if (!Number.isFinite(parsed.current) || parsed.current < 0) parsed.current = maxE;
    else if (parsed.current > maxE) parsed.current = maxE;
    return parsed;
  } catch (error) {
    DebugLogger.error('energy_system.ts:getEnergyState', error, 'critical');
    return DEFAULT_STATE;
  }
}

/**
 * Проверить и применить восстановление энергии (автоматически).
 * Скорость восстановления фиксированная; цепочка дней не влияет на энергию.
 * Возвращает обновленное состояние.
 */
export async function checkAndRecover(): Promise<EnergyState> {
  try {
    let state = await getEnergyState();
    const now = Date.now();
    const recoveryIntervalMs = await getCurrentRecoveryIntervalMs();
    const timeSinceLastRecovery = now - state.lastRecoveryTime;

    if (timeSinceLastRecovery >= recoveryIntervalMs) {
      const recoveryCount = Math.floor(timeSinceLastRecovery / recoveryIntervalMs);
      const newCurrent = Math.min(state.current + recoveryCount, MAX_ENERGY_VALUE());

      state = {
        ...state,
        current: newCurrent,
        lastRecoveryTime: state.lastRecoveryTime + recoveryCount * recoveryIntervalMs,
      };

      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
    }

    return state;
  } catch (error) {
    DebugLogger.error('energy_system.ts:checkAndRecover', error, 'critical');
    return await getEnergyState();
  }
}

/**
 * Потратить энергию.
 * Возвращает true если энергия была потрачена успешно, false если энергии недостаточно.
 * Премиум игроки не тратят энергию.
 */
export async function spendEnergy(amount: number = ENERGY_PER_LESSON): Promise<boolean> {
  try {
    // «Пульт»: если энергия переведена в «Фри» — лимит снят для всех (безлимит,
    // как у премиума), пейвол no_energy не показываем.
    if (isFeatureFreeForEveryone('energy')) return true;

    // Weekly Boon «окно без энергии»: в активный вечерний час буднего дня
    // энергия не тратится у всех (как безлимит, но только на окно).
    if (isEnergyFreeWindowActive()) return true;

    // Премиум: энергия не тратится (единая верифицированная проверка)
    const isPremium = await getVerifiedPremiumStatus();
    if (isPremium) return true;

    // Тестерский режим: энергия не тратится
    const testerEnergyDisabled = await AsyncStorage.getItem('tester_energy_disabled');
    if (testerEnergyDisabled === 'true') return true;

    const state = await checkAndRecover();

    if (state.current < amount) {
      // Энергии недостаточно
      return false;
    }

    const newState: EnergyState = {
      ...state,
      current: state.current - amount,
      // Сбрасываем таймер восстановления при первой трате с максимума,
      // чтобы countdown показывал корректное время (а не 0)
      lastRecoveryTime: state.current >= MAX_ENERGY_VALUE() ? Date.now() : state.lastRecoveryTime,
    };

    await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(newState));
    return true;
  } catch (error) {
    DebugLogger.error('energy_system.ts:spendEnergy', error, 'critical');
    return false;
  }
}

/**
 * Восстановить энергию вручную (например, при покупке в премиум или за достижения).
 */
export async function addEnergy(amount: number = 1): Promise<EnergyState> {
  try {
    let state = await getEnergyState();
    const newCurrent = Math.min(state.current + amount, MAX_ENERGY_VALUE());

    state = {
      ...state,
      current: newCurrent,
    };

    await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch (error) {
    DebugLogger.error('energy_system.ts:addEnergy', error, 'critical');
    return await getEnergyState();
  }
}

/**
 * Сбросить энергию на максимум (для тестирования или специальных ситуаций).
 */
export async function resetEnergyToMax(): Promise<EnergyState> {
  try {
    const state: EnergyState = {
      current: MAX_ENERGY_VALUE(),
      lastRecoveryTime: Date.now(),
    };

    await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch (error) {
    DebugLogger.error('energy_system.ts:resetEnergyToMax', error, 'critical');
    return DEFAULT_STATE;
  }
}

/**
 * Вычислить время до следующего восстановления энергии (в миллисекундах).
 * Возвращает 0, если энергия уже на максимуме.
 */
export async function getTimeUntilNextRecovery(): Promise<number> {
  try {
    const [state, recoveryIntervalMs] = await Promise.all([
      checkAndRecover(),
      getCurrentRecoveryIntervalMs(),
    ]);

    if (state.current >= MAX_ENERGY_VALUE()) {
      return 0;
    }

    const timeSinceLastRecovery = Date.now() - state.lastRecoveryTime;
    return Math.max(0, recoveryIntervalMs - timeSinceLastRecovery);
  } catch (error) {
    DebugLogger.error('energy_system.ts:getTimeUntilNextRecovery', error, 'warning');
    return 0;
  }
}

/**
 * Секунд до момента, когда энергия достигнет максимума (чистая функция, для тестов и пушей).
 * = (полных интервалов на недостающие единицы) − (уже прошедший остаток текущего интервала).
 * Возвращает 0, если энергия уже на максимуме.
 */
export function secondsUntilEnergyFull(
  current: number,
  maxEnergy: number,
  recoveryIntervalMs: number,
  lastRecoveryTime: number,
  now: number = Date.now(),
): number {
  if (current >= maxEnergy) return 0;
  if (recoveryIntervalMs <= 0) return 0;
  const missing = maxEnergy - current;
  const elapsedInCurrent = Math.max(0, now - lastRecoveryTime) % recoveryIntervalMs;
  const msUntilFull = missing * recoveryIntervalMs - elapsedInCurrent;
  return Math.max(1, Math.ceil(msUntilFull / 1000));
}

/**
 * Форматировать время до восстановления в читаемый формат (e.g., "1ч 30м 0с", "45с").
 */
export function formatTimeUntilRecovery(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м ${seconds}с`;
  }
  if (minutes > 0) {
    return `${minutes}м ${seconds}с`;
  }
  return `${seconds}с`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
