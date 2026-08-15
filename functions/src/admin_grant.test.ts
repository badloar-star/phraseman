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
  delta: 125,
  reason: 'Correct balance after verified support case',
  idempotencyKey: 'admin-balance-1',
  requestId: 'balance-request-1',
};

function applyFirestoreUpdateContract(
  initial: Record<string, unknown>,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(initial);
  for (const [path, value] of Object.entries(updates)) {
    const segments = path.split('.');
    let target = result;
    for (const segment of segments.slice(0, -1)) {
      const current = target[segment];
      if (!current || typeof current !== 'object' || Array.isArray(current)) target[segment] = {};
      target = target[segment] as Record<string, unknown>;
    }
    target[segments[segments.length - 1]] = value;
  }
  return result;
}

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

  it('builds a fixed external delta without reading or projecting personal balance', () => {
    const mutation = buildAdminRewardMutation({ shards: 40 }, 'shards', 25, 1_720_000_000_000);
    expect(mutation.updates).toEqual({ updatedAt: 1_720_000_000_000 });
    expect(mutation.shardLog).toMatchObject({
      type: 'earn',
      amount: 25,
    });
    expect(mutation.before).toEqual({ personalBalance: 'client_owned_not_read' });
    expect(mutation.after).toEqual({ externalDelta: 25 });
  });

  it('preserves the existing fixed-reward semantics', () => {
    const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
    const boost = buildAdminRewardMutation({}, 'xp_boost_2x_24h', 0, nowMs);
    expect(JSON.parse(String(boost.updates.gift_xp_multiplier))).toEqual({
      multiplier: 2,
      expiresAt: nowMs + 24 * 3_600_000,
    });
    expect(boost.updates['progress.gift_xp_multiplier']).toBe(
      boost.updates.gift_xp_multiplier,
    );

    const shield = buildAdminRewardMutation({
      chain_shield: JSON.stringify({ daysLeft: 2, grantedAt: '2026-07-16' }),
    }, 'chain_shield_3', 0, nowMs);
    expect(JSON.parse(String(shield.updates.chain_shield))).toEqual({
      daysLeft: 5,
      grantedAt: '2026-07-17',
    });
    expect(shield.updates['progress.chain_shield']).toBe(
      shield.updates.chain_shield,
    );
  });

  it('restores from the strongest canonical perk copy before applying an admin grant', () => {
    const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
    const shield = buildAdminRewardMutation({
      chain_shield: JSON.stringify({ daysLeft: 1 }),
      progress: { chain_shield: JSON.stringify({ daysLeft: 4 }) },
    }, 'chain_shield_1', 0, nowMs);
    expect(JSON.parse(String(shield.updates.chain_shield))).toMatchObject({ daysLeft: 5 });
  });

  it('extends x2 from the latest root/progress expiry and never shortens it', () => {
    const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
    const rootExpiry = nowMs + 6 * 3_600_000;
    const progressExpiry = nowMs + 12 * 3_600_000;
    const boost = buildAdminRewardMutation({
      gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: rootExpiry }),
      progress: {
        gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: progressExpiry }),
      },
    }, 'xp_boost_2x_24h', 0, nowMs);

    expect(JSON.parse(String(boost.updates.gift_xp_multiplier))).toEqual({
      multiplier: 2,
      expiresAt: progressExpiry + 24 * 3_600_000,
    });
  });

  it.each([
    ['xp_boost_2x_24h', 'gift_xp_multiplier'],
    ['chain_shield_1', 'chain_shield'],
  ] as const)('updates %s through a dotted progress field without erasing unrelated progress', (type, field) => {
    const initial = {
      progress: {
        user_total_xp: '9876',
        streak: '42',
        league: 'diamond',
      },
    };
    const mutation = buildAdminRewardMutation(initial, type, 0, Date.parse('2026-07-17T12:00:00.000Z'));

    expect(mutation.updates).not.toHaveProperty('progress');
    expect(mutation.updates[`progress.${field}`]).toBe(mutation.updates[field]);
    const persisted = applyFirestoreUpdateContract(initial, mutation.updates);
    expect(persisted.progress).toMatchObject({
      user_total_xp: '9876',
      streak: '42',
      league: 'diamond',
      [field]: mutation.updates[field],
    });
  });
});

