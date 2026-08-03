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

  it('explains and renders the frame as a full user card called Visiting Card', () => {
    const lab = read('app/_admin_season_pass_lab.tsx');
    const track = read('app/season_pass.tsx');
    const modal = read('components/SeasonGiftModal.tsx');

    expect(lab).toContain("getSeasonRewardIcon('frame', themeMode)");
    expect(lab).toContain('Визитка');
    expect(lab).toContain('Вся пользовательская карточка');
    expect(lab).toContain('Без рамки');
    expect(track).toContain("frame:             { ru: 'Визитка'");
    expect(modal).toContain("title: T('Визитка'");
    expect(modal).not.toContain('вокруг твоего аватара');
  });
});
