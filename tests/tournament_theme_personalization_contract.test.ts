import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const SELECTABLE_THEMES = [
  'indigo',
  'sagePorcelain',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'dark',
  'gold',
  'olive',
] as const;

const SLOTS = ['backdrop', 'podium', 'weekly-bank', 'season-rewards'] as const;

describe('Tournament per-theme visual kits', () => {
  it('wires backdrop, podium, weekly-bank, and season-rewards assets for every selectable theme', () => {
    const source = read('components/tournament/tournament_theme_assets.ts');

    for (const theme of SELECTABLE_THEMES) {
      for (const slot of SLOTS) {
        expect(source).toContain(
          `require('../../assets/images/tournament/themes/${theme}/${slot}.webp')`,
        );
      }
    }

    expect(source).toContain('minimalDark: SELECTABLE_KITS.indigo');
    expect(source).toContain('candyBlue: SELECTABLE_KITS.indigo');
    expect(source).toContain('business: SELECTABLE_KITS.gold');
    expect(source).toContain('businessLight: SELECTABLE_KITS.sagePorcelain');
    expect(source).not.toContain('/header.webp');
    expect(source).not.toContain('/ornament.webp');
  });

  it('renders theme art through one guarded, accessibility-hidden backdrop primitive', () => {
    const source = read('components/tournament/TournamentBackdrop.tsx');

    for (const variant of ['hub', 'lobby', 'play', 'table', 'results', 'review', 'season', 'tickets', 'edge']) {
      expect(source).toContain(`'${variant}'`);
    }
    expect(source).toContain('getTournamentThemeAssets(themeMode)');
    expect(source).toContain('useIsScreenFocused()');
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(source).toContain('subscription.remove()');
    expect(source).toContain('cancelAnimation(');
    expect(source).toContain('importantForAccessibility="no-hide-descendants"');
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain('reduceMotion === false');
    expect(source).toContain('if (!mayAnimate) return undefined');
    expect(source).not.toContain('assets.header');
    expect(source).not.toContain('assets.ornament');
    expect(source).not.toContain('TournamentThemeArt');
  });

  it('renders the weekly bank and season rewards cards with the active theme kit', () => {
    const source = read('app/(tabs)/tournaments.tsx');

    expect(source).toContain('getTournamentThemeAssets(themeMode)');
    expect(source).toContain('source={tournamentThemeAssets.weeklyBank}');
    expect(source).toContain('source={tournamentThemeAssets.seasonRewards}');
    expect(source).toContain('tournamentRewardIconArt: { width: 58, height: 58 }');
    expect(source).not.toMatch(
      /<LinearGradient[\s\S]{0,420}source=\{tournamentThemeAssets\.weeklyBank\}/,
    );
    expect(source).not.toMatch(
      /<LinearGradient[\s\S]{0,420}source=\{tournamentThemeAssets\.seasonRewards\}/,
    );
  });

  it('keeps the round loading state themed and bundles every kit for first launch', () => {
    const roundSource = read('app/tournament_round.tsx');
    const appConfig = read('app.json');
    const playBackdrops = roundSource.match(/<TournamentBackdrop variant="play" \/>/g) ?? [];

    expect(playBackdrops.length).toBeGreaterThanOrEqual(2);
    expect(appConfig).toContain('assets/images/tournament/themes/**/*.webp');
  });

  it.each([
    'app/(tabs)/tournaments.tsx',
    'app/tournament_lobby.tsx',
    'app/tournament_season.tsx',
  ])('%s does not render decorative header or ornament theme art', (file) => {
    const source = read(file);
    expect(source).not.toContain('TournamentThemeArt');
    expect(source).not.toContain('themeHeaderArt');
    expect(source).not.toContain('themeTitleFrame');
  });

  it('keeps only podium theme art inside the real results podium stage', () => {
    const source = read('app/tournament_results.tsx');
    expect(source).toContain('TournamentPodiumArt');
    expect(source).toMatch(/podiumArtClip:\s*\{[^}]*overflow: 'hidden'/);
    expect(source).toMatch(/podiumThemeArt:\s*\{[^}]*bottom: 0/);
    expect(source).not.toMatch(/podiumThemeArt:\s*\{[^}]*bottom:\s*-/);
  });

  it.each([
    ['app/tournament_lobby.tsx', 'lobby'],
    ['app/tournament_round.tsx', 'play'],
    ['app/tournament_table.tsx', 'table'],
    ['app/tournament_results.tsx', 'results'],
    ['app/tournament_review.tsx', 'review'],
    ['app/tournament_season.tsx', 'season'],
    ['components/tournament/TournamentEdgeState.tsx', 'edge'],
  ])('%s uses the %s Tournament backdrop variant', (file, variant) => {
    const source = read(file);
    expect(source).toMatch(/import \{[^}]*TournamentBackdrop[^}]*\} from/);
    expect(source).toContain(`<TournamentBackdrop variant="${variant}" />`);
  });

  it('keeps the main Tournament hub free of generated background art', () => {
    const source = read('app/(tabs)/tournaments.tsx');
    expect(source).not.toContain('TournamentBackdrop');
    expect(source).not.toContain('<TournamentBackdrop variant="hub" />');
  });

  it('ships a compact, correctly sized WebP set with alpha on overlay slots', async () => {
    const expectedDimensions = {
      backdrop: [512, 768],
      podium: [512, 320],
      'weekly-bank': [256, 256],
      'season-rewards': [256, 256],
    } as const;
    let totalBytes = 0;

    for (const theme of SELECTABLE_THEMES) {
      for (const slot of SLOTS) {
        const file = path.join(ROOT, 'assets/images/tournament/themes', theme, `${slot}.webp`);
        expect(fs.existsSync(file)).toBe(true);
        const stat = fs.statSync(file);
        const metadata = await sharp(file).metadata();
        totalBytes += stat.size;
        expect([metadata.width, metadata.height]).toEqual(expectedDimensions[slot]);
        if (slot !== 'backdrop') {
          expect(metadata.hasAlpha).toBe(true);
          const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          let visiblePixels = 0;
          for (let index = 3; index < data.length; index += 4) {
            if (data[index] > 8) visiblePixels += 1;
          }
          const coverage = visiblePixels / (info.width * info.height);
          expect(coverage).toBeLessThanOrEqual(slot === 'podium' ? 0.72 : 0.68);
          const corners = [
            3,
            (info.width - 1) * 4 + 3,
            (info.height - 1) * info.width * 4 + 3,
            (info.height * info.width - 1) * 4 + 3,
          ];
          for (const alphaIndex of corners) expect(data[alphaIndex]).toBeLessThanOrEqual(8);
        }
      }
    }

    expect(totalBytes).toBeLessThanOrEqual(1_200_000);
    const shippedWebps = fs.readdirSync(path.join(ROOT, 'assets/images/tournament/themes'), { recursive: true })
      .filter((entry) => String(entry).endsWith('.webp'));
    expect(shippedWebps).toHaveLength(SELECTABLE_THEMES.length * SLOTS.length);
  });
});
