import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'auth_merge.ts'), 'utf8');
const mergeTransaction = source.slice(
  source.indexOf('async function mergeStableAccountsTransactionally('),
  source.indexOf('if (outcome.alreadyMerged'),
);

describe('auth merge RevenueCat ownership Phase 2 (RED)', () => {
  it('repoints every loser premium lineage to the winner in the identity transaction', () => {
    expect(mergeTransaction).toContain("db.collection('revenuecat_premium_lineages')");
    expect(mergeTransaction).toMatch(/where\('ownerUid', '==', loser\.stableId\)/);
    expect(mergeTransaction).toContain('premiumLineageDocId(winner.stableId, state.lineageHash)');
    expect(mergeTransaction).toContain('tx.delete(obsoleteRef)');
    expect(mergeTransaction).toContain('ACCOUNT_MERGE_OUTBOX');
  });

  it('moves lineage ownership before hiding the loser and repointing auth_links', () => {
    const lineageMove = mergeTransaction.indexOf('tx.set(lineage.targetRef');
    const loserHide = mergeTransaction.indexOf('identityHidden: true');
    const authLinkMove = mergeTransaction.indexOf('tx.set(authLinkRef');
    expect(lineageMove).toBeGreaterThan(-1);
    expect(lineageMove).toBeLessThan(loserHide);
    expect(lineageMove).toBeLessThan(authLinkMove);
  });
});
