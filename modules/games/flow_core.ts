/**
 * Игра «Поток» — правила без React. Эталон: docs/design/v2-app/elevate-mechanics.app.js, `flow()` и `TEMPO`.
 * Фраза появляется по одному слову и исчезает, затем игрок выбирает, что было сказано.
 * Верный ответ поднимает темп на ступень, промах опускает.
 */

export interface FlowItem {
  readonly id: string;
  /** Фраза на изучаемом языке. */
  readonly en: string;
  /** Перевод на язык интерфейса. */
  readonly translation: string;
}

export interface FlowTempo {
  /** Сколько миллисекунд даётся на одно слово. */
  readonly msPerWord: number;
  /** Подпись множителя: «Темп ×1,3». */
  readonly label: string;
  /** Сколько из десяти столбиков индикатора горит. */
  readonly bars: number;
}

/** Ступени темпа — числа из макета. */
export const FLOW_TEMPO: readonly FlowTempo[] = [
  { msPerWord: 520, label: '1,0', bars: 4 },
  { msPerWord: 400, label: '1,3', bars: 6 },
  { msPerWord: 300, label: '1,6', bars: 8 },
  { msPerWord: 240, label: '1,9', bars: 10 },
];

export const FLOW_OPTIONS = 3;
export const FLOW_DEFAULT_ROUNDS = 6;
/** С этой ступени темп считается высоким: таблица навыков даёт +3 вместо +2. */
export const FLOW_HIGH_TEMPO_LEVEL = 2;
const MIN_WORDS = 3;
const MAX_WORDS = 7;

export interface FlowRound {
  readonly item: FlowItem;
  readonly words: readonly string[];
  readonly options: readonly string[];
  readonly correctIndex: number;
}

/** Игре нужно минимум столько разных переводов, сколько вариантов ответа. */
export function canStartFlow(pool: readonly FlowItem[]): boolean {
  return usable(pool).length >= FLOW_OPTIONS;
}

export function nextFlowTempoLevel(level: number, correct: boolean): number {
  return Math.max(0, Math.min(FLOW_TEMPO.length - 1, Math.floor(level) + (correct ? 1 : -1)));
}

export function isFlowHighTempo(level: number): boolean {
  return level >= FLOW_HIGH_TEMPO_LEVEL;
}

export interface FlowTimings {
  /** Длительность проявления и ухода слова. */
  readonly wordFadeMs: number;
  readonly wordInAt: readonly number[];
  readonly wordOutAt: readonly number[];
  /** Полоса под фразой заполняется за это время, начиная с `startDelayMs`. */
  readonly beamMs: number;
  readonly startDelayMs: number;
  /** Когда появляются варианты ответа. */
  readonly answersAt: number;
}

const START_DELAY_MS = 350;

/** Расписание раунда — те же формулы, что в макете. */
export function flowRoundTimings(wordCount: number, msPerWord: number): FlowTimings {
  const n = Math.max(1, Math.floor(wordCount));
  const beamMs = n * msPerWord + msPerWord * 1.4;
  return {
    wordFadeMs: Math.round(msPerWord * 0.55),
    wordInAt: Array.from({ length: n }, (_, i) => START_DELAY_MS + i * msPerWord),
    wordOutAt: Array.from({ length: n }, (_, i) => START_DELAY_MS + i * msPerWord + msPerWord * 1.5),
    beamMs,
    startDelayMs: START_DELAY_MS,
    answersAt: START_DELAY_MS + beamMs + 150,
  };
}

/**
 * Перевод фразы для варианта ответа — без методической пометки урока.
 * зачем (сквозная проверка 11.11): в данных уроков у части переводов после самой фразы стоит пометка для сборки —
 * «Оно открыто. (О предмете.)», «Лестница небезопасна. Для сборки: «не» + «безопасная».». В уроке она нужна,
 * а в «Потоке» выдавала верный вариант (он длиннее и «с инструкцией») и показывала грамматические пояснения.
 * Данные уроков не меняются — пометка срезается только здесь.
 */
export function cleanFlowTranslation(text: string): string {
  let out = typeof text === 'string' ? text : '';
  // зачем (проверка 11.11 по 5 курсам × 32 урокам × ru/uk/en/es): пометка сборки бывает без двоеточия и не только
  // «Для сборки» — «При сборке: «не» + «далеко».», «Для складання опишіть стан без заперечення…»
  out = out.replace(/\s*(?:Для сборки|При сборке|Для складання|При складанні)(?=[\s:,.]|$).*$/su, '');
  // скобки снимаются все, а не только хвостовые: «You (plural) are awake.», «Ustedes (en plural) viven aquí.»,
  // «Они — врачи (женщины).» — это тоже пометки урока; вложенные скобки снимаются повтором
  let previous = '';
  while (previous !== out) {
    previous = out;
    out = out.replace(/\s*\([^()]*\)/gu, '');
  }
  return out.trim();
}

export type FlowPhraseSource = Readonly<{ russian: string; ukrainian: string; sourceLocales?: Readonly<Record<string, string | undefined>> }>;

/** Перевод фразы урока на язык интерфейса: свой язык, иначе русский; всегда без пометки урока. */
export function flowTranslation(phrase: FlowPhraseSource, uiLang: string): string {
  const raw = uiLang === 'ru' ? phrase.russian : uiLang === 'uk' ? (phrase.ukrainian || phrase.russian) : (phrase.sourceLocales?.[uiLang] || phrase.russian);
  return cleanFlowTranslation(raw);
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function usable(pool: readonly FlowItem[]): FlowItem[] {
  const seen = new Set<string>();
  return pool.filter((item) => {
    const en = item.en?.trim();
    const translation = item.translation?.trim();
    if (!item.id || !en || !translation) return false;
    // зачем: два одинаковых перевода дали бы два «верных» варианта
    const key = translation.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffled<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Собрать раунды из набора фраз. Предпочитает фразы в 3–7 слов (короче — нечего ловить, длиннее — не читается
 * на высоком темпе); если таких не хватает, добирает остальными. Неверные варианты — переводы других фраз набора.
 */
export function buildFlowRounds(pool: readonly FlowItem[], count: number, rng: () => number = Math.random): FlowRound[] {
  const items = usable(pool);
  if (items.length < FLOW_OPTIONS) return [];
  const fits = (item: FlowItem) => {
    const n = splitWords(item.en).length;
    return n >= MIN_WORDS && n <= MAX_WORDS;
  };
  const order = [...shuffled(items.filter(fits), rng), ...shuffled(items.filter((item) => !fits(item)), rng)];
  return order.slice(0, Math.max(0, Math.floor(count))).map((item) => {
    const distractors = shuffled(items.filter((other) => other.id !== item.id), rng).slice(0, FLOW_OPTIONS - 1).map((other) => other.translation.trim());
    const options = shuffled([item.translation.trim(), ...distractors], rng);
    return { item, words: splitWords(item.en), options, correctIndex: options.indexOf(item.translation.trim()) };
  });
}
