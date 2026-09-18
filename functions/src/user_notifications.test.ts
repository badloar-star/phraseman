export {};

/**
 * Покрывает notifyOnPackCommentCreated (владелец 2026-09-17: «юзер который
 * опубликовал раздел должен видеть на главной индикатор в колокольчике когда
 * ему написали новый коммент»). Мокает Firestore-триггер по образцу
 * support_inbox_triage.test.ts: onDocumentCreated ловится моком, хендлер
 * вызывается напрямую с фиктивным событием.
 */

type DocData = Record<string, unknown>;

const store = new Map<string, DocData>();

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_options: Record<string, unknown>, handler: (event: unknown) => Promise<void>) => handler,
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_options: Record<string, unknown>, handler: unknown) => handler,
}));

jest.mock('./cron_heartbeat', () => ({
  withCronHeartbeat: (_name: string, fn: unknown) => fn,
}));

class FakeAlreadyExistsError extends Error {
  code = 6;
  constructor() { super('ALREADY_EXISTS'); }
}

function refFor(path: string): DocData & Record<string, unknown> {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => ({ id: path.split('/').pop() || path, exists: store.has(path), data: () => store.get(path) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? (store.get(path) ?? {}) : {};
      store.set(path, { ...prev, ...data });
    },
    // зачем: notifyOnPackCommentCreated использует create() (не set()) для
    // идempotентности при повторной доставке события — см. user_notifications.ts.
    create: async (data: DocData) => {
      if (store.has(path)) throw new FakeAlreadyExistsError();
      store.set(path, { ...data });
    },
    delete: async () => { store.delete(path); },
    // зачем: userNotificationRef делает db.collection('users').doc(uid).collection('notifications')
    // — вложенная подколлекция на ref, а не только на db, как в support_inbox_triage.test.ts.
    collection: (name: string) => collectionFor(`${path}/${name}`),
  };
}

function collectionFor(path: string) {
  return {
    doc: (id?: string) => refFor(`${path}/${id ?? `auto-${Math.random().toString(36).slice(2)}`}`),
  };
}

function fakeDb() {
  return {
    collection: (name: string) => collectionFor(name),
  };
}

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => fakeDb()),
}));

function docSnapshotEvent(params: Record<string, string>, data: DocData) {
  return {
    params,
    data: { data: () => data },
  };
}

beforeEach(() => {
  jest.resetModules();
  store.clear();
});

describe('notifyOnPackCommentCreated', () => {
  function seedPack(packId: string, authorStableId: string, titleRu = 'Airport phrases') {
    store.set(`community_packs/${packId}`, { authorStableId, titleRu, listingStatus: 'published' });
  }

  test('writes a pack_comment notification to the pack author, not the commenter', async () => {
    seedPack('pack-1', 'author-9');
    const { notifyOnPackCommentCreated } = require('./user_notifications');

    await notifyOnPackCommentCreated(docSnapshotEvent(
      { packId: 'pack-1', commentId: 'comment-1' },
      { authorId: 'commenter-5', authorName: 'Kate', text: 'Loved this pack, thanks!' },
    ));

    const notification = store.get('users/author-9/notifications/pack_comment_comment-1');
    expect(notification).toBeDefined();
    expect(notification).toMatchObject({
      type: 'pack_comment',
      fromUid: 'commenter-5',
      fromName: 'Kate',
      text: 'Loved this pack, thanks!',
      nav: { kind: 'pack_comment', packId: 'pack-1', commentId: 'comment-1' },
      read: false,
    });
    // Уходит ТОЛЬКО автору набора — уведомления для комментатора не создаётся.
    expect(store.get('users/commenter-5/notifications/pack_comment_comment-1')).toBeUndefined();
  });

  test('does not notify the author when they comment on their own pack', async () => {
    seedPack('pack-1', 'author-9');
    const { notifyOnPackCommentCreated } = require('./user_notifications');

    await notifyOnPackCommentCreated(docSnapshotEvent(
      { packId: 'pack-1', commentId: 'comment-2' },
      { authorId: 'author-9', authorName: 'Author', text: 'Note to self' },
    ));

    expect(store.get('users/author-9/notifications/pack_comment_comment-2')).toBeUndefined();
  });

  test('is a no-op when the pack no longer exists', async () => {
    const { notifyOnPackCommentCreated } = require('./user_notifications');

    await notifyOnPackCommentCreated(docSnapshotEvent(
      { packId: 'missing-pack', commentId: 'comment-3' },
      { authorId: 'commenter-5', authorName: 'Kate', text: 'Hello' },
    ));

    expect([...store.keys()].some((key) => key.includes('pack_comment_comment-3'))).toBe(false);
  });

  test('is a no-op for malformed events (missing ids or empty author)', async () => {
    seedPack('pack-1', 'author-9');
    const { notifyOnPackCommentCreated } = require('./user_notifications');

    await notifyOnPackCommentCreated(docSnapshotEvent(
      { packId: '', commentId: 'comment-4' },
      { authorId: 'commenter-5', authorName: 'Kate', text: 'Hello' },
    ));
    await notifyOnPackCommentCreated(docSnapshotEvent(
      { packId: 'pack-1', commentId: 'comment-5' },
      { authorId: '', authorName: 'Kate', text: 'Hello' },
    ));

    expect(store.get('users/author-9/notifications/pack_comment_comment-4')).toBeUndefined();
    expect(store.get('users/author-9/notifications/pack_comment_comment-5')).toBeUndefined();
  });

  // зачем (аудит 2026-09-17): Cloud Functions v2 доставляет onDocumentCreated
  // at-least-once. Без create()-идемпотентности повторная доставка того же
  // события перезаписывала бы уже прочитанное уведомление обратно в непрочитанное.
  test('a redelivered trigger event does not reset an already-read notification', async () => {
    seedPack('pack-1', 'author-9');
    const { notifyOnPackCommentCreated } = require('./user_notifications');
    const event = docSnapshotEvent(
      { packId: 'pack-1', commentId: 'comment-6' },
      { authorId: 'commenter-5', authorName: 'Kate', text: 'Loved this pack, thanks!' },
    );

    await notifyOnPackCommentCreated(event);
    // Владелец открыл колокольчик и прочитал уведомление между доставками.
    const key = 'users/author-9/notifications/pack_comment_comment-6';
    store.set(key, { ...(store.get(key) as DocData), read: true });

    await notifyOnPackCommentCreated(event);

    expect(store.get(key)).toMatchObject({ read: true });
  });
});
