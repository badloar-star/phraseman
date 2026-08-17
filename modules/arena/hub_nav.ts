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

/**
 * зачем три, а не четыре плюс центральная (владелец, 2026-08-16): навигаций
 * было ДВЕ — таббар снизу (Сегодня · Ранги · [Матч] · Топы · История) и вкладки
 * внутри экрана (Обзор · Играть · Рост · Вместе). Они пересекались: «Играть»
 * внутри дублировал центральную кнопку, «Рост» — «Ранги». Девять точек входа
 * туда, где смыслов три.
 *
 * Осталось три глагола без пересечений, и КАЖДЫЙ раскрывает свой список —
 * одно правило на все три, угадывать нечего.
 */
export type ArenaHubTab = 'play' | 'rating' | 'history';
export type ArenaHubMode = 'quick' | 'ranked' | 'friend';

export const ARENA_HUB_TABS: readonly ArenaHubTab[] = ['play', 'rating', 'history'];

/**
 * «Дом» каждой кнопки: сюда ведёт сама кнопка, если список не открывать, и по
 * нему таббар понимает, какая вкладка активна.
 */
export const ARENA_HUB_ROUTES: Readonly<Record<ArenaHubTab, string>> = Object.freeze({
  play: '/arena',
  rating: '/arena_ranks',
  history: '/arena_history',
});

/** Пункт списка под кнопкой таббара. */
export type ArenaHubTabChoice = Readonly<{
  key: string;
  icon: string;
  /** Ключ текста в arenaText — подписи-расшифровки запрещены, только название. */
  label: string;
  route: string;
}>;

/**
 * Что раскрывается под кнопкой.
 *
 * У «Играть» список пустой намеренно: режимы отдаёт `arenaModeChoices`, потому
 * что их доступность зависит от ответа сервера, а эти маршруты доступны всегда.
 */
export const ARENA_HUB_TAB_CHOICES: Readonly<Record<ArenaHubTab, readonly ArenaHubTabChoice[]>> =
  Object.freeze({
    play: Object.freeze([] as readonly ArenaHubTabChoice[]),
    rating: Object.freeze([
      { key: 'ranks', icon: 'podium', label: 'ranks', route: '/arena_ranks' },
      { key: 'tops', icon: 'trophy', label: 'topsTab', route: '/arena_tops' },
      { key: 'season', icon: 'star', label: 'season', route: '/arena_season_pass' },
    ] as readonly ArenaHubTabChoice[]),
    history: Object.freeze([
      { key: 'matches', icon: 'time', label: 'historyTab', route: '/arena_history' },
      { key: 'review', icon: 'search', label: 'reviewTitle', route: '/arena_review' },
    ] as readonly ArenaHubTabChoice[]),
  });

/**
 * Какие экраны принадлежат кнопке.
 *
 * зачем: экран из списка обязан подсвечивать СВОЮ кнопку. Иначе игрок уходит в
 * «Топы», а подсвечено «Играть» — таббар врёт о том, где человек находится.
 */
export const ARENA_HUB_TAB_MEMBERS: Readonly<Record<ArenaHubTab, readonly string[]>> = Object.freeze({
  play: Object.freeze(['/arena_matchmaking', '/arena_match', '/arena_results',
    '/arena_friend_duel', '/arena_invite', '/arena_today']),
  rating: Object.freeze(['/arena_ranks', '/arena_tops', '/arena_season_pass']),
  history: Object.freeze(['/arena_history', '/arena_review']),
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
  // Сначала точные совпадения: `/arena_ranks` не должен считаться вкладкой
  // «Играть» только потому, что начинается с `/arena`.
  for (const tab of ARENA_HUB_TABS) {
    if (path === ARENA_HUB_ROUTES[tab]) return tab;
  }
  // Затем экраны из списков — они подсвечивают кнопку, которой принадлежат.
  for (const tab of ARENA_HUB_TABS) {
    for (const route of ARENA_HUB_TAB_MEMBERS[tab]) {
      if (path === route || path.startsWith(`${route}/`)) return tab;
    }
  }
  return 'play';
}

/* ------------------------------ режимы ----------------------------------- */

export type ArenaModeAvailability = Readonly<{
  enabled: boolean;
  quickEnabled: boolean;
  rankedEnabled: boolean;
  friendEnabled: boolean;
}>;

/**
 * Почему режим недоступен. Погашенная строка без причины — это кнопка без
 * реакции: игрок жмёт, ничего не происходит, и он решает, что приложение
 * сломалось. Причин ровно две, и они требуют разных слов.
 */
export type ArenaModeBlockReason = 'ok' | 'arena_off' | 'mode_off';

export type ArenaModeChoice = Readonly<{
  key: ArenaHubMode;
  /** Нажимаема ли строка. Отключённая показывается, но не ведёт никуда. */
  enabled: boolean;
  /** Что сказать про погашенную строку. */
  reason: ArenaModeBlockReason;
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
  const reason = (modeOn: boolean): ArenaModeBlockReason => {
    // Вся Арена выключена — это другое сообщение, чем «этот режим выключен»:
    // в первом случае ждать нечего вовсе, во втором работают остальные.
    if (!base) return 'arena_off';
    return modeOn ? 'ok' : 'mode_off';
  };
  const quickOn = availability?.quickEnabled === true;
  const rankedOn = availability?.rankedEnabled === true;
  const friendOn = availability?.friendEnabled === true;
  return [
    {
      key: 'quick',
      enabled: base && quickOn,
      reason: reason(quickOn),
      route: '/arena_matchmaking',
      params: { mode: 'quick' },
    },
    {
      key: 'ranked',
      enabled: base && rankedOn,
      reason: reason(rankedOn),
      route: '/arena_matchmaking',
      params: { mode: 'ranked' },
    },
    {
      key: 'friend',
      enabled: base && friendOn,
      reason: reason(friendOn),
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
