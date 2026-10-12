import { glassTone } from '../../components/dialogs/glass/glassTone';
import { colorContrast } from '../../constants/color_contrast';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import type { CardPackPaywallTheme } from './cardPackPaywallTheme';

// зачем (координатор 12.10): окно покупки набора должно следовать теме Liquid Glass (тёмная/светлая, любой оттенок ползунка),
// а не таблице по прежним id тем (ThemeMode всегда 'dark' → зелёная оболочка на любой теме).
// Здесь оболочка строится ТОЛЬКО из токенов; категория/UGC-патчи поверх неё накладывает вызывающий код как раньше.
// Подключение к экранам (CardPackShardPaywallModal.tsx, useCollectionData.ts) — отдельный шаг Дизайна/Карточек: они передают сюда tokens.

/** Оболочка окна покупки набора из токенов темы. Без обводок-контейнеров: рамки — тонкие полупрозрачные (исключение 2.0). */
export function cardPackPaywallShellFromTokens(t: GlassTokens): CardPackPaywallTheme {
  const light = t.isLight;
  // Заливка CTA: акцент темы; текст на ней — accentInk (контраст ≥ 4,5 задан токенами).
  // зачем (Дизайн 12.10, проверка контраста по всем темам и оттенкам ползунка): в светлых градиентных темах `accentBright` — глубокий тон
  // для ссылок, а не заливка (accentInk на нём 1,2–2,3:1). Тогда обе половины градиента — `accent` (пара accent/accentInk задана токенами).
  const brightFillOk = colorContrast(t.accentInk, t.accentBright) >= 4.5;
  const cta: readonly [string, string] = brightFillOk ? [t.accentBright, t.accent] : [t.accent, t.accent];
  return {
    // Подложка за окном: затемнение тоном текста темы — в светлой мягче, в тёмной глубже.
    backdropBase: light ? glassTone(t.text, 0.26) : glassTone(t.bg, 0.9),
    outerGlow: [t.accentGlow, glassTone(t.accent, light ? 0.06 : 0.1), glassTone(t.bg, light ? 0.2 : 0.55)],
    borderAccent: glassTone(t.accent, light ? 0.3 : 0.2),
    handleColorLight: glassTone(t.text, 0.25),
    handleColorDark: glassTone(t.accentBright, 0.45),
    iconBg: [t.opaqueControl, t.opaqueCard],
    iconBorder: glassTone(t.accent, 0.25),
    priceBorder: glassTone(t.accent, 0.2),
    priceGradient: [t.opaqueControl, t.opaqueCard],
    ctaColors: cta,
    ctaForeground: t.accentInk,
    ctaGlowTop: t.accentGlow,
    goShopCta: cta,
    goShopForeground: t.accentInk,
  };
}
