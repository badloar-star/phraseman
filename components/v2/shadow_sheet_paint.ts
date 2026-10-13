// зачем (координатор 13.10, Макеты 7c831a193: mistakes-panel-021 «шторка с градиентом Авроры», cards-v2-027 «шторка светлее образца»):
// в стиле «Тень» (решение владельца 12.10, docs/design/v2-app/SHADOW_STYLE_SPEC.md) нижняя шторка в тёмном оформлении — НЕЙТРАЛЬНЫЙ
// градиент сверху вниз при любой теме (`.ph .sheet` в shadow-skin.css: rgba(40,40,46,.98) → rgba(30,30,36,.98)); тон темы живёт в
// кнопках и значках, а не в подложке шторки. Цвета заранее смешаны с затемнённым фоном до непрозрачных (правило «стекло 2.0 непрозрачное»).
// Светлое оформление — null: образец светлой шторки в стиле «Тень» не определён, там остаётся прежняя заливка шторки по токенам темы.

import { mixSurfaceHex } from '../../constants/liquidGlassSurfaceRoles';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { sheetPlateTokens } from './ShadowSurface';

export const SHADOW_SHEET_DARK_TOP = '#28282E';
export const SHADOW_SHEET_DARK_BOTTOM = '#1E1E24';

export function shadowSheetGradient(isLight: boolean): readonly [string, string] | null {
  return isLight ? null : [SHADOW_SHEET_DARK_TOP, SHADOW_SHEET_DARK_BOTTOM];
}

// зачем (разбор diff Темами 13.10, Г1; mistakes-panel-021): плашки и плитки ВНУТРИ нижней шторки «Тень» в тёмном — нейтральные при любой теме (образец (60,60,68)→(48,48,56)),
// а не от opaqueSheet, окрашенного темой (у «Авроры» было (60,72,73)→(52,65,66)). Глобальные токены sheetPlateFillFrom/To не трогаем: их делят центральные диалоги на
// тонированном opaqueSheet (сторож theme_sheet_plate_lighter). Светлое оформление — прежние sheetPlateTokens.
const neutralPlateCache = new WeakMap<GlassTokens, GlassTokens>();
export function shadowSheetPlateTokens<T extends GlassTokens>(g: T): T {
  if (g.isLight) return sheetPlateTokens(g);
  const hit = neutralPlateCache.get(g);
  if (hit) return hit as T;
  const next = {
    ...g,
    plateFillFrom: mixSurfaceHex(SHADOW_SHEET_DARK_TOP, '#FFFFFF', 0.095),
    plateFillTo: mixSurfaceHex(SHADOW_SHEET_DARK_BOTTOM, '#FFFFFF', 0.075),
  };
  neutralPlateCache.set(g, next);
  return next;
}
