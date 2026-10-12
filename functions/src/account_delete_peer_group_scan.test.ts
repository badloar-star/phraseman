import * as fs from 'fs';
import * as path from 'path';
import { collectDocIdPeerUidsByCollectionGroup, PEER_GROUP_SCAN_DOC_CAP } from './account_delete';

// зачем (координатор 12.10, ACCOUNT_DELETE_INDEX_INCIDENT §5): маркер обратного индекса заявок есть лишь у тех,
// кто открывал «Друзей», поэтому КАЖДОЕ удаление шло полным перебором `users`. Узкий путь находит peer-uid
// обходом групп `friend_requests`/`blocked` по id документа; не доказан (потолок, отказ) — полный перебор.
type FakeDoc = { id: string; ref: { parent: { parent: { id: string; parent: { id: string } } | null } } };

function doc(owner: string, id: string, root = 'users'): FakeDoc {
  return { id, ref: { parent: { parent: { id: owner, parent: { id: root } } } } };
}

function makeDb(groups: Record<string, FakeDoc[]>, failGroup?: string) {
  const collectionGroup = jest.fn((name: string) => {
    const all = groups[name] ?? [];
    const build = (start: number, size: number) => {
      const query: any = {
        orderBy: () => query,
        select: () => query,
        limit: (n: number) => build(start, n),
        startAfter: (last: FakeDoc) => build(all.indexOf(last) + 1, size),
        get: async () => {
          if (name === failGroup) throw Object.assign(new Error('no index'), { code: 9 });
          const docs = all.slice(start, start + size);
          return { docs, size: docs.length };
        },
      };
      return query;
    };
    return build(0, Number.MAX_SAFE_INTEGER);
  });
  return { collectionGroup };
}

const stats = () => ({ docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false });

describe('account delete: peer-uid по группам без полного перебора users', () => {
  it('листает группу страницами и берёт владельца документов с нашим id', async () => {
    const requests = Array.from({ length: 1203 }, (_, i) => doc(`u${i}`, `other${i}`));
    requests[700] = doc('peerA', 'me');
    requests[1202] = doc('peerB', 'me-auth');
    const db = makeDb({ friend_requests: requests, blocked: [doc('peerC', 'me')] });
    const s = stats();
    const res = await collectDocIdPeerUidsByCollectionGroup(db as any, ['me', 'me-auth'], s as any);
    expect(res.complete).toBe(true);
    expect(res.peers.sort()).toEqual(['peerA', 'peerB', 'peerC']);
    expect(res.scanned).toEqual({ friend_requests: 1203, blocked: 1 });
    expect(s.queriesRun).toBe(4);
  });

  it('не берёт себя и документы вне users/{uid}', async () => {
    const db = makeDb({ friend_requests: [doc('me', 'me'), doc('x', 'me', 'groups')], blocked: [] });
    const res = await collectDocIdPeerUidsByCollectionGroup(db as any, ['me'], stats() as any);
    expect(res).toMatchObject({ complete: true, peers: [] });
  });

  it('потолок документов — узкий путь не доказан', async () => {
    const requests = Array.from({ length: 1200 }, (_, i) => doc(`u${i}`, `o${i}`));
    const db = makeDb({ friend_requests: requests, blocked: [] });
    const res = await collectDocIdPeerUidsByCollectionGroup(db as any, ['me'], stats() as any, ['friend_requests'], 1000);
    expect(res.complete).toBe(false);
    expect(res.reason).toBe('cap_exceeded:friend_requests');
  });

  it('потолок по умолчанию 5 000 (координатор 12.10): на нём лог и полный перебор', async () => {
    expect(PEER_GROUP_SCAN_DOC_CAP).toBe(5_000);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const requests = Array.from({ length: 5_001 }, (_, i) => doc(`u${i}`, `o${i}`));
    const res = await collectDocIdPeerUidsByCollectionGroup(makeDb({ friend_requests: requests }) as any, ['me'], stats() as any, ['friend_requests']);
    expect(res).toMatchObject({ complete: false, reason: 'cap_exceeded:friend_requests' });
    expect(res.scanned.friend_requests).toBe(5_000);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('account_delete_peer_group_scan_cap'));
    warn.mockRestore();
  });

  it('отказ запроса — честный полный перебор, причина в ответе', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const db = makeDb({ friend_requests: [], blocked: [] }, 'blocked');
    const res = await collectDocIdPeerUidsByCollectionGroup(db as any, ['me'], stats() as any);
    expect(res.complete).toBe(false);
    expect(res.reason).toBe('query_failed:blocked:9');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('account_delete_peer_group_scan_failed'));
    warn.mockRestore();
  });

  it('collect_peers: решение и счётчики в журнале, полный перебор только без доказанного узкого пути', () => {
    const src = fs.readFileSync(path.join(__dirname, 'account_delete.ts'), 'utf8');
    expect(src).toMatch(/collectDocIdPeerUidsByCollectionGroup\(\s+db, identities, stats, hasIndex \? \['blocked'\] : PEER_DOC_ID_GROUPS,/);
    for (const key of ['friendPeers:', 'giftPeers:', 'sentPeers:', 'sentDocs:', 'markerFound,', 'groupScanReason:', 'decision,']) {
      expect(src).toContain(key);
    }
    expect(src).toContain('const narrow = groupScan.complete || hasIndex;');
    expect(src).toContain('return narrow ? peers : null;');
  });
});
