import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 5 stress choice', () => {
  it('tracks Day 5 chat drafts for every plan as a light scenario stress test', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(5);
    }

    const day5Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 5'));
    expect(day5Rows).toHaveLength(5);
    expect(day5Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 5', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 5', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 5', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 5', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 5', status: 'chat draft' }),
    ]));
    expect(day5Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('scenario'))).toBe(true);
    expect(day5Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('stress'))).toBe(true);
  });
});
