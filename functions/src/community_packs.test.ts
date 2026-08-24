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
  mockDocs.set('remote_config/app', {
    texts: { weekly_boons_config: JSON.stringify({ schedule: { 5: 'flashcard_friday' } }) },
  });
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

    // Личные балансы не тронуты: сервер добавил внешний debit-факт атакующему.
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect(mockDocs.get('users/attacker')?.shards).toBe(200);
    expect([...mockDocs.entries()].some(([key, value]) =>
      key.startsWith('users/attacker/external_economy_events/') && value.delta === -10
    )).toBe(true);
    // Покупка записана на атакующего, доступа к паку у жертвы не появилось.
    expect(mockDocs.get('community_pack_purchases/attacker__pack-1')).toBeDefined();
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toBeUndefined();
  });

  test('allows buying a pack with the caller own stable id', async () => {
    seedPublishedPack();

    const result = await callCommunity<{
      alreadyOwned: boolean;
      priceShards: number;
      authorNetShards: number;
    }>('communityPurchasePack', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
      buyerDisplayName: 'Alice',
    }, 'auth-victim');

    expect(result).toMatchObject({
      alreadyOwned: false,
      priceShards: 10,
      authorNetShards: 9,
    });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect(mockDocs.get('users/author')?.shards).toBe(0);
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
      buyerStableId: 'victim',
      packId: 'pack-1',
      status: 'completed',
      acquisitionSource: 'paid_community_sale',
      priceShards: 10,
      authorNetShards: 9,
      platformFeeShards: 1,
    });
    const buyerLedger = Array.from(mockDocs.entries())
      .find(([path, row]) => path.startsWith('users/victim/shard_log/') && row.reason === 'community_pack_purchase')?.[1];
    expect(buyerLedger).toMatchObject({
      type: 'spend',
      amount: 10,
      authority: 'external_event',
    });
    const authorLedger = Array.from(mockDocs.entries())
      .find(([path, row]) => path.startsWith('users/author/shard_log/') && row.reason === 'community_pack_sale')?.[1];
    expect(authorLedger).toMatchObject({
      type: 'earn',
      amount: 9,
      grossAmount: 10,
      platformFeeShards: 1,
      authority: 'external_event',
    });
    expect(mockDocs.get('users/author/community_seller_inbox/victim__pack-1')).toMatchObject({
      type: 'pack_sold',
      grossShards: 10,
      authorNetShards: 9,
    });
    expect(mockDocs.get('community_packs/pack-1')?.priceShards).toBe(10);
  });

  test('normalizes a legacy stored price when an admin moderates the pack', async () => {
    seedPublishedPack();
    const mod = require('./community_packs');

    await mod.communityAdminModeratePack({
      auth: { token: { admin: true } },
      data: { packId: 'pack-1', action: 'remove' },
    });

    expect(mockDocs.get('community_packs/pack-1')).toMatchObject({
      listingStatus: 'admin_removed',
      priceShards: 10,
    });
  });

  test('admin refund returns exactly the canonical price and records one atomic audit trail', async () => {
    mockDocs.set('community_pack_purchases/victim__pack-1', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      status: 'completed',
      acquisitionSource: 'paid_community_sale',
      priceShards: 999,
    });
    const mod = require('./community_packs');

    const result = await mod.adminRefundCommunityPackPurchase({
      auth: { uid: 'auth-admin', token: { admin: true, email: 'admin@example.com' } },
      data: { purchaseId: 'victim__pack-1', reason: 'support-approved' },
    });

    expect(result).toMatchObject({ purchaseId: 'victim__pack-1', buyerStableId: 'victim', amountShards: 10 });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect([...mockDocs.entries()].some(([key, value]) =>
      key.startsWith('users/victim/external_economy_events/')
      && value.delta === 10
      && value.reason === 'admin_community_pack_refund'
    )).toBe(true);
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
      status: 'refunded',
      refundedAmountShards: 10,
      refundedByUid: 'auth-admin',
      refundedByEmail: 'admin@example.com',
      refundReason: 'support-approved',
    });
    const refundLedger = Array.from(mockDocs.entries())
      .find(([path, row]) => path.startsWith('users/victim/shard_log/') && row.reason === 'admin_community_pack_refund')?.[1];
    expect(refundLedger).toMatchObject({ type: 'earn', amount: 10, authority: 'external_event' });
    const audit = Array.from(mockDocs.entries())
      .find(([path, row]) => path.startsWith('admin_log/') && row.action === 'community_pack_purchase.refund')?.[1];
    expect(audit).toMatchObject({ actorUid: 'auth-admin', reason: 'support-approved' });
    await expect(mod.adminRefundCommunityPackPurchase({
      auth: { uid: 'auth-admin', token: { admin: true, email: 'admin@example.com' } },
      data: { purchaseId: 'victim__pack-1', reason: 'replay' },
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'purchase_already_refunded' });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
  });

  test('admin refund rejects replay, gift receipts, missing receipts, and non-completed receipts without minting shards', async () => {
    const mod = require('./community_packs');
    const adminRequest = (purchaseId: string) => ({
      auth: { uid: 'auth-admin', token: { admin: true } },
      data: { purchaseId },
    });
    mockDocs.set('community_pack_purchases/refunded', { buyerStableId: 'victim', packId: 'pack-1', status: 'refunded' });
    mockDocs.set('community_pack_purchases/gift', {
      buyerStableId: 'victim', packId: 'pack-1', status: 'completed', acquisitionSource: 'weekly_boon_gift', priceShards: 0,
    });
    mockDocs.set('community_pack_purchases/pending', {
      buyerStableId: 'victim', packId: 'pack-1', status: 'pending', acquisitionSource: 'paid_community_sale', priceShards: 10,
    });

    await expect(mod.adminRefundCommunityPackPurchase(adminRequest('refunded')))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'purchase_already_refunded' });
    await expect(mod.adminRefundCommunityPackPurchase(adminRequest('gift')))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'gift_purchase_not_refundable' });
    await expect(mod.adminRefundCommunityPackPurchase(adminRequest('pending')))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'purchase_not_completed' });
    await expect(mod.adminRefundCommunityPackPurchase(adminRequest('missing')))
      .rejects.toMatchObject({ code: 'not-found', message: 'purchase_not_found' });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
  });

  test('admin refund requires the admin claim', async () => {
    mockDocs.set('community_pack_purchases/victim__pack-1', {
      buyerStableId: 'victim', packId: 'pack-1', status: 'completed', acquisitionSource: 'paid_community_sale', priceShards: 10,
    });
    const mod = require('./community_packs');

    await expect(mod.adminRefundCommunityPackPurchase({
      auth: { uid: 'auth-user', token: {} },
      data: { purchaseId: 'victim__pack-1' },
    })).rejects.toMatchObject({ code: 'permission-denied' });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
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

  test('redeems the active weekly pack gift without charging buyer or paying seller', async () => {
    seedPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12)); // Friday UTC

    const result = await callCommunity<{ alreadyOwned: boolean; gifted: boolean }>('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim');

    expect(result).toMatchObject({ alreadyOwned: false, gifted: true });
    expect(mockDocs.get('users/victim')?.shards).toBe(200);
    expect(mockDocs.get('users/author')?.shards).toBe(0);
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toMatchObject({
      buyerStableId: 'victim',
      packId: 'pack-1',
      priceShards: 0,
      acquisitionSource: 'weekly_boon_gift',
    });
  });

  test('weekly pack gift is one-time across different community packs', async () => {
    seedPublishedPack();
    seedSecondPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12)); // Friday UTC

    await callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim');

    await expect(callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-2',
      studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get('community_pack_purchases/victim__pack-2')).toBeUndefined();
  });

  test('replays the same community gift so the client can recover a failed local save', async () => {
    seedPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));

    await callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim');
    const replay = await callCommunity<{ gifted: boolean; replayed?: boolean }>('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim');

    expect(replay).toMatchObject({ gifted: true, replayed: true });
  });

  test('rejects a free community claim outside the active gift window', async () => {
    seedPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 7, 4, 12)); // Tuesday UTC

    await expect(callCommunity('communityRedeemPackGiftVoucher', {
      buyerStableId: 'victim',
      packId: 'pack-1',
      studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get('community_pack_purchases/victim__pack-1')).toBeUndefined();
  });

  test('uses one receipt across official and community decks in both redemption orders', async () => {
    seedPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));

    await callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });

    mockDocs.delete('flashcard_pack_gift_claims/victim__weekly_boon_2026-07-31');
    mockDocs.delete('flashcard_pack_gift_entitlements/victim__official__official_prep_in_en');
    await callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('does not mint separate weekly claims for English and French', async () => {
    seedPublishedPack();
    mockDocs.set('community_packs/pack-fr', {
      listingStatus: 'published', authorStableId: 'author', studyTarget: 'fr', cards: [{ id: 'fr1' }],
    });
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));

    await callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-fr', studyTarget: 'fr',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('replays exactly the same official choice and rejects a different choice', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    const request = {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    };

    await callCommunity('flashcardPackGiftRedeem', request, 'auth-victim');
    await expect(callCommunity('flashcardPackGiftRedeem', request, 'auth-victim')).resolves.toMatchObject({
      gifted: true, replayed: true, packId: 'official_prep_in_en',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...request, packId: 'official_prep_on_en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('rejects spoofed official ids and invalid community pack state', async () => {
    seedPublishedPack();
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_spoofed_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'not-found', message: 'pack_not_found' });

    mockDocs.set('community_packs/unpublished', { listingStatus: 'draft', authorStableId: 'author', studyTarget: 'en' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'unpublished', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'author', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-author')).rejects.toMatchObject({ code: 'failed-precondition', message: 'own_pack_not_giftable' });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'community', packId: 'pack-1', studyTarget: 'fr',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('reads weekly boon schedule only from Firestore and fails closed on disabled, partial, or failed config reads', async () => {
    const tuesday = Date.UTC(2026, 7, 4, 12);
    jest.spyOn(Date, 'now').mockReturnValue(tuesday);
    mockDocs.set('remote_config/app', {
      texts: { weekly_boons_config: JSON.stringify({ schedule: { 2: ['unknown_boon', 'flashcard_friday'] } }) },
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true });

    mockDocs.clear(); seedVictimIdentity();
    mockDocs.set('remote_config/app', {
      texts: { weekly_boons_config: JSON.stringify({ schedule: { 2: 'flashcard_friday' }, enabled: { flashcard_friday: false } }) },
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'no_pack_gift_voucher' });

    mockReadFailures.add('remote_config/app');
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'unavailable', message: 'weekly_boons_config_unavailable' });
  });

  test.each([
    ['missing', undefined],
    ['empty', ''],
    ['malformed', '{'],
    ['non-object', '[]'],
  ])('fails closed for %s weekly boon config', async (_label, raw) => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    mockDocs.set('remote_config/app', raw === undefined ? { texts: {} } : { texts: { weekly_boons_config: raw } });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'weekly_boons_config_invalid' });
  });

  test('replays the exact weekly selection after expiry and rejects another pack', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 6, 31, 12));
    const occurrenceId = 'weekly_boon_2026-07-31';
    const request = {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
      voucherOccurrenceId: occurrenceId,
    };
    await callCommunity('flashcardPackGiftRedeem', request, 'auth-victim');

    jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 7, 4, 12));
    await expect(callCommunity('flashcardPackGiftRedeem', request, 'auth-victim')).resolves.toMatchObject({ replayed: true });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      ...request, packId: 'official_prep_on_en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('replays the exact expired server grant before checking grant expiry', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('flashcard_pack_gift_grants/grant-expiry-replay', {
      ownerStableUid: 'victim', expiresAt: 1_800_000_010_000, occurrenceId: 'grant-expiry-replay',
    });
    const request = {
      buyerStableId: 'victim', voucherId: 'grant-expiry-replay', voucherOccurrenceId: 'grant-expiry-replay',
      packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    };
    await callCommunity('flashcardPackGiftRedeem', request, 'auth-victim');
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_020_000);
    await expect(callCommunity('flashcardPackGiftRedeem', request, 'auth-victim')).resolves.toMatchObject({ replayed: true });
  });

  test('derives a server grant occurrence from the grant and rejects client occurrence substitution', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('flashcard_pack_gift_grants/grant-G', {
      ownerStableUid: 'victim', expiresAt: 1_800_000_010_000, occurrenceId: 'grant-G',
    });
    const base = {
      buyerStableId: 'victim', voucherId: 'grant-G', packType: 'official',
      packId: 'official_prep_in_en', studyTarget: 'en',
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
      ...base, voucherOccurrenceId: 'grant-G', packId: 'official_prep_on_en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('rejects a grant whose stored occurrence disagrees with its authoritative id', async () => {
    mockDocs.set('flashcard_pack_gift_grants/grant-id', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'different-occurrence',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'grant-id', voucherOccurrenceId: 'grant-id',
      packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'voucher_occurrence_mismatch' });
  });

  test('rejects claimedAt without the exact durable claim receipt', async () => {
    mockDocs.set('flashcard_pack_gift_grants/orphan-claimed', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000,
      occurrenceId: 'orphan-claimed', claimedAt: Date.now(),
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'orphan-claimed', voucherOccurrenceId: 'orphan-claimed',
      packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'no_pack_gift_voucher' });
  });

  test('recognizes official and community ownership under identity aliases without consuming a grant', async () => {
    seedPublishedPack();
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('flashcard_pack_gift_entitlements/old-victim__official__official_prep_in_en', {
      buyerStableId: 'old-victim', packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en',
    });
    mockDocs.set('community_pack_purchases/old-victim__pack-1', {
      buyerStableId: 'old-victim', packId: 'pack-1', status: 'completed', studyTarget: 'en',
    });
    mockDocs.set('flashcard_pack_gift_grants/owned-check', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'owned-check',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'owned-check', packType: 'official',
      packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ alreadyOwned: true, gifted: false });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'owned-check', packType: 'community', packId: 'pack-1', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ alreadyOwned: true, gifted: false });
    expect(mockDocs.get('flashcard_pack_gift_grants/owned-check')?.claimedAt).toBeUndefined();
    expect(Array.from(mockDocs.keys()).filter((path) => path.startsWith('flashcard_pack_gift_claims/'))).toHaveLength(0);
  });

  test.each([
    ['canonical', 'victim'],
    ['identity alias', 'old-victim'],
  ])('recognizes normal official ownership in %s user progress without consuming the grant', async (_label, ownerDocId) => {
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set(`users/${ownerDocId}`, {
      ...(mockDocs.get(`users/${ownerDocId}`) ?? {}),
      progress: { flashcards_owned_packs_v1: JSON.stringify(['official_prep_in_en']) },
    });
    mockDocs.set('flashcard_pack_gift_grants/normal-owned-check', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, occurrenceId: 'normal-owned-check',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'normal-owned-check', packType: 'official',
      packId: 'official_prep_in_en', studyTarget: 'en',
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
    mockDocs.set('flashcard_pack_gift_entitlements/old-victim__official__official_prep_in_en', {
      buyerStableId: 'old-victim', packId: 'official_prep_in_en', packType: 'official', studyTarget: 'en',
    });

    const result = await callCommunity<{
      vouchers: Array<{ voucherId?: string; occurrenceId?: string }>;
      entitlements: Array<{ packId: string }>;
    }>('flashcardPackGiftSyncState', { stableId: 'victim' }, 'auth-victim');
    expect(result.vouchers).toEqual(expect.arrayContaining([
      expect.objectContaining({ voucherId: 'active-alias' }),
      expect.objectContaining({ occurrenceId: 'weekly_boon_2026-07-31' }),
    ]));
    expect(result.vouchers).not.toEqual(expect.arrayContaining([expect.objectContaining({ voucherId: 'claimed-alias' })]));
    expect(result.entitlements).toEqual(expect.arrayContaining([expect.objectContaining({ packId: 'official_prep_in_en' })]));
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
        packType: 'official', studyTarget: 'en',
      });
    }

    const result = await callCommunity<{
      vouchers: { voucherId?: string }[];
      entitlements: { packId: string }[];
    }>('flashcardPackGiftSyncState', { stableId: 'victim' }, 'auth-victim');
    expect(result.vouchers).toEqual(expect.arrayContaining([expect.objectContaining({ voucherId: 'grant-109' })]));
    expect(result.entitlements).toEqual(expect.arrayContaining([expect.objectContaining({ packId: 'restored-204' })]));
  });

  test('redeems a server-issued league grant and rejects a forged grant id', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('flashcard_pack_gift_grants/league_claim-1', {
      ownerStableUid: 'victim', source: 'league_chest', occurrenceId: 'league_claim-1',
      expiresAt: 1_800_000_100_000,
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'league_claim-1',
      packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ gifted: true });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', voucherId: 'forged',
      packType: 'official', packId: 'official_prep_on_en', studyTarget: 'en',
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
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('flashcard_pack_gift_claims/old-victim__weekly_boon_2026-07-31', {
      buyerStableId: 'old-victim', packType: 'official', packId: 'official_prep_in_en', studyTarget: 'en',
    });

    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_on_en', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition', message: 'pack_gift_already_used' });
  });

  test('reserves the authoritative level-25 gift once and activates its voucher proof', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
    });

    const reserved = await callCommunity<{
      reservationId: string;
      giftId: string;
      replayed?: boolean;
    }>('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');
    expect(reserved).toMatchObject({ giftId: 'pack_voucher_48h' });
    expect(mockDocs.get(`flashcard_pack_gift_grants/level_${reserved.reservationId}`)).toBeUndefined();

    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({
      reservationId: reserved.reservationId,
      giftId: 'pack_voucher_48h',
      replayed: true,
    });

    const grant = await callCommunity<{ voucherId: string; expiresAt: number }>('levelGiftActivatePackGift', {
      stableId: 'victim', reservationId: reserved.reservationId,
    }, 'auth-victim');
    expect(grant.voucherId).toBe(`level_${reserved.reservationId}`);
    expect(mockDocs.get(`flashcard_pack_gift_grants/${grant.voucherId}`)).toMatchObject({
      ownerStableUid: 'victim', source: 'level_gift', sourceId: reserved.reservationId,
    });
  });

  test('creates a deterministic Spin-native pack grant without a legacy reservation', async () => {
    const requestId = 'spinpackrequest0001';
    mockDocs.set(`users/victim/level_spin_results/${requestId}`, {
      baseGiftId: 'pack_voucher_48h',
      premiumGiftId: 'prem_level_unlock_negotiator',
      expiresAtMs: Date.now() + 72 * 60 * 60 * 1000,
      deliveries: {
        base: { state: 'delivering', deliveryToken: 'deliverytokenbase01', deliveryLeaseUntilMs: Date.now() + 60_000, selectedGiftId: 'pack_voucher_48h' },
        premium: { state: 'delivering', deliveryToken: 'deliverytokenprem01', deliveryLeaseUntilMs: Date.now() + 60_000, selectedGiftId: 'prem_level_unlock_negotiator' },
      },
    });

    const base = await callCommunity<{ voucherId: string; allowedPackId?: string }>('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'base', deliveryToken: 'deliverytokenbase01',
    }, 'auth-victim');
    expect(base).toMatchObject({ voucherId: `level_spin_${requestId}_base` });
    expect(base.allowedPackId).toBeUndefined();
    expect(mockDocs.get(`flashcard_pack_gift_grants/${base.voucherId}`)).toMatchObject({
      ownerStableUid: 'victim',
      source: 'level_spin_v1',
      sourceId: requestId,
      occurrenceId: `level-spin:${requestId}:base`,
    });
    expect(mockDocs.has(`level_gift_reservations/${requestId}`)).toBe(false);

    await expect(callCommunity('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'base', deliveryToken: 'deliverytokenbase01',
    }, 'auth-victim')).resolves.toMatchObject({ voucherId: base.voucherId, replayed: true });

    await expect(callCommunity('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'premium', deliveryToken: 'deliverytokenprem01',
    }, 'auth-victim')).resolves.toMatchObject({
      voucherId: `level_spin_${requestId}_premium`,
      allowedPackId: 'official_negotiator_en',
    });
  });

  test('Spin-native pack grant fails closed for a forged lane lease or identity transition', async () => {
    const requestId = 'spinpackrequest0002';
    mockDocs.set(`users/victim/level_spin_results/${requestId}`, {
      baseGiftId: 'pack_voucher_48h',
      expiresAtMs: Date.now() + 72 * 60 * 60 * 1000,
      deliveries: {
        base: { state: 'delivering', deliveryToken: 'deliverytokenbase02', deliveryLeaseUntilMs: Date.now() + 60_000, selectedGiftId: 'pack_voucher_48h' },
      },
    });
    await expect(callCommunity('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'base', deliveryToken: 'forgeddeliverytoken',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });

    mockDocs.set('users/victim', { ...(mockDocs.get('users/victim') ?? {}), levelSpinMergePending: true });
    await expect(callCommunity('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'base', deliveryToken: 'deliverytokenbase02',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(mockDocs.get(`flashcard_pack_gift_grants/level_spin_${requestId}_base`)).toBeUndefined();
  });

  test('repoints an immutable Spin pack grant after the source account merges', async () => {
    const requestId = 'spinpackrequest0005';
    const deliveryToken = 'deliverytokenbase05';
    mockDocs.set(`users/victim/level_spin_results/${requestId}`, {
      baseGiftId: 'pack_voucher_48h',
      expiresAtMs: Date.now() + 72 * 60 * 60 * 1000,
      deliveries: {
        base: {
          state: 'delivering',
          deliveryToken,
          deliveryLeaseUntilMs: Date.now() + 60_000,
          selectedGiftId: 'pack_voucher_48h',
        },
      },
    });
    mockDocs.set('users/retired-loser', {
      identityHidden: true,
      canonicalStableId: 'victim',
    });
    mockDocs.set('account_identity_owner_map/retired-loser', { canonicalStableId: 'victim' });
    const voucherId = `level_spin_${requestId}_base`;
    mockDocs.set(`flashcard_pack_gift_grants/${voucherId}`, {
      ownerStableUid: 'retired-loser',
      source: 'level_spin_v1',
      sourceId: requestId,
      occurrenceId: `level-spin:${requestId}:base`,
      allowedPackId: null,
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    });

    await expect(callCommunity('levelSpinActivatePackGift', {
      stableId: 'victim', requestId, lane: 'base', deliveryToken,
    }, 'auth-victim')).resolves.toMatchObject({ voucherId, replayed: true });
    expect(mockDocs.get(`flashcard_pack_gift_grants/${voucherId}`)).toMatchObject({
      ownerStableUid: 'victim',
      source: 'level_spin_v1',
      sourceId: requestId,
    });
  });

  test('blocks new legacy reservations after sticky Spin v1 enrollment but replays grandfathered ones', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
      levelSpinServerState: { protocol: 'v1', levelBaseline: 25, balance: 1, activeRequestId: null },
    });

    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({
      code: 'failed-precondition', message: 'legacy_level_gift_cutover',
    });

    mockDocs.set('level_gift_reservations/victim_25_f2p_en', {
      ownerStableUid: 'victim', level: 25, lane: 'f2p', studyTarget: 'en', giftId: 'pack_voucher_48h',
    });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({
      reservationId: 'victim_25_f2p_en', giftId: 'pack_voucher_48h', replayed: true,
    });
  });

  test('acquires level-gift display once across devices', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
    });
    const reserved = await callCommunity<{ reservationId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');

    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'display', reservationId: reserved.reservationId,
    }, 'auth-victim')).resolves.toMatchObject({ status: 'acquired' });
    expect(mockDocs.get(`level_gift_reservations/${reserved.reservationId}`)?.displayedAt).toEqual(expect.any(Number));
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'display', reservationId: reserved.reservationId,
    }, 'auth-victim')).resolves.toMatchObject({ status: 'already_displayed' });
  });

  test('deduplicates level-gift display across different study targets', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 18 },
    });
    const en = await callCommunity<{ reservationId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 18, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');
    const fr = await callCommunity<{ reservationId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 18, lane: 'f2p', studyTarget: 'fr',
    }, 'auth-victim');
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 18, lane: 'f2p', studyTarget: 'en',
      action: 'display', reservationId: en.reservationId,
    }, 'auth-victim')).resolves.toMatchObject({ status: 'acquired' });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 18, lane: 'f2p', studyTarget: 'fr',
      action: 'display', reservationId: fr.reservationId,
    }, 'auth-victim')).resolves.toMatchObject({ status: 'already_displayed' });
  });

  test('migrates stale blocked or retired reservations to a canonical useful reward', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 17 },
      progress: { premium_plan: 'monthly', premium_rc_expiry_ms: '1800000100000' },
    });
    mockDocs.set('level_gift_reservations/victim_17_f2p_en', {
      ownerStableUid: 'victim', level: 17, lane: 'f2p', studyTarget: 'en', giftId: 'energy_full',
    });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 17, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ giftId: 'xp_250', replayed: true });
    expect(mockDocs.get('level_gift_reservations/victim_17_f2p_en')?.giftId).toBe('xp_250');

    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 18 },
    });
    mockDocs.set('level_gift_reservations/victim_18_f2p_en', {
      ownerStableUid: 'victim', level: 18, lane: 'f2p', studyTarget: 'en', giftId: 'arena_extra_5',
    });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 18, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({ giftId: 'xp_250', replayed: true });
    expect(mockDocs.get('level_gift_reservations/victim_18_f2p_en')?.giftId).toBe('xp_250');
  });

  test('leases and completes a level-gift claim exactly once', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
    });
    const reserved = await callCommunity<{ reservationId: string; giftId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');

    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: reserved.reservationId,
      giftId: reserved.giftId, claimToken: 'device-a-attempt',
    }, 'auth-victim')).resolves.toMatchObject({ status: 'acquired' });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: reserved.reservationId,
      giftId: reserved.giftId, claimToken: 'device-b-attempt',
    }, 'auth-victim')).resolves.toMatchObject({ status: 'busy' });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'complete_claim', reservationId: reserved.reservationId,
      giftId: reserved.giftId, claimToken: 'wrong-attempt',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'complete_claim', reservationId: reserved.reservationId,
      giftId: reserved.giftId, claimToken: 'device-a-attempt',
    }, 'auth-victim')).resolves.toMatchObject({ status: 'claimed' });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: reserved.reservationId,
      giftId: reserved.giftId, claimToken: 'device-b-attempt',
    }, 'auth-victim')).resolves.toMatchObject({ status: 'already_claimed' });
  });

  test('level-gift perk completion updates nested progress fields without replacing the progress map', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).toContain("'progress.chain_shield': chainShield");
    expect(source).toContain("'progress.gift_xp_multiplier': giftXpMultiplier");
    expect(source).not.toContain('progress: { chain_shield: chainShield }');
    expect(source).not.toContain('progress: { gift_xp_multiplier: giftXpMultiplier }');
  });

  test('level-gift shield completion is server-owned and replays its canonical receipt', async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 55 },
      chain_shield: JSON.stringify({ daysLeft: 1 }),
      progress: { chain_shield: JSON.stringify({ daysLeft: 2 }), unrelated: 'keep' },
    });
    const reserved = await callCommunity<{ reservationId: string; giftId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 55, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');
    expect(reserved.giftId).toBe('chain_shield_3');
    const input = {
      stableId: 'victim', level: 55, lane: 'f2p', studyTarget: 'en',
      reservationId: reserved.reservationId, giftId: reserved.giftId, claimToken: 'shield-attempt',
    };
    await expect(callCommunity('levelGiftReserve', { ...input, action: 'begin_claim' }, 'auth-victim'))
      .resolves.toMatchObject({ status: 'acquired' });
    const completed = await callCommunity<{ status: string; chainShield: string }>(
      'levelGiftReserve', { ...input, action: 'complete_claim' }, 'auth-victim',
    );
    expect(completed.status).toBe('claimed');
    expect(JSON.parse(completed.chainShield)).toMatchObject({ daysLeft: 5 });
    expect(mockDocs.get('users/victim')?.chain_shield).toBe(completed.chainShield);
    await expect(callCommunity('levelGiftReserve', { ...input, action: 'complete_claim' }, 'auth-victim'))
      .resolves.toMatchObject({ status: 'already_claimed', chainShield: completed.chainShield });
  });

  test('focus level gifts extend canonical multiplier by their full duration and replay exactly', async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: now + 60_000 }),
      progress: {
        gift_xp_multiplier: JSON.stringify({ multiplier: 1.5, expiresAt: now + 120_000 }),
        unrelated: 'keep',
      },
    });
    mockDocs.set('level_gift_reservations/victim_7_f2p_en', {
      ownerStableUid: 'victim', level: 7, lane: 'f2p', studyTarget: 'en', giftId: 'focus_10m_25',
    });
    mockDocs.set('level_gift_reservations/victim_8_f2p_en', {
      ownerStableUid: 'victim', level: 8, lane: 'f2p', studyTarget: 'en', giftId: 'focus_15m_50',
    });

    const first = {
      stableId: 'victim', level: 7, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: 'victim_7_f2p_en', giftId: 'focus_10m_25', claimToken: 'focus-ten',
    };
    await expect(callCommunity('levelGiftReserve', first, 'auth-victim'))
      .resolves.toMatchObject({ status: 'acquired' });
    const firstReceipt = await callCommunity<{ status: string; giftXpMultiplier: string }>(
      'levelGiftReserve', { ...first, action: 'complete_claim' }, 'auth-victim',
    );
    expect(JSON.parse(firstReceipt.giftXpMultiplier)).toEqual({
      multiplier: 2,
      expiresAt: now + 120_000 + 10 * 60_000,
    });
    await expect(callCommunity('levelGiftReserve', { ...first, action: 'complete_claim' }, 'auth-victim'))
      .resolves.toMatchObject({ status: 'already_claimed', giftXpMultiplier: firstReceipt.giftXpMultiplier });

    const second = {
      stableId: 'victim', level: 8, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: 'victim_8_f2p_en', giftId: 'focus_15m_50', claimToken: 'focus-fifteen',
    };
    await expect(callCommunity('levelGiftReserve', second, 'auth-victim'))
      .resolves.toMatchObject({ status: 'acquired' });
    const secondReceipt = await callCommunity<{ status: string; giftXpMultiplier: string }>(
      'levelGiftReserve', { ...second, action: 'complete_claim' }, 'auth-victim',
    );
    expect(JSON.parse(secondReceipt.giftXpMultiplier)).toEqual({
      multiplier: 2,
      expiresAt: now + 120_000 + 25 * 60_000,
    });
    expect(mockDocs.get('users/victim')?.gift_xp_multiplier).toBe(secondReceipt.giftXpMultiplier);
    expect((mockDocs.get('users/victim')?.progress as Record<string, unknown>).gift_xp_multiplier)
      .toBe(secondReceipt.giftXpMultiplier);
    expect((mockDocs.get('users/victim')?.progress as Record<string, unknown>).unrelated).toBe('keep');
  });

  test('club level gift increments the canonical server count and replays its exact receipt', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      club_gift_free_boost_v1: '1',
      progress: { club_gift_free_boost_v1: '2', unrelated: 'keep' },
    });
    mockDocs.set('level_gift_reservations/victim_9_f2p_en', {
      ownerStableUid: 'victim', level: 9, lane: 'f2p', studyTarget: 'en', giftId: 'club_boost_free',
    });
    const input = {
      stableId: 'victim', level: 9, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: 'victim_9_f2p_en', giftId: 'club_boost_free', claimToken: 'club-one',
    };
    await expect(callCommunity('levelGiftReserve', input, 'auth-victim'))
      .resolves.toMatchObject({ status: 'acquired' });
    const completed = await callCommunity<{ status: string; clubGiftFreeBoostCount: number }>(
      'levelGiftReserve', { ...input, action: 'complete_claim' }, 'auth-victim',
    );
    expect(completed).toMatchObject({ status: 'claimed', clubGiftFreeBoostCount: 3 });
    expect(mockDocs.get('users/victim')).toMatchObject({
      club_gift_free_boost_v1: '3',
      progress: { club_gift_free_boost_v1: '3', unrelated: 'keep' },
    });
    await expect(callCommunity('levelGiftReserve', { ...input, action: 'complete_claim' }, 'auth-victim'))
      .resolves.toMatchObject({ status: 'already_claimed', clubGiftFreeBoostCount: 3 });
  });

  test('choice milestone rejects a selected gift outside its three concrete choices', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 30 },
    });
    const reserved = await callCommunity<{ reservationId: string }>('levelGiftReserve', {
      stableId: 'victim', level: 30, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 30, lane: 'f2p', studyTarget: 'en',
      action: 'begin_claim', reservationId: reserved.reservationId,
      giftId: 'chain_shield_3', claimToken: 'forged-choice',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('rejects level gift reservation above server progress and forged activation', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 24 },
    });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callCommunity('levelGiftActivatePackGift', {
      stableId: 'victim', reservationId: 'victim_25_f2p_en',
    }, 'auth-attacker')).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('requires server premium state for the premium level-gift lane', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
      progress: {},
    });
    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'premium', studyTarget: 'en',
    }, 'auth-victim')).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('accepts every canonical Plus source for the premium level-gift lane', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const premiumSources = [
      { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: '1800000100000' },
      { vip_active: 'true', vip_until: '1800000100000' },
      { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0' },
      { premium_plan: 'lifetime', premium_expiry: '0' },
      { loyalty_gift_until_ms: '1800000100000' },
    ];

    for (const [index, progress] of premiumSources.entries()) {
      mockDocs.set('users/victim', {
        firebaseAuthUid: 'auth-victim',
        shards: 200,
        progressServerState: { level: 100 },
        progress,
      });
      await expect(callCommunity('levelGiftReserve', {
        stableId: 'victim', level: 21 + index, lane: 'premium', studyTarget: 'en',
      }, 'auth-victim')).resolves.toEqual(expect.objectContaining({ reservationId: expect.any(String) }));
    }
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

  test('replays an existing premium level reservation after Plus access expires', async () => {
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
      progress: {},
    });
    mockDocs.set('level_gift_reservations/victim_25_premium_en', {
      ownerStableUid: 'victim', level: 25, lane: 'premium', studyTarget: 'en', giftId: 'prem_shards_10',
    });

    await expect(callCommunity('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'premium', studyTarget: 'en',
    }, 'auth-victim')).resolves.toMatchObject({
      reservationId: 'victim_25_premium_en', giftId: 'prem_shards_10', replayed: true,
    });
  });

  test('keeps premium authorization reads inside each gift transaction before writes', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    const levelStart = source.indexOf('export const levelGiftReserve');
    const levelEnd = source.indexOf('export const levelGiftActivatePackGift', levelStart);
    const levelBody = source.slice(levelStart, levelEnd);
    const broadcastStart = source.indexOf('export const flashcardPackGiftGrantGlobalBroadcast');
    const broadcastEnd = source.indexOf('export const flashcardPackGiftSyncState', broadcastStart);
    const broadcastBody = source.slice(broadcastStart, broadcastEnd);

    const levelResolver = levelBody.indexOf('resolvePremiumAccess(db, stableUid, now, authUid, tx)');
    expect(levelResolver).toBeGreaterThan(levelBody.indexOf('if (existingReservation)'));
    expect(levelResolver).toBeLessThan(levelBody.indexOf('tx.set('));

    const transactionStart = broadcastBody.indexOf('runTransaction(async (tx)');
    const broadcastResolver = broadcastBody.indexOf('resolvePremiumAccess(db, stableUid, now, authUid, tx)');
    expect(broadcastResolver).toBeGreaterThan(transactionStart);
    expect(broadcastResolver).toBeGreaterThan(broadcastBody.indexOf('broadcastSnap.data()'));
    expect(broadcastResolver).toBeGreaterThan(broadcastBody.indexOf('if (grantSnap.exists)'));
    expect(broadcastResolver).toBeLessThan(broadcastBody.indexOf('tx.set('));
    expect(broadcastBody.slice(0, transactionStart)).not.toContain('resolvePremiumAccess(');
  });

  test('keeps the retired Arena reward outside every server level-gift catalog', () => {
    const source = fs.readFileSync(path.join(__dirname, 'community_packs.ts'), 'utf8');
    expect(source).not.toContain('arena_extra_5');
  });

  test('replays a pre-merge level reservation through the canonical identity', async () => {
    mockDocs.set('users/old-victim', { identityHidden: true, canonicalStableId: 'victim' });
    mockDocs.set('users/victim', {
      ...(mockDocs.get('users/victim') ?? {}),
      progressServerState: { level: 25 },
    });
    mockDocs.set('level_gift_reservations/old-victim_25_f2p_en', {
      ownerStableUid: 'old-victim', level: 25, lane: 'f2p', studyTarget: 'en', giftId: 'pack_voucher_48h',
    });

    const replay = await callCommunity<{ reservationId: string; giftId: string; replayed: boolean }>('levelGiftReserve', {
      stableId: 'victim', level: 25, lane: 'f2p', studyTarget: 'en',
    }, 'auth-victim');
    expect(replay).toMatchObject({
      reservationId: 'old-victim_25_f2p_en', giftId: 'pack_voucher_48h', replayed: true,
    });
    await expect(callCommunity('levelGiftActivatePackGift', {
      stableId: 'victim', reservationId: replay.reservationId,
    }, 'auth-victim')).resolves.toMatchObject({ voucherId: 'level_old-victim_25_f2p_en' });
  });

  test('an exact-pack level grant cannot redeem a different official pack', async () => {
    mockDocs.set('flashcard_pack_gift_grants/exact-pack-grant', {
      ownerStableUid: 'victim', expiresAt: Date.now() + 60_000, allowedPackId: 'official_prep_in_en',
    });
    await expect(callCommunity('flashcardPackGiftRedeem', {
      buyerStableId: 'victim', packType: 'official', packId: 'official_prep_on_en',
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
    expect(mockDocs.get('community_packs/sub-1')).toMatchObject({ listingStatus: 'published', cardCount: 10, priceShards: 10 });
    expect((mockDocs.get('community_packs/sub-1')?.cards as DocData[])[0]).toMatchObject({ richSchemaVersion: 1, exampleTarget: 'Example target', exampleSource: 'Пример', note: 'Usage note', sourceReferences: ['lesson:1:p1', 'exemplar:e1'] });
    const registryAfterPublish = [...mockDocs.entries()].filter(([key]) => key.startsWith('content_factory_flashcard_semantic_keys/'));
    expect(registryAfterPublish).toHaveLength(20);
    expect(registryAfterPublish.map(([, value]) => value.partitionKey)).toEqual(expect.arrayContaining(['community_flashcards:en:ru', 'community_flashcards:en:es']));

    await mod.communityAdminModeratePack({ auth: { token: { admin: true } }, data: { packId: 'sub-1', action: 'remove' } });
    expect(mockDocs.get('community_packs/sub-1')).toMatchObject({ listingStatus: 'admin_removed', priceShards: 10 });
    expect([...mockDocs.keys()].filter((key) => key.startsWith('content_factory_flashcard_semantic_keys/'))).toHaveLength(0);
  });
});
