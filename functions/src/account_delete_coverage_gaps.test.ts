/**
 * PM-252 п.1 (04.10): персональные записи, которые переживали удаление аккаунта (ревью сервера), теперь удаляются
 * или обезличиваются. Проверяем план по обоим идентификаторам и поведение шагов анонимизации на заглушке Firestore:
 * «после удаления по uid не осталось ни одного документа / ни одного следа».
 */
import * as admin from 'firebase-admin';
import {
  BANNED_IDENTITY_HASHES,
  accountDeleteDirectDocumentPlan,
  accountDeleteQueryPlan,
  anonymizeExplainReportReporters,
  removeFromSpireGroups,
  replaceBanWithHash,
} from './account_delete';
import { bannedEmailHashId } from './banned_identity_hash';

const STABLE = 'stable-123';
const AUTH = 'auth-456';

describe('account deletion plan covers the PM-252 gaps by both identities', () => {
  const plan = accountDeleteQueryPlan(STABLE, AUTH);
  const has = (collection: string, field: string, value: string) =>
    plan.some((q) => q.collection === collection && q.field === field && q.value === value);

  test.each([
    ['user_warnings', 'uid', STABLE], ['user_warnings', 'uid', AUTH],
    ['explain_report_entries', 'stableUid', STABLE], ['explain_report_entries', 'authUid', AUTH],
    ['client_report_rate_limits', 'stableUid', STABLE], ['client_report_rate_limits', 'authUid', AUTH],
    ['explain_report_rate_limits', 'stableUid', STABLE], ['explain_report_rate_limits', 'authUid', AUTH],
    ['premium_dialog_rate_limits', 'stableUid', STABLE], ['premium_dialog_rate_limits', 'authUid', AUTH],
    ['premium_dialog_quotas', 'stableUid', STABLE], ['premium_dialog_quotas', 'authUid', AUTH],
    ['premium_dialog_billing', 'uid', STABLE], ['premium_dialog_billing', 'authUid', AUTH],
    ['spire_task_report_reservations', 'stableUid', STABLE],
  ])('%s.%s = %s', (collection, field, value) => {
    expect(has(collection, field, value)).toBe(true);
  });

  test('friend pairs are found by array membership of the stable id', () => {
    expect(plan.some((q) => q.collection === 'friend_pairs' && q.field === 'uids' && q.op === 'array-contains' && q.value === STABLE)).toBe(true);
  });

  test('top helpers and the dedup archive are deleted by document id for both identities', () => {
    const direct = accountDeleteDirectDocumentPlan(STABLE, AUTH);
    for (const collection of ['top_helpers', 'users_dedup_archive']) {
      for (const id of [STABLE, AUTH]) {
        expect(direct.some((d: { collection: string; value?: string; id?: string }) => d.collection === collection && (d.value ?? d.id) === id)).toBe(true);
      }
    }
  });

  test('premium theme video watch counter is deleted by stable document id', () => {
    const direct = accountDeleteDirectDocumentPlan(STABLE, AUTH);
    expect(direct).toContainEqual({ collection: 'premium_theme_video_watch', id: STABLE });
    expect(direct).not.toContainEqual({ collection: 'premium_theme_video_watch', id: AUTH });
  });

  // зачем (координатор 15.10, 3705b3984): метка «посчитан» статистики экрана уровня онбординга адресована stableId — стирается с аккаунтом.
  test('the onboarding level «counted» marker is deleted by the stable id', () => {
    const direct = accountDeleteDirectDocumentPlan(STABLE, AUTH);
    expect(direct.some((d) => d.collection === 'onboarding_level_counted' && d.id === STABLE)).toBe(true);
  });
});

