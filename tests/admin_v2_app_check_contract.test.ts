import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('live admin web App Check contract', () => {
  const live = read('admin/v2/legacy.html');
  const giftServer = read('functions/src/web_checkout.ts');

  test('initializes the registered Enterprise provider before any Firebase service is constructed', () => {
    expect(live).toContain(
      "import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken as getAppCheckToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';",
    );
    expect(live).toContain("const ADMIN_APP_CHECK_ENTERPRISE_SITE_KEY = '6LfteFAtAAAAAKa9jvjgCAeZjnN8je2BZZJlf2OR';");
    expect(live).toContain('provider: new ReCaptchaEnterpriseProvider(ADMIN_APP_CHECK_ENTERPRISE_SITE_KEY)');
    expect(live).toContain('isTokenAutoRefreshEnabled: true');
    expect(live).toContain('getAppCheckToken(_adminAppCheck, false)');

    const appCheckInit = live.indexOf('initializeAppCheck(app, {');
    const firestoreInit = live.indexOf('const db = getFirestore(app);');
    const authInit = live.indexOf('const auth = getAuth(app);');
    const functionsInit = live.indexOf("const functionsUs = getFunctions(app, 'us-central1');");
    expect(appCheckInit).toBeGreaterThan(0);
    expect(firestoreInit).toBeGreaterThan(appCheckInit);
    expect(authInit).toBeGreaterThan(appCheckInit);
    expect(functionsInit).toBeGreaterThan(appCheckInit);
  });

  test('fails closed and explicitly sends both Firebase credentials for gift callables', () => {
    const helperStart = live.indexOf('function createAppCheckProtectedGiftCallable(name)');
    const helperEnd = live.indexOf("const functionsUs = getFunctions(app, 'us-central1');", helperStart);
    const helper = live.slice(helperStart, helperEnd);
    expect(helperStart).toBeGreaterThan(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toContain('const appCheckToken = await requireAdminAppCheckForGiftCertificates();');
    expect(helper).toContain('const idToken = await auth.currentUser?.getIdToken();');
    expect(helper).toContain("Authorization: `Bearer ${idToken}`");
    expect(helper).toContain("'X-Firebase-AppCheck': appCheckToken");
    expect(helper).toContain("body: JSON.stringify({ data })");
    expect(helper).toContain('const responseData = payload?.data ?? payload?.result;');
    expect(helper).toContain('return { data: responseData };');
    expect(helper).not.toContain('httpsCallable(functionsUs, name)');
    expect(live).toContain('Защита App Check недоступна. Обновите страницу и повторите действие — запрос не отправлен.');

    for (const name of [
      'adminCreateGiftCertificateBatch',
      'adminListGiftCertificates',
      'adminUpdateGiftCertificateRecipient',
      'adminGetGiftCertificateDownload',
      'adminReplaceSyntheticGiftCertificate',
      'adminSendPreparedGiftCertificate',
    ]) {
      expect(live).toContain(`createAppCheckProtectedGiftCallable('${name}')`);
      expect(live).not.toContain(`httpsCallable(functionsUs, '${name}')`);
    }
  });

  test('does not weaken server enforcement or copy App Check initialization to frozen admin surfaces', () => {
    expect(giftServer).toContain('export const GIFT_CERTIFICATE_MUTATION_OPTIONS = { region: REGION, enforceAppCheck: true } as const;');
    expect(giftServer).toContain('export const GIFT_CERTIFICATE_READ_OPTIONS = { region: REGION, enforceAppCheck: true } as const;');

    for (const frozen of ['admin/legacy.html', 'admin/index.html', 'admin/full.html', 'admin/site.html', 'admin/v2/index.html']) {
      const absolute = path.join(root, frozen);
      if (fs.existsSync(absolute)) {
        expect(fs.readFileSync(absolute, 'utf8')).not.toContain('firebase-app-check.js');
      }
    }
  });
});
