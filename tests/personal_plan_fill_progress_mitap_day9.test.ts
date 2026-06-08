import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Mitap day 9', () => {
  it('tracks Mitap Day 9 as generator-backed certified task-scope content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    expect(data.latestCheckpoint).toBe('P3.205 Mitap Day 9 generator-backed certified content');

    const day9 = data.dayQuality.find((row: { label: string }) => row.label === 'Mitap Day 9');
    expect(day9).toEqual(expect.objectContaining({
      label: 'Mitap Day 9',
      status: 'certified',
      quality: 96,
      whatExists: expect.stringContaining('task-scope content'),
      notes: expect.stringContaining('mitap_d009_generator_packet'),
    }));
  });
});
