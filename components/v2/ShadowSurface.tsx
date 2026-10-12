import React, { memo } from 'react';
import { StyleSheet, type BoxShadowValue } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import {
  actionShadowStyle,
  nestedShadowStyle,
  plateGradient,
  plateShadowStyle,
  raisedGradient,
  raisedShadowStyle,
  RAISED_LIFT,
} from '../../constants/liquidGlassShadowStyle';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';

/**
 * Стиль «Тень» — контейнеры БЕЗ обводок (решение владельца 12.10, «второй вариант делаем»; docs/design/v2-app/SHADOW_STYLE_SPEC.md,
 * эталоны shadow-style-etalon*.html). Плашку отделяют тень и градиент 180° сверху вниз; выбранное/главное приподнято.
 *
 * зачем один модуль: числа спеки лежат в constants/liquidGlassShadowStyle.ts (Темы, из токенов темы), а kit-слои (CardsKit, KitGlassLayer,
 * панели «Мои ошибки», строки наборов, диалоги…) рисовали каждый свою кромку (`inset … spreadDistance:1`, bevelHi/bevelLo, glassEdge).
 * Теперь они все берут заливку и тень отсюда — менять вид плашки значит менять одно место.
 */

/** Тень на сам контейнер (`boxShadow`): плашка. */
export const plateBoxShadow = (g: GlassTokens): BoxShadowValue[] => plateShadowStyle(g) as BoxShadowValue[];
/** Тень вложенного (плитка-иконка, кнопка внутри плашки). */
export const nestedBoxShadow = (g: GlassTokens): BoxShadowValue[] => nestedShadowStyle(g) as BoxShadowValue[];
/** Тень выбранного/главного; сам элемент сдвигается на RAISED_LIFT (только transform — высота ряда не меняется). */
export const raisedBoxShadow = (g: GlassTokens): BoxShadowValue[] => raisedShadowStyle(g) as BoxShadowValue[];
/** Цветная тень кнопки действия. */
export const actionBoxShadow = (g: Pick<GlassTokens, 'accent'>): BoxShadowValue[] => actionShadowStyle(g) as BoxShadowValue[];
export { RAISED_LIFT };

const sheetPlateCache = new WeakMap<object, unknown>();
/** Токены для плитки НА ШТОРКЕ: градиент плашки считается от заливки шторки (sheetPlateFillFrom/To), остальное без изменений. Кэш по объекту токенов. */
export function sheetPlateTokens<T extends GlassTokens>(g: T): T {
  const hit = sheetPlateCache.get(g);
  if (hit) return hit as T;
  const next = { ...g, plateFillFrom: g.sheetPlateFillFrom, plateFillTo: g.sheetPlateFillTo };
  sheetPlateCache.set(g, next);
  return next;
}

/**
 * Заливка плашки: градиент 180° из токенов темы (полностью непрозрачный — под ним базовая заливка контейнера не нужна).
 * Первым ребёнком контейнера с тем же скруглением. Статично, без размытия.
 */
export const PlateFill = memo(function PlateFill({ g, radius, raised = false }: Readonly<{ g: GlassTokens; radius: number; raised?: boolean }>) {
  const grad = raised ? raisedGradient(g) : plateGradient(g);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={grad.colors}
      start={grad.start}
      end={grad.end}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
});

/** Токены активной темы для мест, которые знают только палитру V2 (useV2Palette): тени и заливки плашки берутся отсюда. */
export function useShadowGlass(): GlassTokens {
  const { liquidGlassThemeId } = useTheme();
  return liquidGlassTokens(liquidGlassThemeId);
}