describe('admin external shard adjustment command contract', () => {
  const module = adminGrantModule as any;
  const source = fs.readFileSync(path.join(__dirname, 'admin_grant.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  it('strictly normalizes a bounded delta and fingerprints all material fields', () => {
    expect(typeof module.normalizeAdminSetShardBalanceInput).toBe('function');
    expect(typeof module.adminSetShardBalanceFingerprint).toBe('function');
    const input = module.normalizeAdminSetShardBalanceInput(validBalanceInput);
    expect(input).toEqual(validBalanceInput);
    expect(module.adminSetShardBalanceFingerprint(input)).toBe(JSON.stringify({
      action: 'adjust_shard_balance',
      uid: validBalanceInput.uid,
      delta: validBalanceInput.delta,
      reason: validBalanceInput.reason,
    }));
    expect(module.adminSetShardBalanceFingerprint(input)).not.toBe(module.adminSetShardBalanceFingerprint({ ...input, delta: 126 }));
  });

  it.each([
    { ...validBalanceInput, uid: '../users' },
    { ...validBalanceInput, delta: '125' },
    { ...validBalanceInput, delta: 1.5 },
    { ...validBalanceInput, delta: 0 },
    { ...validBalanceInput, delta: 1_000_001 },
    { ...validBalanceInput, reason: '' },
    { ...validBalanceInput, requestId: '' },
    { ...validBalanceInput, idempotencyKey: '../reuse' },
  ])('rejects unsafe balance command %#', (unsafe) => {
    expect(typeof module.normalizeAdminSetShardBalanceInput).toBe('function');
    expect(() => module.normalizeAdminSetShardBalanceInput(unsafe)).toThrow(HttpsError);
  });

  it.each([
    [45, 'earn', 45],
    [-45, 'spend', 45],
  ] as const)('builds an immutable external delta %s', (delta, type, amount) => {
    expect(typeof module.buildAdminShardBalanceMutation).toBe('function');
    const mutation = module.buildAdminShardBalanceMutation(delta, 1_720_000_000_000);
    expect(mutation).toEqual({
      shardLog: {
        ts: '2024-07-03T09:46:40.000Z',
        type,
        amount,
        reason: 'admin_adjust_balance',
      },
      before: { personalBalance: 'client_owned_not_read' },
      after: { externalDelta: delta },
      delta,
    });
  });

  it('accepts exact idempotent replay and rejects mismatched payload, actor, or action', () => {
    expect(typeof module.assertAdminShardBalanceReplay).toBe('function');
    const input = module.normalizeAdminSetShardBalanceInput(validBalanceInput);
    const fingerprint = module.adminSetShardBalanceFingerprint(input);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'adjust_shard_balance', requestFingerprint: fingerprint, actorUid: 'admin-1' }, fingerprint, 'admin-1')).not.toThrow();
    expect(() => module.assertAdminShardBalanceReplay({ action: 'grant_reward', requestFingerprint: fingerprint, actorUid: 'admin-1' }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'adjust_shard_balance', requestFingerprint: 'other', actorUid: 'admin-1' }, fingerprint, 'admin-1')).toThrow(HttpsError);
    expect(() => module.assertAdminShardBalanceReplay({ action: 'adjust_shard_balance', requestFingerprint: fingerprint, actorUid: 'admin-2' }, fingerprint, 'admin-1')).toThrow(HttpsError);
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
    expect(body).toContain('appendExternalEconomyEvent(tx, target.ref');
    expect(body).not.toContain('tx.update(target.ref, mutation.updates)');
    expect(body).toContain("collection('shard_log')");
    expect(body).toContain("entity: { collection: 'users', id: target.uid }");
    expect(body).toContain('uid: target.uid');
    expect(body).not.toContain("collection('shard_rewards')");
    expect(indexSource).toContain('adminGrantReward, adminSetShardBalance');
  });
});
