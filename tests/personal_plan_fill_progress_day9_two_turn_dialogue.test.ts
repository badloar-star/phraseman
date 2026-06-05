import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 9 two-turn dialogue', () => {
  it('tracks Day 9 chat drafts for every plan as a two-turn dialogue step', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(9);
    }

    const day9Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 9'));
    expect(day9Rows).toHaveLength(5);
    expect(day9Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 9', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 9', status: 'chat draft' }),
      expect.objectContaining({ label: 'Gavan Day 9', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 9', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 9', status: 'chat draft' }),
    ]));
    expect(day9Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('two-turn dialogue'))).toBe(true);
    expect(day9Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('two-step'))).toBe(true);
  });
});
