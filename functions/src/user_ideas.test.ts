export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  collection: (name: string) => FakeCollection;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
};

type FakeCollection = {
  doc: (id?: string) => FakeRef;
  where: (field: string, op: string, value: unknown) => FakeQuery;
};

type FakeQuery = {
  limit: (count: number) => { get: () => Promise<FakeQuerySnap> };
};

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

type FakeQuerySnap = {
  empty: boolean;
  docs: FakeSnap[];
};

const docs = new Map<string, DocData>();
let autoId = 0;

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

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    collection: (name: string) => collectionFor(`${path}/${name}`),
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return {
    id: path.split('/').pop() || path,
    exists: data !== undefined,
    data: () => data,
  };
}

function collectionDocs(path: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${path}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}

function collectionFor(name: string): FakeCollection {
  return {
    doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
    where: (field: string, op: string, value: unknown) => {
      if (op !== '==') throw new Error(`unsupported op ${op}`);
      return {
        limit: (count: number) => ({
          get: async () => {
            const matches = collectionDocs(name)
              .filter((doc) => doc.data[field] === value)
              .slice(0, count)
              .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
            return { empty: matches.length === 0, docs: matches };
          },
        }),
      };
    },
  };
}

function fakeDb() {
  return {
    collection: (name: string) => collectionFor(name),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
      update: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
        },
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (docs.has(ref.path)) throw new Error('already exists');
            docs.set(ref.path, { ...data });
          });
        },
        update: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            docs.set(ref.path, deepMerge(docs.get(ref.path) ?? {}, data));
          });
        },
      });
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

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-20T12:00:00.000Z');

function ideaDocs(): Array<{ id: string; data: DocData }> {
  return collectionDocs('user_ideas').map((d) => ({ id: d.id, data: d.data }));
}

function inboxDocs(uid: string): DocData[] {
  return collectionDocs(`users/${uid}/idea_inbox`).map((d) => d.data);
}

async function callSubmit(data: DocData, authUid = 'auth-user') {
  const { submitUserIdea } = require('./user_ideas');
  return submitUserIdea({ auth: { uid: authUid }, data });
}

async function callDecide(data: DocData, admin = true) {
  const { adminDecideUserIdea } = require('./user_ideas');
  return adminDecideUserIdea({ auth: { uid: 'admin-1', token: admin ? { admin: true, email: 'a@b.c' } : {} }, data });
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers().setSystemTime(NOW);
  docs.clear();
  autoId = 0;
  docs.set('users/stable-user', { firebaseAuthUid: 'auth-user' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('submitUserIdea', () => {
  test('writes a pending idea bound to the authenticated stable uid', async () => {
    const result = await callSubmit({
      payload: {
        uid: 'spoofed',
        title: 'Тёмная тема',
        description: 'Добавить полностью тёмную тему оформления приложения',
        benefit: 'Удобнее учиться вечером',
        category: 'feature',
        lang: 'ru',
      },
    });
    expect(result).toMatchObject({ ok: true });
    const ideas = ideaDocs();
    expect(ideas).toHaveLength(1);
    expect(ideas[0].data).toMatchObject({
      uid: 'stable-user',
      authUid: 'auth-user',
      title: 'Тёмная тема',
      category: 'feature',
      status: 'pending',
    });
  });

  test('rejects too-short title/description', async () => {
    await expect(
      callSubmit({ payload: { title: 'ok', description: 'short', category: 'feature' } }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(ideaDocs()).toHaveLength(0);
  });

  test('rate-limits a second idea on the same day', async () => {
    const payload = {
      title: 'Идея один',
      description: 'Достаточно длинное описание идеи номер один',
      category: 'improvement',
    };
    await callSubmit({ payload });
    await expect(
      callSubmit({ payload: { ...payload, title: 'Идея два' } }),
    ).rejects.toMatchObject({ code: 'resource-exhausted', message: 'rate_limited' });
    expect(ideaDocs()).toHaveLength(1);
  });
});

describe('adminDecideUserIdea', () => {
  async function seedIdea(): Promise<string> {
    await callSubmit({
      payload: { title: 'Идея', description: 'Описание идеи достаточно длинное', category: 'feature' },
    });
    return ideaDocs()[0].id;
  }

  test('approve grants exactly one year of premium and writes a congrats inbox modal', async () => {
    const ideaId = await seedIdea();
    const res = await callDecide({ ideaId, decision: 'approve' });
    expect(res).toMatchObject({ ok: true });

    const user = docs.get('users/stable-user') as DocData;
    const progress = user.progress as DocData;
    expect(progress).toMatchObject({ vip_active: 'true', vip_plan: 'idea_reward', vip_admin_override: 'true' });
    expect(Number(progress.vip_until)).toBe(NOW.getTime() + YEAR_MS);

    const idea = ideaDocs()[0].data;
    expect(idea).toMatchObject({ status: 'approved', premiumGranted: true });

    const inbox = inboxDocs('stable-user');
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ type: 'idea_decision', decision: 'approve', seen: false });
    expect(String(inbox[0].titleRu)).toContain('принята');
    expect(String(inbox[0].titleEs)).toContain('idea');
    expect(String(inbox[0].messageEs)).toContain('Premium');
  });

  test('reject writes an explanation modal with admin custom text and grants no premium', async () => {
    const ideaId = await seedIdea();
    await callDecide({
      ideaId,
      decision: 'reject',
      messageRu: 'Слишком похоже на существующее',
      messageUk: 'Надто схоже',
      messageEs: 'Se parece demasiado a algo existente',
    });

    const user = docs.get('users/stable-user') as DocData;
    expect(user.progress).toBeUndefined();

    expect(ideaDocs()[0].data).toMatchObject({ status: 'rejected', premiumGranted: false });
    const inbox = inboxDocs('stable-user');
    expect(inbox[0]).toMatchObject({
      type: 'idea_decision',
      decision: 'reject',
      messageRu: 'Слишком похоже на существующее',
      messageEs: 'Se parece demasiado a algo existente',
    });
  });

  test('refuses a non-admin caller', async () => {
    const ideaId = await seedIdea();
    await expect(callDecide({ ideaId, decision: 'approve' }, false)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(ideaDocs()[0].data).toMatchObject({ status: 'pending' });
  });

  test('refuses to decide an already-decided idea twice', async () => {
    const ideaId = await seedIdea();
    await callDecide({ ideaId, decision: 'approve' });
    await expect(callDecide({ ideaId, decision: 'reject' })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
