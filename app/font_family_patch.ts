// ─── ГЛОБАЛЬНЫЙ ПЕРЕХВАТ ШРИФТА ──────────────────────────────────────────────
// Проблема: на Android React Native НЕ применяет числовой fontWeight ('700'/'900')
// к кастомному шрифту — текст рендерится обычным Roboto, иерархии нет.
// В проекте ~1900 мест с fontWeight числом и НИ ОДНОГО явного fontFamily: 'Inter-Bold'.
//
// Решение: один раз патчим Text.render так, чтобы любой fontWeight маппился в
// соответствующее именованное начертание Inter. Это чинит все экраны сразу,
// без правки каждого файла. Идемпотентно (защита от повторного вызова при HMR).
//
// Веса -> семейства (см. app/typography.ts / APP_FONT_ASSETS):
//   400/normal      -> Inter         (Regular)
//   500/600         -> Inter-SemiBold
//   700/bold/800    -> Inter-Bold
//   900             -> Inter-Black
//
// Важно: НЕ трогаем элементы, у которых уже задан собственный fontFamily
// (иконочные шрифты Ionicons/MaterialIcons, эмодзи и т.п. — у них fontFamily свой).

import { cloneElement, isValidElement } from 'react';
import { Text, type TextStyle } from 'react-native';
import { APP_FONT_FAMILY } from './typography';

const FONT_REGULAR = APP_FONT_FAMILY;          // 'Inter'
const FONT_SEMIBOLD = 'Inter-SemiBold';
const FONT_BOLD = 'Inter-Bold';
const FONT_BLACK = 'Inter-Black';

/** Сопоставляет fontWeight именованному начертанию Inter. */
export function interFamilyForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  switch (weight) {
    case '900':
      return FONT_BLACK;
    case '800':
    case '700':
    case 'bold':
      return FONT_BOLD;
    case '600':
    case '500':
      return FONT_SEMIBOLD;
    case '400':
    case '300':
    case '200':
    case '100':
    case 'normal':
    case undefined:
    default:
      return FONT_REGULAR;
  }
}

type FlatStyle = TextStyle & { fontFamily?: string };

/**
 * Обходит развёрнутый проп style (объект или вложенный массив) и достаёт
 * итоговый fontWeight + признак того, что fontFamily уже задан автором.
 * Если fontFamily задан — мы не вмешиваемся (иконки/эмодзи/спец-шрифты).
 */
function resolveStyle(style: unknown): { hasFamily: boolean; weight: TextStyle['fontWeight'] | undefined } {
  let hasFamily = false;
  let weight: TextStyle['fontWeight'] | undefined;

  const visit = (s: unknown): void => {
    if (!s) return;
    if (Array.isArray(s)) {
      for (const item of s) visit(item);
      return;
    }
    if (typeof s === 'object') {
      const obj = s as FlatStyle;
      if (typeof obj.fontFamily === 'string' && obj.fontFamily.length > 0) {
        hasFamily = true;
      }
      if (obj.fontWeight != null) {
        weight = obj.fontWeight;
      }
    }
  };

  visit(style);
  return { hasFamily, weight };
}

let patched = false;

/**
 * Патчит Text.render один раз. Безопасно вызывать повторно (HMR) — no-op после первого раза.
 */
export function installInterFontPatch(): void {
  if (patched) return;
  patched = true;

  const TextAny = Text as unknown as {
    render?: (...args: unknown[]) => unknown;
  };

  const originalRender = TextAny.render;
  if (typeof originalRender !== 'function') {
    // На некоторых версиях RN render может отсутствовать — тогда тихо выходим.
    return;
  }

  TextAny.render = function patchedRender(...args: unknown[]) {
    const element = originalRender.apply(this, args);

    if (!isValidElement(element)) {
      return element;
    }

    const style = (element.props as { style?: unknown }).style;
    const { hasFamily, weight } = resolveStyle(style);

    // Автор уже задал собственный fontFamily — не вмешиваемся.
    if (hasFamily) {
      return element;
    }

    const fontFamily = interFamilyForWeight(weight);

    // fontFamily кладём ПЕРВЫМ — пользовательский style может переопределить.
    const nextStyle = style ? [{ fontFamily }, style] : { fontFamily };

    return cloneElement(element, { style: nextStyle } as { style: unknown });
  };
}
