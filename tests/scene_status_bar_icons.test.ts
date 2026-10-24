// зачем (координатор 24.10, Р2): значки строки состояния над сценой читаются на самой сцене — Главная, Диалоги, Сезон × 23 темы × 2 оформления.
// Белый/чёрный значок к верху сцены ≥ 3 (графика); тёмная сцена → светлые значки, светлая → тёмные.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { dialogsSceneColors, dialogsSceneTokensForTheme, contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';
import { sceneStatusBarStyle, statusBarIconsOnScene } from '../components/v2/scene_status_bar_icons';

describe('значки строки состояния над сценой', () => {
  it('выбранные значки читаются на верху сцены во всех темах и оформлениях', () => {
    const bad: string[] = [];
    let lightScenesDark = 0;
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        const tops: Array<[string, string]> = [
          ['home', homeSceneTokensForTheme(id, appearance).sceneTop],
          ['dialogs', dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance)).top],
          ['season', seasonThemedArt(hexHue(g.accent), 1, 0, appearance).from],
        ];
        for (const [name, top] of tops) {
          const icons = statusBarIconsOnScene(top);
          const ink = icons === 'light' ? '#FFFFFF' : '#000000';
          const r = contrastRatio(ink, top.slice(0, 7));
          if (r < 3) bad.push(`${appearance}/${id}/${name} ${top}: значки ${icons} ${r.toFixed(2)}`);
          if (icons === 'dark') lightScenesDark += 1;
        }
      }
    }
    expect(bad).toEqual([]);
    // сцена Диалогов в светлых темах светлая — функция действительно выбирает тёмные значки хотя бы там
    expect(lightScenesDark).toBeGreaterThan(0);
  });

  it('тёмная сцена → светлые значки, светлая → тёмные; не hex → светлые', () => {
    expect(statusBarIconsOnScene('#10203A')).toBe('light');
    expect(statusBarIconsOnScene('#E8EEF8')).toBe('dark');
    expect(statusBarIconsOnScene('rgba(0,0,0,0.5)')).toBe('light');
    expect(sceneStatusBarStyle('#10203A')).toBe('light-content');
    expect(sceneStatusBarStyle('#E8EEF8')).toBe('dark-content');
  });
});
