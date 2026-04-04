/**
 * Streak Wager — пари на стрик.
 *
 * Тиры:
 *  0: 100 XP → 7 дней → x2  (выиграть 200 XP)
 *  1: 200 XP → 8 дней → x2  (выиграть 400 XP)
 *  2: 300 XP → 9 дней → x2  (выиграть 600 XP)
 *  3: 400 XP → 10 дней → x2 (выиграть 800 XP)
 *
 * Storage key: 'streak_wager_v2'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerXP } from './xp_manager';

export interface WagerTier {
  tierIdx:      number;
  betXP:        number;
  daysRequired: number;
  multiplier:   number;
  rewardXP:     number;
  label:        string;  // '2x' | '4x' | '6x' | '8x'
}

export const WAGER_TIERS: WagerTier[] = [
  { tierIdx: 0, betXP: 100, daysRequired: 7,  multiplier: 2, rewardXP: 200, label: '×2' },
  { tierIdx: 1, betXP: 200, daysRequired: 8,  multiplier: 2, rewardXP: 400, label: '×2' },
  { tierIdx: 2, betXP: 300, daysRequired: 9,  multiplier: 2, rewardXP: 600, label: '×2' },
  { tierIdx: 3, betXP: 400, daysRequired: 10, multiplier: 2, rewardXP: 800, label: '×2' },
];

export interface WagerState {
  active:       boolean;
  startDate:    string;       // YYYY-MM-DD
  startStreak:  number;
  tierIdx:      number;
  betXP:        number;
  daysRequired: number;
  rewardXP:     number;
  daysKept:     number;
  lastChecked:  string;       // YYYY-MM-DD
  result:       'pending' | 'won' | 'lost';
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
 * Разместить пари выбранного тира.
 * Вычитает betXP сразу.
 * Возвращает false если уже активно пари или недостаточно XP.
 */
export const placeWager = async (currentStreak: number, tierIdx: number = 0): Promise<boolean> => {
  try {
    // Input validation
    if (!Number.isFinite(tierIdx) || tierIdx < 0 || tierIdx >= WAGER_TIERS.length) return false;
    if (!Number.isFinite(currentStreak) || currentStreak < 0) return false;

    const existing = await loadWager();
    if (existing?.active) return false;

    const tier = WAGER_TIERS[tierIdx];
    if (!tier) return false;

    const xpRaw = await AsyncStorage.getItem('user_total_xp');
    const currentXP = parseInt(xpRaw || '0') || 0;
    if (currentXP < tier.betXP) return false;
    
    const betUserName = await AsyncStorage.getItem('user_name') || '';
    await registerXP(-tier.betXP, 'wager_bet', betUserName);
    
    const wager: WagerState = {
      active:       true,
      startDate:    today(),
      startStreak:  currentStreak,
      tierIdx:      tier.tierIdx,
      betXP:        tier.betXP,
      daysRequired: tier.daysRequired,
      rewardXP:     tier.rewardXP,
      daysKept:     0,
      lastChecked:  today(),
      result:       'pending',
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
