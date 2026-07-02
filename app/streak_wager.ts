/**
 * Streak Wager — пари на цепочку дней подряд.
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
import { registerXP } from './xp_manager';
import { getVerifiedPremiumStatus } from './premium_guard';
import { spendShards, addShardsRaw } from './shards_system';
import { trackActivity } from './app_activity';
import { emitAppEvent } from './events';

function logWagerHealth(
  context: string,
  error: unknown,
  tags: Record<string, string | number | boolean | null | undefined> = {},
) {
  void import('./app_health')
    .then(({ logAppWarning }) =>
      logAppWarning(context, error, {
        feature: 'streak_wager',
        screen: 'streak_stats',
        writeToFirestore: true,
        tags,
      }),
    )
    .catch(() => {});
}

const WAGER_DISCOUNT_KEY = 'wager_discount';
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

export async function getEffectiveWagerStake(tierIdx: number): Promise<{
  nominalStake: number;
  stakeToSpend: number;
  hasDiscount: boolean;
  premiumFree: boolean;
}> {
  const tier = WAGER_TIERS[tierIdx];
  if (!tier) {
    return { nominalStake: 0, stakeToSpend: 0, hasDiscount: false, premiumFree: false };
  }

  // Скидка 25%: одноразовая из подарка уровня (ключ) ИЛИ постоянная для Plus.
  const [discRaw, isPremium] = await Promise.all([
    AsyncStorage.getItem(WAGER_DISCOUNT_KEY),
    getVerifiedPremiumStatus().catch(() => false),
  ]);
  const hasDiscount = discRaw === '0.25' || isPremium;
  const discountedStake = hasDiscount
    ? Math.max(1, Math.floor(tier.betShards * 0.75))
    : tier.betShards;

  return {
    nominalStake: tier.betShards,
    stakeToSpend: discountedStake,
    hasDiscount,
    premiumFree: false,
  };
}

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

const safeWagerEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

export const loadWager = async (): Promise<WagerState | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WagerState) : null;
  } catch { return null; }
};

const saveWager = async (w: WagerState) => {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(w)); } catch {}
};

/**
 * Legacy cleanup: wagers always charge their effective shard stake.
 */
export async function tryGrantPremiumMonthlyWagerFromLevelUp(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([PREM_WAGER_TOKEN_KEY, PREM_WAGER_MONTH_KEY]);
  } catch { /* empty */ }
}

/**
 * Разместить пари выбранного тира.
 * Списывает betShards осколков.
 * Скидка 25% из подарка уровня: ключ wager_discount, одно применение.
 * Возвращает false если уже активно пари или недостаточно осколков.
 */
