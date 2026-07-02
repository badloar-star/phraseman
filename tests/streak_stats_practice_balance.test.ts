import { shouldUsePracticeWarmup } from '../app/streak_stats_practice_balance';
import fs from 'fs';
import path from 'path';

describe('stats practice balance warmup', () => {
  it('uses a warmup state for a fresh account with one active day', () => {
    expect(shouldUsePracticeWarmup({
      active7: 1,
      totalStreak: 1,
      xp7: 385,
      minutes7: 16,
    })).toBe(true);
  });

  it('keeps warmup copy for the second active day too', () => {
    expect(shouldUsePracticeWarmup({
      active7: 2,
      totalStreak: 2,
      xp7: 620,
      minutes7: 24,
    })).toBe(true);
  });

  it('does not hide rhythm evaluation once there is enough weekly activity', () => {
    expect(shouldUsePracticeWarmup({
      active7: 3,
      totalStreak: 3,
      xp7: 900,
      minutes7: 35,
    })).toBe(false);
  });

  it('does not show warmup when there is no practice yet', () => {
    expect(shouldUsePracticeWarmup({
      active7: 0,
      totalStreak: 0,
      xp7: 0,
      minutes7: 0,
    })).toBe(false);
  });

  it('keeps fresh-account warmup copy factual instead of judging against a 7-day target', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_stats.tsx'), 'utf8');
    const warmupBlock = source.slice(source.indexOf('if (isWarmup) {'), source.indexOf('let actionTitle'));
    const coachBlock = source.slice(source.indexOf('function LearningCoachCard'), source.indexOf('return (<StatsCardArtSurface name="practiceBalance"'));

    expect(warmupBlock).not.toContain("scoreSubLabel = '/7'");
    // Warmup-копия — фактическая («N дней практики»), без оценки против 7-дневной цели.
    expect(warmupBlock).toContain('Позанимайся ещё — и картина станет полной.');
    // Карточка «Твоя неделя»: конкретные факты вместо расплывчатых сигналов.
    expect(coachBlock).toContain('const weekFacts = [');
    expect(coachBlock).not.toContain('1 длинный день');
  });
});
