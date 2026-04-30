/**
 * Streak Wager — пари на стрик.
 * Ставка = осколки 💎. Выигрыш = осколки + XP (половина от старого).
 *
 * Тиры:
 *  0:   1 💎 →  7 дней →  4 💎 +   500 XP
 *  1:   2 💎 → 14 дней →  8 💎 + 1 500 XP
 *  2:   3 💎 → 21 день  → 12 💎 + 2 500 XP
 *  3:   5 💎 → 30 дней  → 20 💎 + 4 000 XP
 *  4:   8 💎 → 50 дней  → 32 💎 + 7 500 XP
 *  5:  15 💎 →100 дней  → 60 💎 +15 000 XP
 *
 * Storage key: 'streak_wager_v2'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import { registerXP } from './xp_manager';
import { spendShards, addShardsRaw } from './shards_system';

const WAGER_DISCOUNT_KEY = 'wager_discount';
/** Преміум: безкоштовна перша ставка після level-up, раз на календарний місяць */
const PREM_WAGER_TOKEN_KEY = 'premium_wager_free_after_levelup_v1';
const PREM_WAGER_MONTH_KEY = 'premium_wager_free_month_issued_v1';

export interface WagerTier {
  tierIdx:        number;
  betShards:      number;
  daysRequired:   number;
  rewardShards:   number;
  rewardXP:       number;
  label:          string;
}

export const WAGER_TIERS: WagerTier[] = [
  { tierIdx: 0, betShards:  1, daysRequired:   7, rewardShards:  4, rewardXP:   500, label: '×4' },
  { tierIdx: 1, betShards:  2, daysRequired:  14, rewardShards:  8, rewardXP:  1500, label: '×4' },
  { tierIdx: 2, betShards:  3, daysRequired:  21, rewardShards: 12, rewardXP:  2500, label: '×4' },
  { tierIdx: 3, betShards:  5, daysRequired:  30, rewardShards: 20, rewardXP:  4000, label: '×4' },
  { tierIdx: 4, betShards:  8, daysRequired:  50, rewardShards: 32, rewardXP:  7500, label: '×4' },
  { tierIdx: 5, betShards: 15, daysRequired: 100, rewardShards: 60, rewardXP: 15000, label: '×4' },
];

export interface WagerState {
  active:         boolean;
  startDate:      string;       // YYYY-MM-DD
  startStreak:    number;
  tierIdx:        number;
  betShards:      number;
  daysRequired:   number;
  rewardShards:   number;
  rewardXP:       number;
  daysKept:       number;
  lastChecked:    string;       // YYYY-MM-DD
  result:         'pending' | 'won' | 'lost';
}

const KEY = 'streak_wager_v2';

const today = () => new Date().toISOString().split('T')[0];

export const loadWager = async (): Promise<WagerState | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveWager = async (w: WagerState) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(w)); } catch {}
};

/**
 * Преміум: один безкоштовний запуск пари в календарному місяці (перше підвищення рівня в місяці).
 */
export async function tryGrantPremiumMonthlyWagerFromLevelUp(): Promise<void> {
  try {
    if (!await getVerifiedPremiumStatus()) return;
    const ym = new Date().toISOString().slice(0, 7);
    const issued = await AsyncStorage.getItem(PREM_WAGER_MONTH_KEY);
    if (issued === ym) return;
    await AsyncStorage.setItem(PREM_WAGER_TOKEN_KEY, '1');
    await AsyncStorage.setItem(PREM_WAGER_MONTH_KEY, ym);
  } catch { /* empty */ }
}

/**
 * Разместить пари выбранного тира.
 * Списывает betShards осколков.
 * Скидка 25% из подарка уровня: ключ wager_discount, одно применение.
 * Преміум-токен: 0 осколків, один раз після level-up (див. tryGrantPremiumMonthlyWagerFromLevelUp).
 * Возвращает false если уже активно пари или недостаточно осколков.
 */
export const placeWager = async (currentStreak: number, tierIdx: number = 0): Promise<boolean> => {
  try {
    if (!Number.isFinite(tierIdx) || tierIdx < 0 || tierIdx >= WAGER_TIERS.length) return false;
    if (!Number.isFinite(currentStreak) || currentStreak < 0) return false;

    const existing = await loadWager();
    if (existing?.active) return false;

    const tier = WAGER_TIERS[tierIdx];
    if (!tier) return false;

    const discRaw = await AsyncStorage.getItem(WAGER_DISCOUNT_KEY);
    const hasDisc = discRaw === '0.25';
    const premiumFree =
      (await getVerifiedPremiumStatus()) &&
      (await AsyncStorage.getItem(PREM_WAGER_TOKEN_KEY)) === '1';

    let toSpend = tier.betShards;
    if (hasDisc) {
      toSpend = Math.max(1, Math.floor(tier.betShards * 0.75));
    }

    if (premiumFree) {
      await AsyncStorage.removeItem(PREM_WAGER_TOKEN_KEY);
    } else {
      const spent = await spendShards(toSpend, 'wager_bet');
      if (!spent) return false;
    }
    if (hasDisc) {
      await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
    }

    const wager: WagerState = {
      active:        true,
      startDate:     today(),
      startStreak:   currentStreak,
      tierIdx:       tier.tierIdx,
      betShards:     tier.betShards,
      daysRequired:  tier.daysRequired,
      rewardShards:  tier.rewardShards,
      rewardXP:      tier.rewardXP,
      daysKept:      0,
      lastChecked:   today(),
      result:        'pending',
    };
    await saveWager(wager);
    return true;
  } catch { return false; }
};

/**
 * Вызывать при updateStreakOnActivity().
 * Возвращает 'won' | 'lost' | null.
 */
export const checkWagerProgress = async (
  currentStreak: number,
): Promise<'won' | 'lost' | null> => {
  try {
    if (!Number.isFinite(currentStreak) || currentStreak < 0) return null;
    const wager = await loadWager();
    if (!wager?.active || wager.result !== 'pending') return null;

    const t = today();
    if (wager.lastChecked === t) return null;

    if (currentStreak < wager.startStreak) {
      await saveWager({ ...wager, active: false, result: 'lost' });
      return 'lost';
    }

    const daysKept = wager.daysKept + 1;

    if (daysKept >= wager.daysRequired) {
      const winUserName = await AsyncStorage.getItem('user_name') || '';
      await addShardsRaw(wager.rewardShards, 'streak_wager_win', {
        showEarnModal: true,
        earnModalKey: 'streak_wager_win',
      });
      await registerXP(wager.rewardXP, 'wager_win', winUserName);
      await saveWager({ ...wager, active: false, result: 'won', daysKept, lastChecked: t });
      return 'won';
    }

    await saveWager({ ...wager, daysKept, lastChecked: t });
    return null;
  } catch { return null; }
};

/** Дней до завершения пари (0 если не активно) */
export const wagerDaysLeft = (wager: WagerState): number => {
  if (!wager.active) return 0;
  return Math.max(0, wager.daysRequired - wager.daysKept);
};

// Required by Expo Router — not a screen
export default {};
