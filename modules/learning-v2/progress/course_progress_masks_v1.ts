// course_progress_masks_v1.ts — пройденные и открытые занятия курса как компактные маски (прогресс v2). Чистый модуль.
// зачем (владелец 21.10, №8/№10, стр. 87: пропущенные после экзамена и входного теста «ПРОСТО ОТКРЫТЫ — не засчитаны
// пройденными, без звёзд, проходить можно»; координатор 22.10, план раздела 8): строгая цепочка «пройдено подряд» не умеет
// «открыто, но не пройдено» и не сохраняет прохождение не по порядку. Маски держат ВСЁ пройденное и открытое; старая цепочка
// и облачное число остаются как есть (длина непрерывного начала) — старые сборки не ломаются.
// Формат: шестнадцатеричная строка, бит i — занятие с индексом i в порядке курса (бит = 1 << (i % 4) в символе ⌊i/4⌋),
// нули в хвосте обрезаны. 1792 занятия → не больше 448 символов на маску. Слияние — только побитовое ИЛИ: ничего не теряется.

export const LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1 = "learning_v2_course_masks_sync_v1";

/**
 * Раскладка битов v1 — НЕИЗМЕННАЯ сетка курса: бит = (урок − 1) × 56 + (эпизод − 1).
 * зачем (координатор/Ревизор 22.10, 🔴 до облака): если бит зависел бы от «позиции в списке занятий», вставка занятия
 * сдвинула бы все маски и пройденное у учеников уехало бы на чужие эпизоды. Сетка 32 × 56 фиксирована: новые уроки (22+)
 * заполняют уже существующие ячейки, ничего не сдвигая. Если сетку когда-нибудь изменят — новая версия раскладки и
 * миграция; сторож tests/learning_v2_course_progress_v2.test.ts падает при любом расхождении сетки с порядком курса.
 */
export const LEARNING_V2_COURSE_MASK_LAYOUT_V1 = Object.freeze({ version: 1 as const, lessons: 32, sessionsPerLesson: 56 });

/** Бит занятия по его id (`lesson-07:session:12`); null — id не из сетки v1. */
export function courseMaskBitForSessionIdV1(sessionId: string): number | null {
  const match = /^lesson-(\d{2}):session:(\d{2})$/u.exec(sessionId);
  if (!match) return null;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  const { lessons, sessionsPerLesson } = LEARNING_V2_COURSE_MASK_LAYOUT_V1;
  if (lesson < 1 || lesson > lessons || session < 1 || session > sessionsPerLesson) return null;
  return (lesson - 1) * sessionsPerLesson + (session - 1);
}

export type CourseProgressMasksV1 = Readonly<{
  completed: ReadonlySet<number>;
  opened: ReadonlySet<number>;
  /** true — значение записано другой (будущей) раскладкой: читать нельзя, перезаписывать нельзя. */
  foreignLayout?: boolean;
}>;

const HEX = "0123456789abcdef";

export function encodeCourseMaskV1(indices: Iterable<number>): string {
  const nibbles: number[] = [];
  for (const i of indices) {
    if (!Number.isSafeInteger(i) || i < 0) continue;
    const at = Math.floor(i / 4);
    while (nibbles.length <= at) nibbles.push(0);
    nibbles[at] |= 1 << (i % 4);
  }
  while (nibbles.length > 0 && nibbles[nibbles.length - 1] === 0) nibbles.pop();
  return nibbles.map((n) => HEX[n]).join("");
}

/** Маска → индексы; посторонние символы и индексы за пределом курса отбрасываются. */
export function decodeCourseMaskV1(raw: string | null | undefined, total: number): Set<number> {
  const out = new Set<number>();
  if (!raw) return out;
  const text = raw.toLowerCase();
  for (let at = 0; at < text.length; at += 1) {
    const nibble = HEX.indexOf(text[at]);
    if (nibble <= 0) continue;
    for (let bit = 0; bit < 4; bit += 1) {
      const index = at * 4 + bit;
      if (nibble & (1 << bit) && index < total) out.add(index);
    }
  }
  return out;
}

export function packCourseMasksV1(masks: CourseProgressMasksV1): string {
  return JSON.stringify({ v: LEARNING_V2_COURSE_MASK_LAYOUT_V1.version, c: encodeCourseMaskV1(masks.completed), o: encodeCourseMaskV1(masks.opened) });
}

