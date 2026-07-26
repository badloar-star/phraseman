// ═══════════════════════════════════════════════════════════════════════════
// tournament_ai_blueprint.ts — план ЦЕЛОГО турнира для ИИ-генерации.
//
// зачем: владелец забраковал прежний генератор — «ОНИ ВСЕ ОДНОТИПНЫЕ, как они
// для разных типов задания будут использоваться?». Раньше генерация выдавала
// 10 однотипных вопросов «переведи фразу», хотя турнир состоит из четырёх
// раундов с РАЗНЫМИ режимами. Решение владельца: одна генерация = один готовый
// турнир целиком, каждому режиму — свой тип вопроса, хранение по разделам.
//
// Модуль ЧИСТЫЙ: только план и его проверка, ни сети, ни Firestore. Так
// раскладку можно посчитать в тестах, не тратя ни копейки на OpenAI.
// ═══════════════════════════════════════════════════════════════════════════

import {
  TOURNAMENT_ROUNDS,
  TOURNAMENT_ROUND_MODE_KINDS,
} from './tournament_core';

// ── Типы вопросов (выбор владельца 2026-07-26) ──────────────────────────────

/**
 * Четыре типа, которые владелец выбрал вместо однотипного «переведи фразу».
 * Каждый ложится на формат, который УЖЕ понимает сервер турнира:
 * первые три — choice (4 варианта), четвёртый — translate (банк слов).
 */
export const TOURNAMENT_AI_KINDS = [
  'situation',   // «Официант принёс не то. Что скажешь?» → 4 англ. реплики
  'gap',         // «I'm looking ___ my keys» → for / at / after / to
  'oddity',      // 4 фразы, одна — калька с русского («I feel myself good»)
  'assembly',    // собери фразу из слов (второй формат турнира)
] as const;

export type TournamentAiKind = typeof TOURNAMENT_AI_KINDS[number];

/** Режим пула, под которым задание ляжет в Firestore и попадёт в раунд. */
export const KIND_TO_MODE: Readonly<Record<TournamentAiKind, string>> = Object.freeze({
  situation: 'guess_phrase',
  gap: 'fill_gap',
  oddity: 'find_oddity',
  assembly: 'translate_build',
});

/** Формат серверного контракта: choice (4 опции) или translate (банк слов). */
export const KIND_TO_FORMAT: Readonly<Record<TournamentAiKind, 'choice' | 'translate'>> =
  Object.freeze({
    situation: 'choice',
    gap: 'choice',
    oddity: 'choice',
    assembly: 'translate',
  });

// ── Размер турнира ──────────────────────────────────────────────────────────

/** Заданий в раунде — зеркало DEFAULT_TASKS_PER_ROUND в tournaments.ts. */
export const TASKS_PER_ROUND = 6;

/** Полный турнир: 4 раунда × 6 заданий. */
export const TOURNAMENT_AI_TOTAL_TASKS = TOURNAMENT_ROUNDS * TASKS_PER_ROUND;

/**
 * Сложность, допустимая в раунде — зеркало selectRoundTasks (tournament_core).
 * Раунд 1 только лёгкие (все включаются), раунд 4 — жёсткий отсев.
 */
export const ROUND_DIFFICULTY: Readonly<Record<number, readonly number[]>> = Object.freeze({
  1: [1], 2: [1, 2], 3: [2], 4: [2, 3],
});

// ── План раунда ─────────────────────────────────────────────────────────────

export type RoundPlan = {
  readonly roundNo: number;
  /** 'single' — весь раунд одним типом, 'mix' — разные типы вперемешку. */
  readonly modeKind: 'single' | 'mix';
  /** Типы вопросов ровно на TASKS_PER_ROUND заданий, по порядку. */
  readonly kinds: readonly TournamentAiKind[];
  /** Сложность каждого задания раунда (1..3), в допустимой полосе. */
  readonly difficulties: readonly number[];
};

/**
 * Раскладка целого турнира.
 *
 * зачем: раунды 1 и 3 сервер собирает из ОДНОГО режима (single) — если
 * подсунуть туда разные, selectRoundTasks возьмёт случайный режим и часть
 * заданий не наберётся, а комната отменится с возвратом билетов. Раунды 2 и 4
 * смешанные — там кладём все четыре типа, чтобы турнир не приедался.
 *
 * Типы по раундам чередуются, чтобы каждый встретился и в «своём» раунде,
 * и в миксе: 1 — ситуации, 3 — пропущенное слово (обе single).
 */
export function buildTournamentPlan(): readonly RoundPlan[] {
  // зачем: single-раунды отдаём РЕДКИМ типам. Если поставить сюда situation и
  // gap, они получат по 10 заданий из 24, а oddity и assembly — по 2: расчёт
  // на реальном плане это показал. Отдаём single-раунды assembly и oddity,
  // тогда каждый тип представлен достойно (8/8/4/4 вместо 10/10/2/2).
  const singleKinds: readonly TournamentAiKind[] = ['assembly', 'oddity'];
  let singleIndex = 0;

  return TOURNAMENT_ROUND_MODE_KINDS.map((modeKind, index) => {
    const roundNo = index + 1;
    const allowed = ROUND_DIFFICULTY[roundNo] ?? [1];

    const kinds: TournamentAiKind[] = [];
    if (modeKind === 'single') {
      // Весь раунд одним типом — иначе сервер не наберёт задания.
      const kind = singleKinds[singleIndex % singleKinds.length];
      singleIndex += 1;
      for (let i = 0; i < TASKS_PER_ROUND; i += 1) kinds.push(kind);
    } else {
      // Микс: все четыре типа по кругу — 6 заданий дают 4+2.
      for (let i = 0; i < TASKS_PER_ROUND; i += 1) {
        kinds.push(TOURNAMENT_AI_KINDS[i % TOURNAMENT_AI_KINDS.length]);
      }
    }

    // Сложности гоняем по допустимой полосе раунда, чтобы внутри раунда
    // тоже был разброс, а не шесть одинаковых заданий.
    const difficulties = Array.from(
      { length: TASKS_PER_ROUND },
      (_, i) => allowed[i % allowed.length],
    );

    return Object.freeze({ roundNo, modeKind, kinds: Object.freeze(kinds), difficulties: Object.freeze(difficulties) });
  });
}

/** Плоский список заданий турнира: что именно просить у модели, по порядку. */
export type PlannedTask = {
  readonly roundNo: number;
  readonly kind: TournamentAiKind;
  readonly difficulty: number;
};

export function flattenPlan(plan: readonly RoundPlan[]): readonly PlannedTask[] {
  const out: PlannedTask[] = [];
  for (const round of plan) {
    for (let i = 0; i < round.kinds.length; i += 1) {
      out.push({ roundNo: round.roundNo, kind: round.kinds[i], difficulty: round.difficulties[i] });
    }
  }
  return Object.freeze(out);
}

/** Сколько заданий каждого типа даёт полный турнир — для отчёта в админке. */
export function planKindCounts(plan: readonly RoundPlan[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const task of flattenPlan(plan)) {
    counts[task.kind] = (counts[task.kind] ?? 0) + 1;
  }
  return Object.freeze(counts);
}
