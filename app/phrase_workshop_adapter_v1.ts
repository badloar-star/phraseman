// зачем (владелец 25.10, «Мастерская фраз»; координатор: «режим на движке lesson1 через новый источник данных»):
// превращает фразы из локального банка урока V2 в LessonPhrase — формат, который уже умеет собирать плитки,
// проверять ответ, показывать 50/50 и «Устно». Чистая функция без AsyncStorage и React: тестируется в node.
// Не придумывает контент: только перекладывает фразу, перевод, порядок слов и лишние слова из банка.
import type { LessonPhrase, LessonWord } from './lesson_data_types';
import type { LearningV2LessonBankPhraseV1 } from './learning_v2_lesson_phrase_bank_core_v1';
import { learningV2LessonBankIdentityV1 } from './learning_v2_lesson_phrase_bank_core_v1';

/** Сколько фраз в одном проходе (как в старом курсе — FULL_LESSON_TOTAL). */
export const PHRASE_WORKSHOP_ROUND_SIZE = 50;
/** Сколько неверных плиток на слово показывает движок (как в старом курсе). */
const DISTRACTORS_PER_WORD = 5;

/** Стабильный короткий id из нормализованной фразы: одна фраза — один id между запусками. */
export function phraseWorkshopPhraseId(phrase: Pick<LearningV2LessonBankPhraseV1, 'targetPhrase'>): string {
  const text = learningV2LessonBankIdentityV1(phrase);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return `v2wk_${hash.toString(36)}`;
}

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Лишние слова для слота: окно из общего списка фразы со сдвигом по номеру слота, без совпадений с самим словом. */
export function phraseWorkshopSlotDistractors(token: string, pool: readonly string[], slotIndex: number): string[] {
  const own = token.trim().toLocaleLowerCase('en');
  const unique = pool.filter((word, index) => word.trim().toLocaleLowerCase('en') !== own
    && pool.findIndex((other) => other.trim().toLocaleLowerCase('en') === word.trim().toLocaleLowerCase('en')) === index);
  if (unique.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < Math.min(DISTRACTORS_PER_WORD, unique.length); i += 1) out.push(unique[(slotIndex + i) % unique.length]);
  return out;
}

function pick(meaning: Readonly<Record<string, string>>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meaning[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

export function phraseWorkshopToLessonPhrase(entry: LearningV2LessonBankPhraseV1): LessonPhrase {
  const words: LessonWord[] = entry.tokens.map((text, index) => ({
    text,
    correct: text,
    distractors: phraseWorkshopSlotDistractors(text, entry.distractors, index),
  }));
  const sourceLocales: NonNullable<LessonPhrase['sourceLocales']> = {};
  for (const locale of ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    const value = pick(entry.meaning, locale);
    if (value) sourceLocales[locale] = value;
  }
  return {
    id: phraseWorkshopPhraseId(entry),
    english: entry.targetPhrase,
    // русского/украинского нет — показываем то, что есть, а не пустую строку (экран не должен быть без подсказки)
    russian: pick(entry.meaning, 'ru', 'en') ?? entry.targetPhrase,
    ukrainian: pick(entry.meaning, 'uk', 'ru', 'en') ?? entry.targetPhrase,
    spanish: pick(entry.meaning, 'es'),
    sourceLocales,
    words,
  };
}

/**
 * Один проход мастерской: фразы банка в случайном, но воспроизводимом порядке (seed — номер прохода),
 * не больше PHRASE_WORKSHOP_ROUND_SIZE. Пустой банк даёт пустой список — решать «закрыто» должна модель входа.
 */
export function phraseWorkshopRound(
  bank: readonly LearningV2LessonBankPhraseV1[],
  seed: number,
  size: number = PHRASE_WORKSHOP_ROUND_SIZE,
): LessonPhrase[] {
  const order = bank.map((_, index) => index);
  const random = seededRandom(Math.trunc(seed) || 1);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, Math.max(0, size)).map((index) => phraseWorkshopToLessonPhrase(bank[index]));
}
