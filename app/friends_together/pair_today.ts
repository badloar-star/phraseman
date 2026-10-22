/**
 * Кого показать на Главной и в финале занятия (идея 1 «Серия вдвоём»).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html: «Главная · Сегодня» — «Серия вдвоём с Лидией»,
 * «Финал занятия» — «Серия вдвоём · 13 дней» и «Марк ещё не занимался»): одна строка на Главной и две карточки в финале,
 * а не список всех друзей. Выбор — по самой длинной живой серии; при равенстве — по имени, чтобы строка не прыгала.
 * Чистые функции над снимком «Вместе» (together_store) и огнём пары — без сети.
 */
import { computePairStreak, type PairStreakView } from './pair_streak';
import type { ActiveDays } from './together_days';
import type { FriendsTogetherSnapshot, FriendTogetherPairState } from './together_store';

export type PairCandidate = Readonly<{ friendUid: string; name: string; view: PairStreakView }>;
/** Пара из снимка для Главной, финала занятия и вехи на вкладке: ещё монета и кольцо Plus друга. */
export type PairSnapshotCandidate = PairCandidate & Readonly<{ coinRank: number | null; isPlus: boolean }>;

/**
 * Огонь пары на сегодня — по свежим СВОИМ дням и сохранённым дням друга из снимка (без сети).
 * Старый снимок без дней друга — огонь, как его посчитали при обновлении вкладки.
 * зачем: после занятия Главная и финал показывают «Серия вдвоём · 13», хотя профиль друга обновлялся раньше.
 */
export function pairViewForToday(pair: FriendTogetherPairState, myActiveDays: ActiveDays | null, todayKey: string): PairStreakView | null {
  if (pair.friendActiveDays === undefined) return pair.pair ?? null;
  return computePairStreak(myActiveDays, pair.friendActiveDays, todayKey);
}

/**
 * Пары снимка с огнём на сегодня. Пара без имени или без огня не попадает — строку не с чем показать.
 * зачем (идея 1, веха на вкладке): Главная, финал занятия и окно вехи собирали этот список каждый сам — одно правило на три экрана.
 */
export function pairCandidatesFromSnapshot(
  snapshot: FriendsTogetherSnapshot,
  myActiveDays: ActiveDays | null,
  todayKey: string,
): PairSnapshotCandidate[] {
  return Object.values(snapshot.pairs).flatMap((pair) => {
    const view = pairViewForToday(pair, myActiveDays, todayKey);
    return view && pair.name
      ? [{ friendUid: pair.friendUid, name: pair.name, coinRank: pair.coinRank ?? null, isPlus: pair.isPlus === true, view }]
      : [];
  });
}

function longestFirst<T extends PairCandidate>(a: T, b: T): number {
  return b.view.streak - a.view.streak || a.name.localeCompare(b.name);
}

/** Главная, «Сегодня»: друг уже занимался, я ещё нет — пара с самой длинной живой серией (её огонь ждёт меня). */
export function pickHomePair<T extends PairCandidate>(candidates: readonly T[]): T | null {
  return candidates.filter((c) => c.view.state === 'me_pending').sort(longestFirst)[0] ?? null;
}

/**
 * Финал занятия: с кем серия выросла сегодня (оба занимались) и кого позвать (я занимался, друг ещё нет).
 * По одной карточке на случай — самые длинные серии.
 */
export function pickFinishPairs<T extends PairCandidate>(candidates: readonly T[]): Readonly<{ together: T | null; pending: T | null }> {
  return {
    together: candidates.filter((c) => c.view.state === 'both_today').sort(longestFirst)[0] ?? null,
    pending: candidates.filter((c) => c.view.state === 'friend_pending').sort(longestFirst)[0] ?? null,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
