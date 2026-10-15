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
  // зачем (владелец 01.10: «при смене темы на Главной ничего не меняется — всё должно быть
  // везде одинаково»): раньше «Спокойно» в тёмном отдавало базовую палитру Главной (почти
  // чёрный с 1,5% цвета темы), а остальные экраны красились токенами темы. Теперь фон,
  // карточки, стекло и текст Главной — те же токены выбранной темы, что и у всех экранов.
  // Поверхности тёмного оформления из токенов темы («Спокойно» и «Акцент» делят один фон).
  // Стекло непрозрачное (≥ 0.9): полупрозрачный g.card давал бы текст «насквозь».
  const darkSurfaces = {
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
    glass: alphaHex(g.opaqueCard, 0.9),
    glassRaised: alphaHex(g.opaqueControl, 0.92),
    sheet: g.opaqueSheet,
  };
  if (g.level === 'calm' && !g.isLight) {
    return Object.freeze({ ...p, ...darkSurfaces, cta: g.ctaFill, ctaText: g.ctaFillInk });
  }
  const accentRoles = {
    accent: g.accent,
    accentSoft: g.accentSoft,
    // зачем (светлый акцент, кадр Главной «Аврора/1» 13.10): полоса прогресса — графика; на светлых градиентных темах сырой accent бледный, accentGraphic там глубже, в тёмном равен accent
    progressFill: g.accentGraphic,
    // зачем (владелец 13.10, №35): заливка главной кнопки — ctaFill (= accent, а где пастель слилась бы с фоном — глубже, ≥ 1,8 : 1)
    cta: g.ctaFill,
    ctaText: g.ctaFillInk,
    accentFill: g.ctaFill,
    accentText: g.accentText,
    link: g.accentText,
    // Значки в плитках, огонь серии на Главной, отметки «Сегодня» — цвет темы (макет .tile / .fl).
    iconTint: g.accentBright,
    tileFrom: g.accentTile,
  };
  if (g.isLight) {
    return Object.freeze({
      ...p,
      ...accentRoles,
      // «Спокойно» в светлом: кнопка «чернильная», огонь/ссылки — вторичный тон текста.
      accentText: g.level === 'calm' ? g.secondary : g.accentText,
      link: g.level === 'calm' ? g.secondary : g.accentText,
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
      // зачем (владелец 11.10: Шпиль следует теме; замер 13.10): в светлом оформлении зелёный/красный «верно/неверно» из старой
      // базы давали на белой карточке 2.08/3.32, а на светлом фоне 1.55/2.48 — подписи зон («Вверх»/«Вниз») и стрелки не читались.
      // Семантические токены темы держат ≥ 4.5 на карточке и ≥ 3 на фоне. Тёмное оформление не меняется (там старые цвета читаются).
      correct: g.good,
      wrong: g.bad,
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
      // зачем (приказ владельца 14.10: «тёмные пятна в светлых темах проявляются на белом»): в светлом «Максимуме» дымка брала solid(cardSmoke[0]); у градиентных
      // тем cardSmoke = #00000000, solid() отбрасывал альфу → ЧЁРНАЯ дымка ×4 на белой плашке; у тонированных — серо-голубые пятна. Правило светлых тем:
      // внутри плашки блик только светлее неё — дымка всегда белая, без усиления.
      smoke: '#FFFFFF',
      smokeBoost: 1,
      tileFrom: g.accentTile,
      tileTo: g.opaqueCard,
      sheet: g.opaqueSheet,
    });
  }
  if (g.level === 'accent') return Object.freeze({ ...p, ...darkSurfaces, ...accentRoles });
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
