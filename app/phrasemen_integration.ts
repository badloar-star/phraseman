// ════════════════════════════════════════════════════════════════════════════
// phrasemen_integration.ts — Интеграция фразменов с системой
// Автоматическая выдача фразменов при выполнении задач
// ════════════════════════════════════════════════════════════════════════════
import {
  addPhrasemen,
  spendPhrasemen,
  getPhrasemenBalance,
  setLastDailyBonus,
  getLastDailyBonus,
} from './phrasemen_system';
import { getTaskById } from './daily_tasks';

// ── Выдать награду за выполненную задачу ───────────────────────────────────
export const rewardPhrasemenForTask = async (taskId: string): Promise<void> => {
  const task = getTaskById(taskId);
  if (!task) {
    // removed console.warn
    return;
  }

  const reward = task.phrasemenReward;
  if (reward > 0) {
    await addPhrasemen(reward, 'daily_task', `Награда за задачу: ${task.titleRU}`);
  }
};

// ── Проверить и выдать бонус за 7-дневный стрик ────────────────────────────
export const checkAndRewardStreakBonus = async (currentStreak: number): Promise<void> => {
  if (currentStreak % 7 === 0 && currentStreak > 0) {
    const STREAK_BONUS = 10;
    await addPhrasemen(
      STREAK_BONUS,
      'streak_bonus',
      `Бонус за ${currentStreak}-дневный стрик`,
    );
  }
};

// ── Проверить дневной бонус (раз в день) ──────────────────────────────────
export const checkAndRewardDailyBonus = async (): Promise<boolean> => {
  const now = Date.now();
  const lastBonus = await getLastDailyBonus();

  // Если бонус был выдан менее чем 24 часа назад, не выдаём его снова
  if (lastBonus) {
    const dayInMs = 24 * 60 * 60 * 1000;
    if (now - lastBonus < dayInMs) {
      return false; // Бонус уже был выдан сегодня
    }
  }

  // Выдаём дневной бонус
  const DAILY_BONUS = 5;
  await addPhrasemen(DAILY_BONUS, 'daily_active', 'Дневной бонус за вход в приложение');
  await setLastDailyBonus(now);

  return true;
};

// ── Потратить фразмены на энергию (10 = +5 энергии) ────────────────────────
export const buyEnergy = async (
  amountNeeded: number, // сколько энергии нужно
): Promise<boolean> => {
  const ENERGY_COST_PER_5 = 10; // 10 фразменов за 5 энергии
  const totalCost = Math.ceil((amountNeeded / 5) * ENERGY_COST_PER_5);

  const success = await spendPhrasemen(totalCost, 'energy_purchase', `Покупка ${amountNeeded} энергии`);
  return success;
};

// ── Потратить фразмены на XP бустер ───────────────────────────────────────
export const buyXPBooster = async (durationMinutes: number): Promise<boolean> => {
  let cost = 0;

  // Цены на бустер x2 XP
  if (durationMinutes === 30) {
    cost = 15;
  } else if (durationMinutes === 60) {
    cost = 25;
  } else if (durationMinutes === 1440) {
    // 24 часа
    cost = 50;
  } else {
    throw new Error(`Неподдерживаемая длительность бустера: ${durationMinutes} минут`);
  }

  const success = await spendPhrasemen(
    cost,
    'xp_booster_purchase',
    `Бустер x2 XP на ${durationMinutes} минут`,
  );
  return success;
};

// ── Потратить фразмены на рамку профиля ────────────────────────────────────
export const buyProfileFrame = async (frameName: string): Promise<boolean> => {
  const framePrices: Record<string, number> = {
    gold: 50,
    diamond: 100,
    platinum: 150,
  };

  const cost = framePrices[frameName.toLowerCase()];
  if (cost === undefined) {
    throw new Error(`Неизвестная рамка профиля: ${frameName}`);
  }

  const success = await spendPhrasemen(cost, 'profile_frame_purchase', `Рамка профиля: ${frameName}`);
  return success;
};

// ── Потратить фразмены на премиум ──────────────────────────────────────────
export const buyPremium = async (): Promise<boolean> => {
  const PREMIUM_COST = 99;
  const success = await spendPhrasemen(PREMIUM_COST, 'premium_purchase', 'Премиум подписка (месяц)');
  return success;
};

// ── Потратить фразмены на просмотр рекламы ────────────────────────────────
export const rewardAdWatch = async (): Promise<void> => {
  const AD_REWARD = 5;
  await addPhrasemen(AD_REWARD, 'ad_watch', 'Награда за просмотр рекламы');
};

// ── Потратить фразмены на реферального бонуса ─────────────────────────────
export const rewardReferral = async (referredUserName: string): Promise<void> => {
  const REFERRAL_REWARD = 50;
  await addPhrasemen(REFERRAL_REWARD, 'referral', `Реферальный бонус за приглашение: ${referredUserName}`);
};

// ── Получить доступные действия в магазине на основе баланса ───────────────
export const getAvailableShopActions = async (): Promise<{
  canBuySmallEnergy: boolean;
  canBuyMediumEnergy: boolean;
  canBuyLargeEnergy: boolean;
  canBuyXPBoosterShort: boolean;
  canBuyXPBoosterMedium: boolean;
  canBuyXPBoosterLong: boolean;
  canBuyFrameGold: boolean;
  canBuyFrameDiamond: boolean;
  canBuyFramePlatinum: boolean;
  canBuyPremium: boolean;
}> => {
  const balance = await getPhrasemenBalance();

  return {
    canBuySmallEnergy: balance >= 10,
    canBuyMediumEnergy: balance >= 25,
    canBuyLargeEnergy: balance >= 50,
    canBuyXPBoosterShort: balance >= 15,
    canBuyXPBoosterMedium: balance >= 25,
    canBuyXPBoosterLong: balance >= 50,
    canBuyFrameGold: balance >= 50,
    canBuyFrameDiamond: balance >= 100,
    canBuyFramePlatinum: balance >= 150,
    canBuyPremium: balance >= 99,
  };
};
