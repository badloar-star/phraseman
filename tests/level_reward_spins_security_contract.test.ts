import { readFileSync } from 'fs';
import { join } from 'path';

describe('level reward spins security and cleanup contract', () => {
  const root = process.cwd();

  test('exports status, claim and acknowledge callables from the canonical functions index', () => {
    const source = readFileSync(join(root, 'functions', 'src', 'index.ts'), 'utf8');
    expect(source).toContain('levelRewardSpinStatus');
    expect(source).toContain('levelRewardSpinClaim');
    expect(source).toContain('levelRewardSpinAcknowledge');
  });

  test('denies all client access to credits/results and protects root state/projection', () => {
    const rules = readFileSync(join(root, 'firestore.rules'), 'utf8');
    expect(rules).toMatch(/match \/level_spin_credits\/\{creditId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toMatch(/match \/level_spin_results\/\{requestId\}[\s\S]*?allow read, write: if false;/);
    expect(rules).toContain("'levelSpinServerState'");
    expect(rules).toContain("'level_reward_spin_balance'");
  });

  test('account deletion recursively removes the user document and its spin subcollections', () => {
    const source = readFileSync(join(root, 'functions', 'src', 'account_delete.ts'), 'utf8');
    expect(source).toContain('await ctx.db.recursiveDelete(ref, ctx.writer)');
    expect(source).toContain("{ collection: 'users', values: 'both' }");
    expect(source).toContain('db.collection(spec.collection).doc(spec.id)');
  });

  test('declares the oldest-available credit query index used by status and claim', () => {
    const indexes = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8')) as {
      indexes?: Array<{ collectionGroup?: string; fields?: Array<{ fieldPath?: string; order?: string }> }>;
    };
    expect(indexes.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: 'level_spin_credits',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'level', order: 'ASCENDING' },
        ],
      }),
    ]));
  });
});
