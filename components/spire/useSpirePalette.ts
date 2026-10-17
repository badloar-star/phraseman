import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { getV2Palette, type V2Palette } from '../../constants/v2Style';

// зачем (владелец 2026-09-30, community.html «Шпиль»): экраны Шпиля переносятся 1 в 1 на Liquid Glass.
// Оставляем прежние имена полей палитры (p.text, p.card…), чтобы разметка не менялась, но значения
// берём из токенов стекла активной темы: плоские непрозрачные плиты, светлый текст, кромка — line.
// Цвета «верно/неверно» (correct/wrong) остаются из V2-палитры — это смысловые цвета, не тон темы.
/**
 * Цвет низа градиента фона темы: затухание под нижней кнопкой красим им, а не плоским bg — на градиентных темах плоский давал серую полосу
 * (зачем, Сверка 11.10 — то же, что PanelDock). Под самой кнопкой фон сплошной.
 */
export function useSpireBgBottom(): string {
  const { liquidGlassThemeId } = useTheme();
  return useMemo(() => liquidGlassTokens(liquidGlassThemeId).bgBottom, [liquidGlassThemeId]);
}

/** Палитра Пика + безопасный акцентный текст: в тёмном ровно accent темы, в светлом — углублённый; в «Спокойно» — цвет текста. */
export type SpirePalette = V2Palette & Readonly<{ accentTextSafe: string; accentGraphic: string }>;

export function useSpirePalette(): SpirePalette {
  const { theme, themeMode, liquidGlassThemeId } = useTheme();
  return useMemo(() => {
    const base = getV2Palette(theme, themeMode);
    const g = liquidGlassTokens(liquidGlassThemeId);
    return {
      ...base,
      bg: g.bg,
      bgTop: g.bgTop,
      card: g.opaqueCard,
      cardRaised: g.opaqueControl,
      control: g.opaqueControl,
      hairline: g.line,
      divider: g.line,
      text: g.text,
      textSecondary: g.secondary,
      textMuted: g.mutedText,
      // зачем (темы 2.0): главная кнопка и кольцо таймера — цвет темы в «Акценте/Максимуме»;
      // в «Спокойно» accent = cta, а кольцо остаётся цвета текста, как было.
      // зачем: правило владельца 13.10 "кнопки не сливаются", аудит 15.10 — главная кнопка окон Пика и моментов берёт ctaFill (= accent, а где пастель сливалась бы с фоном светлой градиентной темы — глубже), а не сырой accent: было 1,00–1,84 : 1 к фону
      cta: g.ctaFill,
      ctaText: g.ctaFillInk, // зачем (координатор 15.10, основные кнопки светлых градиентных тем): подпись на ctaFill — ctaInk (там белая на углублённой заливке)
      accentText: g.level === 'calm' ? g.text : g.accentText,
      // зачем (координатор 15.10, храповик light_accent_graphics_ratchet): подписи-акценты окон моментов берут accentTextSafe — в тёмном ровно accent, в светлом углублённый, без сырого accentText
      accentTextSafe: g.level === 'calm' ? g.text : g.accentTextSafe,
      // зачем (храповик light_accent_graphics, поле пар 17.10): графика цвета темы (заливки, кольца) — accentGraphic: в тёмном = accent, в светлом виден на фоне
      accentGraphic: g.accentGraphic,
    };
  }, [theme, themeMode, liquidGlassThemeId]);
}
