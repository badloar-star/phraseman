// Обесцвечивание иконок/акцентов для строгой моно-темы «Бизнес» (business).
//
// В теме business не должно быть НИ ОДНОГО цветного оттенка — только чёрный,
// белый и серый. Многие иконки в приложении получают цвет жёстко вписанным
// значением (золото сертификата, зелёный «верно», красный «ошибка», цвета лиг
// и т.п.), мимо палитры темы. Эта утилита централизованно подменяет такой цвет
// на нейтральный, КОГДА активна тема business, и оставляет исходный цвет во всех
// остальных темах.
//
// Использование:
//   import { monoIcon, MONO_ICON } from '../constants/monoIcon';
//   <Ionicons color={monoIcon(themeMode, '#FFD700')} />
//   <Ionicons color={monoIcon(themeMode, won ? '#34C759' : '#FF3B30')} />
//
// По умолчанию любой цвет в business превращается в светлый (MONO_ICON.light,
// почти белый) — это контрастно на тёмных поверхностях темы. Если нужен другой
// нейтральный тон, передай его третьим аргументом.

import type { ThemeMode } from './theme';

export const MONO_ICON = {
  /** Основной светлый тон иконки на тёмном фоне business. */
  light: '#F2F2F2',
  /** Приглушённый серый (вторичные/неактивные иконки). */
  muted: '#9A9A9A',
  /** Тёмный тон — для иконок на СВЕТЛОЙ (белой) подложке. */
  onLight: '#0A0A0A',
} as const;

export const isBusinessMode = (themeMode: ThemeMode): boolean => themeMode === 'business';

/**
 * Возвращает нейтральный цвет иконки в теме business, иначе — исходный `color`.
 * @param themeMode текущая тема
 * @param color исходный (возможно цветной) цвет иконки
 * @param mono нейтральный тон для business (по умолчанию светлый #F2F2F2)
 */
export function monoIcon(
  themeMode: ThemeMode,
  color: string,
  mono: string = MONO_ICON.light,
): string {
  return isBusinessMode(themeMode) ? mono : color;
}
