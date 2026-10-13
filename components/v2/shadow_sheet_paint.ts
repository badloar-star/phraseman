// зачем (координатор 13.10, Макеты 7c831a193: mistakes-panel-021 «шторка с градиентом Авроры», cards-v2-027 «шторка светлее образца»):
// в стиле «Тень» (решение владельца 12.10, docs/design/v2-app/SHADOW_STYLE_SPEC.md) нижняя шторка в тёмном оформлении — НЕЙТРАЛЬНЫЙ
// градиент сверху вниз при любой теме (`.ph .sheet` в shadow-skin.css: rgba(40,40,46,.98) → rgba(30,30,36,.98)); тон темы живёт в
// кнопках и значках, а не в подложке шторки. Цвета заранее смешаны с затемнённым фоном до непрозрачных (правило «стекло 2.0 непрозрачное»).
// Светлое оформление — null: образец светлой шторки в стиле «Тень» не определён, там остаётся прежняя заливка шторки по токенам темы.

export const SHADOW_SHEET_DARK_TOP = '#28282E';
export const SHADOW_SHEET_DARK_BOTTOM = '#1E1E24';

export function shadowSheetGradient(isLight: boolean): readonly [string, string] | null {
  return isLight ? null : [SHADOW_SHEET_DARK_TOP, SHADOW_SHEET_DARK_BOTTOM];
}
