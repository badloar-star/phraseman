import {
  cleanupUnlinkedVideoPromoEntries,
  isUnlinkedVideoPromoEntry,
  videoPromoRetentionCutoffMs,
} from './video_promo_retention';

// зачем (координатор 22.10): заявки акции без почты и без promo.resolvedUid нельзя привязать к человеку —
// они уходят по сроку (90 дней после конца акции), а не по имени. Привязанные заявки не трогаем.
describe('video promo retention', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('cutoff is end of the last promo day at UTC−12 plus 90 days', () => {
    expect(new Date(videoPromoRetentionCutoffMs('2026-12-31')).toISOString()).toBe('2027-04-01T11:59:59.999Z');
  });

  it('only entries without email and without resolvedUid are unlinked', () => {
    expect(isUnlinkedVideoPromoEntry({ topic: 'video_promo', email: null, promo: { username: 'Anna' } })).toBe(true);
    expect(isUnlinkedVideoPromoEntry({ topic: 'video_promo', email: ' ', promo: { username: 'Anna', resolvedUid: '' } })).toBe(true);
    expect(isUnlinkedVideoPromoEntry({ topic: 'video_promo', email: 'a@b.c', promo: { username: 'Anna' } })).toBe(false);
    expect(isUnlinkedVideoPromoEntry({ topic: 'video_promo', email: null, promo: { username: 'Anna', resolvedUid: 'u1' } })).toBe(false);
    expect(isUnlinkedVideoPromoEntry({ topic: 'support', email: null })).toBe(false);
  });

  function fakeDb(entries: Record<string, Record<string, unknown>>) {
    const deleted: string[] = [];
    let queries = 0;
    const db = {
      collection: () => ({
        where: (_f: string, _op: string, value: unknown) => ({
          orderBy: () => ({
            limit: () => {
              const run = () => {
                queries += 1;
                const docs = Object.entries(entries)
                  .filter(([, data]) => data.topic === value)
                  .map(([id, data]) => ({ id, ref: { id }, data: () => data }));
                return { size: docs.length, docs };
              };
              return { get: async () => run(), startAfter: () => ({ get: async () => run() }) };
            },
          }),
        }),
      }),
      batch: () => {
        const pending: string[] = [];
        return { delete: (ref: { id: string }) => pending.push(ref.id), commit: async () => { deleted.push(...pending); } };
      },
    };
    return { db: db as never, deleted, queries: () => queries };
  }

  it('does nothing and reads nothing before the cutoff', async () => {
    const { db, deleted, queries } = fakeDb({ a: { topic: 'video_promo', email: null, promo: { username: 'Anna' } } });
    const result = await cleanupUnlinkedVideoPromoEntries(db, Date.parse('2027-03-01T00:00:00Z'));
    expect(result.skipped).toBe('before_cutoff');
    expect(queries()).toBe(0);
    expect(deleted).toEqual([]);
  });

  it('after the cutoff deletes only unlinked promo entries', async () => {
    const { db, deleted } = fakeDb({
      unlinked: { topic: 'video_promo', email: null, promo: { username: 'Anna' } },
      withEmail: { topic: 'video_promo', email: 'anna@example.com', promo: { username: 'Anna' } },
      granted: { topic: 'video_promo', email: null, promo: { username: 'Anna', resolvedUid: 'stable-1' } },
      support: { topic: 'support', email: null },
    });
    const result = await cleanupUnlinkedVideoPromoEntries(db, Date.parse('2027-04-02T00:00:00Z'));
    expect(result).toEqual({ scanned: 3, deleted: 1, skipped: null });
    expect(deleted).toEqual(['unlinked']);
  });
});
