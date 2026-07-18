import { HttpsError } from 'firebase-functions/v2/https';
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
