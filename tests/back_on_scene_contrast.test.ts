// зачем (🟡 координатор 22.10, токен g.backOnScene): круг общей кнопки назад/✕ на сценах не сливается с фоном сцены — круг к фону ≥ 1,5, значок к кругу ≥ 3 —
// на трёх сценах (Главная, «Диалоги», обложка/карточки Сезона) × 23 темы × свет/тьма. Цвет сцены берётся у верха (там стоит кнопка).
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { BACK_ON_SCENE_MIN_CIRCLE, BACK_ON_SCENE_MIN_GLYPH, backOnSceneTokens } from '../components/v2/back_on_scene';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { dialogsSceneColors, dialogsSceneTokensForTheme } from '../components/dialogs/scene/dialogs_scene_tokens';
import { hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';

const APPEARANCES = ['dark', 'light'] as const;

describe('backOnSceneTokens', () => {
  it('круг ≥ 1,5 к фону сцены и значок ≥ 3 к кругу — Главная, Диалоги, Сезон × все темы × оба оформления', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of APPEARANCES) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id, { level: 'max', appearance });
        const inks = { mediaInk: (g as unknown as { mediaInk?: string }).mediaInk ?? '#FFFFFF', text: g.text };
        const scenes: Array<[string, string]> = [
          ['home', homeSceneTokensForTheme(id, appearance).sceneTop],
          ['dialogs', dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance)).top],
        ];
        for (let chapter = 1; chapter <= 7; chapter += 1) {
          for (let ordinal = 0; ordinal < 6; ordinal += 1) {
            scenes.push([`season ${chapter}.${ordinal}`, seasonThemedArt(hexHue(g.accent), chapter, ordinal, appearance === 'light' ? 'light' : 'dark').from]);
          }
          scenes.push([`season ${chapter} exam`, seasonThemedArt(hexHue(g.accent), chapter, 0, appearance === 'light' ? 'light' : 'dark', true).from]);
        }
        for (const [name, top] of scenes) {
          const t = backOnSceneTokens({ sceneTop: top, ...inks });
          checked += 1;
          if (t.circleToScene < BACK_ON_SCENE_MIN_CIRCLE) bad.push(`${id} ${appearance} ${name} ${top}: круг ${t.circleToScene.toFixed(2)}`);
          if (t.glyphToCircle < BACK_ON_SCENE_MIN_GLYPH) bad.push(`${id} ${appearance} ${name} ${top}: значок ${t.glyphToCircle.toFixed(2)}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad).toEqual([]);
  });

  it('тёмная сцена — светлое стекло и светлый значок, светлая — тёмное стекло и тёмный значок', () => {
    const dark = backOnSceneTokens({ sceneTop: '#10203A', mediaInk: '#FFFFFF', text: '#101828' });
    const light = backOnSceneTokens({ sceneTop: '#E8EEF8', mediaInk: '#FFFFFF', text: '#101828' });
    expect(dark.onDarkScene).toBe(true);
    expect(dark.fill.startsWith('rgba(255,255,255')).toBe(true);
    expect(dark.ink).toBe('#FFFFFF');
    expect(light.onDarkScene).toBe(false);
    expect(light.fill.startsWith('rgba(0,0,0')).toBe(true);
    expect(light.ink).toBe('#101828');
  });
});
