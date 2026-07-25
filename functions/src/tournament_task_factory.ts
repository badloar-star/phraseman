// ═══════════════════════════════════════════════════════════════════════════
// tournament_task_factory.ts — сборка заданий турнира из авторского контента.
//
// зачем: владелец просил «полноценный генератор в админке, качественные фразы».
// Спека говорит «задания из Learning v2», но Learning v2 не готов, а турнирному
// серверу режимы Learning v2 и не нужны: selectRoundTasks() собирает список
// режимов ИЗ САМИХ ЗАДАНИЙ пула (tournament_core.ts:1082), а валидатор проверяет
// только 4 формата (choice/translate/timeattack/voice). Поэтому источник —
// уже отревьюенный контент планов (app/plan_content_*.ts, 3252 фразы): у каждого
// слова заранее размечены partOfSpeech и 3-5 правдоподобных дистракторов того же
// класса. Это даёт качество без ИИ, ноль трат на OpenAI и ноль галлюцинаций.
//
// Модуль ЧИСТЫЙ: ни Firestore, ни admin SDK. Firestore-обвязка — в
// admin_tournament_tasks.ts. Так генератор тестируется без эмулятора и его же
// можно позвать из скрипта.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import type { TournamentTask } from './tournament_core';
import { TOURNAMENT_TASK_LIMITS, validateTournamentTask } from './tournament_core';

// ── Вход: срез схемы app/plan_content_schema.ts, только нужные поля ──────────

/** Слово фразы с частью речи и авторскими дистракторами. */
export type SourceWord = {
  readonly text: string;
  readonly partOfSpeech: string;
  readonly distractors: readonly string[];
};

/** Одна фраза авторского контента. */
export type SourcePhrase = {
  readonly id: string;
  readonly english: string;
  /** Переводы; ru обязателен (LocalizedText из схемы планов). */
  readonly meaning: { readonly ru: string } & Record<string, unknown>;
  readonly words?: readonly SourceWord[];
  readonly alternatives?: readonly string[];
};

/** День плана — единица группировки: тема, уровень, порядковый номер. */
export type SourceDay = {
  readonly planId: string;
  readonly dayIndex: number;
  readonly topic?: { readonly ru?: string } & Record<string, unknown>;
  /** CEFR-полоса дня: A1/A2/B1/B2/C1 — основной сигнал сложности. */
  readonly level?: string;
  readonly phrases: readonly SourcePhrase[];
};

export type GeneratorOptions = {
  /** Какие форматы собирать. По умолчанию все, кроме voice. */
  readonly kinds?: readonly GeneratableKind[];
  /** Максимум заданий на выходе (0 = без лимита). */
  readonly limit?: number;
  /** Публиковать сразу как verified. По умолчанию false — сначала ревью. */
  readonly verified?: boolean;
  /** Сколько коротких вопросов кладём в один timeattack-сет. */
  readonly timeattackItems?: number;
};

/**
 * voice не генерируем: серверный скоринг голоса выключен
 * (tournamentFeatureGates().voiceScoring), такие задания молча выпадут из
 * выборки и будут занимать место в пуле.
 */
export type GeneratableKind = 'choice' | 'translate' | 'timeattack';

export const GENERATABLE_KINDS: readonly GeneratableKind[] = ['choice', 'translate', 'timeattack'];

/** Режимы пула. Сервер берёт список режимов отсюда — через поле task.mode. */
export const TOURNAMENT_MODES = Object.freeze({
  choice: 'guess_phrase',
  translate: 'translate_build',
  timeattack: 'time_attack',
} as const satisfies Record<GeneratableKind, string>);

const DEFAULT_TIMEATTACK_ITEMS = 6;
const CHOICE_OPTIONS = 4;
/** Ниже этого числа фраз в дне дистракторы-переводы становятся однообразными. */
const MIN_PHRASES_FOR_CHOICE = CHOICE_OPTIONS;

// ── Детерминизм ─────────────────────────────────────────────────────────────

