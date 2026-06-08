import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 5 stress choice', () => {
  it('tracks certified Day 5 generator content separately from remaining Day 5 chat drafts', () => {
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
      expect.objectContaining({ label: 'Mitap Day 5', status: 'certified' }),
      expect.objectContaining({ label: 'Voyazh Day 5', status: 'certified' }),
      expect.objectContaining({ label: 'Gavan Day 5', status: 'certified' }),
      expect.objectContaining({ label: 'Impuls Day 5', status: 'certified' }),
      expect.objectContaining({ label: 'Echo Day 5', status: 'certified' }),
    ]));
    expect(day5Rows.filter((row: { status: string }) => row.status === 'certified')).toHaveLength(5);
    expect(day5Rows.find((row: { label: string }) => row.label === 'Voyazh Day 5')?.notes.toLowerCase()).toContain('valid_non_live_dry_run');
    expect(day5Rows.find((row: { label: string }) => row.label === 'Mitap Day 5')?.notes.toLowerCase()).toContain('valid_non_live_dry_run');
    expect(day5Rows.find((row: { label: string }) => row.label === 'Gavan Day 5')?.notes.toLowerCase()).toContain('valid_non_live_dry_run');
    expect(day5Rows.find((row: { label: string }) => row.label === 'Impuls Day 5')?.notes.toLowerCase()).toContain('valid_non_live_dry_run');
    expect(day5Rows.find((row: { label: string }) => row.label === 'Echo Day 5')?.notes.toLowerCase()).toContain('valid_non_live_dry_run');
    expect(day5Rows.every((row: { status: string }) => row.status === 'certified')).toBe(true);
  });
});
