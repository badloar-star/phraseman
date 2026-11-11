/**
 * «Проверь себя» после ролика — сборщик вопросов.
 *
 * зачем (владелец 11.11: «чтобы было чем заняться кроме смотреть видео»; решение по вариантам — «варианты из фраз
 * того же ролика… можно»): вопросы собираются НА ТЕЛЕФОНЕ из уже загруженных фраз ролика. Неверные варианты — другие
 * фразы (или переводы) этого же ролика, заранее ничего не готовится, сервер не участвует — новых чтений Firestore нет.
 *
 * Видов вопроса два: «как это сказать» и «что это значит». Вопроса «на слух» нет — владелец 11.11: «вот это
 * „что сказал профессор“ не надо».
 *
 * Модуль чистый: ни сети, ни хранилища, ни времени. Случайность — только из переданного seed, поэтому тест
 * воспроизводим в проверках, а экран сам решает, когда выдать новый seed («Пройти ещё раз»).
 * Макет: docs/work/mockups/video-hub-2026-11-11/index.html, экран 3.
 */
import type { VideoPhrase } from '../shared/video_phrases_contract';

/** to_target — «Как это сказать?» (дан перевод, выбрать фразу); to_native — «Что это значит?» (дана фраза, выбрать перевод). */
export type VideoQuizKind = 'to_target' | 'to_native';

export type VideoQuizQuestion = Readonly<{
  kind: VideoQuizKind;
  /** Фраза ролика, про которую вопрос (`videoId:ordinal`) — по ней ошибка уходит в карточки. */
  phraseId: string;
  /** Текст вопроса: перевод (to_target) или сама фраза (to_native). */
  prompt: string;
  options: readonly string[];
  correctIndex: number;
}>;

export const VIDEO_QUIZ_QUESTION_COUNT = 3;
export const VIDEO_QUIZ_OPTION_COUNT = 3;
/** Из скольких ближайших по длине кандидатов выбираются неверные варианты: похожая длина не выдаёт ответ с первого взгляда. */
const DISTRACTOR_POOL = 4;
const KIND_ORDER: readonly VideoQuizKind[] = ['to_target', 'to_native'];

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Фразы, различимые и по тексту, и по переводу: дубль в любой из колонок дал бы два одинаковых варианта ответа. */
function distinctPhrases(phrases: readonly VideoPhrase[]): readonly VideoPhrase[] {
  const seenPhrase = new Set<string>();
  const seenTranslation = new Set<string>();
  const out: VideoPhrase[] = [];
  for (const item of phrases) {
    const p = norm(item.phrase);
    const t = norm(item.translation);
    if (!p || !t || seenPhrase.has(p) || seenTranslation.has(t)) continue;
    seenPhrase.add(p);
    seenTranslation.add(t);
    out.push(item);
  }
  return out;
}

/** mulberry32: маленький детерминированный генератор, чтобы один seed всегда давал один и тот же тест. */
function rng(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/** Хватает ли фраз ролика на тест. Экран по этому признаку показывает или прячет кнопку «Проверить себя». */
export function canBuildVideoQuiz(phrases: readonly VideoPhrase[]): boolean {
  return distinctPhrases(phrases).length >= VIDEO_QUIZ_OPTION_COUNT;
}

export function buildVideoQuiz(
  phrases: readonly VideoPhrase[],
  opts: Readonly<{ seed: number; count?: number }>,
): readonly VideoQuizQuestion[] {
  const pool = distinctPhrases(phrases);
  if (pool.length < VIDEO_QUIZ_OPTION_COUNT) return [];
  const next = rng(opts.seed);
  const count = Math.max(1, Math.min(opts.count ?? VIDEO_QUIZ_QUESTION_COUNT, pool.length));
  const order = shuffled(pool, next);
  const questions: VideoQuizQuestion[] = [];
  for (let i = 0; i < count; i += 1) {
    const target = order[i] as VideoPhrase;
    const kind = KIND_ORDER[i % KIND_ORDER.length] as VideoQuizKind;
    const pick = (item: VideoPhrase): string => (kind === 'to_native' ? item.translation : item.phrase);
    const correct = pick(target);
    const nearest = pool
      .filter((item) => item.id !== target.id)
      .map((item) => ({ item, gap: Math.abs(pick(item).length - correct.length), tie: next() }))
      .sort((a, b) => a.gap - b.gap || a.tie - b.tie)
      .slice(0, DISTRACTOR_POOL)
      .map((row) => row.item);
    const distractors = shuffled(nearest, next).slice(0, VIDEO_QUIZ_OPTION_COUNT - 1).map(pick);
    const options = shuffled([correct, ...distractors], next);
    questions.push(Object.freeze({
      kind,
      phraseId: target.id,
      prompt: kind === 'to_target' ? target.translation : target.phrase,
      options: Object.freeze(options),
      correctIndex: options.indexOf(correct),
    }));
  }
  return Object.freeze(questions);
}
