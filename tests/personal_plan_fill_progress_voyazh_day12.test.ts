import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Voyazh day 12', () => {
  it('tracks Voyazh Day 12 as generator-backed certified mixed-recall pressure content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.219 Voyazh Day 12 generator-backed certified content');

    const day12 = data.dayQuality.find((row: { label: string }) => row.label === 'Voyazh Day 12');
    expect(day12).toEqual(expect.objectContaining({
      label: 'Voyazh Day 12',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('mixed-recall pressure content'),
      notes: expect.stringContaining('voyazh_d012_generator_packet'),
    }));
  });
});
