import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';
import {
  readGiftAccountValue,
  writeGiftAccountValue,
} from './gift_account_storage';
import { parseBonusEnergyStorageValue } from './spin_gift_storage_integrity';

export const BONUS_ENERGY_KEY = 'energy_gift_bonus';

export interface BonusEnergyState {
  amount: number;
  capacity: number;
  expiresAt: number;
}

export type BonusEnergySpendResult = Readonly<{
  spent: number;
  remaining: number;
  expiresAt: number;
}>;

export function getTomorrowMidnightMs(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime();
}

type BonusEnergyStorageRead =
  | ReturnType<typeof parseBonusEnergyStorageValue>
  | Readonly<{ status: 'read_failed' }>;

async function inspectBonusEnergy(
  accountToken: AccountGenerationToken,
): Promise<BonusEnergyStorageRead> {
  try {
    return parseBonusEnergyStorageValue(
      await readGiftAccountValue(BONUS_ENERGY_KEY, accountToken),
      Date.now(),
    );
  } catch {
    return { status: 'read_failed' };
  }
}

export async function readBonusEnergy(
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<BonusEnergyState | null> {
  const inspected = await inspectBonusEnergy(accountToken);
  if (inspected.status === 'valid') return inspected.value;
  // Public rendering remains compatible: unavailable bonus is displayed as 0.
  // Public reads are intentionally non-mutating. Removing an expired snapshot
  // here could race a newer grant written between inspect and remove. Mutation
  // paths below hold the account lock and may clean up the exact state they read.
  return null;
}

export async function readBonusEnergyForMutation(
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<BonusEnergyState | null> {
  const inspected = await inspectBonusEnergy(accountToken);
  if (inspected.status === 'read_failed') throw new Error('bonus_energy_storage_read_failed');
  if (inspected.status === 'malformed') throw new Error('bonus_energy_storage_corrupt');
  // Expiry is semantically empty. Do not delete after this awaited read:
  // that delete could erase a newer grant written by another composite.
  if (inspected.status === 'expired') return null;
  return inspected.status === 'valid' ? inspected.value : null;
}

export async function consumeBonusEnergy(
  requestedAmount: number,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<BonusEnergySpendResult> {
  const requested = Math.max(0, Math.floor(requestedAmount));
  if (requested <= 0) return { spent: 0, remaining: 0, expiresAt: 0 };
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
      return { spent: 0, remaining: 0, expiresAt: 0 };
    }
    const current = await readBonusEnergyForMutation(accountToken);
    if (!current || !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
      return { spent: 0, remaining: 0, expiresAt: 0 };
    }
    const spent = Math.min(requested, current.amount);
    const remaining = current.amount - spent;
    // Capacity belongs to the active until-midnight gift, not to its remaining
    // units. Keep the zero-amount snapshot so 8 remains the denominator after
    // the three temporary units have been spent.
    await writeGiftAccountValue(
      BONUS_ENERGY_KEY,
      JSON.stringify({ amount: remaining, capacity: current.capacity, expiresAt: current.expiresAt }),
      accountToken,
    );
    return { spent, remaining, expiresAt: current.expiresAt };
  }, accountTransitionLockLease);
}

export async function restoreBonusEnergy(
  amountToRestore: number,
  originalExpiresAt: number,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<BonusEnergyState | null> {
  const amount = Math.max(0, Math.floor(amountToRestore));
  if (amount <= 0 || !Number.isFinite(originalExpiresAt) || Date.now() >= originalExpiresAt) return null;
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)
      || Date.now() >= originalExpiresAt) return null;
    const current = await readBonusEnergyForMutation(accountToken);
    if (!isCurrentAccountGeneration(accountToken, accountToken.stableId)) return null;
    const nextAmount = (current?.amount ?? 0) + amount;
    const next: BonusEnergyState = {
      amount: nextAmount,
      capacity: Math.max(current?.capacity ?? 0, nextAmount),
      expiresAt: Math.max(current?.expiresAt ?? 0, originalExpiresAt),
    };
    await writeGiftAccountValue(BONUS_ENERGY_KEY, JSON.stringify(next), accountToken);
    return next;
  }, accountTransitionLockLease);
}
