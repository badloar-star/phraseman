import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Season Pass admin lab', () => {
  it('is reachable only through the dev-only Labs hub', () => {
    const routes = read('constants/devRoutes.ts');
    const gate = read('app/admin_season_pass_lab.tsx');
    const labs = read('components/admin_panel/sections/LabsSection.tsx');

    expect(routes).toContain('ADMIN_SEASON_PASS_LAB_ROUTE_NAME');
    expect(routes).toContain('ADMIN_SEASON_PASS_LAB_ROUTE');
    expect(routes).toMatch(/DEV_UTILITY_ROUTE_NAMES[\s\S]*ADMIN_SEASON_PASS_LAB_ROUTE_NAME/);
    expect(gate).toContain('ENABLE_DEV_TOOLS');
    expect(gate).toContain("require('./_admin_season_pass_lab')");
    expect(labs).toContain('testID="admin-lab-season-pass"');
    expect(labs).toContain("router.push('/admin_season_pass_lab' as any)");
    expect(labs).toContain('badge={7}');
  });

  it('previews every aura with both art themes and independent layer controls', () => {
    const lab = read('app/_admin_season_pass_lab.tsx');
    const aura = read('components/SeasonAuraRing.tsx');

    expect(lab).toContain('getSeasonAuraStageAsset');
    expect(lab).toContain('getSeasonSecretAuraAsset');
    expect(lab).toContain("const AURA_OPTIONS = ['1', '2', '3', '4', 'secret'] as const;");
    expect(lab).toContain("const themeMode: ThemeMode = artTheme === 'light' ? 'sagePorcelain' : 'midnight';");
    expect(lab).toContain('active={motionEnabled}');
    expect(lab).toContain('visibleLayers={visibleLayers}');
    expect(lab).toContain("testID={`season-aura-${option}`}");
    expect(lab).toContain('Основа');
    expect(lab).toContain('Поток');
    expect(lab).toContain('Частицы');

    expect(aura).toContain('active?: boolean;');
    expect(aura).toContain('visibleLayers?: SeasonAuraVisibleLayers;');
    expect(aura).toContain('active && isFocused && !reduceMotion');
    expect(aura).toContain('visibleLayers.base !== false');
    expect(aura).toContain('visibleLayers.flow !== false');
    expect(aura).toContain('visibleLayers.particles !== false');
  });

  it('explains and renders the frame around the existing user card', () => {
    const lab = read('app/_admin_season_pass_lab.tsx');
    const config = read('app/season_pass_track_config.ts');
    const track = read('app/season_pass.tsx');
    const modal = read('components/SeasonGiftModal.tsx');

    expect(config).toContain('SEASON_PROFILE_CARD_FRAME_COLORS');
    expect(config).toContain("highlight: '#A9CBFF'");
    expect(config).toContain("main: '#5AA6FF'");
    expect(config).toContain("deep: '#2E7BFF'");
    expect(lab).toContain('SEASON_PROFILE_CARD_FRAME_COLORS');
    expect(lab).toContain('testID="season-visiting-card-frame"');
    expect(lab).not.toContain("getSeasonRewardIcon('frame', themeMode)");
    expect(lab).toContain('Визитка');
    expect(lab).toContain('Вся пользовательская карточка');
    expect(lab).toContain('Без рамки');
    expect(track).toContain("frame:             { ru: 'Визитка'");
    expect(modal).toContain("title: T('Визитка'");
    expect(modal).not.toContain('вокруг твоего аватара');
  });

  it('uses a transparent icon that contains only the same blue card frame', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp') as typeof import('sharp');

    for (const theme of ['light', 'dark'] as const) {
      const relativePath = `assets/images/season/rewards/${theme}/frame.webp`;
      const image = sharp(path.join(ROOT, relativePath));
      const metadata = await image.metadata();
      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(320);
      expect(metadata.hasAlpha).toBe(true);

      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
      expect(alphaAt(256, 160)).toBeLessThanOrEqual(8);
      expect(alphaAt(256, 22)).toBeGreaterThanOrEqual(150);
    }
  });
});
