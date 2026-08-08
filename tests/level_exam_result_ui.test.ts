import fs from 'fs';
import path from 'path';

import { getLevelExamResultCopy } from '../app/level_exam_result_copy';

describe('level exam result UI', () => {
  it('explains pass, retry distance, and server reward states honestly', () => {
    expect(getLevelExamResultCopy('ru', { passed: true, neededForPass: 0, energyCost: 5 })).toMatchObject({
      title: 'Экзамен сдан',
      primaryAction: 'Продолжить обучение',
      rewardEarned: '+1 спин за первое успешное прохождение',
      rewardPending: 'Спин будет начислен после синхронизации',
    });
    expect(getLevelExamResultCopy('ru', { passed: false, neededForPass: 3, energyCost: 5 })).toMatchObject({
      title: 'Нужно ещё 3 правильных ответа',
      primaryAction: 'Повторить экзамен −5 ⚡',
    });
  });

  it('keeps result motion finite, sounded once, theme-aware, and accessible', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/level-exam/LevelExamResult.tsx'),
      'utf8',
    );
    expect(source).toContain('useReducedMotion()');
    expect(source).toContain("'pm.complete.exam_pass'");
    expect(source).toContain("'pm.complete.exam_retry'");
    expect(source).toContain('dedupeKey: attemptId');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).not.toContain('withRepeat');
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(source).not.toMatch(/rgba?\(/i);
    expect(source).not.toMatch(/borderWidth\s*:/);
  });
});
