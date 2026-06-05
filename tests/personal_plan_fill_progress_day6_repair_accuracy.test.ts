import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 6 repair accuracy', () => {
  it('tracks Day 6 chat drafts for every plan as a recovery and accuracy day', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(6);
    }

    const day6Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 6'));
    expect(day6Rows).toHaveLength(5);
    expect(day6Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 6', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 6', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 6', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 6', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 6', status: 'chat draft' }),
    ]));
    expect(day6Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('repair'))).toBe(true);
    expect(day6Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('recovery'))).toBe(true);
  });
});
