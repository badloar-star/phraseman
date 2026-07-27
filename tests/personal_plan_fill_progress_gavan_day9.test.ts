import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Gavan day 9', () => {
  it('tracks Gavan Day 9 as generator-backed certified next-step appointment content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    // зачем: раньше здесь стояло жёсткое равенство latestCheckpoint именно этой
    // метке (P3.206). Поле в отчёте ОДНО на все планы, а таких тестов 16 —
    // одновременно проходил только последний, остальные 15 были красными по
    // построению, а не из-за реальной проблемы. Проверяем то, что осмысленно:
    // прогресс дошёл до этого дня (номер чекпоинта не меньше) — и ниже сам день.
    const checkpointSeq = Number(String(data.latestCheckpoint).match(/P3\.(\d+)/)?.[1] ?? 0);
    expect(checkpointSeq).toBeGreaterThanOrEqual(206);

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
