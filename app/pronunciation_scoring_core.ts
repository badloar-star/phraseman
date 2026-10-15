import { soundsAlike } from './double_metaphone';

export type PronunciationScoreBreakdown = {
  wordAccuracy: number;
  orderAccuracy: number;
  completeness: number;
};

export type PronunciationScoreResult = {
  score: number;
  passed: boolean;
  threshold: number;
  normalizedTarget: string;
  normalizedTranscript: string;
  breakdown: PronunciationScoreBreakdown;
  /** Значимые слова цели, которых нет в распознанном тексте (для логов и подсказки). */
  missingWords?: string[];
  /** Прошла ли строгая проверка «все значимые слова сказаны». */
  strictWordsOk?: boolean;
  /**
   * Уверенность распознавателя по каждому слову цели: [слово цели, уверенность 0..1 | null].
   * null — слово не услышано или ОС не отдаёт уверенность (iOS < 17, Android < 14, не on-device).
   * Пока ТОЛЬКО для логов/подсказки: порог «не сказано» включим после релиза по данным (владелец 15.10).
   */
  wordConfidence?: Array<[string, number | null]>;
};

// Порог зачёта произношения. Был 90% — слишком жёстко: движок распознавания
// редко выдаёт такую точность на БЕГЛОЙ речи носителя (слитные слова, ранняя
// остановка), из-за чего нормальная речь не засчитывалась. 75% реалистичнее и
// всё ещё требует узнаваемого совпадения большинства слов. Акцент не оцениваем.
export const PRONUNCIATION_PASS_THRESHOLD = 75;

