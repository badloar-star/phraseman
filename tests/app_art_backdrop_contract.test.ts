import fs from 'fs';
import path from 'path';
import {
  APP_ART_BACKDROP_NAMES,
  APP_ART_ROUTE_BACKDROPS,
  assertAppArtBackdropRoute,
  resolveAppArtBackdropName,
} from '../components/appArtBackdropRegistry';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function routeFromAppFile(file: string): string {
  const rel = path.relative(path.join(__dirname, '..', 'app'), file).replace(/\\/g, '/');
  const withoutExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  const route = withoutExt.endsWith('/index')
    ? withoutExt.slice(0, -'/index'.length)
    : withoutExt;

  return `/${route || 'index'}`;
}

describe('app art backdrop registry', () => {
  it('does not bundle bitmap app background assets', () => {
    const files = [
      path.join(__dirname, '..', 'components', 'appArtBackdropRegistry.ts'),
      path.join(__dirname, '..', 'components', 'AppArtBackdrop.tsx'),
      path.join(__dirname, '..', 'app', 'image_preload.ts'),
    ];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/assets\/images\/(app_backdrops|theme_backdrops|screen_backdrops)/);
      expect(source).not.toMatch(/APP_ART_BACKDROP_SOURCES|getAppArtBackdropSource/);
    }
  });

  it('uses the cinema bloom background system for every theme mode', () => {
    const screenGradient = fs.readFileSync(path.join(__dirname, '..', 'components', 'ScreenGradient.tsx'), 'utf8');
    const screenBackground = fs.readFileSync(path.join(__dirname, '..', 'constants', 'screenBackground.ts'), 'utf8');
    const premiumV2 = fs.readFileSync(path.join(__dirname, '..', 'app', 'premium_modal_v2.tsx'), 'utf8');
    const paywallShared = fs.readFileSync(path.join(__dirname, '..', 'components', 'paywall', 'paywallShared.tsx'), 'utf8');
    const modes = ['dark', 'gold', 'coral', 'minimalDark', 'midnight', 'ember', 'aurora', 'volt'];
    const bloomRenderIndex = screenGradient.indexOf('<CinemaBloom mode={layer.bloomMode} reduceMotion={reduceMotion} />');
    const goldFabricRenderIndex = screenGradient.indexOf('<GoldFabricFlow />');

    expect(screenGradient).toContain('const THEME_BLOOMS: Record<ThemeMode, BloomSpec>');
    expect(screenGradient).toContain('<CinemaBloom mode={layer.bloomMode} reduceMotion={reduceMotion} />');
    expect(screenGradient).toContain('function CinemaParticle');
    expect(screenGradient).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(screenGradient).toContain("AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)");
    expect(screenGradient).toContain('useNativeDriver: SCREEN_GRADIENT_USE_NATIVE_DRIVER');
    expect(screenGradient).toContain('styles.cinemaParticle');
    expect(bloomRenderIndex).toBeGreaterThan(-1);
    expect(goldFabricRenderIndex).toBeGreaterThan(-1);
    expect(bloomRenderIndex).toBeLessThan(goldFabricRenderIndex);
    for (const mode of modes) {
      expect(screenGradient).toMatch(new RegExp(`${mode}: \\{ bloomA:`));
      expect(screenBackground).toMatch(new RegExp(`${mode}: \\[`));
    }

    expect(premiumV2).toContain('BG_GRADIENTS as SCREEN_BG_GRADIENTS');
    expect(premiumV2).not.toContain('const BG_GRADIENTS: Record<string, [string, string, string]>');
    expect(paywallShared).toContain('BG_GRADIENTS as SCREEN_BG_GRADIENTS');
    expect(paywallShared).not.toContain('const BG_GRADIENTS: Record<string, [string, string, string]>');
  });

  it('maps the primary app routes to programmatic backdrop layers', () => {
    const cases = [
      ['/(tabs)/home', 'home'],
      ['/(tabs)/lessons', 'lessons'],
      ['/(tabs)/arena', 'arena'],
      ['/(tabs)/friends', 'friends'],
      ['/(tabs)/settings', 'settings'],
      ['/lesson_menu', 'lessons'],
      ['/lesson1', 'lessonPractice'],
      ['/lesson_intro_screens', 'lessonIntro'],
      ['/arena_game', 'arenaMatch'],
      ['/achievements_screen', 'achievements'],
      ['/daily_tasks_screen', 'dailyTasks'],
      ['/quizzes', 'quizzes'],
      ['/quizzes_screen', 'quizzes'],
      ['/diagnostic_test', 'diagnosticTest'],
      ['/exam', 'exam'],
      ['/level_exam', 'exam'],
      ['/flashcards', 'flashcards'],
      ['/progress_map', 'progressMap'],
      ['/shards_shop', 'shardsShop'],
      ['/level_gifts_inventory', 'levelGifts'],
      ['/streak_stats', 'statistics'],
      ['/settings_themes', 'settings'],
    ] as const;

    for (const [route, expected] of cases) {
      expect(resolveAppArtBackdropName(route)).toBe(expected);
    }
  });

  it('keeps every route-resolved ScreenGradient crash-free with a programmatic fallback', () => {
    const appDir = path.join(__dirname, '..', 'app');
    const screenGradientFiles = walk(appDir).filter(file => {
      const source = fs.readFileSync(file, 'utf8');
      return source.includes('<ScreenGradient');
    });

    expect(screenGradientFiles.length).toBeGreaterThan(0);

    for (const file of screenGradientFiles) {
      const route = routeFromAppFile(file);
      const source = fs.readFileSync(file, 'utf8');
      const hasRouteResolvedGradient = /<ScreenGradient\b(?![^>]*\bartBackdrop=)/.test(source);

      if (hasRouteResolvedGradient) {
        const resolved = resolveAppArtBackdropName(route);
        expect(APP_ART_BACKDROP_NAMES).toContain(resolved);
      }
    }
  });

  it('keeps a strict audit helper for missing route mappings', () => {
    expect(() => assertAppArtBackdropRoute('/definitely_missing_route_for_backdrop_audit')).toThrow(
      /Missing generated backdrop mapping/,
    );
  });

  it('keeps runtime route art resolution crash-free for unknown paths', () => {
    expect(resolveAppArtBackdropName('/definitely_missing_route_for_backdrop_audit')).toBe('home');
  });

  it('keeps runtime-owned background maps guarded for navigation-time theme races', () => {
    const checks = [
      {
        file: path.join(__dirname, '..', 'components', 'ScreenGradient.tsx'),
        required: [
          /ORBS\[themeMode\]\s*\?\?/,
          /BG_GRADIENTS\[themeMode\]\s*\?\?/,
        ],
        forbidden: [/autoReport/, /hasReportErrorButton/, /ReportErrorButton/, /useGlobalBottomOverlayOffset/],
      },
      {
        file: path.join(__dirname, '..', 'components', 'RewardModalBackdrop.tsx'),
        forbidden: [/REWARD_MODAL_BACKDROPS\[themeMode\]\s*\?\?/],
      },
      {
        file: path.join(__dirname, '..', 'app', 'premium_modal.tsx'),
        forbidden: [/PREMIUM_HERO_BACKDROPS/, /premium_hero/],
      },
      {
        file: path.join(__dirname, '..', 'app', '_layout.tsx'),
        forbidden: [/FIRST_LESSON_SHEET_BACKGROUNDS/, /firstLessonSheetBackgroundImage/],
      },
    ];

    for (const check of checks) {
      const source = fs.readFileSync(check.file, 'utf8');
      for (const pattern of check.required ?? []) {
        expect(source).toMatch(pattern);
      }
      for (const pattern of check.forbidden) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});
