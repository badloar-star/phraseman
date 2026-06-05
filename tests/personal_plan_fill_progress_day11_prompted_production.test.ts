import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 11 prompted production', () => {
  it('tracks Day 11 chat drafts for every plan as a prompted production day', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(11);
    }

    const day11Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 11'));
    expect(day11Rows).toHaveLength(5);
    expect(day11Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 11', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 11', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 11', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 11', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 11', status: 'chat draft' }),
    ]));
    expect(day11Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('prompted production'))).toBe(true);
    expect(day11Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('rescue'))).toBe(true);
  });
});
