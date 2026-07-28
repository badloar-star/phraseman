// ═══════════════════════════════════════════════════════════════════════════
// tournament_ai_kind_items.ts — валидация ответа модели и конверсия в задание
// пула для КАЖДОГО из четырёх типов.
//
// зачем: у типов разные контракты. Три choice-типа дают 4 варианта и индекс
// верного; сборка фразы — эталон, токены и приманки, причём сервер сверяет
// порядок токенов точно (tournament_core.verifyTournamentAnswer). Общая
// валидация тут не годится: она пропустила бы «собери фразу» с токенами не в
// том порядке, и игрок не смог бы ответить правильно НИКАК.
//
// Модуль ЧИСТЫЙ: ни сети, ни Firestore — валидация и конверсия. Поэтому
// каждый тип моделируется в тестах фейковым ответом без единого вызова OpenAI.
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import type { TournamentTask } from './tournament_core';
import { TOURNAMENT_TASK_LIMITS, validateTournamentTask } from './tournament_core';
import { KIND_TO_FORMAT, KIND_TO_MODE, type TournamentAiKind } from './tournament_ai_blueprint';

const CHOICE_OPTIONS = 4;
const SCENARIO_MAX_CHARS = 48;
const RULE_NOTE_MAX_BYTES = 500;
const EXAMPLE_MAX_BYTES = 500;
const MIN_ASSEMBLY_TOKENS = 4;
const MAX_ASSEMBLY_TOKENS = 12;
const MIN_DECOYS = 2;
const MAX_DECOYS = 4;

// ── Общие помощники ─────────────────────────────────────────────────────────

const HAS_LATIN = /[a-z]/i;
const HAS_CYRILLIC = /[а-яё]/i;
const OPTION_LABEL_PREFIX = /^[A-DА-Г][).:]\s/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

export function normalizedText(value: unknown): string {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
}

/** Медиана — для проверки «правильный ответ не выдаётся длиной». */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Порог мягкий: жёсткий бракует честные вопросы с объективно коротким ответом. */
function lengthGiveaway(options: readonly string[], correctIndex: number): boolean {
  const correctLen = options[correctIndex].length;
  const others = options.filter((_, i) => i !== correctIndex).map((option) => option.length);
  const mid = median(others);
  return Math.abs(correctLen - mid) > Math.max(10, mid * 0.6);
}

// ── Разобранное задание ─────────────────────────────────────────────────────

export type ParsedKindItem = {
  readonly kind: TournamentAiKind;
  /** Условие, которое видит игрок (русская сцена / англ. фраза с ___). */
  readonly prompt: string;
  /** choice: четыре варианта. assembly: банк слов (токены + приманки). */
  readonly options: readonly string[];
  /** choice: индекс верного. assembly: -1 (не применимо). */
  readonly correctIndex: number;
  /** choice: текст верного. assembly: эталонная фраза целиком. */
  readonly correctAnswer: string;
  /** assembly: точный порядок слов ответа. choice: пусто. */
  readonly correctTokens: readonly string[];
  readonly scenario: string;
  readonly ruleNote: string;
  readonly example: string;
};

export type KindItemResult =
  | { readonly ok: true; readonly item: ParsedKindItem }
  | { readonly ok: false; readonly errors: readonly string[] };

// ── Валидация одного задания ────────────────────────────────────────────────

/**
 * Разбирает и проверяет ОДНО задание нужного типа.
 *
 * Ошибки возвращаются списком, а не бросаются: вызывающий отсеивает плохие
 * поштучно и сохраняет остальные — иначе один брак ронял бы весь оплаченный
 * запрос (жалоба владельца «0 вопросов, деньги потрачены»).
 */
