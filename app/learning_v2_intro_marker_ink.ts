import { flattenOver, legibleOn } from '../constants/liquidGlassSurfaceRoles';

/**
 * Маркер «внимание» во вводе занятия Learning V2: тон кнопки темы (как в макете), но не тусклее 4,5 к фону и карточке.
 * зачем (контраст-гейт OTA 25.10, Темы): g.cta — цвет заливки; в светлых градиентных темах он бледный и как текст давал до 1,00
 * (38 из 174). Где cta уже читается (тёмные темы, макет), цвет не меняется. Отдельный модуль — чтобы сторож не тянул экран.
 */
export function introMarkerWarningInk(g: { cta: string; text: string; bg: string; opaqueCard: string }): string {
  return legibleOn(g.cta, g.text, [g.bg, flattenOver(g.opaqueCard, g.bg)], 4.55);
}
