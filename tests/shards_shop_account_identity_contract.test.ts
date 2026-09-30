import fs from 'fs';
import path from 'path';

const root = process.cwd();
const shop = fs.readFileSync(path.join(root, 'app', 'shards_shop.tsx'), 'utf8');
const pending = fs.readFileSync(path.join(root, 'app', 'shards_pending_grants.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');

describe('shards store purchase account boundary', () => {
  // PM-057 (PhraseMan 2.0, D28): покупка жемчуга за реальные деньги убрана.
  // Прежний контракт сторожил системную покупку (RevenueCat purchasePackage,
  // запись pending-журнала) — это отменённое правило. Новый контракт: клиент
  // НЕ открывает системный диалог магазина для жемчуга, но старые оплаченные
  // покупки по-прежнему дотягиваются (resumePendingShardGrants) — PM-057-A2.
  it('retires the shop route while startup still resumes already paid grants', () => {
    expect(shop).toContain('<Redirect href="/flashcards_my_packs" />');
    expect(shop).not.toContain('Purchases.purchasePackage');
    expect(shop).not.toContain('recordPendingShardGrant(');
    expect(layout).toContain('resumePendingShardGrants(resumeAccount)');
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
