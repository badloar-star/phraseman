import fs from 'node:fs';
import path from 'node:path';

import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import { getPaywallControlVisibility } from '../app/paywall_control_visibility';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('paywall admin control visibility', () => {
  afterEach(() => {
    applyRemoteConfigSnapshot({});
  });

  it('keeps close and restore visible by default while promo remains server-gated', () => {
    applyRemoteConfigSnapshot({});

    expect(getPaywallControlVisibility()).toEqual({
      closeVisible: true,
      restoreVisible: true,
      promoVisible: false,
    });
  });

  it.each([
    [{ promo_codes_enabled: true }, true],
    [{ promo_codes_enabled: true, paywall_promo_code_visible: false }, false],
    [{ promo_codes_enabled: false, paywall_promo_code_visible: true }, false],
  ] as const)('combines promo eligibility with the paywall visibility switch: %o', (bools, promoVisible) => {
    applyRemoteConfigSnapshot({ bools });

    expect(getPaywallControlVisibility().promoVisible).toBe(promoVisible);
  });

  it('keeps close and restore visible when reading the flags throws (Apple), promo stays hidden', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.isolateModules(() => {
      jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => { throw new Error('снимок недоступен'); } }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPaywallControlVisibility: broken } = require('../app/paywall_control_visibility');
      expect(broken()).toEqual({ closeVisible: true, restoreVisible: true, promoVisible: false });
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[PAYWALL-CONTROLS]'), 'снимок недоступен');
    jest.dontMock('../app/remote_flags');
    warn.mockRestore();
  });

  it('can hide only the X and restore actions without changing other exit paths', () => {
    applyRemoteConfigSnapshot({
      bools: {
        paywall_close_visible: false,
        paywall_restore_visible: false,
      },
    });

    expect(getPaywallControlVisibility()).toMatchObject({ closeVisible: false, restoreVisible: false });

    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('const swipeEnabled = !checkoutInFlight && !prompt;');
    expect(screen).toContain("handleClose('close', 'back')");
    expect(screen).toContain("handleClose('close', 'scrim')");
    expect(screen).toContain("handleClose('close', 'swipe')");
  });

  it('wires the existing restore handler and promo route without adding a config read', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    const dock = read('components/paywall/PaywallPlus.tsx');

    expect(screen).toContain('onRestore={() => { void p.handleRestore(); }}');
    expect(screen).toContain("pathname: '/promo_code_entry'");
    expect(screen).toContain("params: { source: 'paywall' }");
    expect(screen).not.toContain("as any");
    expect(screen).toContain('restoreDisabled={ctaBusy}');
    expect(screen).toContain('promoDisabled={ctaBusy}');
    expect(screen).toContain('if (ctaBusy) return;');
    expect(screen).toContain("onAppEvent('remote_config_changed'");
    expect(screen).not.toContain('readRemoteConfigCacheRaw');
    expect(dock).toContain('testID="paywall-restore"');
    expect(dock).toContain('testID="paywall-promo-code"');
  });
});

describe('admin paywall controls card', () => {
  const admin = read('admin/v2/legacy.html');

  it('places the three labeled switches in Control Panel → Monetization', () => {
    expect(admin).toContain('id="cp-paywall-controls-card"');
    expect(admin).toContain('id="cp-paywall-control-paywall_close_visible"');
    expect(admin).toContain('id="cp-paywall-control-paywall_restore_visible"');
    expect(admin).toContain('id="cp-paywall-control-paywall_promo_code_visible"');
    expect(admin).toContain('id="cp-paywall-controls-reload"');
    expect(admin).toContain("el.id === 'cp-paywall-controls-card'");
  });

  it('hydrates hidden cards from the existing control-panel snapshot and publishes one protected patch', () => {
    const reloadStart = admin.indexOf('window.loadControlPanelPaywallControls = async function()');
    const reloadEnd = admin.indexOf('window.saveControlPanelPaywallControls = async function()', reloadStart);
    const reloadFunction = admin.slice(reloadStart, reloadEnd);

    expect(admin).toContain('cpPaywallControlsRender(data);');
    expect(admin).not.toMatch(/cpIsVisibleBlock\('cp-paywall-controls-status'\)/);
    expect(admin).toContain('window.loadControlPanelPaywallControls = async function()');
    expect(reloadStart).toBeGreaterThanOrEqual(0);
    expect(reloadEnd).toBeGreaterThan(reloadStart);
    expect(reloadFunction).toContain('loadAdminRemoteConfigWorkspace(true)');
    expect(admin).toContain('window.saveControlPanelPaywallControls = async function()');
    expect(admin).toContain("publishAdminRemoteConfigPatch({ bools }, 'Пульт → Монетизация: видимость элементов пейвола')");
  });

  it('fails closed until a successful snapshot has hydrated all three switches', () => {
    const cardStart = admin.indexOf('id="cp-paywall-controls-card"');
    const cardEnd = admin.indexOf('<!-- 🎟 ПРОМОКОДЫ-НАГРАДЫ', cardStart);
    const card = admin.slice(cardStart, cardEnd);
    const renderStart = admin.indexOf('function cpPaywallControlsRender(data)');
    const reloadStart = admin.indexOf('window.loadControlPanelPaywallControls = async function()', renderStart);
    const saveStart = admin.indexOf('window.saveControlPanelPaywallControls = async function()', reloadStart);
    const nextSection = admin.indexOf('const CP_PREMIUM_FEATURES', saveStart);
    const renderFunction = admin.slice(renderStart, reloadStart);
    const reloadFunction = admin.slice(reloadStart, saveStart);
    const saveFunction = admin.slice(saveStart, nextSection);

    expect(card).toContain('Данные не загружены.');
    expect(card).toMatch(/id="cp-paywall-controls-save"[^>]*\bdisabled\b/);
    expect(admin).toContain('let cpPaywallControlsHydrated = false;');
    expect(renderFunction).toContain('cpPaywallControlsHydrated = true;');
    expect(renderFunction).toContain('cpPaywallControlsSetReady(true);');
    expect(reloadFunction).toContain('cpPaywallControlsHydrated = false;');
    expect(reloadFunction).toContain('cpPaywallControlsSetReady(false);');
    expect(saveFunction).toContain('if (!cpPaywallControlsHydrated)');
    expect(saveFunction.indexOf('if (!cpPaywallControlsHydrated)')).toBeLessThan(saveFunction.indexOf('publishAdminRemoteConfigPatch'));
  });

  it('keeps the new card controls readable in the owner light theme', () => {
    expect(admin).toContain('html[data-pm-theme="light"]:root body.pm-owner-redesign #admin-app #cp-paywall-controls-card input.cp-toggle:checked');
    expect(admin).toContain('#cp-paywall-controls-card .cp-status-chip[data-type="success"]');
    expect(admin).toContain('#cp-paywall-controls-card .cp-muted');
  });
});
