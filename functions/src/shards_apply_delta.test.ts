import { readFileSync } from 'fs';
import { join } from 'path';

describe('shardsApplyDelta permanent retirement', () => {
  it('retires before validation, identity resolution, or any database access', () => {
    const source = readFileSync(join(__dirname, 'shards_apply_delta.ts'), 'utf8');
    const callableSource = source.slice(source.indexOf('export const shardsApplyDelta'));
    expect(callableSource).toContain("throw new HttpsError('failed-precondition', 'personal_balance_is_client_owned')");
    expect(callableSource).not.toContain('resolveStableUidForAuth(');
    expect(callableSource).not.toContain('admin.firestore(');
    expect(callableSource).not.toContain('runTransaction(');
  });

  it('contains no dormant validation, balance computation, or affordability implementation', () => {
    const source = readFileSync(join(__dirname, 'shards_apply_delta.ts'), 'utf8');
    for (const forbidden of [
      'computeShardsDeltaOutcome', 'readShardBalance', 'validateShardsApplyDeltaInput',
      'shardReceiptMatchesOperation', 'shardTransactionOwnerMatchesIdentity', 'insufficient',
      'currentBalance', 'signedDelta',
    ]) expect(source).not.toContain(forbidden);
  });
});
