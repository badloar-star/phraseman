import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 9 two-turn dialogue', () => {
  it('tracks Day 9 as a two-turn dialogue step for every plan', () => {
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
      expect.objectContaining({ label: 'Mitap Day 9', status: 'certified' }),
      expect.objectContaining({ label: 'Voyazh Day 9', status: 'certified' }),
      expect.objectContaining({ label: 'Gavan Day 9', status: 'certified' }),
      expect.objectContaining({ label: 'Impuls Day 9', status: 'certified' }),
      expect.objectContaining({ label: 'Echo Day 9', status: 'certified' }),
    ]));
    for (const row of day9Rows as Array<{ label: string; status: string; whatExists: string; notes: string }>) {
      if (row.status === 'certified') {
        expect(row.notes).toMatch(/_d009_generator_packet/);
        expect(row.notes.toLowerCase()).toContain('two-turn');
      } else {
        expect(row.whatExists.toLowerCase()).toContain('two-turn dialogue');
        expect(row.notes.toLowerCase()).toContain('two-step');
      }
    }
  });
});
