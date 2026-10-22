// chapter_exam_v1.ts — движок экзамена главы и входного теста Learning V2 (решения владельца 21.10, журнал решений №8/№10).
// зачем: один механизм на экзамен главы и входной тест; вопросы — из ГОТОВЫХ заданий курса этой главы (новый контент не
// нужен); 12 вопросов, сдал при 10 из 12; провал → разбор ошибок и новая попытка через час, сердечки не тратятся;
// энергия: экзамен — 1 для бесплатных, Plus бесплатно, входной тест бесплатно; сдать можно ДО прохождения всех эпизодов,
// сдал → следующая глава открыта, пропущенные эпизоды засчитаны без звёзд. Модуль чистый: ни сети, ни хранилища, ни
// Firebase — время и прогресс приходят аргументами, поэтому всё проверяется тестами без моков.

export const CHAPTER_EXAM_QUESTION_COUNT_V1 = 12 as const;
export const CHAPTER_EXAM_PASS_CORRECT_V1 = 10 as const;
export const CHAPTER_EXAM_RETRY_DELAY_MS_V1 = 60 * 60 * 1000;
export const CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 = 8 as const;
const LOG = "[CHAPTER-EXAM]";

export type ChapterExamKindV1 = "chapter_exam" | "placement";

/**
 * Режимы, из которых собирается экзамен: задания с однозначной проверкой ответа без голоса и без таймера.
 * «Скажи вслух» (микрофон), «Найди пары» (таймер), «Различи звуки» (не назначается) и карточки слов в экзамен не идут.
 */
export const CHAPTER_EXAM_FAMILIES_V1 = Object.freeze([
  "phrase_builder",
  "context_gap_grammar",
  "listen_choose",
  "listen_build_dictation",
] as const);
export type ChapterExamFamilyV1 = (typeof CHAPTER_EXAM_FAMILIES_V1)[number];

export type ChapterExamCandidateV1 = Readonly<{
  interactionId: string;
  courseSessionId: string;
  sessionOrdinal: number;
  family: string;
  isWordCard?: boolean;
}>;

export type ChapterExamQuestionV1 = Readonly<{
  ordinal: number;
  interactionId: string;
  courseSessionId: string;
  sessionOrdinal: number;
  family: ChapterExamFamilyV1;
}>;

export function chapterOrdinalForSessionV1(sessionOrdinal: number): number {
  return Math.ceil(sessionOrdinal / CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1);
}

export function chapterSessionOrdinalsV1(chapterOrdinal: number): readonly number[] {
  const first = (chapterOrdinal - 1) * CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 + 1;
  return Object.freeze(Array.from({ length: CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 }, (_, i) => first + i));
}

export function chapterExamKeyV1(input: Readonly<{ targetLanguage: string; lessonOrdinal: number; chapterOrdinal: number }>): string {
  return `${input.targetLanguage}:lesson-${String(input.lessonOrdinal).padStart(2, "0")}:chapter-${input.chapterOrdinal}`;
}

