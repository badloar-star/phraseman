import {
  buildLearningV2SessionResultRouteParams,
  parseLearningV2SessionResultRouteParams,
} from '../app/learning_v2_session_result_handoff';

describe('Learning V2 session result presentation handoff', () => {
  it('round-trips one bounded local result without economic authority', () => {
    const params = buildLearningV2SessionResultRouteParams({
      localSessionId: 'lesson-1-understand-1',
      provisionalStars: 3,
    });

    expect(params).toEqual({
      resultSessionId: 'lesson-1-understand-1',
      resultStars: '3',
    });
    expect(parseLearningV2SessionResultRouteParams(params)).toEqual({
      localSessionId: 'lesson-1-understand-1',
      provisionalStars: 3,
      maxStars: 36,
      authority: 'local_presentation_only',
    });
  });

  it.each([
    { resultSessionId: '', resultStars: '3' },
    { resultSessionId: 'lesson/1', resultStars: '3' },
    { resultSessionId: 'lesson-1-understand-1', resultStars: '-1' },
    { resultSessionId: 'lesson-1-understand-1', resultStars: '37' },
    { resultSessionId: 'lesson-1-understand-1', resultStars: '03' },
    { resultSessionId: ['lesson-1-understand-1'], resultStars: '3' },
  ])('rejects malformed presentation params %#', (input) => {
    expect(parseLearningV2SessionResultRouteParams(input)).toBeNull();
  });

  it('rejects invalid materialization before navigation', () => {
    expect(() => buildLearningV2SessionResultRouteParams({
      localSessionId: 'lesson-1-understand-1',
      provisionalStars: 37,
    })).toThrow('learning_v2_session_result_handoff_invalid');
  });
});