export function parseKindItem(raw: unknown, kind: TournamentAiKind): KindItemResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['kind_item_shape_invalid'] };

  const prompt = String(raw.prompt ?? '').trim();
  const scenario = String(raw.scenario ?? '').trim();
  const ruleNote = String(raw.ruleNote ?? '').trim();
  const example = String(raw.example ?? '').trim();

  if (!prompt || bytes(prompt) > TOURNAMENT_TASK_LIMITS.promptBytes) errors.push('kind_prompt_invalid');
  if (!scenario || scenario.length > SCENARIO_MAX_CHARS || !HAS_CYRILLIC.test(scenario)) {
    errors.push('kind_scenario_invalid');
  }
  if (!ruleNote || bytes(ruleNote) > RULE_NOTE_MAX_BYTES) errors.push('kind_rule_note_invalid');
  if (!example || bytes(example) > EXAMPLE_MAX_BYTES || !HAS_LATIN.test(example)) errors.push('kind_example_invalid');

  // Условие каждого типа проверяется отдельно: у «пропущенного слова» обязан
  // быть пропуск, у ситуации — русский текст, у поиска ошибки — инструкция.
  if (kind === 'gap' && !prompt.includes('___')) errors.push('kind_gap_missing_blank');
  if (kind === 'gap' && !HAS_LATIN.test(prompt)) errors.push('kind_gap_prompt_not_english');
  if (kind === 'situation' && !HAS_CYRILLIC.test(prompt)) errors.push('kind_situation_prompt_not_russian');

  return KIND_TO_FORMAT[kind] === 'translate'
    ? parseAssembly(raw, kind, { prompt, scenario, ruleNote, example }, errors)
    : parseChoice(raw, kind, { prompt, scenario, ruleNote, example }, errors);
}

type Common = { prompt: string; scenario: string; ruleNote: string; example: string };

function parseChoice(
  raw: Record<string, unknown>,
  kind: TournamentAiKind,
  common: Common,
  errors: string[],
): KindItemResult {
  const options = Array.isArray(raw.options)
    ? raw.options.map((option) => String(option ?? '').trim())
    : [];
  const correctIndex = Number(raw.correctIndex);
  const correctAnswer = String(raw.correctAnswer ?? '');

  if (options.length !== CHOICE_OPTIONS
    || options.some((option) => !option || bytes(option) > TOURNAMENT_TASK_LIMITS.optionBytes)) {
    errors.push('kind_options_invalid');
  } else {
    if (new Set(options.map(normalizedText)).size !== CHOICE_OPTIONS) errors.push('kind_options_not_unique');
    if (options.some((option) => OPTION_LABEL_PREFIX.test(option))) errors.push('kind_option_label_prefix');

    // Язык вариантов зависит от типа: реплики и «так не говорят» — английские,
    // пропущенное слово — английские фрагменты. Русских опций тут быть не должно.
    if (options.some((option) => !HAS_LATIN.test(option))) errors.push('kind_option_language_invalid');
  }

  const indexValid = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < CHOICE_OPTIONS;
  if (!indexValid) errors.push('kind_correct_index_invalid');

  if (indexValid && options.length === CHOICE_OPTIONS) {
    if (options[correctIndex] !== correctAnswer) errors.push('kind_correct_mismatch');
    if (lengthGiveaway(options, correctIndex)) errors.push('kind_length_giveaway');
  }

  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) };
  return {
    ok: true,
    item: Object.freeze({
      kind,
      prompt: common.prompt,
      options: Object.freeze(options),
      correctIndex,
      correctAnswer,
      correctTokens: Object.freeze([]),
      scenario: common.scenario,
      ruleNote: common.ruleNote,
      example: common.example,
    }),
  };
}

