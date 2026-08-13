import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 4 recall load', () => {
  it('tracks certified Day 4 generator content separately from remaining Day 4 chat drafts', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(4);
    }

    const day4Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 4'));
    expect(day4Rows).toHaveLength(5);
    expect(day4Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 4', status: 'certified' }),
      expect.objectContaining({ label: 'Voyazh Day 4', status: 'certified' }),
      expect.objectContaining({ label: 'Gavan Day 4', status: 'certified' }),
      expect.objectContaining({ label: 'Impuls Day 4', status: 'certified' }),
      expect.objectContaining({ label: 'Echo Day 4', status: 'certified' }),
    ]));
    expect(day4Rows.filter((row: { status: string }) => row.status === 'certified')).toHaveLength(5);
    expect(day4Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('recall'))).toBe(true);
    expect(day4Rows.map((row: { notes: string }) => row.notes).join(' ').toLowerCase()).toContain('valid_non_live_dry_run');
  });
});
