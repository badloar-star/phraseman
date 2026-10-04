import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const live = fs.readFileSync(path.join(root, 'admin/v2/legacy.html'), 'utf8');

describe('live admin runtime recovery contract', () => {
  test('keeps the owner App Check seal on the browser surface', () => {
    expect(live).not.toContain('firebase-app-check.js');
    expect(live).not.toContain('initializeAppCheck');
    expect(live).not.toContain('ReCaptchaEnterpriseProvider');
    expect(live).not.toContain('getAppCheckToken');
    expect(live).not.toContain('ADMIN_APP_CHECK_ENTERPRISE_SITE_KEY');
    expect(live).not.toContain('requireAdminAppCheckForGiftCertificates');
  });

  test('uses the standard authenticated callable transport for gift certificates', () => {
    expect(live).toContain('function createAdminAuthCallable(name)');
    expect(live).toContain('return _fsHttpsCallable(functionsUs, name);');
    expect(live).not.toContain('createAppCheckProtectedGiftCallable');
    expect(live).not.toContain('const appCheckToken = null;');
  });

  test('retains every established control-panel workflow removed by the V9 merge', () => {
    // зачем: недельные бонусы (boons) сняты в 2.0 вместе с Weekly Boon — их панель
    // в Пульте удалена, поэтому 'cp-boons-json'/'loadControlPanelBoons' больше не сторожим. Панель цен уроков (cp-prem-lessons) снята вместе с покупкой уроков за жемчуг (D70).
    const ids = [
      'cp-force-min-version',
      'cp-manual-update-campaign',
      'cp-promo-banner-campaign',
      'cp-prem-features',
      'cp-prem-limits',
    ];
    const handlers = [
      'loadControlPanelForceUpdate',
      'saveForceUpdateConfig',
      'saveManualUpdateConfig',
      'loadControlPanelPromoBanner',
      'savePromoBanner',
      'loadControlPanelPremium',
      'saveControlPanelPremium',
    ];

    for (const id of ids) expect(live).toContain(`id="${id}"`);
    for (const handler of handlers) expect(live).toMatch(new RegExp(`window\\.${handler}\\s*=`));
  });

  test('keeps explicit refresh controls visible as a recovery path for stale data', () => {
    expect(live).not.toContain("button.setAttribute('aria-hidden', 'true')");
    expect(live).not.toContain('button.tabIndex = -1');
    // зачем (04.10): прежний regex перескакивал через соседние элементы и ловил display:none у
    // #ref-table. Проверяем сам тег кнопки и CSS-правила, нацеленные на неё.
    const refreshTags = live.match(/<[^>]*data-pm-v[57]-refresh-control[^>]*>/gi) ?? [];
    expect(refreshTags.length).toBeGreaterThan(0);
    for (const tag of refreshTags) expect(tag).not.toMatch(/display\s*:\s*none/i);
    expect(live).not.toMatch(/\[data-pm-v[57]-refresh-control[^\]]*\][^{]*\{[^}]*display\s*:\s*none/i);
    expect(live).toContain("'referrals': () => pmV5SafeCall('loadReferralsData', true, false)");
    expect(live).toContain("'analytics': pmV5RefreshAnalyticsSection");
  });

  test('does not confuse a mutable administrator role with the immutable owner', () => {
    expect(live).toContain('return member?.immutableOwner === true;');
    expect(live).not.toContain("return member?.role === 'administrator';");
  });
});
