import { ARENA_TASK_MODES } from '../modules/arena/contract';
import {
  chooseMistakeExerciseMode,
  compatibleMistakeExerciseModes,
  MISTAKE_EXERCISE_MODE_REGISTRY,
} from '../modules/mistake-practice/exercise_mode_registry';
import { buildMistakeExercise } from '../modules/mistake-practice/exercise_builders';

const fullCapabilities = {
  hasMeaningDistractors: true,
  hasTokenDistractors: true,
  hasOddityCandidates: true,
  supportsTyping: true,
  hasAudio: true,
  supportsSpeech: true,
  tokenCount: 3,
};

describe('mistake exercise mode registry', () => {
  test('registers every approved lesson and Arena mechanic', () => {
    expect(Object.keys(MISTAKE_EXERCISE_MODE_REGISTRY)).toEqual(
      expect.arrayContaining([
        'lesson_choice',
        'lesson_fill_gap',
        'lesson_ordered_tokens',
        'lesson_typing',
        'lesson_listening',
        'lesson_scripted_speech',
        ...ARENA_TASK_MODES.map((mode) => `arena_${mode}`),
      ]),
    );
  });

  test('selects modes by facet and material capability, not source screen', () => {
    const modes = compatibleMistakeExerciseModes({
      facet: 'word_order',
      capabilities: fullCapabilities,
      stage: 'guided',
    });

    expect(modes).toContain('lesson_ordered_tokens');
    expect(modes).toContain('arena_translate_build');
    expect(modes).not.toContain('lesson_choice');
  });

  test('falls back from voice when microphone or audio capability is absent', () => {
    const chosen = chooseMistakeExerciseMode({
      facet: 'pronunciation',
      capabilities: {
        ...fullCapabilities,
        supportsSpeech: false,
        hasAudio: false,
      },
      stage: 'production',
      recentModes: [],
    });

    expect(chosen).toBe('lesson_typing');
  });

  test('avoids repeating the immediately previous mode when alternatives exist', () => {
    const first = chooseMistakeExerciseMode({
      facet: 'word_order',
      capabilities: fullCapabilities,
      stage: 'guided',
      recentModes: [],
    });
    const second = chooseMistakeExerciseMode({
      facet: 'word_order',
      capabilities: fullCapabilities,
      stage: 'guided',
      recentModes: [first],
    });

    expect(second).not.toBe(first);
  });

  test('recognition mechanics cannot count as independent production', () => {
    expect(MISTAKE_EXERCISE_MODE_REGISTRY.arena_speed_match).toMatchObject({
      support: 'recognition',
      countsAsIndependentProduction: false,
    });
    expect(MISTAKE_EXERCISE_MODE_REGISTRY.lesson_typing).toMatchObject({
      support: 'production',
      countsAsIndependentProduction: true,
    });
  });

  test('uses the requested support stage before falling back', () => {
    const recognition = compatibleMistakeExerciseModes({
      facet: 'form', capabilities: fullCapabilities, stage: 'recognition',
    });
    expect(recognition.every((mode) => MISTAKE_EXERCISE_MODE_REGISTRY[mode].support === 'recognition')).toBe(true);

    const guided = compatibleMistakeExerciseModes({
      facet: 'form', capabilities: fullCapabilities, stage: 'guided',
    });
    expect(guided.every((mode) => MISTAKE_EXERCISE_MODE_REGISTRY[mode].support === 'guided')).toBe(true);
  });

  test('does not offer speed-match without multiple real phrase-to-meaning pairs', () => {
    expect(compatibleMistakeExerciseModes({
      facet: 'meaning', capabilities: fullCapabilities, stage: 'recognition',
    })).not.toContain('arena_speed_match');
  });

  test('builds a real missing-token task instead of exposing the full answer', () => {
    const exercise = buildMistakeExercise({
      mistakeId: 'mistake:v1:gap',
      mode: 'lesson_fill_gap',
      canonicalTarget: 'I am ready.',
      sourceMeaning: 'Я готов.',
      tokens: ['I', 'am', 'ready.'],
      distractors: ['is', 'are'],
      tokenIndex: 1,
      expected: 'am',
    });
    expect(exercise.prompt).toBe('I _____ ready.');
    expect(exercise.correctAnswer).toBe('am');
    expect(exercise.feedbackAnswer).toBe('I am ready.');
    expect(exercise.options).toEqual(expect.arrayContaining(['am', 'is', 'are']));
    expect(exercise.options).not.toContain('I am ready.');
  });

  test('builds Arena-style practice locally with an explicit local answer', () => {
    const exercise = buildMistakeExercise({
      mistakeId: 'mistake:v1:one',
      mode: 'arena_translate_build',
      canonicalTarget: 'I am ready.',
      sourceMeaning: 'Я готов.',
      tokens: ['I', 'am', 'ready.'],
      distractors: ['are'],
    });

    expect(exercise).toMatchObject({
      mode: 'arena_translate_build',
      renderer: 'builder',
      prompt: 'Я готов.',
      correctAnswer: 'I am ready.',
    });
    expect(exercise.tokens).toEqual(expect.arrayContaining(['I', 'am', 'ready.']));
    expect(exercise).not.toHaveProperty('deadlineAtMs');
    expect(exercise).not.toHaveProperty('opponent');
    expect(exercise).not.toHaveProperty('reward');
  });
});
