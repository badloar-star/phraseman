import { phraseProgressStatusForCount } from '../components/journal/progress_status';

describe('phraseProgressStatusForCount', () => {
  it.each([
    [-5, 'start'], [0, 'start'], [1, 'moving'], [79, 'moving'], [80, 'confident'],
    [199, 'confident'], [200, 'strong'], [399, 'strong'], [400, 'impressive'],
    [699, 'impressive'], [700, 'expert'], [999, 'expert'], [1000, 'outstanding'],
  ] as const)('maps %i retained phrases to %s', (count, expected) => {
    expect(phraseProgressStatusForCount(count)).toBe(expected);
  });
});
