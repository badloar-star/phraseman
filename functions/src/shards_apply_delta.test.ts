import {
  computeShardsDeltaOutcome,
  shardOwnerMatchesResolvedIdentity,
  shardReceiptMatchesOperation,
  shardTransactionOwnerMatchesIdentity,
  validateShardsApplyDeltaInput,
} from './shards_apply_delta';
import { readFileSync } from 'fs';
import { join } from 'path';

// K3: серверный callable shardsApplyDelta — единственная точка записи баланса
// осколков (runTransaction + идемпотентность по opId). Здесь покрываем чистое ядро:
// валидацию входа и вычисление исхода транзакции (идемпотентность / spend-guard).

describe('validateShardsApplyDeltaInput', () => {
  const base = {
    opId: 'abcd1234efgh',
    ownerStableId: 'stable-owner-a',
    delta: 1,
    type: 'earn' as const,
    reason: 'lesson_first',
  };

  it('accepts a well-formed earn op', () => {
    const r = validateShardsApplyDeltaInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        opId: 'abcd1234efgh',
        ownerStableId: 'stable-owner-a',
        delta: 1,
        type: 'earn',
        reason: 'lesson_first',
      });
    }
  });

  it('accepts a spend op', () => {
    const r = validateShardsApplyDeltaInput({ ...base, type: 'spend', reason: 'card_pack' });
    expect(r.ok).toBe(true);
  });

  it('rejects a too-short opId (idempotency key must be robust)', () => {
    expect(validateShardsApplyDeltaInput({ ...base, opId: 'short' }).ok).toBe(false);
  });

  it('rejects an opId with illegal characters', () => {
    expect(validateShardsApplyDeltaInput({ ...base, opId: 'has space 1234' }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, opId: 'path/traversal/x' }).ok).toBe(false);
  });

  it('rejects a non earn/spend type', () => {
    expect(validateShardsApplyDeltaInput({ ...base, type: 'admin' }).ok).toBe(false);
  });

  it('requires an explicit ownerStableId', () => {
    expect(validateShardsApplyDeltaInput({ ...base, ownerStableId: undefined }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, ownerStableId: '   ' }).ok).toBe(false);
  });

  it('rejects zero / negative / non-finite delta', () => {
    expect(validateShardsApplyDeltaInput({ ...base, delta: 0 }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, delta: -5 }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, delta: NaN }).ok).toBe(false);
  });

  it('enforces the per-op earn cap (anti-farm backstop against delta:99999)', () => {
    expect(validateShardsApplyDeltaInput({ ...base, type: 'earn', delta: 99999 }).ok).toBe(false);
    // Spend не капим — оно только уменьшает баланс, фарма не даёт.
    expect(validateShardsApplyDeltaInput({ ...base, type: 'spend', delta: 99999 }).ok).toBe(true);
  });

  it('rejects non-canonical delta, owner, and reason values instead of rewriting them', () => {
    expect(validateShardsApplyDeltaInput({ ...base, delta: 3.9 }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, delta: '3' }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, ownerStableId: ' stable-owner-a ' }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, reason: '   ' }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, reason: ' padded ' }).ok).toBe(false);
    expect(validateShardsApplyDeltaInput({ ...base, reason: 'x'.repeat(65) }).ok).toBe(false);
  });
});

