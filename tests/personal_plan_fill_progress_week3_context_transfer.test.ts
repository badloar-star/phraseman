import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress week 3 context transfer', () => {
  it('tracks Day 17 and Day 18 chat drafts for every plan as context-transfer Week 3 work', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(18);
    }

    const day17Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 17'));
    const day18Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 18'));

    expect(day17Rows).toHaveLength(5);
    expect(day18Rows).toHaveLength(5);
    expect(day17Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('context choice'))).toBe(true);
    expect(day17Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('less scaffolding'))).toBe(true);
    expect(day18Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('context transfer'))).toBe(true);
    expect(day18Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('transfer'))).toBe(true);
  });
});