function parseAssembly(
  raw: Record<string, unknown>,
  kind: TournamentAiKind,
  common: Common,
  errors: string[],
): KindItemResult {
  const answer = String(raw.answer ?? '').trim();
  const tokens = Array.isArray(raw.tokens) ? raw.tokens.map((token) => String(token ?? '').trim()) : [];
  const decoys = Array.isArray(raw.decoys) ? raw.decoys.map((decoy) => String(decoy ?? '').trim()) : [];

  if (!answer || !HAS_LATIN.test(answer) || bytes(answer) > TOURNAMENT_TASK_LIMITS.answerBytes) {
    errors.push('kind_answer_invalid');
  }
  if (tokens.length < MIN_ASSEMBLY_TOKENS || tokens.length > MAX_ASSEMBLY_TOKENS
    || tokens.some((token) => !token || bytes(token) > TOURNAMENT_TASK_LIMITS.tokenBytes)) {
    errors.push('kind_tokens_invalid');
  }
  if (decoys.length < MIN_DECOYS || decoys.length > MAX_DECOYS
    || decoys.some((decoy) => !decoy || bytes(decoy) > TOURNAMENT_TASK_LIMITS.tokenBytes)) {
    errors.push('kind_decoys_invalid');
  }

  // КРИТИЧНО: сервер сверяет ПОРЯДОК токенов точно
  // (tournament_core.verifyTournamentAnswer). Если токены не совпадают с
  // фразой, правильно ответить нельзя вообще — задание-ловушка.
  if (answer && tokens.length > 0) {
    const fromAnswer = answer.split(/\s+/).filter(Boolean);
    const sameOrder = fromAnswer.length === tokens.length
      && fromAnswer.every((word, i) => normalizedText(word) === normalizedText(tokens[i]));
    if (!sameOrder) errors.push('kind_tokens_answer_mismatch');
  }

  // Приманка, совпадающая с настоящим словом, делает вопрос нерешаемым:
  // игрок соберёт верную фразу, а лишнее слово останется дубликатом.
  const tokenSet = new Set(tokens.map(normalizedText));
  if (decoys.some((decoy) => tokenSet.has(normalizedText(decoy)))) errors.push('kind_decoy_duplicates_token');
  if (new Set(decoys.map(normalizedText)).size !== decoys.length) errors.push('kind_decoys_not_unique');

  const bankSize = tokens.length + decoys.length;
  if (bankSize > TOURNAMENT_TASK_LIMITS.maxWordBankItems) errors.push('kind_word_bank_too_big');

  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors) };
  return {
    ok: true,
    item: Object.freeze({
      kind,
      prompt: common.prompt,
      // Банк слов перемешиваем детерминированно — иначе ответ читается
      // по порядку слов, и задание решается без знания языка.
      options: Object.freeze(shuffleDeterministic([...tokens, ...decoys], answer)),
      correctIndex: -1,
      correctAnswer: answer,
      correctTokens: Object.freeze(tokens),
      scenario: common.scenario,
      ruleNote: common.ruleNote,
      example: common.example,
    }),
  };
}

/** Тасовка от хэша фразы: одинаковый вход — одинаковый банк, без Math.random. */
function shuffleDeterministic(items: readonly string[], seed: string): string[] {
  return items
    .map((item, index) => ({
      item,
      rank: createHash('sha1').update(`${seed}:${index}:${item}`).digest().readUInt32BE(0),
    }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.item);
}

// ── Конверсия в задание пула ────────────────────────────────────────────────

/** Смысловой отпечаток: одно и то же задание не плодит дубли при перегенерации. */
export function kindItemSemanticKey(item: ParsedKindItem): string {
  const options = [...item.options].map(normalizedText).sort();
  return `${item.kind} ${normalizedText(item.prompt)} ${options.join('|')}`;
}

export function kindItemTaskId(item: ParsedKindItem): string {
  const digest = createHash('sha1').update(kindItemSemanticKey(item)).digest('hex');
  return `ai_${item.kind}_${digest.slice(0, 28)}`;
}

/**
 * Задание пула из разобранного элемента.
 *
 * verified:false намеренно — публикация только руками через ревью в админке.
 * Payload строго по контракту tournament_core: лишние поля валидатор отклонит.
 */
// guard-ok: ниже нет ни одной записи в Firestore — модуль чистый, он лишь
// собирает объект задания. Запись батчами живёт в admin_tournament_tasks.ts.
export function kindItemToTask(
  item: ParsedKindItem,
  params: { readonly level: string; readonly difficulty: number },
): TournamentTask {
  const payload = KIND_TO_FORMAT[item.kind] === 'translate'
    ? {
      phrase: item.prompt,
      wordBank: [...item.options],
      correctTokens: [...item.correctTokens],
      correctAnswer: item.correctAnswer,
    }
    : {
      phrase: item.prompt,
      options: [...item.options],
      correctIndex: item.correctIndex,
      correctAnswer: item.correctAnswer,
    };

  return {
    taskId: kindItemTaskId(item),
    mode: KIND_TO_MODE[item.kind],
    isVoice: false,
    difficulty: params.difficulty,
    payload,
    explanation: {
      ruleNote: item.ruleNote,
      example: item.example,
    },
    tags: [
      'source:ai',
      `kind:${item.kind}`,
      `cefr:${params.level.toLowerCase()}`,
      `topic:${normalizedText(item.scenario).slice(0, 40)}`,
    ],
    verified: false,
  };
}

/** Задание проходит серверный контракт? Проверяем ДО записи в Firestore. */
export function kindTaskPassesServerContract(task: TournamentTask): boolean {
  return validateTournamentTask({ ...task, verified: true }).ok;
}
