import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress week 4 start', () => {
  it('tracks Day 22-24 chat drafts for every plan as freer Week 4 work', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(24);
    }

    const day22Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 22'));
    const day23Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 23'));
    const day24Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 24'));

    expect(day22Rows).toHaveLength(5);
    expect(day23Rows).toHaveLength(5);
    expect(day24Rows).toHaveLength(5);
    expect(day22Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 4 free answer'))).toBe(true);
    expect(day23Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 4 rephrase'))).toBe(true);
    expect(day24Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 4 branching scenario'))).toBe(true);
    expect(day24Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('two valid paths'))).toBe(true);
  });
});
