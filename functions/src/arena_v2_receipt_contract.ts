import type { ArenaXpBreakdown } from './arena_xp';

export type ArenaV2ReceiptReward = Readonly<{
  starsEarned: number;
  xpEarned: number;
  xpBreakdown?: ArenaXpBreakdown;
  totalXpAfter: number;
  seasonStarsAfter: number;
  ratingDelta: number;
  ratingAfter: number;
  rankAfter: number;
  spinAwarded: boolean;
  walletBalanceAfter: number;
  masteryStarsEarned: number;
  spinReceiptId?: string;
}>;

const REQUIRED_REWARD_KEYS = [
  'starsEarned',
  'xpEarned',
  'totalXpAfter',
  'seasonStarsAfter',
  'ratingDelta',
  'ratingAfter',
  'rankAfter',
  'spinAwarded',
  'walletBalanceAfter',
  'masteryStarsEarned',
] as const;

const OPTIONAL_REWARD_KEYS = ['xpBreakdown', 'spinReceiptId'] as const;
const BREAKDOWN_KEYS = [
  'schemaVersion',
  'baseXp',
  'correctBonusXp',
  'outcomeBonusXp',
  'totalXp',
] as const;

function invalid(): never {
  throw new Error('arena_v2_receipt_reward_invalid');
}

function safeInteger(value: unknown, min = 0): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min;
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[]): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function validBreakdown(value: unknown, xpEarned: number): value is ArenaXpBreakdown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const breakdown = value as Record<string, unknown>;
  if (!exactKeys(breakdown, BREAKDOWN_KEYS, [])) return false;
  if (breakdown.schemaVersion !== 'arena-xp-breakdown.v1') return false;
  if (!safeInteger(breakdown.baseXp)
    || !safeInteger(breakdown.correctBonusXp)
    || !safeInteger(breakdown.outcomeBonusXp)
    || !safeInteger(breakdown.totalXp)) return false;
  return breakdown.baseXp + breakdown.correctBonusXp + breakdown.outcomeBonusXp === breakdown.totalXp
    && breakdown.totalXp === xpEarned;
}

/**
 * Canonical persisted shape for `users/{uid}/arena_v2_receipts/{matchId}.reward`.
 *
 * The private breakdown is server-authored evidence, not a client-computed
 * estimate. Reconstructing the object key-by-key prevents a future callable
 * input or incidental property from being spread into an owner-visible receipt.
 */
export function arenaV2ReceiptReward(input: ArenaV2ReceiptReward): ArenaV2ReceiptReward {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  const raw = input as Record<string, unknown>;
  if (!exactKeys(raw, REQUIRED_REWARD_KEYS, OPTIONAL_REWARD_KEYS)) invalid();
  if (!safeInteger(raw.starsEarned)
    || !safeInteger(raw.xpEarned)
    || !safeInteger(raw.totalXpAfter)
    || !safeInteger(raw.seasonStarsAfter)
    || !safeInteger(raw.ratingDelta, Number.MIN_SAFE_INTEGER)
    || !safeInteger(raw.ratingAfter)
    || !safeInteger(raw.rankAfter)
    || typeof raw.spinAwarded !== 'boolean'
    || !safeInteger(raw.walletBalanceAfter)
    || !safeInteger(raw.masteryStarsEarned)) invalid();
  if (raw.xpBreakdown !== undefined && !validBreakdown(raw.xpBreakdown, raw.xpEarned)) invalid();
  if (raw.spinReceiptId !== undefined
    && (typeof raw.spinReceiptId !== 'string'
      || raw.spinReceiptId.length < 1
      || raw.spinReceiptId.length > 160)) invalid();

  return {
    starsEarned: raw.starsEarned,
    xpEarned: raw.xpEarned,
    ...(raw.xpBreakdown ? { xpBreakdown: raw.xpBreakdown } : {}),
    totalXpAfter: raw.totalXpAfter,
    seasonStarsAfter: raw.seasonStarsAfter,
    ratingDelta: raw.ratingDelta,
    ratingAfter: raw.ratingAfter,
    rankAfter: raw.rankAfter,
    spinAwarded: raw.spinAwarded,
    walletBalanceAfter: raw.walletBalanceAfter,
    masteryStarsEarned: raw.masteryStarsEarned,
    ...(raw.spinReceiptId ? { spinReceiptId: raw.spinReceiptId } : {}),
  } as ArenaV2ReceiptReward;
}
