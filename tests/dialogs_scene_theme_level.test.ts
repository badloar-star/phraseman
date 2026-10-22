// зачем (владелец 22.10 через координатора: «Сцена всегда как в макете» — сцена «Диалогов» и верх листа согласия рисуются токенами уровня «Максимум» при любом положении ползунка яркости,
// ползунок меняет остальной фон): сторож — цвета сцены не зависят от уровня (3 уровня × все темы × 2 оформления), выбор уровня — в одной точке, текст читается, шов с панелью текущего уровня виден.
import { readFileSync } from 'fs';

import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  DIALOGS_SCENE_MIN_TEXT_CONTRAST, DIALOGS_SCENE_THEME_LEVEL, contrastRatio, dialogsSceneColors, dialogsSceneContrast, dialogsSceneTokensForTheme,
} from '../components/dialogs/scene/dialogs_scene_tokens';

const read = (rel: string): string => readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
const LEVELS = ['calm', 'accent', 'max'] as const;
const APPEARANCES = ['dark', 'light'] as const;
const cases = LIQUID_GLASS_THEME_IDS.flatMap((id) => APPEARANCES.map((appearance) => [id, appearance] as const));

describe('Сцена Диалогов: токены уровня «Максимум» при любом ползунке', () => {
  it('уровень сцены — max, выбирается в одной точке', () => {
    expect(DIALOGS_SCENE_THEME_LEVEL).toBe('max');
    const hook = read('components/dialogs/scene/use_dialogs_scene_theme.ts');
    expect(hook).toMatch(/dialogsSceneTokensForTheme\(liquidGlassThemeId, liquidGlassAppearance\)/);
    expect(hook).toMatch(/\[liquidGlassThemeId, liquidGlassAppearance\]/);
    expect(hook).not.toMatch(/liquidGlassIntensity|liquidGlassLevel|useLv2Glass/);
    for (const file of ['DialogsScene.tsx', 'DialogsConsentTop.tsx']) {
      const src = read(`components/dialogs/scene/${file}`);
      expect(src).toMatch(/useDialogsSceneTheme\(\)/);
      expect(src).not.toMatch(/useLv2Glass|liquidGlassTokens\(/);
    }
  });

  it.each(cases)('%s / %s: цвета сцены одни и те же на всех трёх уровнях ползунка и равны токенам max', (id, appearance) => {
    const fromMax = dialogsSceneColors(liquidGlassTokens(id, { level: 'max', appearance }));
    for (const level of LEVELS) {
      // ползунок стоит на `level`: токены остального фона меняются, а сцена берёт свою точку — результат не зависит от уровня
      const sliderTokens = liquidGlassTokens(id, { level, appearance });
      expect(sliderTokens.isLight).toBe(appearance === 'light');
      expect(dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance))).toEqual(fromMax);
    }
  });

  it('проверка не пустая: на уровне calm те же формулы дали бы другие цвета (в части тем и оформлений)', () => {
    const differing = cases.filter(([id, appearance]) => {
      const calm = dialogsSceneColors(liquidGlassTokens(id, { level: 'calm', appearance }));
      const max = dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance));
      return calm.top !== max.top || calm.bottom !== max.bottom || calm.glowRight !== max.glowRight;
    });
    expect(differing.length).toBeGreaterThan(10);
  });

  it.each(cases)('%s / %s: текст и вторичный текст ≥ 4,5 на сцене уровня max', (id, appearance) => {
    const tokens = dialogsSceneTokensForTheme(id, appearance);
    const c = dialogsSceneContrast(tokens, dialogsSceneColors(tokens));
    expect(c.text).toBeGreaterThanOrEqual(DIALOGS_SCENE_MIN_TEXT_CONTRAST);
    expect(c.secondary).toBeGreaterThanOrEqual(DIALOGS_SCENE_MIN_TEXT_CONTRAST);
  });

  it.each(cases)('%s / %s: шов сцены (max) и панели под ней виден при каждом из трёх уровней ползунка', (id, appearance) => {
    const scene = dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance));
    for (const level of LEVELS) {
      const panel = liquidGlassTokens(id, { level, appearance }).opaqueCard;
      // эталон: стык в тёмном ≥ 1,34 (на max); при остальных уровнях панель чуть другая — порог мягче, но шов не пропадает
      expect(contrastRatio(scene.textZone, panel)).toBeGreaterThanOrEqual(appearance === 'dark' ? 1.15 : 1.03);
    }
  });
});
