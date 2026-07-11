import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Voyazh day 11', () => {
  it('tracks Voyazh Day 11 as generator-backed certified route-planning prompted production content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toContain('generator-backed certified content');

    const day11 = data.dayQuality.find((row: { label: string }) => row.label === 'Voyazh Day 11');
    expect(day11).toEqual(expect.objectContaining({
      label: 'Voyazh Day 11',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('route-planning prompted production content'),
      notes: expect.stringContaining('voyazh_d011_generator_packet'),
    }));
  });
});
