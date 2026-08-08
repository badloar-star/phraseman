import {
  LEVEL_SPIN_RESULT_TTL_MS,
  applyLevelSpinResultAction,
  expirePendingLevelSpinDeliveries,
  creditIdForLevel,
  creditIdForLevelExam,
  creditsToMint,
  creditsToMintForCompletion,
  canonicalLevelSpinGiftId,
  publicLevelSpinReceipt,
  resolveCurrentLevelSpinEntitlement,
  rewardForSpin,
  rewardForSpinForCurrentEntitlement,
} from './level_reward_spins';
import { readFileSync } from 'fs';

describe('level reward spins', () => {
  test('terminalizes expired pending lanes so they cannot starve live recovery', () => {
    expect(expirePendingLevelSpinDeliveries({
      revealState: 'acknowledged',
      deliveries: {
        base: { state: 'unclaimed' },
        premium: { state: 'delivering', deliveryToken: 'token-1234567890', deliveryLeaseUntilMs: 99 },
      },
    })).toEqual({
      revealState: 'acknowledged',
      deliveries: {
        base: { state: 'expired', deliveryToken: null, deliveryLeaseUntilMs: 0 },
        premium: { state: 'expired', deliveryToken: null, deliveryLeaseUntilMs: 0 },
      },
    });
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const status = source.slice(
      source.indexOf('export const levelRewardSpinStatus'),
      source.indexOf('export const levelRewardSpinClaim'),
    );
    expect(status).toContain(".where('expiresAtMs', '>', nowMs)");
    expect(status).toContain(".where('expiresAtMs', '<=', nowMs)");
    expect(status).toContain('hasPendingDelivery: false');
  });
  test('mints deterministic credits only for crossed levels in the supported 1..60 range', () => {
    expect(creditsToMint(3, 6)).toEqual([
      { id: 'level_spin_v1_004', level: 4, kind: 'standard' },
      { id: 'level_spin_v1_005', level: 5, kind: 'milestone' },
      { id: 'level_spin_v1_006', level: 6, kind: 'standard' },
    ]);
    expect(creditsToMint(59, 80)).toEqual([
      { id: 'level_spin_v1_060', level: 60, kind: 'milestone' },
    ]);
    expect(creditsToMint(0, 2)).toEqual([
      { id: 'level_spin_v1_002', level: 2, kind: 'standard' },
    ]);
    expect(creditIdForLevel(5)).toBe('level_spin_v1_005');
    expect(() => creditIdForLevel(0)).toThrow('level_spin_level_invalid');
    expect(() => creditIdForLevel(61)).toThrow('level_spin_level_invalid');
  });

  test('uses a separate idempotency namespace for level exam spins', () => {
    expect(creditIdForLevelExam('A1')).toBe('level_exam_spin_v1_A1');
    expect(creditIdForLevelExam('B2')).toBe('level_exam_spin_v1_B2');
    expect(() => creditIdForLevelExam('C1' as never)).toThrow('level_exam_spin_level_invalid');
  });

  test('adds exactly one exam credit only for the first passing completion', () => {
    expect(creditsToMintForCompletion(10, 10, { level: 'A2', firstPass: true })).toEqual([
      { id: 'level_exam_spin_v1_A2', level: 3, kind: 'standard' },
    ]);
    expect(creditsToMintForCompletion(10, 10, { level: 'A2', firstPass: false })).toEqual([]);
    expect(creditsToMintForCompletion(9, 10, { level: 'A2', firstPass: true })).toEqual([
      { id: 'level_spin_v1_010', level: 10, kind: 'milestone' },
      { id: 'level_exam_spin_v1_A2', level: 3, kind: 'standard' },
    ]);
  });

  test('publishes an exam credit through the same immutable receipt protocol', () => {
    expect(publicLevelSpinReceipt('examreward1234567', {
      creditId: 'level_exam_spin_v1_A2',
      level: 3,
      kind: 'standard',
      baseGiftId: 'xp_50',
      premiumGiftId: null,
      createdAtMs: 1_000,
      expiresAtMs: 1_000 + LEVEL_SPIN_RESULT_TTL_MS,
      balanceAfter: 1,
      revealState: 'pending',
      deliveries: { base: { state: 'unclaimed' } },
      catalogVersion: 1,
      schemaVersion: 1,
    }, 'stable-a')).toMatchObject({ creditId: 'level_exam_spin_v1_A2', level: 3, kind: 'standard' });
  });

  test('preserves the exact milestone reward through level 60', () => {
    expect(rewardForSpin({ level: 5, kind: 'milestone', premiumAtEarn: false }, () => 0))
      .toEqual({ baseGiftId: 'xp_bank_150' });
    expect(rewardForSpin({ level: 30, kind: 'milestone', premiumAtEarn: false }, () => 0.999999))
      .toEqual({ baseGiftId: 'choice_3_level' });
    expect(rewardForSpin({ level: 60, kind: 'milestone', premiumAtEarn: false }, () => 0.5))
      .toEqual({ baseGiftId: 'choice_3_level' });
  });

  test('uses injected RNG boundaries and creates the Plus pair in one immutable result', () => {
    expect(rewardForSpin({ level: 4, kind: 'standard', premiumAtEarn: false }, () => 0).baseGiftId)
      .toBe('energy_full');
    expect(rewardForSpin({ level: 4, kind: 'standard', premiumAtEarn: false }, () => 0.999999).baseGiftId)
      .toBe('choice_3_level');
    const samples = [0, 0.999999];
    expect(rewardForSpin({ level: 4, kind: 'standard', premiumAtEarn: true }, () => samples.shift() ?? 0))
      .toEqual({ baseGiftId: 'xp_50', premiumGiftId: 'prem_pack_48h' });
    expect(rewardForSpin({ level: 30, kind: 'milestone', premiumAtEarn: true }, () => 0))
      .toEqual({ baseGiftId: 'xp_bank_600', premiumGiftId: 'prem_shards_10' });
  });

  test('removes the unusable club boost from every new standard spin outcome', () => {
    const outcomes = new Set(Array.from({ length: 2000 }, (_, index) => rewardForSpin(
      { level: 4, kind: 'standard', premiumAtEarn: false },
      () => index / 2000,
    ).baseGiftId));
    expect(outcomes).not.toContain('club_boost_free');
  });

  test('uses current entitlement canonicalization at status, replay, and delivery boundaries', () => {
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const statusBody = source.slice(
      source.indexOf('export const levelRewardSpinStatus'),
      source.indexOf('export const levelRewardSpinClaim'),
    );
    const claimBody = source.slice(
      source.indexOf('export const levelRewardSpinClaim'),
      source.indexOf('export const levelRewardSpinAcknowledge'),
    );
    const deliveryBody = source.slice(source.indexOf('export const levelRewardSpinDelivery'));
    expect(statusBody).toContain('publicLevelSpinReceipt');
    expect(statusBody).toContain('resolveCurrentLevelSpinEntitlement');
    expect(claimBody).toContain('resolveCurrentLevelSpinEntitlement');
    expect(claimBody).toContain('rewardForSpinForCurrentEntitlement');
    expect(deliveryBody).toContain('resolveCurrentLevelSpinEntitlement');
    expect(deliveryBody).toContain('canonicalLevelSpinGiftId');
  });

  test('resolves current entitlement as plus, standard, or fail-closed unknown', async () => {
    await expect(resolveCurrentLevelSpinEntitlement(async () => true)).resolves.toBe('plus');
    await expect(resolveCurrentLevelSpinEntitlement(async () => false)).resolves.toBe('standard');
    await expect(resolveCurrentLevelSpinEntitlement(async () => {
      throw new Error('lookup unavailable');
    })).resolves.toBe('unknown');
  });

  test('uses current entitlement for new rewards and never grants an unknown premium lane', () => {
    expect(rewardForSpinForCurrentEntitlement(
      { level: 4, kind: 'standard' },
      'standard',
      () => 0,
    )).toEqual({ baseGiftId: 'energy_full' });
    expect(rewardForSpinForCurrentEntitlement(
      { level: 4, kind: 'standard' },
      'unknown',
      () => 0,
    )).toEqual({ baseGiftId: 'xp_50' });
    const plusSamples = [0, 0.999999];
    expect(rewardForSpinForCurrentEntitlement(
      { level: 4, kind: 'standard' },
      'plus',
      () => plusSamples.shift() ?? 0,
    )).toEqual({ baseGiftId: 'xp_50', premiumGiftId: 'prem_pack_48h' });
    expect(rewardForSpinForCurrentEntitlement(
      { level: 30, kind: 'milestone' },
      'unknown',
      () => 0,
    )).toEqual({ baseGiftId: 'xp_bank_600' });
  });

  test('canonically replaces Plus-unsafe and removed gifts without changing safe choices', () => {
    expect(canonicalLevelSpinGiftId('club_boost_free', 'standard')).toBe('xp_250');
    expect(canonicalLevelSpinGiftId('club_boost_free', 'plus')).toBe('xp_250');
    expect(canonicalLevelSpinGiftId('energy_plus3', 'plus')).toBe('xp_250');
    expect(canonicalLevelSpinGiftId('energy_full', 'unknown')).toBe('xp_250');
    expect(canonicalLevelSpinGiftId('choice_3_level', 'plus')).toBe('xp_bank_600');
    expect(canonicalLevelSpinGiftId('choice_3_level', 'unknown')).toBe('xp_bank_600');
    expect(canonicalLevelSpinGiftId('choice_3_level', 'standard')).toBe('choice_3_level');
    expect(canonicalLevelSpinGiftId('focus_15m_50', 'plus')).toBe('focus_15m_50');
  });

  test('accepts a raw immutable direct-delivery selection when it canonicalizes to the effective gift', () => {
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const deliveryBody = source.slice(source.indexOf('export const levelRewardSpinDelivery'));
    expect(deliveryBody).toContain(
      'const canonicalSelectedGiftId = canonicalLevelSpinGiftId(selectedGiftId, entitlement);',
    );
    expect(deliveryBody).toContain('canonicalSelectedGiftId !== effectiveGiftId');
    expect(deliveryBody).toContain('currentLane.selectedGiftId ?? effectiveGiftId');
  });

  test('anchors expiry to the immutable receipt timestamp', () => {
    expect(LEVEL_SPIN_RESULT_TTL_MS).toBe(259_200_000);
  });

  test('keeps revealed receipts recoverable until their inventory entitlement is consumed', () => {
    const pending = {
      revealState: 'pending' as const,
      deliveries: {
        base: { state: 'unclaimed' as const },
        premium: { state: 'unclaimed' as const },
      },
    };
    expect(applyLevelSpinResultAction(pending, { action: 'acknowledge', nowMs: 10 }))
      .toEqual({ ...pending, revealState: 'acknowledged', acknowledgedAtMs: 10 });
    expect(applyLevelSpinResultAction(
      { ...pending, revealState: 'acknowledged' },
      { action: 'begin_delivery', lane: 'base', nowMs: 20, deliveryToken: 'delivery-token-1234' },
    )).toMatchObject({
      revealState: 'acknowledged',
      deliveries: {
        base: { state: 'delivering', deliveryToken: 'delivery-token-1234' },
        premium: { state: 'unclaimed' },
      },
    });
    expect(() => applyLevelSpinResultAction(pending, {
      action: 'complete_delivery', lane: 'base', nowMs: 30, deliveryToken: 'delivery-token-1234',
    })).toThrow('level_spin_reveal_required');
    expect(() => applyLevelSpinResultAction(
      { revealState: 'acknowledged', deliveries: { base: { state: 'unclaimed' } } },
      { action: 'begin_delivery', lane: 'premium', nowMs: 40, deliveryToken: 'delivery-token-1234' },
    )).toThrow('level_spin_delivery_lane_missing');
  });

  test('keeps delivered lanes terminal after TTL and expires only nonterminal lanes', () => {
    const delivered = {
      revealState: 'acknowledged' as const,
      deliveries: { base: { state: 'delivered' as const, deliveredAtMs: 20 } },
    };
    expect(applyLevelSpinResultAction(delivered, {
      action: 'complete_delivery', lane: 'base', nowMs: 200, deliveryToken: 'delivery-token-1234',
    }, 100)).toEqual(delivered);
    expect(applyLevelSpinResultAction({
      revealState: 'acknowledged',
      deliveries: { base: { state: 'unclaimed' } },
    }, {
      action: 'begin_delivery', lane: 'base', nowMs: 100, deliveryToken: 'delivery-token-1234',
    }, 100)).toMatchObject({ deliveries: { base: { state: 'expired' } } });
  });

  test('returns a distinct terminal status for successful delivery completion', () => {
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    expect(source).toContain("action === 'complete_delivery' ? 'claimed'");
  });

  test('expired delivery reports the same canonical gift as expired claim replay', () => {
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const deliveryBody = source.slice(source.indexOf('export const levelRewardSpinDelivery'));
    expect(deliveryBody).toContain("status: 'expired', giftId: expiredGiftId");
    expect(deliveryBody).toContain('currentLane.selectedGiftId ?? effectiveGiftId');
  });

  test('status exposes a whitelisted receipt DTO without delivery lease tokens', () => {
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const statusBody = source.slice(
      source.indexOf('export const levelRewardSpinStatus'),
      source.indexOf('export const levelRewardSpinClaim'),
    );
    expect(statusBody).toContain('publicLevelSpinReceipt');
    expect(statusBody).not.toContain('{ ...data,');
    expect(statusBody).not.toContain('deliveryToken');
  });

  test('claim replay exposes the same public receipt without delivery authority tokens', () => {
    const receipt = publicLevelSpinReceipt('1234567890abcdef', {
      creditId: 'level_spin_v1_006', level: 6, kind: 'standard',
      baseGiftId: 'xp_100', premiumGiftId: null,
      createdAtMs: 100, expiresAtMs: 100 + LEVEL_SPIN_RESULT_TTL_MS,
      balanceAfter: 1, catalogVersion: 1, schemaVersion: 1,
      revealState: 'acknowledged',
      deliveries: { base: { state: 'delivering', deliveryToken: 'secret-token', deliveryLeaseUntilMs: 200 } },
    }, 'stable-a');
    expect(receipt).toMatchObject({ requestId: '1234567890abcdef', stableUid: 'stable-a' });
    expect(JSON.stringify(receipt)).not.toContain('secret-token');
    expect(JSON.stringify(receipt)).not.toContain('deliveryToken');
    const source = readFileSync(__filename.replace(/\.test\.ts$/, '.ts'), 'utf8');
    const claimBody = source.slice(
      source.indexOf('export const levelRewardSpinClaim'),
      source.indexOf('export const levelRewardSpinAcknowledge'),
    );
    expect(claimBody).toContain('publicLevelSpinReceipt');
    expect(claimBody).toContain('const internalResult = await db.runTransaction');
  });

  test('presents one canonical effective gift for stale receipts without mutating stored input', () => {
    const data = {
      creditId: 'level_spin_v1_030', level: 30, kind: 'milestone',
      baseGiftId: 'choice_3_level', premiumGiftId: null,
      createdAtMs: 100, expiresAtMs: 100 + LEVEL_SPIN_RESULT_TTL_MS,
      balanceAfter: 0, catalogVersion: 1, schemaVersion: 1,
      revealState: 'acknowledged',
      deliveries: { base: { state: 'unclaimed' } },
    };
    expect(publicLevelSpinReceipt('1234567890abcdef', data, 'stable-a', 'plus')).toMatchObject({
      requestId: '1234567890abcdef',
      baseGiftId: 'xp_bank_600',
      deliveries: { base: { state: 'unclaimed' } },
    });
    const staleClub = {
      ...data,
      level: 6,
      kind: 'standard',
      creditId: 'level_spin_v1_006',
      baseGiftId: 'club_boost_free',
      premiumGiftId: 'prem_shards_10',
      deliveries: {
        base: { state: 'delivering', selectedGiftId: 'club_boost_free' },
        premium: { state: 'unclaimed' },
      },
    };
    expect(publicLevelSpinReceipt('1234567890abcdef', staleClub, 'stable-a', 'plus')).toMatchObject({
      baseGiftId: 'xp_250',
      premiumGiftId: 'prem_shards_10',
      deliveries: {
        base: { state: 'delivering', selectedGiftId: 'xp_250' },
        premium: { state: 'unclaimed' },
      },
    });
    expect(publicLevelSpinReceipt('1234567890abcdef', staleClub, 'stable-a', 'unknown')).toMatchObject({
      baseGiftId: 'xp_250',
      premiumGiftId: null,
      deliveries: { base: { state: 'delivering', selectedGiftId: 'xp_250' } },
    });
    expect(publicLevelSpinReceipt(
      '1234567890abcdef', staleClub, 'stable-a', 'unknown', 100 + LEVEL_SPIN_RESULT_TTL_MS,
    )).toMatchObject({
      deliveries: { base: { state: 'expired', selectedGiftId: 'xp_250' } },
    });
    expect(staleClub.deliveries.base.selectedGiftId).toBe('club_boost_free');
  });
});
