import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const live = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');
const mainEntry = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
const englishTestEntry = fs.readFileSync(path.join(root, 'functions-english-test/index.js'), 'utf8');
const functionsPackage = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

function literalLiveCallables(): string[] {
  const names = new Set<string>();
  for (const match of live.matchAll(/httpsCallable\([^,]+,\s*['"]([A-Za-z0-9_]+)['"]/g)) names.add(match[1]);
  for (const match of live.matchAll(/createAdminAuthCallable\(['"]([A-Za-z0-9_]+)['"]\)/g)) names.add(match[1]);
  return [...names].sort();
}

describe('live admin callable deployment parity', () => {
  it('maps every literal live callable to a deployable source export', () => {
    const inventory = literalLiveCallables();
    const missing = inventory.filter((name) => (
      !mainEntry.includes(name)
      && !englishTestEntry.includes(`exports.${name}`)
    ));

    expect(inventory).toContain('adminActivateTelegramPremiumOrder');
    expect(inventory).toContain('adminInspectTelegramPromoCode');
    expect(inventory).toContain('adminEnglishTestAnalytics');
    expect(inventory).toContain('adminUserBriefs');
    expect(inventory).toContain('adminListShardRefunds');
    expect(inventory.length).toBeGreaterThan(60);
    expect(missing).toEqual([]);
  });

  function deployedFunctions(scriptName: string): string[] {
    const command = functionsPackage.scripts?.[scriptName] || '';
    const match = command.match(/firebase deploy --only\s+\"([^\"]+)\"|firebase deploy --only\s+([^\s]+)/);
    const only = match?.slice(1).find(Boolean) || '';
    return only.split(',').map((entry) => entry.trim().replace(/^functions:/, '')).filter(Boolean).sort();
  }

  it('uses exact narrow deployment profiles for the changed Phase A callables', () => {
    expect(deployedFunctions('deploy:gift-certificates')).toEqual([
      'adminCancelGiftCertificateBatchOperation',
      'adminCreateGiftCertificateBatch',
      'adminDeleteGiftCertificate',
      'adminGetGiftCertificateBatchOperation',
      'adminGetGiftCertificateDownload',
      'adminListGiftCertificates',
      'adminReplaceSyntheticGiftCertificate',
      'adminSendPreparedGiftCertificate',
      'adminUpdateGiftCertificatePersonalization',
      'adminUpdateGiftCertificateRecipient',
    ].sort());
    expect(deployedFunctions('deploy:admin-user-briefs')).toEqual(['adminUserBriefs']);
    expect(deployedFunctions('deploy:promo-admin')).toEqual([
      'adminListPromoCodes',
      'promoCodeBatchUpsert',
      'promoCodeDelete',
      'promoCodeUpsert',
    ].sort());
    expect(deployedFunctions('deploy:admin-audit-security')).toEqual(['adminListAuditLog']);
    expect(deployedFunctions('deploy:admin-refund-center')).toEqual([
      'adminListShardRefunds',
      'firestore:rules',
    ].sort());
    expect(deployedFunctions('deploy:telegram-premium')).toEqual([
      'adminActivateTelegramPremiumOrder',
      'adminInspectTelegramPromoCode',
      'telegramPremiumWebhook',
    ].sort());
    const broad = deployedFunctions('deploy:admin-control-plane');
    expect(broad).not.toContain('adminUserBriefs');
    expect(broad).not.toContain('adminCreateGiftCertificateBatch');
    expect(broad).not.toContain('adminActivateTelegramPremiumOrder');
    expect(broad).not.toContain('adminListShardRefunds');
  });
});
