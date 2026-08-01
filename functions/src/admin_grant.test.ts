import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import * as adminGrantModule from './admin_grant';
import {
  adminGrantRewardFingerprint,
  assertAdminRewardReplay,
  buildAdminRewardMutation,
  normalizeAdminGrantRewardInput,
} from './admin_grant';

const validInput = {
  uid: 'stable-user_1',
  type: 'shards',
  amount: 25,
  reason: 'Компенсация после подтверждённой ошибки',
  comment: 'Репорт app_errors/123',
  idempotencyKey: 'admin-reward-1',
  requestId: 'request-1',
};

const validBalanceInput = {
  uid: 'stable-user_1',
  newBalance: 125,
  reason: 'Correct balance after verified support case',
  idempotencyKey: 'admin-balance-1',
  requestId: 'balance-request-1',
};

describe('admin grant reward command contract', () => {
  it('normalizes a bounded command and fingerprints every material field', () => {
    const input = normalizeAdminGrantRewardInput(validInput);
    expect(input).toEqual(validInput);
    expect(adminGrantRewardFingerprint(input)).toBe(JSON.stringify({
      action: 'grant_reward',
      uid: validInput.uid,
      type: validInput.type,
      amount: validInput.amount,
      reason: validInput.reason,
      comment: validInput.comment,
    }));
  });

  it('requires canonical-looking ids, a reason and idempotency fields', () => {
    for (const input of [
      { ...validInput, uid: '../users' },
      { ...validInput, type: 'premium' },
      { ...validInput, amount: 0 },
      { ...validInput, amount: 10_001 },
      { ...validInput, reason: '' },
      { ...validInput, idempotencyKey: '../reuse' },
      { ...validInput, requestId: '' },
    ]) {
      expect(() => normalizeAdminGrantRewardInput(input)).toThrow(HttpsError);
    }
  });

  it('ignores an amount for fixed rewards', () => {
    expect(normalizeAdminGrantRewardInput({
      ...validInput,
      type: 'xp_boost_2x_24h',
      amount: 999,
    })).toMatchObject({ type: 'xp_boost_2x_24h', amount: 0 });
  });

  it('rejects the retired Arena reward type', () => {
    expect(() => normalizeAdminGrantRewardInput({
      ...validInput,
      type: 'arena_extra_5',
    })).toThrow(HttpsError);
  });

  it('accepts an exact replay and rejects key reuse by another payload or actor', () => {
    const fingerprint = adminGrantRewardFingerprint(normalizeAdminGrantRewardInput(validInput));
    expect(() => assertAdminRewardReplay({
      action: 'grant_reward',
      requestFingerprint: fingerprint,
      actorUid: 'admin-1',
    }, fingerprint, 'admin-1')).not.toThrow();
    expect(() => assertAdminRewardReplay({
      action: 'grant_reward',
      requestFingerprint: 'different',
      actorUid: 'admin-1',
    }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => assertAdminRewardReplay({
      action: 'grant_reward',
      requestFingerprint: fingerprint,
      actorUid: 'admin-2',
    }, fingerprint, 'admin-1')).toThrow(HttpsError);
  });

  it('builds the shard balance, log and projected audit values atomically', () => {
    const mutation = buildAdminRewardMutation({ shards: 40 }, 'shards', 25, 1_720_000_000_000);
    expect(mutation.updates).toMatchObject({
      shards: 65,
      shards_updated_op: 'earn',
      shards_updated_reason: 'admin_grant',
    });
    expect(mutation.shardLog).toMatchObject({
      type: 'earn',
      amount: 25,
      balanceBefore: 40,
      balanceAfter: 65,
    });
    expect(mutation.before).toEqual({ shards: 40 });
    expect(mutation.after).toEqual({ shards: 65 });
  });

  it('preserves the existing fixed-reward semantics', () => {
    const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
    const boost = buildAdminRewardMutation({}, 'xp_boost_2x_24h', 0, nowMs);
    expect(JSON.parse(String(boost.updates.gift_xp_multiplier))).toEqual({
      multiplier: 2,
      expiresAt: nowMs + 24 * 3_600_000,
    });

    const shield = buildAdminRewardMutation({
      chain_shield: JSON.stringify({ daysLeft: 2, grantedAt: '2026-07-16' }),
    }, 'chain_shield_3', 0, nowMs);
    expect(JSON.parse(String(shield.updates.chain_shield))).toEqual({
      daysLeft: 5,
      grantedAt: '2026-07-17',
    });
  });
});

describe('admin absolute shard balance command contract', () => {
  const module = adminGrantModule as any;
  const source = fs.readFileSync(path.join(__dirname, 'admin_grant.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  it('strictly normalizes a bounded absolute balance and fingerprints all material fields', () => {
    expect(typeof module.normalizeAdminSetShardBalanceInput).toBe('function');
    expect(typeof module.adminSetShardBalanceFingerprint).toBe('function');
    const input = module.normalizeAdminSetShardBalanceInput(validBalanceInput);
    expect(input).toEqual(validBalanceInput);
    expect(module.adminSetShardBalanceFingerprint(input)).toBe(JSON.stringify({
      action: 'set_shard_balance',
      uid: validBalanceInput.uid,
      newBalance: validBalanceInput.newBalance,
      reason: validBalanceInput.reason,
    }));
    expect(module.adminSetShardBalanceFingerprint(input)).not.toBe(module.adminSetShardBalanceFingerprint({ ...input, newBalance: 126 }));
  });

  it.each([
    { ...validBalanceInput, uid: '../users' },
    { ...validBalanceInput, newBalance: '125' },
    { ...validBalanceInput, newBalance: 1.5 },
    { ...validBalanceInput, newBalance: -1 },
    { ...validBalanceInput, newBalance: 1_000_001 },
    { ...validBalanceInput, reason: '' },
    { ...validBalanceInput, requestId: '' },
    { ...validBalanceInput, idempotencyKey: '../reuse' },
  ])('rejects unsafe balance command %#', (unsafe) => {
    expect(typeof module.normalizeAdminSetShardBalanceInput).toBe('function');
    expect(() => module.normalizeAdminSetShardBalanceInput(unsafe)).toThrow(HttpsError);
  });

  it.each([
    [80, 125, 'earn', 45],
    [125, 80, 'spend', 45],
    [80, 80, 'earn', 0],
  ] as const)('builds an exact atomic %s → %s balance mutation', (beforeBalance, afterBalance, type, amount) => {
    expect(typeof module.buildAdminShardBalanceMutation).toBe('function');
    const mutation = module.buildAdminShardBalanceMutation({ shards: beforeBalance }, afterBalance, 1_720_000_000_000);
    expect(mutation).toEqual({
      updates: {
        shards: afterBalance,
        shards_updated_at_ms: 1_720_000_000_000,
        shards_updated_op: type,
        shards_updated_reason: 'admin_set_balance',
        shards_admin_override_at: '2024-07-03T09:46:40.000Z',
      },
      shardLog: {
        ts: '2024-07-03T09:46:40.000Z',
        type,
        amount,
        reason: 'admin_set_balance',
        balanceBefore: beforeBalance,
        balanceAfter: afterBalance,
      },
      before: { shards: beforeBalance },
      after: { shards: afterBalance },
      delta: afterBalance - beforeBalance,
    });
  });

  it('accepts exact idempotent replay and rejects mismatched payload, actor, or action', () => {
    expect(typeof module.assertAdminShardBalanceReplay).toBe('function');
    const input = module.normalizeAdminSetShardBalanceInput(validBalanceInput);
    const fingerprint = module.adminSetShardBalanceFingerprint(input);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'set_shard_balance', requestFingerprint: fingerprint, actorUid: 'admin-1' }, fingerprint, 'admin-1')).not.toThrow();
    expect(() => module.assertAdminShardBalanceReplay({ action: 'grant_reward', requestFingerprint: fingerprint, actorUid: 'admin-1' }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'set_shard_balance', requestFingerprint: 'other', actorUid: 'admin-1' }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'set_shard_balance', requestFingerprint: fingerprint, actorUid: 'admin-2' }, fingerprint, 'admin-1')).toThrow(HttpsError);
  });

  it('ships a protected canonical transaction without creating a reward inbox row', () => {
    const start = source.indexOf('export const adminSetShardBalance = onCall(');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start);
    expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(body).toContain('requireAdminAppCheck(request);');
    expect(body).toContain('requireRewardWriter(');
    expect(body).toContain('resolveCanonicalAdminAccessTarget(tx, db, input.uid)');
    expect(body).toContain('assertAdminShardBalanceReplay(');
    expect(body).toContain('tx.update(target.ref, mutation.updates)');
    expect(body).toContain("collection('shard_log')");
    expect(body).toContain("entity: { collection: 'users', id: target.uid }");
    expect(body).toContain('uid: target.uid');
    expect(body).not.toContain("collection('shard_rewards')");
    expect(indexSource).toContain('adminGrantReward, adminSetShardBalance');
  });
});
