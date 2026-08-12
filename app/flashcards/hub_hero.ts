/**
 * cards-2.0 (E3): чистая логика hero-CTA хаба-дашборда (§3.1 мастер-плана).
 * Вынесена из FlashcardsCategoryHub для юнит-тестов (jest без react-native).
 *
 * Приоритет:
 *  1. SRS-очередь не пуста → «Повторить сегодня · N фраз» → /review
 *  2. иначе тренер не пуст → «Тренировка» → /trainer
 *  3. иначе — empty-state «Открой колоду» (создать карточку / открыть набор)
 */

export type HeroCtaKind = 'review' | 'trainer' | 'empty';

export function selectHeroCta(srsDueCount: number, trainerDueCount: number): HeroCtaKind {
  if (normalizeCount(srsDueCount) > 0) return 'review';
  if (normalizeCount(trainerDueCount) > 0) return 'trainer';
  return 'empty';
}

/** NaN/минус/дробь → безопасное целое ≥0 (значения приходят из AsyncStorage). */
export function normalizeCount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * «N фраз» с правильной формой слова (до E8 в SRS-очереди только фразы уроков —
 * формулировка «фраз», не «карточек», по §3.1).
 */
export function phrasesCountLabel(lang: 'ru' | 'uk' | 'es', count: number): string {
  const n = normalizeCount(count);
  if (lang === 'es') return `${n} ${n === 1 ? 'frase' : 'frases'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const isOne = mod10 === 1 && mod100 !== 11;
  const isFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (lang === 'uk') return `${n} ${isOne ? 'фраза' : isFew ? 'фрази' : 'фраз'}`;
  return `${n} ${isOne ? 'фраза' : isFew ? 'фразы' : 'фраз'}`;
}

/**
 * cards-2.0 (E8): в SRS-очереди теперь и фразы уроков, и кастомные карточки
 * (§3.7) → hero-CTA говорит «N фраз и карточек» (§3.1 п.2, формулировка E8).
 */
export function phrasesAndCardsCountLabel(lang: 'ru' | 'uk' | 'es', count: number): string {
  const n = normalizeCount(count);
  if (lang === 'es') return `${n} ${n === 1 ? 'frase o tarjeta' : 'frases y tarjetas'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const isOne = mod10 === 1 && mod100 !== 11;
  const isFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (lang === 'uk') {
    return `${n} ${isOne ? 'фраза або картка' : isFew ? 'фрази й картки' : 'фраз і карток'}`;
  }
  return `${n} ${isOne ? 'фраза или карточка' : isFew ? 'фразы и карточки' : 'фраз и карточек'}`;
}

/** Бейджи счётчиков на плитках: не раздувать кружок трёхзначными числами. */
export function badgeCountLabel(count: number): string {
  const n = normalizeCount(count);
  return n > 99 ? '99+' : String(n);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
