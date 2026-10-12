// зачем (координатор 12.10, аудит светлого акцента docs/phraseman-2.0/LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md, раздел 1): у градиентных тем в СВЕТЛОМ оформлении сырой `accent` — пастель
// (контраст 1,0–1,8 на фоне/карточке), поэтому кольца, полосы, точки, кромки и контуры состояний, окрашенные им, там невидимы. Для них есть глубокие токены темы:
// графика → `accentGraphic`, текст/значки → `accentTextSafe`, полоса прогресса → `progressGradient`.
// зачем (координатор 13.10, замер Ядра bb6659de2): сырые accentBorder/accentText сдвигали ТЁМНЫЙ вид (graphite #F2F1F6 → #F4F5F8EB; aurora/iris/marine на «Максимуме»).
// Токены Тем c62e8fc70 в тёмном — байт-в-байт `accent`, в светлом градиентном — углублённый оттенок; тест tests/accent_graphic_token.test.ts.
// Экранам, у которых под рукой только устаревший `t` (useTheme().theme) и нет токенов стекла, — этот хук: один вызов вместо ручного liquidGlassTokens(liquidGlassThemeId).
import { useMemo } from 'react';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

export type AccentGraphics = Readonly<{
  /** Графика: кольцо, линия, точка, кромка, контур состояния, заливка полосы. */
  border: string;
  /** Текст и значки цветом акцента (≥ 4,5 на карточке). */
  text: string;
  /** Градиент заливки полосы прогресса. */
  gradient: readonly string[];
}>;

export function useAccentGraphics(): AccentGraphics {
  const { liquidGlassThemeId } = useTheme();
  // токены мемоизированы по теме/уровню/оформлению — объект стабилен между рендерами
  const tokens = liquidGlassTokens(liquidGlassThemeId);
  return useMemo(() => ({ border: tokens.accentGraphic, text: tokens.accentTextSafe, gradient: tokens.progressGradient }), [tokens]);
}

export default useAccentGraphics;
