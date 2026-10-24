/**
 * «Урок вместе» (идея 2): кого можно позвать на только что пройденное занятие и как работает выбор.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html, идея 2 «Выбор друзей»): после занятия — «Позвать друга
 * на это занятие»; до трёх друзей за занятие; кому урок открыт — отмечены сразу, кто уже прошёл — можно позвать повторить,
 * у кого урок ещё закрыт — строка неактивна. Чистые функции — без сети.
 */

import { LEARNING_V2_COURSE_MASK_LAYOUT_V1, decodeCourseMaskV1 } from '../../modules/learning-v2/progress/course_progress_masks_v1';

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
/** Маски курса друга из профиля: c — пройдено, o — открыто, но не пройдено (шестнадцатеричные строки раскладки v1). */
export type FriendCourseMasks = Readonly<{ c: string; o: string }>;

const COURSE_MASK_RE = /^[0-9a-f]{0,448}$/;
const COURSE_TOTAL = LEARNING_V2_COURSE_MASK_LAYOUT_V1.lessons * LEARNING_V2_COURSE_MASK_LAYOUT_V1.sessionsPerLesson;

/** Строгий разбор недоверенного поля профиля friendCourse; чужая раскладка или мусор — null («не знаем»). */
export function parseFriendCourse(raw: unknown): FriendCourseMasks | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || typeof r.c !== 'string' || typeof r.o !== 'string') return null;
  const c = r.c.toLowerCase();
  const o = r.o.toLowerCase();
  return COURSE_MASK_RE.test(c) && COURSE_MASK_RE.test(o) ? { c, o } : null;
}

/**
 * Статус занятия у друга по его маскам: done — пройдено; open — открыто или это его текущее (первое не пройденное и не
 * открытое по порядку курса); locked — дальше текущего; unknown — масок нет (старый клиент друга) или номера вне сетки.
 * зачем (координатор 22.10, макет «Выбор друзей»): «кому открыт, кто прошёл, у кого закрыт» — без чтений, из профиля.
 */
export function lessonInviteStatusFromCourse(course: FriendCourseMasks | null | undefined, lessonOrdinal: number, sessionOrdinal: number): LessonInviteStatus {
  const { lessons, sessionsPerLesson } = LEARNING_V2_COURSE_MASK_LAYOUT_V1;
  if (!course || !Number.isInteger(lessonOrdinal) || !Number.isInteger(sessionOrdinal)) return 'unknown';
  if (lessonOrdinal < 1 || lessonOrdinal > lessons || sessionOrdinal < 1 || sessionOrdinal > sessionsPerLesson) return 'unknown';
  const bit = (lessonOrdinal - 1) * sessionsPerLesson + (sessionOrdinal - 1);
  const completed = decodeCourseMaskV1(course.c, COURSE_TOTAL);
  if (completed.has(bit)) return 'done';
  const opened = decodeCourseMaskV1(course.o, COURSE_TOTAL);
  if (opened.has(bit)) return 'open';
  let current = 0;
  while (current < COURSE_TOTAL && (completed.has(current) || opened.has(current))) current += 1;
  return bit === current ? 'open' : 'locked';
}

export default function __RouteShim() { return null; }
