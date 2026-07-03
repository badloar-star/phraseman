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
  light: '#F5F5F5',
  /** Приглушённый серый (вторичные/неактивные иконки). */
  muted: '#737373',
  /** Тёмный тон — для иконок на СВЕТЛОЙ/яркой (белой или синей CTA) подложке. */
  onLight: '#000000',
} as const;

/** Нейтральные тона для СВЕТЛОЙ бизнес-темы (businessLight): фон светлый → иконки тёмные. */
export const MONO_ICON_ON_LIGHT_THEME = {
  light: '#262626',
  muted: '#8E8E8E',
  onLight: '#262626',
} as const;

export const isBusinessMode = (themeMode: ThemeMode): boolean =>
  themeMode === 'business' || themeMode === 'businessLight';

/**
 * Возвращает нейтральный цвет иконки в темах business/businessLight, иначе —
 * исходный `color`. Для businessLight переданный тёмный нейтрал автоматически
 * зеркалится в тёмный аналог (светлые иконки на светлом фоне нечитаемы).
 * @param themeMode текущая тема
 * @param color исходный (возможно цветной) цвет иконки
 * @param mono нейтральный тон для business (по умолчанию светлый #F5F5F5)
 */
export function monoIcon(
  themeMode: ThemeMode,
  color: string,
  mono: string = MONO_ICON.light,
): string {
  if (themeMode === 'businessLight') {
    if (mono === MONO_ICON.light) return MONO_ICON_ON_LIGHT_THEME.light;
    if (mono === MONO_ICON.muted) return MONO_ICON_ON_LIGHT_THEME.muted;
    if (mono === MONO_ICON.onLight) return MONO_ICON_ON_LIGHT_THEME.onLight;
    return mono;
  }
  return themeMode === 'business' ? mono : color;
}
