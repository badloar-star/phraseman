import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Mitap day 9', () => {
  it('tracks Mitap Day 9 as generator-backed certified task-scope content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    // зачем: раньше здесь стояло жёсткое равенство latestCheckpoint именно этой
    // метке (P3.205). Поле в отчёте ОДНО на все планы, а таких тестов 16 —
    // одновременно проходил только последний, остальные 15 были красными по
    // построению, а не из-за реальной проблемы. Проверяем то, что осмысленно:
    // прогресс дошёл до этого дня (номер чекпоинта не меньше) — и ниже сам день.
    const checkpointSeq = Number(String(data.latestCheckpoint).match(/P3\.(\d+)/)?.[1] ?? 0);
    expect(checkpointSeq).toBeGreaterThanOrEqual(205);

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
