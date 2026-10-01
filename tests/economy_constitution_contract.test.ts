import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

describe('Economy Constitution — client authority is a permanent source contract', () => {
  test('owner rules and canonical architecture forbid orphan debits and server reconciliation', () => {
    const agents = read('AGENTS.md');
    const constitution = read('docs/economy/ECONOMY_CONSTITUTION.md');
    expect(agents).toContain('Economy Constitution — client authority, no orphan debits');
    expect(agents).toContain('standalone debit');
    expect(constitution).toContain('debit + grant + receipt');
    expect(constitution).toContain('never reverses a committed local operation');
  });

  test('all live ordinary app purchases use the composite client operation', () => {
    // зачем: D70/D78 — дозаправка энергии за жемчуг удалена целиком; покупка уровня
    // карточки профиля за жемчуг уже выведена (файл больше не тратит жемчуг вовсе).
    expect(fs.existsSync(path.join(root, 'app/energy_shard_refill.ts'))).toBe(false);
    expect(read('app/profile_card_system.ts')).not.toContain('commitShardCompositeOperation');
    // зачем: D102 — покупка косметики за жемчуг удалена вместе с редактором.
    expect(fs.existsSync(path.join(root, 'app/customization_purchase_intent.ts'))).toBe(false);
    // зачем: D101/D107 — платная заморозка и восстановление серии удалены, файлы не должны вернуться.
    for (const file of ['app/streak_freeze_purchase.ts', 'app/streak_revive.ts']) {
      expect(fs.existsSync(path.join(root, file))).toBe(false);
    }
    expect(fs.existsSync(path.join(root, 'app/league_personal_boosts.ts'))).toBe(false);
  });

  test('no current or future ordinary app surface can call a standalone spend API', () => {
    const violations = sourceFiles(path.join(root, 'app')).flatMap((file) => {
      const relative = path.relative(root, file).replace(/\\/g, '/');
      if (
        relative === 'app/shards_system.ts'
        || relative.startsWith('app/arena')
        || relative.startsWith('app/tournament')
      ) return [];
      const source = fs.readFileSync(file, 'utf8');
      return /\bspendShards(?:Idempotent)?\s*\(/.test(source) ? [relative] : [];
    });
    expect(violations).toEqual([]);
  });

  test('production code cannot bypass the immutable ledger through projection helpers', () => {
    const forbiddenCalls = [
      'addShardsLocalOnlyForPendingServerClaim',
      'keepShardsBalanceLocalAtLeast',
      'replaceShardsBalanceLocal',
      'replaceShardsBalanceForAccountGeneration',
      'replaceShardsBalanceLocalWhileAccountTransitionLocked',
      'replaceShardsBalanceLocalWithOutcomeWhileAccountTransitionLocked',
    ];
    const roots = ['app', 'components', 'hooks', 'modules']
      .map((directory) => path.join(root, directory))
      .filter((directory) => fs.existsSync(directory));
    const violations = roots.flatMap(sourceFiles).flatMap((file) => {
      const relative = path.relative(root, file).replace(/\\/g, '/');
      if (relative === 'app/shards_system.ts') return [];
      const source = fs.readFileSync(file, 'utf8');
      return forbiddenCalls
        .filter((name) => new RegExp(`\\b${name}\\s*\\(`).test(source))
        .map((name) => `${relative}:${name}`);
    });
    expect(violations).toEqual([]);
  });

  test('legacy standalone client/server spend APIs are non-mutating', () => {
    const client = read('app/shards_system.ts');
    const legacySpendStart = client.indexOf('export const spendShardsIdempotent');
    const legacySpendGuard = client.slice(legacySpendStart, legacySpendStart + 700);
    expect(legacySpendGuard).toContain("return 'failed';");

    // зачем: D70/D78 — серверная заглушка shards_apply_delta удалена целиком.
    expect(fs.existsSync(path.join(root, 'functions/src/shards_apply_delta.ts'))).toBe(false);
  });

  test('Firestore can only store immutable client operations and server-only external events', () => {
    const rules = read('firestore.rules');
    const clientBlock = rules.slice(
      rules.indexOf('match /client_economy_operations/{operationId}'),
      rules.indexOf('match /external_economy_events/{eventId}'),
    );
    expect(clientBlock).toContain('allow create: if personalEconomyOwnerMatchesAuth(userId)');
    expect(clientBlock).toContain('&& personalEconomyAccountActive(userId)');
    expect(clientBlock).not.toContain('allow create: if userDocOwnerMatchesAuth(userId)');
    expect(clientBlock).toContain('request.resource.data == resource.data');
    expect(clientBlock).toContain('allow delete: if false');
    const externalBlock = rules.slice(
      rules.indexOf('match /external_economy_events/{eventId}'),
      rules.indexOf('match /reward_claims/{claimId}'),
    );
    expect(externalBlock).toContain('allow read: if userDocOwnerMatchesAuth(userId)');
    expect(externalBlock).toContain('allow create, update, delete: if false');
  });

  test('multi-device sync uses a closed semantic result and never asks the server for permission', () => {
    const sync = read('app/economy/client_shard_operation_sync.ts');
    expect(sync).toContain('requestPhoneStateEconomySync');
    expect(sync).not.toContain('getAllKeys');
    expect(sync).not.toContain(".collection('client_economy_operations')");
    expect(sync).not.toContain(".update({ shards:");
    const bridge = read('app/phone_state_economy_bridge.ts');
    expect(bridge).toContain("kind: 'composite'");
    expect(bridge).toContain('exactResult: composite.grant');
    expect(bridge).not.toContain('localWrites');
    const reducer = read('modules/phone-state/domains/economy.ts');
    expect(reducer).toContain('phone_state_economy_operation_id_reused');
    expect(reducer).toContain('opening_balance');
    const rules = read('firestore.rules');
    expect(rules).toContain('match /client_economy_opening/{version}');
    expect(rules).toContain("request.resource.data == resource.data");
  });

  // PM-289 (D70/D78): синхронизатор внешних событий жемчуга удалён — жемчуг снят без
  // компенсации, поэтому турнирные/покупочные события больше не тянутся на телефон
  // и не стоят Firestore-чтений на каждом входе. Сторож держит удаление.
  test('external pearl events are no longer pulled to the device; refunds remain debt', () => {
    expect(fs.existsSync(path.join(__dirname, '../app/economy/external_shard_event_sync.ts'))).toBe(false);
    const shards = read('app/shards_system.ts');
    expect(shards).not.toContain('external_shard_event_sync');
    expect(shards).not.toContain('refreshShardsBalanceFromCloudAuthoritative');
    expect(shards).not.toContain('commitConfirmedExternalShardEvent');
    expect(read('app/shards_pending_grants.ts')).not.toContain('external_shard_event_sync');

    const ledger = read('app/economy/client_shard_operation_ledger.ts');
    expect(ledger).toContain("(input.authority ?? 'client') === 'client'");
    expect(ledger).toContain('Math.max(0, state.balance)');
  });

  test('RevenueCat never credits pearls: no SDK credit and no webhook credit (D103)', () => {
    // PM-057: клиентская покупка жемчуга за деньги убрана целиком — SDK-кредита
    // нет вообще. D103: вебхук тоже больше не зачисляет пакеты и не списывает
    // возвраты по ним — только логирует и поднимает алерт на оплату.
    const shop = read('app/shards_shop.tsx');
    expect(shop).not.toContain('Purchases.purchasePackage');
    expect(shop).not.toContain("source: 'revenuecat_sdk_purchase'");
    const webhook = read('functions/src/revenuecat_shards.ts');
    expect(webhook).not.toContain('appendExternalEconomyEvent');
    // зачем: D139/D136 (2026-10-01) — снятые товары (жемчуг, минуты/подписка MAX)
    // идут в один лог-отказ `[REVENUECAT] retired_product`.
    expect(webhook).toContain('handleRetiredProductEvent');
    expect(webhook).toContain("['phraseman_shards_80', 'pearl_pack']");
    expect(webhook).toContain("ignored: 'retired_product'");
  });

  test('cloud restore cannot overwrite a migrated client ledger balance', () => {
    const shards = read('app/shards_system.ts');
    const loadStart = shards.indexOf('export const loadShardsFromCloud');
    const load = shards.slice(loadStart);
    expect(load).toContain('await hasClientShardLedgerState(uid)');
    expect(load).toContain('Cloud is storage only.');
    expect(load.indexOf('await hasClientShardLedgerState(uid)'))
      .toBeLessThan(load.indexOf('const cloudRaw = Number.isSafeInteger'));
  });

  test('account switch/wipe includes every owner-scoped economy journal prefix', () => {
    const cloudSync = read('app/cloud_sync.ts');
    for (const prefix of [
      'client_shard_operation_v1:',
      'client_shard_ledger_state_v1:',
      'client_shard_prepared_v1:',
      'client_shard_grant_receipt_v1:',
      'client_shard_cloud_synced_v1:',
      'client_shard_conflict_v1:',
      'client_shard_phone_state_outbox_v1:',
      'client_shard_semantic_paid_v1:',
      'level_spin_star_grant_outbox_v1:',
      'level_spin_star_projection_v1:',
      'level_spin_star_prepared_v1:',
      'level_spin_star_operation_v1:',
      'paid_level_spin_envelope_v1:',
      'paid_level_spin_outbox_v1:',
      'practice_rune_journal_v1:',
      'attempt_restore_gift_projection_v1:',
      'attempt_restore_gift_outbox_v1:',
      'attempt_restore_gift_prepared_credit_v1:',
      'attempt_restore_gift_prepared_consume_v1:',
      'attempt_restore_gift_operation_v1:',
      'session_attempts_state_v1:',
      'session_attempt_recovery_prepared_v1:',
      'session_attempt_recovery_receipt_v1:',
      'session_attempt_recovery_sync_outbox_v1:',
      'customization_rune_purchase_outbox_v1:',
      'customization_selection_operation_v1:',
      'customization_selection_head_v1:',
      'customization_selection_outbox_v1:',
      'customization_selection_quarantine_v1:',
    ]) expect(cloudSync).toContain(`'${prefix}'`);
    // D49: «Дневной путь» удалён, но сырой журнал его подарков читает миграция
    // Q12 — ключи живут в её модуле и по-прежнему account-local.
    const legacyDailyPathKeys = read('app/gifts_to_coins_legacy_daily_path_v1.ts');
    for (const prefix of [
      'daily_journey_gift_occurrence_v1:',
      'daily_journey_gift_prepared_v1:',
      'daily_journey_gift_projection_v1:',
      'daily_journey_gift_claim_receipt_v1:',
      'daily_journey_freeze_operation_v1:',
      'daily_journey_freeze_prepared_v1:',
      'daily_journey_freeze_projection_v1:',
      'daily_journey_protected_day_prepared_v1:',
    ]) expect(legacyDailyPathKeys).toContain(`'${prefix}'`);
    expect(cloudSync).toContain('...LEGACY_DAILY_PATH_ACCOUNT_LOCAL_PREFIXES');
    expect(cloudSync).toContain('isLearningV2AccountLocalKey(key)');
    expect(cloudSync).toContain("if (finalResidue.length > 0) throw new Error('account_wipe_incomplete')");
  });

  test('Spin star persistence overlays unacked composites and accepts only newer server revisions', () => {
    const client = read('app/level_spin_star_grants.ts');
    const phoneStateEconomy = read('modules/phone-state/domains/economy.ts');
    const friends = read('app/friends_together/claims_client.ts');
    const grants = read('app/level_spin_star_grants.ts');
    expect(client).toContain('unacknowledgedTotal(projection)');
    expect(client).toContain('seq > current.serverSeq');
    expect(client).toContain('? balance : current.serverBalance');
    expect(client).not.toMatch(/Math\.max\(current\.serverBalance/);
    expect(client).toContain('ack.requestFingerprint !== operation.requestFingerprint');
    expect(client).toContain("schemaVersion: 'client-level-spin-star-projection.v3'");
    expect(client).toContain("schemaVersion: 'client-session-attempt-recovery-rune-operation.v1'");
    expect(client).toContain("schemaVersion: 'client-paid-level-spin-rune-operation.v1'");
    expect(client).not.toMatch(/export\s+(?:async\s+)?function\s+spendRunes/);
    expect(client).not.toMatch(/stars:\s*ack\.starsBalance/);
    expect(phoneStateEconomy).toContain("'paid_level_spin_rune_purchase'");
    expect(phoneStateEconomy).toContain("value.runeDelta !== -300");
    expect(phoneStateEconomy).toContain('balanceAfter !== balanceBefore - 300');
    expect(grants).toContain('preparePaidLevelSpinRunePurchase({');
    expect(grants).toContain('[paidLevelSpinOutboxKey(owner), JSON.stringify(nextOutbox)]');
    expect(friends).toContain('mergeLevelSpinServerStars(token');
    expect(grants).toContain('recoverAndHydrateLevelSpinStarGrants(token)');
  });
});
