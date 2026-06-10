export {};

// ---- in-memory firestore fake (house pattern, mirrors client_reports.test.ts) ----
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
      writes.forEach((w) => w());
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

// Provider + judge are mocked so NO real OpenAI call happens in CI.
const mockOpenAiChat = jest.fn();
jest.mock('./explain/explain_provider', () => ({
  openAiChat: (...args: unknown[]) => mockOpenAiChat(...args),
}));

const mockJudge = jest.fn();
jest.mock('./explain/explain_judge', () => ({
  judgeExplanation: (...args: unknown[]) => mockJudge(...args),
}));

import { explainPhrase as explainPhraseRaw, buildFallback, type ExplainResponse } from './explain_phrase';
import { phraseHashFor, EXPLAIN_SCHEMA_VERSION } from './explain/explain_cache';

// The mocked onCall returns the raw handler; type it as the callable for the tests.
type CallableRequest = { auth?: { uid: string }; data: DocData };
const explainPhrase = explainPhraseRaw as unknown as (request: CallableRequest) => Promise<ExplainResponse>;

const AUTH_UID = 'auth-1';
const STABLE_UID = 'stable-1';
const PHRASE = 'Break a leg';
const MEANING = 'Пожелание удачи';

function billingDocs(): DocData[] {
  return collectionDocs('explain_billing').map((d) => d.data);
}
function explanationDoc(phraseEn: string): DocData | undefined {
  return docs.get(`phrase_explanations/${phraseHashFor(phraseEn)}`);
}

async function callExplain(data: DocData, authUid: string | null = AUTH_UID) {
  // authUid === null means "no auth" — pass null explicitly to avoid the default-param trap
  // where an explicit `undefined` would fall back to AUTH_UID.
  return explainPhrase({ auth: authUid ? { uid: authUid } : undefined, data });
}

function genReply(text: string, promptTokens = 100, completionTokens = 50) {
  return { text, promptTokens, completionTokens };
}
function verdict(ok: boolean, reason: string, promptTokens = 12, completionTokens = 5) {
  return { ok, reason, promptTokens, completionTokens };
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-09T12:00:00.000Z'));
  docs.clear();
  autoId = 0;
  mockOpenAiChat.mockReset();
  mockJudge.mockReset();
  // Seed the identity so resolveStableUidForAuth(db, authUid) resolves to STABLE_UID from AUTH.
  docs.set(`users/${STABLE_UID}`, { firebaseAuthUid: AUTH_UID });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('explainPhrase — auth + identity', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' }, null))
      .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
  });

  it('IGNORES a body-supplied stableId — identity comes from auth (closes the audit bug class)', async () => {
    mockOpenAiChat.mockResolvedValue(genReply('Это значит пожелать удачи перед важным делом.'));
    mockJudge.mockResolvedValue(verdict(true, 'ok'));

    const res = await callExplain({
      phraseEn: PHRASE,
      phraseMeaning: MEANING,
      lang: 'ru',
      // attacker-controlled identity fields in the body:
      stableId: 'attacker-stable',
      uid: 'attacker-uid',
    });

    expect(res.status).toBe('ok');
    // Billing doc must record the AUTH-derived stable uid, never the body value.
    expect(billingDocs()).toHaveLength(1);
    expect(billingDocs()[0]).toMatchObject({ uid: STABLE_UID, authUid: AUTH_UID });
    expect(billingDocs()[0].uid).not.toBe('attacker-stable');
  });
});

describe('explainPhrase — cache short-circuits (0 AI calls)', () => {
  it('cache READY ⇒ returns cached text, calls neither provider nor judge', async () => {
    docs.set(`phrase_explanations/${phraseHashFor(PHRASE)}`, {
      status: 'ready',
      text: 'Готовое объяснение из кэша.',
      schemaVersion: EXPLAIN_SCHEMA_VERSION,
    });

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res).toEqual({ ok: true, text: 'Готовое объяснение из кэша.', status: 'ok', fromCache: true });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockJudge).not.toHaveBeenCalled();
    expect(billingDocs()).toHaveLength(0); // a hit writes no billing doc
  });

  it('cache REJECTED ⇒ returns fallback, no regen, no AI calls', async () => {
    docs.set(`phrase_explanations/${phraseHashFor(PHRASE)}`, {
      status: 'rejected',
      reason: 'toxic',
      schemaVersion: EXPLAIN_SCHEMA_VERSION,
    });

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res.status).toBe('rejected');
    expect(res.fromCache).toBe(true);
    expect(res.text).toBe(buildFallback(MEANING));
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(mockJudge).not.toHaveBeenCalled();
  });
});

