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
  it('uses one replay deadline and never starts a second wallet operation after timeout', () => {
    const source = read('app/shards_purchase_reconcile.ts');
    const helper = slice(
      source,
      'export async function reconcileShardsBeforePurchase()',
      'export function emitShardPurchaseSyncPendingToast',
    );

    expect(helper).toContain('Promise.race([replay, timeout])');
    expect(helper).toContain('resumePendingShardDeltas()');
    expect(helper).toContain("status: 'sync_pending'");
    expect(helper).not.toContain('loadShardsFromCloud');
    expect(helper).not.toContain('refreshShardsBalanceFromCloudAuthoritative');
  });

  it('does not reject an official pack from a stale local precheck', () => {
    const source = read('app/flashcards/cardPackShardPurchase.ts');
    const purchase = slice(
      source,
      'export async function purchaseCardPackWithShards',
      '/**\n * Активувати 48-год ваучер',
    );

    expect(purchase).toContain('await reconcileShardsBeforePurchase()');
    expect(purchase).toContain('await spendShardsIdempotent(');
    expect(purchase).toContain('newShardOpId()');
    expect(purchase).toContain("spendResult === 'insufficient'");
    expect(purchase).not.toContain("if (balance < pack.priceShards) return 'insufficient';");
    expect(purchase).toContain("return 'wallet_sync_pending';");
  });

  it('replays community pending deltas and reconciles server insufficient without pushing local state upward', () => {
    const source = read('app/community_packs/purchaseCommunityPack.ts');
    const purchase = slice(
      source,
      'export async function purchaseCommunityPackWithShards',
      'export type CommunityPackGiftRedeemResult',
    );

    expect(purchase).toContain('await reconcileShardsBeforePurchase()');
    expect(purchase).toContain('await callCommunityPurchasePack({');
    expect(purchase).toContain('isInsufficientCommunityPurchaseError(e)');
    expect(purchase).toContain('refreshShardsBalanceFromCloudAuthoritative()');
    expect(purchase).not.toContain('loadShardsFromCloud');
  });

  it('does not lock the purchase modal from a stale low local balance', () => {
    const source = read('app/flashcards/useCardPackShardPaywall.tsx');
    const open = slice(source, 'const openPaywall = useCallback', '  useEffect(() => {');

    expect(open).toContain("const mode: 'voucher' | 'confirm'");
    expect(open).not.toContain('balance < pack.priceShards');
    expect(source).toContain('displayedBalance: number');
    expect(source).toContain('balance={paywall.displayedBalance}');
    expect(source).toContain("mode: 'insufficient', displayedBalance: freshBalance");
  });
});