export function parseCourseMasksV1(raw: string | null | undefined, total: number): CourseProgressMasksV1 {
  if (!raw) return Object.freeze({ completed: new Set<number>(), opened: new Set<number>() });
  try {
    const value = JSON.parse(raw) as { v?: unknown; c?: unknown; o?: unknown };
    // без поля v — первые записи части (а) той же раскладки v1; иная версия — чужая раскладка, данные не трогаем
    if (value?.v !== undefined && value.v !== LEARNING_V2_COURSE_MASK_LAYOUT_V1.version) {
      console.warn("[LV2-PROGRESS] masks:foreign_layout", JSON.stringify({ v: value.v, expected: LEARNING_V2_COURSE_MASK_LAYOUT_V1.version })); // guard-ok: ранний выход с причиной
      return Object.freeze({ completed: new Set<number>(), opened: new Set<number>(), foreignLayout: true });
    }
    return Object.freeze({
      completed: decodeCourseMaskV1(typeof value?.c === "string" ? value.c : "", total),
      opened: decodeCourseMaskV1(typeof value?.o === "string" ? value.o : "", total),
    });
  } catch (error) {
    console.warn("[LV2-PROGRESS] masks:unparseable", JSON.stringify({ len: raw.length, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину; битая маска = пусто, другая сторона слияния не теряется
    return Object.freeze({ completed: new Set<number>(), opened: new Set<number>() });
  }
}

export function unionCourseMasksV1(...all: readonly CourseProgressMasksV1[]): CourseProgressMasksV1 {
  const completed = new Set<number>();
  const opened = new Set<number>();
  for (const m of all) {
    m.completed.forEach((i) => completed.add(i));
    m.opened.forEach((i) => opened.add(i));
  }
  return Object.freeze({ completed, opened });
}

/** Старое облачное число «пройдено подряд» → маска пройденного без потерь. */
export function courseMasksFromChainCountV1(count: number, total: number): CourseProgressMasksV1 {
  const completed = new Set<number>();
  const n = Math.max(0, Math.min(Number.isSafeInteger(count) ? count : 0, total));
  for (let i = 0; i < n; i += 1) completed.add(i);
  return Object.freeze({ completed, opened: new Set<number>() });
}

/** Длина непрерывного начала пройденного — это и есть старая цепочка / старое облачное число. */
export function contiguousCompletedLengthV1(completed: ReadonlySet<number>): number {
  let n = 0;
  while (completed.has(n)) n += 1;
  return n;
}

/** Текущее занятие: первое по порядку, которое не пройдено и не открыто; null — таких нет. */
export function courseCurrentIndexV1(masks: CourseProgressMasksV1, total: number): number | null {
  for (let i = 0; i < total; i += 1) if (!masks.completed.has(i) && !masks.opened.has(i)) return i;
  return null;
}

/** Правило восстановления (телефон, облако) → значение: побитовое ИЛИ, пустая или битая сторона ничего не стирает. */
export function mergeCourseMasksRestoreValueV1(localRaw: string | null | undefined, cloudRaw: string, total: number): string {
  const local = parseCourseMasksV1(localRaw, total);
  const cloud = parseCourseMasksV1(cloudRaw, total);
  // зачем: облако записано будущей раскладкой — эта сборка его не понимает и НЕ затирает (иначе потеря прогресса)
  if (cloud.foreignLayout || local.foreignLayout) {
    console.warn("[LV2-PROGRESS] restore:masks_foreign_layout_kept", JSON.stringify({ localForeign: Boolean(local.foreignLayout), cloudForeign: Boolean(cloud.foreignLayout) })); // guard-ok: какое правило сработало
    return cloud.foreignLayout ? cloudRaw : (localRaw ?? cloudRaw);
  }
  const merged = unionCourseMasksV1(local, cloud);
  console.log("[LV2-PROGRESS] restore:masks", JSON.stringify({ local: [local.completed.size, local.opened.size], cloud: [cloud.completed.size, cloud.opened.size], merged: [merged.completed.size, merged.opened.size], rule: "bitwise_or_never_lost" })); // guard-ok: какое правило сработало
  return packCourseMasksV1(merged);
}
