import fs from 'fs';
import path from 'path';

const root = process.cwd();
const shop = fs.readFileSync(path.join(root, 'app', 'shards_shop.tsx'), 'utf8');
const pending = fs.readFileSync(path.join(root, 'app', 'shards_pending_grants.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');

describe('shards store purchase account boundary', () => {
  it('binds system purchase and every post-purchase effect to one exact account', () => {
    const buy = shop.slice(shop.indexOf('const buyPack = useCallback'), shop.indexOf('const promptBuyCardPack'));
    expect(buy).toContain('const operationAccount = captureAccountGeneration();');
    expect(buy).toContain('syncRevenueCatIdentity(isOperationCurrent)');
    expect(buy).toMatch(/runRevenueCatOperationForGeneration\(\s*operationAccount/);
    expect(buy).toContain('recordPendingShardGrant(operationAccount');
    expect(buy).toContain('clearPendingShardGrant(operationAccount');
    expect(buy).toContain('waitForServerShardGrant(beforePurchaseBalance, shards, isOperationCurrent)');
    expect(shop).toContain('resumePendingShardGrants(resumeAccount)');
    expect(buy).toContain('Crypto.randomUUID()');
    expect(buy).toContain('storeTransactionId:');
    expect(buy).not.toContain('`${productId}:${Date.now()}`');
  });

  it('uses only stable-id-scoped v2 journals and never adopts ownerless v1', () => {
    expect(pending).toContain("const STORAGE_KEY_PREFIX = 'pending_shard_grants_v2:'");
    expect(pending).toContain('quarantineLegacyIfNeededLocked');
    expect(pending).toContain("'ownerless_v1'");
    expect(pending).not.toContain('JSON.parse(raw) as PendingShardGrant[]');
    expect(pending).toContain('isCurrentAccountGeneration');
    expect(pending).toContain('ownerStableId');
    expect(pending).toContain('MAX_PENDING_GRANTS');
  });

  it('removes the scoped journal during account deletion', () => {
    expect(auth).toContain('removePendingShardGrantsForAccount(pendingDeleteStableId)');
  });
});
