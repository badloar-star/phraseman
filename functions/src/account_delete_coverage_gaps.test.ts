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

  // зачем (координатор 15.10, 3705b3984): метка «посчитан» статистики экрана уровня онбординга адресована stableId — стирается с аккаунтом.
  test('the onboarding level «counted» marker is deleted by the stable id', () => {
    const direct = accountDeleteDirectDocumentPlan(STABLE, AUTH);
    expect(direct.some((d) => d.collection === 'onboarding_level_counted' && d.id === STABLE)).toBe(true);
  });
});

// ── Заглушка Firestore: коллекции в памяти, where(==, !=), limit, batch(update/set/delete), doc().get() ──
type Data = Record<string, unknown>;
function makeDb(seed: Record<string, Record<string, Data>>) {
  const store: Record<string, Map<string, Data>> = {};
  for (const [c, docs] of Object.entries(seed)) store[c] = new Map(Object.entries(docs).map(([id, d]) => [id, JSON.parse(JSON.stringify(d))]));
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
        update: (r: { c: string; id: string }, patch: Data) => ops.push(() => applyUpdate(col(r.c).get(r.id)!, patch)),
        set: (r: { c: string; id: string }, d: Data) => ops.push(() => col(r.c).set(r.id, { ...(col(r.c).get(r.id) ?? {}), ...d })),
        delete: (r: { c: string; id: string }) => ops.push(() => col(r.c).delete(r.id)),
        commit: async () => { ops.forEach((op) => op()); },
      };
    },
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
