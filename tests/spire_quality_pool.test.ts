/**
 * Пик: добавка к пулу языка — независимо принятые задания видов «выбор» (владелец 11.11.2026: «Добавить к нынешним»).
 *
 * зачем: задания лежат статическим файлом и попадают в набор недели только через сборщик. Сторож держит обещания:
 *   1) КАЖДАЯ строка настоящего файла (content/spire-quality) становится заданием пула и проходит ту же серверную
 *      проверку и ту же публичную проекцию, что задания нынешнего пула, — иначе сборщик молча её отбросит;
 *   2) номер задания принадлежит своему языку по правилу жалоб и списка снятых — иначе снятое задание ломает сборку языка;
 *   3) в публичном задании нет ключа ответа и разбора.
 * Сработал — чинить scripts/import_peak_quality_pool.mjs или functions/src/spire_quality_pool.ts, а не сторожа.
 */
import fs from 'fs';
import path from 'path';

import { arenaIsTaskMode } from '../functions/src/arena_stars_v3';
import { spireQualityPoolFromRows, spireQualityTaskFromRow } from '../functions/src/spire_quality_pool';
import { spireTaskIdBelongsToTarget } from '../functions/src/spire_task_flag_contract';
import { toPublicTournamentTask } from '../functions/src/tournament_core';

const LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;

// Сборщик читает добавку из сгенерированного файла бандла (его нет в репозитории — кладёт copy_generated_assets.js).
// Здесь файл подменён: es — настоящими строками content/spire-quality, de — битым бандлом, fr — отсутствует.
jest.mock('../functions/src/generated/spire_quality_es.json', () => {
  const fsMock = jest.requireActual('fs') as typeof import('fs');
  const pathMock = jest.requireActual('path') as typeof import('path');
  const file = pathMock.resolve(__dirname, '..', 'content', 'spire-quality', 'es', 'tasks.jsonl');
  const rows = fsMock.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
  return { schemaVersion: 'spire-quality-bundle-v1', rows };
}, { virtual: true });
jest.mock('../functions/src/generated/spire_quality_de.json', () => ({ schemaVersion: 'чужая-схема', rows: [] }), { virtual: true });
// зачем подмена с ошибкой: после локальной сборки файл fr лежит на диске — тест не должен зависеть от того, собирали ли функции
jest.mock('../functions/src/generated/spire_quality_fr.json', () => { throw new Error('bundle_absent'); }, { virtual: true });

function realRows(lang: string): unknown[] {
  const file = path.resolve(__dirname, '..', 'content', 'spire-quality', lang, 'tasks.jsonl');
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
}

describe('Пик: добавка принятых заданий к пулу языка', () => {
  it('каждая строка пяти языков становится заданием пула — без отказов', () => {
    for (const lang of LANGS) {
      const rows = realRows(lang);
      const pool = spireQualityPoolFromRows(rows, lang);
      expect([lang, pool.reasons]).toEqual([lang, {}]);
      expect([lang, pool.tasks.length]).toEqual([lang, rows.length]);
      expect(pool.tasks.length).toBeGreaterThanOrEqual(150);
    }
  });

  it('номера уникальны между языками и принадлежат своему языку по правилу жалоб', () => {
    const all = new Set<string>();
    for (const lang of LANGS) {
      for (const task of spireQualityPoolFromRows(realRows(lang), lang).tasks) {
        expect(all.has(task.taskId)).toBe(false);
        all.add(task.taskId);
        expect([task.taskId, spireTaskIdBelongsToTarget(task.taskId, lang)]).toEqual([task.taskId, true]);
        for (const other of LANGS) {
          if (other !== lang) expect([task.taskId, other, spireTaskIdBelongsToTarget(task.taskId, other)]).toEqual([task.taskId, other, false]);
        }
      }
    }
  });

  it('задание годится набору недели: режим Арены, публичная проекция собирается и не несёт ключа и разбора', () => {
    for (const lang of LANGS) {
      for (const task of spireQualityPoolFromRows(realRows(lang), lang).tasks) {
        expect(arenaIsTaskMode(task.mode)).toBe(true);
        const open = toPublicTournamentTask(task, 'probe');
        expect([task.taskId, open !== null]).toEqual([task.taskId, true]);
        const text = JSON.stringify(open);
        expect(text).not.toContain('correctIndex');
        expect(text).not.toContain('wrongOptionReasons');
      }
    }
  });

  it('сборщик недели читает добавку из бандла; битый или отсутствующий файл — пустой список с причиной, без падения', () => {
    // зачем require внутри теста: модуль сборщика тянет firebase-admin, а подмены файлов бандла должны встать раньше
    const { loadQualityPool } = require('../functions/src/spire_pack_build') as typeof import('../functions/src/spire_pack_build');
    const es = loadQualityPool('es');
    expect([es.tasks.length, es.rejected, es.reason]).toEqual([realRows('es').length, 0, undefined]);
    const de = loadQualityPool('de');
    expect([de.tasks.length, de.reason]).toEqual([0, 'quality_bundle_invalid']);
    const fr = loadQualityPool('fr');
    expect([fr.tasks.length, fr.reason]).toEqual([0, 'bundle_absent']);
  });

  it('чужой язык, чужой номер, битая форма и повтор номера отклоняются с причиной', () => {
    const row = realRows('es')[0] as Record<string, unknown>;
    expect(spireQualityTaskFromRow(row, 'es').ok).toBe(true);
    expect(spireQualityTaskFromRow(row, 'de')).toEqual({ ok: false, reason: 'row_lang' });
    expect(spireQualityTaskFromRow({ ...row, taskId: 'arena-de-pq-x' }, 'es')).toEqual({ ok: false, reason: 'row_task_id' });
    expect(spireQualityTaskFromRow({ ...row, mode: 'speed_match' }, 'es')).toEqual({ ok: false, reason: 'row_mode' });
    expect(spireQualityTaskFromRow({ ...row, options: ['a', 'b', 'c'] }, 'es')).toEqual({ ok: false, reason: 'row_options' });
    expect(spireQualityTaskFromRow({ ...row, phrase: ' ' }, 'es')).toEqual({ ok: false, reason: 'row_texts' });
    const twice = spireQualityPoolFromRows([row, row], 'es');
    expect([twice.tasks.length, twice.rejected, twice.reasons]).toEqual([1, 1, { duplicate_task_id: 1 }]);
  });
});
