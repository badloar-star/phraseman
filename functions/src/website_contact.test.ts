export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<{ exists: boolean; data: () => DocData | undefined }>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  update: (data: DocData) => Promise<void>;
};

const mockDocs = new Map<string, DocData>();
const mockInboxDocs: DocData[] = [];
let autoId = 0;

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => {
      const data = mockDocs.get(path);
      return { exists: data !== undefined, data: () => data };
    },
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      mockDocs.set(path, opts?.merge ? { ...(mockDocs.get(path) ?? {}), ...data } : { ...data });
    },
    update: async (data: DocData) => {
      mockDocs.set(path, { ...(mockDocs.get(path) ?? {}), ...data });
    },
  };
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id: string) => refFor(`${name}/${id}`),
      add: async (data: DocData) => {
        const ref = refFor(`${name}/auto-${++autoId}`);
        mockDocs.set(ref.path, { ...data });
        if (name === 'website_contact_inbox') mockInboxDocs.push(data);
        return ref;
      },
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            mockDocs.set(ref.path, opts?.merge ? { ...(mockDocs.get(ref.path) ?? {}), ...data } : { ...data });
          });
        },
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-functions/logger', () => ({
  warn: jest.fn(),
}));

jest.mock('firebase-functions/params', () => ({
  defineString: () => ({ value: () => '' }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => fakeDb()),
  FieldValue: {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    arrayUnion: (...values: unknown[]) => ({ __op: 'arrayUnion', values }),
    increment: (value: number) => ({ __op: 'increment', value }),
  },
}));

const validBody = {
  email: 'alice@example.com',
  name: 'Alice',
  message: 'Hello, I need help with my account.',
  topic: 'support',
  pageUrl: 'https://knowlyapps.com/support',
};

function makeReqRes(body = validBody, headers: Record<string, string> = {}) {
  const req = {
    method: 'POST',
    body,
    headers: {
      origin: 'https://knowlyapps.com',
      'user-agent': 'jest',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
  };
  const res = {
    set: jest.fn(),
    status: jest.fn(function status(this: unknown) {
      return this;
    }),
    json: jest.fn(),
    send: jest.fn(),
  };
  return { req, res };
}

async function postContact(headers?: Record<string, string>) {
  const mod = require('./website_contact');
  const { req, res } = makeReqRes(validBody, headers);
  await mod.submitWebsiteContact(req, res);
  return res;
}

beforeEach(() => {
  jest.resetModules();
  mockDocs.clear();
  mockInboxDocs.length = 0;
  autoId = 0;
});

describe('submitWebsiteContact rate limit', () => {
  test('projects a support-form address as contact-only, never bulk eligible', async () => {
    await postContact();
    const contact = Array.from(mockDocs.entries()).find(([path]) => path.startsWith('email_contacts/'))?.[1];
    expect(contact).toMatchObject({
      email: 'alice@example.com',
      bulkEligibility: 'ineligible',
      eligibilitySource: 'support_contact_only',
    });
  });

  test('rejects repeated submissions from the same IP before writing inbox docs', async () => {
    await postContact();
    await postContact();
    await postContact();
    const blocked = await postContact();

    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(blocked.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: 'rate_limited',
    }));
    expect(mockInboxDocs).toHaveLength(3);
  });
});
