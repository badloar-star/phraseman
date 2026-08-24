/** Чистые решения для постоянного хаба Арены и его overflow-меню. */
export type ArenaHubMode = 'quick' | 'ranked' | 'friend';
export type ArenaOverflowKey = 'ranks' | 'tops' | 'season' | 'history' | 'review' | 'wallet';
export type ArenaOverflowRoute = string | Readonly<{
  pathname: '/arena_review';
  params: Readonly<{ matchId: string }>;
}>;
export type ArenaOverflowChoice = Readonly<{
  key: ArenaOverflowKey;
  icon: string;
  label: string;
  route: ArenaOverflowRoute | null;
  disabled: boolean;
}>;

/**
 * Магазин рун закрыт до релиза.
 *
 * зачем: владелец не хочет выпускать витрину, в которой пока нечего купить —
 * каталог наполнится нескоро. Экран и покупки живы целиком, скрыт только вход:
 * достаточно вернуть `true`, когда товары появятся.
 *
 * зачем (владелец, 23.08): место магазина в меню занял «Сезон» — вместо пустой
 * витрины игрок попадает туда, где руны реально работают. Пункт магазина
 * появится обратно вместе с товарами.
 *
 * зачем (владелец, 23.08, №2): пункт «Спин» убран целиком — Арена больше не
 * держит свой отдельный кредит спина. Единственный спин в приложении живёт в
 * разделе «Подарки» и выдаётся автоматически (экран результата матча для
 * ranked-победы, `local_level_spins.ts`); отдельного «забрать спин» здесь
 * больше не нужно.
 */
export const ARENA_STAR_STORE_ENABLED = false;

/** Secondary Arena destinations live behind the hub's top-right overflow. */
export function arenaHubOverflowChoices(
  latestMatchId: string | null,
): readonly ArenaOverflowChoice[] {
  const choices: ArenaOverflowChoice[] = [
    { key: 'ranks', icon: 'podium-outline', label: 'ranks', route: '/arena_ranks', disabled: false },
    { key: 'tops', icon: 'trophy-outline', label: 'topsTab', route: '/arena_tops', disabled: false },
    // зачем: иконка «звезды» здесь путала — звезда в Арене означает ранг, а не
    // валюту. Сезон — это дорожка наград, отсюда лента.
    { key: 'season', icon: 'ribbon-outline', label: 'season', route: '/season_pass', disabled: false },
    { key: 'history', icon: 'time-outline', label: 'historyTab', route: '/arena_history', disabled: false },
    {
      key: 'review',
      icon: 'search-outline',
      label: 'reviewTitle',
      route: latestMatchId ? { pathname: '/arena_review', params: { matchId: latestMatchId } } : null,
      disabled: !latestMatchId,
    },
  ];
  if (ARENA_STAR_STORE_ENABLED) {
    choices.push({ key: 'wallet', icon: 'sparkles-outline', label: 'wallet', route: '/arena_star_wallet', disabled: false });
  }
  return choices;
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
