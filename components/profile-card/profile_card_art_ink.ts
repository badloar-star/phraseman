import { useMemo } from 'react';
import {
  getActiveLiquidGlassVariant,
  liquidGlassTokens,
  type GlassTokens,
  type LiquidGlassVariant,
} from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';
import { useShadowGlass } from '../v2/ShadowSurface';
import { colorWithAlpha } from '../v2/plateAlpha';
import type { SheetButtonPaint } from './profile_card_sheet_paint';

/**
 * Белое поверх арта визитки (имя на превью стиля, свой текст, карандаш, замок, кнопки низа, «нравится») — роли ТЕКУЩЕЙ темы.
 *
 * зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»; координатор → МОМЕНТЫ, зона «Друзья/Сообщество»): прежде —
 * постоянные белый и rgba белого с пометкой theme-exempt в четырёх файлах. Теперь: текст и значки — mediaInk («чернила поверх картинок»,
 * белый во всех темах), плашки — mediaInk с прежними плотностями, тёмная подпись на белой кнопке — фон/текст темы, сердце — bad темы.
 * Сама палитра вида визитки (profile_card_looks) здесь не трогается.
 */
export type ProfileCardArtInk = Readonly<{
  ink: string;
  /** «Свой текст» визитки, 86 %. */
  bio: string;
  /** Карандаш и подпись замка, 72 %. */
  soft: string;
  /** Стеклянная плашка тела у видов с glassBody, 14 %. */
  glass: string;
  /** Кружок карандаша у своего текста, 18 %. */
  pen: string;
  /** Пилюля замка «Свой текст — в Про визитке», 12 %. */
  lock: string;
  /** Сердце «нравится» в нажатом состоянии. */
  liked: string;
  /** Кнопки низа визитки на арте: белая главная, полупрозрачные вторая и выключенная. */
  button: SheetButtonPaint;
}>;

type ArtInkSource = Pick<GlassTokens, 'mediaInk' | 'bad' | 'isLight' | 'text' | 'bg'>;

/** `darkTwin` — та же тема в тёмном оформлении: арт визитки всегда тёмный, сердцу нужен её светлый bad. */
export function profileCardArtInk(g: ArtInkSource, darkTwin: Pick<GlassTokens, 'bad'> = g): ProfileCardArtInk {
  const ink = (alpha: number) => colorWithAlpha(g.mediaInk, alpha);
  return {
    ink: g.mediaInk,
    bio: ink(0.86),
    soft: ink(0.72),
    glass: ink(0.14),
    pen: ink(0.18),
    lock: ink(0.12),
    liked: darkTwin.bad,
    button: {
      primaryBg: g.mediaInk,
      // тёмная подпись на белой кнопке: в светлой теме — текст темы, в тёмной — её фон (оба тёмные, ≥ 4,5 на белом)
      primaryInk: g.isLight ? g.text : g.bg,
      altBg: ink(0.13),
      altInk: g.mediaInk,
      offBg: ink(0.09),
      offInk: ink(0.55),
    },
  };
}

/**
 * Чернила арта для темы и варианта ползунка. зачем (тест profile_card_art_ink_theme): в светлом оформлении bad темнее и на тёмном арте
 * давал 2,0–2,6 : 1 — сердце берём из тёмного оформления ТОЙ ЖЕ темы (тот же тон, светлее), а не своим HEX.
 */
export function profileCardArtInkForTheme(themeId: unknown, variant: LiquidGlassVariant): ProfileCardArtInk {
  const g = liquidGlassTokens(themeId, variant);
  return profileCardArtInk(g, g.isLight ? liquidGlassTokens(themeId, { ...variant, appearance: 'dark' }) : g);
}

export function useProfileCardArtInk(): ProfileCardArtInk {
  const { liquidGlassThemeId } = useTheme();
  // токены темы — подписка на смену варианта: кэш отдаёт новый объект на каждый шаг ползунка и смену оформления
  const g = useShadowGlass();
  return useMemo(
    () => profileCardArtInk(g, g.isLight ? liquidGlassTokens(liquidGlassThemeId, { ...getActiveLiquidGlassVariant(), appearance: 'dark' }) : g),
    [g, liquidGlassThemeId],
  );
}
