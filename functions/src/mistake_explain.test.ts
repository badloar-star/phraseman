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
const failingSetCounts = new Map<string, number>();
let autoId = 0;

function failNextSet(collection: string): void {
  failingSetCounts.set(collection, Number(failingSetCounts.get(collection) ?? 0) + 1);
}

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if ((value as { __op?: string } | null)?.__op === 'delete') {
      delete result[key];
      continue;
    }
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
      const collection = path.split('/')[0] ?? '';
      const failuresLeft = Number(failingSetCounts.get(collection) ?? 0);
      if (failuresLeft > 0) {
        failingSetCounts.set(collection, failuresLeft - 1);
        throw new Error(`fake_set_failed:${collection}`);
      }
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
    collection: (name: string) => {
      const query = (field: string, value: unknown, max = Number.POSITIVE_INFINITY) => ({
        limit: (count: number) => query(field, value, count),
        get: async () => {
          const rows = collectionDocs(name)
            .filter((row) => row.data[field] === value)
            .slice(0, max)
            .map((row) => ({ ...snapFor(row.path), id: row.id, ref: refFor(row.path) }));
          return { empty: rows.length === 0, size: rows.length, docs: rows };
        },
      });
      return {
        doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
        where: (field: string, op: string, value: unknown) => {
          if (op !== '==') throw new Error(`unsupported fake query operator: ${op}`);
          return query(field, value);
        },
      };
    },
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          const collection = ref.path.split('/')[0] ?? '';
          const failuresLeft = Number(failingSetCounts.get(collection) ?? 0);
          if (failuresLeft > 0 && data.status === 'ready') {
            failingSetCounts.set(collection, failuresLeft - 1);
            throw new Error(`fake_set_failed:${collection}`);
          }
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
    delete: () => ({ __op: 'delete' }),
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
  MISTAKE_LOCK_TTL_MS,
  MISTAKE_SCHEMA_VERSION,
  claimMistakePendingLock,
  writeReadyMistakeExplanationBundle,
  writeRejectedMistakeExplanation,
} from './explain/mistake_explain_cache';
import { resolvePromptLangKey } from './explain/explain_prompts';

type CallableRequest = { auth?: { uid: string }; data: DocData };
type ExplainMistakeResponse = {
  ok: true;
  text: string;
  fullText?: string;
  eli5Text?: string;
  remainingQuota: number;
  model: string;
  fromCache: boolean;
  variant: string;
};
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

function mockProviderAnswers(...answers: string[]) {
  const queue = [...answers];
  (global.fetch as jest.Mock).mockImplementation(async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: queue.shift() ?? '' } }],
      usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
    }),
  }));
}

function bundleOutput(full: string, eli5: string): string {
  return '<PHRASEMAN_FULL_V1>\n' + full + '\n</PHRASEMAN_FULL_V1>\n' +
    '<PHRASEMAN_ELI5_V1>\n' + eli5 + '\n</PHRASEMAN_ELI5_V1>';
}

const DEFAULT_FULL = 'После "I" здесь нужно "have": скажи "I have a reservation."';
const DEFAULT_ELI5 = 'Почти! После "I" скажи "have". Запомни: "I have a reservation."';

function hashFor(payload: typeof validPayload): string {
  return mistakeHashFor(payload.targetAnswer, payload.userAnswer, resolvePromptLangKey(payload.interfaceLang));
}

function seedReadyFullOnly(payload: typeof validPayload = validPayload): void {
  docs.set(`${MISTAKE_COLLECTION}/${hashFor(payload)}`, {
    status: 'ready',
    schemaVersion: MISTAKE_SCHEMA_VERSION,
    full: DEFAULT_FULL,
    lang: payload.interfaceLang,
    targetEn: payload.targetAnswer,
    userAnswer: payload.userAnswer,
    model: 'gpt-4.1',
    reason: null,
    updatedAtMs: Date.now(),
  });
}

