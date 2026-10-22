import { learningV2DistinctPhraseBuilderMeaningV1 } from '../modules/learning-v2/modes/phrase_builder_display_v1';

describe('Learning V2 phrase-builder prompt', () => {
  it('does not render an identical instruction twice', () => {
    expect(learningV2DistinctPhraseBuilderMeaningV1(
      'Соберите фразу из слов',
      '  Соберите фразу из слов  ',
    )).toBeNull();
  });

  it('preserves a distinct sentence meaning', () => {
    expect(learningV2DistinctPhraseBuilderMeaningV1(
      'Соберите фразу из слов',
      'Я грустный.',
    )).toBe('Я грустный.');
  });
});
