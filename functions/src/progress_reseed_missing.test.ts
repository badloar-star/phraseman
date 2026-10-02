import * as fs from 'fs';
import * as path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  PROGRESS_RESEED_LIMITS,
  handleProgressReseedMissing,
  normalizeReseedSnapshot,
  planProgressReseed,
  type ProgressReseedDeps,
} from './progress_reseed_missing';
import { classifyRootField } from './accounts_v2_migration/inventory';

/*
 * Пакет 8I (TG-41E8B2DA2340) — дозаливка затёртого 8G облачного progress.
 * Сервер пишет ТОЛЬКО ключи, которых нет в облаке; маска записи проверяется на настоящем
 * Admin SDK (@google-cloud/firestore), как в 8G. Сеть не нужна.
 */

const NOW = new Date('2026-10-02T12:00:00Z');
// Скаляр, а не объект: объект-заглушка дал бы маску progressReseedAt.<поле>.
const TS = 'server-ts';
const HOUR = 60 * 60 * 1000;

/** Маска полей, которую Admin SDK отправит для set(..., { merge: true }). */
function mergeMask(update: Record<string, unknown>): string[] {
  const db = new Firestore({ projectId: 'demo-8i' });
  const batch = db.batch();
  batch.set(db.doc('users/u'), update, { merge: true });
  const ops = (batch as unknown as { _ops: { op: () => { updateMask?: { fieldPaths: string[] } } }[] })._ops;
  return [...(ops[0].op().updateMask?.fieldPaths ?? [])].sort();
}

type Write = { path: string; data: Record<string, unknown>; options: unknown };
type UserDoc = { exists: boolean; data?: Record<string, unknown> };

function makeDeps(doc: UserDoc, overrides: Partial<ProgressReseedDeps> = {}) {
  const writes: Write[] = [];
  const logs: string[] = [];
  let transactions = 0;
  const deps: ProgressReseedDeps = {
    db: {
      collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
      runTransaction: async (fn) => {
        transactions += 1;
        return fn({
          get: async () => ({ exists: doc.exists, data: () => doc.data }),
          set: (ref, data, options) => { writes.push({ path: ref.path, data, options }); },
        });
      },
    },
    resolveStableUid: async () => 'stable-1',
    now: () => NOW,
    serverTimestamp: () => TS,
    log: (line) => { logs.push(line); },
    ...overrides,
  };
  return { deps, writes, logs, transactions: () => transactions };
}

const authed = (progress: unknown) => ({ auth: { uid: 'auth-1' }, data: { stableId: 'stable-1', progress } });
const authoritative = (progress: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  exists: true,
  data: { progressServerAuthoritative: true, progress, ...extra },
});

