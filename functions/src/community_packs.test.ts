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

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
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

function seedPublishedPack() {
  mockDocs.set('community_packs/pack-1', {
    listingStatus: 'published',
    authorStableId: 'author',
    studyTarget: 'en',
    priceShards: 50,
    salesCount: 0,
    cards: [{ id: 'c1', en: 'hello', ru: 'privet', es: 'hola' }],
  });
  mockDocs.set('users/author', { firebaseAuthUid: 'auth-author', shards: 0 });
}

function seedSecondPublishedPack() {
  mockDocs.set('community_packs/pack-2', {
    listingStatus: 'published',
    authorStableId: 'author',
    studyTarget: 'en',
    priceShards: 10,
    salesCount: 0,
    cards: [{ id: 'c2', en: 'world', ru: 'mir', es: 'mundo' }],
  });
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

describe('community pack callable ownership', () => {
  // зачем переписан (владелец 17.09.2026: «правки публикуются сразу, без
  // очереди на модерацию»): раньше правка СВОЕГО опубликованного набора
  // уходила в update_pending и ждала communityModerateSubmission approve —
  // этот тест проверял именно ту дедупликацию pending-заявок. Теперь правка
  // применяется к community_packs/{packId} прямо внутри communitySubmitPackForReview,
  // pending-статуса для edit больше не бывает — см. новые тесты ниже под
  // 'community pack edits publish immediately'.
  test('first save creates the pack and a second author save updates it in place immediately', async () => {
    const data = { authorStableId: 'attacker', payload: { ...submissionPayload(), packLanguage: 'fr' }, submissionKey: 'local_pack_completion', replacePending: true };
    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', data);
    const mod = require('./community_packs');
    await mod.communityModerateSubmission({ auth: { token: { admin: true } }, data: { submissionId: first.submissionId, action: 'approve' } });
    expect(mockDocs.get(`community_packs/${first.submissionId}`)?.listingStatus).toBe('published');

    const changed = { ...data, payload: { ...data.payload, title: 'Updated French pack' }, updatePackId: first.submissionId };
    const second = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', changed);
    // Правка — НОВЫЙ submission (аудиторский след), не переиспользует id первой заявки.
    expect(second.submissionId).not.toBe(first.submissionId);
    // Но применяется СРАЗУ к тому же опубликованному набору, без ожидания.
    expect(mockDocs.get(`community_packs/${first.submissionId}`)).toMatchObject({
      listingStatus: 'published',
      titleRu: 'Updated French pack',
    });
    expect(mockDocs.get(`community_pack_submissions/${second.submissionId}`)).toMatchObject({
      status: 'approved',
      submissionKind: 'edit',
      editTargetPackId: first.submissionId,
      autoApproved: true,
    });

    const edit = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', { ...changed, payload: { ...changed.payload, title: 'Author latest' } });
    expect(mockDocs.get(`community_packs/${first.submissionId}`)?.titleRu).toBe('Author latest');
    expect(edit.submissionId).not.toBe(second.submissionId);
  });

  test('withdrawn first publication cannot be revived by a delayed retry', async () => {
    const data = { authorStableId: 'attacker', payload: submissionPayload(), submissionKey: 'local_pack_withdrawn', replacePending: true };
    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', data);
    await callCommunity('communityAuthorRemovePack', { authorStableId: 'attacker', packId: first.submissionId });
    await expect(callCommunity('communitySubmitPackForReview', data)).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get(`community_pack_submissions/${first.submissionId}`)?.status).toBe('cancelled');
  });

  test('withdrawal arriving before first submission fences the delayed request', async () => {
    const submissionKey = 'local_pack_delayed_first_request';
    await callCommunity('communityAuthorRemovePack', { authorStableId: 'attacker', packId: 'local_pack_delayed', submissionKey });
    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'attacker', payload: submissionPayload(), submissionKey, replacePending: true,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('server keeps original card provenance and Ukrainian translation', async () => {
    const payload = submissionPayload();
    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: { ...payload, packLanguage: 'de', cards: payload.cards.map(card => ({ ...card, translationUk: 'Переклад', origin: { source: 'video_phrase', sourceId: 'video:1', sourceTitle: 'Travel' } })) },
    });
    const saved = mockDocs.get(`community_pack_submissions/${first.submissionId}`)?.payload as { cards: DocData[] };
    expect(saved.cards[0]).toMatchObject({ translationUk: 'Переклад', origin: { source: 'video_phrase', sourceId: 'video:1', sourceTitle: 'Travel' } });
  });

  // зачем: модель защиты изменилась при переписывании resolveStableUidForAuth
  // (аккаунт-восстановление, 2026-07-25). Раньше чужой stableId в запросе давал
  // throw stable_id_mismatch. Теперь резолвер НЕ доверяет клиентскому полю вообще:
  // он подменяет его на реальную личность вызывающего. Это СТРОЖЕ прежнего —
  // подделка не отвергается, а обезвреживается. Проверяем именно это: запись
  // уходит в аккаунт атакующего, данные жертвы нетронуты.
  test('ignores a spoofed author stable id and submits under the caller identity', async () => {
    await callCommunity('communitySubmitPackForReview', {
      authorStableId: 'victim',
      payload: submissionPayload(),
    });

    const submissions = Array.from(mockDocs.entries())
      .filter(([path]) => path.startsWith('community_pack_submissions/'))
      .map(([, data]) => data);
    expect(submissions).toHaveLength(1);
    // Ключевое: автор — атакующий, а НЕ подставленная жертва.
    expect(submissions[0].authorStableId).toBe('attacker');
    expect(submissions[0].authorStableId).not.toBe('victim');
  });

  test('replays the same create submission for a stable client key', async () => {
    const data = {
      authorStableId: 'attacker',
      payload: submissionPayload(),
      submissionKey: 'local_pack_1779000000000_attempt_1',
    };

    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', data);
    const retry = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', data);

    expect(retry).toEqual(first);
    const submissions = Array.from(mockDocs.entries())
      .filter(([path]) => path.startsWith('community_pack_submissions/'));
    expect(submissions).toHaveLength(1);
    expect(submissions[0][1]).toMatchObject({
      authorStableId: 'attacker',
      submissionKind: 'create',
      submissionKey: data.submissionKey,
    });
  });

  test('creates a new pending submission for a new durable attempt after rejection', async () => {
    const base = {
      authorStableId: 'attacker',
      payload: submissionPayload(),
    };
    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      ...base,
      submissionKey: 'local_pack_1779000000000_attempt_1',
    });
    mockDocs.set(`community_pack_submissions/${first.submissionId}`, {
      ...mockDocs.get(`community_pack_submissions/${first.submissionId}`),
      status: 'rejected',
    });

    const second = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      ...base,
      submissionKey: 'local_pack_1779000000000_attempt_2',
    });

    expect(second.submissionId).not.toBe(first.submissionId);
    expect(mockDocs.get(`community_pack_submissions/${first.submissionId}`)?.status).toBe('rejected');
    expect(mockDocs.get(`community_pack_submissions/${second.submissionId}`)).toMatchObject({
      status: 'pending',
      submissionKey: 'local_pack_1779000000000_attempt_2',
    });
    expect([...mockDocs.keys()].filter((path) => path.startsWith('community_pack_submissions/'))).toHaveLength(2);
  });

  test('rejects payload mismatch when replaying one attempt key and preserves the original payload', async () => {
    const firstPayload = submissionPayload();
    const submissionKey = 'local_pack_1779000000000_attempt_1';
    const first = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: firstPayload,
      submissionKey,
    });
    const changedPayload = { ...submissionPayload(), title: 'Changed after ambiguous response' };

    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: changedPayload,
      submissionKey,
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get(`community_pack_submissions/${first.submissionId}`)?.payload).toMatchObject({
      titleRu: 'Starter pack',
    });
    expect([...mockDocs.keys()].filter((path) => path.startsWith('community_pack_submissions/'))).toHaveLength(1);
  });

  test('copies the durable attempt key into a rejection inbox event', async () => {
    const submissionKey = 'local_pack_1779000000000_attempt_1';
    const submitted = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: submissionPayload(),
      submissionKey,
    });
    const mod = require('./community_packs');

    await mod.communityModerateSubmission({
      auth: { token: { admin: true } },
      data: { submissionId: submitted.submissionId, action: 'reject', moderatorMessage: 'Needs changes' },
    });

    const inbox = [...mockDocs.entries()]
      .filter(([path]) => path.startsWith('users/attacker/community_seller_inbox/'))
      .map(([, data]) => data);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      type: 'moderation_result',
      result: 'rejected',
      submissionId: submitted.submissionId,
      submissionKey,
    });

    const listed = await callCommunity<{
      events: { submissionId?: string; submissionKey?: string }[];
    }>('communityListSellerInbox', { authorStableId: 'attacker', limit: 20 });
    expect(listed.events).toHaveLength(1);
    expect(listed.events[0]).toMatchObject({
      submissionId: submitted.submissionId,
      submissionKey,
    });
  });

  test('rejects a create submission key that is unsafe as an idempotency token', async () => {
    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: submissionPayload(),
      submissionKey: '../unsafe/key',
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect([...mockDocs.keys()].filter((path) => path.startsWith('community_pack_submissions/'))).toHaveLength(0);
  });

  // зачем: D85 — цена наборов в рунах; сервер больше не переписывает жемчужную цену.
  test('does not rewrite the legacy pearl price when an admin moderates the pack', async () => {
    seedPublishedPack();
    const before = mockDocs.get('community_packs/pack-1')?.priceShards;
    const mod = require('./community_packs');

    await mod.communityAdminModeratePack({
      auth: { token: { admin: true } },
      data: { packId: 'pack-1', action: 'remove' },
    });

    expect(mockDocs.get('community_packs/pack-1')).toMatchObject({ listingStatus: 'admin_removed' });
    expect(mockDocs.get('community_packs/pack-1')?.priceShards).toBe(before);
  });

  // зачем: D110 — тесты админ-возврата покупки набора удалены вместе с функцией.

  test('rejects reading cards through another user purchase', async () => {
    seedPublishedPack();
    mockDocs.set('community_pack_purchases/victim__pack-1', {
      buyerStableId: 'victim',
      packId: 'pack-1',
    });

    // Атакующий подставляет stableId жертвы, у которой есть покупка. Резолвер
    // подменяет id на 'attacker', своей покупки у него нет → карточек не даём.
    await expect(callCommunity('communityFetchPackCardsIfAccessible', {
      stableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('allows reading cards through the caller own purchase', async () => {
    seedPublishedPack();
    mockDocs.set('community_pack_purchases/victim__pack-1', {
      buyerStableId: 'victim',
      packId: 'pack-1',
    });

    const result = await callCommunity<{ cards: unknown[] }>('communityFetchPackCardsIfAccessible', {
      stableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim');

    expect(result.cards).toHaveLength(1);
  });

  // зачем: D140 (владелец 2026-10-01) — 4 callable подарочных наборов удалены.
  test('pack-gift callables are removed from the server (D140)', () => {
    const mod = require('./community_packs');
    for (const name of [
      'communityRedeemPackGiftVoucher',
      'flashcardPackGiftRedeem',
      'flashcardPackGiftSyncState',
      'flashcardPackGiftGrantGlobalBroadcast',
    ]) {
      expect(mod[name]).toBeUndefined();
    }
  });

  test('retired level-gift perks are absent from the server claim path', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).not.toContain('gift_xp_multiplier');
    expect(source).not.toContain('chain_shield');
    expect(source).not.toContain('club_gift_free_boost_v1');
    expect(source).not.toContain('wager_discount_25');
    expect(source).not.toMatch(/export\s+const\s+(?:levelGiftReserve|levelGiftActivatePackGift|levelSpinActivatePackGift)\b/);
  });

  test('keeps the retired Arena reward outside every server level-gift catalog', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).not.toContain('arena_extra_5');
  });

  test('rejects listing another seller inbox', async () => {
    mockDocs.set('users/victim/community_seller_inbox/event-1', {
      seen: false,
      type: 'pack_sold',
    });

    // Главное: чужой инбокс НЕ утекает. Резолвер подменяет id на 'attacker',
    // у него инбокс пустой — событий жертвы в ответе быть не может.
    const result = await callCommunity<{ events: Array<{ id: string }> }>('communityListSellerInbox', {
      authorStableId: 'victim',
      limit: 20,
    });
    expect(result.events).toHaveLength(0);
  });

  test('allows listing the caller own seller inbox', async () => {
    mockDocs.set('users/victim/community_seller_inbox/event-1', {
      seen: false,
      type: 'pack_sold',
    });

    const result = await callCommunity<{ events: Array<{ id: string }> }>('communityListSellerInbox', {
      authorStableId: 'victim',
      limit: 20,
    }, 'auth-victim');

    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('event-1');
  });

  test('lists seller inbox with a validated document-id cursor', async () => {
    for (let index = 1; index <= 55; index += 1) {
      const id = `event-${String(index).padStart(3, '0')}`;
      mockDocs.set(`users/attacker/community_seller_inbox/${id}`, {
        seen: false,
        type: 'moderation_result',
      });
    }

    const first = await callCommunity<{
      events: { id: string }[];
      nextCursor?: string;
    }>('communityListSellerInbox', { authorStableId: 'attacker', limit: 50 });
    expect(first.events).toHaveLength(50);
    expect(first.events[0].id).toBe('event-001');
    expect(first.events[49].id).toBe('event-050');
    expect(first.nextCursor).toBe('event-050');

    const second = await callCommunity<{
      events: { id: string }[];
      nextCursor?: string;
    }>('communityListSellerInbox', {
      authorStableId: 'attacker',
      limit: 50,
      afterEventId: first.nextCursor,
    });
    expect(second.events.map((event) => event.id)).toEqual([
      'event-051', 'event-052', 'event-053', 'event-054', 'event-055',
    ]);
    expect(second.nextCursor).toBeUndefined();

    await expect(callCommunity('communityListSellerInbox', {
      authorStableId: 'attacker',
      afterEventId: '../unsafe-cursor',
    })).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('rejects marking another seller inbox seen', async () => {
    mockDocs.set('users/victim/community_seller_inbox/event-1', {
      seen: false,
      type: 'pack_sold',
    });

    await callCommunity('communityMarkSellerInboxSeen', {
      authorStableId: 'victim',
      eventIds: ['event-1'],
    });
    // Главное: событие ЖЕРТВЫ осталось непрочитанным — запись ушла в инбокс
    // атакующего (которого нет), чужие данные не изменены.
    expect(mockDocs.get('users/victim/community_seller_inbox/event-1')?.seen).toBe(false);
  });

  test('allows marking the caller own seller inbox seen', async () => {
    mockDocs.set('users/victim/community_seller_inbox/event-1', {
      seen: false,
      type: 'pack_sold',
    });

    await expect(callCommunity('communityMarkSellerInboxSeen', {
      authorStableId: 'victim',
      eventIds: ['event-1'],
    }, 'auth-victim')).resolves.toEqual({ ok: true });
    expect(mockDocs.get('users/victim/community_seller_inbox/event-1')?.seen).toBe(true);
  });
});

describe('non-russian submission titles', () => {
  /**
   * зачем: реальная заявка «Антоніми дієслів» (uk) висела в pending с 18.08.2026 —
   * админка отвечала «Ошибка: title required». Клиент кладёт в незаполненные
   * локали ПУСТУЮ строку, а `??` её пропускает не как отсутствие значения:
   * цепочка обрывалась на titleRu === '' и затирала настоящее название.
   */
  test('approves a pack whose title lives only in a non-russian locale', async () => {
    const payload: Record<string, unknown> = submissionPayload();
    delete payload.title;
    delete payload.description;
    payload.sourceLang = 'uk';
    payload.titleRu = '';
    payload.titleEs = '';
    payload.titleUk = 'Антоніми дієслів';
    payload.descriptionRu = '';
    payload.descriptionUk = 'Borrow, bring, take, accept';
    mockDocs.set('community_pack_submissions/sub-uk', { status: 'pending', authorStableId: 'author', payload });

    const mod = require('./community_packs');
    await expect(
      mod.communityModerateSubmission({ auth: { token: { admin: true } }, data: { submissionId: 'sub-uk', action: 'approve' } }),
    ).resolves.toBeDefined();

    expect(mockDocs.get('community_packs/sub-uk')).toMatchObject({
      listingStatus: 'published',
      titleUk: 'Антоніми дієслів',
      descriptionUk: 'Borrow, bring, take, accept',
    });
  });
});

describe('community pack semantic registry synchronization', () => {
  test('publishes and removes locale-partitioned memberships in the same moderation flow', async () => {
    const payload: { cards: Array<Record<string, unknown>> } & Record<string, unknown> = submissionPayload();
    payload.cards[0] = { ...payload.cards[0], richSchemaVersion: 1, exampleTarget: 'Example target', exampleSource: 'Пример', note: 'Usage note', sourceReferences: ['lesson:1:p1', 'exemplar:e1'] };
    mockDocs.set('community_pack_submissions/sub-1', { status: 'pending', authorStableId: 'author', payload });
    const mod = require('./community_packs');
    await mod.communityModerateSubmission({ auth: { token: { admin: true } }, data: { submissionId: 'sub-1', action: 'approve' } });
    expect(mockDocs.get('community_packs/sub-1')).toMatchObject({ listingStatus: 'published', cardCount: 10 });
    expect((mockDocs.get('community_packs/sub-1')?.cards as DocData[])[0]).toMatchObject({ richSchemaVersion: 1, exampleTarget: 'Example target', exampleSource: 'Пример', note: 'Usage note', sourceReferences: ['lesson:1:p1', 'exemplar:e1'] });
    const registryAfterPublish = [...mockDocs.entries()].filter(([key]) => key.startsWith('content_factory_flashcard_semantic_keys/'));
    expect(registryAfterPublish).toHaveLength(20);
    expect(registryAfterPublish.map(([, value]) => value.partitionKey)).toEqual(expect.arrayContaining(['community_flashcards:en:ru', 'community_flashcards:en:es']));

    await mod.communityAdminModeratePack({ auth: { token: { admin: true } }, data: { packId: 'sub-1', action: 'remove' } });
    expect(mockDocs.get('community_packs/sub-1')).toMatchObject({ listingStatus: 'admin_removed' });
    expect([...mockDocs.keys()].filter((key) => key.startsWith('content_factory_flashcard_semantic_keys/'))).toHaveLength(0);
  });
});

// зачем (владелец 17.09.2026): «юзер должен иметь возможность редактировать
// свои наборы даже если они опубликованы» — правка публикуется СРАЗУ, без
// communityModerateSubmission. Покрываем ровно ту ветку в communitySubmitPackForReview,
// которая раньше писала listingStatus: 'update_pending' (functions/src/community_packs.ts).
describe('community pack edits publish immediately (no moderation queue)', () => {
  async function publishBaselinePack(): Promise<string> {
    const created = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: submissionPayload(),
    }, 'auth-attacker');
    const mod = require('./community_packs');
    await mod.communityModerateSubmission({
      auth: { token: { admin: true } },
      data: { submissionId: created.submissionId, action: 'approve' },
    });
    return created.submissionId;
  }

  test('owner edit updates title, description and cards without ever touching update_pending', async () => {
    const packId = await publishBaselinePack();
    const editedPayload = {
      ...submissionPayload(),
      title: 'Edited title',
      description: 'Edited description',
      cards: [{ id: 'new-card', en: 'brand new', ru: 'novoe', es: 'nuevo' }, ...submissionPayload().cards.slice(1)],
    };

    const result = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: editedPayload,
      updatePackId: packId,
    }, 'auth-attacker');

    const pack = mockDocs.get(`community_packs/${packId}`);
    expect(pack).toMatchObject({ listingStatus: 'published', titleRu: 'Edited title', descriptionRu: 'Edited description' });
    // Никогда не проходит через очередь на модерацию.
    expect(pack?.listingStatus).not.toBe('update_pending');
    expect(pack?.pendingSubmissionId).toBeUndefined();
    expect((pack?.cards as DocData[])[0]).toMatchObject({ id: 'new-card' });
    // Submission всё равно создан — как аудиторский след, не как очередь.
    const submission = mockDocs.get(`community_pack_submissions/${result.submissionId}`);
    expect(submission).toMatchObject({
      status: 'approved',
      submissionKind: 'edit',
      editTargetPackId: packId,
      autoApproved: true,
      publishedPackId: packId,
    });
    expect(submission?.previousPayloadSnapshot).toMatchObject({ titleRu: 'Starter pack' });
  });

  test('rejects an edit from someone who is not the pack author', async () => {
    const packId = await publishBaselinePack();

    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'victim',
      payload: { ...submissionPayload(), title: 'Hijacked title' },
      updatePackId: packId,
    }, 'auth-victim')).rejects.toMatchObject({ code: 'permission-denied' });

    // Набор не тронут чужой попыткой правки.
    expect(mockDocs.get(`community_packs/${packId}`)?.titleRu).toBe('Starter pack');
  });

  test('rejects editing a pack that is not in an editable listing state', async () => {
    mockDocs.set('community_packs/draft-pack', {
      listingStatus: 'draft',
      authorStableId: 'attacker',
      studyTarget: 'en',
      cards: [],
    });

    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: submissionPayload(),
      updatePackId: 'draft-pack',
    }, 'auth-attacker')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('rejects an edit that tries to change the pack study target', async () => {
    const packId = await publishBaselinePack();

    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: { ...submissionPayload(), studyTarget: 'fr', packLanguage: 'fr' },
      updatePackId: packId,
    }, 'auth-attacker')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get(`community_packs/${packId}`)?.studyTarget).toBe('en');
  });

  test('editing an admin_revision_required pack republishes it and clears the flag', async () => {
    mockDocs.set('community_packs/needs-revision', {
      listingStatus: 'admin_revision_required',
      authorStableId: 'attacker',
      studyTarget: 'en',
      cards: submissionPayload().cards,
    });

    const result = await callCommunity<{ submissionId: string }>('communitySubmitPackForReview', {
      authorStableId: 'attacker',
      payload: { ...submissionPayload(), title: 'Fixed after revision request' },
      updatePackId: 'needs-revision',
    }, 'auth-attacker');

    expect(mockDocs.get('community_packs/needs-revision')).toMatchObject({
      listingStatus: 'published',
      titleRu: 'Fixed after revision request',
    });
    expect(result.submissionId).toBeTruthy();
  });

  test('rejects editing a pack owned by another author even when the caller spoofs the author stable id', async () => {
    const packId = await publishBaselinePack();

    // Атакующий владеет своим набором, но пытается редактировать чужой (жертвы) —
    // резолвер identity подставляет РЕАЛЬНОГО вызывающего, а не заявленный authorStableId.
    mockDocs.set('community_packs/victim-pack', {
      listingStatus: 'published',
      authorStableId: 'victim',
      studyTarget: 'en',
      cards: submissionPayload().cards,
    });

    await expect(callCommunity('communitySubmitPackForReview', {
      authorStableId: 'victim',
      payload: submissionPayload(),
      updatePackId: 'victim-pack',
    }, 'auth-attacker')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(mockDocs.get('community_packs/victim-pack')?.authorStableId).toBe('victim');
    void packId;
  });
});
