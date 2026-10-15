// (Б) координатор 15.10: один push-токен — один владелец; токен A, не снятый при офлайн-выходе, снимается при регистрации за B.
import fs from 'node:fs';
import path from 'node:path';

import { dedupePushTokenForUser, handlePushTokenDedupeUsersWrite, pushTokenToDedupe } from './push_token_dedupe';

const TOKEN = 'ExponentPushToken[device-abc-123]';

function fakeDeps(holders: Record<string, string | undefined>) {
  const queries: string[] = [];
  return {
    queries,
    holders,
    deps: {
      findHolders: async (token: string, limit: number) => {
        queries.push(`${token}|${limit}`);
        return Object.entries(holders).filter(([, value]) => value === token).map(([id]) => id).slice(0, limit);
      },
      clearToken: async (userId: string, token: string) => {
        if (holders[userId] !== token) return false;
        holders[userId] = undefined;
        return true;
      },
    },
  };
}

const event = (userId: string, before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined) => ({
  params: { userId },
  data: {
    before: { exists: before !== undefined, data: () => before },
    after: { exists: after !== undefined, data: () => after },
  },
}) as unknown as Parameters<typeof handlePushTokenDedupeUsersWrite>[0];

describe('pushTokenToDedupe — когда вообще читать', () => {
  it('только на смену токена на непустую строку', () => {
    expect(pushTokenToDedupe(undefined, { expoPushToken: TOKEN })).toBe(TOKEN);
    expect(pushTokenToDedupe({ expoPushToken: 'ExponentPushToken[old-old-old]' }, { expoPushToken: TOKEN })).toBe(TOKEN);
    expect(pushTokenToDedupe({ expoPushToken: TOKEN }, { expoPushToken: TOKEN, xp: 5 })).toBeNull();
    expect(pushTokenToDedupe({ expoPushToken: TOKEN }, {})).toBeNull();
    expect(pushTokenToDedupe(undefined, { expoPushToken: null })).toBeNull();
    expect(pushTokenToDedupe(undefined, { expoPushToken: 'short' })).toBeNull();
    expect(pushTokenToDedupe({ xp: 1 }, undefined)).toBeNull();
  });
});

describe('handlePushTokenDedupeUsersWrite', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('B записал токен устройства → у A он снят, у B остался', async () => {
    const f = fakeDeps({ ownerA: TOKEN, ownerB: TOKEN, ownerC: 'ExponentPushToken[other-device]' });
    await handlePushTokenDedupeUsersWrite(event('ownerB', { xp: 1 }, { xp: 1, expoPushToken: TOKEN }), f.deps);
    expect(f.holders).toEqual({ ownerA: undefined, ownerB: TOKEN, ownerC: 'ExponentPushToken[other-device]' });
    expect(f.queries).toEqual([`${TOKEN}|10`]);
  });

  it('запись без смены токена — ни одного чтения (горячая коллекция)', async () => {
    const f = fakeDeps({ ownerA: TOKEN, ownerB: TOKEN });
    await handlePushTokenDedupeUsersWrite(event('ownerB', { expoPushToken: TOKEN, xp: 1 }, { expoPushToken: TOKEN, xp: 2 }), f.deps);
    expect(f.queries).toEqual([]);
    expect(f.holders.ownerA).toBe(TOKEN);
  });

  it('повтор триггера безопасен; чужой новый токен не трогается', async () => {
    const f = fakeDeps({ ownerA: TOKEN, ownerB: TOKEN });
    expect(await dedupePushTokenForUser('ownerB', TOKEN, f.deps)).toEqual({ found: 1, cleared: 1 });
    expect(await dedupePushTokenForUser('ownerB', TOKEN, f.deps)).toEqual({ found: 0, cleared: 0 });
  });

  it('подключён в общий триггер users/{userId}, без отдельной инвокации', () => {
    const router = fs.readFileSync(path.join(__dirname, 'users_write_router.ts'), 'utf8');
    expect(router).toContain('handlePushTokenDedupeUsersWrite(event)');
    expect(router).toContain("'push_token_dedupe'");
  });
});
