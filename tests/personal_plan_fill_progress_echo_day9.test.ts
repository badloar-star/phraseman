import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Echo day 9', () => {
  it('tracks Echo Day 9 as generator-backed certified key-detail listening content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.208 Echo Day 9 generator-backed certified content');

    const day9 = data.dayQuality.find((row: { label: string }) => row.label === 'Echo Day 9');
    expect(day9).toEqual(expect.objectContaining({
      label: 'Echo Day 9',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('key-detail listening content'),
      notes: expect.stringContaining('echo_d009_generator_packet'),
    }));
  });
});
