// ═══════════════════════════════════════════════════════════════════════════
// community_scene_shared.ts — общее для всех плиток «Сообщества»: месяц конкурса и место набора, посчитанные ОДИН раз, а не в каждой плитке.
//
// зачем (координатор 29.10, оптимизация плиток; отчёт Дизайна): раньше каждая плитка держала свой setInterval на 60 с и свой слушатель AppState
// (100 плиток = 100 таймеров) и на каждое сердечко заново фильтровала и сортировала все записи конкурса (100 плиток × O(N log N)).
// Теперь: один таймер и один слушатель на весь список (живут, пока на экране есть хоть одна плитка), а место набора берётся из таблицы,
// которая пересчитывается один раз на версию живого хранилища. Поведение то же; сеть и Firestore не трогаются.
// ═══════════════════════════════════════════════════════════════════════════
import { AppState } from 'react-native';

import { contestMonth, rankContestEntries, type ContestMonth } from '../../shared/community_month_contest';
import { packSocialLive } from '../../app/community_packs/packSocialLive';

const MONTH_REFRESH_MS = 60000;

let month: ContestMonth = contestMonth(Date.now());
const monthListeners = new Set<() => void>();
let monthTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/** Пересчитать месяц; true — месяц сменился. Слушателей будит только при смене (плитки перерисуются ровно на границе месяца). */
function refreshMonth(notify: boolean): boolean {
  const next = contestMonth(Date.now());
  if (next.id === month.id) return false;
  month = next;
  if (notify) monthListeners.forEach((listener) => listener());
  return true;
}

function startMonthClock(): void {
  // Обновляем сразу: между последней отпиской и этой подпиской месяц мог смениться.
  refreshMonth(false);
  monthTimer = setInterval(() => { refreshMonth(true); }, MONTH_REFRESH_MS);
  appStateSubscription = AppState.addEventListener('change', (state) => { if (state === 'active') refreshMonth(true); });
}

function stopMonthClock(): void {
  if (monthTimer !== null) clearInterval(monthTimer);
  monthTimer = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
}

export const communityContestMonthStore = {
  subscribe(listener: () => void): () => void {
    monthListeners.add(listener);
    if (monthListeners.size === 1) startMonthClock();
    return () => {
      monthListeners.delete(listener);
      if (monthListeners.size === 0) stopMonthClock();
    };
  },
  /** Текущий месяц; без подписчиков пересчитывается молча, чтобы первая плитка после паузы не увидела вчерашний месяц. */
  get(): ContestMonth {
    if (monthListeners.size === 0) refreshMonth(false);
    return month;
  },
};

let placeKey = '';
let placeById = new Map<string, number>();

/**
 * Место набора в конкурсе месяца (0 — вне рейтинга). Таблица строится один раз на пару «месяц + версия живого хранилища»:
 * сто плиток на одно сердечко = одна сортировка вместо ста.
 */
export function monthlyContestPlace(packId: string, forMonth: ContestMonth): number {
  const key = `${forMonth.id}:${packSocialLive.getVersion()}`;
  if (key !== placeKey) {
    placeKey = key;
    placeById = new Map(rankContestEntries(packSocialLive.contestEntries(forMonth.id), forMonth).map((entry, index) => [entry.id, index + 1] as const));
  }
  return placeById.get(packId) ?? 0; // guard-ok: Map.get по таблице мест в памяти, не Firestore
}

/** Только для тестов: сбросить кэш мест и часы месяца. */
export function __resetCommunitySceneSharedForTests(): void {
  placeKey = '';
  placeById = new Map();
  monthListeners.clear();
  stopMonthClock();
  month = contestMonth(Date.now());
}
