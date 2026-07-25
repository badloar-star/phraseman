export {};

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
  limit: (count: number) => FakeQuery;
  get: () => Promise<FakeQuerySnap>;
};

type FakeQuery = {
  where: (field: string, op: string, value: unknown) => FakeQuery;
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
    next[key] = resolveFieldValue(next[key], value);
  }
  mockDocs.set(path, opts?.merge ? deepMerge(mockDocs.get(path) ?? {}, next) : next);
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
    get: async () => snapFor(makeRef(path)),
    set: async (data: DocData, opts?: { merge?: boolean }) => applyData(path, data, opts),
    update: async (data: DocData) => applyData(path, data, { merge: true }),
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

function queryCollection(path: string, filters: Array<[string, unknown]>, limitCount?: number): FakeQuerySnap {
  const prefix = `${path}/`;
  const docs = Array.from(mockDocs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ ref: makeRef(docPath), data }))
    .filter(({ data }) => filters.every(([field, value]) => readFieldPath(data, field) === value))
    .slice(0, limitCount ?? Number.MAX_SAFE_INTEGER)
    .map(({ ref }) => snapFor(ref));
  return { empty: docs.length === 0, docs };
}

function makeQuery(path: string, filters: Array<[string, unknown]> = [], limitCount?: number): FakeQuery {
  return {
    where: (field: string, op: string, value: unknown) => {
      if (op !== '==') throw new Error(`Unsupported op ${op}`);
      return makeQuery(path, [...filters, [field, value]], limitCount);
    },
    limit: (count: number) => makeQuery(path, filters, count),
    get: async () => queryCollection(path, filters, limitCount),
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
            : snapFor(refOrQuery as FakeRef)
        ),
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => applyData(ref.path, data));
        },
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => applyData(ref.path, data, opts));
        },
        update: (ref: FakeRef, data: DocData) => {
          writes.push(() => applyData(ref.path, data, { merge: true }));
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
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
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
  mockDocs.clear();
  mockAutoId = 0;
  seedVictimIdentity();
});

describe('community pack callable ownership', () => {
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

  test('ignores a spoofed buyer stable id and never touches the victim balance', async () => {
    seedPublishedPack();

    await expect(callCommunity('communityPurchasePack', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      buyerDisplayName: 'Mallory',
    })).resolves.toBeDefined();

    // Осколки жертвы не тронуты — списание ушло с аккаунта атакующего.
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect(mockDocs.get('users/attacker')?.shards).toBeLessThan(200);
    // Покупка записана на атакующего, доступа к паку у жертвы не появилось.
    expect(mockDocs.get('community_pack_purchases/attacker__pack-1')).toBeDefined();
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toBeUndefined();
  });

  test('allows buying a pack with the caller own stable id', async () => {
    seedPublishedPack();

    const result = await callCommunity<{ alreadyOwned: boolean; buyerBalanceAfter: number; shardsUpdatedAtMs: number }>('communityPurchasePack', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      buyerDisplayName: 'Alice',
    }, 'auth-victim');

    expect(result).toMatchObject({ alreadyOwned: false, buyerBalanceAfter: 190 });
    expect(result.shardsUpdatedAtMs).toBeGreaterThan(0);
    expect(mockDocs.get('users/victim')?.shards).toBe(190);
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
      buyerStableId: 'victim',
      packId: 'pack-1',
    });
  });

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
