import {
  buildProgressCompletionModel,
  type ProgressCompletionInput,
} from '../app/completion/progress_completion_model';

const base: ProgressCompletionInput = {
  fact: '8 из 10 ответов точные',
  accumulated: 'Серия: 4 дня',
  nextStep: 'Две фразы ждут закрепления',
  primaryAction: { id: 'review', label: 'Закрепить 2 фразы' },
};

describe('visible-result completion model', () => {
  test('uses quiet intensity for an ordinary confirmed result', () => {
    expect(buildProgressCompletionModel(base)).toMatchObject({ level: 'quiet', ...base });
  });

  test.each(['perfect', 'record', 'streak'] as const)('%s produces a milestone only when confirmed', (flag) => {
    expect(buildProgressCompletionModel({ ...base, confirmed: { [flag]: true } }).level).toBe('milestone');
  });

  test.each(['levelUp', 'routeComplete', 'majorUnlock'] as const)('%s produces a major result only when confirmed', (flag) => {
    expect(buildProgressCompletionModel({ ...base, confirmed: { [flag]: true } }).level).toBe('major');
  });

  test('defeat stays quiet and keeps the next useful action', () => {
    const model = buildProgressCompletionModel({ ...base, outcome: 'defeat' });
    expect(model.level).toBe('quiet');
    expect(model.primaryAction.id).toBe('review');
  });

  test('rejects empty proof lines instead of inventing progress', () => {
    expect(() => buildProgressCompletionModel({ ...base, accumulated: ' ' })).toThrow('accumulated');
  });
});
