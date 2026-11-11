// Сторож F08 «Два push»: одно событие рассылки занимает ровно один прогон.
import { claimPushRun, pushRunDaySlot, pushRunHourSlot, PUSH_RUN_LEASES_COLLECTION } from './push_run_lease';

/** Мини-Firestore: create() атомарен — второй create того же id падает ALREADY_EXISTS (код 6). */
function fakeDb(failWith?: Error) {
  const docs = new Map<string, Record<string, unknown>>();
  const collections: string[] = [];
  return {
    docs,
    collections,
    collection: (name: string) => {
      collections.push(name);
      return {
        doc: (id: string) => ({
          create: async (data: Record<string, unknown>) => {
            if (failWith) throw failWith;
            if (docs.has(id)) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
            docs.set(id, data);
          },
        }),
      };
    },
  };
}

describe('claimPushRun', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    error = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); error.mockRestore(); });

  it('два одновременных прогона одного события — проходит ровно один', async () => {
    const db = fakeDb();
    const now = Date.UTC(2026, 10, 11, 10, 0, 3);
    const results = await Promise.all([
      claimPushRun(db as never, 'reEngagePush', pushRunHourSlot(now), now),
      claimPushRun(db as never, 'reEngagePush', pushRunHourSlot(now), now),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(db.docs.size).toBe(1);
    expect(db.collections[0]).toBe(PUSH_RUN_LEASES_COLLECTION);
    expect(warn).toHaveBeenCalledTimes(1); // пропуск дубля не немой
  });

  it('следующее плановое событие (другой слот) и другая рассылка проходят', async () => {
    const db = fakeDb();
    const morning = Date.UTC(2026, 10, 11, 10, 0);
    const evening = Date.UTC(2026, 10, 11, 22, 0);
    expect(await claimPushRun(db as never, 'reEngagePush', pushRunHourSlot(morning), morning)).toBe(true);
    expect(await claimPushRun(db as never, 'reEngagePush', pushRunHourSlot(evening), evening)).toBe(true);
    expect(await claimPushRun(db as never, 'premiumExpiryReminder', pushRunDaySlot(morning), morning)).toBe(true);
    expect(await claimPushRun(db as never, 'premiumExpiryReminder', pushRunDaySlot(evening), evening)).toBe(false);
  });

  it('сбой записи (не «уже есть») пробрасывается: без занятого события не шлём', async () => {
    const db = fakeDb(Object.assign(new Error('UNAVAILABLE'), { code: 14 }));
    await expect(claimPushRun(db as never, 'tournamentStartPush', 'room-1', 1)).rejects.toThrow('UNAVAILABLE');
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('ключи слотов: сутки и час UTC', () => {
    const now = Date.UTC(2026, 10, 11, 22, 59, 59);
    expect(pushRunDaySlot(now)).toBe('2026-11-11');
    expect(pushRunHourSlot(now)).toBe('2026-11-11T22');
  });
});
