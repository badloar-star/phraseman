import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Impuls day 11', () => {
  it('tracks Impuls Day 11 as generator-backed certified short-answer prompted production content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toContain('generator-backed certified content');

    const day11 = data.dayQuality.find((row: { label: string }) => row.label === 'Impuls Day 11');
    expect(day11).toEqual(expect.objectContaining({
      label: 'Impuls Day 11',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('short-answer prompted production content'),
      notes: expect.stringContaining('impuls_d011_generator_packet'),
    }));
  });
});
