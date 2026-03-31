// ════════════════════════════════════════════════════════════════════════════
// phrasemen_system.ts — Система валюты "Фразмены" (⭐)
// Хранение: AsyncStorage 'phrasemen_state' → PhrasemenState
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

export type TransactionType =
  | 'daily_task'              // Дневные задачи
  | 'streak_bonus'            // Бонус за 7-дневный стрик
  | 'daily_chest'             // Сундук дневной
  | 'ad_watch'                // Просмотр рекламы
  | 'referral'                // Реферальный бонус
  | 'energy_purchase'         // Покупка энергии
  | 'xp_booster_purchase'     // Покупка бустера XP
  | 'profile_frame_purchase'  // Покупка рамки профиля
  | 'premium_purchase'        // Покупка премиума
  | 'adjustment';             // Ручная корректировка

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  reason: string;
  timestamp: number;
  isSpending: boolean;
}

export interface PhrasemenState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastDailyBonus?: number;
  transactions: Transaction[];
}

const STORAGE_KEY = 'phrasemen_state';

// ── Инициализировать или загрузить состояние ───────────────────────────────
const getInitialState = (): PhrasemenState => ({
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  transactions: [],
});

export const loadPhrasemenState = async (): Promise<PhrasemenState> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    const initial = getInitialState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch (error) {
    DebugLogger.error('phrasemen_system.ts:loadPhrasemenState', error, 'critical');
    return getInitialState();
  }
};

// ── Сохранить состояние ────────────────────────────────────────────────────
const savePhrasemenState = async (state: PhrasemenState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    DebugLogger.error('phrasemen_system.ts:savePhrasemenState', error, 'critical');
  }
};

// ── Получить баланс фразменов ──────────────────────────────────────────────
export const getPhrasemenBalance = async (): Promise<number> => {
  const state = await loadPhrasemenState();
  return state.balance;
};

// ── Добавить фразмены ──────────────────────────────────────────────────────
export const addPhrasemen = async (
  amount: number,
  type: TransactionType,
  reason: string,
): Promise<void> => {
  if (amount < 0) {
    throw new Error('Количество фразменов не может быть отрицательным');
  }

  const state = await loadPhrasemenState();
  const newBalance = state.balance + amount;

  const transaction: Transaction = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    amount,
    reason,
    timestamp: Date.now(),
    isSpending: false,
  };

  const updatedState: PhrasemenState = {
    ...state,
    balance: newBalance,
    totalEarned: state.totalEarned + amount,
    transactions: [transaction, ...state.transactions],
  };

  await savePhrasemenState(updatedState);
};

// ── Потратить фразмены (возвращает успех) ─────────────────────────────────
export const spendPhrasemen = async (
  amount: number,
  type: TransactionType,
  reason: string,
): Promise<boolean> => {
  if (amount < 0) {
    throw new Error('Количество фразменов не может быть отрицательным');
  }

  const state = await loadPhrasemenState();

  if (state.balance < amount) {
    return false; // Недостаточно средств
  }

  const newBalance = state.balance - amount;

  const transaction: Transaction = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    amount,
    reason,
    timestamp: Date.now(),
    isSpending: true,
  };

  const updatedState: PhrasemenState = {
    ...state,
    balance: newBalance,
    totalSpent: state.totalSpent + amount,
    transactions: [transaction, ...state.transactions],
  };

  await savePhrasemenState(updatedState);
  return true;
};

// ── Получить историю транзакций ────────────────────────────────────────────
export const getTransactionHistory = async (
  limit: number = 100,
): Promise<Transaction[]> => {
  const state = await loadPhrasemenState();
  return state.transactions.slice(0, limit);
};

// ── Получить статистику ────────────────────────────────────────────────────
export const getPhrasemenStats = async () => {
  const state = await loadPhrasemenState();
  return {
    balance: state.balance,
    totalEarned: state.totalEarned,
    totalSpent: state.totalSpent,
    transactionCount: state.transactions.length,
  };
};

// ── Очистить историю транзакций (опционально, для отладки) ─────────────────
export const clearPhrasemenData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    DebugLogger.error('phrasemen_system.ts:clearPhrasemenData', error, 'warning');
  }
};

// ── Установить последний дневной бонус (для отслеживания стрика) ──────────
export const setLastDailyBonus = async (timestamp: number): Promise<void> => {
  const state = await loadPhrasemenState();
  const updatedState: PhrasemenState = {
    ...state,
    lastDailyBonus: timestamp,
  };
  await savePhrasemenState(updatedState);
};

export const getLastDailyBonus = async (): Promise<number | undefined> => {
  const state = await loadPhrasemenState();
  return state.lastDailyBonus;
};
