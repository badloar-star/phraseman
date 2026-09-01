import { claimAccountForAuth } from './account_claim';
import { accountIdIndexDocId } from './account_id';

/*
 * Аккаунт выдаёт сервер: тесты на ПОВЕДЕНИЕ.
 *
 * Главное здесь — идемпотентность. Если повторный вызов заведёт второй
 * аккаунт, мы вернёмся ровно к той проблеме, ради которой всё затевалось:
 * у одного человека два профиля и слияние между ними.
 */

type Doc = Record<string, unknown> | null;

function fakeDb(seed: Record<string, Doc>, opts?: { failFirstTx?: boolean }) {
  const docs: Record<string, Doc> = { ...seed };
  let txAttempts = 0;
  const snap = (key: string) => ({ exists: docs[key] != null, data: () => docs[key] ?? undefined });

  const db = {
    collection: (col: string) => ({
      doc: (id: string) => ({
        path: `${col}/${id}`,
        get: () => Promise.resolve(snap(`${col}/${id}`)),
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      txAttempts += 1;
      const pending: Array<[string, Record<string, unknown>]> = [];
      const tx = {
        get: (ref: { path: string }) => Promise.resolve(snap(ref.path)),
        create: (ref: { path: string }, data: Record<string, unknown>) => { pending.push([ref.path, data]); },
        set: (ref: { path: string }, data: Record<string, unknown>) => { pending.push([ref.path, data]); },
      };
      const result = await fn(tx);
      // Победитель гонки успевает записаться до нас — имитируем это.
      if (opts?.failFirstTx && txAttempts === 1) throw Object.assign(new Error('raced'), { code: 'aborted' });
      pending.forEach(([p, d]) => { docs[p] = { ...(docs[p] ?? {}), ...d }; });
      return result;
    },
  };
  return { db: db as never, docs };
}

const AUTH = 'firebase-auth-uid-1';
const indexPath = (alias: string) => `account_id_index/${accountIdIndexDocId(alias)}`;

describe('сервер выдаёт аккаунт', () => {
  it('первый вызов создаёт аккаунт и сразу кладёт его в карту имён', async () => {
    const { db, docs } = fakeDb({});
    const res = await claimAccountForAuth(db, AUTH);

    expect(res.created).toBe(true);
    expect(res.accountId).toMatch(/^acc_[0-9a-f]{32}$/);
    // Карта обязана заполниться в той же транзакции — иначе опознание по имени
    // не заработает для новых людей.
    expect(docs[indexPath(AUTH)]).toMatchObject({ accountId: res.accountId, kind: 'auth' });
    expect(docs[indexPath(res.stableId)]).toMatchObject({ accountId: res.accountId, kind: 'stable' });
    expect(docs[`users/${res.stableId}`]).toMatchObject({ firebaseAuthUid: AUTH });
    expect(docs[`auth_links/${AUTH}`]).toMatchObject({ stable_id: res.stableId });
  });

  it('повторный вызов возвращает ТОТ ЖЕ аккаунт и ничего не создаёт', async () => {
    const { db } = fakeDb({});
    const first = await claimAccountForAuth(db, AUTH);
    const second = await claimAccountForAuth(db, AUTH);

    expect(second.created).toBe(false);
    expect(second.accountId).toBe(first.accountId);
    expect(second.stableId).toBe(first.stableId);
  });

  it('гонка двух экранов даёт ОДИН аккаунт, а не два', async () => {
    // Победитель успел записаться, пока наш ответ был в пути.
    const winnerAccount = 'acc_11111111111111111111111111111111';
    const { db } = fakeDb({
      [indexPath(AUTH)]: { accountId: winnerAccount, stableId: 'winner-stable', kind: 'auth' },
      'users/winner-stable': { accountId: winnerAccount },
    }, { failFirstTx: true });

    const res = await claimAccountForAuth(db, AUTH);
    expect(res.created).toBe(false);
    expect(res.accountId).toBe(winnerAccount);
  });

  it('карта ведёт на слитый аккаунт → заводим новую личность, а не пустой профиль', async () => {
    // Устаревшая карта — ровно тот случай, из которого рождались пустые профили.
    const { db } = fakeDb({
      [indexPath(AUTH)]: { accountId: 'acc_22222222222222222222222222222222', stableId: 'merged-away', kind: 'auth' },
      'users/merged-away': { accountId: 'acc_22222222222222222222222222222222', identityHidden: true },
    });
    const res = await claimAccountForAuth(db, AUTH);
    expect(res.created).toBe(true);
    expect(res.accountId).not.toBe('acc_22222222222222222222222222222222');
  });

  it('карта ведёт на исчезнувший документ → тоже новая личность', async () => {
    const { db } = fakeDb({
      [indexPath(AUTH)]: { accountId: 'acc_33333333333333333333333333333333', stableId: 'gone', kind: 'auth' },
    });
    const res = await claimAccountForAuth(db, AUTH);
    expect(res.created).toBe(true);
  });

  it('удаляемый аккаунт НЕ получает новую личность в обход grace', async () => {
    // Иначе человек внутри 14 дней тихо получил бы чистый профиль вместо
    // предложения вернуть свой.
    const { db } = fakeDb({
      [`account_deletion_auth_markers/${AUTH}`]: {
        status: 'pending', graceDeadlineMs: Date.now() + 86_400_000,
      },
    });
    await expect(claimAccountForAuth(db, AUTH)).rejects.toThrow('account_delete_pending');
  });

  it('удалённый навсегда — тоже отказ, но другим кодом', async () => {
    const { db } = fakeDb({
      [`account_deletion_auth_markers/${AUTH}`]: { status: 'completed' },
    });
    await expect(claimAccountForAuth(db, AUTH)).rejects.toThrow('identity_retired');
  });
});