describe('explainPhrase — full miss path', () => {
  it('generate → judge ok ⇒ writeReady, returns generated text, writes one billing doc with both token sets', async () => {
    mockOpenAiChat.mockResolvedValue(genReply('Это значит пожелать удачи. Например: перед экзаменом.', 120, 60));
    mockJudge.mockResolvedValue(verdict(true, 'ok', 15, 4));

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
    expect(mockJudge).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ ok: true, status: 'ok', fromCache: false });
    expect(res.text).toContain('пожелать удачи');

    // Cache became public (ready).
    expect(explanationDoc(PHRASE)).toMatchObject({ status: 'ready', lang: 'ru', model: 'gpt-4o-mini' });

    // One billing doc with BOTH gen and judge token usage.
    expect(billingDocs()).toHaveLength(1);
    expect(billingDocs()[0]).toMatchObject({
      uid: STABLE_UID,
      genPromptTokens: 120,
      genCompletionTokens: 60,
      judgePromptTokens: 15,
      judgeCompletionTokens: 4,
      verdict: 'ok',
      published: true,
    });
  });

  it('judge ok:FALSE ⇒ writeRejected, but the live caller STILL receives the generated text', async () => {
    mockOpenAiChat.mockResolvedValue(genReply('Сырой непроверенный текст объяснения фразы.'));
    mockJudge.mockResolvedValue(verdict(false, 'off_topic'));

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    // The cache is protected (rejected), NOT the trigger user.
    expect(explanationDoc(PHRASE)).toMatchObject({ status: 'rejected', reason: 'off_topic' });
    expect(res.status).toBe('rejected');
    expect(res.fromCache).toBe(false);
    expect(res.text).toBe('Сырой непроверенный текст объяснения фразы.'); // caller still sees it
    expect(billingDocs()[0]).toMatchObject({ verdict: 'off_topic', published: false });
  });

  it('sanitizes markdown out of the generated text before judging and caching', async () => {
    mockOpenAiChat.mockResolvedValue(genReply('**Это** значит `удачи`. Например: перед делом.'));
    mockJudge.mockResolvedValue(verdict(true, 'ok'));

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res.text).not.toContain('**');
    expect(res.text).not.toContain('`');
    // Judge received the sanitized text.
    const judgedText = mockJudge.mock.calls[0][0].text as string;
    expect(judgedText).not.toContain('**');
  });
});

describe('explainPhrase — budget exhaustion degrades gracefully (no 500)', () => {
  it('per-user cap reached ⇒ fallback with status exhausted, no AI calls', async () => {
    // Pre-fill the user limit doc to the cap so enforceUserGenLimit throws resource-exhausted.
    // docId is deterministic; the limiter reads dailyCount vs USER_DAILY_GEN_CAP (20).
    const { USER_DAILY_GEN_CAP, USER_LIMIT_COLLECTION } = require('./explain/explain_budget');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(`gen|${AUTH_UID}|${STABLE_UID}`).digest('hex').slice(0, 48);
    docs.set(`${USER_LIMIT_COLLECTION}/gen_${hash}`, {
      dailyCount: USER_DAILY_GEN_CAP,
      resetAtMs: Date.UTC(2026, 5, 10, 0, 0, 0, 0), // tomorrow → still in window, count is at cap
    });

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res).toMatchObject({ ok: true, status: 'exhausted', fromCache: false });
    expect(res.text).toBe(buildFallback(MEANING));
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(billingDocs()).toHaveLength(0);
  });

  it('global budget cap reached ⇒ fallback with status exhausted', async () => {
    const { GLOBAL_DAILY_CAP, GLOBAL_BUDGET_COLLECTION } = require('./explain/explain_budget');
    const dateKey = new Date('2026-06-09T12:00:00.000Z').toISOString().slice(0, 10);
    docs.set(`${GLOBAL_BUDGET_COLLECTION}/${dateKey}`, { genCount: GLOBAL_DAILY_CAP });

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res.status).toBe('exhausted');
    expect(mockOpenAiChat).not.toHaveBeenCalled();
  });
});

describe('explainPhrase — concurrent generation (lost lock race)', () => {
  it('a fresh pending lock held by someone else ⇒ fallback with status pending, no generate', async () => {
    // Another request is actively generating: a fresh pending doc exists.
    docs.set(`phrase_explanations/${phraseHashFor(PHRASE)}`, {
      status: 'pending',
      schemaVersion: EXPLAIN_SCHEMA_VERSION,
      createdAtMs: Date.now(), // fresh → claimPendingLock returns false
    });

    const res = await callExplain({ phraseEn: PHRASE, phraseMeaning: MEANING, lang: 'ru' });

    expect(res).toMatchObject({ ok: true, status: 'pending', fromCache: true });
    expect(res.text).toBe(buildFallback(MEANING));
    expect(mockOpenAiChat).not.toHaveBeenCalled();
  });
});

describe('explainPhrase — input validation', () => {
  it('empty phrase ⇒ invalid-argument (no AI work)', async () => {
    await expect(callExplain({ phraseEn: '', phraseMeaning: MEANING, lang: 'ru' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
  });

  it('missing meaning ⇒ invalid-argument (fallback needs it)', async () => {
    await expect(callExplain({ phraseEn: PHRASE, phraseMeaning: '', lang: 'ru' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('buildFallback — server builds it, never the client, never AI', () => {
  it('is derived from phraseMeaning', () => {
    expect(buildFallback('Привет')).toContain('Привет');
    expect(buildFallback('Привет')).toContain('Например');
  });

  it('degrades to a generic string when meaning is empty', () => {
    expect(buildFallback('')).toBe('Объяснение пока недоступно. Попробуйте позже.');
  });
});
