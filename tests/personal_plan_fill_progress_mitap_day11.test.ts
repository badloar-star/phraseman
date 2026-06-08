import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Mitap day 11', () => {
  it('tracks Mitap Day 11 as generator-backed certified work-update prompted production content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.215 Mitap Day 11 generator-backed certified content');

    const day11 = data.dayQuality.find((row: { label: string }) => row.label === 'Mitap Day 11');
    expect(day11).toEqual(expect.objectContaining({
      label: 'Mitap Day 11',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('work-update prompted production content'),
      notes: expect.stringContaining('mitap_d011_generator_packet'),
    }));
  });
});
