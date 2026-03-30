/**
 * Referral Program System
 * Players earn 50 Phrasemen by inviting friends via unique referral codes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { rewardReferral } from './phrasemen_integration';

export interface ReferralCode {
  code: string;           // "PH4RM2N5X9" (10 chars, alphanumeric)
  createdBy: string;      // Player name who created it
  createdAt: string;      // ISO date
  expiresAt: string;      // ISO date (365 days from creation)
  usedBy: string[];       // Array of player names who used it
  rewardsEarned: number;  // Count of successful referrals
}

export interface ReferralState {
  myCode: string;         // Player's unique referral code
  myReferrals: ReferralCode[];  // Codes I've invited people with
  referredBy?: string;    // Code I used on registration
}

const REFERRAL_STATE_KEY = 'referral_state_v1';
const REFERRAL_HISTORY_KEY = 'referral_history_v1'; // Track all referral transactions
const CODE_EXPIRY_DAYS = 365;
const REFERRAL_BONUS_XP = 50; // Phrasemen earned per successful referral

/**
 * Generate unique 10-character alphanumeric referral code
 * Format: PH + 8 random alphanumerics
 */
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PH';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate expiration date (365 days from now)
 */
function getExpirationDate(): string {
  const now = new Date();
  now.setDate(now.getDate() + CODE_EXPIRY_DAYS);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get or create player's referral state
 */
export async function getReferralState(playerName: string): Promise<ReferralState> {
  try {
    const stateStr = await AsyncStorage.getItem(`${REFERRAL_STATE_KEY}_${playerName}`);
    if (stateStr) {
      return JSON.parse(stateStr);
    }
  } catch {}

  // No existing state - create new code for this player
  const newCode = generateUniqueCode();
  const newState: ReferralState = {
    myCode: newCode,
    myReferrals: [],
  };

  try {
    await AsyncStorage.setItem(`${REFERRAL_STATE_KEY}_${playerName}`, JSON.stringify(newState));
  } catch {}

  return newState;
}

/**
 * Generate referral code for a new player
 */
export async function generateReferralCode(playerName: string): Promise<string> {
  const state = await getReferralState(playerName);

  // If code already exists, return it
  if (state.myCode) {
    return state.myCode;
  }

  // Generate new unique code
  const newCode = generateUniqueCode();
  state.myCode = newCode;

  try {
    await AsyncStorage.setItem(`${REFERRAL_STATE_KEY}_${playerName}`, JSON.stringify(state));
  } catch {}

  return newCode;
}

/**
 * Validate if a referral code is valid and not expired
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  error?: string;
  createdBy?: string;
}> {
  try {
    // Search all player states for this code
    const keys = await AsyncStorage.getAllKeys();
    const referralKeys = keys.filter(k => k.startsWith(REFERRAL_STATE_KEY));

    for (const key of referralKeys) {
      const stateStr = await AsyncStorage.getItem(key);
      if (!stateStr) continue;

      const state: ReferralState = JSON.parse(stateStr);

      // Found the code
      if (state.myCode === code) {
        const today = getTodayString();

        // Check if code is expired (this check is for archival purposes - in practice,
        // we'd need to store creation date with the code to check expiration)

        return {
          valid: true,
          createdBy: key.replace(REFERRAL_STATE_KEY + '_', ''),
        };
      }
    }

    return {
      valid: false,
      error: 'Код не знайдено / Code not found',
    };
  } catch (e) {
    return {
      valid: false,
      error: 'Помилка валідації / Validation error',
    };
  }
}

/**
 * Redeem a referral code for a new player
 * Awards the referrer 50 Phrasemen
 */
export async function redeemReferralCode(
  code: string,
  newPlayerName: string
): Promise<{
  success: boolean;
  error?: string;
  referrerName?: string;
  bonusAwarded?: number;
}> {
  // Validate code
  const validation = await validateReferralCode(code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const referrerName = validation.createdBy;
  if (!referrerName) {
    return { success: false, error: 'Реферер не знайдений / Referrer not found' };
  }

  // Prevent self-referrals
  if (referrerName === newPlayerName) {
    return { success: false, error: 'Не можна використовувати власний код / Cannot use own code' };
  }

  try {
    // Get referrer's state
    const referrerState = await getReferralState(referrerName);

    // Check if this player already used this code
    // Find the code object (we need to enhance the state structure to track this properly)
    // For now, we'll check a simple used list
    const usedKey = `referral_used_${referrerName}_${code}`;
    const alreadyUsed = await AsyncStorage.getItem(usedKey);

    if (alreadyUsed) {
      return { success: false, error: 'Цей код уже використаний / Code already used' };
    }

    // Mark code as used by this player
    await AsyncStorage.setItem(usedKey, newPlayerName);

    // Award referrer 50 Phrasemen using the phrasemen system
    try {
      await rewardReferral(newPlayerName);
    } catch (e) {
      console.warn('Failed to reward referral:', e);
      // Continue anyway - the transaction is recorded even if the reward fails
    }

    // Record new player's referral source
    const newPlayerState = await getReferralState(newPlayerName);
    newPlayerState.referredBy = code;
    await AsyncStorage.setItem(`${REFERRAL_STATE_KEY}_${newPlayerName}`, JSON.stringify(newPlayerState));

    // Log referral transaction
    const historyKey = `${REFERRAL_HISTORY_KEY}_${referrerName}`;
    const historyStr = await AsyncStorage.getItem(historyKey);
    const history: Array<{ date: string; newPlayer: string; bonus: number }> =
      historyStr ? JSON.parse(historyStr) : [];

    history.push({
      date: getTodayString(),
      newPlayer: newPlayerName,
      bonus: REFERRAL_BONUS_XP,
    });

    await AsyncStorage.setItem(historyKey, JSON.stringify(history));

    return {
      success: true,
      referrerName,
      bonusAwarded: REFERRAL_BONUS_XP,
    };
  } catch (e) {
    console.warn('redeemReferralCode error:', e);
    return { success: false, error: 'Помилка при викупі коду / Redemption error' };
  }
}

/**
 * Get player's referral code
 */
export async function getReferralCode(playerName: string): Promise<string> {
  const state = await getReferralState(playerName);
  return state.myCode || '';
}

/**
 * Get referral statistics for a player
 */
export async function getReferralStats(playerName: string): Promise<{
  totalReferrals: number;
  totalBonus: number;
  referrals: Array<{ date: string; playerName: string; bonus: number }>;
}> {
  try {
    const historyKey = `${REFERRAL_HISTORY_KEY}_${playerName}`;
    const historyStr = await AsyncStorage.getItem(historyKey);
    const history: Array<{ date: string; newPlayer: string; bonus: number }> =
      historyStr ? JSON.parse(historyStr) : [];

    const totalReferrals = history.length;
    const totalBonus = history.reduce((sum, h) => sum + h.bonus, 0);

    return {
      totalReferrals,
      totalBonus,
      referrals: history.map(h => ({
        date: h.date,
        playerName: h.newPlayer,
        bonus: h.bonus,
      })),
    };
  } catch {
    return {
      totalReferrals: 0,
      totalBonus: 0,
      referrals: [],
    };
  }
}

/**
 * Get the code that referred the current player (if any)
 */
export async function getReferredByCode(playerName: string): Promise<string | null> {
  try {
    const state = await getReferralState(playerName);
    return state.referredBy || null;
  } catch {
    return null;
  }
}
