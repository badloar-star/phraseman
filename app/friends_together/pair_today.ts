/**
 * Кого показать на Главной и в финале занятия (идея 1 «Серия вдвоём»).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html: «Главная · Сегодня» — «Серия вдвоём с Лидией»,
 * «Финал занятия» — «Серия вдвоём · 13 дней» и «Марк ещё не занимался»): одна строка на Главной и две карточки в финале,
 * а не список всех друзей. Выбор — по самой длинной живой серии; при равенстве — по имени, чтобы строка не прыгала.
 * Чистые функции над уже посчитанным огнём пары (together_store) — без сети.
 */
import type { PairStreakView } from './pair_streak';

export type PairCandidate = Readonly<{ friendUid: string; name: string; view: PairStreakView }>;

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
