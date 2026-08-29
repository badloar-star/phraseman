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

  test('all ordinary app purchases use the composite client operation', () => {
    const ordinaryFiles = [
      'app/energy_shard_refill.ts',
      'app/streak_freeze_purchase.ts',
      'app/streak_revive.ts',
      'app/streak_wager.ts',
      'app/league_personal_boosts.ts',
      'app/flashcards/cardPackShardPurchase.ts',
      'app/customization_purchase_intent.ts',
      'app/profile_card_system.ts',
    ];
    for (const file of ordinaryFiles) {
      const source = read(file);
      expect(source).toContain('commitShardCompositeOperation');
      expect(source).not.toMatch(/\bspendShards(?:Idempotent)?\s*\(/);
    }
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

    const server = read('functions/src/shards_apply_delta.ts');
    expect(server).toContain("throw new HttpsError('failed-precondition', 'personal_balance_is_client_owned')");
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

  test('external events are paginated, account-scoped, and refunds remain debt', () => {
    const sync = read('app/economy/external_shard_event_sync.ts');
    expect(sync).toContain(".orderBy('createdAtMs', 'asc')");
    expect(sync).toContain('firestore.FieldPath.documentId()');
    expect(sync).toContain('isCurrentAccountGeneration(accountToken, ownerStableId)');
    expect(sync).toContain('expectedOwnerStableId: ownerStableId');
    expect(sync).toContain('effectiveDelta: event.delta');

    const ledger = read('app/economy/client_shard_operation_ledger.ts');
    expect(ledger).toContain("(input.authority ?? 'client') === 'client'");
    expect(ledger).toContain('Math.max(0, state.balance)');
  });

  test('RevenueCat never trusts the SDK credit and handles refund reversal as an external fact', () => {
    const shop = read('app/shards_shop.tsx');
    expect(shop).toContain('wasConfirmedExternalShardEventApplied');
    expect(shop).not.toContain("source: 'revenuecat_sdk_purchase'");
    const webhook = read('functions/src/revenuecat_shards.ts');
    expect(webhook).toContain("if (eventType === 'REFUND_REVERSED')");
    expect(webhook).toContain("source: 'revenuecat_refund_reversed'");
    expect(webhook).toContain('delta: grantedShards');
    expect(webhook).toContain("reason: 'original_not_found' as const, retryable: true");
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
  });

  test('Spin star persistence overlays unacked composites and accepts only newer server revisions', () => {
    const client = read('app/level_spin_star_grants.ts');
    const phoneStateEconomy = read('modules/phone-state/domains/economy.ts');
    const friends = read('app/friends_together/claims_client.ts');
    const bootstrap = read('app/local_level_spins.ts');
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
    expect(bootstrap).toContain('preparePaidLevelSpinRunePurchase({');
    expect(bootstrap).toContain('[paidLevelSpinOutboxKey(owner), JSON.stringify(nextOutbox)]');
    expect(friends).toContain('mergeLevelSpinServerStars(token');
    expect(bootstrap).toContain('recoverAndHydrateLevelSpinStarGrants(token)');
  });
});
