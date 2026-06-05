import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress day 2 coverage', () => {
  it('tracks chat draft Day 2 coverage for every plan before bulk generation starts', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.productionReady).toBe(false);
    for (const planId of ['voyazh', 'mitap', 'gavan', 'impuls', 'echo']) {
      const plan = data.plans.find((row: { id: string }) => row.id === planId);
      expect(plan.filledDays).toBeGreaterThanOrEqual(2);
    }

    expect(data.dayQuality).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Gavan Day 2', status: 'chat draft' }),
      expect.objectContaining({ label: 'Impuls Day 2', status: 'chat draft' }),
      expect.objectContaining({ label: 'Echo Day 2', status: 'chat draft' }),
    ]));
  });
});
