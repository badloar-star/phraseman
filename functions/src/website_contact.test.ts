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
  defineSecret: () => ({ value: () => '' }),
  defineString: () => ({ value: () => '' }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => fakeDb()),
  FieldValue: {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
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

describe('video promo («Два года Plus за видео», владелец 22.10)', () => {
  const promoBody = {
    topic: 'video_promo',
    postUrl: 'https://www.instagram.com/reel/DeUagkhgoIp/',
    username: '@mila_k',
    disclosed: true,
    email: '',
    pageUrl: 'https://knowlyapps.com/contact/?topic=video-promo',
  };

  async function postPromo(body: Record<string, unknown>) {
    const mod = require('./website_contact');
    const { req, res } = makeReqRes(body as never);
    await mod.submitWebsiteContact(req, res);
    return res;
  }

  test.each([
    ['https://www.instagram.com/reel/abc/', 'instagram'],
    ['https://vm.tiktok.com/ZM123/', 'tiktok'],
    ['https://www.tiktok.com/@mila/video/123', 'tiktok'],
    ['https://m.facebook.com/reel/123', 'facebook'],
    ['https://fb.watch/abc/', 'facebook'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.youtube.com/shorts/abc', 'youtube'],
    ['https://www.threads.net/@mila/post/abc', 'threads'],
    ['https://www.threads.com/@mila/post/abc', 'threads'],
  ])('detects the network of %s', (url, network) => {
    const { videoPromoNetwork } = require('./website_contact');
    expect(videoPromoNetwork(url)).toBe(network);
  });

  test.each([
    'http://www.instagram.com/reel/abc/',
    'https://instagram.com/',
    'https://evilinstagram.com/reel/abc',
    'https://instagram.com.evil.io/reel/abc',
    'https://vk.com/video123',
    'https://user:pass@www.youtube.com/watch?v=abc',
    'not a url',
  ])('rejects %s', (url) => {
    const { videoPromoNetwork } = require('./website_contact');
    expect(videoPromoNetwork(url)).toBeNull();
  });

  test('stores the entry in the support inbox without an email, network detected by the server', async () => {
    const res = await postPromo(promoBody);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockInboxDocs).toHaveLength(1);
    expect(mockInboxDocs[0]).toMatchObject({
      topic: 'video_promo',
      email: null,
      promo: { postUrl: promoBody.postUrl, network: 'instagram', username: 'mila_k', disclosed: true },
    });
    expect(String(mockInboxDocs[0].message)).toContain('mila_k');
  });

  test.each([
    ['a non-network link', { postUrl: 'https://example.com/v/1' }, 'invalid_post_url'],
    ['no username', { username: ' ' }, 'invalid_username'],
    ['no disclosure', { disclosed: false }, 'disclosure_required'],
    ['a bad optional email', { email: 'not-an-email' }, 'invalid_email'],
  ])('rejects %s before writing', async (_label, patch, error) => {
    const res = await postPromo({ ...promoBody, ...patch });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false, error }));
    expect(mockInboxDocs).toHaveLength(0);
  });

  test('keeps the honeypot and the same rate limit as regular support', async () => {
    const trapped = await postPromo({ ...promoBody, company: 'bot' });
    expect(trapped.status).toHaveBeenCalledWith(200);
    expect(mockInboxDocs).toHaveLength(0);
    await postPromo(promoBody); await postPromo(promoBody); await postPromo(promoBody);
    const blocked = await postPromo(promoBody);
    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(mockInboxDocs).toHaveLength(3);
  });
});
