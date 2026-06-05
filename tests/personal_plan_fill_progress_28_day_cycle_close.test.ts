import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress 28 day cycle close', () => {
  it('tracks Day 25-28 chat drafts for every plan as the universal cycle closeout', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(28);
    }

    for (const day of [25, 26, 27, 28]) {
      const rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith(`Day ${day}`));
      expect(rows).toHaveLength(5);
    }

    const day25Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 25'));
    const day26Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 26'));
    const day27Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 27'));
    const day28Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 28'));

    expect(day25Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('cycle stress'))).toBe(true);
    expect(day26Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('cycle repair'))).toBe(true);
    expect(day27Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('final cycle check'))).toBe(true);
    expect(day28Rows.every((row: { whatExists: string }) => row.whatExists.toLowerCase().includes('cycle handoff'))).toBe(true);
    expect(day28Rows.every((row: { notes: string }) => row.notes.toLowerCase().includes('next cycle'))).toBe(true);
  });
});
