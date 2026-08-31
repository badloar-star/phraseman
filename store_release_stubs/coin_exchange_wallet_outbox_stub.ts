import type { AccountGenerationToken } from '../app/account_generation';

export async function resumePendingCoinExchangeWalletRewards(
  _dependencies: { readonly accountToken?: AccountGenerationToken } = {},
): Promise<number> {
  return 0;
}