// ── Заглушка Firestore: коллекции в памяти, where(==, !=), limit, batch(update/set/delete), doc().get() ──
type Data = Record<string, unknown>;
function makeDb(seed: Record<string, Record<string, Data>>, options: { synchronizeFirstGroupAttempts?: boolean } = {}) {
  const store: Record<string, Map<string, Data>> = {};
  for (const [c, docs] of Object.entries(seed)) store[c] = new Map(Object.entries(docs).map(([id, d]) => [id, JSON.parse(JSON.stringify(d))]));
  const versions = new Map<string, number>();
  for (const [c, docs] of Object.entries(store)) for (const id of docs.keys()) versions.set(`${c}/${id}`, 1);
  const col = (c: string) => (store[c] ??= new Map());
  const segs = (f: unknown): string[] => (typeof f === 'string' ? f.split('.') : (f as { segments: string[] }).segments);
  const getPath = (d: Data, path: string[]) => path.reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Data)[k] : undefined), d);
  const isDelete = (v: unknown) => Boolean(v && typeof v === 'object' && (v as { isEqual?: (o: unknown) => boolean }).isEqual?.(admin.firestore.FieldValue.delete()));
  const incrementOf = (v: unknown): number | null => {
    if (!v || typeof v !== 'object') return null;
    const o = v as { operand?: number; _operand?: number };
    return typeof o.operand === 'number' ? o.operand : typeof o._operand === 'number' ? o._operand : null;
  };
  const applyUpdate = (d: Data, patch: Data) => {
    for (const [key, value] of Object.entries(patch)) {
      const path = key.split('.');
      const parent = path.slice(0, -1).reduce<Data>((v, k) => (v[k] ??= {}) as Data, d);
      const last = path[path.length - 1];
      const inc = incrementOf(value);
      if (isDelete(value)) delete parent[last];
      else if (inc !== null) parent[last] = Number(parent[last] ?? 0) + inc;
      else parent[last] = value;
    }
  };
  const updateDoc = (c: string, id: string, patch: Data) => {
    applyUpdate(col(c).get(id)!, patch);
    versions.set(`${c}/${id}`, (versions.get(`${c}/${id}`) ?? 0) + 1);
  };
  const ref = (c: string, id: string) => ({
    id, c,
    get: async () => ({ exists: col(c).has(id), data: () => col(c).get(id) }),
  });
  const query = (c: string, filters: Array<[string[], string, unknown]>, lim = Infinity) => ({
    where: (f: unknown, op: string, v: unknown) => query(c, [...filters, [segs(f), op, v]], lim),
    limit: (n: number) => query(c, filters, n),
    get: async () => {
      const docs = [...col(c).entries()].filter(([, d]) => filters.every(([p, op, v]) => {
        const val = getPath(d, p);
        return op === '==' ? val === v : op === '!=' ? val !== undefined && val !== null && val !== v : false;
      })).slice(0, lim).map(([id, d]) => ({ id, ref: ref(c, id), data: () => d }));
      return { empty: docs.length === 0, size: docs.length, docs };
    },
  });
  const db = {
    collection: (c: string) => ({ ...query(c, []), doc: (id: string) => ref(c, id) }),
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        update: (r: { c: string; id: string }, patch: Data) => ops.push(() => updateDoc(r.c, r.id, patch)),
        set: (r: { c: string; id: string }, d: Data) => ops.push(() => {
          col(r.c).set(r.id, { ...(col(r.c).get(r.id) ?? {}), ...d });
          versions.set(`${r.c}/${r.id}`, (versions.get(`${r.c}/${r.id}`) ?? 0) + 1);
        }),
        delete: (r: { c: string; id: string }) => ops.push(() => {
          col(r.c).delete(r.id);
          versions.set(`${r.c}/${r.id}`, (versions.get(`${r.c}/${r.id}`) ?? 0) + 1);
        }),
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
    // Optimistic fake: concurrent account-deletion workers must retry after a
    // room version conflict exactly like Firestore transactions do.
    runTransaction: undefined as unknown,
  };
  let groupBarrierArrivals = 0;
  let releaseGroupBarrier: (() => void) | null = null;
  const groupBarrier = new Promise<void>((resolve) => { releaseGroupBarrier = resolve; });
  db.runTransaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reads = new Map<string, number>();
      const writes: Array<() => void> = [];
      const result = await fn({
        get: async (r: { c: string; id: string }) => {
          const key = `${r.c}/${r.id}`;
          reads.set(key, versions.get(key) ?? 0);
          const value = col(r.c).get(r.id);
          const copied = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
          return { exists: copied !== undefined, data: () => copied };
        },
        update: (r: { c: string; id: string }, patch: Data) => writes.push(() => updateDoc(r.c, r.id, patch)),
      });
      if (options.synchronizeFirstGroupAttempts
        && [...reads.keys()].some((key) => key.startsWith('spire_groups/'))
        && groupBarrierArrivals < 2) {
        groupBarrierArrivals += 1;
        if (groupBarrierArrivals === 2) releaseGroupBarrier?.();
        await groupBarrier;
      }
      if ([...reads].some(([key, version]) => (versions.get(key) ?? 0) !== version)) continue;
      writes.forEach((write) => write());
      return result;
    }
    throw new Error('transaction-contention');
  };
  return { db: db as unknown as admin.firestore.Firestore, store };
}
const stats = () => ({ docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false });

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

