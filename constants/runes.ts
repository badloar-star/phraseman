/**
 * runes.ts — единый словарь и глифы валюты «руны».
 *
 * зачем (владелец, 22.08): зарабатываемая валюта (турниры + Арена + Learning V2 +
 * друзья — ОДНА валюта, отдельная от жемчужин) переименована из «звёзд» в «руны»
 * с руническим глифом. Макет: docs/v2/mockups/26-checkpoint-and-runes.html.
 *
 * ВАЖНО: переименование чисто клиентское — тексты и иконка. Поля `stars` в
 * Firestore, серверные контракты и лестница цен 45/50/55/60/65 остаются как есть.
 *
 * НЕ путать со звёздами-оценкой: оценка занятия 1–3 под узлом карты и внутренняя
 * шкала сессии до 36 остаются ЗВЁЗДАМИ (реестр:
 * docs/RUNES_RENAME_REGISTRY_2026-08-23.md, разделы B и C).
 */

import type { Lang } from './i18n';

/**
 * Старший футарк. Настоящие рунические знаки есть в системных шрифтах —
 * ассеты не нужны, вес приложения не растёт.
 */
export const RUNE_GLYPHS = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ',
  'ᛃ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛗ', 'ᛚ', 'ᛜ',
] as const;

/**
 * «Дежурная» руна статичных счётчиков (решение владельца 23.08): в балансе
 * всегда один и тот же глиф, иначе цифра «прыгает» при каждом ре-рендере.
 * Разные глифы — только в анимации начисления.
 */
export const RUNE_GLYPH_PRIMARY = RUNE_GLYPHS[0];

/**
 * Случайная выборка РАЗНЫХ глифов для анимации начисления — прямое требование
 * владельца: «руны каждый раз тянутся разные», а не один повторённый.
 *
 * Тасование Фишера–Йетса по копии: исходный массив неизменяем. Когда просят
 * больше глифов, чем есть в футарке, добор идёт следующим кругом — повтор
 * появляется только после того, как показаны все 15.
 */
export function pickRuneGlyphs(count: number): readonly string[] {
  const total = Math.max(0, Math.trunc(count));
  if (total === 0) return [];
  const out: string[] = [];
  while (out.length < total) {
    const pool = [...RUNE_GLYPHS];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, Math.min(pool.length, total - out.length)));
  }
  return out;
}

/**
 * Склонение слова «руна» по числу.
 *
 * ru/uk/pl — славянская тройка форм (1 руна / 2 руны / 5 рун), остальные языки
 * различают единственное и множественное. Образец взят у `ruStar`
 * (app/learning_v2_session_copy.ts), чтобы формы совпадали со стилем проекта.
 */
type PluralForms = Readonly<{ one: string; few: string; many: string }>;

const RUNE_WORDS: Readonly<Record<string, PluralForms>> = Object.freeze({
  ru: { one: 'руна', few: 'руны', many: 'рун' },
  uk: { one: 'руна', few: 'руни', many: 'рун' },
  en: { one: 'rune', few: 'runes', many: 'runes' },
  pl: { one: 'runa', few: 'runy', many: 'run' },
  es: { one: 'runa', few: 'runas', many: 'runas' },
  'pt-BR': { one: 'runa', few: 'runas', many: 'runas' },
  vi: { one: 'rune', few: 'rune', many: 'rune' },
  id: { one: 'rune', few: 'rune', many: 'rune' },
  tr: { one: 'rün', few: 'rün', many: 'rün' },
});

const SLAVIC_PLURAL = new Set(['ru', 'uk', 'pl']);

/** Форма слова «руна» для числа `value` на языке `lang`. */
export function runeWord(lang: string, value: number): string {
  const forms = RUNE_WORDS[lang] ?? RUNE_WORDS.ru;
  const n = Math.abs(Math.trunc(value));
  if (!SLAVIC_PLURAL.has(lang)) return n === 1 ? forms.one : forms.few;
  // Славянское правило: 11–14 всегда «рун», иначе смотрим последнюю цифру.
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms.many;
  const mod10 = n % 10;
  if (mod10 === 1) return forms.one;
  if (mod10 >= 2 && mod10 <= 4) return forms.few;
  return forms.many;
}

/** «12 рун» / «1 руна» — число со склонённым словом. */
export function runeAmount(lang: string, value: number): string {
  return `${value} ${runeWord(lang, value)}`;
}

/** Родительный/предметный вариант для оборотов «накопить N рун». */
export function runesLabel(lang: Lang | string): string {
  return (RUNE_WORDS[lang] ?? RUNE_WORDS.ru).many;
}
