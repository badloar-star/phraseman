import { mergeArenaQuestionHistory } from './arena_question_history';

test('keeps newest unique arena questions within the fixed history limit', () => {
  expect(mergeArenaQuestionHistory(['q1', 'q2'], ['q2', 'q3'])).toEqual(['q2', 'q3', 'q1']);
  expect(mergeArenaQuestionHistory([], Array.from({ length: 101 }, (_, i) => `q${i}`))).toHaveLength(100);
});
