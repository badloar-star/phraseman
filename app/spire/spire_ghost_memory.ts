// ═══════════════════════════════════════════════════════════════════════════
// spire_ghost_memory.ts — какой призрак бежал на последней ступени (память процесса, ничего не пишется на диск).
//
// зачем (ТЗ spire-engagement-2026-10-25.md §3а): итоговое окно ступени (SpireStepResultMoment) сравнивает время человека со средним
// временем друга. Окно итога живёт отдельно от экрана ступени и друга не знает; чтобы не тянуть новый пропс через use_spire_game
// (400 строк — лимит), призрак запоминается здесь в момент старта ступени. Живёт до следующей ступени; не durable — только факт
// «кто бежал», а не отложенное празднование (закон 01.09).
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireGhost } from '../../modules/spire/ghost';

const LOG = '[SPIRE]';

type Remembered = Readonly<{ ghost: SpireGhost; weekKey: string; floor: number }>;
let last: Remembered | null = null;

/** Старт ступени: запомнить призрака (null — призрака нет, прежний забываем, чтобы итог не взял чужого). */
export function rememberSpireGhost(ghost: SpireGhost | null, ctx: Readonly<{ weekKey: string; floor: number }>): void {
  const hadOne = last !== null;
  last = ghost ? { ghost, weekKey: ctx.weekKey, floor: ctx.floor } : null;
  if (!ghost && !hadOne) return; // зачем: флаг выключен/призрака не было и нечего забывать — молчим, ступень 2.0.2 без лишних строк журнала
  console.log(LOG, '[SPIRE-GHOST]', ghost ? `запомнен для итога: друг #${ghost.ordinal} неделя=${ctx.weekKey} этаж=${ctx.floor}` : `забыт (призрака нет) неделя=${ctx.weekKey} этаж=${ctx.floor}`); // guard-ok: одна строка на старт ступени
}

/** Призрак последней ступени, если итог относится к той же неделе и этажу; иначе null. */
export function peekSpireGhostFor(weekKey: string, floor: number): SpireGhost | null {
  return last && last.weekKey === weekKey && last.floor === floor ? last.ghost : null;
}

export function __resetSpireGhostMemoryForTests(): void {
  last = null;
}

/* expo-router: утилита, не экран */
export default function __SpireGhostMemoryRouteShim() { return null; }
