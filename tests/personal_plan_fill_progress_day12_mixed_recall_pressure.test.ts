import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 12 mixed recall pressure', () => {
  it('tracks Day 12 mixed-recall progression for every plan', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);

    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(12);
    }

    const day12Rows = data.dayQuality.filter((row: { label: string }) => row.label.endsWith('Day 12'));
    expect(day12Rows).toHaveLength(5);
    expect(day12Rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Mitap Day 12', status: 'chat draft' }),
      expect.objectContaining({ label: 'Voyazh Day 12', status: 'certified' }),
      expect.objectContaining({ label: 'Gavan Day 12', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 12', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 12', status: 'chat draft' }),
    ]));
    expect(day12Rows.every((row: { whatExists: string }) => /mixed[- ]recall/.test(row.whatExists.toLowerCase()))).toBe(true);
    expect(day12Rows.every((row: { status: string; notes: string }) =>
      row.status === 'certified'
        ? row.notes.includes('generator_packet')
        : row.notes.toLowerCase().includes('light pressure'))).toBe(true);
  });
});
