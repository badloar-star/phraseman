/**
 * Variable Reward System - XP бонусы с вероятностными тиерами
 *
 * Используется для мотивации через случайные вознаграждения:
 * - 10% шанс: +0-10 XP
 * - 5% шанс: +10-20 XP
 * - 3% шанс: +20-30 XP
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface XPRewardResult {
  baseXP: number;
  bonusXP: number;
  totalXP: number;
  hasBonusWon: boolean;
  bonusInfo?: {
    tier: 'small' | 'medium' | 'large';
    percentage: number;
    range: string;
  };
}

/**
 * Daily Treasure Chest State
 */
export interface DailyTreasureState {
  lastOpenDate: string; // YYYY-MM-DD
  totalChestsOpened: number;
  premiumChestsUsed: number; // 0-2 per day, resets daily
  totalBonusXPWon: number;
  lastPremiumResetDate?: string; // Track when premium chest count was last reset
}

export interface TreasureOpenResult {
  bonusXP: number;
  canOpenMore: boolean;
  requiresPremium: boolean;
  bonusInfo?: {
    tier: 'small' | 'medium' | 'large';
    percentage: number;
    range: string;
  };
}

/**
 * Вычисляет случайный XP бонус на основе вероятностных тиеров
 * Возвращает 0 если бонус не выигран (82% вероятность)
 */
export function calculateRandomBonus(): number {
  const rand = Math.random() * 100;

  // 10% шанс: +0-10 бонуса
  if (rand < 10) {
    return Math.floor(Math.random() * 11); // 0-10 включительно
  }

  // 5% шанс: +10-20 бонуса (15% общий порог)
  if (rand < 15) {
    return 10 + Math.floor(Math.random() * 11); // 10-20 включительно
  }

  // 3% шанс: +20-30 бонуса (18% общий порог)
  if (rand < 18) {
    return 20 + Math.floor(Math.random() * 11); // 20-30 включительно
  }

  // 82% шанс: нет бонуса
  return 0;
}

/**
 * Вычисляет информацию о тиере бонуса для отображения
 */
function getBonusTierInfo(bonusXP: number): XPRewardResult['bonusInfo'] {
  if (bonusXP === 0) return undefined;

  if (bonusXP <= 10) {
    return {
      tier: 'small',
      percentage: 10,
      range: '0-10',
    };
  }

  if (bonusXP <= 20) {
    return {
      tier: 'medium',
      percentage: 5,
      range: '10-20',
    };
  }

  return {
    tier: 'large',
    percentage: 3,
    range: '20-30',
  };
}

/**
 * Основная функция для расчёта XP с переменной наградой
 * Вызывается после завершения урока/квиза с оценкой >= 4.5
 */
export function calculateRewardWithBonus(baseXP: number): XPRewardResult {
  const bonusXP = calculateRandomBonus();
  const totalXP = baseXP + bonusXP;
  const hasBonusWon = bonusXP > 0;

  return {
    baseXP,
    bonusXP,
    totalXP,
    hasBonusWon,
    bonusInfo: getBonusTierInfo(bonusXP),
  };
}

/**
 * Вспомогательная функция для получения доступного тиера
 * (для UI уведомлений и аналитики)
 */
export function getTierLabel(
  bonusXP: number,
): 'small' | 'medium' | 'large' | 'none' {
  if (bonusXP === 0) return 'none';
  if (bonusXP <= 10) return 'small';
  if (bonusXP <= 20) return 'medium';
  return 'large';
}

/**
 * Получает текущее состояние ежедневного сундука
 */
export async function getTreasureChestState(): Promise<DailyTreasureState> {
  try {
    const stateStr = await AsyncStorage.getItem('daily_treasure_state');
    if (!stateStr) {
      return {
        lastOpenDate: '',
        totalChestsOpened: 0,
        premiumChestsUsed: 0,
        totalBonusXPWon: 0,
      };
    }
    return JSON.parse(stateStr);
  } catch {
    return {
      lastOpenDate: '',
      totalChestsOpened: 0,
      premiumChestsUsed: 0,
      totalBonusXPWon: 0,
    };
  }
}

/**
 * Получает сегодняшнюю дату в формате YYYY-MM-DD
 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Проверяет, может ли игрок открыть бесплатный сундук сегодня
 */
export async function canOpenTreasureChest(): Promise<boolean> {
  const state = await getTreasureChestState();
  const today = getTodayString();
  return state.lastOpenDate !== today;
}

/**
 * Открывает ежедневный сундук и возвращает бонус XP
 * Бесплатно один раз в день, премиум пользователи могут открыть до 2 раз (3-й требует платежа)
 */
export async function openTreasureChest(isPremium: boolean = false): Promise<TreasureOpenResult | null> {
  const state = await getTreasureChestState();
  const today = getTodayString();

  // Проверяем, нужен ли сброс счетчика премиум сундуков
  if (state.lastPremiumResetDate !== today) {
    state.premiumChestsUsed = 0;
    state.lastPremiumResetDate = today;
  }

  // Проверяем, может ли открыть
  const isFirstFreeOpen = state.lastOpenDate !== today;

  if (!isFirstFreeOpen && !isPremium) {
    // Уже открыл бесплатный сундук сегодня
    return null;
  }

  if (!isFirstFreeOpen && isPremium && state.premiumChestsUsed >= 2) {
    // Уже использовал 2 премиум сундука сегодня
    return null;
  }

  // Генерируем бонус
  const bonusXP = calculateRandomBonus();
  const bonusInfo = getBonusTierInfo(bonusXP);

  // Обновляем состояние
  state.lastOpenDate = today;
  state.totalChestsOpened += 1;
  state.totalBonusXPWon += bonusXP;

  if (!isFirstFreeOpen) {
    state.premiumChestsUsed += 1;
  }

  try {
    await AsyncStorage.setItem('daily_treasure_state', JSON.stringify(state));
  } catch (e) {
    // removed console.warn
  }

  return {
    bonusXP,
    canOpenMore: isPremium && state.premiumChestsUsed < 2,
    requiresPremium: !isFirstFreeOpen,
    bonusInfo,
  };
}

/**
 * Получает статистику ежедневного сундука для отображения
 */
export async function getTreasureStats(): Promise<{ totalOpened: number; totalBonusXP: number }> {
  const state = await getTreasureChestState();
  return {
    totalOpened: state.totalChestsOpened,
    totalBonusXP: state.totalBonusXPWon,
  };
}
