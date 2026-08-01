import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('live admin gift certificates workflow', () => {
  const live = read('admin/v2/legacy.html');
  const server = read('functions/src/web_checkout.ts');
  const functionsIndex = read('functions/src/index.ts');

  test('exists only on the single live legacy admin surface and under Money', () => {
    expect(live).toContain("switchTab('gift-certificates')");
    expect(live).toContain('id="tab-gift-certificates"');
    expect(live).toContain("'gift-certificates': 'revenue'");
    expect(live).toContain("'gift-certificates': 'Подарочные сертификаты'");
    for (const frozen of ['admin/legacy.html', 'admin/index.html', 'admin/full.html', 'admin/site.html', 'admin/v2/index.html']) {
      const absolute = path.join(root, frozen);
      if (fs.existsSync(absolute)) expect(fs.readFileSync(absolute, 'utf8')).not.toContain('id="tab-gift-certificates"');
    }
  });

  test('uses App Check-protected server callables for issue/history/repair/send and never creates gift codes locally', () => {
    expect(live).toContain("httpsCallable(functionsUs, 'adminCreateGiftCertificateBatch')");
    expect(live).toContain("httpsCallable(functionsUs, 'adminListGiftCertificates')");
    expect(live).toContain("httpsCallable(functionsUs, 'adminUpdateGiftCertificateRecipient')");
    expect(live).toContain("httpsCallable(functionsUs, 'adminGetGiftCertificateDownload')");
    expect(live).toContain("httpsCallable(functionsUs, 'adminReplaceSyntheticGiftCertificate')");
    expect(live).toContain("httpsCallable(functionsUs, 'adminSendPreparedGiftCertificate')");
    expect(server).toContain('export const adminCreateGiftCertificateBatch = onCall(');
    expect(server).toContain('export const adminListGiftCertificates = onCall(');
    expect(server).toContain('export const adminGetGiftCertificateDownload = onCall(');
    expect(server).toContain("hasClaimedPermission(auth.token, 'money.manual_access.write')");
    expect(server).toContain("hasClaimedPermission(auth.token, 'money.read')");
    expect(server).toContain('enforceAppCheck: true');
    expect(functionsIndex).toContain('adminCreateGiftCertificateBatch');
    expect(functionsIndex).toContain('adminListGiftCertificates');
    expect(functionsIndex).toContain('adminUpdateGiftCertificateRecipient');
    expect(functionsIndex).toContain('adminGetGiftCertificateDownload');
    const clientStart = live.indexOf('function giftCertificateReadForm');
    const clientEnd = live.indexOf('// END GIFT CERTIFICATES');
    expect(clientStart).toBeGreaterThan(0);
    expect(clientEnd).toBeGreaterThan(clientStart);
    const client = live.slice(clientStart, clientEnd);
    expect(client).not.toMatch(/Math\.random|crypto\.getRandomValues|GIFT-\s*\+/);
  });

  test('persists one account-scoped lowercase UUID-v4 and immutable request across reload until verified success or cancellation', () => {
    const clientStart = live.indexOf('// -- GIFT CERTIFICATES:');
    const clientEnd = live.indexOf('// END GIFT CERTIFICATES', clientStart);
    expect(clientStart).toBeGreaterThan(0);
    expect(clientEnd).toBeGreaterThan(clientStart);
    const client = live.slice(clientStart, clientEnd);

    expect(client).toContain('let _giftCertificatePendingBatch = null;');
    expect(client).toContain("const GIFT_CERTIFICATE_PENDING_BATCH_STORAGE_PREFIX = 'phraseman_admin_gift_certificate_pending_batch_v1';");
    expect(client).toContain('auth.currentUser.uid');
    expect(client).toContain('localStorage.getItem(storageKey)');
    expect(client).toContain('localStorage.setItem(storageKey, JSON.stringify(pendingBatch))');
    expect(client).toContain('localStorage.removeItem(storageKey)');
    expect(client).toContain('crypto.randomUUID().toLowerCase()');
    expect(client).toContain('Object.freeze([...form.recipientNames])');
    expect(client).toContain('Object.freeze([...form.recipientEmails])');
    expect(client).toContain('const pendingBatch = giftCertificatePendingBatchForCurrentAdmin() || giftCertificateCreatePendingBatch(form);');
    expect(client).toContain('_giftCertificatePendingBatch = pendingBatch;');
    expect(client).toContain('giftCertificatePersistPendingBatch(pendingBatch);');
    expect(client).toContain('operationId: pendingBatch.operationId');
    expect(client).toMatch(/if \(!confirmed\) \{\s+giftCertificateClearPendingBatch\('explicit_cancellation'\);/);
    expect(client).toContain('response.data?.operationId !== pendingBatch.operationId');
    expect(client).toContain('response.data.certificates.length !== pendingBatch.request.count');
    expect(client).toMatch(/response\.data\?\.operationId !== pendingBatch\.operationId[\s\S]*?giftCertificateClearPendingBatch\('verified_success'\);[\s\S]*?const created/);
    expect(client).toContain("if (!['verified_success', 'explicit_cancellation'].includes(reason))");
  });

  test('locks recipient fields for every ambiguous or final delivery state in both server and UI', () => {
    expect(server).toMatch(/current\.status === 'sent'[\s\S]*?current\.status === 'sending'[\s\S]*?current\.status === 'delivery_unknown'[\s\S]*?current\.status === 'reconciliation_required'/);
    expect(live).toContain("['sent', 'sending', 'delivery_unknown', 'reconciliation_required'].includes(String(record.status || ''))");
  });

  test('propagates critical final delivery writes into the existing idempotent reconciliation path', () => {
    const writerStart = server.indexOf('async function markActivationEmailStatusAt');
    const writerEnd = server.indexOf('export function deliveryStatusForEmailOutcome', writerStart);
    const writer = server.slice(writerStart, writerEnd);
    expect(writerStart).toBeGreaterThan(0);
    expect(writer).toContain('propagateFailure: boolean = false');
    expect(writer).toMatch(/catch \(e\) \{[\s\S]*?if \(propagateFailure\) throw e;/);

    const outcomeStart = server.indexOf('async function markActivationEmailOutcome');
    const outcomeEnd = server.indexOf('function formatRuDate', outcomeStart);
    const outcome = server.slice(outcomeStart, outcomeEnd);
    expect(outcome).toContain('await markActivationEmailStatusAt(statusRef, { ...patch, status: deliveryStatus }, true);');
    expect(server).toContain("}, deliveryRef, deliveryId);");
    expect(server).toContain("if (!sent) throw new HttpsError('failed-precondition', 'gift_certificate_email_not_sent');");
  });

  test('renders Gift Certificates as a standalone sibling of Promo Codes while preserving the promo list', () => {
    const promoNav = live.indexOf("switchTab('promo-codes')");
    const giftNav = live.indexOf("switchTab('gift-certificates')", promoNav);
    const promoSectionStart = live.indexOf('<div id="tab-promo-codes" class="reports-tab">');
    const giftSectionStart = live.indexOf('<div id="tab-gift-certificates" class="reports-tab">');
    expect(promoNav).toBeGreaterThan(0);
    expect(giftNav).toBeGreaterThan(promoNav);
    expect(promoSectionStart).toBeGreaterThan(0);
    expect(giftSectionStart).toBeGreaterThan(promoSectionStart);

    const promoSection = live.slice(promoSectionStart, giftSectionStart);
    expect(promoSection).toContain('id="promo-codes-list"');
    expect(promoSection).not.toContain('id="tab-gift-certificates"');
    expect(live).toContain("[document.getElementById('cp-promo-list'), document.getElementById('promo-codes-list')]");
  });

  test('keeps the standalone Gift Certificates navigation keyboard-operable outside layout edit mode', () => {
    const giftNav = live.match(/<div id="admin-nav-gift-certificates"[^>]*>/)?.[0] || '';

    expect(giftNav).toContain('id="admin-nav-gift-certificates"');
    expect(giftNav).toContain('class="tab"');
    expect(giftNav).toContain("onclick=\"switchTab('gift-certificates')\"");
    expect(giftNav).toContain('role="button"');
    expect(giftNav).toContain('tabindex="0"');
    expect(giftNav).toContain("dataset.navEdit !== 'true'");
    expect(giftNav).toContain("event.key === 'Enter'");
    expect(giftNav).toContain("event.key === ' '");
    expect(giftNav).toContain('event.preventDefault()');
    expect(live).toMatch(/#admin-nav-gift-certificates:focus-visible\s*\{[^}]*outline:/);
  });

  test('has labelled quantity/product/recipient inputs, preview confirmation, safe history and per-row download', () => {
    expect(live).toContain('for="gift-certificate-product"');
    expect(live).toContain('id="gift-certificate-product"');
    expect(live).toContain('for="gift-certificate-count"');
    expect(live).toContain('id="gift-certificate-count" min="1" max="200"');
    expect(live).toContain('for="gift-certificate-recipients"');
    expect(live).toContain('id="gift-certificate-recipients"');
    expect(live).toContain('id="gift-certificate-preview"');
    expect(live).toContain("title: isRetry ? 'Повторить незавершённую операцию?' : 'Создать подарочные сертификаты?'");
    expect(live).toContain('id="gift-certificates-history"');
    expect(live).toContain('data-gift-recipient-name');
    expect(live).toContain('data-gift-recipient-email');
    expect(live).toContain('Отправитель: текущий production sender Phraseman (WEB_CHECKOUT_EMAIL_FROM через Resend)');
    expect(live).toContain('window.downloadGiftCertificate = async function(certificateId)');
    expect(live).toContain('window.sendGiftCertificateEmail = async function(certificateId)');
    expect(live).toContain('await persistGiftCertificateRecipient(certificateId)');
    expect(live).toContain('record.activationCode');
    expect(live).toContain('record.assetUrl');
    expect(live).toContain('giftCertificateAssertAsset(record)');
    expect(live).toContain('canvas.toBlob');
    expect(live).toContain('download.data?.assetBase64');
    expect(live).toContain("atob(download.data.assetBase64)");
    expect(live).not.toContain("return fetch(url, { method: 'GET', mode: 'cors'");
    expect(live).toContain('while (nextCursor)');
  });

  test('keeps the exact old synthetic replacement as an explicit two-step repair, never an automatic send', () => {
    expect(live).toContain('GIFT-TEST-FRNRYV23VS');
    expect(live).toContain('Simulated gift purchase; no payment; requested 2026-07-29; recipient badloar@gmail.com');
    expect(live).toContain('badloar@gmail.com');
    expect(live).toContain('Профессор Лингман');
    expect(live).toContain('REPLACE_VERIFIED_SYNTHETIC_NO_PAYMENT_GIFT_CERTIFICATE');
    expect(live).toContain('SEND_PREPARED_GIFT_CERTIFICATE');
    const repairStart = live.indexOf('window.replaceVerifiedSyntheticGiftCertificate = async function()');
    const repairEnd = live.indexOf('window.sendPreparedGiftCertificate = async function', repairStart);
    expect(repairStart).toBeGreaterThan(0);
    expect(repairEnd).toBeGreaterThan(repairStart);
    expect(live.slice(repairStart, repairEnd)).not.toContain('adminSendPreparedGiftCertificate');
  });
});