// Детерминированный генератор от ключа экзамена и номера попытки: та же попытка → те же вопросы (перезапуск экрана не
// меняет экзамен), новая попытка → другой набор.
function seededRandom(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const isExamFamily = (family: string): family is ChapterExamFamilyV1 =>
  (CHAPTER_EXAM_FAMILIES_V1 as readonly string[]).includes(family);

/**
 * 12 вопросов из заданий главы: поровну по эпизодам (по кругу), внутри эпизода — чередуя режимы, порядок перемешан.
 * Меньше 12 подходящих заданий — экзамен не собирается (null), причина в журнале: показывать неполный экзамен нельзя.
 */
export function selectChapterExamQuestionsV1(input: Readonly<{
  examKey: string;
  attempt: number;
  candidates: readonly ChapterExamCandidateV1[];
}>): readonly ChapterExamQuestionV1[] | null {
  const eligible = input.candidates.filter((c) => !c.isWordCard && isExamFamily(c.family));
  const unique = [...new Map(eligible.map((c) => [c.interactionId, c])).values()];
  console.log(`${LOG} select:start`, JSON.stringify({ examKey: input.examKey, attempt: input.attempt, candidates: input.candidates.length, eligible: unique.length })); // guard-ok: вход подбора
  if (unique.length < CHAPTER_EXAM_QUESTION_COUNT_V1) {
    console.warn(`${LOG} select:not_enough`, JSON.stringify({ examKey: input.examKey, eligible: unique.length, need: CHAPTER_EXAM_QUESTION_COUNT_V1 })); // guard-ok: ранний выход пишет причину
    return null;
  }
  const random = seededRandom(`${input.examKey}#${input.attempt}`);
  const bySession = new Map<number, ChapterExamCandidateV1[]>();
  for (const candidate of unique) {
    const list = bySession.get(candidate.sessionOrdinal) ?? [];
    list.push(candidate);
    bySession.set(candidate.sessionOrdinal, list);
  }
  // внутри эпизода: перемешать, затем развести режимы, чтобы подряд не шли одинаковые
  const queues = [...bySession.keys()].sort((a, b) => a - b).map((ordinal) => {
    const list = shuffled(bySession.get(ordinal) ?? [], random);
    const byFamily = new Map<string, ChapterExamCandidateV1[]>();
    for (const c of list) byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c]);
    const interleaved: ChapterExamCandidateV1[] = [];
    while ([...byFamily.values()].some((q) => q.length)) {
      for (const q of byFamily.values()) { const next = q.shift(); if (next) interleaved.push(next); }
    }
    return interleaved;
  });
  const picked: ChapterExamCandidateV1[] = [];
  while (picked.length < CHAPTER_EXAM_QUESTION_COUNT_V1 && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && picked.length < CHAPTER_EXAM_QUESTION_COUNT_V1) picked.push(next);
    }
  }
  const ordered = shuffled(picked, random).map((c, index) => Object.freeze({
    ordinal: index + 1,
    interactionId: c.interactionId,
    courseSessionId: c.courseSessionId,
    sessionOrdinal: c.sessionOrdinal,
    family: c.family as ChapterExamFamilyV1,
  }));
  console.log(`${LOG} select:done`, JSON.stringify({ examKey: input.examKey, attempt: input.attempt, sessions: [...new Set(ordered.map((q) => q.sessionOrdinal))], families: ordered.map((q) => q.family) })); // guard-ok: итог подбора
  return Object.freeze(ordered);
}

export type ChapterExamResultV1 = Readonly<{
  correct: number;
  total: number;
  passed: boolean;
  /** Ошибки для разбора — в порядке вопросов. */
  mistakes: readonly string[];
}>;

export function scoreChapterExamV1(answers: readonly Readonly<{ interactionId: string; correct: boolean }>[]): ChapterExamResultV1 {
  const correct = answers.filter((a) => a.correct).length;
  const result = Object.freeze({
    correct,
    total: answers.length,
    passed: answers.length === CHAPTER_EXAM_QUESTION_COUNT_V1 && correct >= CHAPTER_EXAM_PASS_CORRECT_V1,
    mistakes: Object.freeze(answers.filter((a) => !a.correct).map((a) => a.interactionId)),
  });
  console.log(`${LOG} score`, JSON.stringify({ correct, total: answers.length, need: CHAPTER_EXAM_PASS_CORRECT_V1, passed: result.passed })); // guard-ok: итог экзамена
  return result;
}

export type ChapterExamRecordV1 = Readonly<{
  examKey: string;
  status: "passed" | "failed";
  /** Лучший результат (для строки «Экзамен сдан · X из 12» — результат сданной попытки). */
  passedCorrect: number | null;
  lastCorrect: number;
  attempts: number;
  lastFinishedAtMs: number;
  /** Когда можно пересдать после провала; null — ограничения нет. */
  retryAtMs: number | null;
}>;

