// Плоский «инстаграм»-режим тем «Бизнес» (business) и «Бизнес светлый»
// (businessLight). Правила языка:
//  - фон чистый чёрный/белый, секции разделяются ВОЛОСЯНЫМИ линиями,
//    а не рамками контейнеров;
//  - никакого объёма: нет теней, градиентов, бликов (глушится и на уровне
//    токенов темы: btnShadow/cardShadow прозрачны, cardGradient вырожден);
//  - тонкие иконки (Ionicons *-outline) и тонкий текст (max '600');
//  - плашки компактнее, скругления меньше, кнопки плоские: либо заливка
//    accent без тени, либо hairline-обводка без заливки;
//  - масштаб интерфейса и размер шрифта фиксированы (см. ThemeContext.isFlat).
//
// Использование в экранах/компонентах:
//   const { isFlat } = useTheme();
//   fontWeight: flatWeight(isFlat, '800')
//   borderWidth: isFlat ? FLAT.hairline : 1.5
import { StyleSheet } from 'react-native';
import type { ThemeMode } from './theme';

export const isFlatMode = (themeMode: ThemeMode): boolean =>
  themeMode === 'business' || themeMode === 'businessLight';

export const FLAT = {
  /** Волосяная линия-разделитель (вместо рамок контейнеров). */
  hairline: StyleSheet.hairlineWidth,
  /** Скругления: заметно меньше обычных тем. */
  radius: { chip: 8, button: 8, card: 10, sheet: 14, pill: 999 },
  /** Компактные вертикальные отступы плашек. */
  rowPaddingV: 10,
  rowPaddingH: 14,
  /** Размер контентных иконок (IG-стандарт). */
  iconSize: 24,
} as const;

type RNFontWeight =
  | 'normal' | 'bold'
  | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

/**
 * Утоньшение текста в плоском режиме: жирные начертания прижимаются к
 * '600'/'500', обычные — к '400'. Вне плоского режима вес не меняется.
 */
export function flatWeight(isFlat: boolean, weight: RNFontWeight): RNFontWeight {
  if (!isFlat) return weight;
  if (weight === '900' || weight === '800' || weight === '700' || weight === 'bold') return '600';
  if (weight === '600' || weight === '500') return '500';
  return '400';
}

/** Ionicons: тонкий outline-вариант глифа, если он существует. */
export function flatIoniconName<T extends string>(
  isFlat: boolean,
  name: T,
  glyphMap: Record<string, unknown>,
): string {
  if (!isFlat) return name;
  if (name.endsWith('-outline') || name.endsWith('-sharp')) return name;
  const outline = `${name}-outline`;
  return outline in glyphMap ? outline : name;
}
