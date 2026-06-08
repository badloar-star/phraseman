import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Impuls day 10', () => {
  it('tracks Impuls Day 10 as generator-backed certified alternative-answer controlled variation content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.212 Impuls Day 10 generator-backed certified content');

    const day10 = data.dayQuality.find((row: { label: string }) => row.label === 'Impuls Day 10');
    expect(day10).toEqual(expect.objectContaining({
      label: 'Impuls Day 10',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('alternative-answer controlled variation content'),
      notes: expect.stringContaining('impuls_d010_generator_packet'),
    }));
  });
});
