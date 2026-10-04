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
  // НЕ открывает системный диалог магазина для жемчуга. Прежнее «старые оплаченные
  // покупки дотягиваются на старте» (PM-057-A2) отменено D103 (купленный жемчуг
  // сгорает без компенсации) и FINAL_PHASE п.4 / §55: шаги жемчуга сняты с холодного старта.
  it('retires the shop route and keeps pearl steps off the cold start', () => {
    expect(shop).toContain('<Redirect href="/flashcards_my_packs" />');
    expect(shop).not.toContain('Purchases.purchasePackage');
    expect(shop).not.toContain('recordPendingShardGrant(');
    expect(layout).not.toContain('resumePendingShardGrants(');
    expect(layout).not.toContain('await loadShardsFromCloud()');
  });

  // зачем (PM-289 этап 2г, D70/D78, 02.10): журнал ожидающих оплаченных пакетов жемчуга удалён целиком — вместе с карантином легаси-журнала
  // (quarantineLegacyIfNeededLocked, 'ownerless_v1') и разбором строк. Остался один путь: снос ключей журнала ПО ВЛАДЕЛЬЦУ при удалении аккаунта.
  // Прежний контракт сторожил «не усыновлять безхозный v1»; теперь журнал не читается вообще — сторожим то, что осталось: ключи только
  // с id владельца, снос под замками с проверкой, никакого разбора и усыновления.
  it('only removes stable-id-scoped journal keys and never reads or adopts a journal', () => {
    expect(pending).toContain("const STORAGE_KEY_PREFIX = 'pending_shard_grants_v2:'");
    expect(pending).toContain('encodeURIComponent(stableId)');
    expect(pending).toContain('withAccountTransitionLockWithDeadline');
    expect(pending).toContain('withStorageLock');
    expect(pending).toContain('key_survived');
    expect(pending).not.toContain('quarantineLegacyIfNeededLocked');
    expect(pending).not.toContain("'ownerless_v1'");
    expect(pending).not.toContain('JSON.parse(raw) as PendingShardGrant[]');
    expect(pending).not.toContain('recordPendingShardGrant');
    expect(pending).not.toContain('resumePendingShardGrants');
  });

  // зачем (PM-289): отдельный снос снят — ключи pending_shard_grants_* стирает
  // проверенный AsyncStorage.clear() быстрой фазы удаления (verifyPostDeleteLocalWipe),
  // а префиксы остаются в списке ключей аккаунта cloud_sync.
  it('account deletion relies on the verified local wipe, not a separate pending-grants cleanup', () => {
    expect(auth).not.toContain('removePendingShardGrantsForAccount');
    expect(auth).not.toContain("import('./shards_pending_grants')");
    expect(auth).toContain('await AsyncStorage.clear();');
    expect(auth).toContain('remainingKeys.every((key) => key === ACCOUNT_DELETE_PENDING_AUTH_KEY)');
    const cloudSync = fs.readFileSync(path.join(root, 'app', 'cloud_sync.ts'), 'utf8');
    expect(cloudSync).toContain("'pending_shard_grants_v2:'");
    expect(cloudSync).toContain("'pending_shard_grants_quarantine_v1:'");
    expect(cloudSync).toContain("'pending_shard_grants_recovery_needed_v1:'");
  });
});
