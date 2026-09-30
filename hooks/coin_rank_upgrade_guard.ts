export type CoinRankOwnerBinding = Readonly<{
  ownerStableId: string;
  accountGeneration: number;
}>;

export type CoinRankOperationBinding = CoinRankOwnerBinding & Readonly<{
  rank: number;
}>;

export type CoinRankCeremonyBinding = CoinRankOwnerBinding & Readonly<{
  fromRank: number;
  toRank: number;
}>;

type AccountIdentity = Readonly<{
  phase: string;
  stableId: string | null;
  generation: number;
}>;

export function isCoinRankOwnerBindingCurrent(
  binding: CoinRankOwnerBinding | null,
  token: AccountIdentity,
): boolean {
  const owner = token.stableId?.trim() ?? '';
  return binding !== null
    && token.phase === 'active'
    && owner.length > 0
    && owner === binding.ownerStableId
    && token.generation === binding.accountGeneration;
}

export function isCoinRankOperationBindingCurrent(
  operation: CoinRankOperationBinding | null,
  current: CoinRankOperationBinding | null,
  token: AccountIdentity,
): boolean {
  if (operation === null || current === null) return false;
  return isCoinRankOwnerBindingCurrent(operation, token)
    && current.ownerStableId === operation.ownerStableId
    && current.accountGeneration === operation.accountGeneration
    && current.rank === operation.rank;
}

/** A ceremony is visible only after its exact transition is the displayed rank. */
export function isCoinRankCeremonyBindingCurrent(
  ceremony: CoinRankCeremonyBinding | null,
  current: CoinRankOperationBinding | null,
  token: AccountIdentity,
): boolean {
  if (ceremony === null || current === null) return false;
  return isCoinRankOwnerBindingCurrent(ceremony, token)
    && current.ownerStableId === ceremony.ownerStableId
    && current.accountGeneration === ceremony.accountGeneration
    && current.rank === ceremony.toRank;
}

/**
 * The old rank is tolerated only while the confirmed rank publication catches
 * up. Any other rank or account generation makes the ceremony irrecoverably stale.
 */
export function isCoinRankCeremonyBindingStale(
  ceremony: CoinRankCeremonyBinding,
  current: CoinRankOperationBinding | null,
  token: AccountIdentity,
): boolean {
  if (!isCoinRankOwnerBindingCurrent(ceremony, token)) return true;
  if (current === null) return false;
  if (current.ownerStableId !== ceremony.ownerStableId
    || current.accountGeneration !== ceremony.accountGeneration) return true;
  return current.rank !== ceremony.fromRank && current.rank !== ceremony.toRank;
}

type UpgradeEligibility = Readonly<{
  rank: number | null;
  balance: number | null;
  nextPrice: number | null;
  upgrading: boolean;
  balanceReconciling: boolean;
}>;

export function isCoinRankUpgradeEligible(input: UpgradeEligibility): boolean {
  return input.rank !== null
    && input.balance !== null
    && input.nextPrice !== null
    && input.balance >= input.nextPrice
    && !input.upgrading
    && !input.balanceReconciling;
}

