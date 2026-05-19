import fs from 'fs';
import path from 'path';
import {
  APP_ART_BACKDROP_NAMES,
  APP_ART_BACKDROP_SOURCES,
  APP_ART_THEME_MODES,
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
      const backdropName = resolveAppArtBackdropName(route);
      for (const themeMode of APP_ART_THEME_MODES) {
        expect(getAppArtBackdropSource(backdropName, themeMode)).toBeTruthy();
      }
    }
  });
});
