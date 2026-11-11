/**
 * Очередь проверки исправленных ошибок — логика вкладки «Проверка» («Мои ошибки 3.0», решение владельца D203, 2026-11-11).
 *
 * зачем: после трёх шагов ошибка сразу уходит из списка «Ждут», но ещё не закреплена: через несколько дней приходит одна
 * проверка. Три вкладки списка — «Ждут», «Проверка», «Исправлены» — раскладываются здесь, в одном месте, чтобы ни одна
 * ошибка не оказалась сразу в двух вкладках и не выпала из всех.
 *
 * Чистые функции без хранилища и часов: текущее время приходит аргументом.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Поля записи ошибки, которые нужны раскладу (совместимо с MistakeProjectionItem и с элементом списка). */
export interface MistakeCheckSource {
  readonly status: string;
  readonly correctedAtMs?: number | null;
  readonly checkDueAtMs?: number | null;
  readonly checkPassedAtMs?: number | null;
}

/**
 * none — проверки нет (ошибка активна или исправлена по прежнему правилу); waiting — ждёт своего дня;
 * due — пора проверять; passed — проверка пройдена, ошибка закреплена.
 */
export type MistakeCheckState = 'none' | 'waiting' | 'due' | 'passed';

export function mistakeCheckState(item: MistakeCheckSource, nowMs: number): MistakeCheckState {
  if (item.status !== 'corrected') return 'none';
  if (typeof item.checkPassedAtMs === 'number') return 'passed';
  if (typeof item.checkDueAtMs !== 'number') return 'none';
  return nowMs >= item.checkDueAtMs ? 'due' : 'waiting';
}

export interface MistakeCheckSplit<T> {
  /** Вкладка «Ждут»: активные ошибки. */
  readonly waiting: readonly T[];
  /** Вкладка «Проверка»: исправленные, проверка впереди или уже пора. Ближайшие по сроку — первыми. */
  readonly check: readonly T[];
  /** Вкладка «Исправлены»: закреплённые проверкой и исправленные по прежнему правилу. */
  readonly fixed: readonly T[];
}

/** Раскладывает ошибки по трём вкладкам. Скрытые и недоступные в расклад не попадают — как и раньше. */
export function splitMistakesByCheck<T extends MistakeCheckSource>(items: readonly T[], nowMs: number): MistakeCheckSplit<T> {
  const waiting: T[] = [];
  const check: T[] = [];
  const fixed: T[] = [];
  for (const item of items) {
    if (item.status === 'active') { waiting.push(item); continue; }
    if (item.status !== 'corrected') continue;
    const state = mistakeCheckState(item, nowMs);
    if (state === 'waiting' || state === 'due') check.push(item);
    else fixed.push(item);
  }
  check.sort((left, right) => (left.checkDueAtMs ?? 0) - (right.checkDueAtMs ?? 0));
  return { waiting, check, fixed };
}

/** Какие ошибки идут в занятие-проверку: только те, чей срок наступил; самые просроченные — первыми. */
export function selectMistakesForCheck<T extends MistakeCheckSource>(
  items: readonly T[],
  options: Readonly<{ nowMs: number; limit: number }>,
): readonly T[] {
  const limit = Math.max(0, Math.floor(options.limit));
  return items
    .filter((item) => mistakeCheckState(item, options.nowMs) === 'due')
    .sort((left, right) => (left.checkDueAtMs ?? 0) - (right.checkDueAtMs ?? 0))
    .slice(0, limit);
}

export type MistakeCheckDueGroup =
  | Readonly<{ kind: 'today' }>
  | Readonly<{ kind: 'tomorrow' }>
  | Readonly<{ kind: 'days'; days: number }>;

/**
 * Заголовок группы во вкладке «Проверка»: «Сегодня», «Завтра», «Через N дней».
 * зачем: срок считается от текущего момента целыми сутками с округлением вверх — «через 3 дня» остаётся «через 3 дня»
 * до конца первых суток, а не превращается в «через 2 дня» через минуту после исправления.
 */
export function mistakeCheckDueGroup(checkDueAtMs: number, nowMs: number): MistakeCheckDueGroup {
  if (checkDueAtMs <= nowMs) return { kind: 'today' };
  const days = Math.ceil((checkDueAtMs - nowMs) / DAY_MS);
  return days <= 1 ? { kind: 'tomorrow' } : { kind: 'days', days };
}