/** Новая запись после попытки. Сданный экзамен остаётся сданным: повторный провал не отменяет сдачу. */
export function recordChapterExamAttemptV1(
  previous: ChapterExamRecordV1 | null,
  input: Readonly<{ examKey: string; result: ChapterExamResultV1; finishedAtMs: number }>,
): ChapterExamRecordV1 {
  const alreadyPassed = previous?.status === "passed";
  const passedNow = input.result.passed;
  const next: ChapterExamRecordV1 = Object.freeze({
    examKey: input.examKey,
    status: alreadyPassed || passedNow ? "passed" : "failed",
    passedCorrect: passedNow
      ? Math.max(previous?.passedCorrect ?? 0, input.result.correct)
      : previous?.passedCorrect ?? null,
    lastCorrect: input.result.correct,
    attempts: (previous?.attempts ?? 0) + 1,
    lastFinishedAtMs: input.finishedAtMs,
    retryAtMs: alreadyPassed || passedNow ? null : input.finishedAtMs + CHAPTER_EXAM_RETRY_DELAY_MS_V1,
  });
  console.log(`${LOG} record`, JSON.stringify({ examKey: input.examKey, from: previous?.status ?? "none", to: next.status, attempts: next.attempts, retryAtMs: next.retryAtMs })); // guard-ok: смена состояния
  return next;
}

export type ChapterExamAvailabilityV1 =
  | Readonly<{ state: "passed"; passedCorrect: number }>
  | Readonly<{ state: "available" }>
  | Readonly<{ state: "cooldown"; retryAtMs: number; minutesLeft: number }>
  | Readonly<{ state: "locked"; reason: "chapter_not_reached" }>;

/**
 * Можно ли начать экзамен. Решение владельца: сдавать можно ДО прохождения всех эпизодов — достаточно дойти до главы
 * (хотя бы один её эпизод пройден или текущий). После провала — пауза час.
 */
export function chapterExamAvailabilityV1(input: Readonly<{
  record: ChapterExamRecordV1 | null;
  chapterReached: boolean;
  nowMs: number;
}>): ChapterExamAvailabilityV1 {
  const { record } = input;
  let out: ChapterExamAvailabilityV1;
  if (record?.status === "passed") out = { state: "passed", passedCorrect: record.passedCorrect ?? record.lastCorrect };
  else if (!input.chapterReached) out = { state: "locked", reason: "chapter_not_reached" };
  else if (record?.retryAtMs != null && input.nowMs < record.retryAtMs) {
    out = { state: "cooldown", retryAtMs: record.retryAtMs, minutesLeft: Math.max(1, Math.ceil((record.retryAtMs - input.nowMs) / 60_000)) };
  } else out = { state: "available" };
  console.log(`${LOG} availability`, JSON.stringify({ examKey: record?.examKey ?? null, recordStatus: record?.status ?? "none", chapterReached: input.chapterReached, state: out.state })); // guard-ok: ветка и значение
  return Object.freeze(out);
}

/** Энергия за попытку: экзамен главы — 1 для бесплатных, Plus бесплатно; входной тест — всегда бесплатно. */
export function chapterExamEnergyCostV1(input: Readonly<{ kind: ChapterExamKindV1; hasPlus: boolean }>): 0 | 1 {
  const cost: 0 | 1 = input.kind === "placement" || input.hasPlus ? 0 : 1;
  console.log(`${LOG} energy_cost`, JSON.stringify({ kind: input.kind, hasPlus: input.hasPlus, cost })); // guard-ok: ветка и значение
  return cost;
}

/**
 * Что засчитать при сдаче: все ещё не пройденные эпизоды этой главы — по порядку, без звёзд (прогресс курса — строгая
 * цепочка, поэтому засчитываем подряд от текущего). Глава сдана, а эпизоды уже пройдены — список пуст.
 */
export function chapterExamSessionsToCreditV1(input: Readonly<{
  chapterOrdinal: number;
  completedSessionOrdinals: readonly number[];
}>): readonly number[] {
  const done = new Set(input.completedSessionOrdinals);
  const credit = chapterSessionOrdinalsV1(input.chapterOrdinal).filter((ordinal) => !done.has(ordinal));
  console.log(`${LOG} credit_plan`, JSON.stringify({ chapterOrdinal: input.chapterOrdinal, credit })); // guard-ok: план зачёта
  return Object.freeze(credit);
}
