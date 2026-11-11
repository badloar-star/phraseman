/**
 * Экзамен уровня: сборка заданий новых механик ИЗ ФРАЗ УРОКОВ.
 *
 * зачем (владелец 11.11.2026): «в экзаменах использовались фразы, которые встречались в уроках» и новые
 * механики Пика. Готовый пул Пика для экзамена не годится — он написан отдельно от уроков. Поэтому каждое
 * задание здесь строится из фразы урока и её перевода.
 *
 * Из фраз строятся семь механик — те, которым хватает одной-двух фраз. Остальным пяти (ответ в диалоге, порядок
 * реплик, пары вопрос–ответ, разложи по группам, найди ответ в тексте) нужны диалоги и тексты; их владелец велел
 * «писать отдельно» — они лежат в авторском банке app/level_exam_authored_bank.ts.
 *
 * Главное правило то же, что у пропуска (U10): неверный вариант обязан быть ДОКАЗУЕМО неверным. Ошибочное
 * слово берётся только из `gaps` — это результат правил грамматики app/level_exam_gap_rules.ts, где соблазн
 * неверен в этом месте фразы по правилу, а не «скорее всего». Фраза без доказуемого соблазна в задания
 * с ошибкой не идёт. Модуль чистый: ни данных курса, ни React — зёрна ему даёт level_exam_blueprint.
 */
import type { ExpandedExercise, ExpandedFormat } from '../modules/expanded-formats/types';
import { parseExpandedExercise } from '../modules/expanded-formats/validate';
import { levelExamExpandedCopy } from './level_exam_expanded_copy';
import { createLevelExamRng, shuffled } from './level_exam_rng';

/** Механики, которые строятся из фраз уроков. */
export const PHRASE_BUILT_FORMATS = [
  'word_repair', 'remove_intruder', 'sentence_build_noise', 'typed_word', 'linked_gaps', 'sentence_transform', 'multi_select',
] as const satisfies readonly ExpandedFormat[];
export type PhraseBuiltFormat = (typeof PHRASE_BUILT_FORMATS)[number];

/** Слово фразы, которое однозначно определяется правилом, и три доказуемо неверных замены. */
export type ExpandedSeedGap = Readonly<{ answer: string; distractors: readonly string[] }>;

/** Фраза урока, из которой строится задание. */
export type ExpandedSeed = Readonly<{
  lessonId: number;
  phraseId: string;
  /** Фраза на изучаемом языке. */
  english: string;
  /** Перевод на язык ученика. */
  sourceText: string;
  /** Принятые в уроке другие верные варианты фразы. */
  alternatives: readonly string[];
  /** Все доказуемые пропуски фразы — по разным словам. */
  gaps: readonly ExpandedSeedGap[];
}>;

export type ExpandedExamDraft = Readonly<{
  format: ExpandedFormat;
  instruction: string;
  prompt: string;
  context: string;
  exercise: ExpandedExercise;
}>;

/** Сколько фраз нужно механике и сколько доказуемых пропусков у каждой. */
export const EXPANDED_SEED_NEEDS: Readonly<Record<PhraseBuiltFormat, Readonly<{ seeds: number; gaps: number }>>> = {
  word_repair: { seeds: 1, gaps: 1 },
  remove_intruder: { seeds: 1, gaps: 1 },
  sentence_build_noise: { seeds: 1, gaps: 1 },
  typed_word: { seeds: 1, gaps: 1 },
  linked_gaps: { seeds: 1, gaps: 2 },
  sentence_transform: { seeds: 1, gaps: 0 },
  multi_select: { seeds: 2, gaps: 1 },
};

const MAX_BUILD_WORDS = 8;
const MAX_TRANSFORM_WORDS = 7;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu;

