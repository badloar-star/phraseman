/**
 * «Урок вместе» (идея 2): кого можно позвать на только что пройденное занятие и как работает выбор.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2 «Выбор друзей»): после занятия — «Позвать друга
 * на это занятие»; до трёх друзей за занятие; кому урок открыт — отмечены сразу, кто уже прошёл — можно позвать повторить,
 * у кого урок ещё закрыт — строка неактивна. Чистые функции — без сети.
 */

/** Предел приглашений за одно занятие (макет «Выбраны трое»: остальные строки неактивны). */
export const LESSON_INVITE_MAX = 3;

/**
 * open — урок у друга открыт; done — уже прошёл (позовём повторить); locked — у друга урок ещё закрыт;
 * unknown — прогресса друга нет в профиле: выбрать можно, подписи нет, сразу не отмечаем (не зовём вслепую).
 */
export type LessonInviteStatus = 'open' | 'done' | 'locked' | 'unknown';

export type LessonInviteRow = Readonly<{
  friendUid: string;
  name: string;
  coinRank: number | null;
  isPlus: boolean;
  status: LessonInviteStatus;
}>;

const STATUS_ORDER: Readonly<Record<LessonInviteStatus, number>> = { open: 0, unknown: 0, done: 1, locked: 2 };

/** Порядок строк выбора: урок открыт → уже прошёл → закрыт; внутри — по имени, чтобы список не прыгал. */
export function orderLessonInviteRows<T extends LessonInviteRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
}

/** Кого отметить сразу: у кого урок открыт, не больше трёх (в порядке строк). */
export function defaultLessonInvitePicks(rows: readonly LessonInviteRow[]): string[] {
  return orderLessonInviteRows(rows).filter((r) => r.status === 'open').slice(0, LESSON_INVITE_MAX).map((r) => r.friendUid);
}

/** Тап по строке: снять отметку или поставить; закрытый урок и четвёртый друг — без изменений. */
export function toggleLessonInvitePick(selected: readonly string[], row: LessonInviteRow): readonly string[] {
  if (row.status === 'locked') return selected;
  if (selected.includes(row.friendUid)) return selected.filter((uid) => uid !== row.friendUid);
  if (selected.length >= LESSON_INVITE_MAX) return selected;
  return [...selected, row.friendUid];
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
