import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Gavan day 9', () => {
  it('tracks Gavan Day 9 as generator-backed certified next-step appointment content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.206 Gavan Day 9 generator-backed certified content');

    const day9 = data.dayQuality.find((row: { label: string }) => row.label === 'Gavan Day 9');
    expect(day9).toEqual(expect.objectContaining({
      label: 'Gavan Day 9',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('next-step appointment content'),
      notes: expect.stringContaining('gavan_d009_generator_packet'),
    }));
  });
});
