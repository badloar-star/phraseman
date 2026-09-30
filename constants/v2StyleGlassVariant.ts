// ═══════════════════════════════════════════════════════════════════════════
// Палитра стиля 2.0 (V2Palette) под уровень цвета и оформление темы.
//
// зачем (владелец 2026-09-30, темы 2.0): Главная, шапки, плитки и фон экранов
// рисуются палитрой V2 (getV2Palette), а она знала только тёмное «Спокойно».
// Здесь одна точка, где V2-палитра получает:
//   • «Акцент»  — цвет темы у кнопки, прогресса, ссылок/огня; фон и стекло прежние;
//   • «Максимум» — плюс фон, стекло и текст в тоне темы, свечение фона и дымка;
//   • светлое   — светлый фон в оттенке темы, белые карточки, тёмный текст.
// «Спокойно» в тёмном возвращает палитру как есть (тот же объект).
// ═══════════════════════════════════════════════════════════════════════════

import type { GlassTokens } from './liquidGlassThemePalette';
// Только тип: v2Style сам импортирует этот модуль, значение отсюда — без цикла.
import type { V2Palette } from './v2Style';

const solid = (hex: string) => (hex.length === 9 ? hex.slice(0, 7) : hex);
const alphaHex = (hex: string, opacity: number) => {
  const n = parseInt(solid(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
};

export function adaptV2PaletteToGlass(p: V2Palette, g: GlassTokens): V2Palette {
  if (g.level === 'calm' && !g.isLight) return p;
  const accentRoles = {
    accent: g.accent,
    accentSoft: g.accentSoft,
    progressFill: g.accent,
    cta: g.accent,
    ctaText: g.accentInk,
    accentFill: g.accent,
    accentText: g.accentText,
  };
  if (g.isLight) {
    return Object.freeze({
      ...p,
      ...accentRoles,
      // «Спокойно» в светлом: кнопка «чернильная», огонь/ссылки — вторичный тон текста.
      accentText: g.level === 'calm' ? g.secondary : g.accentText,
      bg: g.bg,
      bgTop: g.bgTop,
      card: g.opaqueCard,
      cardRaised: g.opaqueCard,
      control: g.opaqueControl,
      track: g.opaqueControl,
      tabBar: g.opaqueSheet,
      hairline: g.line,
      outline: alphaHex(solid(g.text), 0.24),
      divider: g.line,
      text: g.text,
      textSecondary: g.secondary,
      textMuted: g.mutedText,
      glass: g.card,
      glassRaised: g.card,
      sheenFrom: 'rgba(255,255,255,0.65)',
      sheenTo: 'rgba(255,255,255,0)',
      stroke: g.glassEdge,
      iconTint: g.level === 'calm' ? g.secondary : g.accentText,
      glowA: g.bgGlow[0],
      glowB: g.bgGlow[1],
      smoke: g.level === 'max' ? solid(g.cardSmoke[0]) : '#FFFFFF',
      smokeBoost: g.level === 'max' ? 4 : 1,
      tileFrom: g.accentTile,
      tileTo: g.opaqueCard,
      sheet: g.opaqueSheet,
    });
  }
  if (g.level === 'accent') return Object.freeze({ ...p, ...accentRoles });
  // «Максимум» (тёмное): фон, стекло и текст в тоне темы; стекло непрозрачное (≥ 0.92).
  return Object.freeze({
    ...p,
    ...accentRoles,
    bg: g.bg,
    bgTop: g.bgTop,
    card: g.opaqueCard,
    cardRaised: g.opaqueControl,
    control: g.opaqueControl,
    track: g.opaqueControl,
    tabBar: g.opaqueSheet,
    text: g.text,
    textSecondary: g.secondary,
    textMuted: g.mutedText,
    glass: g.card,
    glassRaised: alphaHex(g.opaqueControl, 0.92),
    stroke: g.glassEdge,
    glowA: g.bgGlow[0],
    glowB: g.bgGlow[1],
    smoke: solid(g.cardSmoke[0]),
    smokeBoost: 3,
    tileFrom: g.accentTile,
    sheet: g.opaqueSheet,
  });
}
