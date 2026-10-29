// chapter_exam_v2.ts — движок экзамена главы v2: новые жизненные фразы, ответ вводом или голосом, без подсказок, одна попытка.
// зачем (владелец 25.10: «экзамены между главами слишком лёгкие… должен реально проверять, готов ли человек идти дальше»; выбор
// кнопками): 10 заданий трёх типов — ситуация по-русски → сам говоришь/пишешь; ответ в мини-диалоге; найди и исправь ошибку
// (сам вписываешь). «На слух / перестроить» — не берём. Не сдал → слабые темы → «Повторить эти темы» → пересдача сразу; без
// повторения — через час. Проверка офлайн: нормализация + список допустимых вариантов. Чистые функции, без хранения и сети.

export const CHAPTER_EXAM_V2_QUESTION_COUNT = 10 as const;
/** Сдать — от 8 из 10 (та же доля, что 10 из 12 у прежнего экзамена). Решение координатора; поменять — одна константа. */
export const CHAPTER_EXAM_V2_PASS_CORRECT = 8 as const;
export const CHAPTER_EXAM_V2_RETRY_DELAY_MS = 60 * 60 * 1000;

export type ChapterExamV2ItemType = 'situation' | 'dialogue' | 'fix';

export type ChapterExamV2Item = Readonly<{
  id: string;
  type: ChapterExamV2ItemType;
  grammarPoint: string;
  /** Ситуация по-русски / по-украински (что сказать или как ответить). */
  situation?: Readonly<Partial<Record<'ru' | 'uk', string>>>;
  /** Реплика собеседника (мини-диалог). */
  partnerLine?: string;
  /** Фраза с одной ошибкой (найди и исправь). */
  wrong?: string;
  /** Допустимые ответы; первый — эталон. */
  accepted: readonly string[];
}>;

export type ChapterExamV2GrammarPoint = Readonly<{ id: string; label: Readonly<Partial<Record<'ru' | 'uk', string>>>; episodeOrdinals: readonly number[] }>;

export type ChapterExamV2Bank = Readonly<{
  lessonOrdinal: number;
  chapterOrdinal: number;
  grammarPoints: readonly ChapterExamV2GrammarPoint[];
  items: readonly ChapterExamV2Item[];
}>;

const LOG = '[CHAPTER-EXAM-V2]';

