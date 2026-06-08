import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 7 week check', () => {
  it('tracks every Day 7 row as a certified generator-backed weekly check', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(7);
    }

    const day7Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 7'));
    expect(day7Rows).toHaveLength(5);
    expect(day7Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Mitap Day 7',
        status: 'certified',
        quality: 96,
        notes: expect.stringContaining('mitap_d007_generator_packet'),
      }),
      expect.objectContaining({
        label: 'Voyazh Day 7',
        status: 'certified',
        quality: 96,
        notes: expect.stringContaining('voyazh_d007_generator_packet'),
      }),
      expect.objectContaining({
        label: 'Gavan Day 7',
        status: 'certified',
        quality: 96,
        notes: expect.stringContaining('gavan_d007_generator_packet'),
      }),
      expect.objectContaining({
        label: 'Impuls Day 7',
        status: 'certified',
        quality: 96,
        notes: expect.stringContaining('impuls_d007_generator_packet'),
      }),
      expect.objectContaining({
        label: 'Echo Day 7',
        status: 'certified',
        quality: 96,
        notes: expect.stringContaining('echo_d007_generator_packet'),
      }),
    ]));
    expect(day7Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('weekly check'))).toBe(true);
    expect(day7Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('week 1'))).toBe(true);
    expect(day7Rows.filter((row: { status: string }) => row.status === 'certified')).toHaveLength(5);
  });
});
