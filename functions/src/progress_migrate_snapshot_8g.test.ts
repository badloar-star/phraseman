import * as fs from 'fs';
import * as path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { buildMigrationPatch, planProgressMigration } from './progress_events';

/*
 * Пакет 8G — progressMigrateSnapshot не затирает progress пустым снимком.
 * Семантика проверяется на НАСТОЯЩЕМ Admin SDK (@google-cloud/firestore): маска полей,
 * которую set(..., { merge: true }) отправит на сервер. Сеть не нужна — пишется только план.
 */

const NOW = new Date('2026-10-02T00:00:00Z');
const TS = { sentinel: 'serverTimestamp' };

/** Маска полей, которую Admin SDK отправит для set(..., { merge: true }). */
function mergeMask(update: Record<string, unknown>): string[] {
  const db = new Firestore({ projectId: 'demo-8g' });
  const batch = db.batch();
  batch.set(db.doc('users/u'), update, { merge: true });
  const ops = (batch as unknown as { _ops: { op: () => { updateMask?: { fieldPaths: string[] } } }[] })._ops;
  return [...(ops[0].op().updateMask?.fieldPaths ?? [])].sort();
}

function plan(snapshot: Record<string, unknown>, existing: Record<string, unknown> = {}, migrationExists = false) {
  return planProgressMigration({ snapshot, existing, migrationExists, authUid: 'auth-1', now: NOW, serverTimestamp: () => TS });
}

describe('8G — семантика Admin SDK (доказательство дефекта)', () => {
  it('пустой map при merge — маска «progress» целиком (поле заменится пустым)', () => {
    expect(mergeMask({ progress: {}, updatedAt: 1 })).toEqual(['progress', 'updatedAt']);
    expect(mergeMask({ progress: { lesson1_cellIndex: '5' } })).toEqual(['progress.lesson1_cellIndex']);
  });
});

describe('8G — план миграции', () => {
  it('пустой снимок: ничего не пишем, маркер не ставим', () => {
    expect(plan({}, { lesson1_cellIndex: '9', lesson2_progress: '[1]' })).toEqual({ decision: 'empty_snapshot', userUpdate: null, marker: null, keys: [] });
  });

  it('снимок есть, но сервер не хуже: маркер и служебные поля, progress в записи нет', () => {
    const result = plan({ lesson1_cellIndex: '3', streak_count: '5' }, { lesson1_cellIndex: '9' });
    expect(result.decision).toBe('nothing_to_migrate');
    expect(result.userUpdate).not.toHaveProperty('progress');
    expect(mergeMask(result.userUpdate as Record<string, unknown>)).not.toContain('progress');
    expect(result.marker).toEqual({ migrated: true, keys: [], createdAt: TS });
  });

  it('непустой patch: маска только по ключам patch — существующие ключи облака не трогаются', () => {
    const result = plan({ lesson1_cellIndex: '12', 'lesson_progress_v2::fr::lesson3_cellIndex': '4' }, { lesson1_cellIndex: '9', other_key: 'x' });
    expect(result.decision).toBe('migrated');
    const mask = mergeMask(result.userUpdate as Record<string, unknown>);
    expect(mask.filter((field) => field === 'progress' || field.startsWith('progress.'))).toEqual([
      'progress.`lesson_progress_v2::fr::lesson3_cellIndex`', 'progress.lesson1_cellIndex',
    ]);
    expect(result.keys).toEqual(['lesson1_cellIndex', 'lesson_progress_v2::fr::lesson3_cellIndex']);
  });

  it('уже перенесено — ничего не пишем', () => {
    expect(plan({ lesson1_cellIndex: '12' }, {}, true)).toEqual({ decision: 'already_migrated', userUpdate: null, marker: null, keys: [] });
  });

  it('buildMigrationPatch не удаляет ключи: только добавляет/повышает (значения — строки-листья)', () => {
    const existing = { lesson1_cellIndex: '9', lesson2_progress: JSON.stringify([1, 1, 1]), keep: 'x' };
    const patch = buildMigrationPatch({ lesson1_cellIndex: '2', lesson2_progress: JSON.stringify([1]), lesson4_cellIndex: '1' }, existing, NOW);
    expect(patch).toEqual({ lesson4_cellIndex: '1' });
    for (const value of Object.values(patch)) expect(typeof value).toBe('string');
  });

  it('callable пишет через план, лог решения без uid', () => {
    const source = fs.readFileSync(path.join(__dirname, 'progress_events.ts'), 'utf8');
    const body = source.slice(source.indexOf('export const progressMigrateSnapshot'));
    expect(body).toContain('const plan = planProgressMigration({');
    expect(body).toContain('tx.set(userRef, plan.userUpdate, { merge: true });');
    expect(body).not.toMatch(/progress: patch/);
    expect(body).toContain('[PROGRESS-MIGRATE] decision=');
    const logStatement = body.slice(body.indexOf('[PROGRESS-MIGRATE]'), body.indexOf(');', body.indexOf('[PROGRESS-MIGRATE]')));
    expect(logStatement).not.toMatch(/${[^}]*uid[^}]*}/i);
  });
});
