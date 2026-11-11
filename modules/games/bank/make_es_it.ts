/**
 * Сборщики заданий для банков испанского и итальянского курсов (D207).
 * зачем: в исходнике задание пишется так, как его читает человек (лишнее слово в скобках, ошибка как
 * `{неверно>верно}`), а индексы считает код — так нельзя ошибиться на единицу и пометить не то слово.
 * Проверка банков: tests/game_task_bank_es_it.test.ts.
 */
import type { HuntLine, HuntTask, OrderTask } from '../dialogue_core';
import type { OddWordTask } from '../odd_word_core';
import type { QuizRound } from '../quiz_core';
import type { SortBin, SortDeck, SortSide } from '../sort_core';

export type BankLang = 'es' | 'it';
export type SortCard = readonly [text: string, side: SortSide, hint: string];
export type MemoryPair = readonly [word: string, translation: string];

const PUNCTUATION = /[¿?¡!.,]/g;
const key = (prefix: string, lang: BankLang, lesson: number): string => `${prefix}-${lang}-l${String(lesson).padStart(2, '0')}`;

/** Вставить верный вариант на место `at` среди неверных. */
function placed(correct: string, wrong: readonly string[], at: number): { options: string[]; correctIndex: number } {
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  return { options: [...wrong.slice(0, correctIndex), correct, ...wrong.slice(correctIndex)], correctIndex };
}

/** «Лишнее слово»: лишнее помечено скобками — `Ella [estoy] está en casa`. */
export function oddTask(lang: BankLang, lesson: number, n: number, marked: string, translation: string, whyText: string): OddWordTask {
  const raw = marked.split(' ');
  const extraIndex = raw.findIndex((w) => w.startsWith('['));
  const words = raw.map((w) => w.replace(/[[\]]/g, ''));
  const extra = (words[extraIndex] ?? '').replace(PUNCTUATION, '');
  return { id: `${key('ow', lang, lesson)}-${n}`, words, extraIndex, translation, whyTitle: `«${extra}» здесь лишнее`, whyText };
}

export function sortDeck(lang: BankLang, lesson: number, left: SortBin, right: SortBin, cards: readonly SortCard[]): SortDeck {
  const id = key('sort', lang, lesson);
  return { id, left, right, tasks: cards.map(([text, side, hint], i) => ({ id: `${id}-${i + 1}`, text, side, hint })) };
}

/** «Точное слово»: `gapped` — фраза с пропуском `___`. */
export function gapRound(lang: BankLang, lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound {
  const [before = '', after = ''] = gapped.split('___').map((part) => part.trim());
  return { id: `${key('ex', lang, lesson)}-${n}`, ask: 'Какое слово сюда?', ...placed(correct, wrong, at), prompt: { kind: 'gap', before, after }, note };
}

/** «На слух»: произносится `text`; неверные варианты отличаются от него одним словом. */
export function listenRound(lang: BankLang, lesson: number, n: number, text: string, wrong: readonly string[], at: number, note: string): QuizRound {
  return { id: `${key('ls', lang, lesson)}-${n}`, ask: 'Что прозвучало?', ...placed(text, wrong, at), prompt: { kind: 'audio', text, rate: 1 }, note };
}

/** «Память»: спрашивается пара `askIndex`; неверные варианты — переводы двух других пар того же набора. */
export function memoryRound(lang: BankLang, lesson: number, n: number, pairs: readonly MemoryPair[], askIndex: number, wrongPairs: readonly [number, number], at: number): QuizRound {
  const wrong = wrongPairs.map((i) => pairs[i]?.[1] ?? '');
  return {
    id: `${key('mem', lang, lesson)}-${n}`,
    ask: `Что значит «${pairs[askIndex]?.[0] ?? ''}»?`,
    ...placed(pairs[askIndex]?.[1] ?? '', wrong, at),
    prompt: { kind: 'pairs', pairs, askIndex },
  };
}

const WRONG_WORD = /^\{([^>]+)>([^}]+)\}(.*)$/;

/**
 * «Охота на ошибку»: реплики строками. Ошибка — `{está>están}`, слово-обманка (верное, но нажимаемое) — `*Estoy`.
 * Чётные реплики слева, нечётные справа.
 */
export function huntTask(lang: BankLang, lesson: number, n: number, marked: readonly string[], why: string): HuntTask {
  let wrong = { line: -1, word: -1 };
  let fix = '';
  const lines: HuntLine[] = marked.map((text, lineIndex) => {
    const tappable: number[] = [];
    const words = text.split(' ').map((token, wordIndex) => {
      const hit = WRONG_WORD.exec(token);
      if (hit) {
        wrong = { line: lineIndex, word: wordIndex };
        fix = `${hit[2]}${hit[3]}`;
        tappable.push(wordIndex);
        return `${hit[1]}${hit[3]}`;
      }
      if (token.startsWith('*')) {
        tappable.push(wordIndex);
        return token.slice(1);
      }
      return token;
    });
    return { right: lineIndex % 2 === 1, words, tappable };
  });
  return { id: `${key('hunt', lang, lesson)}-${n}`, lines, wrong, fix, why };
}

export function orderTask(lang: BankLang, lesson: number, n: number, lines: readonly string[]): OrderTask {
  return { id: `${key('ord', lang, lesson)}-${n}`, lines };
}