/**
 * Стабильный хеш строки → число. Нужен, чтобы одна и та же фраза всегда давала
 * один и тот же набор дистракторов и один и тот же taskId: повторный запуск
 * генератора не плодит дубли в пуле.
 */
function stableHash(input: string): number {
  const digest = createHash('sha1').update(input).digest();
  return digest.readUInt32BE(0);
}

/** Детерминированная перестановка: порядок зависит только от seed. */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  return items
    .map((item, index) => ({ item, rank: stableHash(`${seed}:${index}`) }))
    .sort((a, b) => (a.rank - b.rank) || 0)
    .map((entry) => entry.item);
}

// ── Сложность ───────────────────────────────────────────────────────────────

const CEFR_DIFFICULTY: Record<string, number> = {
  A1: 1, A2: 1, B1: 2, B2: 3, C1: 3, C2: 3,
};

/**
 * Сложность 1..3 — то, что требует сервер (раунд 1 → 1, раунд 4 → 2-3).
 * Основной сигнал — CEFR дня; если его нет, берём порядковый номер дня:
 * ранние дни плана заведомо проще поздних.
 */
export function difficultyForDay(day: SourceDay): number {
  const byCefr = day.level ? CEFR_DIFFICULTY[String(day.level).toUpperCase()] : undefined;
  if (byCefr) return byCefr;
  if (day.dayIndex <= 10) return 1;
  if (day.dayIndex <= 25) return 2;
  return 3;
}

/**
 * Обрезка строки по РЕАЛЬНЫМ байтам UTF-8, не по символам.
 *
 * зачем: сервер меряет теги в байтах (tagBytes: 64), а кириллица — 2 байта на
 * букву. Обрезка по .slice(40) давала тег «topic:Подключиться к созвону и
 * поздороваться» = 78 байт → task_tags_invalid → день целиком выпадал из пула.
 * Режем по байтам и не рвём символ пополам.
 */
function truncateToBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return value;
  let result = value;
  while (result.length > 0 && Buffer.byteLength(result, 'utf8') > maxBytes) {
    result = result.slice(0, -1);
  }
  return result.trimEnd();
}

/** Теги для отбора в админке: план, день, тема, уровень. */
function tagsForDay(day: SourceDay): string[] {
  const tags = [`plan:${day.planId}`, `day:${day.dayIndex}`];
  if (day.level) tags.push(`cefr:${String(day.level).toLowerCase()}`);
  const topic = typeof day.topic?.ru === 'string' ? day.topic.ru.trim() : '';
  if (topic) {
    // 'topic:' занимает 6 байт из бюджета тега.
    const room = TOURNAMENT_TASK_LIMITS.tagBytes - Buffer.byteLength('topic:', 'utf8');
    const trimmed = truncateToBytes(topic, room);
    if (trimmed) tags.push(`topic:${trimmed}`);
  }
  return tags;
}

// ── Нормализация ────────────────────────────────────────────────────────────

/** Токены фразы — той же логикой, что рантайм словосборки: без хвостовой пунктуации. */
export function phraseTokens(english: string): string[] {
  return english
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+$/gu, ''))
    .filter((token) => token.length > 0);
}

function normalizedRu(phrase: SourcePhrase): string {
  return typeof phrase.meaning?.ru === 'string' ? phrase.meaning.ru.trim() : '';
}

/** Годна ли фраза как сырьё: есть английский и русский перевод. */
function isUsablePhrase(phrase: SourcePhrase): boolean {
  return Boolean(phrase?.id)
    && typeof phrase.english === 'string'
    && phrase.english.trim().length > 0
    && normalizedRu(phrase).length > 0;
}

function taskId(kind: GeneratableKind, day: SourceDay, phraseId: string): string {
  // Плоский стабильный id: повторная генерация перезапишет то же задание.
  return `${kind}_${day.planId}_${day.dayIndex}_${phraseId}`.replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 160);
}

// ── Сборка: choice ──────────────────────────────────────────────────────────

/**
 * «Как переводится фраза?» — 1 верный перевод + 3 чужих перевода того же дня.
 * Дистракторы берём из соседних фраз дня: они той же темы и уровня, поэтому
 * выбор неочевиден (чужой перевод из другого плана был бы слишком лёгким).
 */
