// зачем (жалоба тестеров 04.11): «Собери фразу» в «Отработке ошибок» всегда решаема — короткая цель, ≤3 отвлекающих без дублей; длинная склейка печатается.
import { MISTAKE_BUILDER_MAX_DISTRACTORS, MISTAKE_BUILDER_MAX_TARGET_TOKENS, boundedBuilderDistractors, buildMistakeExercise } from '../modules/mistake-practice/exercise_builders';

const base = { mistakeId: 'm1', mode: 'lesson_ordered_tokens', sourcePrompt: '', sourceMeaning: 'Я здесь' } as never as Parameters<typeof buildMistakeExercise>[0];
const mk = (over: Record<string, unknown>) => buildMistakeExercise({ ...(base as object), ...over } as Parameters<typeof buildMistakeExercise>[0]);

describe('сборка из плиток решаема', () => {
  it('отвлекающие: без слов самой фразы, без повторов, не больше трёх', () => {
    const out = boundedBuilderDistractors(['a', 'A', 'home.', 'home.', 'cat', 'dog', 'bird', 'fish', 'two words', ''], ['a', 'home.']);
    expect(out).toEqual(['cat', 'dog', 'bird']);
    expect(out.length).toBeLessThanOrEqual(MISTAKE_BUILDER_MAX_DISTRACTORS);
  });

  it('короткая фраза: плитки = слова + отвлекающие, настоящие повторы фразы сохраняются', () => {
    const ex = mk({ canonicalTarget: 'I like it and I like you', distractors: ['I', 'like', 'run', 'big', 'red', 'cat'] });
    expect(ex.renderer).toBe('builder');
    expect(ex.tokens).toEqual(['I', 'like', 'it', 'and', 'I', 'like', 'you', 'run', 'big', 'red']);
  });

  it('длинная склейка (диалог целиком) не собирается из плиток — печатается', () => {
    const long = Array.from({ length: MISTAKE_BUILDER_MAX_TARGET_TOKENS + 6 }, (_, i) => `w${i}`).join(' ');
    const ex = mk({ canonicalTarget: long, distractors: ['x', 'y'] });
    expect(ex.renderer).toBe('typing');
    expect(ex.tokens).toBeUndefined();
  });
});
