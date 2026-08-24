import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Phase C referral admin contract', () => {
  test('dashboard is a bounded permissioned read with no repair mutation', () => {
    const source = read('functions/src/admin_referrals.ts');
    const block = source.slice(
      source.indexOf('export const adminGetReferralDashboard'),
      source.indexOf('// ── b) Статистика рулетки'),
    );

    expect(block).toContain('canReadReferralDashboard(request.auth?.token)');
    expect(source).toContain("hasPermission(role, 'money.read')");
    expect(block).toContain('pageQuery.limit(limit + 1)');
    expect(source).toContain('repairEligible');
    expect(block).toContain('sourceHealth');
    expect(block).not.toContain('reconcilePendingReferralPurchases');
    expect(block).not.toMatch(/collection\(REFERRAL_ATTRIBUTIONS\)\.select\(\)\.get\(\)/);
    expect(block).not.toMatch(/collectionGroup\(SPINS_SUBCOLLECTION\)[\s\S]*?\.select\([\s\S]*?\)\s*\.get\(\)/);
    expect(source).not.toContain('export async function reconcilePendingReferralPurchases');
  });

  test('repair is a narrow owner-only sensitive callable with durable operation phases', () => {
    const source = read('functions/src/admin_referral_purchase_repair.ts');
    const index = read('functions/src/index.ts');
    const pkg = JSON.parse(read('functions/package.json')) as { scripts?: Record<string, string> };

    expect(source).toContain('export const adminRepairPendingReferralPurchase = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain('await requireAdminAppCheck(request);');
    expect(source).toContain("role !== 'owner'");
    expect(source).toContain("hasPermission(role, 'money.manual_access.write')");
    expect(source).toContain("const REPAIR_OPERATION_PREFIX = 'referral_purchase_repair_';");
    expect(source).toContain('.doc(`${REPAIR_OPERATION_PREFIX}${input.idempotencyKey}`)');
    expect(source).toContain("phase: 'qualification_committed'");
    expect(source).toContain('phaseAuditId');
    expect(source).toContain('operatorReason: input.reason');
    expect(source).toContain('reason: storedReferralRepairOperatorReason(operation)');
    expect(source).toContain('reason: input.reason');
    expect(source).toContain('applyReferralPairBonusInTransaction');
    expect(source).toContain("phase: 'completed'");
    expect(source).toContain('applyReferralPairBonus');
    expect(index).toContain('adminRepairPendingReferralPurchase');
    expect(index).toContain('adminResumePendingReferralPurchaseRepair');
    expect(pkg.scripts?.['deploy:admin-referral-repair']).toBe(
      'node ../scripts/deploy_lock_guard.mjs && npm run build && firebase deploy --only "functions:adminGetReferralDashboard,functions:adminRepairPendingReferralPurchase,functions:adminResumePendingReferralPurchaseRepair,firestore:indexes"',
    );
  });

  test('live UI invokes repair only from an eligible row after confirmation and reason', () => {
    const html = read('admin/v2/legacy.html');
    const block = html.slice(
      html.indexOf('// Final live referrals dashboard.'),
      html.indexOf('window.mergeUserPrompt = async function'),
    );
    const loader = block.slice(block.indexOf('window.loadReferralsData = async function'), block.length);

    expect(block).toContain("httpsCallable(functionsUs, 'adminRepairPendingReferralPurchase')");
    expect(block).toContain("httpsCallable(functionsUs, 'adminResumePendingReferralPurchaseRepair')");
    expect(block).toContain('Продолжить незавершённое исправление');
    expect(block).toContain('data.pendingRepairs');
    expect(block).toContain('row.refereeStableId');
    expect(block).toContain('window._referralsSourceHealth?.pendingRepairs?.truncated');
    expect(block).toContain('Ввести ID операции вручную');
    expect(block).toContain("title: 'ID незавершённой операции'");
    expect(block).toContain('row.repairEligible');
    expect(block).toContain('window._referralsCapabilities?.canRepair');
    expect(block).toContain('showConfirmModal');
    expect(block).toContain('showInputModal');
    expect(block).toContain('response.data.auditId');
    expect(block).toContain('response.data.operationId');
    expect(block).toContain('await window.loadReferralsData(true, false)');
    expect(block).toContain('window._referralRepairCommands');
    expect(loader).not.toMatch(/getAdminRepairPendingReferralPurchaseCallable\(\)\s*\(/);
  });
});
