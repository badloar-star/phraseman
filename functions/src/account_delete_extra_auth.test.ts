/**
 * Governance-ID: TG-09E2E8CBBE64
 * Q26 (Вход 05.11): при удалении аккаунта вместе с основным Auth-пользователем удаляются остальные Auth-пользователи замыкания личностей
 * (прежние Apple/Google/e-mail), иначе повторный вход упирается в identity_retired. Админа не трогаем, повтор безопасен, сбой одного uid не роняет остальных.
 */
import {
  deleteExtraClosureAuthUsers,
  extraClosureAuthUidCandidates,
  type ExtraAuthApi,
} from './account_delete';

function fakeAuth(users: Record<string, { customClaims?: Record<string, unknown> | null; deleteError?: string }>) {
  const alive = new Map(Object.entries(users));
  const deleted: string[] = [];
  const api: ExtraAuthApi = {
    async getUser(uid) {
      const u = alive.get(uid);
      if (!u) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
      return { customClaims: u.customClaims ?? null };
    },
    async deleteUser(uid) {
      const u = alive.get(uid);
      if (!u) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
      if (u.deleteError) throw Object.assign(new Error('boom'), { code: u.deleteError });
      alive.delete(uid);
      deleted.push(uid);
    },
  };
  return { api, deleted, alive };
}

describe('extraClosureAuthUidCandidates', () => {
  it('замыкание без основного Auth uid, без пустых и повторов; stable id остаётся кандидатом', () => {
    expect(extraClosureAuthUidCandidates(['stable-1', 'auth-main', 'apple-uid', 'google-uid', 'apple-uid', '', '  '], 'auth-main'))
      .toEqual(['stable-1', 'apple-uid', 'google-uid']);
    expect(extraClosureAuthUidCandidates([], 'auth-main')).toEqual([]);
    expect(extraClosureAuthUidCandidates(['auth-main'], 'auth-main')).toEqual([]);
  });
});

describe('deleteExtraClosureAuthUsers', () => {
  const noLog = jest.fn();

  it('удаляет всех кандидатов; несуществующий uid — успех (идемпотентно); повтор ничего не ломает', async () => {
    const { api, deleted, alive } = fakeAuth({ apple: {}, google: {}, email: {} });
    const first = await deleteExtraClosureAuthUsers(api, ['apple', 'google', 'email', 'gone'], noLog);
    expect(first).toEqual({ deleted: 3, notFound: 1, skippedAdmin: 0, failed: 0 });
    expect(deleted.sort()).toEqual(['apple', 'email', 'google']);
    expect(alive.size).toBe(0);
    const second = await deleteExtraClosureAuthUsers(api, ['apple', 'google', 'email', 'gone'], noLog);
    expect(second).toEqual({ deleted: 0, notFound: 4, skippedAdmin: 0, failed: 0 });
  });

  it('пользователя с claim admin НЕ удаляет никогда', async () => {
    const { api, deleted, alive } = fakeAuth({ owner: { customClaims: { admin: true } }, apple: {} });
    const result = await deleteExtraClosureAuthUsers(api, ['owner', 'apple'], noLog);
    expect(result).toEqual({ deleted: 1, notFound: 0, skippedAdmin: 1, failed: 0 });
    expect(deleted).toEqual(['apple']);
    expect(alive.has('owner')).toBe(true);
  });

  it('сбой одного uid не мешает остальным и не бросает; в лог идёт хеш и код, не uid', async () => {
    const log = jest.fn();
    const { api, deleted } = fakeAuth({ bad: { deleteError: 'auth/internal-error' }, good: {} });
    const result = await deleteExtraClosureAuthUsers(api, ['bad', 'good'], log);
    expect(result).toEqual({ deleted: 1, notFound: 0, skippedAdmin: 0, failed: 1 });
    expect(deleted).toEqual(['good']);
    const failedCall = log.mock.calls.find(([event]) => event === 'auth_extra_delete_failed');
    expect(failedCall?.[1]).toEqual({ uidHash: expect.any(String), code: 'auth/internal-error' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('"bad"');
  });

  it('неожиданная ошибка чтения getUser считается сбоем, а не падением', async () => {
    const api: ExtraAuthApi = {
      async getUser() { throw Object.assign(new Error('net'), { code: 'auth/network-request-failed' }); },
      async deleteUser() { throw new Error('must not be called'); },
    };
    await expect(deleteExtraClosureAuthUsers(api, ['x'], noLog)).resolves.toEqual({ deleted: 0, notFound: 0, skippedAdmin: 0, failed: 1 });
  });
});
