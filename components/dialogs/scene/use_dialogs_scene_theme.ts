// ═══════════════════════════════════════════════════════════════════════════
// use_dialogs_scene_theme.ts — цвета «Сцены» «Диалогов» выбранной темы: ВСЕГДА токены уровня «Максимум».
//
// зачем (владелец 22.10 через координатора: «Сцена всегда как в макете»; ползунок яркости темы меняет остальной фон, а не сцену): эталон dialogs-scene-states.html снят на «Максимуме»
// (снимок тем страницы = liquidGlassTokens(id, { level: 'max' })), поэтому сцена хаба и верх листа согласия берут токены max при любом положении ползунка. Хук — ЕДИНСТВЕННАЯ точка:
// сцена и лист не читают токены текущего уровня сами. Зависит только от темы и оформления (светлое/тёмное) — смена уровня ползунка сцену не перерисовывает.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo } from 'react';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import { logSceneTheme } from '../../home/v2/scene/scene_theme_log';
import { useTheme } from '../../ThemeContext';
import { mixHex } from '../../../constants/v2Style';
import { isSkyPalette, sceneBottomHex, scenePaletteCached, sceneTopHex } from '../../scene/scene_palette';
import { dialogsSceneColors, dialogsSceneTokensForTheme, type DialogsSceneColors } from './dialogs_scene_tokens';

export type DialogsSceneTheme = Readonly<{
  /** Токены темы уровня max — для расчёта цветов сцены и журнала контраста. */
  tokens: GlassTokens;
  colors: DialogsSceneColors;
}>;

export function useDialogsSceneTheme(): DialogsSceneTheme {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const scene = useMemo(() => {
    const tokens = dialogsSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance);
    // зачем (вердикт владельца 29.10, scenePalette): сцена Диалогов у ВСЕХ тем и оформлений — утверждённый вид (тёмное «Глубокое небо», светлое «А»), то есть тёмно-насыщенная сцена
    // с БЕЛЫМ текстом: надписи, стекло и кнопки берутся из набора тёмного оформления (у светлых Диалогов раньше был тёмный текст на светлой сцене). Верх/низ/зона текста — из палитры.
    const textTokens = liquidGlassAppearance === 'dark' ? tokens : dialogsSceneTokensForTheme(liquidGlassThemeId, 'dark');
    const base = dialogsSceneColors(textTokens);
    const pal = scenePaletteCached(liquidGlassThemeId, liquidGlassAppearance, 'dialogs', 1080, 1082, 2.625);
    const hex = (c: ReadonlyArray<number>): string => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
    const top = sceneTopHex(pal);
    const bottom = sceneBottomHex(pal);
    // зона текста: «горизонт» неба / низ «А» с затемнением, которое держит страж — белый на ней ≥ 4,6 (в журнале контраст считается по этому цвету)
    const zoneBase = isSkyPalette(pal) ? hex(pal.raw.hor) : pal.gradient.bottom.hex;
    const shade = isSkyPalette(pal) ? Math.min(0.7, pal.guard.aBottom + 0.04) : pal.scrim ? pal.scrim.a : 0;
    const textZone = shade > 0 ? mixHex(zoneBase, '#000000', shade) : zoneBase;
    const colors: DialogsSceneColors = Object.freeze({ ...base, top, bottom, textZone, scrim: null, glowBottom: null, isLight: false });
    return Object.freeze({ tokens, colors });
  }, [liquidGlassThemeId, liquidGlassAppearance]);
  // зачем (баг владельца 28.10, закон «сперва логи»): какими цветами и откуда нарисована сцена Диалогов — один поиск [SCENE-THEME]
  useEffect(() => {
    logSceneTheme('dialogs', liquidGlassThemeId, liquidGlassAppearance, 'dialogsSceneTokensForTheme(max)', { top: scene.colors.top, bottom: scene.colors.bottom, halo: scene.colors.halo, glowR: scene.colors.glowRight, glowL: scene.colors.glowLeft, glowB: scene.colors.glowBottom });
  }, [scene, liquidGlassThemeId, liquidGlassAppearance]);
  return scene;
}
