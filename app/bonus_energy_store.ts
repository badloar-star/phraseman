import type { AccountTransitionLockLease, AccountGenerationToken } from './account_generation';

export const BONUS_ENERGY_KEY = 'energy_gift_bonus';

export interface BonusEnergyState {
  schemaVersion: 2;
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

export async function readBonusEnergy(
  accountToken?: AccountGenerationToken,
): Promise<BonusEnergyState | null> {
  void accountToken;
  return null;
}

export async function readBonusEnergyForMutation(
  accountToken?: AccountGenerationToken,
): Promise<BonusEnergyState | null> {
  void accountToken;
  return null;
}

export async function consumeBonusEnergy(
  requestedAmount: number,
  accountToken?: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<BonusEnergySpendResult> {
  void requestedAmount;
  void accountToken;
  void accountTransitionLockLease;
  return { spent: 0, remaining: 0, expiresAt: 0 };
}

export async function restoreBonusEnergy(
  amountToRestore: number,
  originalExpiresAt: number,
  accountToken?: AccountGenerationToken,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<BonusEnergyState | null> {
  void amountToRestore;
  void originalExpiresAt;
  void accountToken;
  void accountTransitionLockLease;
  return null;
}