function buildChoiceTask(
  day: SourceDay,
  phrase: SourcePhrase,
  pool: readonly SourcePhrase[],
  verified: boolean,
): TournamentTask | null {
  const correct = normalizedRu(phrase);
  const seen = new Set([correct.toLowerCase()]);
  const distractors: string[] = [];

  for (const candidate of seededShuffle(pool, `choice:${phrase.id}`)) {
    if (candidate.id === phrase.id) continue;
    const meaning = normalizedRu(candidate);
    const key = meaning.toLowerCase();
    if (!meaning || seen.has(key)) continue;
    seen.add(key);
    distractors.push(meaning);
    if (distractors.length === CHOICE_OPTIONS - 1) break;
  }
  if (distractors.length < CHOICE_OPTIONS - 1) return null;

  const options = seededShuffle([correct, ...distractors], `options:${phrase.id}`);
  const correctIndex = options.indexOf(correct);
  if (correctIndex < 0) return null;

  return {
    taskId: taskId('choice', day, phrase.id),
    mode: TOURNAMENT_MODES.choice,
    isVoice: false,
    difficulty: difficultyForDay(day),
    payload: { phrase: phrase.english.trim(), options, correctIndex },
    tags: tagsForDay(day),
    verified,
  };
}

// ── Сборка: translate ───────────────────────────────────────────────────────

/**
 * «Собери фразу из слов» — токены фразы + отвлекающие слова. Дистракторы берём
 * из авторской разметки words[].distractors (тот же класс слова), поэтому банк
 * выглядит осмысленно, а не случайным набором.
 */
function buildTranslateTask(
  day: SourceDay,
  phrase: SourcePhrase,
  verified: boolean,
): TournamentTask | null {
  const correctTokens = phraseTokens(phrase.english);
  if (correctTokens.length < 2 || correctTokens.length > 12) return null;

  const lower = new Set(correctTokens.map((token) => token.toLowerCase()));
  const extras: string[] = [];
  const authored = (phrase.words ?? []).flatMap((word) => word.distractors ?? []);

  for (const candidate of seededShuffle(authored, `bank:${phrase.id}`)) {
    const token = String(candidate ?? '').trim();
    const key = token.toLowerCase();
    if (!token || lower.has(key)) continue;
    lower.add(key);
    extras.push(token);
    // Банк заметно больше фразы превращает сборку в поиск, а не в грамматику.
    if (extras.length >= Math.min(4, correctTokens.length)) break;
  }
  if (extras.length === 0) return null;

  const wordBank = seededShuffle([...correctTokens, ...extras], `shuffle:${phrase.id}`);

  return {
    taskId: taskId('translate', day, phrase.id),
    mode: TOURNAMENT_MODES.translate,
    isVoice: false,
    difficulty: difficultyForDay(day),
    payload: {
      phrase: normalizedRu(phrase),
      wordBank,
      correctTokens,
      correctAnswer: phrase.english.trim(),
    },
    tags: tagsForDay(day),
    verified,
  };
}

// ── Сборка: timeattack ──────────────────────────────────────────────────────

/**
 * Серия коротких вопросов на 60 секунд. Один сет = один день плана: тема
 * общая, поэтому серия читается как связный блок, а не винегрет.
 */
