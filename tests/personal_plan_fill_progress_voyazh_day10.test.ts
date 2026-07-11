import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Voyazh day 10', () => {
  it('tracks Voyazh Day 10 as generator-backed certified transport controlled variation content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toContain('generator-backed certified content');

    const day10 = data.dayQuality.find((row: { label: string }) => row.label === 'Voyazh Day 10');
    expect(day10).toEqual(expect.objectContaining({
      label: 'Voyazh Day 10',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('transport controlled variation content'),
      notes: expect.stringContaining('voyazh_d010_generator_packet'),
    }));
  });
});