// Беглая речь = стяжения. Движок слышит "you're/gonna/wanna", а цель написана
// "you are / going to / want to" (или наоборот). Раскрываем стяжения в обе
// стороны к ОДНОЙ канонической форме, чтобы число слов совпадало и носитель не
// штрафовался. Это про распознанный текст, не про акцент.
// Беглая речь = стяжения, и движок часто роняет апостроф ("youre", "dont", "im").
// Поэтому апостроф во всех паттернах ОПЦИОНАЛЕН ('?) — чтобы и "you're", и "youre"
// схлопывались к одной канонической форме ("you are"). Это про распознанный текст,
// не про акцент. Регистронезависимо (i) флаг.
const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bgonna\b/g, 'going to'],
  [/\bwanna\b/g, 'want to'],
  [/\bgotta\b/g, 'got to'],
  [/\bgimme\b/g, 'give me'],
  [/\blemme\b/g, 'let me'],
  [/\bkinda\b/g, 'kind of'],
  [/\bsorta\b/g, 'sort of'],
  [/\bdunno\b/g, "do not know"],
  [/\bcause\b/g, 'because'],
  [/\btill\b/g, 'until'],
  [/\b(i)'?m\b/g, '$1 am'],
  [/\b(you|we|they)'?re\b/g, '$1 are'],
  [/\b(he|she|it|that|there|who|what|here)'?s\b/g, '$1 is'],
  [/\b(i|you|we|they|he|she|it|that|who)'?ll\b/g, '$1 will'],
  [/\b(i|you|we|they|he|she|it|that|who)'?ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she|it|that|who)'?d\b/g, '$1 would'],
  // "won't"/"can't" должны разойтись ДО общего n't-правила, иначе "wo not"/"ca not".
  [/\bcan'?t\b/g, 'can not'],
  [/\bwon'?t\b/g, 'will not'],
  [/\b(is|are|was|were|do|does|did|have|has|had|would|could|should|will|can|must|ai)n'?t\b/g, "$1 not"],
  [/\blet'?s\b/g, 'let us'],
];

function expandContractions(value: string): string {
  let out = value;
  for (const [re, rep] of CONTRACTIONS) out = out.replace(re, rep);
  return out;
}

// On-device распознаватели почти всегда пишут числа ЦИФРАМИ ("two"→"2",
// "eight"→"8", "first"→"1st"), а цель написана словами (или наоборот). Без
// нормализации wordSimilarity('two','2') = 0 → одна цифра валит короткую фразу.
// Приводим ОБЕ стороны к словесной форме (она устойчивее к составным числам).
const NUMBER_WORDS: Readonly<Record<string, string>> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
  '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
  '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
  '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
  '80': 'eighty', '90': 'ninety', '100': 'one hundred', '1000': 'one thousand',
  // Ordinals: и цифровая запись (1st), и обычные цифры могут прийти.
  '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth',
  '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth',
  '9th': 'ninth', '10th': 'tenth', '11th': 'eleventh', '12th': 'twelfth',
};

// Канонизируем числовые токены к словам. Применяется ПОСЛЕ стрипа пунктуации,
// когда токены уже разделены пробелами.
function normalizeNumbers(value: string): string {
  return value
    .split(' ')
    .map((tok) => {
      const exact = NUMBER_WORDS[tok];
      if (exact) return exact;
      if (!/^\d{2}$/.test(tok)) return tok;
      const value = Number(tok);
      if (value < 21 || value > 99) return tok;
      const tens = NUMBER_WORDS[String(Math.floor(value / 10) * 10)];
      const ones = NUMBER_WORDS[String(value % 10)];
      return tens && ones ? `${tens} ${ones}` : tok;
    })
    .join(' ');
}

// Омофоны звучат идентично, но пишутся по-разному — движок легитимно может
// вернуть любой из вариантов на безупречно произнесённом слове. Сводим каждую
// группу к одному канону, чтобы char-distance не обнулял совпадение.
// Только бесспорные английские омофоны (консервативно).
const HOMOPHONE_GROUPS: ReadonlyArray<readonly string[]> = [
  ['their', 'there', 'theyre'],
  ['to', 'too', 'two'],
  ['write', 'right', 'rite'],
  ['ate', 'eight'],
  ['read', 'red'],
  ['by', 'buy', 'bye'],
  ['hour', 'our'],
  ['no', 'know'],
  ['week', 'weak'],
  ['hear', 'here'],
  ['for', 'four', 'fore'],
  ['won', 'one'],
  ['meet', 'meat'],
  ['sea', 'see'],
  ['sun', 'son'],
  ['flower', 'flour'],
  ['way', 'weigh'],
  ['wait', 'weight'],
  ['piece', 'peace'],
  ['plain', 'plane'],
  ['knight', 'night'],
  ['sale', 'sail'],
  ['break', 'brake'],
  ['whole', 'hole'],
  ['mail', 'male'],
  ['cell', 'sell'],
  ['cent', 'sent'],
  ['threw', 'through'],
  ['wear', 'where'],
  ['blew', 'blue'],
];

// word (без апострофов) → канон группы. Строим один раз.
const HOMOPHONE_CANON: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const group of HOMOPHONE_GROUPS) {
    const canon = group[0]!;
    for (const w of group) map[w] = canon;
  }
  return map;
})();

function normalizeHomophones(value: string): string {
  return value
    .split(' ')
    .map((tok) => HOMOPHONE_CANON[tok] ?? tok)
    .join(' ');
}

function normalizePhrase(value: string): string {
  const expanded = expandContractions(
    value
      .toLowerCase()
      .replace(/[’`]/g, "'"),
  )
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Числа → слова, затем омофоны → канон. Порядок: числа сначала (ordinals вроде
  // "1st" должны схлопнуться до "first" до того, как что-то ещё их тронет).
  return normalizeHomophones(normalizeNumbers(expanded));
}

function words(value: string): string[] {
  const normalized = normalizePhrase(value);
  return normalized ? normalized.split(' ') : [];
}

/** Character-level edit distance between two words (for fuzzy word matching). */
function charDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j];
  }
  return prev[b.length] ?? 0;
}

/**
 * Насколько два слова «совпадают» по смыслу для скоринга: 1 = одинаковые,
 * <1 = похожие (слитная/беглая речь, фонетические огрехи движка), 0 = разные.
 *
 * Беглая речь даёт you're/you are, gonna/going to, wanna/want to, а движок
 * иногда чуть искажает слово. Раньше это считалось ПОЛНОЙ ошибкой (бинарно),
 * из-за чего носитель получал 3%. Теперь близкие слова дают частичный кредит.
 */
// Soft-miss floor for words the RECOGNIZER itself flagged as low-confidence.
// When the engine is unsure about a transcript word (noise, accent), a full
// miss likely reflects the engine's weakness, not the speaker's. We floor such
// a substitution at SOFT_MISS instead of 0. Set per attempt via a module-scoped
// closure so the shared wordSimilarity stays a 2-arg pure-ish function.
const SOFT_MISS = 0.5;
const WORD_HEARD_SIMILARITY = 0.7;
const LOW_CONFIDENCE_THRESHOLD = 0.4;
// Normalized transcript words the recognizer returned with low confidence.
let lowConfidenceTranscriptWords: ReadonlySet<string> = new Set();

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  // Одно слово содержит другое целиком (you're ⊃ you, going ⊃ go) — высокий кредит.
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return 0.9;
  // Фонетическое совпадение (Double Metaphone): слова звучат одинаково, но
  // пишутся по-разному (center/centre, whether/weather, knight/night). Движок
  // легитимно мог вернуть другое написание безупречно произнесённого слова —
  // не штрафуем. Ловит то, чего нет в явной таблице омофонов.
  if (a.length >= 3 && b.length >= 3 && soundsAlike(a, b)) return 0.95;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const sim = 1 - charDistance(a, b) / maxLen;
  if (sim >= 0.6) return sim;
  // Иначе слова разные. Но если ИМЕННО распознанное слово (b — токен транскрипта)
  // движок вернул с низкой уверенностью — это, вероятно, огрех движка, а не
  // ошибка говорящего: мягкий промах вместо полного нуля.
  if (lowConfidenceTranscriptWords.has(b)) return SOFT_MISS;
  return 0;
}

// Взвешенный Левенштейн по словам: стоимость замены = 1 - похожесть слов,
// поэтому близкое слово почти не штрафуется, а совсем другое — на полную.
function levenshtein(a: readonly string[], b: readonly string[]): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = 1 - wordSimilarity(a[i - 1]!, b[j - 1]!);
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

// «Мягкий» LCS: накапливает дробную похожесть, а не только точные совпадения,
// чтобы порядок беглой речи (you're вместо you are) не обнулял order-кредит.
function longestCommonSubsequence(a: readonly string[], b: readonly string[]): number {
  const previous = Array.from({ length: b.length + 1 }, () => 0);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const sim = wordSimilarity(a[i - 1]!, b[j - 1]!);
      current[j] = sim >= 0.6
        ? previous[j - 1] + sim
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

// зачем (владелец/координатор 15.10, «проверка речи принимает всё»): строгая проверка слов.
// Служебные слова (артикли, «of/to/de/di»), которые движок часто роняет и пропуск которых не меняет
// смысл фразы, можно не услышать. Все остальные слова цели обязаны прозвучать. Список — для en/es/fr/de/it
// после normalizePhrase (нижний регистр, без диакритики-символов).
const OPTIONAL_FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'of', 'to',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'de', 'del', 'al',
  'le', 'les', 'une', 'des', 'du', 'l', 'd',
  'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  // итальянское «i» сюда НЕ входит: в английском это «I», пропуск меняет смысл
  'il', 'gli', 'uno', 'di',
]);

/** Сколько опечаток (букв) прощаем значимому слову: короткие — точно, длинные — ±1–2 буквы (акцент, огрех движка). */
function strictLetterAllowance(word: string): number {
  if (word.length <= 3) return 0;
  if (word.length <= 6) return 1;
  return 2;
}

function strictWordMatch(target: string, heard: string): boolean {
  if (target === heard) return true;
  // Созвучные написания (centre/center, knight/night) — движок легитимно вернул другое написание.
  if (target.length >= 4 && heard.length >= 4 && soundsAlike(target, heard)) return true;
  return charDistance(target, heard) <= strictLetterAllowance(target);
}

/**
 * Строгая проверка: каждое значимое слово цели найдено в распознанном тексте (одно распознанное слово
 * закрывает только одно слово цели). Порядок и лишние слова не важны — их учитывает процент.
 * `lowConfidenceSlack` — сколько слов распознаватель сам пометил как неуверенные (огрех движка, не ученика).
 */
function strictWordCheck(
  targetWords: readonly string[],
  transcriptWords: readonly string[],
  lowConfidenceSlack: number,
): { ok: boolean; missing: string[]; heardFor: Array<string | null> } {
  const used = new Array<boolean>(transcriptWords.length).fill(false);
  const missing: string[] = [];
  // какое распознанное слово закрыло каждое слово цели (для пословной уверенности)
  const heardFor: Array<string | null> = [];
  for (const target of targetWords) {
    if (OPTIONAL_FUNCTION_WORDS.has(target)) {
      // служебное слово: если прозвучало — занимаем его, чтобы оно не «закрыло» другое слово
      const idx = transcriptWords.findIndex((heard, i) => !used[i] && heard === target);
      if (idx >= 0) used[idx] = true;
      heardFor.push(idx >= 0 ? transcriptWords[idx]! : null);
      continue;
    }
    const idx = transcriptWords.findIndex((heard, i) => !used[i] && strictWordMatch(target, heard));
    if (idx >= 0) used[idx] = true;
    else missing.push(target);
    heardFor.push(idx >= 0 ? transcriptWords[idx]! : null);
  }
  return { ok: missing.length <= lowConfidenceSlack, missing, heardFor };
}

/** Нормализованное распознанное слово → уверенность ОС (минимум, если слово встретилось несколько раз). */
function buildWordConfidenceMap(segments: readonly TranscriptSegment[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!segments) return map;
  for (const seg of segments) {
    const conf = seg?.confidence;
    if (typeof conf !== 'number' || !Number.isFinite(conf) || conf < 0) continue; // -1 / нет = ОС не отдаёт
    for (const w of words(seg?.segment ?? '')) {
      const prev = map.get(w);
      map.set(w, prev === undefined ? conf : Math.min(prev, conf));
    }
  }
  return map;
}

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

/** Per-word recognition segment (subset of the native result). */
export type TranscriptSegment = {
  segment?: string;
  confidence?: number;
};

// Build the set of NORMALIZED transcript words the recognizer flagged as
// low-confidence. confidence === -1 means "unavailable" (older OS) → ignore.
function buildLowConfidenceWordSet(segments: readonly TranscriptSegment[] | undefined): Set<string> {
  const set = new Set<string>();
  if (!segments) return set;
  for (const seg of segments) {
    const conf = seg?.confidence;
    if (typeof conf !== 'number' || conf < 0) continue; // -1 / missing = unknown
    if (conf < LOW_CONFIDENCE_THRESHOLD) {
      for (const w of words(seg?.segment ?? '')) set.add(w);
    }
  }
  return set;
}

/** Normalized comparison words of a phrase (same pipeline the scorer uses:
 *  contractions expanded, numbers→words, homophones→canon). Exported so the
 *  per-word report can match target tokens against segment confidences. */
export function normalizedComparisonWords(value: string): string[] {
  return words(value);
}

/** Normalized transcript words the recognizer flagged as low-confidence.
 *  Exported for the per-word speaking report ("нечётко" overlay). */
export function lowConfidenceWordsFromSegments(
  segments: readonly TranscriptSegment[] | undefined,
): Set<string> {
  return buildLowConfidenceWordSet(segments);
}

export function scorePronunciationTranscript(input: {
  targetText: string;
  transcript: string;
  threshold?: number;
  /** Optional per-word segments (iOS 17+/Android 14+ on-device) for soft-miss. */
  segments?: readonly TranscriptSegment[];
  /** Строгая проверка значимых слов (по умолчанию ВКЛ). false — прежнее мягкое правило (аварийный выключатель). */
  strictWords?: boolean;
}): PronunciationScoreResult {
  const targetWords = words(input.targetText);
  const transcriptWords = words(input.transcript);
  const normalizedTarget = targetWords.join(' ');
  const normalizedTranscript = transcriptWords.join(' ');
  const threshold = Math.max(1, Math.min(100, Math.round(input.threshold ?? PRONUNCIATION_PASS_THRESHOLD)));

  if (targetWords.length === 0 || transcriptWords.length === 0) {
    return {
      score: 0,
      passed: false,
      threshold,
      normalizedTarget,
      normalizedTranscript,
      breakdown: { wordAccuracy: 0, orderAccuracy: 0, completeness: 0 },
    };
  }

  // Arm the soft-miss closure for this attempt, then clear it in finally so it
  // never leaks into the next (synchronous) scoring call.
  lowConfidenceTranscriptWords = buildLowConfidenceWordSet(input.segments);
  try {
    return computeScore(targetWords, transcriptWords, normalizedTarget, normalizedTranscript, threshold, input.strictWords !== false, buildWordConfidenceMap(input.segments));
  } finally {
    lowConfidenceTranscriptWords = new Set();
  }
}

function computeScore(
  targetWords: readonly string[],
  transcriptWords: readonly string[],
  normalizedTarget: string,
  normalizedTranscript: string,
  threshold: number,
  strictWords: boolean,
  confidenceByWord: ReadonlyMap<string, number>,
): PronunciationScoreResult {
  const distance = levenshtein(targetWords, transcriptWords);
  const wordAccuracy = pct(1 - distance / Math.max(targetWords.length, transcriptWords.length));
  const orderedMatches = longestCommonSubsequence(targetWords, transcriptWords);
  const orderAccuracy = pct(orderedMatches / targetWords.length);
  // Completeness: движок часто роняет ОДНО безударное хвостовое слово (is/it/the)
  // на верно произнесённой фразе. Для фраз длиной >=4 слов прощаем ровно один
  // пропущенный токен (знаменатель target-1), чтобы единичная обрезка не топила
  // балл одновременно с wordAccuracy и orderAccuracy. На коротких (<=3) фразах
  // оставляем строгий расчёт — там каждое слово несёт слишком много смысла.
  const completenessDenom = targetWords.length >= 4
    ? targetWords.length - 1
    : targetWords.length;
  const completeness = pct(Math.min(1, transcriptWords.length / completenessDenom));
  const score = Math.round((wordAccuracy * 0.62) + (orderAccuracy * 0.28) + (completeness * 0.10));

  // Relaxed scoring may forgive one recognizer omission on a long phrase, but it
  // must never let a single occurrence satisfy two identical target positions.
  // This is the exact "the ... the" false pass reported by testers.
  const targetCounts = new Map<string, number>();
  const transcriptCounts = new Map<string, number>();
  for (const word of targetWords) targetCounts.set(word, (targetCounts.get(word) ?? 0) + 1);
  for (const word of transcriptWords) transcriptCounts.set(word, (transcriptCounts.get(word) ?? 0) + 1);
  const repeatedOccurrencesCovered = [...targetCounts.entries()].every(
    ([word, count]) => count < 2 || (transcriptCounts.get(word) ?? 0) >= count,
  );

  // зачем: ученик сказал «afraid» вместо «scared» и «it» вместо «that» — процент
  // (~78–82%) перекрывал порог, и ЧУЖОЕ слово засчитывалось как верный ответ.
  // Каждое слово цели обязано иметь похожее слово в распознанном тексте. Прощаем
  // только то, что прощали и раньше: одно оброненное движком слово на длинной
  // фразе (распознано меньше слов, чем в цели) и слова, в которых сам движок
  // не уверен (low-confidence) — это огрех распознавания, а не ученика.
  // Порог 0.7, а не 0.6 как в самом проценте: при 0.6 «waste»≈«want», «sit»≈«set».
  // Созвучные написания (centre/center, knight/night) ловит фонетика (0.95).
  const uncoveredTargets = targetWords.filter(
    (target) => !transcriptWords.some((heard) => wordSimilarity(target, heard) >= WORD_HEARD_SIMILARITY),
  ).length;
  const omissionAllowance = targetWords.length >= 4 && transcriptWords.length < targetWords.length ? 1 : 0;
  const lowConfidenceSlack = transcriptWords.filter(
    (heard) => lowConfidenceTranscriptWords.has(heard)
      && !targetWords.some((target) => wordSimilarity(target, heard) >= WORD_HEARD_SIMILARITY),
  ).length;
  const everyTargetWordHeard = uncoveredTargets <= omissionAllowance + lowConfidenceSlack;

  // Строгий режим (по умолчанию): вместо «прощаем любое одно слово на длинной фразе» — прощаем только
  // служебные слова; значимые сверяются по длине (strictWordMatch). Мягкий — прежнее правило.
  const strict = strictWordCheck(targetWords, transcriptWords, lowConfidenceSlack);
  const wordsOk = strictWords ? strict.ok : everyTargetWordHeard;

  return {
    score,
    passed: score >= threshold && repeatedOccurrencesCovered && wordsOk,
    threshold,
    normalizedTarget,
    normalizedTranscript,
    breakdown: { wordAccuracy, orderAccuracy, completeness },
    missingWords: strict.missing,
    strictWordsOk: wordsOk,
    wordConfidence: targetWords.map((target, i): [string, number | null] => {
      const heard = strict.heardFor[i];
      const conf = heard ? confidenceByWord.get(heard) : undefined;
      return [target, typeof conf === 'number' ? Math.round(conf * 100) / 100 : null];
    }),
  };
}
