import type { MistakeEvent } from './contracts';

/**
 * Награды раздела «Работа над ошибками»: серия исправлений и звания.
 *
 * зачем без цели недели (владелец 2026-09-15): «убери вообще такую хуйню как
 * цель недели, она не нужна в ошибках». Цель считала ошибки, ИСПРАВЛЕННЫЕ
 * навсегда (3 верных дня в 2 режимах), поэтому не двигалась после одного
 * ответа и выглядела сломанной. Механику убрали целиком, а не спрятали.
 *
 * Всё считается из ЖУРНАЛА — отдельного счётчика не заводим, иначе он однажды
 * разойдётся с фактом (класс бага «награду показали, но не начислили»).
 *
 * Числа утверждены владельцем 2026-09-14 по макету финала А и полки А.
 * Звания живут внутри раздела: общий каталог достижений сознательно сужен до
 * фундаментных (стрик, XP, лига), и трогать его фильтр мы не стали.
 */

/** Пороги званий за исправленное навсегда. */
export const MISTAKE_TITLE_THRESHOLDS = Object.freeze([5, 15, 40, 100] as const);
/** Пороги серии исправлений (дней подряд). */
export const MISTAKE_STREAK_THRESHOLDS = Object.freeze([3, 7, 30] as const);
/** Пороги «исправлено голосом». */
export const MISTAKE_VOICE_THRESHOLD = 10;

export type MistakeTitleId = 'attentive' | 'proofreader' | 'editor' | 'master';

export interface MistakeTitle {
  readonly id: MistakeTitleId;
  readonly threshold: number;
}

export const MISTAKE_TITLES: readonly MistakeTitle[] = Object.freeze([
  Object.freeze({ id: 'attentive' as const, threshold: 5 }),
  Object.freeze({ id: 'proofreader' as const, threshold: 15 }),
  Object.freeze({ id: 'editor' as const, threshold: 40 }),
  Object.freeze({ id: 'master' as const, threshold: 100 }),
]);

export interface MistakeRewardsSnapshot {
  /** Исправлено навсегда за всё время. */
  readonly corrected: number;
  /** Текущее звание (null — ещё ни одного порога). */
  readonly title: MistakeTitle | null;
  /** Следующее звание и сколько до него (null — все взяты). */
  readonly nextTitle: Readonly<{ title: MistakeTitle; remaining: number }> | null;
  /** Дней подряд, в которые хотя бы одна ошибка ушла навсегда. */
  readonly streakDays: number;
  /** Исправлено голосовыми заданиями. */
  readonly voiceCorrected: number;
}

const DAY_MS = 86_400_000;

const dayKey = (atMs: number): string => {
  const date = new Date(atMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Дни подряд до сегодняшнего включительно; вчерашний хвост тоже считается. */
function streakFromDays(days: ReadonlySet<string>, nowMs: number): number {
  if (days.size === 0) return 0;
  const today = dayKey(nowMs);
  const yesterday = dayKey(nowMs - DAY_MS);
  // Серия жива, пока не пропущен ПОЛНЫЙ день: сегодня ещё можно исправить.
  let cursor = days.has(today) ? nowMs : days.has(yesterday) ? nowMs - DAY_MS : 0;
  if (cursor === 0) return 0;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export function titleFor(corrected: number): MistakeTitle | null {
  let current: MistakeTitle | null = null;
  for (const title of MISTAKE_TITLES) {
    if (corrected >= title.threshold) current = title;
  }
  return current;
}

export function nextTitleFor(corrected: number): Readonly<{ title: MistakeTitle; remaining: number }> | null {
  const next = MISTAKE_TITLES.find((title) => corrected < title.threshold);
  return next ? Object.freeze({ title: next, remaining: next.threshold - corrected }) : null;
}

/**
 * Снимок наград из журнала.
 *
 * Момент исправления берём из события `correction_rewarded` — это факт выдачи
 * награды за цикл, он же и определяет день серии. Опираться на дату последнего
 * верного ответа нельзя: она сдвигается при повторных прохождениях.
 */
export function buildMistakeRewardsSnapshot(
  events: readonly MistakeEvent[],
  nowMs = Date.now(),
): MistakeRewardsSnapshot {
  const correctedCycles = new Set<string>();
  const correctedMistakes = new Set<string>();
  const pronunciationCycles = new Set<string>();
  const correctionDays = new Set<string>();

  for (const event of events) {
    const cycleKey = `${event.mistakeId}:${event.cycleId}`;
    if (event.type === 'captured' && event.payload.facet === 'pronunciation') {
      pronunciationCycles.add(cycleKey);
    }
    if (event.type !== 'correction_rewarded') continue;
    if (correctedCycles.has(cycleKey)) continue;
    correctedCycles.add(cycleKey);
    correctedMistakes.add(event.mistakeId);
    correctionDays.add(dayKey(event.occurredAtMs));
  }

  const voiceCorrected = [...correctedCycles].filter((cycleKey) => pronunciationCycles.has(cycleKey)).length;
  const corrected = correctedMistakes.size;

  return Object.freeze({
    corrected,
    title: titleFor(corrected),
    nextTitle: nextTitleFor(corrected),
    streakDays: streakFromDays(correctionDays, nowMs),
    voiceCorrected,
  });
}
