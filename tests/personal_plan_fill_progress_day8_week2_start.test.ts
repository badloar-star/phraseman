import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 8 week 2 start', () => {
  it('tracks Day 8 chat drafts for every plan as a Week 2 autonomy step', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(8);
    }

    const day8Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 8'));
    expect(day8Rows).toHaveLength(5);
    expect(day8Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 8', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 8', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 8', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 8', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 8', status: 'chat draft' }),
    ]));
    expect(day8Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('week 2'))).toBe(true);
    expect(day8Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('autonomy'))).toBe(true);
  });
});
