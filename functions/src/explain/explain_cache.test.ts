export {};

// ---- in-memory firestore fake (house pattern, mirrors client_reports.test.ts) ----
type DocData = Record<string, unknown>;
type FakeRef = { id: string; path: string; get: () => Promise<FakeSnap>; set: (d: DocData, o?: { merge?: boolean }) => Promise<void> };
type FakeSnap = { id: string; exists: boolean; data: () => DocData | undefined };

const docs = new Map<string, DocData>();

function refFor(path: string): FakeRef {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
    },
  };
}
function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return { id: path.split('/').pop() || path, exists: data !== undefined, data: () => data };
}
function fakeDb() {
  return {
    collection: (name: string) => ({ doc: (id?: string) => refFor(`${name}/${id ?? 'auto'}`) }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          writes.push(() => docs.set(ref.path, opts?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : { ...data }));
        },
      });
      writes.forEach((w) => w());
      return result;
    },
  };
}

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

import {
  EXPLAIN_COLLECTION,
  normalizePhrase,
  phraseHashFor,
  readCachedExplanation,
  claimPendingLock,
  writeReadyExplanation,
  writeRejectedExplanation,
  LOCK_TTL_MS,
  EXPLAIN_SCHEMA_VERSION,
} from './explain_cache';

beforeEach(() => docs.clear());

describe('normalizePhrase + phraseHashFor — deterministic, dedup-friendly', () => {
  it('collapses case, surrounding whitespace and trailing punctuation to one key', () => {
    const a = phraseHashFor('Hello!', 'ru');
    const b = phraseHashFor('  hello ', 'ru');
    const c = phraseHashFor('HELLO?', 'ru');
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizePhrase('break   a  leg')).toBe(normalizePhrase('break a leg'));
  });

  it('produces a 40-char hex id and distinguishes different phrases', () => {
    expect(phraseHashFor('Hello', 'ru')).toMatch(/^[0-9a-f]{40}$/);
    expect(phraseHashFor('Hello', 'ru')).not.toBe(phraseHashFor('Goodbye', 'ru'));
  });

  it('SAME phrase in DIFFERENT languages → DIFFERENT cache keys (audit bug 2026-06-10)', () => {
    // Раньше язык в ключе отсутствовал → испанец получал русское объяснение из кэша.
    const ru = phraseHashFor('It sounds good', 'ru');
    const es = phraseHashFor('It sounds good', 'es');
    const tr = phraseHashFor('It sounds good', 'tr');
    expect(ru).not.toBe(es);
    expect(ru).not.toBe(tr);
    expect(es).not.toBe(tr);
  });

  it('langKey is normalized inside the hash (case/whitespace-insensitive)', () => {
    expect(phraseHashFor('Hello', 'RU')).toBe(phraseHashFor('Hello', 'ru'));
    expect(phraseHashFor('Hello', ' ru ')).toBe(phraseHashFor('Hello', 'ru'));
  });
});

describe('resolvePromptLangKey — канонический язык для промпта И ключа кэша', () => {
  // Один резолвер на генерацию и кэш-ключ: ключ всегда совпадает с языком текста в доке.
  const { resolvePromptLangKey, PROMPT_LANGUAGES } = require('./explain_prompts');

  it('покрывает все 8 языков приложения (+en) — раньше было только ru/en', () => {
    for (const code of ['ru', 'en', 'uk', 'es', 'pt', 'vi', 'id', 'tr', 'pl']) {
      expect(PROMPT_LANGUAGES[code]).toBeDefined();
      expect(resolvePromptLangKey(code)).toBe(code);
    }
  });

  it("региональные коды режутся до базового: 'pt-BR' → 'pt'", () => {
    expect(resolvePromptLangKey('pt-BR')).toBe('pt');
  });

  it("неизвестный/пустой язык падает в 'ru' (дефолтная аудитория)", () => {
    expect(resolvePromptLangKey('xx')).toBe('ru');
    expect(resolvePromptLangKey('')).toBe('ru');
  });
});

describe('readCachedExplanation', () => {
  it('returns null when the doc is absent', async () => {
    expect(await readCachedExplanation(phraseHashFor('x', 'ru'))).toBeNull();
  });

  it('returns ready text after writeReadyExplanation', async () => {
    const hash = phraseHashFor('Break a leg', 'ru');
    await writeReadyExplanation(hash, 'Это значит удачи.', { lang: 'ru', phraseEn: 'Break a leg' });
    const got = await readCachedExplanation(hash);
    expect(got?.status).toBe('ready');
    expect(got?.text).toBe('Это значит удачи.');
    expect(got?.schemaVersion).toBe(EXPLAIN_SCHEMA_VERSION);
  });

  it('returns null for a doc written by an older schema (stale → regenerate)', async () => {
    const hash = phraseHashFor('Old cached phrase', 'ru');
    // Simulate a leftover doc from before the prompt rewrite: ready, but an older schemaVersion.
    docs.set(`${EXPLAIN_COLLECTION}/${hash}`, {
      status: 'ready',
      text: 'старое объяснение (re-telling, wrong)',
      schemaVersion: EXPLAIN_SCHEMA_VERSION - 1,
    });
    expect(await readCachedExplanation(hash)).toBeNull();
  });

  it('returns rejected after writeRejectedExplanation', async () => {
    const hash = phraseHashFor('bad', 'ru');
    await writeRejectedExplanation(hash, 'toxic');
    const got = await readCachedExplanation(hash);
    expect(got?.status).toBe('rejected');
  });
});

describe('claimPendingLock — race + staleness', () => {
  it('first claim on an absent doc wins, second is blocked', async () => {
    const hash = phraseHashFor('race', 'ru');
    expect(await claimPendingLock(hash, 1_000)).toBe(true);
    expect(await claimPendingLock(hash, 1_500)).toBe(false); // fresh pending blocks
  });

  it('does not re-claim a ready doc', async () => {
    const hash = phraseHashFor('done', 'ru');
    await writeReadyExplanation(hash, 'ok', { lang: 'en', phraseEn: 'done' });
    expect(await claimPendingLock(hash, 5_000)).toBe(false);
  });

  it('does not re-claim a rejected doc', async () => {
    const hash = phraseHashFor('nope', 'ru');
    await writeRejectedExplanation(hash, 'off_topic');
    expect(await claimPendingLock(hash, 5_000)).toBe(false);
  });

  it('re-claims a STALE pending (older than LOCK_TTL_MS), not a fresh one', async () => {
    const hash = phraseHashFor('stuck', 'ru');
    const t0 = 10_000;
    expect(await claimPendingLock(hash, t0)).toBe(true);
    // fresh: within TTL → blocked
    expect(await claimPendingLock(hash, t0 + LOCK_TTL_MS - 1)).toBe(false);
    // stale: past TTL → re-claimable (crashed generation recovery)
    expect(await claimPendingLock(hash, t0 + LOCK_TTL_MS + 1)).toBe(true);
  });

  it('writes createdAtMs on the pending doc (staleness is computable)', async () => {
    const hash = phraseHashFor('ts', 'ru');
    await claimPendingLock(hash, 42_000);
    const got = await readCachedExplanation(hash);
    expect(got?.status).toBe('pending');
    expect(got?.createdAtMs).toBe(42_000);
  });
});

describe('collection name', () => {
  it('is phrase_explanations', () => {
    expect(EXPLAIN_COLLECTION).toBe('phrase_explanations');
  });
});
