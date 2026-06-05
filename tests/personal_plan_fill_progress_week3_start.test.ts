import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress week 3 start', () => {
  it('tracks Day 15 and Day 16 chat drafts for every plan as freer Week 3 micro-scenarios', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(16);
    }

    const day15Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 15'));
    const day16Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 16'));

    expect(day15Rows).toHaveLength(5);
    expect(day16Rows).toHaveLength(5);
    expect(day15Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 3 micro-scenario'))).toBe(true);
    expect(day15Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('freer'))).toBe(true);
    expect(day16Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 3 micro-scenario'))).toBe(true);
    expect(day16Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('freer'))).toBe(true);
  });
});
