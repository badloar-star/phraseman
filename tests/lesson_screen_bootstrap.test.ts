import {
  buildLessonContentSignature,
  clampStoredLessonCell,
  parseStoredLessonOrder,
  parseStoredLessonProgress,
} from '../app/lesson_screen_bootstrap';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('lesson screen bootstrap storage recovery', () => {
  it('clamps stale saved cells into the playable lesson range', () => {
    expect(clampStoredLessonCell('999', 50)).toBe(49);
    expect(clampStoredLessonCell('-7', 50)).toBe(0);
    expect(clampStoredLessonCell('not-a-number', 50)).toBe(0);
    expect(clampStoredLessonCell('12', 50)).toBe(12);
  });

  it('rejects corrupt or incompatible saved progress', () => {
    expect(parseStoredLessonProgress('not-json', 3)).toBeNull();
    expect(parseStoredLessonProgress(JSON.stringify(['correct', 'wrong']), 3)).toBeNull();
    expect(parseStoredLessonProgress(JSON.stringify(['correct', { bad: true }, 'empty']), 3)).toBeNull();
    expect(parseStoredLessonProgress(JSON.stringify(['correct', 'wrong', 'replay_correct']), 3)).toEqual([
      'correct',
      'wrong',
      'replay_correct',
    ]);
  });

  it('rejects stale phrase orders that no longer match lesson content', () => {
    expect(parseStoredLessonOrder('not-json', 50, 50)).toBeNull();
    expect(parseStoredLessonOrder(JSON.stringify([0, 1, 2]), 50, 50)).toBeNull();
    expect(parseStoredLessonOrder(JSON.stringify([0, 1, 50]), 50, 3)).toBeNull();
    expect(parseStoredLessonOrder(JSON.stringify([0, 1, 1.5]), 50, 3)).toBeNull();
    expect(parseStoredLessonOrder(JSON.stringify([2, 1, 0]), 50, 3)).toEqual([2, 1, 0]);
  });

  it('changes the content signature when lesson phrases change', () => {
    const before = buildLessonContentSignature(11, 'en', ['p1|I worked yesterday|3', 'p2|You helped me yesterday|4']);
    const after = buildLessonContentSignature(11, 'en', ['p1|I worked yesterday|3', 'p2|You called me yesterday|4']);

    expect(before).not.toBe(after);
    expect(before).toBe(buildLessonContentSignature(11, 'en', ['p1|I worked yesterday|3', 'p2|You helped me yesterday|4']));
  });

  it('does not render a fallback first phrase before hydration completes', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

    expect(source).toContain('phrase={lessonHydrated ? phrase : null}');
  });
});
