import { findAccountByAlias, verifyAccountHit } from './account_id_lookup';
import { accountIdIndexDocId } from './account_id';

/*
 * Опознание по одному имени: тесты на ПОВЕДЕНИЕ на подставной базе.
 *
 * Эта ступень встраивается ПЕРВОЙ в путь входа всех людей, поэтому проверяется
 * не только счастливый случай, но и каждый способ промахнуться — включая тот,
 * из-за которого появляются пустые профили (устаревшая карта).
 */

const ACC = 'acc_0123456789abcdef0123456789abcdef';
const STABLE = 'stable-1';

function fakeDb(docs: Record<string, Record<string, unknown> | null>, opts?: { throwOn?: string }) {
  return {
    collection: (col: string) => ({
      doc: (id: string) => ({
        get: () => {
          if (opts?.throwOn === col) return Promise.reject(new Error('firestore unavailable'));
          const key = `${col}/${id}`;
          return Promise.resolve({ exists: docs[key] != null, data: () => docs[key] ?? undefined });
        },
      }),
    }),
  } as never;
}

const indexPath = (alias: string) => `account_id_index/${accountIdIndexDocId(alias)}`;

describe('опознание по старому имени', () => {
  it('находит аккаунт по любому из старых имён', async () => {
    for (const alias of ['stable-1', 'firebase-auth-uid', 'google-provider-uid']) {
      const hit = await findAccountByAlias(fakeDb({
        [indexPath(alias)]: { accountId: ACC, stableId: STABLE, kind: 'auth' },
      }), alias);
      expect(hit?.accountId).toBe(ACC);
      expect(hit?.stableId).toBe(STABLE);
      expect(hit?.matchedAlias).toBe(alias);
    }
  });

  it('неизвестное имя → null, вход идёт прежним путём', async () => {
    expect(await findAccountByAlias(fakeDb({}), 'кто-то-новый')).toBeNull();
  });

  it('пустое и слишком длинное имя не читают базу вовсе', async () => {
    // throwOn гарантирует: если бы чтение случилось, тест упал бы.
    const db = fakeDb({}, { throwOn: 'account_id_index' });
    expect(await findAccountByAlias(db, '')).toBeNull();
    expect(await findAccountByAlias(db, '   ')).toBeNull();
    expect(await findAccountByAlias(db, 'x'.repeat(200))).toBeNull();
  });

  it('база недоступна → null, а не падение входа', async () => {
    // Новая ступень НЕ имеет права ронять вход, который до неё работал.
    const hit = await findAccountByAlias(fakeDb({}, { throwOn: 'account_id_index' }), 'stable-1');
    expect(hit).toBeNull();
  });

  it('половинчатая запись индекса считается отсутствующей', async () => {
    // По такой записи нельзя открыть аккаунт, но можно принять решение —
    // это опаснее, чем её отсутствие.
    expect(await findAccountByAlias(fakeDb({
      [indexPath('a')]: { accountId: ACC },
    }), 'a')).toBeNull();
    expect(await findAccountByAlias(fakeDb({
      [indexPath('b')]: { stableId: STABLE },
    }), 'b')).toBeNull();
  });
});

describe('проверка найденного аккаунта', () => {
  const hit = { accountId: ACC, stableId: STABLE, matchedAlias: 'stable-1', matchedKind: 'stable' };

  it('живой аккаунт с тем же именем проходит', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: ACC },
    }), hit)).toBe(true);
  });

  it('аккаунта больше нет → не ведём туда человека', async () => {
    expect(await verifyAccountHit(fakeDb({}), hit)).toBe(false);
  });

  it('аккаунт слит (скрыт) → карта устарела', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: ACC, identityHidden: true },
    }), hit)).toBe(false);
  });

  it('имя в документе разошлось с картой → не доверяем карте', async () => {
    // Именно так и появляются пустые профили: карта ведёт не туда.
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: 'acc_ffffffffffffffffffffffffffffffff' },
    }), hit)).toBe(false);
  });

  it('в документе имени нет вовсе → карта устарела', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { progress: {} },
    }), hit)).toBe(false);
  });

  it('база недоступна → отказ, а не пропуск', async () => {
    expect(await verifyAccountHit(fakeDb({}, { throwOn: 'users' }), hit)).toBe(false);
  });
});

describe('владение найденным аккаунтом (аудит 2026-09-02)', () => {
  const hit = { accountId: ACC, stableId: STABLE, matchedAlias: 'auth-1', matchedKind: 'auth' };

  it('документ принадлежит uid по firebaseAuthUid → проходит', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: ACC, firebaseAuthUid: 'auth-1' },
    }), hit, 'auth-1')).toBe(true);
  });

  it('документ принадлежит другому uid → карта лишь подсказка, решает прежняя лестница', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: ACC, firebaseAuthUid: 'someone-else' },
    }), hit, 'auth-1')).toBe(false);
  });

  it('легаси-документ с id = uid без владельца → не проходит по владению', async () => {
    // Иначе пустой документ старой схемы перебил бы настоящий аккаунт человека.
    const selfHit = { accountId: ACC, stableId: 'auth-1', matchedAlias: 'auth-1', matchedKind: 'stable' };
    expect(await verifyAccountHit(fakeDb({
      'users/auth-1': { accountId: ACC },
    }), selfHit, 'auth-1')).toBe(false);
  });

  it('без указания владельца поведение прежнее', async () => {
    expect(await verifyAccountHit(fakeDb({
      [`users/${STABLE}`]: { accountId: ACC, firebaseAuthUid: 'someone-else' },
    }), hit)).toBe(true);
  });
});
