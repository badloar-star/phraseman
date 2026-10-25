// ═══════════════════════════════════════════════════════════════════════════
// spire_ghost_flag.ts — выключатель «призрака друга» на ступени Пика (ТЗ spire-engagement-2026-10-25.md §3а).
//
// зачем (координатор 25.10; решение владельца: среднее время друга из уже загруженной комнаты): функция новая и меняет экран ступени,
// поэтому она за флагом и по умолчанию ВЫКЛЮЧЕНА — выключено = ступень 2.0.2 без единой разницы. Включить в релизе — заменить false
// на true ОДНОЙ строкой по слову координатора; для кадров Сверки в dev-сборке есть переключатель `dev_state?spireGhost=on|off`.
// Отдельный крошечный модуль: его читают экран ступени и итог, остальной Пик сюда не тянется.
// ═══════════════════════════════════════════════════════════════════════════
export const SPIRE_GHOST_ENABLED: boolean = false;

// зачем: dev-сборка проверяется в момент вызова, а не при загрузке модуля — так подмену можно проверить тестом
const isDev = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__ === true;
let devOverride: boolean | null = null;

/** dev_state?spireGhost=on|off — только dev-сборка; в сторе всегда отказ (флаг решает константа выше). */
export function setDevSpireGhostOverride(value: boolean | null): boolean {
  if (!isDev()) {
    console.warn('[DEV-STATE] spireGhost: отклонено — не dev-сборка', { value }); // guard-ok: ранний выход логируется
    return false;
  }
  devOverride = value;
  console.log(value === null ? '[DEV-STATE] spireGhost override=off' : `[DEV-STATE] spireGhost override=${value ? 'on' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Показывать ли призрака: константа, а в dev-сборке — ещё и подмена для Сверки. */
export function spireGhostEnabled(): boolean {
  return isDev() && devOverride !== null ? devOverride : SPIRE_GHOST_ENABLED;
}