describe('shardsApplyDelta owner boundary', () => {
  it('denies a resolved auth owner mismatch', () => {
    expect(shardOwnerMatchesResolvedIdentity('stable-owner-a', 'stable-owner-a')).toBe(true);
    expect(shardOwnerMatchesResolvedIdentity('stable-owner-a', 'stable-owner-b')).toBe(false);
    expect(shardOwnerMatchesResolvedIdentity(null, 'stable-owner-a')).toBe(false);
  });

  it('revalidates the authoritative owner after a transaction retry or relink', () => {
    expect(shardTransactionOwnerMatchesIdentity({
      authUid: 'provider-a',
      ownerStableId: 'stable-a',
      authLinkExists: true,
      authLinkStableId: 'stable-a',
      ownerUserExists: true,
      ownerUserFirebaseAuthUid: 'provider-a',
    })).toBe(true);
    expect(shardTransactionOwnerMatchesIdentity({
      authUid: 'provider-a',
      ownerStableId: 'stable-a',
      authLinkExists: true,
      authLinkStableId: 'stable-b',
      ownerUserExists: true,
      ownerUserFirebaseAuthUid: 'provider-a',
    })).toBe(false);
    expect(shardTransactionOwnerMatchesIdentity({
      authUid: 'provider-a',
      ownerStableId: 'stable-a',
      authLinkExists: false,
      authLinkStableId: null,
      ownerUserExists: true,
      ownerUserFirebaseAuthUid: 'provider-a',
    })).toBe(true);
  });

  it('reads deletion guards, auth link, receipt, and user inside the balance transaction', () => {
    const source = readFileSync(join(__dirname, 'shards_apply_delta.ts'), 'utf8');
    const transactionSource = source.slice(source.indexOf('db.runTransaction'));
    expect(transactionSource).toContain('tx.get(authMarkerRef)');
    expect(transactionSource).toContain('tx.get(tombstoneRef)');
    expect(transactionSource).toContain('tx.get(authLinkRef)');
    expect(transactionSource).toContain('tx.get(receiptRef)');
    expect(transactionSource).toContain('tx.get(userRef)');
    expect(transactionSource).toContain("'account_delete_pending'");
    expect(transactionSource).toContain("'Shard operation owner changed'");
  });

  it('stores idempotency only in the dedicated server receipt namespace', () => {
    const source = readFileSync(join(__dirname, 'shards_apply_delta.ts'), 'utf8');
    expect(source).toContain("const SHARD_OPERATION_RECEIPTS_COLLECTION = 'shard_operation_receipts'");
    expect(source).not.toContain("const REWARD_CLAIMS_COLLECTION = 'reward_claims'");
  });

  it('accepts an idempotent replay only when the receipt matches the exact operation', () => {
    const receipt = {
      opId: 'abcd1234efgh',
      type: 'spend',
      reason: 'shop_item',
      delta: -25,
    };
    expect(shardReceiptMatchesOperation(receipt, {
      opId: 'abcd1234efgh',
      type: 'spend',
      reason: 'shop_item',
      signedDelta: -25,
    })).toBe(true);
    expect(shardReceiptMatchesOperation(receipt, {
      opId: 'abcd1234efgh',
      type: 'earn',
      reason: 'shop_item',
      signedDelta: 25,
    })).toBe(false);
    expect(shardReceiptMatchesOperation(receipt, {
      opId: 'abcd1234efgh',
      type: 'spend',
      reason: 'shop_item',
      signedDelta: -20,
    })).toBe(false);
    expect(shardReceiptMatchesOperation({}, {
      opId: 'abcd1234efgh',
      type: 'spend',
      reason: 'shop_item',
      signedDelta: -25,
    })).toBe(false);
  });

  it('rejects a conflicting receipt before returning an idempotent result', () => {
    const source = readFileSync(join(__dirname, 'shards_apply_delta.ts'), 'utf8');
    const transactionSource = source.slice(source.indexOf('db.runTransaction'));
    const conflictCheck = transactionSource.indexOf('shardReceiptMatchesOperation(');
    const outcome = transactionSource.indexOf('computeShardsDeltaOutcome(', conflictCheck);
    expect(conflictCheck).toBeGreaterThan(-1);
    expect(outcome).toBeGreaterThan(conflictCheck);
    expect(transactionSource).toContain("'shard_operation_conflict'");
  });
});

describe('computeShardsDeltaOutcome — atomicity core', () => {
  it('earn adds the delta and marks the op for writing', () => {
    expect(computeShardsDeltaOutcome(false, 10, 2)).toEqual({
      write: true, alreadyApplied: false, insufficient: false, balance: 12,
    });
  });

  it('spend subtracts and writes when funds suffice', () => {
    expect(computeShardsDeltaOutcome(false, 10, -4)).toEqual({
      write: true, alreadyApplied: false, insufficient: false, balance: 6,
    });
  });

  it('idempotent replay: claim already exists → no write, returns current balance', () => {
    // Тот же opId второй раз — дельту не удваиваем.
    expect(computeShardsDeltaOutcome(true, 12, 2)).toEqual({
      write: false, alreadyApplied: true, insufficient: false, balance: 12,
    });
  });

  it('spend that would go negative → insufficient, no write, balance untouched', () => {
    expect(computeShardsDeltaOutcome(false, 3, -10)).toEqual({
      write: false, alreadyApplied: false, insufficient: true, balance: 3,
    });
  });

  it('spend to exactly zero is allowed', () => {
    expect(computeShardsDeltaOutcome(false, 10, -10)).toEqual({
      write: true, alreadyApplied: false, insufficient: false, balance: 0,
    });
  });

  it('treats a missing/garbage current balance as 0', () => {
    expect(computeShardsDeltaOutcome(false, NaN as unknown as number, 5).balance).toBe(5);
    expect(computeShardsDeltaOutcome(false, -7, 5).balance).toBe(5);
  });
});