describe('8I — план дозаливки (только отсутствующие ключи)', () => {
  const plan = (snapshot: Record<string, unknown>, existing: Record<string, unknown>, lastReseedAtMs: number | null = null) =>
    planProgressReseed({
      snapshot, existing, userExists: true, serverAuthoritative: true, lastReseedAtMs,
      nowMs: NOW.getTime(), serverTimestamp: () => TS,
    });

  it('существующий ключ не перезаписан, даже если в снимке значение выше', () => {
    const result = plan({ lesson1_cellIndex: '40' }, { lesson1_cellIndex: '3' });
    // C-1: облако с уроком не затёрто → отказ целиком, а не только этот ключ.
    expect(result.decision).toBe('not_wiped');
    expect(result.userUpdate).toBeNull();
  });

  it('понижение невозможно: существующий прогресс урока не трогается', () => {
    const result = plan({ lesson2_progress: '[1]', lesson2_cellIndex: '0' }, { lesson2_progress: '[1,1,1]', lesson2_cellIndex: '9' });
    expect(result.userUpdate).toBeNull();
  });

  it('пишутся только отсутствующие (и только те, что переносит миграция)', () => {
    const result = plan({
      lesson5_cellIndex: '7',
      lesson5_progress: '[1,0,1]',
      'lesson_progress_v2::fr::lesson3_cellIndex': '4',
      lesson5_best_score: '100',
      streak_count: '400',
      other: 'клиентский ключ из снимка',
    }, { other: 'x', flashcards_v1: null });
    expect(result.decision).toBe('reseeded');
    expect(result.keys).toEqual(['lesson5_cellIndex', 'lesson5_progress', 'lesson_progress_v2::fr::lesson3_cellIndex']);
    expect(result.userUpdate).toEqual({
      progress: { lesson5_cellIndex: '7', lesson5_progress: '[1,0,1]', 'lesson_progress_v2::fr::lesson3_cellIndex': '4' },
      progressReseedAt: TS,
    });
  });

  it('ключ, который в облаке есть со значением null, считается существующим', () => {
    expect(plan({ lesson7_cellIndex: '5' }, { lesson7_cellIndex: null }).userUpdate).toBeNull();
  });

  it('пустой снимок и «нечего дописать» — без записи', () => {
    expect(plan({}, {}).decision).toBe('empty_snapshot');
    expect(plan({ lesson1_cellIndex: '0' }, {}).decision).toBe('nothing_missing');
  });

  it('раз в сутки: отметка моложе суток — rate_limited без записи; старше — можно', () => {
    expect(plan({ lesson5_cellIndex: '7' }, {}, NOW.getTime() - HOUR)).toMatchObject({ decision: 'rate_limited', userUpdate: null });
    expect(plan({ lesson5_cellIndex: '7' }, {}, NOW.getTime() + HOUR)).toMatchObject({ decision: 'rate_limited', userUpdate: null });
    expect(plan({ lesson5_cellIndex: '7' }, {}, NOW.getTime() - 25 * HOUR).decision).toBe('reseeded');
  });

  // C-1 (ревью 8I): дозаливка разрешена ТОЛЬКО при признаке затирания — иначе изменённый клиент
  // мог бы раз в сутки дописывать ключи и раздуть документ к лимиту 1 МБ.
  it.each([
    ['lesson1_cellIndex', '3'],
    ['lesson2_progress', '[1]'],
    ['lesson_progress_v2::fr::lesson4_cellIndex', '1'],
    ['lesson_progress_v2::fr::7', '[1]'],
  ])('облако с ключом урока %s → not_wiped без записи', (key, value) => {
    const result = plan({ lesson5_cellIndex: '7' }, { [key]: value, flashcards_v1: null });
    expect(result).toEqual({ decision: 'not_wiped', userUpdate: null, keys: [] });
  });

  it('облако с ключом урока → not_wiped раньше суточного лимита', () => {
    expect(plan({ lesson5_cellIndex: '7' }, { lesson1_cellIndex: '3' }, NOW.getTime() - HOUR).decision).toBe('not_wiped');
  });

  it('номер урока вне диапазона отброшен (0 и больше потолка), в диапазоне — записан', () => {
    const max = PROGRESS_RESEED_LIMITS.maxLessonId;
    const result = plan({
      lesson0_cellIndex: '5',
      [`lesson${max + 1}_cellIndex`]: '5',
      [`lesson${max + 1}_progress`]: '[1]',
      [`lesson_progress_v2::fr::${max + 1}`]: '[1]',
      [`lesson_progress_v2::fr::lesson${max + 1}_cellIndex`]: '5',
      lesson9999_cellIndex: '5',
      [`lesson${max}_cellIndex`]: '5',
      'lesson_progress_v2::fr::1': '[1]',
    }, {});
    expect(result.keys).toEqual([`lesson${max}_cellIndex`, 'lesson_progress_v2::fr::1']);
  });

  it('аккаунт без серверного прогресса или без документа — без записи', () => {
    const base = { snapshot: { lesson5_cellIndex: '7' }, existing: {}, lastReseedAtMs: null, nowMs: NOW.getTime(), serverTimestamp: () => TS };
    expect(planProgressReseed({ ...base, userExists: true, serverAuthoritative: false }).decision).toBe('not_authoritative');
    expect(planProgressReseed({ ...base, userExists: false, serverAuthoritative: false }).decision).toBe('user_missing');
  });
});