export const placeWager = async (currentStreak: number, tierIdx: number = 0): Promise<boolean> => {
  try {
    await trackActivity('streak_wager:place_start', {
      feature: 'streak_wager',
      screen: 'streak_stats',
      result: 'start',
      tags: { currentStreak, tierIdx },
    });
    if (!Number.isFinite(tierIdx) || tierIdx < 0 || tierIdx >= WAGER_TIERS.length) {
      await trackActivity('streak_wager:place_blocked', {
        feature: 'streak_wager',
        screen: 'streak_stats',
        result: 'blocked',
        tags: { reason: 'invalid_tier', currentStreak, tierIdx },
      });
      logWagerHealth('streak_wager:place_invalid_tier', new Error('Invalid wager tier'), { currentStreak, tierIdx });
      return false;
    }
    if (!Number.isFinite(currentStreak) || currentStreak < 0) {
      await trackActivity('streak_wager:place_blocked', {
        feature: 'streak_wager',
        screen: 'streak_stats',
        result: 'blocked',
        tags: { reason: 'invalid_streak', currentStreak, tierIdx },
      });
      logWagerHealth('streak_wager:place_invalid_streak', new Error('Invalid current streak'), { currentStreak, tierIdx });
      return false;
    }

    const existing = await loadWager();
    if (existing?.active) {
      await trackActivity('streak_wager:place_blocked', {
        feature: 'streak_wager',
        screen: 'streak_stats',
        result: 'blocked',
        tags: { reason: 'already_active', activeTierIdx: existing.tierIdx, currentStreak, tierIdx },
      });
      return false;
    }

    const tier = WAGER_TIERS[tierIdx];
    if (!tier) {
      logWagerHealth('streak_wager:place_missing_tier', new Error('Wager tier missing'), { currentStreak, tierIdx });
      return false;
    }

    const [discRaw, legacyPremiumFreeToken, isPremium] = await Promise.all([
      AsyncStorage.getItem(WAGER_DISCOUNT_KEY),
      AsyncStorage.getItem(PREM_WAGER_TOKEN_KEY),
      getVerifiedPremiumStatus().catch(() => false),
    ]);
    // Одноразовая скидка из подарка уровня ИЛИ постоянная Plus-скидка (не расходуется).
    const hasGiftDisc = discRaw === '0.25';
    const hasDisc = hasGiftDisc || isPremium;

    let toSpend = tier.betShards;
    if (hasDisc) {
      toSpend = Math.max(1, Math.floor(tier.betShards * 0.75));
    }

    const spent = await spendShards(toSpend, 'wager_bet');
    if (!spent) {
      await trackActivity('streak_wager:place_blocked', {
        feature: 'streak_wager',
        screen: 'streak_stats',
        result: 'blocked',
        tags: { reason: 'insufficient_shards_or_spend_failed', tierIdx, toSpend, hasDisc, premiumFree: false },
      });
      logWagerHealth('streak_wager:spend_failed', new Error('spendShards returned false'), {
        currentStreak,
        tierIdx,
        toSpend,
        hasDisc,
        premiumFree: false,
      });
      return false;
    }
    if (legacyPremiumFreeToken === '1') {
      await AsyncStorage.multiRemove([PREM_WAGER_TOKEN_KEY, PREM_WAGER_MONTH_KEY]);
    }
    if (hasGiftDisc && !isPremium) {
      // Подарочную скидку расходуем только когда она реально понадобилась:
      // у Plus скидка постоянная — подарок остаётся до конца подписки.
      await AsyncStorage.removeItem(WAGER_DISCOUNT_KEY);
    }

    const wager: WagerState = {
      active:        true,
      startDate:     today(),
      startStreak:   currentStreak,
      tierIdx:       tier.tierIdx,
      betShards:     toSpend,
      daysRequired:  tier.daysRequired,
      rewardShards:  tier.rewardShards,
      rewardXP:      tier.rewardXP,
      daysKept:      0,
      lastChecked:   today(),
      result:        'pending',
    };
    await saveWager(wager);
    await trackActivity('streak_wager:place_success', {
      feature: 'streak_wager',
      screen: 'streak_stats',
      result: 'success',
      tags: { currentStreak, tierIdx, betShards: tier.betShards, toSpend, hasDisc, premiumFree: false },
    });
    return true;
  } catch (e) {
    logWagerHealth('streak_wager:place_failed', e, { currentStreak, tierIdx });
    await trackActivity('streak_wager:place_error', {
      feature: 'streak_wager',
      screen: 'streak_stats',
      result: 'error',
      tags: { currentStreak, tierIdx, error: e instanceof Error ? e.message : String(e) },
    });
    return false;
  }
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

    // Непрерывность: к этому чеку цепочка обязана быть не короче стартовой плюс все
    // засчитанные дни плюс сегодняшний. Иначе была дыра (сравнение только со startStreak
    // делало пари непроигрываемым при startStreak 0-1 и засчитывало несмежные дни).
    if (currentStreak < wager.startStreak + wager.daysKept + 1) {
      await saveWager({ ...wager, active: false, result: 'lost', lastChecked: t });
      return 'lost';
    }

    const daysKept = wager.daysKept + 1;

    if (daysKept >= wager.daysRequired) {
      const winUserName = await AsyncStorage.getItem('user_name') || '';
      const xpResult = await registerXP(wager.rewardXP, 'wager_win', winUserName, 'ru', undefined, {
        eventId: [
          'wager',
          safeWagerEventPart(wager.startDate, 20),
          String(wager.tierIdx),
          String(wager.daysRequired),
          'win',
        ].join(':'),
        payload: {
          tierIdx: wager.tierIdx,
          startDate: wager.startDate,
          daysRequired: wager.daysRequired,
          daysKept,
          rewardShards: wager.rewardShards,
        },
      });
      if (Math.max(0, Math.round(xpResult.finalDelta || 0)) <= 0) {
        throw new Error('wager_win_xp_not_confirmed');
      }
      await addShardsRaw(wager.rewardShards, 'streak_wager_win', {
        showEarnModal: true,
        earnModalKey: 'streak_wager_win',
      });
      await saveWager({ ...wager, active: false, result: 'won', daysKept, lastChecked: t });
      return 'won';
    }

    await saveWager({ ...wager, daysKept, lastChecked: t });
    return null;
  } catch { return null; }
};

/**
 * Вызывать после восстановления цепочки через Revive или любого другого механизма,
 * прерывающего последовательность дней. Цепочка была нарушена — пари проиграно.
 */
export const invalidateWagerAfterRevive = async (): Promise<void> => {
  try {
    const wager = await loadWager();
    if (!wager?.active || wager.result !== 'pending') return;
    await saveWager({ ...wager, active: false, result: 'lost' });
    emitAppEvent('wager_lost', { reason: 'revive' });
  } catch (e) {
    logWagerHealth('streak_wager:invalidate_after_revive', e);
  }
};

/**
 * Стереть завершённое пари из storage (кнопка «Принять новое пари? → Да»).
 * Без этого карточка результата воскресала после каждого фокуса экрана.
 * Активное пари не трогает.
 */
export const clearFinishedWager = async (): Promise<void> => {
  try {
    const wager = await loadWager();
    if (!wager || wager.active) return;
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    logWagerHealth('streak_wager:clear_finished', e);
  }
};

/** Дней до завершения пари (0 если не активно) */
export const wagerDaysLeft = (wager: WagerState): number => {
  if (!wager.active) return 0;
  return Math.max(0, wager.daysRequired - wager.daysKept);
};

// Required by Expo Router — not a screen
export default {};