async function callExplain(data: DocData, authUid: string | null = 'auth-1') {
  return explainMistake({ auth: authUid ? { uid: authUid } : undefined, data });
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-12T12:00:00.000Z'));
  docs.clear();
  failingSetCounts.clear();
  autoId = 0;
  global.fetch = jest.fn() as typeof fetch;
  mockOkProvider(bundleOutput(DEFAULT_FULL, DEFAULT_ELI5));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
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

  it('free users hit the daily cap after 3 distinct breakdowns', async () => {
    await callExplain(validPayload);
    await callExplain({ ...validPayload, userAnswer: 'I has table' });
    await callExplain({ ...validPayload, userAnswer: 'I has booking' });

    // Cap is 3/day for free users — the 4th distinct mistake is blocked.
    await expect(callExplain({ ...validPayload, userAnswer: 'I has seat' })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'explain_free_daily_limit',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(billingDocs()).toHaveLength(3);
  });

  it('keeps warm-cache reads free after the user has consumed all three miss credits', async () => {
    const first = await callExplain(validPayload);
    await callExplain({ ...validPayload, userAnswer: 'I has table' });
    await callExplain({ ...validPayload, userAnswer: 'I has booking' });

    const cached = await callExplain(validPayload);

    expect(cached).toMatchObject({ text: first.text, fromCache: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('validator/provider failures release the free generation credit for silent retries', async () => {
    mockOkProvider(bundleOutput(
      'Today you keep a good small practice step with your phrases.',
      DEFAULT_ELI5,
    ));
    for (const userAnswer of ['I has table', 'I has booking', 'I has seat']) {
      await expect(callExplain({ ...validPayload, userAnswer })).rejects.toMatchObject({
        code: 'unavailable',
        message: 'mistake_explain_wrong_language',
      });
    }

    mockOkProvider(bundleOutput(DEFAULT_FULL, DEFAULT_ELI5));
    await expect(callExplain({ ...validPayload, userAnswer: 'I has room' })).resolves.toMatchObject({
      ok: true,
      fromCache: false,
    });
  });

  it('serves the SAME mistake from the warm cache on the second call ($0, no provider hit)', async () => {
    const first = await callExplain(validPayload);
    expect(first.fromCache).toBe(false);
    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(true);

    const second = await callExplain(validPayload, 'auth-2');
    expect(second.fromCache).toBe(true);
    expect(second.text).toBe(first.text);
    expect(second.eli5Text).toBe(first.eli5Text);
    // Still only ONE provider call total — the cache absorbed the second reader.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects wrong-language fresh text before any ready cache write', async () => {
    mockOkProvider(bundleOutput(
      'Today you keep a good small practice step with your phrases.',
      DEFAULT_ELI5,
    ));

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_wrong_language',
    });

    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(false);
    expect(cacheDocs().some((d) => d.status === 'rejected')).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(billingDocs()).toContainEqual(expect.objectContaining({
      promptTokens: 132,
      completionTokens: 66,
      totalTokens: 198,
    }));
  });

  it('does not spend validator retries on a transient provider failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'temporary outage',
    });

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_provider_failed',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(cacheDocs().some((d) => d.status === 'ready' || d.status === 'rejected')).toBe(false);
    expect(billingDocs()).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith('mistake_explain chat failed', { status: 503 });
    expect(JSON.stringify((console.error as jest.Mock).mock.calls)).not.toContain('temporary outage');

    mockOkProvider(bundleOutput(DEFAULT_FULL, DEFAULT_ELI5));
    await expect(callExplain(validPayload)).resolves.toMatchObject({ ok: true, fromCache: false });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('bills earlier rejected output when a later provider attempt fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: bundleOutput(
            'Today you keep a good small practice step with your phrases.',
            DEFAULT_ELI5,
          ) } }],
          usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'temporary outage',
      });

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_provider_failed',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(billingDocs()).toContainEqual(expect.objectContaining({
      promptTokens: 44,
      completionTokens: 22,
      totalTokens: 66,
    }));
    expect(cacheDocs().some((d) => d.status === 'ready' || d.status === 'rejected')).toBe(false);
  });

  it('bills paid generation and releases the lease when the ready cache write fails', async () => {
    failNextSet(MISTAKE_COLLECTION);

    await expect(callExplain(validPayload)).rejects.toThrow(`fake_set_failed:${MISTAKE_COLLECTION}`);

    expect(billingDocs()).toHaveLength(1);
    expect(cacheDocs().some((d) => d.status === 'pending' || d.status === 'ready')).toBe(false);

    await expect(callExplain(validPayload)).resolves.toMatchObject({ ok: true, fromCache: false });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('holds the lease and consumed credit when paid usage cannot be recorded', async () => {
    failNextSet('mistake_explain_billing');

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'internal',
      message: 'mistake_explain_billing_unrecorded',
    });

    expect(billingDocs()).toHaveLength(0);
    expect(cacheDocs()).toContainEqual(expect.objectContaining({ status: 'pending' }));

    const pending = expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explanation_pending',
    });
    await jest.advanceTimersByTimeAsync(1_000);
    await pending;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('holds the lease and consumed credit when rejected paid output billing fails', async () => {
    failNextSet('mistake_explain_billing');
    mockOkProvider(bundleOutput(
      'Today you keep a good small practice step with your phrases.',
      DEFAULT_ELI5,
    ));

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'internal',
      message: 'mistake_explain_billing_unrecorded',
    });
    expect(cacheDocs()).toContainEqual(expect.objectContaining({ status: 'pending' }));

    const pending = expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explanation_pending',
    });
    await jest.advanceTimersByTimeAsync(1_000);
    await pending;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('fences full ready and rejected writes to the current reclaimed lease owner', async () => {
    const hash = hashFor(validPayload);
    const firstClaim = Date.now();
    const winnerClaim = firstClaim + MISTAKE_LOCK_TTL_MS + 1;
    expect(await claimMistakePendingLock(hash, firstClaim)).toBe(true);
    expect(await claimMistakePendingLock(hash, winnerClaim)).toBe(true);

    const winner = {
      full: 'Winner full explanation',
      eli5: 'Winner simple explanation',
    };
    const loser = {
      full: 'Stale full explanation',
      eli5: 'Stale simple explanation',
    };
    const meta = {
      lang: validPayload.interfaceLang,
      targetEn: validPayload.targetAnswer,
      userAnswer: validPayload.userAnswer,
      model: 'gpt-4.1',
    };

    expect(await (writeReadyMistakeExplanationBundle as any)(hash, winner, meta, winnerClaim)).toBe(true);
    expect(await (writeReadyMistakeExplanationBundle as any)(hash, loser, meta, firstClaim)).toBe(false);
    expect(await (writeRejectedMistakeExplanation as any)(hash, 'stale_rejection', firstClaim)).toBe(false);
    expect(docs.get(`${MISTAKE_COLLECTION}/${hash}`)).toMatchObject(winner);
  });

  it('does not persist raw target or learner answers in new cache documents', async () => {
    await callExplain(validPayload);

    const ready = cacheDocs().find((doc) => doc.status === 'ready');
    expect(ready).toBeDefined();
    expect(ready).not.toHaveProperty('targetEn');
    expect(ready).not.toHaveProperty('userAnswer');
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
    // Post-2026-06-28 audit: the prompt no longer blindly orders "explain EVERY word that
    // differs" (that forced the model to teach false positional-diff pairs). It now treats the
    // swap list as an UNRELIABLE hint and makes the two full sentences the source of truth.
    expect(prompt).toContain('SOURCE OF TRUTH');
    expect(prompt).toContain('UNRELIABLE');
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

  it('keeps legacy full-only cache compatibility and lazily generates its missing ELI5 text', async () => {
    seedReadyFullOnly();
    mockOkProvider('Почти: после "I" скажи "have", не "has". Это слово-друг для "I". Скажи "I have a reservation."');

    const eli5 = await callExplain({ ...validPayload, variant: 'eli5' });
    expect(eli5.variant).toBe('eli5');
    expect(eli5.text).toContain('слово-друг');
    expect(docs.get(`${MISTAKE_COLLECTION}/${hashFor(validPayload)}`)).not.toHaveProperty('targetEn');
    expect(docs.get(`${MISTAKE_COLLECTION}/${hashFor(validPayload)}`)).not.toHaveProperty('userAnswer');

    // Second eli5 read for the same mistake comes from cache ($0).
    const eli5Again = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-3');
    expect(eli5Again.fromCache).toBe(true);
    expect(eli5Again.text).toBe(eli5.text);
  });

  it('ELI5: rejects wrong-language fresh text, keeps it out of cache, and bills paid attempts', async () => {
    seedReadyFullOnly();
    const hash = hashFor(validPayload);
    const before = docs.get(`${MISTAKE_COLLECTION}/${hash}`);
    mockOkProvider('Today you keep a good small practice step with your phrases.');

    await expect(callExplain({ ...validPayload, variant: 'eli5' })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_wrong_language',
    });

    const after = docs.get(`${MISTAKE_COLLECTION}/${hash}`);
    expect(after).toMatchObject({
      status: 'ready',
      full: before?.full,
    });
    expect(after?.eli5).toBeUndefined();
    expect(billingDocs()).toHaveLength(1);
    expect(billingDocs()[0]).toMatchObject({
      variant: 'eli5',
      promptTokens: 132,
      completionTokens: 66,
      totalTokens: 198,
    });
  });

  it('ELI5-before-full: rejects wrong-language fresh text before materializing any ready doc', async () => {
    mockOkProvider('Today you keep a good small practice step with your phrases.');

    await expect(callExplain({ ...validPayload, variant: 'eli5' })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_wrong_language',
    });

    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(false);
    expect(billingDocs()).toHaveLength(1);
  });

  it('persists ELI5 even when it is requested BEFORE the full breakdown (no money leak on repeat)', async () => {
    mockOkProvider('Маленькая правка: скажи "have", не "has". Для "I" подходит "have".');

    // ELI5 first — no full breakdown cached yet.
    const first = await callExplain({ ...validPayload, variant: 'eli5' });
    expect(first.variant).toBe('eli5');
    expect(first.fromCache).toBe(false);

    // ELI5 is independently cached; requesting simple copy must not pay for a
    // second, unrequested full breakdown.
    expect(cacheDocs().some((d) => Boolean(d.eli5))).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchCallsAfterFirst = (global.fetch as jest.Mock).mock.calls.length;
    const second = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-9');
    expect(second.fromCache).toBe(true);
    expect(second.text).toBe(first.text);
    // No new provider call for the cached repeat.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsAfterFirst);
  });

  // One fresh pending lease means another request owns generation. Losers wait
  // briefly, then return a retryable pending signal without a duplicate provider call.
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

  it('FULL: rejects wrong-language ready cache and overwrites it with fresh checked text', async () => {
    const hash = hashFor(validPayload);
    docs.set(`${MISTAKE_COLLECTION}/${hash}`, {
      status: 'ready',
      schemaVersion: MISTAKE_SCHEMA_VERSION,
      full: 'Today you keep a good small practice step with your phrases.',
      lang: 'ru',
      targetEn: validPayload.targetAnswer,
      userAnswer: validPayload.userAnswer,
      model: 'gpt-4.1',
      reason: null,
      updatedAtMs: Date.now(),
    });

    const res = await callExplain(validPayload, 'auth-2');

    expect(res.fromCache).toBe(false);
    expect(res.text).toContain('have');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(docs.get(`${MISTAKE_COLLECTION}/${hash}`)?.full).toBe(res.text);
  });

  it('FULL: losing the generation lock never starts a duplicate provider call', async () => {
    seedFreshPendingLock(validPayload);

    const pendingExpectation = expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explanation_pending',
    });
    await jest.advanceTimersByTimeAsync(1_000);
    await pendingExpectation;
    expect(global.fetch).not.toHaveBeenCalled();
    expect(cacheDocs().some((d) => d.status === 'pending')).toBe(true);
  });

  it('two overlapping FULL callables share one provider generation and the same bundle', async () => {
    const full = 'После "I" здесь нужно "have". Скажи "I have a reservation."';
    const eli5 = 'Почти! После "I" поставь "have". Скажи "I have a reservation."';
    const providerGate: { release?: () => void } = {};
    let announceProviderStarted: () => void = () => {};
    const providerStarted = new Promise<void>((resolve) => { announceProviderStarted = resolve; });
    (global.fetch as jest.Mock).mockImplementation(async () => {
      announceProviderStarted();
      await new Promise<void>((resolve) => { providerGate.release = resolve; });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: bundleOutput(full, eli5) } }],
          usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
        }),
      };
    });

    const firstPromise = callExplain(validPayload, 'auth-1');
    await providerStarted;
    const secondPromise = callExplain(validPayload, 'auth-2');

    for (let tick = 0; tick < 20 && jest.getTimerCount() === 0; tick += 1) {
      await Promise.resolve();
    }
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    if (!providerGate.release) throw new Error('provider was not waiting');
    providerGate.release();

    const first = await firstPromise;
    await jest.advanceTimersByTimeAsync(200);
    const second = await secondPromise;

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ text: full, eli5Text: eli5, fromCache: false });
    expect(second).toMatchObject({ text: full, eli5Text: eli5, fromCache: true });
  });

  it('ELI5 waits for a live full bundle instead of starting duplicate generation', async () => {
    seedFreshPendingLock(validPayload);
    mockOkProvider('Маленькая правка: скажи "have", не "has".');

    const pendingExpectation = expect(callExplain({ ...validPayload, variant: 'eli5' })).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explanation_pending',
    });
    await jest.advanceTimersByTimeAsync(1_000);
    await pendingExpectation;

    expect(global.fetch).not.toHaveBeenCalled();
    expect(cacheDocs().some((d) => d.status === 'pending' && d.eli5)).toBe(false);
  });

  it('a late legacy ELI5 result cannot overwrite a completed full bundle', async () => {
    const bundleFull = 'После "I" здесь нужно "have". Скажи "I have a reservation."';
    const bundleEli5 = 'Почти! После "I" поставь "have". Скажи "I have a reservation."';
    const lateLegacyEli5 = 'Поздний отдельный простой ответ, который не должен победить.';
    const legacyGate: { release?: () => void } = {};
    let announceLegacyStarted: () => void = () => {};
    const legacyStarted = new Promise<void>((resolve) => { announceLegacyStarted = resolve; });

    (global.fetch as jest.Mock).mockImplementation(async (_url: unknown, init: { body: string }) => {
      const body = JSON.parse(init.body) as { messages?: Array<{ content?: string }> };
      const isBundle = JSON.stringify(body.messages ?? []).includes('<PHRASEMAN_FULL_V1>');
      if (isBundle) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: bundleOutput(bundleFull, bundleEli5) } }],
            usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
          }),
        };
      }
      announceLegacyStarted();
      await new Promise<void>((resolve) => { legacyGate.release = resolve; });
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: lateLegacyEli5 } }],
          usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
        }),
      };
    });

    const legacyPromise = callExplain({ ...validPayload, variant: 'eli5' });
    await legacyStarted;
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const full = await callExplain(validPayload, 'auth-2');
    expect(full.eli5Text).toBe(bundleEli5);

    if (!legacyGate.release) throw new Error('legacy provider was not waiting');
    legacyGate.release();
    const legacy = await legacyPromise;

    expect(legacy.text).toBe(bundleEli5);
    expect(docs.get(`${MISTAKE_COLLECTION}/${hashFor(validPayload)}`)?.eli5).toBe(bundleEli5);
    expect(JSON.stringify(cacheDocs())).not.toContain(lateLegacyEli5);
  });

  it('FULL bundle generates and caches both variants in one provider call', async () => {
    const full = 'После "I" здесь нужно "have".\n"I have a reservation."';
    const eli5 = 'Почти! После "I" поставь "have".\n"I have a reservation."';
    mockOkProvider(bundleOutput(full, eli5));

    const first = await callExplain(validPayload);

    expect(first).toMatchObject({
      text: full,
      fullText: full,
      eli5Text: eli5,
      variant: 'full',
      fromCache: false,
    });
    expect(cacheDocs()).toContainEqual(expect.objectContaining({
      status: 'ready',
      full,
      eli5,
    }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const simple = await callExplain({ ...validPayload, variant: 'eli5' }, 'auth-2');
    expect(simple).toMatchObject({ text: eli5, variant: 'eli5', fromCache: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('FULL bundle silently retries validator rejects and bills all paid attempts', async () => {
    const full = 'После "I" здесь нужно "have".\n"I have a reservation."';
    const eli5 = 'Почти! После "I" поставь "have".\n"I have a reservation."';
    mockProviderAnswers(
      bundleOutput('Today you should use "have" here.', eli5),
      'Формат без обязательных секций.',
      bundleOutput(full, eli5),
    );

    const result = await callExplain(validPayload);

    expect(result).toMatchObject({ text: full, fullText: full, eli5Text: eli5 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(billingDocs()).toHaveLength(1);
    expect(billingDocs()[0]).toMatchObject({
      promptTokens: 132,
      completionTokens: 66,
      totalTokens: 198,
    });
    expect(cacheDocs()).toContainEqual(expect.objectContaining({
      status: 'ready',
      full,
      eli5,
    }));
    expect(JSON.stringify(cacheDocs())).not.toContain('Today you should');
    expect(JSON.stringify(cacheDocs())).not.toContain('Формат без обязательных секций');
  });

  it('FULL bundle marks rejected only after three malformed outputs and never publishes them', async () => {
    mockOkProvider('Формат без обязательных секций.');

    await expect(callExplain(validPayload)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'mistake_explain_invalid_bundle',
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(cacheDocs()).toContainEqual(expect.objectContaining({
      status: 'rejected',
      reason: 'invalid_output_bundle',
    }));
    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(false);
    expect(JSON.stringify(cacheDocs())).not.toContain('Формат без обязательных секций');
    expect(billingDocs()).toContainEqual(expect.objectContaining({
      promptTokens: 132,
      completionTokens: 66,
      totalTokens: 198,
    }));
  });

  it('caps truncation plus validator recovery at three total provider calls', async () => {
    const responses = [
      { content: 'Обрезанная первая секция.', finishReason: 'length' },
      { content: 'Формат без обязательных секций 2.', finishReason: 'stop' },
      { content: 'Обрезанная третья попытка.', finishReason: 'length' },
      { content: 'Этот четвёртый ответ не должен запрашиваться.', finishReason: 'stop' },
    ];
    (global.fetch as jest.Mock).mockImplementation(async () => {
      const next = responses.shift();
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: next?.content ?? '' },
            finish_reason: next?.finishReason,
          }],
          usage: { prompt_tokens: 44, completion_tokens: 22, total_tokens: 66 },
        }),
      };
    });

    await expect(callExplain(validPayload)).rejects.toMatchObject({ code: 'unavailable' });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as jest.Mock).mock.calls.map((call) => (
      JSON.parse(call[1].body as string).max_tokens
    ))).toEqual([520, 760, 760]);
    expect(cacheDocs().some((d) => d.status === 'ready')).toBe(false);
    expect(billingDocs()).toContainEqual(expect.objectContaining({
      promptTokens: 132,
      completionTokens: 66,
      totalTokens: 198,
    }));
  });
});
