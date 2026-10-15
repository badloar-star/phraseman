// speech_fail_view.ts — чистые данные блока «не засчитано» (эталон Макетов speech-result-states.html, 91eee157a): какие слова фразы подсветить и что написать под плашкой.
//
// зачем (координатор 15.10, строгая проверка речи — владелец): засчитывается, только если сказаны все значимые слова. «Не засчитано» станет частым, поэтому экран обязан показать, КАКОЕ слово не услышано:
// фраза целиком, пропущенные слова мягким красным, одна человеческая строка и «Ещё раз». Ни React, ни нативных модулей — всё проверяется юнит-тестом.
//
// Сопоставление: `missingWords` из оценщика — нормализованные слова ЦЕЛИ (раскрытые стяжения, цифры → слова), а на экране — слова фразы как написано. У слова фразы нормализованных слов может быть
// несколько («you're» → «you are») — слово подсвечивается, если пропущено любое из них; пропущенные считаются как набор (повторяющееся слово «the … the» не гасит чужое).
import { normalizedComparisonWords } from './pronunciation_scoring_core';
import { speakingTargetTokens } from './speaking_word_match';

export type SpeechFailToken = Readonly<{ text: string; missed: boolean }>;

export type SpeechFailView = Readonly<{
  tokens: readonly SpeechFailToken[];
  /** Первое пропущенное слово фразы КАК НАПИСАНО (без пунктуации по краям) — для строки под плашкой; null — пропущенных нет. */
  firstMissed: string | null;
  missedCount: number;
}>;

const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** Слово фразы без пунктуации по краям («works,» → «works»). */
export function speechFailDisplayWord(token: string): string {
  const trimmed = token.replace(EDGE_PUNCT, '');
  return trimmed.length > 0 ? trimmed : token;
}

/** Какие слова целевой фразы подсветить как пропущенные. */
export function buildSpeechFailView(targetText: string, missingWords: readonly string[] | null | undefined): SpeechFailView {
  const tokens = speakingTargetTokens(targetText);
  // набор пропущенных (с кратностью): первое вхождение слова фразы «забирает» одно пропущенное
  const pool = new Map<string, number>();
  for (const word of missingWords ?? []) {
    const key = String(word ?? '').trim().toLowerCase();
    if (key) pool.set(key, (pool.get(key) ?? 0) + 1);
  }
  let missedCount = 0;
  let firstMissed: string | null = null;
  const marked = tokens.map((text): SpeechFailToken => {
    const normalized = normalizedComparisonWords(text);
    let missed = false;
    for (const word of normalized) {
      const left = pool.get(word) ?? 0;
      if (left > 0) {
        pool.set(word, left - 1);
        missed = true;
      }
    }
    if (missed) {
      missedCount += 1;
      if (firstMissed === null) firstMissed = speechFailDisplayWord(text);
    }
    return { text, missed };
  });
  return { tokens: marked, firstMissed, missedCount };
}

// зачем: строка под плашкой — «Не услышали слово «X» — скажи фразу целиком» (эталон); приложение на «ты». Слово подставляется в кавычки и выделяется жирным в самом блоке (до/после — части строки).
const LINE: Readonly<Record<string, readonly [string, string]>> = {
  ru: ['Не услышали слово «', '» — скажи фразу целиком'],
  uk: ['Не почули слово «', '» — скажи фразу повністю'],
  en: ['Didn’t catch “', '” — say the whole phrase'],
  es: ['No oímos la palabra «', '»: di la frase completa'],
  'pt-BR': ['Não ouvimos a palavra “', '” — fale a frase toda'],
  vi: ['Chưa nghe thấy từ “', '” — hãy nói cả câu'],
  id: ['Kata “', '” tidak terdengar — ucapkan seluruh frasa'],
  tr: ['“', '” kelimesini duyamadık — ifadenin tamamını söyle'],
  pl: ['Nie usłyszeliśmy słowa „', '” — powiedz całą frazę'],
};

/** Три части строки: до слова, само слово (жирное), после слова. Язык вне девяти → русский. */
export function speechFailLineParts(lang: string, word: string): readonly [string, string, string] {
  const pair = LINE[lang] ?? LINE.ru!;
  return [pair[0], word, pair[1]];
}

/** Строка целиком (для озвучки и тестов). */
export function speechFailLineText(lang: string, word: string): string {
  const [before, mid, after] = speechFailLineParts(lang, word);
  return `${before}${mid}${after}`;
}
