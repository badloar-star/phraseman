import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan fill progress Echo day 10', () => {
  it('tracks Echo Day 10 as generator-backed certified instruction-detail controlled variation content', () => {
    const data = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs', 'reports', 'personal-plans-fill-progress-data.json'),
      'utf8',
    ));

    // зачем: раньше здесь стояло жёсткое равенство latestCheckpoint именно этой
    // метке (P3.213). Поле в отчёте ОДНО на все планы, а таких тестов 16 —
    // одновременно проходил только последний, остальные 15 были красными по
    // построению, а не из-за реальной проблемы. Проверяем то, что осмысленно:
    // прогресс дошёл до этого дня (номер чекпоинта не меньше) — и ниже сам день.
    const checkpointSeq = Number(String(data.latestCheckpoint).match(/P3\.(\d+)/)?.[1] ?? 0);
    expect(checkpointSeq).toBeGreaterThanOrEqual(213);

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