test('explain report counters keep the anonymous count but lose the deleted reporter identity', async () => {
  const { db, store } = makeDb({ explain_reports: {
    h1: { count: 2, reporters: { [STABLE]: true, other: true }, lastReporterStableUid: STABLE, lastReporterAuthUid: AUTH },
    h2: { count: 1, reporters: { other: true }, lastReporterStableUid: 'other' },
  } });
  await anonymizeExplainReportReporters(db, STABLE, stats());
  const h1 = store.explain_reports.get('h1')!;
  expect(h1.reporters).toEqual({ other: true });
  expect(h1.lastReporterStableUid).toBeUndefined();
  expect(h1.lastReporterAuthUid).toBeUndefined();
  expect(h1.count).toBe(2);
  expect(store.explain_reports.get('h2')!.lastReporterStableUid).toBe('other');
  expect(JSON.stringify([...store.explain_reports.values()])).not.toContain(STABLE);
});

test('spire groups drop the member (name included) and decrement the live count', async () => {
  const { db, store } = makeDb({ spire_groups: {
    g1: { liveMemberCount: 2, members: { [STABLE]: { name: 'Аня', steps: 4 }, other: { name: 'Bob', steps: 1 } } },
    g2: { liveMemberCount: 1, members: { other: { name: 'Bob' } } },
  } });
  await removeFromSpireGroups(db, STABLE, stats());
  expect(store.spire_groups.get('g1')!.members).toEqual({ other: { name: 'Bob', steps: 1 } });
  expect(store.spire_groups.get('g1')!.liveMemberCount).toBe(1);
  expect(store.spire_groups.get('g2')!.liveMemberCount).toBe(1);
  expect(JSON.stringify([...store.spire_groups.values()])).not.toContain('Аня');
});

test('spire deletion updates a valid freeze count in the same transaction as member removal', async () => {
  const { db, store } = makeDb({ spire_groups: {
    g1: {
      weekId: '2026-W41', lang: 'en', liveMemberCount: 2,
      members: { [STABLE]: { name: 'Аня', steps: 4 }, other: { name: 'Bob', steps: 1 } },
      finalizationFreeze: {
        schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: '2026-W41', lang: 'en',
        rankBy: 'coins', frozenResultCount: 2, removedAfterFreezeCount: 0,
        resultsDigest: 'a'.repeat(64),
        configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
        inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64),
        frozenAt: 123,
      },
    },
  } });
  await removeFromSpireGroups(db, STABLE, stats());
  await removeFromSpireGroups(db, STABLE, stats());
  const room = store.spire_groups.get('g1')!;
  expect(room.members).toEqual({ other: { name: 'Bob', steps: 1 } });
  expect((room.finalizationFreeze as Data).removedAfterFreezeCount).toBe(1);
  expect(room.finalizationIntegrityHold).toBeUndefined();
});

test('spire deletion preserves a malformed freeze and places a PII-free integrity hold', async () => {
  const malformed = { schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: 'wrong' };
  const { db, store } = makeDb({ spire_groups: {
    g1: { weekId: '2026-W41', lang: 'en', liveMemberCount: 1, members: { [STABLE]: { name: 'Аня' } }, finalizationFreeze: malformed },
  } });
  await removeFromSpireGroups(db, STABLE, stats());
  const room = store.spire_groups.get('g1')!;
  expect(room.members).toEqual({});
  expect(room.finalizationFreeze).toEqual(malformed);
  expect(room.finalizationIntegrityHold).toEqual({
    schema: 'spire-finalization-integrity-hold.v1',
    reason: 'invalid_freeze_during_member_deletion',
    heldAtMs: expect.any(Number),
  });
  expect(Object.keys(room.finalizationIntegrityHold as Data).sort()).toEqual(['heldAtMs', 'reason', 'schema']);
  expect(JSON.stringify(room.finalizationIntegrityHold)).not.toContain(STABLE);
});

test('spire deletion treats a null freeze as present-invalid, preserves it, and completes privacy removal', async () => {
  const { db, store } = makeDb({ spire_groups: {
    g1: { weekId: '2026-W41', lang: 'en', liveMemberCount: 1, members: { [STABLE]: { name: 'Аня' } }, finalizationFreeze: null },
  } });
  await expect(removeFromSpireGroups(db, STABLE, stats())).resolves.toBeUndefined();
  const room = store.spire_groups.get('g1')!;
  expect(room.members).toEqual({});
  expect(room.liveMemberCount).toBe(0);
  expect(Object.prototype.hasOwnProperty.call(room, 'finalizationFreeze')).toBe(true);
  expect(room.finalizationFreeze).toBeNull();
  expect(room.finalizationIntegrityHold).toEqual({
    schema: 'spire-finalization-integrity-hold.v1',
    reason: 'invalid_freeze_during_member_deletion',
    heldAtMs: expect.any(Number),
  });
});

