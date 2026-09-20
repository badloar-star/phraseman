/**
 * Единственный экземпляр фонового поиска соперника на всё приложение.
 *
 * зачем (владелец 2026-09-20): поиск обязан переживать уход с экрана Арены, а
 * находка — приходить тостом поверх любого раздела. Синглтон живёт в модуле, а
 * не в React-дереве: ровно поэтому он и не умирает вместе с экраном.
 *
 * Здесь же — весь «перевод» между чистым ядром (`modules/arena/background_search`)
 * и настоящими вызовами Арены. Ядро о Firebase ничего не знает и потому
 * проверяется сторожем без единого мока сети.
 */
import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  ArenaBackgroundSearch,
  type ArenaBackgroundSearchMatched,
  type ArenaBackgroundSearchState,
} from '../modules/arena/background_search';
import type { ArenaQueueMode } from '../modules/arena/contract';
import type { ArenaStudyTarget } from '../modules/arena/target_registry';
import {
  arenaV2FindMatch,
  arenaV2MatchDecline,
  arenaV2QuickBotFallback,
  arenaV2QueueCancel,
  arenaV2ReleaseStaleMatch,
  arenaV2RankedBotFallback,
  arenaV2SyncMatch,
  createArenaRequestId,
} from './arena_client';
import { DebugLogger } from './debug-logger';

/**
 * Дочитать найденный матч: кто соперник и до какой секунды ждёт сервер.
 *
 * зачем: `arenaV2FindMatch` и фолбэки бота отдают ТОЛЬКО `matchId` — ни срока
 * решения, ни имени соперника в их ответе нет (проверено по
 * `functions/src/arena_v2.ts`). Без этого шага тост показывал бы «Соперник
 * найден» без лица и вёл отсчёт по выдуманному сроку, а именно серверный срок
 * и решает, примут ли ответ человека.
 *
 * Отказ здесь не фатален: матч уже существует, поэтому возвращаем то, что
 * знаем, и даём ядру использовать запасное окно. Молча не глотаем — причину
 * пишем всегда.
 */
async function describeMatch(
  matchId: string,
  studyTarget: ArenaStudyTarget,
  viewerSeatHint?: 'a' | 'b',
): Promise<ArenaBackgroundSearchMatched> {
  try {
    const response = await arenaV2SyncMatch(matchId, studyTarget);
    const match = response.match;
    const viewerSeat = response.viewerSeat ?? viewerSeatHint;
    const opponent = match?.players?.find((player) => player.uid !== viewerSeat);
    const deadline = Number(match?.stateDeadlineAtMs);
    DebugLogger.info('arena_background_search',
      `[ARENA-BGSEARCH] match described matchId=${matchId} state=${match?.state ?? 'unknown'} `
      + `viewerSeat=${viewerSeat ?? 'unknown'} opponent=${opponent?.name ?? 'unknown'} `
      + `deadline=${Number.isFinite(deadline) ? deadline : 'missing'}`);
    return {
      matchId,
      acceptDeadlineAtMs: Number.isFinite(deadline) && deadline > 0 ? deadline : undefined,
      opponentName: opponent?.name,
      opponentAvatar: opponent?.avatar,
      opponentStars: typeof opponent?.rank === 'number' ? opponent.rank : undefined,
    };
  } catch (error) {
    DebugLogger.warn('arena_background_search',
      `[ARENA-BGSEARCH] describe failed matchId=${matchId}: ${String(error)}`);
    return { matchId };
  }
}

export const arenaBackgroundSearch = new ArenaBackgroundSearch({
  findMatch: async (mode, studyTarget, requestId) => {
    const result = await arenaV2FindMatch(studyTarget, mode, requestId);
    if (result.status === 'matched' && result.matchId) {
      return {
        queue: result.queue,
        match: await describeMatch(result.matchId, studyTarget, result.viewerSeat),
      };
    }
    return { queue: result.queue, match: null };
  },
  requestBot: async (mode, studyTarget, requestId) => {
    const request = mode === 'quick' ? arenaV2QuickBotFallback : arenaV2RankedBotFallback;
    const result = await request(studyTarget, requestId);
    return describeMatch(result.matchId, studyTarget, result.viewerSeat);
  },
  cancelQueue: async (studyTarget, requestId) => {
    await arenaV2QueueCancel(studyTarget, requestId);
  },
  // Без requestId сервер закрывает ТЕКУЩУЮ очередь профиля — именно то, что
  // нужно, когда id висящей очереди неизвестен.
  cancelStaleQueue: async (studyTarget) => {
    await arenaV2QueueCancel(studyTarget);
  },
  declineMatch: async (matchId, studyTarget) => {
    await arenaV2MatchDecline(matchId, studyTarget);
  },
  releaseStaleMatch: async (studyTarget) => {
    const result = await arenaV2ReleaseStaleMatch(studyTarget);
    return result.released === true;
  },
  createRequestId: () => createArenaRequestId('queue'),
  nowMs: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => { if (handle !== null) clearTimeout(handle as ReturnType<typeof setTimeout>); },
  log: (message) => DebugLogger.info('arena_background_search', message),
});

/**
 * Пауза/возобновление по состоянию приложения.
 *
 * зачем (владелец 2026-09-20, выбор «поиск ставится на паузу»): в фоне таймеры
 * телефона всё равно недостоверны, а батарею жгут. Подписка одна на процесс —
 * вешать её на экран нельзя, ведь весь смысл фичи в том, что экрана может не
 * быть.
 */
let appStateSubscription: { remove: () => void } | null = null;

export function startArenaBackgroundSearchLifecycle(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') arenaBackgroundSearch.resume();
    else arenaBackgroundSearch.pause();
  });
}

/**
 * Подписка на фоновый поиск для любого экрана или хоста.
 *
 * `useSyncExternalStore` взят намеренно: состояние живёт ВНЕ React, и это
 * штатный способ читать такой источник без лишних ре-рендеров и без риска
 * разъехаться с ним во время конкурентного рендера.
 */
export function useArenaBackgroundSearchState(): ArenaBackgroundSearchState {
  return useSyncExternalStore(
    (listener) => arenaBackgroundSearch.subscribe(listener),
    () => arenaBackgroundSearch.getState(),
    () => arenaBackgroundSearch.getState(),
  );
}

/* expo-router: не регистрировать файл как экран */
export default function __ArenaBackgroundSearchRouteShim() {
  return null;
}

export type { ArenaBackgroundSearchState, ArenaQueueMode };
