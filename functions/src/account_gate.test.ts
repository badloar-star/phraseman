import { readAuthAccountState, readStableAccountState, assertAccountUsable, assertStableGroupUsable } from './account_gate';
import { accountDeletePermanentDenialId } from './account_delete_job';

/*
 * Единая дверь: тесты на ПОВЕДЕНИЕ, а не на текст исходника.
 *
 * зачем именно так: контрактные тесты по строкам ловят переименования, но не
 * ловят логику. Здесь дверь реально запускается на подставной базе, потому что
 * ей предстоит заменить 122 самодельные проверки — цена ошибки максимальная.
 */

type Doc = Record<string, unknown> | null;

/**
 * Минимальная подставная база: только то, что дверь реально читает.
 *
 * зачем настоящий accountDeletePermanentDenialId: отказы лежат по ХЕШУ имени.
 * Первая версия теста имитировала путь вручную и разошлась с продом — тест
 * падал там, где дверь работала верно. Ключ обязан считаться той же функцией.
 */
function fakeDb(docs: Record<string, Doc>) {
  return {
    collection: (col: string) => ({
      doc: (id: string) => ({
        get: () => Promise.resolve({
          exists: docs[`${col}/${id}`] != null,
          data: () => docs[`${col}/${id}`] ?? undefined,
        }),
      }),
    }),
  } as never;
}

/** Путь документа отказа — ровно тот, что построит прод. */
const denialPath = (identity: string) => `account_deletion_permanent_denials/${accountDeletePermanentDenialId(identity)}`;

const NOW = 1_800_000_000_000;
const MARKERS = 'account_deletion_auth_markers';
const TOMBS = 'account_deletion_tombstones';

describe('единая дверь аккаунта', () => {
  it('нет меток → аккаунт живой', async () => {
    const st = await readStableAccountState(fakeDb({}), 'u1', NOW);
    expect(st.kind).toBe('active');
  });

  it('идёт grace → аккаунт жив, но заявлен к удалению', async () => {
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'pending', graceDeadlineMs: NOW + 86_400_000 },
    }), 'u1', NOW);
    expect(st).toEqual({ kind: 'grace', graceDeadlineMs: NOW + 86_400_000, subject: 'stable' });
  });

  it('срок вышел → мёртв, возврата нет', async () => {
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'pending', graceDeadlineMs: NOW - 1 },
    }), 'u1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('воркер уже сносит данные → мёртв', async () => {
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'running', graceDeadlineMs: NOW + 86_400_000 },
    }), 'u1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('удаление завершено → мёртв', async () => {
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'completed' },
    }), 'u1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('дедлайн строкой НЕ считается живым grace', async () => {
    // Number('9999999999999') дало бы валидное число — и человеку пообещали бы
    // восстановление, которого сервер не выполнит.
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'pending', graceDeadlineMs: String(NOW + 86_400_000) },
    }), 'u1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('старая заявка без дедлайна → мёртв (не врём про восстановление)', async () => {
    const st = await readStableAccountState(fakeDb({
      [`${TOMBS}/u1`]: { status: 'pending' },
    }), 'u1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('метки нет, но стоит постоянный отказ → мёртв', async () => {
    const st = await readAuthAccountState(fakeDb({
      [denialPath('a1')]: { status: 'denied' },
    }), 'a1', NOW);
    expect(st.kind).toBe('deleted');
  });

  it('grace важнее постоянного отказа: аккаунт ещё можно вернуть', async () => {
    const st = await readAuthAccountState(fakeDb({
      [`${MARKERS}/a1`]: { status: 'pending', graceDeadlineMs: NOW + 3600_000 },
      [denialPath('a1')]: { status: 'denied' },
    }), 'a1', NOW);
    expect(st.kind).toBe('grace');
  });
});

describe('отказ клиенту', () => {
  it('живой аккаунт не бросает', () => {
    expect(() => assertAccountUsable({ kind: 'active' })).not.toThrow();
  });

  it('grace → account_delete_pending (приложение покажет «Восстановить?»)', () => {
    expect(() => assertAccountUsable({ kind: 'grace', graceDeadlineMs: NOW, subject: 'stable' }))
      .toThrow('account_delete_pending');
  });

  it('мёртвый → identity_retired (чистый профиль)', () => {
    expect(() => assertAccountUsable({ kind: 'deleted', subject: 'auth' }))
      .toThrow('identity_retired');
  });

  it('коды РАЗНЫЕ — их схлопывание и было главной дырой 01.09', () => {
    let graceCode = '';
    let deadCode = '';
    try { assertAccountUsable({ kind: 'grace', graceDeadlineMs: NOW, subject: 'stable' }); }
    catch (e) { graceCode = String((e as Error).message); }
    try { assertAccountUsable({ kind: 'deleted', subject: 'stable' }); }
    catch (e) { deadCode = String((e as Error).message); }
    expect(graceCode).not.toBe(deadCode);
  });
});

describe('группа личностей после слияний', () => {
  it('все живые → пропускает', async () => {
    await expect(assertStableGroupUsable(fakeDb({}), ['u1', 'u2'], NOW)).resolves.toBeUndefined();
  });

  it('одна мёртвая → отказ', async () => {
    await expect(assertStableGroupUsable(fakeDb({
      [`${TOMBS}/u2`]: { status: 'completed' },
    }), ['u1', 'u2'], NOW)).rejects.toThrow('identity_retired');
  });

  it('grace имеет приоритет над смертью соседа: человеку положен модал', async () => {
    await expect(assertStableGroupUsable(fakeDb({
      [`${TOMBS}/u1`]: { status: 'completed' },
      [`${TOMBS}/u2`]: { status: 'pending', graceDeadlineMs: NOW + 3600_000 },
    }), ['u1', 'u2'], NOW)).rejects.toThrow('account_delete_pending');
  });

  it('пустой список не делает ни одного чтения', async () => {
    await expect(assertStableGroupUsable(fakeDb({}), [], NOW)).resolves.toBeUndefined();
  });
});
