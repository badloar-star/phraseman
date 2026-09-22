import {
  canonicalJsonV1,
  sha256Utf8,
} from '../learning-v2/policies/decision_registry';
import type { MistakeExerciseMode } from './exercise_mode_registry';

export type MistakeExerciseRenderer =
  | 'choices'
  | 'fill_gap'
  | 'builder'
  | 'typing'
  | 'listening'
  | 'speech'
  | 'matching';

export interface MistakeExercise {
  readonly exerciseId: string;
  readonly mistakeId: string;
  readonly mode: MistakeExerciseMode;
  readonly renderer: MistakeExerciseRenderer;
  readonly prompt: string;
  /**
   * Перевод-подсказка под заданием (2026-09-21). Появляется только когда
   * задание показывается на изучаемом языке (sourcePrompt), иначе перевод и
   * так стоит в prompt и дублировать его нечем.
   */
  readonly hint?: string;
  readonly correctAnswer: string;
  readonly feedbackAnswer: string;
  readonly options?: readonly string[];
  readonly tokens?: readonly string[];
  readonly audioRef?: string;
  readonly tokenIndex?: number;
  readonly expected?: string;
}

export interface MistakeExerciseMaterial {
  readonly mistakeId: string;
  readonly mode: MistakeExerciseMode;
  readonly canonicalTarget: string;
  readonly sourceMeaning?: string;
  /** Текст задания с пропуском, как его видел ученик. См. MistakeContentRef. */
  readonly sourcePrompt?: string;
  readonly tokens?: readonly string[];
  readonly distractors?: readonly string[];
  readonly audioRef?: string;
  readonly tokenIndex?: number;
  readonly expected?: string;
}

const rendererFor = (mode: MistakeExerciseMode): MistakeExerciseRenderer => {
  if (mode === 'lesson_typing') return 'typing';
  if (mode === 'lesson_listening') return 'listening';
  if (mode === 'lesson_scripted_speech') return 'speech';
  if (mode === 'lesson_fill_gap' || mode === 'arena_fill_gap') return 'fill_gap';
  if (mode === 'lesson_ordered_tokens' || mode === 'arena_translate_build') return 'builder';
  if (mode === 'arena_speed_match') return 'matching';
  return 'choices';
};

export function buildMistakeExercise(
  material: MistakeExerciseMaterial,
): MistakeExercise {
  const canonicalTarget = material.canonicalTarget.trim();
  if (!canonicalTarget) throw new Error('mistake_practice_exercise_answer_required');
  const renderer = rendererFor(material.mode);
  const targetTokens = material.tokens ?? canonicalTarget.split(/\s+/);
  const gapIndex = Number.isSafeInteger(material.tokenIndex)
    && Number(material.tokenIndex) >= 0
    && Number(material.tokenIndex) < targetTokens.length
    ? Number(material.tokenIndex)
    : Math.max(0, targetTokens.length - 1);
  const gapAnswer = material.expected?.trim() || targetTokens[gapIndex] || canonicalTarget;
  // зачем: задание обязано показывать ТЕКСТ ЗАДАНИЯ, а не только перевод.
  // Вопрос «She usually drinks coffee, but today she ___ tea.» доходил сюда
  // одним переводом («Обычно она пьёт кофе, но сегодня пьёт чай») — выбрать
  // между drinks и is drinking было физически невозможно: слово `today`,
  // единственная зацепка для Continuous, на экран не попадало.
  // fill_gap строит пропуск сам из токенов — его порядок не трогаем.
  const authoredPrompt = material.sourcePrompt?.trim() || '';
  const meaning = material.sourceMeaning?.trim() || '';
  const prompt = renderer === 'fill_gap'
    ? targetTokens.map((token, index) => index === gapIndex ? '_____' : token).join(' ')
    : authoredPrompt || meaning || canonicalTarget;
  // Перевод уходит подсказкой ВТОРОЙ строкой — но только если первую занял
  // текст задания, иначе перевод продублировал бы сам себя.
  const hint = prompt !== meaning ? meaning : '';
  const tokens = renderer === 'builder'
    ? Object.freeze([
        ...targetTokens,
        ...(material.distractors ?? []),
      ])
    : undefined;
  const options = renderer === 'fill_gap'
    ? Object.freeze([...new Set([...(material.distractors ?? []), gapAnswer])])
    : renderer === 'choices' || renderer === 'matching'
      ? Object.freeze([...new Set([...(material.distractors ?? []), canonicalTarget])])
      : undefined;
  const correctAnswer = renderer === 'fill_gap' ? gapAnswer : canonicalTarget;
  const identity = canonicalJsonV1({
    canonicalTarget,
    mistakeId: material.mistakeId,
    mode: material.mode,
    prompt,
  });

  return Object.freeze({
    exerciseId: `mistake-exercise:v1:${sha256Utf8(identity)}`,
    mistakeId: material.mistakeId,
    mode: material.mode,
    renderer,
    prompt,
    ...(hint ? { hint } : {}),
    correctAnswer,
    feedbackAnswer: canonicalTarget,
    ...(options ? { options } : {}),
    ...(tokens ? { tokens } : {}),
    ...(material.audioRef ? { audioRef: material.audioRef } : {}),
  });
}
