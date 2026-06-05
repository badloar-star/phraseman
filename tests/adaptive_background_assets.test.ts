import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

const VARIANTS = {
  phonePortrait: { width: 1080, height: 1920 },
  phoneLandscape: { width: 1920, height: 1080 },
  tabletPortrait: { width: 1668, height: 2388 },
  tabletLandscape: { width: 2388, height: 1668 },
  ultraPortrait: { width: 1848, height: 2960 },
  ultraLandscape: { width: 2960, height: 1848 },
} as const;

const BACKGROUND_ROOTS = [
  'assets/images/app_backdrops',
  'assets/images/screen_backdrops',
  'assets/images/theme_backdrops',
  'assets/images/first_lesson_sheet',
  'assets/images/paywalls/premium_hero',
  'assets/images/quizzes/level_cards',
  'assets/images/quizzes/theme_cards',
  'assets/images/statistics/cards',
  'assets/images/statistics/premium_snapshots',
];

function walk(dir: string, matcher: RegExp = /\.(webp|png|jpe?g)$/i): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next, matcher);
    return matcher.test(entry.name) ? [next] : [];
  });
}

function expectedSize(relativeAssetPath: string, variantName: keyof typeof VARIANTS) {
  const variant = VARIANTS[variantName];
  const normalized = relativeAssetPath.replace(/\\/g, '/');

  if (normalized.includes('/quizzes/level_cards/') || normalized.includes('/quizzes/theme_cards/')) {
    const scale = variantName.startsWith('ultra') ? 2 : variantName.startsWith('tablet') ? 1.5 : 1;
    return { width: Math.round(640 * scale), height: Math.round(236 * scale) };
  }

  if (normalized.includes('/statistics/cards/') || normalized.includes('/statistics/premium_snapshots/')) {
    const scale = variantName.startsWith('ultra') ? 2 : variantName.startsWith('tablet') ? 1.5 : 1;
    return { width: Math.round(900 * scale), height: Math.round(620 * scale) };
  }

  if (normalized.includes('/first_lesson_sheet/')) {
    if (variantName.endsWith('Landscape')) {
      return { width: Math.min(variant.width, 2200), height: Math.min(variant.height, 1400) };
    }
    return { width: Math.min(variant.width, 1536), height: Math.min(variant.height, 2200) };
  }

  return variant;
}

describe('adaptive background assets', () => {
  it('ships every background source with phone, tablet, and ultra variants', async () => {
    const sources = BACKGROUND_ROOTS.flatMap(root => walk(path.join(ROOT, root)))
      .filter(file => !file.replace(/\\/g, '/').includes('/adaptive_backgrounds/'));

    expect(sources.length).toBeGreaterThan(300);

    for (const source of sources) {
      const relative = path.relative(path.join(ROOT, 'assets', 'images'), source);

      for (const variantName of Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>) {
        const variantPath = path.join(ROOT, 'assets', 'images', 'adaptive_backgrounds', variantName, relative);
        expect(fs.existsSync(variantPath)).toBe(true);

        const meta = await sharp(variantPath).metadata();
        const expected = expectedSize(relative, variantName);
        expect({ width: meta.width, height: meta.height }).toEqual(expected);
      }
    }
  }, 120000);

  it('does not use stretch mode for app background images', () => {
    const files = [
      'app',
      'components',
      'constants',
      'hooks',
      'lib',
    ].flatMap(root => walk(path.join(ROOT, root), /\.(tsx?|jsx?)$/i));

    const offenders = files.flatMap(file => {
      const body = fs.readFileSync(file, 'utf8');
      return body.match(/(?:resizeMode|contentFit)=["']stretch["']/g)
        ? [path.relative(ROOT, file)]
        : [];
    });

    expect(offenders).toEqual([]);
  });
});
