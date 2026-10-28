// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_palette.ts — палитра кадров объявлений: палитра личных кадров (story_template_palette, токены темы 1:1) плюс
// --grad-a / --grad-b макета (accentGradient темы: цветные плоскости и диски) и --good / --bad.
//
// зачем (владелец 22.10: «цвета строго оттенки текущей темы»): плоскости темы — градиент accentGradient (или accent → accent); «верно /
// ошибка» карточки ошибок — тоже токены (accentText / secondary), а не свои зелёный и красный.
// ═══════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { storyTemplatePalette, type StoryTemplatePalette } from '../templates/story_template_palette';

export type AnnPalette = StoryTemplatePalette & Readonly<{
  /** --grad-a / --grad-b — начало и конец accentGradient темы (плоскости, диски, доска, занавес). */
  gradA: string; gradB: string;
  /** --good / --bad карточки ошибок — токены темы (верный ответ — accentText, зачёркивание — secondary). */
  good: string; bad: string;
}>;

/** Чистая функция: палитра по id темы (тест и фотостудия). */
export function annPalette(themeId: unknown): AnnPalette {
  const base = storyTemplatePalette(themeId);
  const t = liquidGlassTokens(themeId) as { accentGradient?: readonly string[] };
  const g = Array.isArray(t.accentGradient) && t.accentGradient.length > 0 ? t.accentGradient : [base.accG, base.accG];
  return Object.freeze({ ...base, gradA: g[0]!, gradB: g[g.length - 1]!, good: base.acc, bad: base.sec });
}

export function useAnnPalette(): AnnPalette {
  const { theme, themeMode, liquidGlassThemeId } = useTheme();
  // зачем: смена оформления (тёмное/светлое) меняет токены той же темы — пересчёт по всем трём ключам, как у личных кадров
  return useMemo(() => annPalette(liquidGlassThemeId), [theme, themeMode, liquidGlassThemeId]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Точки start/end expo-linear-gradient для угла CSS (deg, 0 = снизу вверх, 90 = слева направо) в боксе w × h. */
export function gradientPoints(angleDeg: number, w: number, h: number): Readonly<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  // длина линии градиента CSS: |w·sin| + |h·cos|; половина — от центра до края
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const sx = 0.5 - (dx * half) / w;
  const sy = 0.5 - (dy * half) / h;
  return { start: { x: sx, y: sy }, end: { x: 1 - sx, y: 1 - sy } };
}
