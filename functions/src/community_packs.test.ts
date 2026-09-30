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

function seedPackGiftVoucher(voucherId = 'gift-voucher', ownerStableUid = 'victim'): void {
  mockDocs.set(`flashcard_pack_gift_grants/${voucherId}`, {
    ownerStableUid, occurrenceId: voucherId, expiresAt: Date.now() + 72 * 60 * 60 * 1000,
  });
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

  test('redeems a server-issued pack gift without charging buyer or paying seller', async () => {
    seedPublishedPack();
    seedPackGiftVoucher();

    const result = await callCommunity<{ alreadyOwned: boolean; gifted: boolean }>('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      voucherId: 'gift-voucher',
    }, 'auth-victim');

    expect(result).toMatchObject({ alreadyOwned: false, gifted: true });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect(mockDocs.get('users/author')?.shards).toBe(0);
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
      buyerStableId: 'victim',
      packId: 'pack-1',
      priceShards: 0,
      acquisitionSource: 'pack_gift_voucher',
    });
  });

  test('pack gift voucher is one-time across different community packs', async () => {
    seedPublishedPack();
    seedSecondPublishedPack();
    seedPackGiftVoucher();

    await callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      voucherId: 'gift-voucher',
    }, 'auth-victim');

    await expect(callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-2',
      studyTarget: 'en',
      voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get('community_pack_purchases/victim__pack-2')).toBeUndefined();
  });

  test('replays the same community gift so the client can recover a failed local save', async () => {
    seedPublishedPack();
    seedPackGiftVoucher();

    await callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      voucherId: 'gift-voucher',
    }, 'auth-victim');
    const replay = await callCommunity<{ gifted: boolean; replayed?: boolean }>('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      voucherId: 'gift-voucher',
    }, 'auth-victim');

    expect(replay).toMatchObject({ gifted: true, replayed: true });
  });

  test('rejects a free community claim without a server grant', async () => {
    seedPublishedPack();

    await expect(callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toBeUndefined();
  });

  test('uses one receipt across community decks in both redemption orders', async () => {
    seedPublishedPack();
    seedSecondPublishedPack();
    seedPackGiftVoucher();

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-2', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });

    mockDocs.delete('flashcard_pack_gift_claims/victim__gift-voucher');
    mockDocs.delete('flashcard_pack_gift_entitlements/victim__community__pack-1');
    mockDocs.delete('community_pack_purchases/victim__pack-1');
    seedPackGiftVoucher();
    await callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-2', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('does not mint separate voucher claims for English and French', async () => {
    seedPublishedPack();
    mockDocs.set('community_packs/pack-fr', {
      listingStatus: 'published', authorStableId: 'author', studyTarget: 'fr', cards: [{ id: 'fr1' }],
    });
    seedPackGiftVoucher();

    await callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-fr', studyTarget: 'fr', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('replays exactly the same community choice and rejects a different choice', async () => {
    seedPublishedPack();
    seedSecondPublishedPack();
    seedPackGiftVoucher();
    const request = {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en', voucherId: 'gift-voucher',
    };

    await callCommunity('flashcardPackGiftRedeem', request, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', request, 'auth-victim')).resolves.toMatchObject({
      gifted: true, replayed: true, packId: 'pack-1',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...request, packId: 'pack-2',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('rejects spoofed official ids and invalid community pack state', async () => {
    seedPublishedPack();
    seedPackGiftVoucher();

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_spoofed_en', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'not-found', message: 'pack_not_found' });

    mockDocs.set('community_packs/unpublished', { listingStatus: 'draft', authorStableId: 'author', studyTarget: 'en' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'unpublished', studyTarget: 'en', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    seedPackGiftVoucher('gift-author', 'author');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'author', packType: 'community', packId: 'pack-1', studyTarget: 'en', voucherId: 'gift-author',
    }, 'auth-author')).rejects.toMatchObject({ code: 'failed-precondition', message: 'own_pack_not_giftable' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'fr', voucherId: 'gift-voucher',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('remote weekly config cannot mint a pack gift without an issued voucher', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    seedPublishedPack();
    mockDocs.set('remote_config/app', {
      texts: { weekly_boons_config: JSON.stringify({ schedule: { 5: 'flashcard_friday' } }) },
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'no_pack_gift_voucher' });
    const synced = await callCommunity<{ vouchers: Array<{ source: string }> }>('flashcardPackGiftSyncState', { stableId: 'victim' }, 'auth-victim');
    expect(synced.vouchers).not.toEqual(expect.arrayContaining([expect.objectContaining({ source: 'weekly_boon' })]));
  });

  test('replays the exact expired server grant before checking grant expiry', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/grant-expiry-replay', {
      ownerStableUid: 'victim', expiresAt: 1_800_000_010_000, occurrenceId: 'grant-expiry-replay',
    });
    const request = {
      buyerStableId: 'victim', voucherId: 'grant-expiry-replay', voucherOccurrenceId: 'grant-expiry-replay',
      packType: 'community', packId: 'pack-1', studyTarget: 'en',
    };
    await callCommunity('flashcardPackGiftRedeem', request, 'auth-victim');
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_020_000);
    await expect(callCommunity('flashcardPackGiftRedeem', request, 'auth-victim')).resolves.toMatchObject({ replayed: true });
  });

  test('derives a server grant occurrence from the grant and rejects client occurrence substitution', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/grant-G', {
      ownerStableUid: 'victim', expiresAt: 1_800_000_010_000, occurrenceId: 'grant-G',
    });
    const base = {
      buyerStableId: 'victim', voucherId: 'grant-G', packType: 'community',
      packId: 'pack-1', studyTarget: 'en',
    };

    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...base, voucherOccurrenceId: 'attacker-A',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'voucher_occurrence_mismatch' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...base, voucherOccurrenceId: 'attacker-B',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'voucher_occurrence_mismatch' });
    expect(Array.from(mockDocs.keys()).filter((path) => path.startsWith('flashcard_pack_gift_claims/'))).toHaveLength(0);
    expect(mockDocs.get('flashcard_pack_gift_grants/grant-G')?.claimedAt).toBeUndefined();

    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...base, voucherOccurrenceId: 'grant-G',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true });
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_020_000);
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...base, voucherOccurrenceId: 'grant-G',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true, replayed: true });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...base, voucherOccurrenceId: 'grant-G', packId: 'pack-2',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('rejects a grant whose stored occurrence disagrees with its authoritative id', async () => {
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/grant-id', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'different-occurrence',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'grant-id', voucherOccurrenceId: 'grant-id',
      packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'voucher_occurrence_mismatch' });
  });

  test('rejects claimedAt without the exact durable claim receipt', async () => {
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/orphan-claimed', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000,
      occurrenceId: 'orphan-claimed', claimedAt: Date.now(),
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'orphan-claimed', voucherOccurrenceId: 'orphan-claimed',
      packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'no_pack_gift_voucher' });
  });

  test('recognizes community ownership under identity aliases without consuming a grant', async () => {
    seedPublishedPack();
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('community_pack_purchases/old-victim__pack-1', {
      buyerStableId: 'old-victim', packId: 'pack-1', status: 'completed', studyTarget: 'en',
    });
    mockDocs.set('flashcard_pack_gift_grants/owned-check', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'owned-check',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'owned-check', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ alreadyOwned: true, gifted: false });
    expect(mockDocs.get('flashcard_pack_gift_grants/owned-check')?.claimedAt).toBeUndefined();
    expect(Array.from(mockDocs.keys()).filter((path) => path.startsWith('flashcard_pack_gift_claims/'))).toHaveLength(0);
  });

  test.each([
    ['canonical', 'victim'],
    ['identity alias', 'old-victim'],
  ])('recognizes normal community ownership in %s account data without consuming the grant', async (_label, ownerDocId) => {
    seedPublishedPack();
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set(`users/${ownerDocId}`, {
      ...(mockDocs.get(`users/${ownerDocId}`) ?? {}),
    });
    mockDocs.set(`community_pack_purchases/${ownerDocId}__pack-1`, {
      buyerStableId: ownerDocId, packId: 'pack-1', status: 'completed', studyTarget: 'en',
    });
    mockDocs.set('flashcard_pack_gift_grants/normal-owned-check', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'normal-owned-check',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'normal-owned-check', packType: 'community',
      packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ alreadyOwned: true, gifted: false });
    expect(mockDocs.get('flashcard_pack_gift_grants/normal-owned-check')?.claimedAt).toBeUndefined();
    expect(Array.from(mockDocs.keys()).filter((path) => path.startsWith('flashcard_pack_gift_claims/'))).toHaveLength(0);
  });

  test('rejects gifting a community pack authored under an identity alias without consuming the grant', async () => {
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('community_packs/alias-owned-pack', {
      listingStatus: 'published', authorStableId: 'old-victim', studyTarget: 'en',
    });
    mockDocs.set('flashcard_pack_gift_grants/alias-author-check', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'alias-author-check',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'alias-author-check', packType: 'community',
      packId: 'alias-owned-pack', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'own_pack_not_giftable' });
    expect(mockDocs.get('flashcard_pack_gift_grants/alias-author-check')?.claimedAt).toBeUndefined();
    expect(Array.from(mockDocs.keys()).filter((path) => path.startsWith('flashcard_pack_gift_claims/'))).toHaveLength(0);
  });

  test('syncs active alias grants and entitlements while excluding claimed grants', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('flashcard_pack_gift_grants/active-alias', {
      ownerStableUid: 'old-victim', expiresAt: Date.now() + 60_000, occurrenceId: 'active-alias', source: 'league_chest',
    });
    mockDocs.set('flashcard_pack_gift_grants/claimed-alias', {
      ownerStableUid: 'old-victim', expiresAt: Date.now() + 60_000, occurrenceId: 'claimed-alias', claimedAt: Date.now(),
    });
    mockDocs.set('flashcard_pack_gift_entitlements/old-victim__community__pack-1', {
      buyerStableId: 'old-victim', packId: 'pack-1', packType: 'community', studyTarget: 'en',
    });

    const result = await callCommunity<{
      vouchers: Array<{ voucherId?: string; occurrenceId?: string }>;
      entitlements: Array<{ packId: string }>;
    }>('flashcardPackGiftSyncState', { stableId: 'victim' }, 'auth-victim');
    expect(result.vouchers).toEqual(expect.arrayContaining([
      expect.objectContaining({ voucherId: 'active-alias' }),
    ]));
    expect(result.vouchers).not.toEqual(expect.arrayContaining([expect.objectContaining({ voucherId: 'claimed-alias' })]));
    expect(result.entitlements).toEqual(expect.arrayContaining([expect.objectContaining({ packId: 'pack-1', packType: 'community' })]));
  });

  test('syncs active grants and entitlements beyond the former query caps', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    for (let index = 0; index < 110; index += 1) {
      mockDocs.set(`flashcard_pack_gift_grants/grant-${String(index).padStart(3, '0')}`, {
        ownerStableUid: 'victim', expiresAt: Date.now() + 60_000,
        occurrenceId: `grant-${String(index).padStart(3, '0')}`, source: 'league_chest',
      });
    }
    for (let index = 0; index < 205; index += 1) {
      mockDocs.set(`flashcard_pack_gift_entitlements/victim__official__restored-${String(index).padStart(3, '0')}`, {
        buyerStableId: 'victim', packId: `restored-${String(index).padStart(3, '0')}`,
        packType: 'community', studyTarget: 'en',
      });
    }

    const result = await callCommunity<{
      vouchers: { voucherId?: string }[];
      entitlements: { packId: string }[];
    }>('flashcardPackGiftSyncState', { stableId: 'victim' }, 'auth-victim');
    expect(result.vouchers).toEqual(expect.arrayContaining([expect.objectContaining({ voucherId: 'grant-109' })]));
    expect(result.entitlements).toEqual(expect.arrayContaining([expect.objectContaining({ packId: 'restored-204', packType: 'community' })]));
  });

  test('redeems a server-issued league grant and rejects a forged grant id', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/league_claim-1', {
      ownerStableUid: 'victim', source: 'league_chest', occurrenceId: 'league_claim-1',
      expiresAt: 1_800_000_100_000,
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'league_claim-1',
      packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'forged',
      packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'no_pack_gift_voucher' });
  });

  test('issues a global-broadcast grant only from an active matching authoritative document and audience', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const authority = { publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true };
    mockDocs.set('global_broadcast_modals/gift-all', { ...authority, active: true, rewardType: 'pack_trial_48h', premiumAudience: 'all' });
    mockDocs.set('global_broadcast_modals/not-a-gift', { ...authority, active: true, rewardType: 'shards', premiumAudience: 'all' });
    mockDocs.set('global_broadcast_modals/premium-only', { ...authority, active: true, rewardType: 'pack_trial_48h', premiumAudience: 'premium' });

    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'gift-all',
    }, 'auth-victim')).resolves.toMatchObject({ voucherId: 'global_broadcast_gift-all_victim', expiresAt: 1_800_172_800_000 });
    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'not-a-gift',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'premium-only',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('rejects unmarked, marker-only, and unknown-field first grants but replays an existing receipt first', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('global_broadcast_modals/unmarked', { active: true, rewardType: 'pack_trial_48h', premiumAudience: 'all' });
    mockDocs.set('global_broadcast_modals/marker-only', { publicPayloadSchemaVersion: 1, active: true, rewardType: 'pack_trial_48h', premiumAudience: 'all' });
    mockDocs.set('global_broadcast_modals/unknown', {
      publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true,
      active: true, rewardType: 'pack_trial_48h', premiumAudience: 'all', internalNote: 'unsafe',
    });
    for (const broadcastId of ['unmarked', 'marker-only', 'unknown']) {
      await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
        stableId: 'victim', broadcastId,
      }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'broadcast_public_schema_invalid' });
    }

    mockDocs.set('flashcard_pack_gift_grants/global_broadcast_unmarked_victim', {
      ownerStableUid: 'victim', source: 'global_broadcast', sourceId: 'unmarked',
      occurrenceId: 'global_broadcast_unmarked_victim', expiresAt: 1_800_172_800_000,
    });
    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'unmarked',
    }, 'auth-victim')).resolves.toMatchObject({
      voucherId: 'global_broadcast_unmarked_victim', expiresAt: 1_800_172_800_000, replayed: true,
    });
  });

  test('finds a pre-merge receipt under an alias and cannot claim the occurrence again', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    seedPublishedPack();
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('flashcard_pack_gift_grants/grant-alias', {
      ownerStableUid: 'old-victim', occurrenceId: 'grant-alias', expiresAt: Date.now() + 60_000,
    });
    mockDocs.set('flashcard_pack_gift_claims/old-victim__grant-alias', {
      buyerStableId: 'old-victim', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-2', studyTarget: 'en',
      voucherId: 'grant-alias', voucherOccurrenceId: 'grant-alias',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('retired level-gift perks are absent from the server claim path', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).not.toContain('gift_xp_multiplier');
    expect(source).not.toContain('chain_shield');
    expect(source).not.toContain('club_gift_free_boost_v1');
    expect(source).not.toContain('wager_discount_25');
    expect(source).not.toMatch(/export\s+const\s+(?:levelGiftReserve|levelGiftActivatePackGift|levelSpinActivatePackGift)\b/);
  });

  test('uses the authenticated canonical alias graph for premium broadcast audience access', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('global_broadcast_modals/premium-alias', {
      publicPayloadSchemaVersion: 1, publicPayloadValidatedV1: true,
      active: true, rewardType: 'pack_trial_48h', premiumAudience: 'premium',
    });
    mockDocs.set('users/victim-premium-alias', {
      identityHidden: true,
      canonicalStableId: 'victim',
      firebaseAuthUid: 'auth-victim',
      progress: { vip_active: 'true', vip_until: '1800000100000' },
    });

    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'premium-alias',
    }, 'auth-victim')).resolves.toMatchObject({
      voucherId: 'global_broadcast_premium-alias_victim',
    });
  });

  test('replays an existing premium-audience broadcast grant after Plus access expires', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('global_broadcast_modals/premium-replay', {
      active: true, rewardType: 'pack_trial_48h', premiumAudience: 'premium',
    });
    mockDocs.set('flashcard_pack_gift_grants/global_broadcast_premium-replay_victim', {
      ownerStableUid: 'victim',
      source: 'global_broadcast',
      sourceId: 'premium-replay',
      occurrenceId: 'global_broadcast_premium-replay_victim',
      expiresAt: 1_800_172_800_000,
      createdAt: 1_799_000_000_000,
    });
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progress: {},
    });

    await expect(callCommunity('flashcardPackGiftGrantGlobalBroadcast', {
      stableId: 'victim', broadcastId: 'premium-replay',
    }, 'auth-victim')).resolves.toMatchObject({
      voucherId: 'global_broadcast_premium-replay_victim',
      expiresAt: 1_800_172_800_000,
      replayed: true,
    });
  });

  test('keeps the retired Arena reward outside every server level-gift catalog', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).not.toContain('arena_extra_5');
  });

  test('an exact-pack level grant cannot redeem a different official pack', async () => {
    seedPublishedPack();
    mockDocs.set('flashcard_pack_gift_grants/exact-pack-grant', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, allowedPackId: 'official_prep_in_en',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1',
      studyTarget: 'en', voucherId: 'exact-pack-grant',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'permission-denied', message: 'voucher_pack_mismatch' });
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
