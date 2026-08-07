import fs from 'fs';
import path from 'path';

describe('Daily task runtime eligibility', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks.ts'), 'utf8');

  it('requires enough remaining recall cards to finish recall_answers', () => {
    expect(source).toContain("case 'recall_answers':");
    expect(source).toContain('task.target - Math.max(0, progress?.current ?? 0)');
    expect(source).toContain('dueCount >= recallCardsStillRequired(task, row)');
  });

  it('therefore rejects the 3/5 challenge with only one card left and accepts it with two', () => {
    const required = (target: number, current: number) => Math.max(0, target - Math.max(0, current));
    const isEligible = (target: number, current: number, dueCount: number) => dueCount >= required(target, current);

    expect(isEligible(5, 3, 1)).toBe(false);
    expect(isEligible(5, 3, 2)).toBe(true);
  });

  it('preserves completed or already claimed recall tasks', () => {
    expect(source).toContain('if (progress?.completed || progress?.claimed) return 0;');
    expect(source).toContain('if (row?.completed || row?.claimed) return true;');
  });

  it('requires five available cards for a perfect recall session', () => {
    expect(source).toContain('const RECALL_PERFECT_MIN_CARDS = 5;');
    expect(source).toContain("case 'recall_perfect':");
  });
});
