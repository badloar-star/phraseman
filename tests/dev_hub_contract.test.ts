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
    const tabsLayout = read('app/(tabs)/_layout.tsx');
    const routes = read('constants/devRoutes.ts');
    const layout = read('app/_layout.tsx');

    expect(home.match(/testID="home-dev-hub-button"/g)).toHaveLength(1);
    expect(home.match(/name="flask-outline"/g)).toHaveLength(1);
    expect(home).toContain('onOpenDevHub?.()');
    expect(tabsLayout).toContain('<DevHubSheetGate');
    expect(tabsLayout).toContain('visible={devHubVisible}');
    expect(tabsLayout).toContain('onSurfaceActiveChange={setDevOverlayVisible}');
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
    expect(registry).toContain("id: 'onboarding-tools'");
    expect(registry).toContain("id: 'motion-showcase'");
    expect(registry).toContain("id: 'full-modes'");
    expect(registry).toContain("id: 'level-previews'");
    expect(registry).toContain("id: 'league'");
    expect(registry).toContain("id: 'subscription'");
    expect(registry).toContain("id: 'cancel-flow'");
    expect(registry).toContain("action: 'run-onboarding'");
    expect(registry).toContain("action: 'open-motion-showcase'");
    expect(registry).toContain("action: 'preview-level-standard'");
    expect(registry).toContain("action: 'open-max-voice'");
    expect(registry).toContain("action: 'preview-level-milestone'");
    expect(registry).toContain("action: 'preview-lesson-results'");
    expect(registry).toContain("action: 'preview-spin-reward'");
    expect(registry).toContain("action: 'preview-league-promoted'");
    expect(registry).toContain("action: 'preview-league-demoted'");
    expect(registry).toContain("action: 'preview-league-stay'");
    expect(registry).toContain("action: 'preview-league-rank-mismatch'");
    expect(registry).toContain("action: 'grant-plus'");
    expect(registry).toContain("action: 'revoke-plus'");
    expect(registry).toContain('satisfies readonly DevToolSection[]');
    expect(sheet).toContain('getOrderedDevToolSections()');
    // Секции рисуются перебором. Стрелка со скобками — потому что свёрнутые
    // секции (пейволы) считают своё состояние до возврата разметки.
    expect(sheet).toContain('.map((section) => {');
    expect(sheet).toContain('.map((tool) =>');

    jest.resetModules();
    const { getOrderedDevToolSections } = require('../components/dev/devToolRegistry');
    const ordered = getOrderedDevToolSections();
    // «Онбординг» обязан быть ПЕРВЫМ: владелец не нашёл кнопку, пока она была внизу.
    expect(ordered.map((section: { id: string }) => section.id)).toEqual([
      'onboarding-tools',
      'motion-showcase',
      'learning-v2-modes-showcase',
      'learning-v2-authoring-preview',
      'full-modes',
      'paywalls',
      'shop',
      'level-previews',
      'league',
      'subscription',
      // Витрина сценариев отписки (владелец, 24.08): шаг удержания при отмене
      // подписки нельзя проверить без настоящей платной подписки.
      'cancel-flow',
      // «Проверка рун» (владелец, 2026-08-27): семь настоящих экранов рун со
      // случайным стартовым числом — отдельный раздел, НЕ внутри motion-showcase.
      'practice-runes-preview',
    ]);
    expect(ordered[0].tools.map((tool: { id: string }) => tool.id)).toEqual(['onboarding-run']);
    expect(ordered[1].tools.map((tool: { id: string }) => tool.id)).toEqual(['motion-showcase']);
    expect(ordered[2].tools.map((tool: { id: string }) => tool.id)).toEqual(['learning-v2-modes-showcase']);
    expect(ordered[3].tools.map((tool: { id: string }) => tool.id)).toEqual(['learning-v2-authoring-preview']);
    expect(ordered[4].tools.map((tool: { id: string }) => tool.id)).toEqual(['max-voice']);
    // Пейволов девять, и они СВЁРНУТЫ: развёрнутым списком они оттесняли
    // остальные инструменты вниз (решение владельца 24.08).
    expect(ordered[5].collapsed).toBe(true);
    expect(ordered[5].tools).toHaveLength(9);
    // Магазин: единственный вход в приложении — этот пункт. Если появится
    // второй вход, правило владельца нарушено — тест обязан упасть.
    expect(ordered[6].tools.map((tool: { id: string }) => tool.id)).toEqual(['shop-screen']);
    expect(ordered[7].tools.map((tool: { id: string }) => tool.id)).toEqual([
      'level-standard',
      'level-milestone',
      'lesson-results',
      'spin-reward',
      'welcome-gift',
    ]);
    expect(ordered[8].tools.map((tool: { id: string }) => tool.id)).toEqual([
      'league-promoted',
      'league-demoted',
      'league-stay',
      'league-rank-mismatch',
    ]);
    // «Проверка рун» — семь кнопок, по одной на каждый настоящий экран,
    // и секция СВЁРНУТА (тот же приём, что и у пейволов — не оттеснять
    // остальные инструменты вниз).
    expect(ordered[11].collapsed).toBe(true);
    expect(ordered[11].tools.map((tool: { id: string }) => tool.id)).toEqual([
      'runes-lesson',
      'runes-vocabulary',
      'runes-irregular-verbs',
      'runes-blitz',
      'runes-flashcards-training',
      'runes-mistake-practice',
      'runes-speaking',
    ]);
  });

  // зачем (владелец, 24.08): «магазин пока делай дев хаб вход и больше нигде не
  // делай вход». Сторож ловит появление второй двери — кнопки, ссылки или
  // пункта меню на /shop где-либо, кроме DEV-центра.
  it('в магазин ведёт ровно один вход — из DEV-центра', () => {
    // Ищем grep-ом, а не чтением всего дерева в память: ts-jest в этом проекте
    // и так берёт 2–3 ГБ, полный обход app/ + components/ ронял процесс.
    const { execFileSync } = require('child_process');
    const path = require('path');
    const root = path.join(__dirname, '..');

    let hits = '';
    try {
      hits = execFileSync('git', [
        'grep', '-lE', "router\\.(push|replace|navigate)\\(\\s*['\"`]/shop['\"`]|SHOP_ROUTE",
        '--', 'app/*.tsx', 'app/**/*.tsx', 'components/**/*.tsx', 'components/**/*.ts',
      ], { cwd: root, encoding: 'utf8' });
    } catch (error: unknown) {
      // git grep выходит с кодом 1, когда совпадений нет — это успех.
      const status = (error as { status?: number }).status;
      if (status !== 1) throw error;
    }

    // Законные места: сам экран, DEV-центр (единственная дверь) и регистрация
    // маршрута в навигаторе. Всё остальное — второй вход, которого быть не должно.
    const allowed = new Set([
      'app/shop.tsx',
      'app/_layout.tsx',
      'components/dev/DevHubSheet.tsx',
    ]);
    const offenders = hits.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !allowed.has(line));

    expect(offenders).toEqual([]);
  });

  test('restarts the real onboarding overlay without touching profile or progress', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = read('components/dev/DevHubSheet.tsx');
    const events = read('app/events.ts');
    const layout = read('app/_layout.tsx');

    expect(registry).toContain("testID: 'dev-onboarding-run'");
    expect(registry).toContain("action: 'run-onboarding'");

    // Сбрасываются ТОЛЬКО ключи прохождения — ни профиля, ни прогресса, ни согласий.
    expect(sheet).toContain("case 'run-onboarding':");
    expect(sheet).toContain('AsyncStorage.multiRemove([');
    expect(sheet).toContain("'onboarding_done',");
    expect(sheet).toContain("'onboarding_step',");
    expect(sheet).toContain("'onboarding_flow_version_v1',");
    expect(sheet).not.toMatch(/AsyncStorage\.clear\(|multiRemove\(\[[^\]]*user_name/);
    // Эмит после закрытия native Modal, иначе DEV-шит остаётся поверх первого экрана.
    expect(sheet).toContain("requestClose(false, () => emitAppEvent('dev_onboarding_restart'))");

    expect(events).toContain('dev_onboarding_restart: undefined;');
    expect(layout).toContain("onAppEvent('dev_onboarding_restart'");
    expect(layout).toContain('onboardingDoneHandledRef.current = false;');
    expect(layout).toContain('setOnboardingStartAtName(false);');
  });

  test('opens the complete MAX Voice flow after dismissing the native DEV sheet', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(registry).toContain("testID: 'dev-open-max-voice'");
    expect(registry).toContain('Полный путь: подготовка, живой WebRTC-звонок и разбор разговора.');
    expect(sheet).toContain("case 'open-max-voice':");
    expect(sheet).toContain('if (!isMaxVoiceNativeAvailable())');
    expect(sheet).toContain('Metro обновляет только JavaScript');
    expect(sheet).toContain("pathname: '/max_call_session'");
    expect(sheet).toContain("params: { devMode: '1' }");
    expect(sheet).toContain('onClosed?.();');
  });

  test('previews weekly league outcomes without touching the real pending result', () => {
    const sheet = read('components/dev/DevHubSheet.tsx');
    const modal = read('app/LeagueResultModal.tsx');

    expect(sheet).toContain('<LeagueResultModal');
    expect(sheet).toContain('previewMode');
    expect(sheet).toContain('buildLeagueDevSeed');
    // Синтетический результат строится в памяти: ни диска, ни сети.
    expect(sheet).not.toMatch(/loadPendingResult|savePendingResult|checkLeagueOnAppOpen/);

    // Главная защита: превью не должно стирать настоящие итоги недели.
    expect(modal).toContain('previewMode?: boolean');
    expect(modal).toContain('if (!previewMode) void clearPendingResult();');
  });

  test('league dev seeds stay consistent between the rank number and the visible row', () => {
    jest.resetModules();
    const { buildLeagueDevSeed } = require('../components/dev/leagueDevSeeds');
    const { orderGroupForResultDisplay } = require('../app/league_engine');

    for (const seedId of ['promoted', 'demoted', 'stay', 'rank-mismatch']) {
      const result = buildLeagueDevSeed(seedId);
      expect(result.group).toHaveLength(result.totalInGroup);
      expect(result.group.filter((m: { isMe: boolean }) => m.isMe)).toHaveLength(1);

      // То, что увидит пользователь: моя строка обязана стоять на myRank.
      const shown = orderGroupForResultDisplay(result.group, result.myRank);
      expect(shown.findIndex((m: { isMe: boolean }) => m.isMe) + 1).toBe(result.myRank);
    }

    expect(buildLeagueDevSeed('promoted').promoted).toBe(true);
    expect(buildLeagueDevSeed('demoted').demoted).toBe(true);
    const stay = buildLeagueDevSeed('stay');
    expect(stay.promoted).toBe(false);
    expect(stay.demoted).toBe(false);
    expect(stay.prevLeagueId).toBe(stay.newLeagueId);
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

  test('closes the DEV Modal before mounting a level-up preview', () => {
    const sheet = read('components/dev/DevHubSheet.tsx');

    // зачем 2026-08-16: гибрид «Световод + Чекан» стал единственная реализация
    // (project_motion_program.md) — LevelUpThresholdModalHybrid ведёт свой
    // собственный вход (reanimated), локальный previewRun/animatePreview
    // driver-таймлайн DevHubSheet больше не нужен. Инвариант "DEV Modal
    // закрывается ДО показа превью" остаётся и проверяется напрямую.
    expect(sheet).toContain('requestClose(true);');
    expect(sheet).toContain('visible={!visible && preview !== null}');
    expect(sheet).toContain('onShow={() => {}}');
    expect(sheet).not.toContain('previewRun');
    expect(sheet).not.toContain('animatePreview');
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
