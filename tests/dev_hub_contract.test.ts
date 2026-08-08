import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const helperPath = path.join(ROOT, 'app', 'dev_plus_controls.ts');
const sheetPath = path.join(ROOT, 'components', 'dev', 'DevHubSheet.tsx');
const registryPath = path.join(ROOT, 'components', 'dev', 'devToolRegistry.ts');
const routePath = path.join(ROOT, 'app', 'dev_hub.tsx');

describe('DEV center bottom sheet', () => {
  test('reuses the single existing Home flask button and does not create a route', () => {
    const home = read('app/(tabs)/home.tsx');
    const routes = read('constants/devRoutes.ts');
    const layout = read('app/_layout.tsx');

    expect(home.match(/testID="home-dev-hub-button"/g)).toHaveLength(1);
    expect(home.match(/name="flask-outline"/g)).toHaveLength(1);
    expect(home).toContain('setDevHubVisible(true)');
    expect(home).toContain('<DevHubSheetGate');
    expect(home).toContain('visible={devHubVisible}');
    expect(home).not.toContain('router.push(DEV_HUB_ROUTE as any)');

    expect(fs.existsSync(routePath)).toBe(false);
    expect(routes).not.toContain('DEV_HUB_ROUTE');
    expect(layout).not.toContain('name="dev_hub"');
  });

  test('implements every approved close path in a bottom Modal', () => {
    expect(fs.existsSync(sheetPath)).toBe(true);
    if (!fs.existsSync(sheetPath)) return;
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(sheet).toContain('<Modal');
    expect(sheet).toContain('transparent');
    expect(sheet).toContain('onRequestClose={handleSheetClose}');
    expect(sheet).toContain('testID="dev-hub-backdrop"');
    expect(sheet).toContain('testID="dev-hub-close"');
    expect(sheet).toContain('PanResponder.create');
    expect(sheet).toContain('gestureState.dy');
    expect(sheet).toContain('accessibilityLabel="Закрыть DEV-центр"');
  });

  test('renders a deterministic typed registry that can grow by category', () => {
    expect(fs.existsSync(registryPath)).toBe(true);
    if (!fs.existsSync(registryPath)) return;
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = fs.existsSync(sheetPath) ? read('components/dev/DevHubSheet.tsx') : '';

    expect(registry).toContain('DEV_TOOL_SECTIONS');
    expect(registry).toContain("id: 'level-previews'");
    expect(registry).toContain("id: 'subscription'");
    expect(registry).toContain("action: 'preview-level-standard'");
    expect(registry).toContain("action: 'preview-level-milestone'");
    expect(registry).toContain("action: 'preview-lesson-results'");
    expect(registry).toContain("action: 'preview-spin-reward'");
    expect(registry).toContain("action: 'grant-plus'");
    expect(registry).toContain("action: 'revoke-plus'");
    expect(registry).toContain('satisfies readonly DevToolSection[]');
    expect(sheet).toContain('getOrderedDevToolSections()');
    expect(sheet).toContain('.map((section) =>');
    expect(sheet).toContain('.map((tool) =>');

    jest.resetModules();
    const { getOrderedDevToolSections } = require('../components/dev/devToolRegistry');
    const ordered = getOrderedDevToolSections();
    expect(ordered.map((section: { id: string }) => section.id)).toEqual(['level-previews', 'subscription']);
    expect(ordered[0].tools.map((tool: { id: string }) => tool.id)).toEqual([
      'level-standard',
      'level-milestone',
      'lesson-results',
      'spin-reward',
    ]);
  });

  test('previews standard and fifth-level variants with spins but no progress mutations', () => {
    expect(fs.existsSync(sheetPath)).toBe(true);
    if (!fs.existsSync(sheetPath)) return;
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(sheet).toContain('<LevelUpThresholdModal');
    expect(sheet).toContain("variant={preview?.variant ?? 'standard'}");
    expect(sheet).toContain('spinReward={true}');
    expect(sheet).toContain("openPreview('standard')");
    expect(sheet).toContain("openPreview('milestone')");
    expect(sheet).not.toMatch(/xp_manager|level_spin_level_up_queue|level_up_bonus_outbox|firebase|firestore/i);
  });

  test('grants a real local +1 Spin before showing its topmost receipt plaque', () => {
    const sheet = read('components/dev/DevHubSheet.tsx');
    expect(sheet).toContain("case 'preview-spin-reward'");
    expect(sheet).toContain('grantLocalDevSpin');
    expect(sheet).toContain('await grantLocalDevSpin(accountToken)');
    expect(sheet).toContain('<SpinRewardPlaque');
    expect(sheet).toContain('testID="dev-spin-reward-preview-modal"');
    expect(sheet).toContain("type: 'spin-plaque'");
    expect(sheet).toContain('amount={1}');
    expect(sheet).not.toMatch(/claimLevelSpin|levelRewardSpinClaim/);
  });

  test('closes the DEV Modal before mounting and animating a level-up preview', () => {
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(sheet).toContain('const previewRun = preview?.run;');
    expect(sheet).toContain('if (visible || previewRun === undefined) return;');
    expect(sheet).toContain('}, [animatePreview, previewRun, visible]);');
    expect(sheet).toContain('requestClose(true);');
    expect(sheet).toContain('visible={!visible && preview !== null}');
    expect(sheet).toContain('onShow={() => {}}');
  });

  test('scopes local Plus state to the active account and never mutates real entitlements', async () => {
    expect(fs.existsSync(helperPath)).toBe(true);
    if (!fs.existsSync(helperPath)) return;

    jest.resetModules();
    jest.doMock('../app/config', () => ({ ENABLE_DEV_TOOLS: true, IS_STORE_RELEASE: false }));
    const storage = require('@react-native-async-storage/async-storage');
    storage.__reset();
    const controls = require('../app/dev_plus_controls');

    const alexKey = controls.getDevLocalPlusStorageKey('account/alex');
    const samKey = controls.getDevLocalPlusStorageKey('account/sam');
    expect(alexKey).not.toBe(samKey);
    expect(alexKey).toContain(encodeURIComponent('account/alex'));

    await controls.setDevLocalPlusOverride('account/alex', 'granted');
    await controls.setDevLocalPlusOverride('account/sam', 'removed');
    expect(await controls.readDevLocalPlusOverride('account/alex')).toBe('granted');
    expect(await controls.readDevLocalPlusOverride('account/sam')).toBe('removed');
    expect(await storage.multiGet(['tester_no_premium', 'tester_no_limits'])).toEqual([
      ['tester_no_premium', null],
      ['tester_no_limits', null],
    ]);

    const helper = read('app/dev_plus_controls.ts');
    const premium = read('components/PremiumContext.tsx');
    expect(helper).toContain('ENABLE_DEV_TOOLS');
    expect(helper).toContain('IS_STORE_RELEASE');
    expect(helper).not.toMatch(/firebase|firestore|RevenueCat|tester_no_premium|tester_no_limits/i);
    expect(helper).not.toContain("'premium_active'");
    expect(helper).not.toContain("'vip_active'");
    expect(helper).toContain('dev_local_plus_override_changed');
    expect(premium).toContain('projectDevLocalPlusOverride');
    expect(premium).toContain("onAppEvent('dev_local_plus_override_changed'");
    expect(premium).toContain('const hasAuthoritativeAccess =');
  });

  test('projects removed local Plus to a fully free effective entitlement', () => {
    jest.resetModules();
    jest.doMock('../app/config', () => ({ ENABLE_DEV_TOOLS: true, IS_STORE_RELEASE: false }));
    const { projectDevLocalPlusOverride } = require('../app/dev_plus_controls');
    const authoritative = {
      isPremium: true,
      isVip: true,
      isPro: true,
      hasPremiumAccess: true,
      isIntroFullAccess: true,
      introFullAccessEndsAt: 1234,
    };

    expect(projectDevLocalPlusOverride(authoritative, 'removed')).toEqual({
      isPremium: false,
      isVip: false,
      isPro: false,
      hasPremiumAccess: false,
      isIntroFullAccess: false,
      introFullAccessEndsAt: null,
    });
  });

  test('treats removed local Plus as a free user for DEV lesson content gates', () => {
    jest.resetModules();
    jest.doMock('../app/config', () => ({ ENABLE_DEV_TOOLS: true, IS_STORE_RELEASE: false }));
    const controls = require('../app/dev_plus_controls');
    const premium = read('components/PremiumContext.tsx');
    const lessons = read('app/(tabs)/lessons.tsx');

    expect(typeof controls.resolveDevContentUnlock).toBe('function');
    expect(controls.resolveDevContentUnlock(true, 'removed')).toBe(false);
    expect(controls.resolveDevContentUnlock(true, 'inherit')).toBe(true);
    expect(controls.resolveDevContentUnlock(true, 'granted')).toBe(true);
    expect(controls.resolveDevContentUnlock(false, 'granted')).toBe(false);
    expect(typeof controls.projectDevLessonAccess).toBe('function');
    expect(controls.projectDevLessonAccess({
      devContentUnlock: true,
      noLimits: true,
      legacyFreeLessonCap: 8,
      freeLessonLimit: 3,
    }, 'removed')).toEqual({
      devContentUnlock: false,
      noLimits: false,
      legacyFreeLessonCap: 3,
    });

    expect(premium).toContain('devLocalPlusOverride');
    expect(lessons).toContain('projectDevLessonAccess({');
    expect(lessons).toContain('freeLessonLimit: FREE_LESSON_LIMIT');
    expect(lessons).toContain('devMode: effectiveDevContentUnlock');
    expect(lessons).toContain('if (effectiveDevContentUnlock || effectiveNoLimits)');
    expect(lessons).toContain('!effectiveDevContentUnlock && !effectiveNoLimits');
    expect(lessons).toContain('noLimits={effectiveNoLimits}');
    expect(lessons).toContain('legacyFreeLessonCap={effectiveLegacyFreeLessonCap}');
  });

  test('keeps local Plus controls inert in a store release', async () => {
    jest.resetModules();
    jest.doMock('../app/config', () => ({ ENABLE_DEV_TOOLS: false, IS_STORE_RELEASE: true }));
    const storage = require('@react-native-async-storage/async-storage');
    storage.__reset();
    const controls = require('../app/dev_plus_controls');
    const key = controls.getDevLocalPlusStorageKey('account/store');

    await storage.setItem(key, 'granted');
    await expect(controls.readDevLocalPlusOverride('account/store')).resolves.toBe('inherit');
    await expect(controls.setDevLocalPlusOverride('account/store', 'granted')).rejects.toThrow(
      'Dev Plus controls are unavailable in this build',
    );
    expect(await storage.getItem(key)).toBe('granted');
  });
});
