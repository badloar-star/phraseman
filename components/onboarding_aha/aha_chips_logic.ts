// Pure-логика сборки фразы из chips (бит 2 АХ-сцены). Без React и RN-импортов —
// чтобы можно было тестировать без RN-окружения.

import type { AhaChip, AhaScenario } from './aha_types';

/**
 * Слова целевой фразы без финальной пунктуации. Апострофы внутри слова
 * (I'll, didn't) сохраняются — срезаем только хвостовые .,!? у слова.
 */
export function chipWordsFromLine(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.,!?]+$/, ''));
}

/** Детерминированный LCG-шаффл (без Math.random), паттерн как в WordBankBuilder. */
function shuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Строит колоду chips: слова целевой фразы + дистракторы сценария,
 * детерминированно перемешанные по seed. Дистрактор, совпадающий (без учёта
 * регистра) со словом фразы, отбрасывается — защита контента от дублей.
 */
export function buildChipDeck(scenario: AhaScenario, seed: number): AhaChip[] {
  const words = chipWordsFromLine(scenario.say.text);
  const wordsLower = new Set(words.map((w) => w.toLowerCase()));
  const safeDistractors = scenario.distractors.filter(
    (d) => !wordsLower.has(d.toLowerCase()),
  );

  const wordChips: AhaChip[] = words.map((word, i) => ({
    id: `${word}_${i}`,
    word,
    isDistractor: false,
  }));
  const distractorChips: AhaChip[] = safeDistractors.map((word, i) => ({
    id: `d_${word}_${i}`,
    word,
    isDistractor: true,
  }));

  return shuffle([...wordChips, ...distractorChips], seed);
}

/** Следующее ожидаемое слово по числу уже собранных слов (или null, если фраза собрана). */
export function nextExpectedWord(assembledCount: number, words: string[]): string | null {
  if (assembledCount < 0 || assembledCount >= words.length) return null;
  return words[assembledCount];
}

/**
 * Chip «верный» для тапа сейчас: не дистрактор И его слово совпадает
 * (регистронезависимо) со следующим ожидаемым словом фразы.
 */
export function isChipCorrect(
  chip: AhaChip,
  assembledCount: number,
  words: string[],
): boolean {
  if (chip.isDistractor) return false;
  const expected = nextExpectedWord(assembledCount, words);
  if (expected === null) return false;
  return chip.word.toLowerCase() === expected.toLowerCase();
}
