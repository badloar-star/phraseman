import { HttpsError } from 'firebase-functions/v2/https';

import { readProgressAccountBinding, INITIAL_ACCOUNT_GENERATION } from './progress_event_callable';

// ════════════════════════════════════════════════════════════════════════════
// Инцидент 2026-08-24: accountGeneration читали пять серверных путей, но не
// писал НИКТО — на проде поля не было у всех 1203 пользователей, и приём
// прогресса не работал ни у кого (0 принятых событий за всё время).
// Сервер теперь заводит поле первому обратившемуся аккаунту.
// ════════════════════════════════════════════════════════════════════════════

type Doc = { exists: boolean; data: () => Record<string, unknown> | undefined };

function makeDb(options: {
  authLink?: Record<string, unknown>;
  user?: Record<string, unknown>;
  tombstone?: boolean;
}) {
  const writes: Array<{ path: string; payload: Record<string, unknown> }> = [];
  let userData = options.user;

  const doc = (collection: string, id: string) => ({
    get: async (): Promise<Doc> => {
      if (collection === 'auth_links') {
        return { exists: Boolean(options.authLink), data: () => options.authLink };
      }
      if (collection === 'users') {
        return { exists: userData !== undefined, data: () => userData };
      }
      return { exists: Boolean(options.tombstone), data: () => ({}) };
    },
    __path: `${collection}/${id}`,
  });

  const db = {
    collection: (collection: string) => ({ doc: (id: string) => doc(collection, id) }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: { get: () => Promise<Doc>; __path: string }) => Promise<Doc>;
      set: (ref: { __path: string }, payload: Record<string, unknown>, opts: unknown) => void;
    }) => Promise<T>): Promise<T> => fn({
      get: (ref) => ref.get(),
      set: (ref, payload) => {
        writes.push({ path: ref.__path, payload });
        userData = { ...(userData ?? {}), ...payload };
      },
    }),
  };

  return { db: db as never, writes };
}

const AUTH_UID = 'auth-uid-1';
const STABLE = '0f4c9d2e-1111-2222-3333-444455556666';

describe('accountGeneration initialization', () => {
  it('заводит поколение 1, когда поля нет — приём прогресса больше не падает', async () => {
    const { db, writes } = makeDb({
      authLink: { stable_id: STABLE },
      user: { progress: {} },
    });

    const binding = await readProgressAccountBinding(db, AUTH_UID);

    expect(binding.accountGeneration).toBe(INITIAL_ACCOUNT_GENERATION);
    expect(binding.stableUid).toBe(STABLE);
    expect(writes).toHaveLength(1);
    expect(writes[0].payload).toEqual({ accountGeneration: 1 });
  });

  it('НЕ перезаписывает существующее поколение (смысл счётчика сохранён)', async () => {
    const { db, writes } = makeDb({
      authLink: { stable_id: STABLE },
      user: { accountGeneration: 7 },
    });

    const binding = await readProgressAccountBinding(db, AUTH_UID);

    expect(binding.accountGeneration).toBe(7);
    expect(writes).toHaveLength(0);
  });

  it('принимает legacy-поле generation без записи', async () => {
    const { db, writes } = makeDb({
      authLink: { stable_id: STABLE },
      user: { generation: 3 },
    });

    await expect(readProgressAccountBinding(db, AUTH_UID))
      .resolves.toMatchObject({ accountGeneration: 3 });
    expect(writes).toHaveLength(0);
  });

  it('аккаунт в процессе удаления поля НЕ получает', async () => {
    const { db, writes } = makeDb({
      authLink: { stable_id: STABLE },
      user: { progress: {} },
      tombstone: true,
    });

    await expect(readProgressAccountBinding(db, AUTH_UID)).rejects.toThrow(HttpsError);
    expect(writes).toHaveLength(0);
  });

  it('без якоря идентичности поле не заводится', async () => {
    const { db, writes } = makeDb({ user: { progress: {} } });

    await expect(readProgressAccountBinding(db, AUTH_UID)).rejects.toThrow(HttpsError);
    expect(writes).toHaveLength(0);
  });
});
