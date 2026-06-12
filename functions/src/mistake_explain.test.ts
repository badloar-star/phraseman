export {};

type DocData = Record<string, unknown>;
type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
};
type FakeSnap = { id: string; exists: boolean; data: () => DocData | undefined };

const docs = new Map<string, DocData>();
let autoId = 0;

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && existing && typeof existing === 'object' && !Array.isArray(existing)) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function refFor(path: string): FakeRef {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}

function collectionDocs(path: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${path}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          writes.push(() => docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data }));
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

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async (_db: unknown, authUid: string) => `stable-${authUid}`),
}));

jest.mock('./premium_status', () => ({
  resolvePremiumAccess: jest.fn(async () => false),
}));

jest.mock('./openai_dialog_model_config', () => ({
  resolveConfiguredDialogModel: jest.fn(async () => 'gpt-4.1-nano'),
}));

import { explainMistake as explainMistakeRaw } from './mistake_explain';

type CallableRequest = { auth?: { uid: string }; data: DocData };
type ExplainMistakeResponse = { ok: true; text: string; remainingQuota: number; model: string };
const explainMistake = explainMistakeRaw as unknown as (request: CallableRequest) => Promise<ExplainMistakeResponse>;

const validPayload = {
  lessonId: 18,
  phraseId: 'lesson18_phrase_31',
  studyTarget: 'en',
  interfaceLang: 'ru',
  prompt: 'Say: I have a reservation.',
  userAnswer: 'I has a reservation',
  targetAnswer: 'I have a reservation.',
  phraseMeaning: 'У меня есть бронь.',
  selectedWrongWord: 'has',
  expectedWord: 'have',
};

function billingDocs(): DocData[] {
  return collectionDocs('mistake_explain_billing').map((doc) => doc.data);
}

function mockOkProvider(text: string) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
    }),
  });
}

async function callExplain(data: DocData, authUid: string | null = 'auth-1') {
  return explainMistake({ auth: authUid ? { uid: authUid } : undefined, data });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
  docs.clear();
  autoId = 0;
  global.fetch = jest.fn() as typeof fetch;
  mockOkProvider('Use "have" after "I": say "I have a reservation."');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('explainMistake', () => {
  it('rejects unauthenticated callers before the provider call', async () => {
    await expect(callExplain(validPayload, null)).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads before the provider call', async () => {
    await expect(callExplain({ ...validPayload, targetAnswer: '' })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('enforces the free daily limit server-side before the paid provider call', async () => {
    await callExplain(validPayload);
    await callExplain({ ...validPayload, userAnswer: 'I has table' });
    await callExplain({ ...validPayload, userAnswer: 'I has booking' });

    await expect(callExplain({ ...validPayload, userAnswer: 'I has seat' })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'mistake_explain_free_limit',
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(billingDocs()).toHaveLength(3);
  });

  it('builds a prompt about the exact mismatch between user answer and target answer', async () => {
    const res = await callExplain(validPayload);

    expect(res).toMatchObject({ ok: true, remainingQuota: 2, model: 'gpt-4.1-nano' });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    const prompt = JSON.stringify(body.messages);

    expect(prompt).toContain('I has a reservation');
    expect(prompt).toContain('I have a reservation.');
    expect(prompt).toContain('selected wrong part: has');
    expect(prompt).toContain('expected part: have');
    expect(prompt).toContain('Do not explain a different error');
    expect(billingDocs()[0]).toMatchObject({
      uid: 'stable-auth-1',
      authUid: 'auth-1',
      lessonId: 18,
      phraseId: 'lesson18_phrase_31',
      promptTokens: 44,
      completionTokens: 22,
    });
  });
});
