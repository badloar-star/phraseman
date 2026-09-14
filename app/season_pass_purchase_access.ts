export type SeasonPassPurchaseAccess = 'waiting' | 'plus' | 'owned' | 'buyable';

export function resolveSeasonPassPurchaseAccess(input: Readonly<{
  entitlementResolved: boolean;
  plusActive: boolean;
  passOwned: boolean;
}>): SeasonPassPurchaseAccess {
  if (!input.entitlementResolved) return 'waiting';
  if (input.plusActive) return 'plus';
  if (input.passOwned) return 'owned';
  return 'buyable';
}
