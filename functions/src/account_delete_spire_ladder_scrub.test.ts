// D191 + политика §5 (координатор 15.10): при удалении аккаунта ник и ранг монеты удалённого стираются из лестниц итогов недели
// у соседей по комнатам. Место и монеты остаются, чужие строки не трогаются, повтор ничего не пишет. Сработал — чини логику.
import * as admin from 'firebase-admin';
import { scrubSpireLadderFromNeighbors } from './account_delete';
import { spireLadderMemberKey } from './spire_finalize_core';

const ME = 'stable-me';
type Data = Record<string, unknown>;

function makeDb(groups: Record<string, Data>, results: Record<string, Data>) {
  const store = new Map(Object.entries(results).map(([path, d]) => [path, JSON.parse(JSON.stringify(d)) as Data]));
  const writes: string[] = [];
  const resultRef = (path: string) => ({ path, get: (f: string) => store.get(path)?.[f] });
  const db = {
    collection: (c: string) => {
      if (c === 'spire_groups') {
        const q = {
          where: (field: admin.firestore.FieldPath) => {
            const uid = (field as unknown as { segments: string[] }).segments[1];
            const docs = Object.entries(groups)
              .filter(([, g]) => (g.members as Data | undefined)?.[uid] != null)
              .map(([id, g]) => ({ id, data: () => g }));
            return { limit: () => ({ get: async () => ({ size: docs.length, docs }) }) };
          },
        };
        return q;
      }
      return { doc: (uid: string) => ({ collection: () => ({ doc: (id: string) => resultRef(`users/${uid}/spire_week_results/${id}`) }) }) };
    },
    getAll: async (...args: unknown[]) => args
      .filter((a): a is { path: string } => Boolean(a && typeof a === 'object' && 'path' in (a as object)))
      .map((r) => ({ ref: r, exists: store.has(r.path), get: (f: string) => store.get(r.path)?.[f] })),
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        update: (r: { path: string }, patch: Data) => ops.push(() => { writes.push(r.path); store.set(r.path, { ...store.get(r.path), ...patch }); }),
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
  };
  return { db: db as unknown as admin.firestore.Firestore, store, writes };
}

const stats = () => ({ queriesRun: 0, docsUpdated: 0 } as never);
const row = (groupId: string, uid: string, place: number, name: string, isMe = false) => ({ place, name, coinRank: 5, coins: 100 * (7 - place), isMe, memberKey: spireLadderMemberKey(groupId, uid) });

describe('[D189-LADDER-SCRUB] обезличивание лестницы у соседей при удалении аккаунта', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  const G1 = '2026-W43_en_t1_room';
  const groups = {
    [G1]: { weekId: '2026-W43', lang: 'en', members: { [ME]: { name: 'Аня' }, bob: { name: 'Bob' }, cid: { name: 'Cid' } } },
    other: { weekId: '2026-W43', lang: 'en', members: { bob: { name: 'Bob' } } },
  };
  const results = {
    'users/bob/spire_week_results/2026-W43_en': { ladder: [row(G1, ME, 1, 'Аня'), row(G1, 'bob', 2, 'Bob', true), row(G1, 'cid', 3, 'Cid')] },
    // у Cid итога нет (неделя не подведена) — пропуск без ошибки
  };

  it('у соседа: ника и ранга удалённого нет, место и монеты на месте, чужие строки не тронуты', async () => {
    const h = makeDb(groups, results);
    await scrubSpireLadderFromNeighbors(h.db, ME, stats());
    const ladder = h.store.get('users/bob/spire_week_results/2026-W43_en')!.ladder as Data[];
    expect(ladder[0]).toEqual({ place: 1, name: '', coinRank: null, coins: 600, isMe: false, memberKey: spireLadderMemberKey(G1, ME), removed: true });
    expect(ladder[1]).toEqual(row(G1, 'bob', 2, 'Bob', true));
    expect(ladder[2]).toEqual(row(G1, 'cid', 3, 'Cid'));
    expect(JSON.stringify(ladder)).not.toContain('Аня');
  });

  it('повтор безопасен: второй прогон ничего не пишет', async () => {
    const h = makeDb(groups, results);
    await scrubSpireLadderFromNeighbors(h.db, ME, stats());
    expect(h.writes).toHaveLength(1);
    await scrubSpireLadderFromNeighbors(h.db, ME, stats());
    expect(h.writes).toHaveLength(1);
  });

  it('ключ солён комнатой: строка того же человека из ДРУГОЙ комнаты не совпадает и не трогается', async () => {
    const h = makeDb(groups, {
      'users/bob/spire_week_results/2026-W43_en': { ladder: [row('another-room', ME, 1, 'Аня')] },
    });
    await scrubSpireLadderFromNeighbors(h.db, ME, stats());
    expect(h.writes).toHaveLength(0);
  });

  it('комната без weekId/lang — пропуск с логом, удаление не падает', async () => {
    const h = makeDb({ broken: { members: { [ME]: {}, bob: {} } } }, {});
    await expect(scrubSpireLadderFromNeighbors(h.db, ME, stats())).resolves.toBeUndefined();
    expect(h.writes).toHaveLength(0);
  });
});
