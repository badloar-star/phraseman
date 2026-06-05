import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress week 2 close', () => {
  it('tracks Day 13 and Day 14 chat drafts for every plan as the Week 2 closeout', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(14);
    }

    const day13Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 13'));
    const day14Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 14'));

    expect(day13Rows).toHaveLength(5);
    expect(day14Rows).toHaveLength(5);
    expect(day13Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('error-driven review'))).toBe(true);
    expect(day13Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('typical error'))).toBe(true);
    expect(day14Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 2 check'))).toBe(true);
    expect(day14Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('week 3'))).toBe(true);
  });
});