function buildTimeattackTask(
  day: SourceDay,
  phrases: readonly SourcePhrase[],
  itemCount: number,
  verified: boolean,
): TournamentTask | null {
  const usable = phrases.filter(isUsablePhrase);
  if (usable.length < Math.max(2, Math.min(itemCount, MIN_PHRASES_FOR_CHOICE))) return null;

  const picked = seededShuffle(usable, `ta:${day.planId}:${day.dayIndex}`).slice(0, itemCount);
  const items: Record<string, unknown>[] = [];

  for (const phrase of picked) {
    const correct = normalizedRu(phrase);
    const seen = new Set([correct.toLowerCase()]);
    const options: string[] = [correct];

    for (const candidate of seededShuffle(usable, `ta-opt:${phrase.id}`)) {
      if (candidate.id === phrase.id) continue;
      const meaning = normalizedRu(candidate);
      const key = meaning.toLowerCase();
      if (!meaning || seen.has(key)) continue;
      seen.add(key);
      options.push(meaning);
      if (options.length === 3) break; // короткие вопросы — 3 варианта
    }
    if (options.length < 2) continue;

    const shuffled = seededShuffle(options, `ta-shuffle:${phrase.id}`);
    items.push({
      prompt: phrase.english.trim(),
      options: shuffled,
      correctIndex: shuffled.indexOf(correct),
    });
  }
  if (items.length < 2) return null;

  const topic = typeof day.topic?.ru === 'string' ? day.topic.ru.trim() : '';
  return {
    taskId: `timeattack_${day.planId}_${day.dayIndex}`.replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 160),
    mode: TOURNAMENT_MODES.timeattack,
    isVoice: false,
    difficulty: difficultyForDay(day),
    payload: {
      prompt: topic ? `Переведи: ${topic}`.slice(0, 200) : 'Переведи как можно больше',
      items,
    },
    tags: tagsForDay(day),
    verified,
  };
}

// ── Публичный вход ──────────────────────────────────────────────────────────

export type GenerationStats = {
  readonly daysSeen: number;
  readonly phrasesSeen: number;
  readonly produced: number;
  readonly rejected: number;
  readonly byKind: Readonly<Record<GeneratableKind, number>>;
};

export type GenerationResult = {
  readonly tasks: readonly TournamentTask[];
  readonly stats: GenerationStats;
};

/**
 * Собирает задания турнира из дней авторского контента.
 *
 * Каждое задание перед выдачей прогоняется через тот же validateTournamentTask,
 * которым сервер проверяет пул: в админку не может попасть задание, которое
 * потом молча выпадет из выборки или отменит комнату.
 */
export function generateTournamentTasks(
  days: readonly SourceDay[],
  options: GeneratorOptions = {},
): GenerationResult {
  const kinds = options.kinds?.length ? options.kinds : GENERATABLE_KINDS;
  const verified = options.verified === true;
  const itemCount = Math.max(2, Math.min(8, options.timeattackItems ?? DEFAULT_TIMEATTACK_ITEMS));
  const limit = options.limit && options.limit > 0 ? options.limit : Number.POSITIVE_INFINITY;

  const tasks: TournamentTask[] = [];
  const byKind: Record<GeneratableKind, number> = { choice: 0, translate: 0, timeattack: 0 };
  let phrasesSeen = 0;
  let rejected = 0;

  const push = (task: TournamentTask | null, kind: GeneratableKind): boolean => {
    if (!task) { rejected += 1; return true; }
    // зачем: validateTournamentTask отбраковывает всё с verified !== true —
    // это гейт пула на выборке в комнату, а не проверка формы. Черновики на
    // ревью обязаны иметь verified: false, поэтому форму проверяем на
    // опубликованной копии: иначе генератор отбрасывал бы сам себя.
    if (!validateTournamentTask({ ...task, verified: true }).ok) { rejected += 1; return true; }
    tasks.push(task);
    byKind[kind] += 1;
    return tasks.length < limit;
  };

  outer:
  for (const day of days) {
    const usable = (day.phrases ?? []).filter(isUsablePhrase);
    phrasesSeen += usable.length;

    if (kinds.includes('timeattack')) {
      if (!push(buildTimeattackTask(day, usable, itemCount, verified), 'timeattack')) break outer;
    }

    for (const phrase of usable) {
      if (kinds.includes('choice') && usable.length >= MIN_PHRASES_FOR_CHOICE) {
        if (!push(buildChoiceTask(day, phrase, usable, verified), 'choice')) break outer;
      }
      if (kinds.includes('translate')) {
        if (!push(buildTranslateTask(day, phrase, verified), 'translate')) break outer;
      }
    }
  }

  return {
    tasks,
    stats: {
      daysSeen: days.length,
      phrasesSeen,
      produced: tasks.length,
      rejected,
      byKind,
    },
  };
}