test.each([
  ['absent', undefined],
  ['valid', {
    schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: '2026-W41', lang: 'en', rankBy: 'steps',
    frozenResultCount: 2, removedAfterFreezeCount: 0, resultsDigest: 'a'.repeat(64),
    configEvidenceSchema: 'spire-finalization-config-evidence.v1', configEvidenceHash: 'b'.repeat(64),
    inputEvidenceSchema: 'spire-finalization-input-evidence.v1', inputEvidenceHash: 'c'.repeat(64), frozenAt: 123,
  }],
  ['malformed', { schema: 'spire-finalization-freeze.v1', state: 'frozen', weekId: 'wrong' }],
  ['null', null],
] as const)('concurrent privacy removal retries exactly once for a %s freeze fence', async (kind, fence) => {
  const fenceField = kind === 'absent' ? {} : { finalizationFreeze: fence };
  const { db, store } = makeDb({ spire_groups: {
    g1: {
      weekId: '2026-W41', lang: 'en', liveMemberCount: 2,
      members: { [STABLE]: { name: 'Аня' }, other: { name: 'Bob' } },
      ...fenceField,
    },
  } }, { synchronizeFirstGroupAttempts: true });
  const first = stats();
  const second = stats();

  await Promise.all([
    removeFromSpireGroups(db, STABLE, first),
    removeFromSpireGroups(db, STABLE, second),
  ]);

  const final = store.spire_groups.get('g1')!;
  expect((final.members as Data)[STABLE]).toBeUndefined();
  expect(final.liveMemberCount).toBe(1);
  expect(first.docsUpdated + second.docsUpdated).toBe(1);
  expect(JSON.stringify(final)).not.toContain('Аня');
  if (kind === 'valid') {
    expect((final.finalizationFreeze as Data).removedAfterFreezeCount).toBe(1);
    expect(final.finalizationIntegrityHold).toBeUndefined();
  } else if (kind === 'absent') {
    expect(final.finalizationFreeze).toBeUndefined();
    expect(final.finalizationIntegrityHold).toBeUndefined();
  } else {
    expect(final.finalizationFreeze).toEqual(fence);
    expect(final.finalizationIntegrityHold).toEqual({
      schema: 'spire-finalization-integrity-hold.v1',
      reason: 'invalid_freeze_during_member_deletion',
      heldAtMs: expect.any(Number),
    });
  }
});

test('spire floor records of the deleted member are scrubbed; other members keep theirs', async () => {
  const { db, store } = makeDb({
    spire_groups: { g1: { liveMemberCount: 2, members: { [STABLE]: { name: 'Аня' }, other: { name: 'Bob' } } } },
    spire_floor_records: {
      g1: {
        records: { 1: { uid: STABLE, ms: 900 }, 2: { uid: 'other', ms: 1200 } },
        personal: { [STABLE]: { 1: 900 }, other: { 2: 1200 } },
      },
    },
  });
  await removeFromSpireGroups(db, STABLE, stats());
  const record = store.spire_floor_records.get('g1')!;
  expect(record.records).toEqual({ 2: { uid: 'other', ms: 1200 } });
  expect(record.personal).toEqual({ other: { 2: 1200 } });
  expect(JSON.stringify(record)).not.toContain(STABLE);
});

test('a ban keeps only an identity hash — no uid, name or reason text', async () => {
  const { db, store } = makeDb({ banned_users: { [STABLE]: { uid: STABLE, name: 'Аня', reason: 'спам', bannedAtMs: 123 } } });
  await replaceBanWithHash(db, STABLE, stats());
  expect(store.banned_users.has(STABLE)).toBe(false);
  const hashes = [...(store[BANNED_IDENTITY_HASHES]?.entries() ?? [])];
  expect(hashes).toHaveLength(1);
  const [hashId, record] = hashes[0];
  expect(hashId).toMatch(/^[a-f0-9]{64}$/);
  expect(record).toMatchObject({ bannedAtMs: 123, source: 'account_delete' });
  expect(JSON.stringify(record)).not.toMatch(/Аня|спам|stable-123/);
  // Повтор задачи удаления безопасен: бана уже нет — ничего не делаем.
  await replaceBanWithHash(db, STABLE, stats());
  expect(store[BANNED_IDENTITY_HASHES].size).toBe(1);
});

test('a deleted ban also leaves an email hash so the same Google/Apple login is caught after re-registration', async () => {
  const { db, store } = makeDb({ banned_users: { [STABLE]: { uid: STABLE, bannedAtMs: 7 } } });
  await replaceBanWithHash(db, STABLE, stats(), ['Ann@Example.com', 'ann@example.com']);
  const ids = [...store[BANNED_IDENTITY_HASHES].keys()];
  expect(ids).toHaveLength(2);
  expect(ids).toContain(bannedEmailHashId('ann@example.com'));
  expect(JSON.stringify([...store[BANNED_IDENTITY_HASHES].values()])).not.toMatch(/ann@|stable-123/i);
});
