import fs from 'fs';
import path from 'path';
import {
  APP_ART_BACKDROP_NAMES,
  APP_ART_BACKDROP_SOURCES,
  APP_ART_ROUTE_BACKDROPS,
  APP_ART_THEME_MODES,
  assertAppArtBackdropRoute,
  getAppArtBackdropSource,
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

function routeSegmentFromRoute(route: string): string {
  const segments = route
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment && !segment.startsWith('('));

  return segments[segments.length - 1] ?? 'home';
}

describe('app art backdrop registry', () => {
  it('only references bundled app art image files that exist on disk', () => {
    const registryFile = path.join(__dirname, '..', 'components', 'appArtBackdropRegistry.ts');
    const source = fs.readFileSync(registryFile, 'utf8');
    const requirePathPattern = /require\(['"](\.\.\/assets\/images\/[^'"]+)['"]\)/g;
    const missing: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = requirePathPattern.exec(source)) !== null) {
      const assetPath = match[1].replace(/\//g, path.sep);
      const resolved = path.resolve(path.dirname(registryFile), assetPath);

      if (!fs.existsSync(resolved)) {
        missing.push(match[1]);
      }
    }

    expect(missing).toEqual([]);
  });

  it('has a bundled image for every generated backdrop and theme', () => {
    for (const name of APP_ART_BACKDROP_NAMES) {
      for (const themeMode of APP_ART_THEME_MODES) {
        expect(APP_ART_BACKDROP_SOURCES[name][themeMode]).toBeTruthy();
        expect(getAppArtBackdropSource(name, themeMode)).toBeTruthy();
      }
    }
  });

  it('keeps backdrop registry helpers out of runtime fallback audit noise', () => {
    const registryFile = path.join(__dirname, '..', 'components', 'appArtBackdropRegistry.ts');
    const source = fs.readFileSync(registryFile, 'utf8');

    expect(source).not.toMatch(/\bfallback\b|\bFallback\b/);
    expect(source).not.toMatch(/\?\?/);
    expect(source).not.toContain('return APP_ART_BACKDROP_SOURCES[');
  });

  it('maps the primary app routes to generated backgrounds', () => {
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
      ['/flashcards_collection', 'flashcards'],
      ['/flashcards_swipe', 'flashcards'],
      ['/flashcards_market_dev', 'flashcards'],
      ['/community_pack_create', 'flashcards'],
      ['/pack_opening', 'flashcards'],
      ['/progress_map', 'progressMap'],
      ['/shards_shop', 'shardsShop'],
      ['/streak_stats', 'statistics'],
      ['/settings_themes', 'settings'],
    ] as const;

    for (const [route, expected] of cases) {
      expect(resolveAppArtBackdropName(route)).toBe(expected);
    }
  });

  it('keeps every ScreenGradient route covered by a generated backdrop', () => {
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
        const segment = routeSegmentFromRoute(route);
        expect(APP_ART_ROUTE_BACKDROPS[segment]).toBeTruthy();

        const backdropName = resolveAppArtBackdropName(route);
        for (const themeMode of APP_ART_THEME_MODES) {
          expect(getAppArtBackdropSource(backdropName, themeMode)).toBeTruthy();
        }
      }
    }
  });

  it('keeps a strict audit helper for missing generated backdrop route mappings', () => {
    expect(() => assertAppArtBackdropRoute('/definitely_missing_route_for_backdrop_audit')).toThrow(
      /Missing generated backdrop mapping/,
    );
  });

  it('keeps runtime route art resolution crash-free for unknown paths', () => {
    expect(resolveAppArtBackdropName('/definitely_missing_route_for_backdrop_audit')).toBe('home');
  });

  it('keeps tab screens on the independent Fabric-safe backdrop layer', () => {
    const tabLayoutFile = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');
    const source = fs.readFileSync(tabLayoutFile, 'utf8');

    expect(source).toContain('<ScreenGradient artBackdrop={false}');
    expect(source).toMatch(/\b(HOME|LESSONS|ARENA|FRIENDS|SETTINGS)_THEME_BACKDROPS\b/);
    expect(source).toContain('tabBackdropLayers');
    expect(source).toContain('rememberAppArtBackdrop');
  });

  it('preloads app art backgrounds from the registry without duplicate tab/deep fallback lists', () => {
    const preloadFile = path.join(__dirname, '..', 'app', 'image_preload.ts');
    const source = fs.readFileSync(preloadFile, 'utf8');

    expect(source).toContain('APP_ART_BACKDROP_NAMES.flatMap');
    expect(source).toContain('APP_ART_BACKDROP_SOURCES[name]');
    expect(source).not.toMatch(/\b(TAB_BACKGROUND_IMAGES|DEEP_BACKGROUND_IMAGES)\b/);
  });

  it('keeps arena hero art on the generated backdrop registry and persistent crossfade', () => {
    const arenaLobbyFile = path.join(__dirname, '..', 'app', 'arena_lobby.tsx');
    const source = fs.readFileSync(arenaLobbyFile, 'utf8');

    expect(source).toContain("getAppArtBackdropSource('arena', themeMode)");
    expect(source).toContain('usePersistentBackgroundLayers');
    expect(source).not.toContain('ARENA_THEME_BACKDROPS');
  });

  it('does not use the old blur-switch background swapper in app screens', () => {
    const roots = [
      path.join(__dirname, '..', 'app'),
      path.join(__dirname, '..', 'components'),
    ];
    const offenders = roots
      .flatMap(root => walk(root))
      .filter(file => !file.endsWith(`${path.sep}backgroundTransition.tsx`))
      .filter(file => fs.readFileSync(file, 'utf8').includes('useBackgroundBlurSwitch'))
      .map(file => path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });

  it('does not silently fall back for theme-owned background maps', () => {
    const checks = [
      {
        file: path.join(__dirname, '..', 'components', 'ScreenGradient.tsx'),
        forbidden: [
          /ORBS\[themeMode\]\s*\?\?/,
          /BG_GRADIENTS\[themeMode\]\s*\?\?/,
          /autoReport/,
          /hasReportErrorButton/,
          /ReportErrorButton/,
          /useGlobalBottomOverlayOffset/,
        ],
      },
      {
        file: path.join(__dirname, '..', 'components', 'RewardModalBackdrop.tsx'),
        forbidden: [/REWARD_MODAL_BACKDROPS\[themeMode\]\s*\?\?/],
      },
      {
        file: path.join(__dirname, '..', 'app', 'premium_modal.tsx'),
        forbidden: [/PREMIUM_HERO_BACKDROPS\[themeMode\]\s*\?\?/, /PREMIUM_HERO_ART\[ctx\]\s*\?\?/],
      },
      {
        file: path.join(__dirname, '..', 'app', '_layout.tsx'),
        forbidden: [/FIRST_LESSON_SHEET_[A-Z_]+\[themeMode\]\s*\?\?/],
      },
      {
        file: path.join(__dirname, '..', 'app', 'quizzes.tsx'),
        forbidden: [
          /QUIZ_LEVEL_CARD_BACKGROUNDS\[themeMode\]\s*\?\?/,
          /QUIZ_LEVEL_LOGOS\[themeMode\]\s*\?\?/,
          /THEME_PALETTES\[themeMode\]\s*\?\?/,
          /THEME_TEXT\[themeMode\]\s*\?\?/,
        ],
      },
      {
        file: path.join(__dirname, '..', 'app', '(tabs)', 'quizzes.tsx'),
        forbidden: [
          /QUIZ_LEVEL_CARD_BACKGROUNDS\[themeMode\]\s*\?\?/,
          /QUIZ_LEVEL_LOGOS\[themeMode\]\s*\?\?/,
          /THEME_PALETTES\[themeMode\]\s*\?\?/,
          /THEME_TEXT\[themeMode\]\s*\?\?/,
        ],
      },
    ];

    for (const check of checks) {
      const source = fs.readFileSync(check.file, 'utf8');
      for (const pattern of check.forbidden) {
        expect(source).not.toMatch(pattern);
      }
    }
  });
});
