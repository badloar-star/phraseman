import { arenaNextStepCopy } from '../app/completion/progress_completion_copy';

describe('completion copy confirmation gates', () => {
  test('does not claim a growing win streak before the server result is confirmed', () => {
    expect(arenaNextStepCopy('ru', true, false)).toBe('Результат матча сохраняется');
    expect(arenaNextStepCopy('ru', true, true)).toBe('Серия побед продолжает расти');
  });
});
