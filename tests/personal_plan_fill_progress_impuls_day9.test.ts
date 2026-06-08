import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Impuls day 9', () => {
  it('tracks Impuls Day 9 as generator-backed certified main-point response content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.207 Impuls Day 9 generator-backed certified content');

    const day9 = data.dayQuality.find((row: { label: string }) => row.label === 'Impuls Day 9');
    expect(day9).toEqual(expect.objectContaining({
      label: 'Impuls Day 9',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('main-point response content'),
      notes: expect.stringContaining('impuls_d009_generator_packet'),
    }));
  });
});
