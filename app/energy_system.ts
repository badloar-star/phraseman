import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { getVerifiedPremiumStatus } from './premium_guard';

export interface EnergyState {
  current: number;
  lastRecoveryTime: number;
}

const ENERGY_STORAGE_KEY = 'energy_state';
const MAX_ENERGY = 5;
const RECOVERY_INTERVAL_MS = 30 * 60 * 1000; // 30 минут в миллисекундах
const ENERGY_PER_LESSON = 1;

const DEFAULT_STATE: EnergyState = {
  current: MAX_ENERGY,
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
    return parsed;
  } catch (error) {
    DebugLogger.error('energy_system.ts:getEnergyState', error, 'critical');
    return DEFAULT_STATE;
  }
}

/**
 * Проверить и применить восстановление энергии (автоматически).
 * Восстанавливает +1 энергию каждые 2 часа до максимума.
 * Возвращает обновленное состояние.
 */
export async function checkAndRecover(): Promise<EnergyState> {
  try {
    let state = await getEnergyState();
    const now = Date.now();
    const timeSinceLastRecovery = now - state.lastRecoveryTime;

    // Проверяем, прошло ли достаточно времени для восстановления
    if (timeSinceLastRecovery >= RECOVERY_INTERVAL_MS) {
      // Вычисляем, сколько полных периодов восстановления прошло
      const recoveryCount = Math.floor(timeSinceLastRecovery / RECOVERY_INTERVAL_MS);
      const newCurrent = Math.min(state.current + recoveryCount, MAX_ENERGY);

      state = {
        ...state,
        current: newCurrent,
        lastRecoveryTime: now,
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
      lastRecoveryTime: state.current >= MAX_ENERGY ? Date.now() : state.lastRecoveryTime,
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
    const newCurrent = Math.min(state.current + amount, MAX_ENERGY);

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
      current: MAX_ENERGY,
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
    // checkAndRecover нужен чтобы применить прошедшие периоды восстановления
    // и получить корректный lastRecoveryTime для расчёта таймера
    const state = await checkAndRecover();

    if (state.current >= MAX_ENERGY) {
      return 0;
    }

    const timeSinceLastRecovery = Date.now() - state.lastRecoveryTime;
    const timeUntilNextRecovery = RECOVERY_INTERVAL_MS - timeSinceLastRecovery;

    return Math.max(0, timeUntilNextRecovery);
  } catch (error) {
    DebugLogger.error('energy_system.ts:getTimeUntilNextRecovery', error, 'warning');
    return 0;
  }
}

/**
 * Форматировать время до восстановления в читаемый формат (e.g., "1ч 30м").
 */
export function formatTimeUntilRecovery(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
