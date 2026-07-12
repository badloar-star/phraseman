import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 promo codes workflow', () => {
  const core = read('admin/v2/scripts/admin-core.js');
  const firebase = read('admin/v2/scripts/admin-firebase.js');
  const capabilities = read('admin/v2/scripts/admin-capabilities.js');
  const promoServer = read('functions/src/promo_codes.ts');
  const functionsIndex = read('functions/src/index.ts');

  test('ports promo code creation and activation history to native money page', () => {
    expect(core).toContain('function renderPromoWorkflow');
    expect(core).toContain('data-action="preview-promo-codes"');
    expect(core).toContain('data-action="preview-one-time-promo-codes"');
    expect(core).toContain('data-action="publish-promo-codes"');
    expect(core).toContain('data-action="load-promo-codes"');
    expect(core).toContain('data-open-promo-user');
    expect(core).toContain('readPromoCreatePayload');
    expect(core).toContain('buildPromoPreview');
    expect(core).toContain('samePromoPayload');
    expect(core).toContain('const promoDraft = preview?.payload || {}');
    expect(core).toContain('const promoExpires = String(promoDraft.expiresDate ||');
    expect(core).toContain('expiresDate: expiresRaw');
    expect(core).toContain("trim().slice(0, 200)");
    expect(core).toContain("return { ...payload, codes, createOnly: true }");
    expect(core).toContain('Укажите причину создания промокодов.');
    expect(core).toContain('title="Загрузить последние промокоды');
    expect(core).toContain('title="Собрать предпросмотр промокодов');
    expect(core).toContain('title="Создать промокоды по проверенному предпросмотру');
    expect(core).toContain('title="Открыть единый профиль пользователя');
    expect(core).toContain('actions.promoCodeBatchUpsert(preview.payload)');
    expect(core).toContain('actions.listPromoCodes({ limit: 100 })');
    expect(core).toContain('Глобальный рубильник видимости/активации промокодов находится в Remote Config');
    expect(core).toContain("disabledWhenUnauthorized('money.read')");
    expect(core).toContain("disabledWhenUnauthorized('money.manual_access.write')");
  });

  test('uses server callables instead of browser writes for promo code data', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminListPromoCodes')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'promoCodeUpsert')");
    expect(firebase).toContain("httpsCallable(functionsUs, 'promoCodeBatchUpsert')");
    expect(core).not.toContain("setDoc(doc(db, 'promo_codes'");
    expect(core).not.toContain("collection(db, 'promo_codes')");
    expect(core).not.toContain("collectionGroup(db, 'promo_redemptions')");
  });

  test('adds a server-side admin list callable for codes and redemptions', () => {
    expect(promoServer).toContain('export const adminListPromoCodes = onCall');
    expect(promoServer).toContain("assertAdminPermission(request, 'money.read')");
    expect(promoServer).toContain("assertAdminPermission(request, 'money.manual_access.write')");
    expect(promoServer).toContain("const auditRef = db.collection('admin_log').doc()");
    expect(promoServer).toContain('tx.set(auditRef');
    expect(promoServer).toContain('reason,');
    expect(promoServer).toContain('if (existing) throw new HttpsError');
    expect(promoServer).toContain(".collection(PROMO_CODES)");
    expect(promoServer).toContain(".collectionGroup(PROMO_REDEMPTIONS)");
    expect(promoServer).toContain(".orderBy('updatedAtMs', 'desc')");
    expect(promoServer).toContain(".orderBy('redeemedAtMs', 'desc')");
    expect(promoServer).not.toContain('.catch(() => null)');
    expect(promoServer).not.toContain("}).catch(() => {});");
    expect(functionsIndex).toContain('adminListPromoCodes');
  });

  test('marks promo codes as native v2 and updates control-panel migration map', () => {
    expect(capabilities).toContain("'promo-codes': 'money'");
    expect(core).toContain("primaryLabel: 'Открыть v2 промокоды'");
    expect(core).toContain("risk: 'Server callable'");
    expect(core).toContain('guarded: true');
  });
});
