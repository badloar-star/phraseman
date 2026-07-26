import fs from 'fs';
import path from 'path';

const SOURCE_ROOTS = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components'),
];

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isAllowedNativeBackFile(file: string): boolean {
  const baseName = path.basename(file);
  return baseName.startsWith('_admin_');
}

describe('navigation back underlay', () => {
  it('opens every Settings destination as a sheet and keeps Settings as its close fallback', () => {
    const rootLayout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    const settings = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8');

    for (const route of [
      'settings_edu',
      'settings_notifications',
      'settings_themes',
      'settings_language',
      'privacy_settings',
      'ideas_submit',
      'settings_testers',
      'top_helpers',
      'account_details',
      'referrals',
      'promo_code_entry',
      'manage_subscription',
    ]) {
      expect(rootLayout).toContain(`<Stack.Screen name="${route}" options={SECTION_SHEET_STACK_OPTIONS} />`);
    }

    expect(settings).toContain("source: 'settings'");
    expect(settings).toContain("pathname: '/manage_subscription'");
    expect(settings).not.toContain("pathname: '/premium_modal',\n        params: {\n          manage: '1'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'promo_code_entry.tsx'), 'utf8')).toContain("source === 'settings' ? '/(tabs)/settings'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'referrals.tsx'), 'utf8')).toContain("params.source === 'settings' ? '/(tabs)/settings'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'top_helpers.tsx'), 'utf8')).toContain("source === 'settings' ? '/(tabs)/settings'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'manage_subscription.tsx'), 'utf8')).toContain("? '/(tabs)/settings'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'navigation_back.ts'), 'utf8')).toContain("const forceSettingsFallback = basePath(String(fallback ?? '')) === '/(tabs)/settings';");
    expect(fs.readFileSync(path.join(__dirname, '..', 'app', 'navigation_back.ts'), 'utf8')).toContain("if (forceSettingsFallback && typeof router.canDismiss === 'function' && typeof router.dismiss === 'function' && router.canDismiss())");
    expect(fs.readFileSync(path.join(__dirname, '..', 'components', 'SectionSheetHeader.tsx'), 'utf8')).toContain('left: 12');
    expect(fs.readFileSync(path.join(__dirname, '..', 'components', 'referral_sheet_shell.tsx'), 'utf8')).toContain("flexDirection: 'row-reverse'");
    expect(settings).toContain('settingsScrollYRef.current');
    expect(settings).not.toContain('scrollTo({ y: 0, animated: false })');
  });

  it('keeps real tab content mounted under full-screen stack routes', () => {
    const tabLayoutFile = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');
    const source = fs.readFileSync(tabLayoutFile, 'utf8');

    expect(source).not.toContain('ph-home-hidden');
    expect(source).not.toContain('hiddenStackUnderlay');
    expect(source).not.toMatch(/if\s*\(!currentRouteIsTab\)\s*\{\s*return\s+<View/);
  });

  it('keeps the root native stack on an opaque CONSTANT app background during route pops', () => {
    const rootLayoutFile = path.join(__dirname, '..', 'app', '_layout.tsx');
    const source = fs.readFileSync(rootLayoutFile, 'utf8');

    // Фон стека и корневого View — константа темы. Производные от асинхронных флагов
    // (appShellReady и т.п.) давали «чёрный кадр» при гонке — запрещены контрактом.
    expect(source).toContain('contentStyle: { backgroundColor: tTheme.bgPrimary }');
    expect(source).not.toContain('contentStyle: { backgroundColor: appShellReady');
    expect(source).toContain("animation: 'none'");
  });

  it('keeps per-screen stack animations behind the global transition flags', () => {
    const rootLayoutFile = path.join(__dirname, '..', 'app', '_layout.tsx');
    const source = fs.readFileSync(rootLayoutFile, 'utf8');
    const stackScreenLines = source.split(/\r?\n/).filter((line) => line.includes('<Stack.Screen'));
    const directSlideScreens = stackScreenLines.filter((line) => /animation:\s*'slide_from_(right|bottom)'/.test(line));

    expect(source).toContain('const defaultScreenAnimationOptions = ENABLE_SCREEN_TRANSITIONS');
    expect(source).toContain('const bottomModalAnimationOptions = ENABLE_SCREEN_TRANSITIONS');
    expect(source).toContain('...pushScreenAnimationOptions');
    expect(source).toContain('...bottomModalAnimationOptions');
    // Fade — только через флаг SCREEN_FADE_TRANSITIONS и только когда «полный» slide-режим
    // выключен (см. config.ts). Гейт по Platform.OS === 'ios' снят осознанно: при 'none'
    // на Android в зазоре между экранами мелькал голый bgPrimary («тёмный экран» при входе
    // в урок). Краши Fabric в истории были на CARD-PUSH slide, а не на fade; modal-анимации
    // (slide_from_bottom) годами едут на обеих платформах у пейволов и шторок разделов.
    // Суть контракта прежняя: fade НЕ хардкодится, а остаётся за флагом с kill-switch.
    expect(source).toContain('SCREEN_FADE_TRANSITIONS && !ENABLE_SCREEN_TRANSITIONS');
    expect(source).toContain("animation: 'fade', animationDuration: 140");
    expect(directSlideScreens).toEqual([]);
  });

  it('keeps production screens off native router.back()', () => {
    const offenders: string[] = [];
    const sourceFiles = SOURCE_ROOTS.flatMap(listSourceFiles);

    for (const file of sourceFiles) {
      if (isAllowedNativeBackFile(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      source.split(/\r?\n/).forEach((line, index) => {
        const code = line.replace(/\/\/.*$/, '');
        if (/\brouter\.back\s*\(/.test(code)) {
          const relativePath = path.relative(path.join(__dirname, '..'), file);
          offenders.push(`${relativePath}:${index + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
