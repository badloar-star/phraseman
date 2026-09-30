import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  adminGrantCoinOpId,
  adminGrantRewardFingerprint,
  assertAdminRewardReplay,
  buildAdminRewardMutation,
  normalizeAdminGrantRewardInput,
} from './admin_grant';

// зачем: D86 — админ-выдача теперь монетами (stars_ledger, причина admin_grant);
// D70 — корректировка баланса жемчуга (adminSetShardBalance) удалена.
const validInput = {
  uid: 'stable-user_1',
  type: 'coins',
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
      { ...validInput, amount: 5_001 },
      { ...validInput, reason: '' },
      { ...validInput, idempotencyKey: '../reuse' },
      { ...validInput, requestId: '' },
    ]) {
      expect(() => normalizeAdminGrantRewardInput(input)).toThrow(HttpsError);
    }
  });

  it.each(['shards', 'arena_extra_5', 'xp_boost_2x_24h', 'xp_boost_2x_48h', 'chain_shield_1', 'chain_shield_3'])(
    'rejects retired reward type %s', (type) => {
      expect(() => normalizeAdminGrantRewardInput({ ...validInput, type })).toThrow(HttpsError);
    },
  );

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

  it('builds a coin mutation without any pearl log', () => {
    const mutation = buildAdminRewardMutation({}, 'coins', 25, 1_720_000_000_000);
    expect(mutation.updates).toEqual({ updatedAt: 1_720_000_000_000 });
    expect(mutation.coinsAmount).toBe(25);
    expect(mutation.after).toEqual({ coinsDelta: 25 });
    expect(() => buildAdminRewardMutation({}, 'shards', 25, 1)).toThrow(HttpsError);
  });

  it('derives a stable coin ledger op id that fits the ledger format', () => {
    const opId = adminGrantCoinOpId('legacy-reward-' + 'x'.repeat(140));
    expect(opId).toMatch(/^admin_grant:[a-f0-9]{64}$/);
    expect(adminGrantCoinOpId('k')).toBe(adminGrantCoinOpId('k'));
    expect(adminGrantCoinOpId('k')).not.toBe(adminGrantCoinOpId('k2'));
  });
});

describe('admin grant source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'admin_grant.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

  it('grants coins through the single coin ledger writer and never writes pearls', () => {
    expect(source).toContain("reason: 'admin_grant'");
    expect(source).toContain('prepareStarOperations(');
    expect(source).toContain('commitStarOperations(');
    expect(source).not.toContain('appendExternalEconomyEvent');
    expect(source).not.toContain("collection('shard_log')");
  });

  it('no longer ships the pearl balance adjustment callable', () => {
    expect(source).not.toContain('adminSetShardBalance = onCall');
    expect(indexSource).not.toMatch(/adminSetShardBalance/);
    expect(indexSource).toContain('export { adminGrantReward } from "./admin_grant"');
  });
});
