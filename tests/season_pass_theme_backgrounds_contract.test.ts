import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'app/season_pass_theme_backgrounds.ts');

const THEME_MODES = [
  'dark',
  'gold',
  'coral',
  'minimalDark',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'business',
  'businessLight',
  'candyBlue',
  'indigo',
  'sagePorcelain',
] as const;

describe('Season Pass per-theme backgrounds', () => {
  it('statically wires one unique full-screen asset for every ThemeMode without aliases', () => {
    expect(fs.existsSync(REGISTRY)).toBe(true);
    if (!fs.existsSync(REGISTRY)) return;

    const source = fs.readFileSync(REGISTRY, 'utf8');
    expect(source).toContain('satisfies Record<ThemeMode, ImageSourcePropType>');

    for (const theme of THEME_MODES) {
      const requiredAsset = `require('../assets/images/season/backgrounds/${theme}/background.webp')`;
      expect(source.match(new RegExp(`^  ${theme}: require\\(`, 'gm'))).toHaveLength(1);
      expect(source).toContain(requiredAsset);
      expect(fs.existsSync(path.join(ROOT, `assets/images/season/backgrounds/${theme}/background.webp`))).toBe(true);
    }

    expect(source).not.toMatch(/^  \w+:\s*SEASON_PASS_THEME_BACKGROUNDS\./m);
    expect(source.match(/\/background\.webp'\)/g)).toHaveLength(THEME_MODES.length);
  });

  it('ships full-resolution, compact, non-duplicated WebP backgrounds', async () => {
    const hashes = new Set<string>();
    let totalBytes = 0;

    for (const theme of THEME_MODES) {
      const filePath = path.join(ROOT, `assets/images/season/backgrounds/${theme}/background.webp`);
      expect(fs.existsSync(filePath)).toBe(true);
      if (!fs.existsSync(filePath)) continue;

      const file = fs.readFileSync(filePath);
      const metadata = await sharp(file).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(768);
      expect(metadata.height).toBe(1152);
      expect(file.byteLength).toBeLessThanOrEqual(110_000);
      totalBytes += file.byteLength;
      hashes.add(crypto.createHash('sha256').update(file).digest('hex'));
    }

    expect(hashes.size).toBe(THEME_MODES.length);
    expect(totalBytes).toBeLessThanOrEqual(500_000);
  });

  it('renders one fixed decorative background below the scrolling rewards', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/season_pass.tsx'), 'utf8');

    expect(source).toContain('useWindowDimensions');
    expect(source).toContain('getSeasonPassThemeBackground(themeMode)');
    expect(source).toContain('spineTrackRegionPaths(');
    expect(source).toContain('testID="season-pass-fixed-background"');
    expect(source).toContain('resizeMode="cover"');
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain('accessible={false}');
    expect(source).not.toContain('Image as SvgImage');
    expect(source).not.toContain('<Pattern');
    expect(source).not.toContain('<ClipPath');
    expect(source).not.toContain('d={backgroundRegions.free}');
    expect(source).not.toContain('d={backgroundRegions.plus}');

    const fixedBackground = source.indexOf('testID="season-pass-fixed-background"');
    const list = source.indexOf('<FlatList');
    const fullSpine = source.indexOf('d={backgroundRegions.divider}');
    const goldSpine = source.indexOf('d={spineGoldPath}');
    expect(fixedBackground).toBeGreaterThan(0);
    expect(list).toBeGreaterThan(fixedBackground);
    expect(fullSpine).toBeGreaterThan(0);
    expect(goldSpine).toBeGreaterThan(fullSpine);
  });

  it('keeps the jade background readable while muting every other theme behind rewards', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/season_pass.tsx'), 'utf8');

    expect(source).toContain("const seasonBackgroundScrimOpacity = themeMode === 'sagePorcelain' ? 0.3 : 0.82");
    expect(source).toContain('opacity: seasonBackgroundScrimOpacity');
    expect(source).not.toContain('opacity: isDark ? 0.18 : 0.3');
  });

  it('draws the full start-to-end divider in gold so it cannot disappear between rewards', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app/season_pass.tsx'), 'utf8');
    const dividerStart = source.indexOf('<Path d={backgroundRegions.divider}');
    const dividerEnd = source.indexOf('/>', dividerStart);
    const dividerMarkup = source.slice(dividerStart, dividerEnd);

    expect(dividerStart).toBeGreaterThan(0);
    expect(dividerEnd).toBeGreaterThan(dividerStart);
    expect(dividerMarkup).toContain('stroke={t.gold}');
    expect(dividerMarkup).not.toContain('stroke={t.bgSurface}');
  });
});
