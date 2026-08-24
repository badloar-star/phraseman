import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const entitlementWriters = [
  'functions/src/admin_access_controls.ts',
  'functions/src/admin_user_operations.ts',
  'functions/src/auth_merge.ts',
  'functions/src/promo_codes.ts',
  'functions/src/referral.ts',
  'functions/src/referral_spin.ts',
  'functions/src/revenuecat_shards.ts',
  'functions/src/telegram_premium_admin.ts',
  'functions/src/telegram_premium_bot.ts',
  'functions/src/vip_survey.ts',
  'functions/src/web_checkout.ts',
  'functions/src/vip_orphan_reconcile.ts',
  'functions/src/vip_revoke.ts',
  'functions/src/premium_expiry_cron.ts',
] as const;

describe('access projection writer inventory', () => {
  test.each(entitlementWriters)('%s routes entitlement mutations through the shared projection writer', (file) => {
    expect(read(file)).toContain('writeAccessProjection');
  });

  test('RevenueCat lineage stays a pure reducer; its Firestore callers own the atomic projection write', () => {
    const reducer = read('functions/src/revenuecat_premium_lineage.ts');
    expect(reducer).not.toMatch(/\b(?:tx|batch)\.(?:set|update|delete)\(/);
    expect(read('functions/src/revenuecat_shards.ts')).toContain('writeAccessProjection');
    expect(read('functions/src/premium_expiry_cron.ts')).toContain('writeAccessProjectionFromPatch');
    expect(read('functions/src/auth_merge.ts')).toContain('writeAccessProjection');
  });

  test('PremiumContext listens only to the tiny access document', () => {
    const source = read('components/PremiumContext.tsx');
    expect(source).toContain("collection('access_projection').doc('current')");
    expect(source).not.toContain("collection('users').doc(uid).onSnapshot");
  });

  test('backfill is dry-run by default and requires exact project confirmation to write', () => {
    const source = read('scripts/backfill_access_projection.mjs');
    expect(source).toContain("const apply = args.includes('--apply')");
    expect(source).toContain("confirmation !== TARGET_PROJECT");
    expect(source).toContain("projectId: TARGET_PROJECT");
    expect(source).toContain("{ merge: false }");
  });
});
