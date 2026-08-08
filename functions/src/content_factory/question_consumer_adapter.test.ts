import { applyQuestionReplacements, assertChallengeDraftOnly } from './question_consumer_adapter';

describe('question stage consumer adapters', () => {
  const item = (locale: string, index: number) => ({ id: `q${index}`, prompt: `${locale} prompt ${index}`, choices: [`Correct ${index}`, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`], correctIndex: 0, optionExplanations: [`${locale} correct`, `${locale} wrong A`, `${locale} wrong B`, `${locale} wrong C`], skillTag: 'travel', difficulty: 'medium', sourcePhraseIds: [] });

  it('keeps Challenge explicitly draft-only', () => {
    expect(() => assertChallengeDraftOnly('publish')).toThrow('challenge_runtime_consumer_not_found');
    expect(assertChallengeDraftOnly('preview')).toBe('draft_only_no_consumer');
  });

  it('materializes a replacement without changing any other accepted item', () => {
    const original = [item('ru', 1), item('ru', 2)];
    const replacement = { ...item('ru', 1), prompt: 'Новый вопрос' };
    expect(applyQuestionReplacements(original, [{ replacementForQuestionId: 'q1', item: replacement }]).map((value) => value.prompt)).toEqual(['Новый вопрос', 'ru prompt 2']);
  });
});
