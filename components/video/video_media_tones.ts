import { useMemo } from 'react';
import {
  getActiveLiquidGlassVariant,
  liquidGlassTokens,
  type GlassTokens,
  type LiquidGlassVariant,
} from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';
import { colorWithAlpha } from '../v2/plateAlpha';

/**
 * Цвета поверх видео и под ним — роли ТЕКУЩЕЙ темы.
 *
 * зачем (закон владельца 22.10 «цвета — строго цвета и оттенки текущей темы»; координатор → 8 · МОМЕНТЫ, зона «Видео»): прежде — белый,
 * чёрный и rgba чёрного с пометкой theme-exempt в семи файлах. Теперь: значок и время поверх кадра — mediaInk («чернила поверх картинок»,
 * белый во всех темах); плашки поверх кадра — mediaScrim темы с прежними плотностями; «сцена» под плеером и превью, пока кадр не пришёл, —
 * самая тёмная база той же темы в её тёмном оформлении (deepBaseAlt): видео по-прежнему на тёмном, но в тоне темы, а не чистый чёрный.
 */
export type VideoMediaTones = Readonly<{
  ink: string;
  /** Под плеером и превью до загрузки кадра. */
  stage: string;
  /** Плашка длительности поверх кадра, 72 %. */
  badge: string;
  /** Кружок «играть» в строке набора, 45 %. */
  playCircle: string;
  /** Значок «играть» в стеклянном наборе видео, 50 %. */
  playBadge: string;
  /** Кнопка поверх превью плеера («закрыть»), 82 %. */
  control: string;
  /** Лёгкая вуаль на превью карточки, 10 %. */
  veil: string;
  /** Блик-развёртка по обложке премьеры, 42 %. */
  sheen: string;
}>;

export function videoMediaTones(
  g: Pick<GlassTokens, 'mediaInk' | 'mediaScrim'>,
  darkTwin: Pick<GlassTokens, 'deepBaseAlt'>,
): VideoMediaTones {
  const scrim = (alpha: number) => colorWithAlpha(g.mediaScrim, alpha);
  return {
    ink: g.mediaInk,
    stage: darkTwin.deepBaseAlt,
    badge: scrim(0.72),
    playCircle: scrim(0.45),
    playBadge: scrim(0.5),
    control: scrim(0.82),
    veil: scrim(0.1),
    sheen: colorWithAlpha(g.mediaInk, 0.42),
  };
}

/** Для темы и варианта ползунка: сцена — из тёмного оформления той же темы (в светлом deepBaseAlt светлый). */
export function videoMediaTonesForTheme(themeId: unknown, variant: LiquidGlassVariant): VideoMediaTones {
  const g = liquidGlassTokens(themeId, variant);
  return videoMediaTones(g, g.isLight ? liquidGlassTokens(themeId, { ...variant, appearance: 'dark' }) : g);
}

export function useVideoMediaTones(): VideoMediaTones {
  const { liquidGlassThemeId } = useTheme();
  // токены из кэша: новый объект на каждый шаг ползунка и смену оформления — пересчёт ровно тогда
  const g = liquidGlassTokens(liquidGlassThemeId);
  return useMemo(
    () => videoMediaTones(g, g.isLight ? liquidGlassTokens(liquidGlassThemeId, { ...getActiveLiquidGlassVariant(), appearance: 'dark' }) : g),
    [g, liquidGlassThemeId],
  );
}
