import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Gavan day 11', () => {
  it('tracks Gavan Day 11 as generator-backed certified service-request prompted production content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.216 Gavan Day 11 generator-backed certified content');

    const day11 = data.dayQuality.find((row: { label: string }) => row.label === 'Gavan Day 11');
    expect(day11).toEqual(expect.objectContaining({
      label: 'Gavan Day 11',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('service-request prompted production content'),
      notes: expect.stringContaining('gavan_d011_generator_packet'),
    }));
  });
});