describe('8I — маска записи Admin SDK', () => {
  it('в записи только progress.<ключ> и progressReseedAt — облачный progress целиком не заменяется', () => {
    const result = planProgressReseed({
      snapshot: { lesson5_cellIndex: '7', 'lesson_progress_v2::fr::9': '[1]' },
      existing: { flashcards_v1: '[]' },
      userExists: true, serverAuthoritative: true, lastReseedAtMs: null, nowMs: NOW.getTime(), serverTimestamp: () => TS,
    });
    expect(mergeMask(result.userUpdate as Record<string, unknown>)).toEqual([
      'progress.`lesson_progress_v2::fr::9`', 'progress.lesson5_cellIndex', 'progressReseedAt',
    ]);
  });
});

describe('8I — лимиты снимка', () => {
  it('больше ключей, чем лимит, — отказ snapshot_too_large', () => {
    const big: Record<string, string> = {};
    for (let i = 0; i <= PROGRESS_RESEED_LIMITS.maxKeys; i += 1) big[`lesson${i}_cellIndex`] = '1';
    expect(() => normalizeReseedSnapshot(big)).toThrow('snapshot_too_large');
  });

  it('слишком длинное значение или общий размер — отказ snapshot_too_large', () => {
    expect(() => normalizeReseedSnapshot({ lesson1_progress: 'x'.repeat(PROGRESS_RESEED_LIMITS.maxValueChars + 1) })).toThrow('snapshot_too_large');
    const wide: Record<string, string> = {};
    for (let i = 0; i < 20; i += 1) wide[`lesson${i}_progress`] = 'y'.repeat(PROGRESS_RESEED_LIMITS.maxValueChars);
    expect(() => normalizeReseedSnapshot(wide)).toThrow('snapshot_too_large');
  });

  it('не объект — пустой снимок; нестроковые/вложенные значения отброшены', () => {
    expect(normalizeReseedSnapshot([1, 2])).toEqual({});
    expect(normalizeReseedSnapshot(null)).toEqual({});
    expect(normalizeReseedSnapshot({ lesson1_cellIndex: 5, lesson2_cellIndex: { a: 1 }, lesson3_cellIndex: '2' }))
      .toEqual({ lesson1_cellIndex: 5, lesson3_cellIndex: '2' });
  });
});