function bare(token: string): string {
  return token.replace(EDGE_PUNCTUATION, '').replace(/[’`]/g, "'").toLocaleLowerCase('en');
}

function tokensOf(sentence: string): string[] {
  return sentence.trim().split(/\s+/u).filter(Boolean);
}

/** Позиция слова во фразе; -1, если слова нет или оно встречается дважды. */
function soleIndex(tokens: readonly string[], word: string): number {
  const key = bare(word);
  const hits = tokens.flatMap((token, index) => (bare(token) === key ? [index] : []));
  return hits.length === 1 ? hits[0] : -1;
}

/** Слово `replacement` на месте токена: сохраняет знаки вокруг и заглавную букву начала фразы. */
function dressLike(original: string, replacement: string, first: boolean): string {
  const lead = original.match(/^[^\p{L}\p{N}']*/u)?.[0] ?? '';
  const tail = original.match(/[^\p{L}\p{N}']*$/u)?.[0] ?? '';
  const core = original.slice(lead.length, original.length - tail.length);
  const word = first && /^\p{Lu}/u.test(core) ? replacement.charAt(0).toLocaleUpperCase('en') + replacement.slice(1) : replacement;
  return `${lead}${word}${tail}`;
}

/** Фраза с одним словом, заменённым на другое (знаки и заглавная буква сохраняются); null — слова нет или оно повторяется. */
export function swapPhraseWord(sentence: string, answer: string, replacement: string): string | null {
  return swapWord(sentence, answer, replacement);
}

function swapWord(sentence: string, answer: string, replacement: string): string | null {
  const tokens = tokensOf(sentence);
  const at = soleIndex(tokens, answer);
  if (at < 0) return null;
  return tokens.map((token, index) => (index === at ? dressLike(token, replacement, index === 0) : token)).join(' ');
}

function withGap(sentence: string, answers: readonly string[]): string | null {
  const tokens = tokensOf(sentence);
  const positions = answers.map((answer) => soleIndex(tokens, answer));
  if (positions.some((at) => at < 0) || new Set(positions).size !== positions.length) return null;
  return tokens.map((token, index) => (positions.includes(index) ? dressLike(token, '___', false) : token)).join(' ');
}

type Built = Readonly<{ format: ExpandedFormat; prompt: string; context: string; exercise: ExpandedExercise }>;

function strict(format: ExpandedFormat, raw: Record<string, unknown>, prompt: string, context: string): Built | null {
  const parsed = parseExpandedExercise(format, raw, 'en');
  return parsed.ok ? { format, prompt, context, exercise: parsed.exercise } : null;
}

function buildOne(format: PhraseBuiltFormat, seeds: readonly ExpandedSeed[], seedKey: string): Built | null {
  const rng = (salt: string) => createLevelExamRng(`${seedKey}:${salt}`);
  const main = seeds[0];
  const gap = main.gaps[0];
  const sentence = main.english.trim();

  switch (format) {
    case 'word_repair': {
      if (!gap) return null;
      const broken = swapWord(sentence, gap.answer, gap.distractors[0]);
      if (!broken) return null;
      const at = soleIndex(tokensOf(sentence), gap.answer);
      const replacements = shuffled([gap.answer, ...gap.distractors.slice(1, 3)], rng('replacements'));
      return strict(format, { words: tokensOf(broken), replacements, key: { word: at, replacement: replacements.indexOf(gap.answer) } }, broken, main.sourceText);
    }
    case 'remove_intruder': {
      if (!gap) return null;
      const tokens = tokensOf(sentence);
      const at = soleIndex(tokens, gap.answer);
      const intruder = gap.distractors[0];
      // зачем: лишнее слово, совпавшее с соседом («to to»), можно убрать двумя способами — такое задание не выдаём
      if (at < 0 || tokens.some((token) => bare(token) === bare(intruder))) return null;
      const last = tokens.length - 1;
      if (at === 0 && at === last) return null;
      // зачем: в начало фразы лишнее не ставим (пришлось бы менять заглавную букву — это выдаёт вставку),
      // после последнего слова тоже (точка осталась бы посреди фразы); в середине сторона — по сиду попытки
      const before = at === last || (at > 0 && rng('side')() < 0.5);
      const words = before
        ? [...tokens.slice(0, at), intruder, ...tokens.slice(at)]
        : [...tokens.slice(0, at + 1), intruder, ...tokens.slice(at + 1)];
      return strict(format, { words, key: before ? at : at + 1 }, words.join(' '), main.sourceText);
    }
    case 'sentence_build_noise': {
      if (!gap) return null;
      const words = tokensOf(sentence).map((token) => token.replace(EDGE_PUNCTUATION, '')).filter(Boolean);
      if (words.length < 2 || words.length > MAX_BUILD_WORDS) return null;
      const tiles = [...words.map((text, index) => ({ text, at: index })), ...gap.distractors.slice(0, 2).map((text) => ({ text, at: -1 }))];
      const bank = shuffled(tiles, rng('bank'));
      const key = words.map((_word, index) => bank.findIndex((tile) => tile.at === index));
      return strict(format, { bank: bank.map((tile) => tile.text), need: words.length, key }, main.sourceText, '');
    }
    case 'typed_word': {
      if (!gap) return null;
      const prompt = withGap(sentence, [gap.answer]);
      return prompt ? strict(format, { acceptedAnswers: [gap.answer] }, prompt, main.sourceText) : null;
    }
    case 'linked_gaps': {
      const [first, second] = main.gaps;
      if (!first || !second) return null;
      const prompt = withGap(sentence, [first.answer, second.answer]);
      if (!prompt) return null;
      const tokens = tokensOf(sentence);
      // зачем: пропуски нумеруются слева направо, как их видит ученик
      const ordered = [first, second].sort((a, b) => soleIndex(tokens, a.answer) - soleIndex(tokens, b.answer));
      const slots = ordered.map((item, slot) => shuffled([item.answer, ...item.distractors.slice(0, 2)], rng(`slot${slot}`)));
      return strict(format, { slots, key: ordered.map((item, slot) => slots[slot].indexOf(item.answer)) }, prompt, main.sourceText);
    }
    case 'sentence_transform': {
      if (tokensOf(sentence).length > MAX_TRANSFORM_WORDS) return null;
      return strict(format, { acceptedAnswers: [sentence, ...main.alternatives] }, main.sourceText, '');
    }
    case 'multi_select': {
      const pair = seeds.slice(0, 2);
      const wrong = pair.map((seed) => (seed.gaps[0] ? swapWord(seed.english.trim(), seed.gaps[0].answer, seed.gaps[0].distractors[0]) : null));
      if (wrong.some((value) => value === null)) return null;
      const right = pair.map((seed) => seed.english.trim());
      const options = shuffled([...right, ...(wrong as string[])], rng('options'));
      return strict(format, { options, key: right.map((value) => options.indexOf(value)) }, '', '');
    }
  }
}

/**
 * Задание механики `format` из фраз `seeds`. `null` — из этих фраз честное задание не собрать
 * (слово повторяется во фразе, фраза слишком длинная, варианты совпали) — вызывающий берёт другие фразы.
 */
export function buildExpandedExamDraft(
  format: PhraseBuiltFormat,
  seeds: readonly ExpandedSeed[],
  seedKey: string,
  sourceLocale: string,
): ExpandedExamDraft | null {
  if (seeds.length < EXPANDED_SEED_NEEDS[format].seeds) return null;
  const built = buildOne(format, seeds, seedKey);
  if (!built) return null;
  const copy = levelExamExpandedCopy(sourceLocale);
  return {
    format,
    instruction: copy.instruction[format],
    prompt: built.prompt || (format === 'multi_select' ? copy.prompt.multi_select : ''),
    context: built.context,
    exercise: built.exercise,
  };
}

// зачем: файл лежит в app/ — expo-router ждёт экспорт по умолчанию у каждого файла (как у level_exam_gap_rules)
export default function __RouteShim() { return null; }
