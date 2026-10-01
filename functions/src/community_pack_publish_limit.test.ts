// зачем: Q55 / PM-018-A2 — суточный лимит 3 публикации на человека. Харнесс (фейк Firestore +
// моки functions) скопирован из community_packs.test.ts, чтобы не править чужой незакоммиченный файл.
import fs from 'fs';
import path from 'path';

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  collection: (name: string) => FakeCollection;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  update: (data: DocData) => Promise<void>;
};

type FakeCollection = {
  path: string;
  doc: (id?: string) => FakeRef;
  add: (data: DocData) => Promise<FakeRef>;
  where: (field: string, op: string, value: unknown) => FakeQuery;
  orderBy: (field: string) => FakeQuery;
  startAfter: (value: string) => FakeQuery;
  limit: (count: number) => FakeQuery;
  get: () => Promise<FakeQuerySnap>;
};

type FakeQuery = {
  where: (field: string, op: string, value: unknown) => FakeQuery;
  orderBy: (field: string) => FakeQuery;
  startAfter: (value: string) => FakeQuery;
  limit: (count: number) => FakeQuery;
  get: () => Promise<FakeQuerySnap>;
};

type FakeSnap = {
  id: string;
  exists: boolean;
  ref: FakeRef;
  data: () => DocData | undefined;
};

type FakeQuerySnap = {
  empty: boolean;
  docs: FakeSnap[];
};

const mockDocs = new Map<string, DocData>();
const mockReadFailures = new Set<string>();
let mockAutoId = 0;

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function resolveFieldValue(existing: unknown, value: unknown): unknown {
  if (value && typeof value === 'object' && (value as { __op?: unknown }).__op === 'increment') {
    const by = Number((value as { by?: unknown }).by) || 0;
    return (Number(existing) || 0) + by;
  }
  if (value && typeof value === 'object' && (value as { __op?: unknown }).__op === 'serverTimestamp') {
    return 1_779_000_000_000;
  }
  if (value && typeof value === 'object' && (value as { __op?: unknown }).__op === 'delete') return undefined;
  return value;
}

function applyData(path: string, data: DocData, opts?: { merge?: boolean }) {
  const base = opts?.merge ? { ...(mockDocs.get(path) ?? {}) } : {};
  const next = { ...base };
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let cursor = next;
      for (const part of parts.slice(0, -1)) {
        const existing = cursor[part];
        cursor[part] = existing && typeof existing === 'object' && !Array.isArray(existing)
          ? { ...(existing as DocData) }
          : {};
        cursor = cursor[part] as DocData;
      }
      const leaf = parts[parts.length - 1];
      const resolved = resolveFieldValue(cursor[leaf], value);
      if (resolved === undefined) delete cursor[leaf];
      else cursor[leaf] = resolved;
    } else {
      next[key] = resolveFieldValue(next[key], value);
    }
  }
  mockDocs.set(path, opts?.merge ? deepMerge(mockDocs.get(path) ?? {}, next) : next);
}

function applyUpdateData(path: string, data: DocData) {
  const next = deepMerge({}, mockDocs.get(path) ?? {});
  for (const [fieldPath, value] of Object.entries(data)) {
    const parts = fieldPath.split('.');
    let cursor = next;
    for (const part of parts.slice(0, -1)) {
      const existing = cursor[part];
      cursor[part] = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as DocData) }
        : {};
      cursor = cursor[part] as DocData;
    }
    const leaf = parts[parts.length - 1];
    const resolved = resolveFieldValue(cursor[leaf], value);
    if (resolved === undefined) delete cursor[leaf];
    else cursor[leaf] = resolved;
  }
  mockDocs.set(path, next);
}

function snapFor(ref: FakeRef): FakeSnap {
  const data = mockDocs.get(ref.path);
  return {
    id: ref.id,
    exists: data !== undefined,
    ref,
    data: () => data,
  };
}

function makeRef(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    collection: (name: string) => makeCollection(`${path}/${name}`),
    get: async () => {
      if (mockReadFailures.has(path)) throw new Error(`read_failed:${path}`);
      return snapFor(makeRef(path));
    },
    set: async (data: DocData, opts?: { merge?: boolean }) => applyData(path, data, opts),
    update: async (data: DocData) => applyUpdateData(path, data),
  };
}

/**
 * зачем: настоящий Firestore понимает вложенные пути в where() ('linkedAuth.providerUid'),
 * а фейк читал только плоский data[field] — такой фильтр НИКОГДА не совпадал.
 * Из-за этого переписанный resolveStableUidForAuth не находил владельца по auth и
 * тесты владения падали, хотя прод защищён. Разбираем путь по точкам, как Firestore.
 */
function readFieldPath(data: DocData, field: string): unknown {
  if (!field.includes('.')) return data[field];
  return field.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as DocData)[key] : undefined),
    data,
  );
}

