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
    return Object.freeze({ tokens, colors: dialogsSceneColors(tokens) });
  }, [liquidGlassThemeId, liquidGlassAppearance]);
  // зачем (баг владельца 28.10, закон «сперва логи»): какими цветами и откуда нарисована сцена Диалогов — один поиск [SCENE-THEME]
  useEffect(() => {
    logSceneTheme('dialogs', liquidGlassThemeId, liquidGlassAppearance, 'dialogsSceneTokensForTheme(max)', { top: scene.colors.top, bottom: scene.colors.bottom, halo: scene.colors.halo, glowR: scene.colors.glowRight, glowL: scene.colors.glowLeft, glowB: scene.colors.glowBottom });
  }, [scene, liquidGlassThemeId, liquidGlassAppearance]);
  return scene;
}
