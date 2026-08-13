import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 10 controlled variation', () => {
  it('tracks Day 10 as a controlled variation day for every plan', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(10);
    }

    const day10Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 10'));
    expect(day10Rows).toHaveLength(5);
    expect(day10Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 10', status: 'certified' }),
      expect.objectContaining({ label: 'Voyazh Day 10', status: 'certified' }),
      expect.objectContaining({ label: 'Gavan Day 10', status: 'certified' }),
      expect.objectContaining({ label: 'Impuls Day 10', status: 'certified' }),
      expect.objectContaining({ label: 'Echo Day 10', status: 'certified' }),
    ]));
    for (const row of day10Rows as Array<{ status: string; whatExists: string; notes: string }>) {
      expect(row.whatExists.toLowerCase()).toContain('controlled variation');
      if (row.status === 'certified') {
        expect(row.notes).toMatch(/_d010_generator_packet/);
      } else {
        expect(row.notes.toLowerCase()).toContain('precision');
      }
    }
  });
});
