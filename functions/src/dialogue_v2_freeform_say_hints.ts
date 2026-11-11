// dialogue_v2_freeform_say_hints.ts — готовые ответы «Можно сказать…» в свободном разговоре.
// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»;
// решение владельца 11.11 «Да, сделай» — перевести и свободный разговор на ответы от ИИ): заготовленный набор на телефоне не
// может ответить на произвольную реплику ИИ. Ответы пишет та же модель ТЕМ ЖЕ вызовом, что и реплику (второго платного запроса
// нет): после реплики идёт строка-метка и две строки «фраза | перевод». Сервер отрезает этот хвост — в ленту, в журнал сессии
// и в историю для модели уходит только сама реплика. Формат строками, а не JSON: свободный разговор отдаёт простой текст, и не
// у каждой разрешённой модели есть JSON-режим. Модуль чистый: ни сети, ни хранилища.
import { leaksPrivatePrompt } from './dialogue_prompt_injection';

export type DialogueV2FreeformSayHint = Readonly<{
  /** Фраза на языке изучения — её ученик отправит как свою реплику. */
  text: string;
  /** Перевод на язык интерфейса; null — модель его не дала или язык интерфейса совпал с изучаемым. */
  meaning: string | null;
}>;

export const DIALOGUE_V2_FREEFORM_SAY_HINTS_MARKER = '###HINTS###' as const;
/** Сколько готовых ответов просим и сколько принимаем (как в сценариях). */
export const DIALOGUE_V2_FREEFORM_SAY_HINTS_REQUESTED = 2 as const;
export const DIALOGUE_V2_FREEFORM_SAY_HINTS_MAX = 3 as const;

const MAX_HINT_LENGTH = 120;
const MAX_MEANING_LENGTH = 200;
const UNSAFE_TEXT_RE = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/u;
// Метку ищем терпимо: модель может поставить пробелы или другое число решёток.
const MARKER_RE = /\s*#{2,}\s*HINTS\s*#{2,}\s*/iu;
const LIST_PREFIX_RE = /^\s*(?:[-*•–]|\d+[.)])\s*/u;
const SENTENCE_END_RE = /[.!?…。！？]["'»”’)]*$/u;

const LANGUAGE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  ru: 'Russian',
  uk: 'Ukrainian',
  en: 'English',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  fr: 'French',
  de: 'German',
});

/** Язык интерфейса, на который умеем переводить готовые ответы; иначе null. */
export function dialogueV2FreeformSayHintsLanguage(value: unknown): string | null {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, value) ? value : null;
}

/**
 * Постоянные фразы инструкции (без названий языков): по ним ответ модели проверяется на утечку служебного текста —
 * так же, как остальные фразы закрытой инструкции свободного разговора.
 */
export const DIALOGUE_V2_FREEFORM_SAY_HINTS_FIXED_SENTENCES: readonly string[] = Object.freeze([
  `Exception to the previous rule: after the chat message, add a new line containing exactly ${DIALOGUE_V2_FREEFORM_SAY_HINTS_MARKER} and then exactly ${DIALOGUE_V2_FREEFORM_SAY_HINTS_REQUESTED} more lines.`,
  'Each of those lines is one different, short, ready-to-send message the learner could send next (max 10 words) that directly answers the chat message you just wrote: if it asks a question, the line answers that question.',
  'Use concrete words instead of placeholders or brackets, avoid forms that depend on the speaker\'s gender, and never repeat your own chat message back.',
  'Earlier assistant messages in this conversation are stored without that block; add it every time anyway and never mention it in the chat message.',
]);

/** Добавка к закрытой инструкции хода, когда клиент попросил готовые ответы. */
export function dialogueV2FreeformSayHintsInstruction(input: Readonly<{
  studyLanguageName: string;
  studyTarget: string;
  hintsLang: string;
}>): string {
  const translated = input.hintsLang !== input.studyTarget;
  return [
    ...DIALOGUE_V2_FREEFORM_SAY_HINTS_FIXED_SENTENCES,
    translated
      ? `Write each of those lines as: the ${input.studyLanguageName} sentence, then " | ", then its faithful ${LANGUAGE_NAMES[input.hintsLang] ?? 'English'} translation.`
      : `Write each of those lines in ${input.studyLanguageName} only, with no translation.`,
  ].join(' ');
}

function comparable(text: string): string {
  return text.toLocaleLowerCase().replace(/[\s.,!?¡¿…'"’«»“”]+/gu, ' ').trim();
}

function cleanPart(value: string, maxLength: number): string | null {
  const text = value.trim().replace(/^["'«“]+|["'»”]+$/gu, '').trim();
  return text.length >= 1 && text.length <= maxLength && !UNSAFE_TEXT_RE.test(text) ? text : null;
}

export type DialogueV2FreeformSayHintsSplit = Readonly<{
  /** Реплика для ленты — без хвоста с готовыми ответами. Метки нет — исходный текст как есть. */
  message: string;
  hints: readonly DialogueV2FreeformSayHint[];
  /** Модель поставила метку. */
  marker: boolean;
  /** Сколько строк после метки не прошло проверку. */
  rejected: number;
}>;

/**
 * Отделить реплику от хвоста с готовыми ответами. Каждая строка проверяется отдельно: негодная выбрасывается, остальные
 * остаются. Строка без конца предложения — признак обрыва по лимиту токенов, её не берём.
 */
export function splitDialogueV2FreeformSayHints(
  raw: string,
  options: Readonly<{ studyTarget: string; hintsLang: string }>,
): DialogueV2FreeformSayHintsSplit {
  const found = MARKER_RE.exec(raw);
  if (!found) return Object.freeze({ message: raw, hints: Object.freeze([]), marker: false, rejected: 0 });
  const message = raw.slice(0, found.index).trim();
  const lines = raw.slice(found.index + found[0].length).split('\n').map((line) => line.trim()).filter(Boolean);
  const sameLanguage = options.hintsLang === options.studyTarget;
  const seen = new Set([comparable(message)]);
  const hints: DialogueV2FreeformSayHint[] = [];
  let rejected = 0;
  for (const line of lines) {
    if (hints.length >= DIALOGUE_V2_FREEFORM_SAY_HINTS_MAX) break;
    const body = line.replace(LIST_PREFIX_RE, '');
    const bar = body.indexOf('|');
    const text = cleanPart(bar < 0 ? body : body.slice(0, bar), MAX_HINT_LENGTH);
    const key = text ? comparable(text) : '';
    if (!text || !key || seen.has(key) || !SENTENCE_END_RE.test(text) || leaksPrivatePrompt(body) || MARKER_RE.test(body)) {
      rejected += 1;
      continue;
    }
    seen.add(key);
    const meaning = sameLanguage || bar < 0 ? null : cleanPart(body.slice(bar + 1), MAX_MEANING_LENGTH);
    hints.push(Object.freeze({ text, meaning }));
  }
  return Object.freeze({ message, hints: Object.freeze(hints), marker: true, rejected });
}
