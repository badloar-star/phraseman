import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress week 3 close', () => {
  it('tracks Day 19-21 chat drafts for every plan as the Week 3 closeout', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(21);
    }

    const day19Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 19'));
    const day20Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 20'));
    const day21Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 21'));

    expect(day19Rows).toHaveLength(5);
    expect(day20Rows).toHaveLength(5);
    expect(day21Rows).toHaveLength(5);
    expect(day19Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 3 stress'))).toBe(true);
    expect(day20Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 3 repair'))).toBe(true);
    expect(day21Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 3 check'))).toBe(true);
    expect(day21Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('week 4'))).toBe(true);
  });
});
