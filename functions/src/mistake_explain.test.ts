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

jest.mock('./openai_dialog_model_config', () => ({
  // The mistake breakdown runs on the strong tier (gpt-4.1) so the ONE governing distinction
  // (e.g. "that" vs "it") is taught with a minimal pair, not watered down to generic filler.
  resolveConfiguredDialogModel: jest.fn(async () => 'gpt-4.1'),
}));

import { explainMistake as explainMistakeRaw } from './mistake_explain';
import {
  mistakeHashFor,
  MISTAKE_COLLECTION,
  MISTAKE_SCHEMA_VERSION,
} from './explain/mistake_explain_cache';
import { resolvePromptLangKey } from './explain/explain_prompts';

type CallableRequest = { auth?: { uid: string }; data: DocData };
type ExplainMistakeResponse = { ok: true; text: string; remainingQuota: number; model: string; fromCache: boolean; variant: string };
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
  diffPairs: [{ expected: 'have', picked: 'has' }],
};

function billingDocs(): DocData[] {
  return collectionDocs('mistake_explain_billing').map((doc) => doc.data);
}

function cacheDocs(): DocData[] {
  return collectionDocs('mistake_explanations').map((doc) => doc.data);
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
  mockOkProvider('После "I" здесь нужно "have": скажи "I have a reservation."');
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

  it('is free for everyone — no daily cap blocks repeated breakdowns', async () => {
    await callExplain(validPayload);
    await callExplain({ ...validPayload, userAnswer: 'I has table' });
    await callExplain({ ...validPayload, userAnswer: 'I has booking' });
    await callExplain({ ...validPayload, userAnswer: 'I has seat' });

    // Four DISTINCT mistakes → four generations, none blocked.
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(billingDocs()).toHaveLength(4);
  });

  it('serves the SAME mistake from the warm cache on the second call ($0, no provider hit)', async () => {
    const first = await callExplain(validPayload);
    expect(first.fromCache).toBe(false);
    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(true);

    const second = await callExplain(validPayload, 'auth-2');
    expect(second.fromCache).toBe(true);
    expect(second.text).toBe(first.text);
    // Still only ONE provider call total — the cache absorbed the second reader.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects wrong-language fresh text before any ready cache write', async () => {
    mockOkProvider('Today you keep a good small practice step with your phrases.');

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_wrong_language',
    });

    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(false);
    expect(cacheDocs().some((d) => d.status === 'rejected')).toBe(true);
    expect(billingDocs()).toHaveLength(0);
  });

  it('builds a prompt that targets the WHOLE error and lists every wrong→right swap', async () => {
    const res = await callExplain(validPayload);

    expect(res).toMatchObject({ ok: true, model: 'gpt-4.1', variant: 'full', fromCache: false });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    const prompt = JSON.stringify(body.messages);

    expect(prompt).toContain('I has a reservation');
    expect(prompt).toContain('I have a reservation.');
    // The wrong→right swap list is embedded (quotes are JSON-escaped inside the body string).
    expect(prompt).toContain('has');
    expect(prompt).toContain('have');
    expect(prompt).toContain('→');
    expect(prompt).toContain('EVERY word that differs');
    expect(billingDocs()[0]).toMatchObject({
      uid: 'stable-auth-1',
      authUid: 'auth-1',
      lessonId: 18,
      phraseId: 'lesson18_phrase_31',
      variant: 'full',
      promptTokens: 44,
      completionTokens: 22,
    });
  });

  it('generates a separate ELI5 text on the eli5 variant and caches it onto the ready doc', async () => {
    await callExplain(validPayload); // warm the full breakdown first
    mockOkProvider('Почти: после "I" скажи "have", не "has". Это слово-друг для "I". Скажи "I have a reservation."');

    const eli5 = await callExplain({ ...validPayload, variant: 'eli5' });
    expect(eli5.variant).toBe('eli5');
    expect(eli5.text).toContain('слово-друг');

    // Second eli5 read for the same mistake comes from cache ($0).
    const eli5Again = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-3');
    expect(eli5Again.fromCache).toBe(true);
    expect(eli5Again.text).toBe(eli5.text);
  });

  it('persists ELI5 even when it is requested BEFORE the full breakdown (no money leak on repeat)', async () => {
    mockOkProvider('Маленькая правка: скажи "have", не "has". Для "I" подходит "have".');

    // ELI5 first — no full breakdown cached yet.
    const first = await callExplain({ ...validPayload, variant: 'eli5' });
    expect(first.variant).toBe('eli5');
    expect(first.fromCache).toBe(false);

    // The doc must now be ready WITH an eli5, so a later identical request is free.
    expect(cacheDocs().some((d) => d.status === 'ready' && d.eli5)).toBe(true);

    const fetchCallsAfterFirst = (global.fetch as jest.Mock).mock.calls.length;
    const second = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-9');
    expect(second.fromCache).toBe(true);
    expect(second.text).toBe(first.text);
    // No new provider call for the cached repeat.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsAfterFirst);
  });

  // Regression (audit 2026-06-22): a breakdown the user is SHOWN must always be cached, even when
  // this request lost the generation lock — else the phrase reads as «нет в кэше» in admin while
  // the user already saw a real explanation. Persistence must not be gated on winning the lock.
  function hashFor(payload: typeof validPayload): string {
    return mistakeHashFor(payload.targetAnswer, payload.userAnswer, resolvePromptLangKey(payload.interfaceLang));
  }

  // Seed a FRESH pending doc written by "another request", so claimMistakePendingLock returns false.
  function seedFreshPendingLock(payload: typeof validPayload) {
    docs.set(`${MISTAKE_COLLECTION}/${hashFor(payload)}`, {
      status: 'pending',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      reason: null,
      createdAtMs: Date.now(), // fresh (now) → not stale → our request loses the lock
      updatedAtMs: Date.now(),
    });
  }

  it('FULL: caches the breakdown even when the generation lock is lost (no «нет в кэше» for shown text)', async () => {
    seedFreshPendingLock(validPayload);

    const res = await callExplain(validPayload);
    expect(res.fromCache).toBe(false);
    expect(res.text).toContain('have'); // the user IS shown a real breakdown
    // ...and it was persisted as ready (lock loss must not drop the cache write).
    expect(cacheDocs().some((d) => d.status === 'ready' && d.full)).toBe(true);

    // A later identical request is now free.
    const again = await callExplain(validPayload, 'auth-2');
    expect(again.fromCache).toBe(true);
    expect(again.text).toBe(res.text);
  });

  it('ELI5-before-full: materializes the ready doc even when the lock is lost', async () => {
    seedFreshPendingLock(validPayload);
    mockOkProvider('Маленькая правка: скажи "have", не "has".');

    const res = await callExplain({ ...validPayload, variant: 'eli5' });
    expect(res.variant).toBe('eli5');
    expect(res.fromCache).toBe(false);
    // The doc must end up ready WITH an eli5 even though we lost the full-breakdown lock.
    expect(cacheDocs().some((d) => d.status === 'ready' && d.full && d.eli5)).toBe(true);
  });
});
