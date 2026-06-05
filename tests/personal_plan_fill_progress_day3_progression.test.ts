import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 3 progression', () => {
  it('tracks Day 3 chat drafts for every plan with varied progression notes', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);
    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(3);
    }

    expect(data.dayQuality).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 3', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 3', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 3', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 3', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 3', status: 'chat draft' }),
    ]));

    const day3Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 3'));
    expect(day3Rows).toHaveLength(5);
    expect(day3Rows.map((row: { whatExists: string }) => row.whatExists).join(' ')).toContain('recall');
    expect(day3Rows.map((row: { notes: string }) => row.notes).join(' ').toLowerCase()).toContain('varied');
  });
});
