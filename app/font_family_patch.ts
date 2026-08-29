// ─── ГЛОБАЛЬНЫЙ ПЕРЕХВАТ ШРИФТА ──────────────────────────────────────────────
// Проблема: весь интерфейс задаёт числовой fontWeight, поэтому Android должен
// получать одно нативное семейство Inter, внутри которого зарегистрированы
// реальные начертания 400/600/700/900.
//
// Этот fallback один раз патчит Text.render там, где такой API существует, и
// добавляет только fontFamily. Исходный fontWeight остаётся в style, а Android
// выбирает нужное начертание из единого семейства. Идемпотентно при HMR.
//
// Важно: НЕ трогаем элементы, у которых уже задан собственный fontFamily
// (иконочные шрифты Ionicons/MaterialIcons, эмодзи и т.п. — у них fontFamily свой).

import { cloneElement, isValidElement } from 'react';
import { Platform, Text, type TextStyle } from 'react-native';
import { shouldInstallNativeTextRenderPatch } from './native_runtime_capability';
import { APP_FONT_FAMILY } from './typography';

/** Все веса выбираются внутри единого нативного семейства Inter. */
export function interFamilyForWeight(_weight: TextStyle['fontWeight'] | undefined): string {
  return APP_FONT_FAMILY;
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
  if (!shouldInstallNativeTextRenderPatch(Platform.OS)) return;
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
