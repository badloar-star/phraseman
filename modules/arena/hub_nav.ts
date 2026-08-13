/**
 * Навигация внутри Арены.
 *
 * Владелец (D-30): у Арены свой таббар с крупной кнопкой «Начать матч» в
 * центре; по нажатию выпадает выбор режима, как в «Карточках 2.1». По бокам —
 * важные вкладки.
 *
 * Здесь только чистые решения: какая вкладка активна, куда она ведёт, какие
 * режимы показывать и какие из них можно нажать. Экран этого не считает — в
 * JSX такую логику не проверить, а ошибка в ней означает либо мёртвую кнопку,
 * либо кнопку, ведущую в отключённый раздел.
 */

export type ArenaHubTab = 'today' | 'rank' | 'tops' | 'history';
export type ArenaHubMode = 'quick' | 'ranked' | 'friend';

export const ARENA_HUB_TABS: readonly ArenaHubTab[] = ['today', 'rank', 'tops', 'history'];

/** Куда ведёт вкладка. Одно место, где это записано. */
export const ARENA_HUB_ROUTES: Readonly<Record<ArenaHubTab, string>> = Object.freeze({
  today: '/arena',
  rank: '/arena_ranks',
  tops: '/arena_tops',
  history: '/arena_history',
});

/**
 * Какая вкладка соответствует открытому экрану.
 *
 * Разбирается по пути, а не хранится состоянием: состояние разъезжается при
 * переходе «назад», и таббар начинает подсвечивать не тот раздел, в котором
 * игрок находится.
 */
export function arenaHubTabForRoute(pathname: string | null | undefined): ArenaHubTab {
  const path = String(pathname ?? '').split('?')[0].replace(/\/+$/, '');
  // Сначала точные совпадения, потом префиксы: `/arena_ranks` не должен
  // считаться вкладкой «Сегодня» только потому, что начинается с `/arena`.
  for (const tab of ARENA_HUB_TABS) {
    if (path === ARENA_HUB_ROUTES[tab]) return tab;
  }
  for (const tab of ARENA_HUB_TABS) {
    if (tab !== 'today' && path.startsWith(`${ARENA_HUB_ROUTES[tab]}/`)) return tab;
  }
  return 'today';
}

/* ------------------------------ режимы ----------------------------------- */

export type ArenaModeAvailability = Readonly<{
  enabled: boolean;
  quickEnabled: boolean;
  rankedEnabled: boolean;
  friendEnabled: boolean;
}>;

export type ArenaModeChoice = Readonly<{
  key: ArenaHubMode;
  /** Нажимаема ли строка. Отключённая показывается, но не ведёт никуда. */
  enabled: boolean;
  /** Куда идти, если нажали. */
  route: string;
  params?: Readonly<Record<string, string>>;
}>;

/**
 * Список режимов для выпадающего выбора.
 *
 * Отключённые режимы НЕ прячутся, а гасятся. Спрятанный режим выглядит как
 * отсутствующая возможность, и игрок про него не узнаёт вовсе; погашенный
 * честно говорит «сейчас нельзя».
 */
export function arenaModeChoices(availability: ArenaModeAvailability | null | undefined): readonly ArenaModeChoice[] {
  const base = availability?.enabled === true;
  return [
    {
      key: 'quick',
      enabled: base && availability?.quickEnabled === true,
      route: '/arena_matchmaking',
      params: { mode: 'quick' },
    },
    {
      key: 'ranked',
      enabled: base && availability?.rankedEnabled === true,
      route: '/arena_matchmaking',
      params: { mode: 'ranked' },
    },
    {
      key: 'friend',
      enabled: base && availability?.friendEnabled === true,
      route: '/arena_friend_duel',
    },
  ];
}

/**
 * Что делает центральная кнопка.
 *
 * Если матч уже идёт или игрок стоит в очереди, кнопка ведёт ТУДА, а не
 * открывает выбор режима: предложить начать второй матч, когда первый не
 * доигран, — верный способ его потерять.
 */
export type ArenaMatchButtonAction =
  | Readonly<{ kind: 'resume_match'; matchId: string }>
  | Readonly<{ kind: 'resume_queue'; mode: string; requestId: string; stableUid: string }>
  | Readonly<{ kind: 'choose_mode' }>
  | Readonly<{ kind: 'blocked' }>;

export function arenaMatchButtonAction(input: Readonly<{
  enabled: boolean;
  activeMatchId?: string | null;
  activeQueue?: Readonly<{ status?: string; mode?: string; requestId?: string; stableUid?: string }> | null;
}>): ArenaMatchButtonAction {
  if (input.activeMatchId) return { kind: 'resume_match', matchId: input.activeMatchId };
  const queue = input.activeQueue;
  if (queue?.status === 'waiting' && queue.mode && queue.requestId && queue.stableUid) {
    return {
      kind: 'resume_queue',
      mode: queue.mode,
      requestId: queue.requestId,
      stableUid: queue.stableUid,
    };
  }
  // Отключённая Арена важнее очереди только тогда, когда играть нечего:
  // недоигранный матч закрыть надо в любом случае.
  if (!input.enabled) return { kind: 'blocked' };
  return { kind: 'choose_mode' };
}

/* ------------------------- место под таббар ------------------------------- */

/**
 * Высота собственного таббара Арены. Должна совпадать с `BAR_HEIGHT` в
 * `components/arena/ArenaTabBar.tsx`; тест сверяет их по исходнику.
 */
export const ARENA_TAB_BAR_HEIGHT = 62;

/**
 * Сколько места обязан оставить снизу экран, живущий под таббаром.
 *
 * Таббар лежит ПОВЕРХ содержимого (`position: absolute`), поэтому экран сам о
 * нём не знает: без этого отступа последние строки любого длинного списка —
 * а на экране рангов это двадцать четыре тира и таблица друзей — оказываются
 * закрыты полосой и до них нельзя ни дочитать, ни дотянуться.
 *
 * Системный отступ снизу прибавляется, а не заменяет: на телефонах с полосой
 * жеста таббар и сам сдвинут вверх на её высоту.
 */
export function arenaHubBodyPaddingBottom(safeAreaBottom: number): number {
  const inset = Number.isFinite(safeAreaBottom) ? Math.max(0, safeAreaBottom) : 0;
  return ARENA_TAB_BAR_HEIGHT + Math.max(10, inset);
}
