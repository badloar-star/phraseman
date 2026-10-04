/*
 * PM-220: release-метка навигации — одна строка `[NAV-PAINT]` на каждую смену маршрута.
 *
 * зачем (реестр PM-220, 04.10): у сценариев «навигация» и «тренировка» не было способа измерения —
 * регрессию перехода на экран нельзя было поймать воротами. Строка пишется после второго кадра нового
 * маршрута; scripts/pm220_perf_gates.mjs navpaint считает медиану/p90 по группам.
 *
 * Дёшево по построению: без setState и ре-рендера — два requestAnimationFrame и один console.warn на переход.
 * Именно console.warn: production-сборка вырезает console.log/info/debug (как у [HOME-PAINT]).
 * Первый маршрут запуска не пишется — его меряет [HOME-PAINT].
 */

export type NavPaintGroup = 'tab' | 'screen' | 'training';

// Тот же образец «занятых» маршрутов, что PHONE_STATE_BUSY_ROUTE_RE в _layout.tsx: уроки, сессии, тренировки.
const TRAINING_ROUTE_RE = /(lesson|session|exam|diagnostic|swipe|blitz|recall|speaking|spire|dialogue|quiz|practice|train)/i;
const TAB_ROUTE_RE = /^\/(\(tabs\)\/)?(home|lessons|cards|flashcards|friends|settings|profile|index)?$/i;

export function navPaintGroup(route: string): NavPaintGroup {
  if (TRAINING_ROUTE_RE.test(route)) return 'training';
  if (TAB_ROUTE_RE.test(route)) return 'tab';
  return 'screen';
}

export function normalizeNavRoute(pathname: string): string {
  // Только путь: без параметров и якоря, ограничен по длине — в лог не попадают идентификаторы из query.
  return String(pathname || '/').split(/[?#]/)[0]!.slice(0, 80) || '/';
}

let lastRoute: string | null = null;

/** Вызывать в рендере корня при каждом pathname; повторный вызов с тем же путём ничего не делает. */
export function noteNavRoute(pathname: string, now: () => number = Date.now): void {
  const route = normalizeNavRoute(pathname);
  if (route === lastRoute) return;
  const isFirst = lastRoute === null;
  lastRoute = route;
  if (isFirst) return;
  const startedAt = now();
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 0);
  schedule(() => schedule(() => {
    console.warn(`[NAV-PAINT] group=${navPaintGroup(route)} route=${route} ms=${now() - startedAt}`);
  }));
}

/** Только для тестов: сбросить запомненный маршрут. */
export function __resetNavPaintForTests(): void {
  lastRoute = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
