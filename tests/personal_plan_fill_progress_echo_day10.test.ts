import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Echo day 10', () => {
  it('tracks Echo Day 10 as generator-backed certified instruction-detail controlled variation content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.213 Echo Day 10 generator-backed certified content');

    const day10 = data.dayQuality.find((row: { label: string }) => row.label === 'Echo Day 10');
    expect(day10).toEqual(expect.objectContaining({
      label: 'Echo Day 10',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('instruction-detail controlled variation content'),
      notes: expect.stringContaining('echo_d010_generator_packet'),
    }));
  });
});
