jest.mock('../app/mistake_practice_insights', () => ({
  loadMistakePracticeInsights: jest.fn(),
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn() },
}));

import { buildCompanionMemory } from '../app/ai_companion_memory';
import { loadMistakePracticeInsights } from '../app/mistake_practice_insights';

const loadInsights = jest.mocked(loadMistakePracticeInsights);

describe('buildCompanionMemory target isolation', () => {
  beforeEach(() => {
    loadInsights.mockReset().mockResolvedValue({
      topMistakes: [
        { mistakeId: 'm1', phrase: 'receipt', count: 3, facet: 'grammar', lessonId: null },
      ],
    } as unknown as Awaited<ReturnType<typeof loadMistakePracticeInsights>>);
  });

  it.each(['en', 'fr'] as const)(
    'loads weak words only from the existing %s mistake-practice contour',
    async (studyTarget) => {
      const memory = await buildCompanionMemory('A2', studyTarget);

      expect(loadInsights).toHaveBeenCalledTimes(1);
      expect(loadInsights).toHaveBeenCalledWith(studyTarget);
      expect(memory.weakWords).toEqual(['receipt']);
    },
  );

  it.each(['es', 'de'] as const)(
    'does not leak English weak words into the %s companion profile',
    async (studyTarget) => {
      const memory = await buildCompanionMemory('A2', studyTarget);

      expect(loadInsights).not.toHaveBeenCalled();
      expect(memory.weakWords).toBeUndefined();
      expect(memory.profile).toBe('Level A2, is learning basic conversation.');
      expect(memory.profile).not.toContain('English');
    },
  );

  it('uses a target-neutral fallback for an unknown CEFR value', async () => {
    const memory = await buildCompanionMemory('C1', 'de');

    expect(memory.profile).toBe('Level C1, is learning the language.');
    expect(memory.profile).not.toContain('English');
  });
});
