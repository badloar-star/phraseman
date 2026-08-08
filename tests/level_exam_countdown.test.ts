import fs from 'fs';
import path from 'path';

import {
  COUNTDOWN_STEP_MS,
  COUNTDOWN_TOTAL_MS,
  getCountdownStep,
} from '../components/level-exam/levelExamMotion';

describe('level exam countdown motion', () => {
  it('fits the 3-2-1 sequence into 1.8 seconds', () => {
    expect(COUNTDOWN_STEP_MS).toBe(600);
    expect(COUNTDOWN_TOTAL_MS).toBe(1_800);
    expect(getCountdownStep(0)).toBe(3);
    expect(getCountdownStep(599)).toBe(3);
    expect(getCountdownStep(600)).toBe(2);
    expect(getCountdownStep(1_199)).toBe(2);
    expect(getCountdownStep(1_200)).toBe(1);
    expect(getCountdownStep(1_799)).toBe(1);
    expect(getCountdownStep(1_800)).toBeNull();
  });

  it('keeps the production component finite, deduped, and reduced-motion aware', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/level-exam/LevelExamCountdown.tsx'),
      'utf8',
    );

    expect(source).toContain('useReducedMotion()');
    expect(source).toContain("soundDirector.request('pm.exam.begin'");
    expect(source).toContain('dedupeKey: attemptId');
    expect(source).toContain('cancelAnimation');
    expect(source).toContain('clearTimeout');
    expect(source).toContain('completedRef');
    expect(source).not.toContain('withRepeat');
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(source).not.toMatch(/rgba?\(/i);
  });
});
