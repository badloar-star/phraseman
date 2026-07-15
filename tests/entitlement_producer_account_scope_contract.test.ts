import fs from 'fs';
import path from 'path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('premium and VIP producers stay scoped to the account that started them', () => {
  it('drops a promo-code result after an account switch and serializes local VIP writes', () => {
    const source = read('app/promo_code_entry.tsx');
    const persistence = section(source, 'async function persistRedeemedPromoAccess', 'export default function PromoCodeEntryScreen');
    const redemption = section(source, 'const runRedeem = useCallback', 'const submit = useCallback');

    expect(source).toContain('captureAccountGeneration');
    expect(source).toContain('isCurrentAccountGeneration');
    expect(source).toContain('withAccountTransitionLock');
    expect(persistence).toContain('accountToken: AccountGenerationToken');
    expect(persistence).toContain('return withAccountTransitionLock(async () => {');
    expect(persistence).toContain('if (!isCurrentAccountGeneration(accountToken)) return null;');
    expect(redemption.indexOf('const accountToken = captureAccountGeneration()')).toBeLessThan(
      redemption.indexOf('await redeemPromoCode(rawCode)'),
    );
    expect(redemption).toContain('if (!isCurrentAccountGeneration(accountToken)) return;');
    expect(redemption).toContain('persistRedeemedPromoAccess({');
    expect(redemption).toContain('}, accountToken)');
    expect(redemption).toContain('if (!marker) return;');
  });

  it('guards purchase and restore celebrations plus personal-plan writes with the captured account', () => {
    const source = read('app/paywall_purchase.ts');
    const purchase = section(source, 'const handlePurchase = useCallback', 'const handleRestore = useCallback');
    const restore = section(source, 'const handleRestore = useCallback', 'const doClose = useCallback');
    const personalPlan = section(
      source,
      'const finishPersonalPlanActivationFlow = useCallback',
      'const handlePurchase = useCallback',
    );

    expect(source).toContain('withAccountTransitionLock');
    expect(source).toContain('markPremiumCelebrationForCurrentAccount');
    expect(personalPlan).toContain('isCurrent: () => boolean');
    expect(personalPlan).toContain('withAccountTransitionLock(async () => {');
    expect(purchase).toContain('if (!purchaseAccountIsCurrent()) return;');
    expect(purchase).toContain('markPremiumCelebrationForCurrentAccount(');
    expect(purchase).toContain('finishPersonalPlanActivationFlow(purchaseAccountIsCurrent)');
    expect(restore.indexOf('const restoreAccountToken = captureAccountGeneration()')).toBeLessThan(
      restore.indexOf('await initRevenueCat()'),
    );
    expect(restore).toContain('const restoreAccountIsCurrent = () => isCurrentAccountGeneration(restoreAccountToken);');
    expect(restore).toContain('persistStorePremiumLocally(plan, metadata, restoreAccountIsCurrent)');
    expect(restore).toContain('markPremiumCelebrationForCurrentAccount(');
    expect(restore).toContain('finishPersonalPlanActivationFlow(restoreAccountIsCurrent)');
  });

  it('drops a manage-subscription purchase result after an account switch', () => {
    const source = read('app/manage_subscription.tsx');
    const handler = section(source, 'const handleChangePlan = useCallback', 'const submitCancel = useCallback');

    expect(source).toContain('captureAccountGeneration');
    expect(source).toContain('isCurrentAccountGeneration');
    expect(handler.indexOf('const accountToken = captureAccountGeneration()')).toBeLessThan(
      handler.indexOf('await Purchases.getCustomerInfo()'),
    );
    expect(handler).toContain('const accountIsCurrent = () => isCurrentAccountGeneration(accountToken);');
    expect(handler).toContain('persistStorePremiumLocally(latestPlan, latestMeta, accountIsCurrent)');
    expect(handler).toContain("persistStorePremiumLocally('yearly', meta, accountIsCurrent)");
    expect(handler).toContain('if (!persistedForCurrentAccount || !accountIsCurrent()) return;');
  });
});