function queryCollection(
  path: string,
  filters: Array<[string, unknown]>,
  limitCount?: number,
  orderByDocumentId = false,
  startAfterId?: string,
): FakeQuerySnap {
  const prefix = `${path}/`;
  let matches = Array.from(mockDocs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ ref: makeRef(docPath), data }))
    .filter(({ data }) => filters.every(([field, value]) => readFieldPath(data, field) === value));
  if (orderByDocumentId) matches = matches.sort((a, b) => a.ref.id.localeCompare(b.ref.id));
  if (startAfterId) matches = matches.filter(({ ref }) => ref.id > startAfterId);
  const docs = matches
    .slice(0, limitCount ?? Number.MAX_SAFE_INTEGER)
    .map(({ ref }) => snapFor(ref));
  return { empty: docs.length === 0, docs };
}

function makeQuery(
  path: string,
  filters: Array<[string, unknown]> = [],
  limitCount?: number,
  orderByDocumentId = false,
  startAfterId?: string,
): FakeQuery {
  return {
    where: (field: string, op: string, value: unknown) => {
      if (op !== '==') throw new Error(`Unsupported op ${op}`);
      return makeQuery(path, [...filters, [field, value]], limitCount, orderByDocumentId, startAfterId);
    },
    orderBy: (field: string) => {
      if (field !== '__name__') throw new Error(`Unsupported orderBy ${field}`);
      return makeQuery(path, filters, limitCount, true, startAfterId);
    },
    startAfter: (value: string) => makeQuery(path, filters, limitCount, orderByDocumentId, value),
    limit: (count: number) => makeQuery(path, filters, count, orderByDocumentId, startAfterId),
    get: async () => queryCollection(path, filters, limitCount, orderByDocumentId, startAfterId),
  };
}

function makeCollection(path: string): FakeCollection {
  return {
    path,
    doc: (id?: string) => makeRef(`${path}/${id || `auto-${++mockAutoId}`}`),
    add: async (data: DocData) => {
      const ref = makeRef(`${path}/auto-${++mockAutoId}`);
      applyData(ref.path, data);
      return ref;
    },
    where: (field: string, op: string, value: unknown) => makeQuery(path).where(field, op, value),
    orderBy: (field: string) => makeQuery(path).orderBy(field),
    startAfter: (value: string) => makeQuery(path).startAfter(value),
    limit: (count: number) => makeQuery(path).limit(count),
    get: async () => queryCollection(path, []),
  };
}

function buildDb() {
  return {
    collection: (name: string) => makeCollection(name),
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => applyData(ref.path, data, opts));
        },
        commit: async () => {
          writes.forEach((write) => write());
        },
      };
    },
    runTransaction: async <T>(fn: (tx: {
      get: (refOrQuery: FakeRef | FakeQuery) => Promise<FakeSnap | FakeQuerySnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      update: (ref: FakeRef, data: DocData) => void;
      delete: (ref: FakeRef) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        // зачем: настоящий transaction.get() принимает И ref, И Query — переписанный
        // resolveStableUidForAuth читает внутри транзакции запрос
        // users.where('firebaseAuthUid','==',uid).limit(2). Фейк умел только ref,
        // падал, и ошибка глушилась в identity_check_unavailable — из-за этого
        // тесты владения врали. Различаем по наличию .path (у Query его нет).
        get: async (refOrQuery: FakeRef | FakeQuery) => (
          (refOrQuery as FakeRef).path === undefined
            ? (refOrQuery as FakeQuery).get()
            : (() => {
              const ref = refOrQuery as FakeRef;
              if (mockReadFailures.has(ref.path)) throw new Error(`read_failed:${ref.path}`);
              return snapFor(ref);
            })()
        ),
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => applyData(ref.path, data));
        },
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => applyData(ref.path, data, opts));
        },
        update: (ref: FakeRef, data: DocData) => {
          writes.push(() => applyUpdateData(ref.path, data));
        },
        delete: (ref: FakeRef) => { writes.push(() => mockDocs.delete(ref.path)); },
      };
      const result = await fn(tx);
      writes.forEach((write) => write());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineString: () => ({ value: () => '' }),
  defineSecret: () => ({ value: () => '' }),
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => buildDb());
  const firestoreStatics = firestore as unknown as {
    FieldPath: Record<string, unknown>;
    FieldValue: Record<string, unknown>;
  };
  firestoreStatics.FieldPath = { documentId: () => '__name__' };
  firestoreStatics.FieldValue = {
    increment: (by: number) => ({ __op: 'increment', by }),
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    delete: () => ({ __op: 'delete' }),
  };
  return { firestore };
});

