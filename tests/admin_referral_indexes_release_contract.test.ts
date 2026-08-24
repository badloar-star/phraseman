import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('referral dashboard indexes and release profile', () => {
  test('every collection-group query has exact index support', () => {
    const config = JSON.parse(read('firestore.indexes.json')) as {
      indexes: Array<{ collectionGroup: string; queryScope: string; fields: Array<{ fieldPath: string; order: string }> }>;
      fieldOverrides: Array<{ collectionGroup: string; fieldPath: string; indexes: Array<{ order: string; queryScope: string }> }>;
    };
    const hasGroupField = (fieldPath: string) => config.fieldOverrides.some((entry) => (
      entry.collectionGroup === 'referral_spins'
      && entry.fieldPath === fieldPath
      && entry.indexes.some((index) => index.queryScope === 'COLLECTION_GROUP' && index.order === 'ASCENDING')
    ));
    expect(hasGroupField('creditId')).toBe(true);
    expect(hasGroupField('creditSource')).toBe(true);
    expect(hasGroupField('prizeDays')).toBe(true);
    expect(config.indexes).toContainEqual(expect.objectContaining({
      collectionGroup: 'referral_spins',
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'prizeKind', order: 'ASCENDING' },
        { fieldPath: 'prizePearls', order: 'ASCENDING' },
      ],
    }));
  });

  test('receipt reads are capped with a sentinel and surface integrity health', () => {
    const source = read('functions/src/admin_referrals.ts');
    const block = source.slice(
      source.indexOf('export const adminGetReferralDashboard'),
      source.indexOf('// ── b) Статистика рулетки'),
    );
    expect(block).toContain('.limit(creditIds.length + 1)');
    expect(block).toContain('receiptIntegrityError');
    expect(block).toContain("state: receiptIntegrityError ? 'error'");
  });

  test('bounded pending repair discovery retains target context and exposes truncation', () => {
    const source = read('functions/src/admin_referral_purchase_repair.ts');
    expect(source).toContain('refereeStableId: String(data.refereeStableId');
    expect(source).toContain('.limit(REPAIR_RESUME_LIMIT + 1)');
    expect(source).toContain('truncated: snapshot.docs.length > REPAIR_RESUME_LIMIT');
  });

  test('release scripts are exact and include indexes only with referral queries', () => {
    const pkg = JSON.parse(read('functions/package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['deploy:admin-referral-repair']).toBe(
      'node ../scripts/deploy_lock_guard.mjs && npm run build && firebase deploy --only "functions:adminGetReferralDashboard,functions:adminRepairPendingReferralPurchase,functions:adminResumePendingReferralPurchaseRepair,firestore:indexes"',
    );
    expect(pkg.scripts['deploy:admin-analytics-access']).toBe(
      'node ../scripts/deploy_lock_guard.mjs && npm run build && firebase deploy --only "functions:adminProductAnalytics,functions:adminSubscriptionAnalytics,functions:adminMonthlyDecisionPack"',
    );
  });
});