// ── Нормализация ответа ───────────────────────────────────────────────────────────────────────────────────────────
// зачем: человек пишет с телефона — регистр, точки, апострофы ’/' и сокращения не должны валить верный ответ.
const CONTRACTIONS: readonly (readonly [RegExp, string])[] = [
  [/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'],
  [/\b(he|she|it|that|there|what|where|who)'s\b/g, '$1 is'],
  [/\bisn't\b/g, 'is not'], [/\baren't\b/g, 'are not'], [/\bwasn't\b/g, 'was not'], [/\bweren't\b/g, 'were not'],
  [/\bdon't\b/g, 'do not'], [/\bdoesn't\b/g, 'does not'], [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\bwouldn't\b/g, 'would not'],
  [/\bhaven't\b/g, 'have not'], [/\bhasn't\b/g, 'has not'],
  // зачем (координатор 26.10, сигнал Макетов): банки модальных глаголов принимают needn't / mustn't / shouldn't / couldn't наравне с полной формой
  [/\bneedn't\b/g, 'need not'], [/\bmustn't\b/g, 'must not'], [/\bshouldn't\b/g, 'should not'], [/\bcouldn't\b/g, 'could not'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'], [/\b(i|you|we|they)'ve\b/g, '$1 have'], [/\b(i|you|we|they|he|she)'d\b/g, '$1 would'],
];

export function normalizeChapterExamV2Answer(text: string): string {
  let s = String(text ?? '').toLowerCase().replace(/[’‘`´]/g, "'");
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  s = s.replace(/[.,!?;:"«»()—–-]+/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ').trim();
  return s;
}

// зачем (🟡 Ревизора 29.10 к 9fd9db9fb): срез «с обеих сторон без условий» пропускал неграмотное («…wobble either») и противоположное
// («No, I am.» при эталоне «Yes, I am.»). Теперь: yes/no ответа срезается, только если у эталона своего нет, а yes против no — неверно;
// too — только без отрицания в ядре, either — только с отрицанием.
const DIALOGUE_NEGATION_RE = /\b(?:not|never|nobody|nothing|none|cannot|dont|doesnt|didnt|cant|wont|wouldnt|couldnt|shouldnt|havent|hasnt|hadnt|isnt|arent|wasnt|werent|mustnt)\b/;

type DialogueParts = Readonly<{ lead: 'yes' | 'no' | null; core: string; tail: 'too' | 'either' | null }>;

function chapterExamV2DialogueParts(normalized: string): DialogueParts {
  const leadMatch = /^(yes|no) /.exec(normalized);
  const lead = leadMatch ? (leadMatch[1] as 'yes' | 'no') : null;
  const rest = lead ? normalized.slice(lead.length + 1) : normalized;
  const tailMatch = / (too|either)$/.exec(rest);
  const tail = tailMatch ? (tailMatch[1] as 'too' | 'either') : null;
  return { lead, core: (tail ? rest.slice(0, -(tail.length + 1)) : rest).trim(), tail };
}

/** Ответ собеседнику совпадает с эталоном с точностью до допустимых yes/no в начале и too/either в конце (оба нормализованы). */
export function chapterExamV2DialogueMatch(givenNormalized: string, targetNormalized: string): boolean {
  const given = chapterExamV2DialogueParts(givenNormalized);
  const target = chapterExamV2DialogueParts(targetNormalized);
  if (!given.core || given.core !== target.core) return false;
  if (given.lead && target.lead && given.lead !== target.lead) return false; // противоположный ответ
  const negated = DIALOGUE_NEGATION_RE.test(given.core);
  // зачем (Ревизор 29.10): «No, I am hungry too» — «нет» перед утвердительным ответом противоречит сам себе, если эталон без yes/no
  if (given.lead === 'no' && !target.lead && !negated) return false;
  if (given.tail === 'too' && negated) return false;
  if (given.tail === 'either' && !negated) return false;
  return true;
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1; else if (b.length > a.length) j += 1; else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Верно ли: точное совпадение после нормализации, либо одна опечатка в одном длинном слове (≥5 букв). */
export function checkChapterExamV2Answer(item: ChapterExamV2Item, answer: string): Readonly<{ correct: boolean; matched: string | null; typo: boolean }> {
  const given = normalizeChapterExamV2Answer(answer);
  if (!given) return { correct: false, matched: null, typo: false };
  const wrong = item.wrong ? normalizeChapterExamV2Answer(item.wrong) : null;
  // зачем: «найди и исправь» — переписанная без правки фраза с ошибкой никогда не верна
  if (wrong !== null && given === wrong) return { correct: false, matched: null, typo: false };
  for (const variant of item.accepted) {
    const target = normalizeChapterExamV2Answer(variant);
    if (given === target) return { correct: true, matched: variant, typo: false };
  }
  // зачем (Теория через координатора 29.10, после 9c34c1092): в ответе собеседнику живые «Yes, …» / «No, …» в начале и «… too» /
  // «… either» в конце не делают ответ неверным. Срезаем их с обеих сторон и сравниваем ЯДРО — неверное ядро так верным не станет.
  if (item.type === 'dialogue') {
    if (given !== wrong) {
      for (const variant of item.accepted) {
        if (chapterExamV2DialogueMatch(given, normalizeChapterExamV2Answer(variant))) return { correct: true, matched: variant, typo: false };
      }
    }
  }
  const gw = given.split(' ');
  for (const variant of item.accepted) {
    const tw = normalizeChapterExamV2Answer(variant).split(' ');
    if (tw.length !== gw.length) continue;
    const diffs = tw.map((w, k) => [w, gw[k] as string] as const).filter(([w, g]) => w !== g);
    if (diffs.length === 1 && diffs[0]![0].length >= 5 && editDistanceAtMostOne(diffs[0]![0], diffs[0]![1])) {
      return { correct: true, matched: variant, typo: true };
    }
  }
  return { correct: false, matched: null, typo: false };
}

// ── Подбор 10 заданий ────────────────────────────────────────────────────────────────────────────────────────────────
function seededRandom(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j] as T, out[i] as T]; }
  return out;
}

/**
 * 10 заданий попытки: каждая тема главы хотя бы раз, типы вперемешку, детерминированно по ключу экзамена и номеру попытки.
 * Задания прошлой попытки идут в конец очереди (новая попытка — по возможности новые задания). Меньше 10 в банке — null.
 */
export function selectChapterExamV2Items(bank: ChapterExamV2Bank, input: Readonly<{ examKey: string; attempt: number; previousItemIds?: readonly string[] }>): readonly ChapterExamV2Item[] | null {
  if (bank.items.length < CHAPTER_EXAM_V2_QUESTION_COUNT) {
    console.warn(LOG, 'select:not_enough', JSON.stringify({ examKey: input.examKey, items: bank.items.length })); // guard-ok: ранний выход с причиной
    return null;
  }
  const random = seededRandom(`${input.examKey}#v2#${input.attempt}`);
  const previous = new Set(input.previousItemIds ?? []);
  const pool = [...shuffled(bank.items.filter((i) => !previous.has(i.id)), random), ...shuffled(bank.items.filter((i) => previous.has(i.id)), random)];
  const picked: ChapterExamV2Item[] = [];
  for (const point of bank.grammarPoints) {
    const first = pool.find((i) => i.grammarPoint === point.id && !picked.includes(i));
    if (first && picked.length < CHAPTER_EXAM_V2_QUESTION_COUNT) picked.push(first);
  }
  for (const item of pool) {
    if (picked.length >= CHAPTER_EXAM_V2_QUESTION_COUNT) break;
    if (!picked.includes(item)) picked.push(item);
  }
  // типы вперемешку: не больше двух одинаковых подряд
  const ordered = shuffled(picked, random);
  for (let k = 2; k < ordered.length; k += 1) {
    if (ordered[k]!.type === ordered[k - 1]!.type && ordered[k]!.type === ordered[k - 2]!.type) {
      const swap = ordered.findIndex((o, m) => m > k && o.type !== ordered[k]!.type);
      if (swap > 0) [ordered[k], ordered[swap]] = [ordered[swap] as ChapterExamV2Item, ordered[k] as ChapterExamV2Item];
    }
  }
  console.log(LOG, 'select:done', JSON.stringify({ examKey: input.examKey, attempt: input.attempt, items: ordered.map((i) => i.id), points: [...new Set(ordered.map((i) => i.grammarPoint))] })); // guard-ok: итог подбора
  return Object.freeze(ordered);
}

// ── Итог, слабые темы, пересдача ─────────────────────────────────────────────────────────────────────────────────────
export type ChapterExamV2Answer = Readonly<{ itemId: string; grammarPoint: string; correct: boolean }>;
export type ChapterExamV2WeakPoint = Readonly<{ grammarPoint: string; errors: number; episodeOrdinals: readonly number[] }>;
export type ChapterExamV2Result = Readonly<{ correct: number; total: number; passed: boolean; weakPoints: readonly ChapterExamV2WeakPoint[] }>;

/** Итог: сдал от CHAPTER_EXAM_V2_PASS_CORRECT; слабые темы — до трёх с ошибками (больше ошибок — выше) и их эпизоды для повторения. */
export function scoreChapterExamV2(bank: ChapterExamV2Bank, answers: readonly ChapterExamV2Answer[]): ChapterExamV2Result {
  const correct = answers.filter((a) => a.correct).length;
  const errors = new Map<string, number>();
  for (const a of answers) if (!a.correct) errors.set(a.grammarPoint, (errors.get(a.grammarPoint) ?? 0) + 1);
  const weakPoints = [...errors.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 3)
    .map(([grammarPoint, n]) => Object.freeze({ grammarPoint, errors: n, episodeOrdinals: bank.grammarPoints.find((p) => p.id === grammarPoint)?.episodeOrdinals ?? [] }));
  const result = Object.freeze({ correct, total: answers.length, passed: correct >= CHAPTER_EXAM_V2_PASS_CORRECT, weakPoints: Object.freeze(weakPoints) });
  console.log(LOG, 'score', JSON.stringify({ lesson: bank.lessonOrdinal, chapter: bank.chapterOrdinal, correct, total: answers.length, passed: result.passed, weak: weakPoints.map((w) => `${w.grammarPoint}:${w.errors}`) })); // guard-ok: итог
  return result;
}

/**
 * Когда можно пересдать после провала. Владелец 25.10: после «Повторить эти темы» — сразу; без повторения — через час.
 * reviewedAtMs — когда человек закончил повтор тем ПОСЛЕ этой попытки (null — не повторял).
 */
export function chapterExamV2RetryAtMs(input: Readonly<{ failedAtMs: number; reviewedAtMs: number | null }>): number {
  if (input.reviewedAtMs !== null && input.reviewedAtMs >= input.failedAtMs) return input.reviewedAtMs;
  return input.failedAtMs + CHAPTER_EXAM_V2_RETRY_DELAY_MS;
}