// зачем: resolveStableUidForAuth переписан (аккаунт-восстановление 2026-07-25) и теперь
// СНАЧАЛА читает якорь auth_links/{authUid}, а уже потом users/{stableId}. Фейк сеял
// только users/*, поэтому якоря не было, резолвер уходил в другую ветку и спуфинг
// чужого stableId «проходил» — тесты владения падали, ХОТЯ прод защищён
// (10 точек throw stable_id_mismatch, 89 тестов auth_identity зелёные).
// Сеем якорь: каждый authUid жёстко привязан к своему stableId.
function seedVictimIdentity() {
  mockDocs.set('users/victim', { firebaseAuthUid: 'auth-victim', shards: 200 });
  mockDocs.set('users/attacker', { firebaseAuthUid: 'auth-attacker', shards: 200 });
  mockDocs.set('auth_links/auth-victim', { stable_id: 'victim' });
  mockDocs.set('auth_links/auth-attacker', { stable_id: 'attacker' });
}

function submissionPayload() {
  return {
    studyTarget: 'en',
    sourceLang: 'ru',
    title: 'Starter pack',
    description: 'Starter pack',
    cards: Array.from({ length: 10 }, (_, i) => ({
      id: `card-${i + 1}`,
      en: `word ${i + 1}`,
      ru: `slovo ${i + 1}`,
      es: `palabra ${i + 1}`,
    })),
  };
}

function callCommunity<T>(name: string, data: DocData, authUid = 'auth-attacker'): Promise<T> {
  const mod = require('./community_packs');
  return mod[name]({ auth: { uid: authUid }, data });
}

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
  mockDocs.clear();
  mockReadFailures.clear();
  mockAutoId = 0;
  seedVictimIdentity();
});

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
  mockDocs.clear();
  mockReadFailures.clear();
  mockAutoId = 0;
  seedVictimIdentity();
});

const LIMIT_PATH = 'users/attacker/pack_publish_limits/community_pack';

function create(key: string | undefined, extra: DocData = {}, authUid = 'auth-attacker') {
  return callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
    authorStableId: 'attacker',
    payload: { ...submissionPayload(), title: `Pack ${key ?? Math.random()}` },
    ...(key ? { submissionKey: `key-${key}-12345678` } : {}),
    ...extra,
  }, authUid);
}

describe('PACK-PUBLISH-LIMIT: 3 новых публикации в сутки', () => {
  afterEach(() => jest.restoreAllMocks());

  test('четвёртая новая публикация за сутки отклоняется кодом publish_daily_limit', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await create('a'); await create('b'); await create('c');
    await expect(create('d')).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'publish_daily_limit',
      details: { reason: 'publish_daily_limit', limit: 3 },
    });
    expect(mockDocs.get(LIMIT_PATH)).toMatchObject({ count: 3 });
    expect(Array.from(mockDocs.keys()).filter((k) => k.startsWith('community_pack_submissions/'))).toHaveLength(3);
  });

  test('лимит действует и без submissionKey', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await create(undefined); await create(undefined); await create(undefined);
    await expect(create(undefined)).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  test('повтор той же заявки (тот же submissionKey) слот не тратит', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const first = await create('same');
    const retry = await create('same');
    expect(retry.submissionId).toBe(first.submissionId);
    expect(mockDocs.get(LIMIT_PATH)).toMatchObject({ count: 1 });
  });

  test('на следующие сутки счётчик начинается заново', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockDocs.set(LIMIT_PATH, { dayKey: '2000-01-01', count: 3 });
    await expect(create('fresh')).resolves.toBeTruthy();
    const today = new Date().toISOString().slice(0, 10);
    expect(mockDocs.get(LIMIT_PATH)).toMatchObject({ dayKey: today, count: 1 });
  });

  test('админ лимитом не ограничен и счётчик не трогает', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const mod = require('./community_packs');
    for (let i = 0; i < 5; i += 1) {
      await mod.communitySubmitPackForReview({
        auth: { uid: 'auth-attacker', token: { admin: true } },
        data: { authorStableId: 'attacker', payload: { ...submissionPayload(), title: `Admin ${i}` }, submissionKey: `admin-key-${i}-1234` },
      });
    }
    expect(mockDocs.has(LIMIT_PATH)).toBe(false);
  });

  test('отказ по лимиту не создаёт заявку и не мешает другому человеку', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockDocs.set(LIMIT_PATH, { dayKey: new Date().toISOString().slice(0, 10), count: 3 });
    await expect(create('x')).rejects.toMatchObject({ code: 'resource-exhausted' });
    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'victim', payload: submissionPayload(), submissionKey: 'victim-key-12345678',
    }, 'auth-victim')).resolves.toBeTruthy();
  });

  test('правила: счётчик закрыт для клиента, инвентарь Account V2 его знает', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    expect(rules).toContain('match /users/{userId}/pack_publish_limits/{limitId} {');
    expect(rules.replace(/\s+/g, ' ')).toContain('pack_publish_limits/{limitId} { allow read, write: if false;');
    const inv = fs.readFileSync(path.resolve(__dirname, 'accounts_v2_migration', 'inventory.ts'), 'utf8');
    expect(inv).toContain("exact: ['pack_publish_limits']");
  });
});