describe('8I — callable: доступ, запись, частота', () => {
  it('без auth — отказ unauthenticated, ни чтений, ни записей', async () => {
    const { deps, writes, transactions } = makeDeps(authoritative({}));
    await expect(handleProgressReseedMissing({ data: { progress: { lesson5_cellIndex: '7' } } }, deps)).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(transactions()).toBe(0);
    expect(writes).toEqual([]);
  });

  it('чужой uid (резолвер отказал) — отказ, без записи', async () => {
    const { deps, writes, transactions } = makeDeps(authoritative({}), {
      resolveStableUid: async () => { throw new HttpsError('permission-denied', 'stable_id_mismatch'); },
    });
    await expect(handleProgressReseedMissing(authed({ lesson5_cellIndex: '7' }), deps)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(transactions()).toBe(0);
    expect(writes).toEqual([]);
  });

  it('лимит размера — отказ до любых чтений', async () => {
    const { deps, writes, transactions } = makeDeps(authoritative({}));
    await expect(handleProgressReseedMissing(authed({ lesson1_progress: 'x'.repeat(PROGRESS_RESEED_LIMITS.maxValueChars + 1) }), deps))
      .rejects.toMatchObject({ code: 'invalid-argument', message: 'snapshot_too_large' });
    expect(transactions()).toBe(0);
    expect(writes).toEqual([]);
  });

  it('дописывает отсутствующее в users/{stableUid} точечно; лог без uid', async () => {
    const { deps, writes, logs } = makeDeps(authoritative({ flashcards_v1: null }));
    const result = await handleProgressReseedMissing(authed({ lesson1_cellIndex: '0', lesson5_cellIndex: '7' }), deps);
    expect(result).toEqual({ ok: true, reseeded: true, reason: 'reseeded', keys: ['lesson5_cellIndex'] });
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe('users/stable-1');
    expect(writes[0].options).toEqual({ merge: true });
    expect(mergeMask(writes[0].data)).toEqual(['progress.lesson5_cellIndex', 'progressReseedAt']);
    expect(logs).toEqual(['[PROGRESS-RESEED] decision=reseeded snapshot_keys=2 existing_keys=1 written_keys=1 out_of_range_keys=0 user_exists=true server_auth=true']);
    for (const line of logs) expect(line).not.toMatch(/stable-1|auth-1/);
  });

  it('облако не затёрто (есть ключ урока) — ответ not_wiped, без записи', async () => {
    const { deps, writes, logs } = makeDeps(authoritative({ lesson1_cellIndex: '3' }));
    await expect(handleProgressReseedMissing(authed({ lesson5_cellIndex: '7' }), deps))
      .resolves.toEqual({ ok: true, reseeded: false, reason: 'not_wiped', keys: [] });
    expect(writes).toEqual([]);
    expect(logs[0]).toContain('decision=not_wiped');
  });

  it('пустой результат — ничего не пишет', async () => {
    const { deps, writes } = makeDeps(authoritative({ flashcards_v1: null }));
    await expect(handleProgressReseedMissing(authed({ lesson1_cellIndex: '0' }), deps))
      .resolves.toEqual({ ok: true, reseeded: false, reason: 'nothing_missing', keys: [] });
    expect(writes).toEqual([]);
  });

  it('второй вызов за сутки — отказ rate_limited без записи', async () => {
    const lastAt = { toMillis: () => NOW.getTime() - 2 * HOUR };
    const { deps, writes, logs } = makeDeps(authoritative({}, { progressReseedAt: lastAt }));
    await expect(handleProgressReseedMissing(authed({ lesson5_cellIndex: '7' }), deps))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'rate_limited' });
    expect(writes).toEqual([]);
    expect(logs[0]).toContain('decision=rate_limited');
  });
});

describe('8I — проводка', () => {
  const repo = path.join(__dirname, '..', '..');
  const source = fs.readFileSync(path.join(__dirname, 'progress_reseed_missing.ts'), 'utf8');

  it('callable: те же опции, что у миграции (App Check не включается), владелец через resolveStableUidForAuth', () => {
    expect(source).toContain('onCall(HOT_CALLABLE_OPTIONS,');
    expect(source).not.toMatch(/enforceAppCheck\s*:\s*true/);
    expect(source).toMatch(/resolveStableUidForAuth\([^)]*requireKnownIdentity: true/s);
  });

  it('экспорт в index.ts', () => {
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(index).toMatch(/progressReseedMissing,?\s*\}\s*=\s*require\("\.\/progress_reseed_missing"\)/);
    expect(index).toContain('exports.progressReseedMissing = progressReseedMissing;');
  });

  it('firestore.rules: progressReseedAt клиенту не записываем (блок-лист маркеров прогресса)', () => {
    const rules = fs.readFileSync(path.join(repo, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
    for (const fn of ['function hasNoProgressAuthorityMarkerWrites()', 'function newDocHasNoProgressAuthorityMarkerWrites()']) {
      const start = rules.indexOf(fn);
      expect(start).toBeGreaterThan(-1);
      const body = rules.slice(start, rules.indexOf('}', start));
      expect(body).toContain("'progressReseedAt'");
    }
  });

  it('8A: корневое поле progressReseedAt есть в инвентаре и перенос не блокирует', () => {
    expect(classifyRootField('progressReseedAt')).toMatchObject({ ruleId: 'r.progress_markers', disposition: 'keep_in_place' });
  });
});
