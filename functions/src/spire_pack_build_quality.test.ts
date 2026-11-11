/**
 * Сборщик недели Пика: добавка принятых заданий к пулу языка (владелец 11.11.2026: «Добавить к нынешним»).
 * Файл бандла кладёт scripts/copy_generated_assets.js (в репозитории его нет) — здесь он подменён.
 * Настоящие строки content/spire-quality проверяет tests/spire_quality_pool.test.ts.
 */
const ROW = {
  schema: 'peak-quality-runtime-v1',
  taskId: 'arena-es-pq-b003-fill_gap-01',
  authorId: 'peak-quality-es-b003-fill_gap-01',
  lang: 'es',
  mode: 'fill_gap',
  difficulty: 1,
  phrase: 'Замените «las entradas» местоимением: «Ya ___ he comprado».',
  options: ['los', 'la', 'las', 'lo'],
  correctIndex: 2,
  ruleNote: 'Las согласуется с entradas: женский род, множественное число.',
  wrongOptionReasons: ['Los — мужской род.', 'La — единственное число.', '', 'Lo — мужской род и единственное число.'],
};

jest.mock('./generated/spire_quality_es.json', () => ({
  schemaVersion: 'spire-quality-bundle-v1',
  // вторая строка — чужой язык, третья — повтор номера: обе обязаны быть отброшены, а не попасть в набор
  rows: [ROW, { ...ROW, taskId: 'arena-de-pq-b003-fill_gap-01', lang: 'de' }, ROW],
}), { virtual: true });
jest.mock('./generated/spire_quality_de.json', () => ({ schemaVersion: 'чужая-схема', rows: [] }), { virtual: true });
jest.mock('./generated/spire_quality_fr.json', () => { throw new Error('bundle_absent'); }, { virtual: true });

import { loadQualityPool } from './spire_pack_build';

describe('сборщик недели: добавка принятых заданий', () => {
  it('годные строки бандла становятся заданиями пула, негодные считаются отброшенными', () => {
    const pool = loadQualityPool('es');
    expect(pool.tasks.map((task) => task.taskId)).toEqual(['arena-es-pq-b003-fill_gap-01']);
    expect([pool.rejected, pool.reason]).toEqual([2, undefined]);
    expect(pool.tasks[0].payload).toEqual({ phrase: ROW.phrase, options: ROW.options, correctIndex: 2 });
  });

  it('битый бандл — пустой список и причина, сборка не падает', () => {
    expect(loadQualityPool('de')).toEqual({ tasks: [], rejected: 0, reason: 'quality_bundle_invalid' });
  });

  it('файла нет — пустой список и причина, набор собирается как раньше', () => {
    expect(loadQualityPool('fr')).toEqual({ tasks: [], rejected: 0, reason: 'bundle_absent' });
  });
});
