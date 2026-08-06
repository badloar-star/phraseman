import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

function slice(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('card-pack pearl balance reconciliation', () => {
  it('replays pending deltas before reading cloud and returns the reconciled balance', () => {
    const source = read('app/shards_purchase_reconcile.ts');
    const helper = slice(
      source,
      'export async function reconcileShardsBeforePurchase()',
      '/* expo-router route shim',
    );
    const replay = helper.indexOf('resumePendingShardDeltas()');
    const cloud = helper.indexOf('loadShardsFromCloud(isCurrent)');
    const balance = helper.lastIndexOf('getShardsBalance()');

    expect(replay).toBeGreaterThanOrEqual(0);
    expect(cloud).toBeGreaterThan(replay);
    expect(balance).toBeGreaterThan(cloud);
    expect(helper).toContain('SHARD_PURCHASE_RECONCILE_TIMEOUT_MS');
    expect(helper).toContain('isCurrentAccountGeneration(accountToken, ownerStableId)');
  });

  it('reconciles official-pack balance before the local precheck and authoritative spend', () => {
    const source = read('app/flashcards/cardPackShardPurchase.ts');
    const purchase = slice(
      source,
      'export async function purchaseCardPackWithShards',
      '/**\n * Активувати 48-год ваучер',
    );
    const reconcile = purchase.indexOf('await reconcileShardsBeforePurchase()');
    const insufficient = purchase.indexOf("if (balance < pack.priceShards) return 'insufficient';");
    const spend = purchase.indexOf("await spendShards(pack.priceShards, 'card_pack')");

    expect(reconcile).toBeGreaterThanOrEqual(0);
    expect(insufficient).toBeGreaterThan(reconcile);
    expect(spend).toBeGreaterThan(insufficient);
  });

  it('reconciles community purchases before the callable and converts server insufficient to the shared result', () => {
    const source = read('app/community_packs/purchaseCommunityPack.ts');
    const purchase = slice(
      source,
      'export async function purchaseCommunityPackWithShards',
      'export type CommunityPackGiftRedeemResult',
    );
    const reconcile = purchase.indexOf('await reconcileShardsBeforePurchase()');
    const callable = purchase.indexOf('await callCommunityPurchasePack({');
    const insufficient = purchase.indexOf("return 'insufficient';");

    expect(reconcile).toBeGreaterThanOrEqual(0);
    expect(callable).toBeGreaterThan(reconcile);
    expect(purchase).toContain('isInsufficientCommunityPurchaseError(e)');
    expect(insufficient).toBeGreaterThan(callable);
    expect(purchase).toContain("emitAppEvent('shards_balance_updated', { balance: freshBalance });");
  });

  it('refreshes the visible paywall balance and mode without requiring the user to reopen the pack', () => {
    const source = read('app/flashcards/useCardPackShardPaywall.tsx');
    const open = slice(source, 'const openPaywall = useCallback', '  useEffect(() => {');

    expect(source).toContain('verifiedBalance: number');
    expect(open).toContain('void reconcileShardsBeforePurchase().then((freshBalance) => {');
    expect(open).toContain("freshBalance < prev.pack.priceShards");
    expect(open).toContain('balanceRefreshIdRef.current');
    expect(source).toContain('balance={paywall.verifiedBalance}');
    expect(source).toContain("{ ...prev, mode: 'insufficient', verifiedBalance: freshBalance }");
  });
});
