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
} from './explain_cache';

beforeEach(() => docs.clear());

describe('normalizePhrase + phraseHashFor — deterministic, dedup-friendly', () => {
  it('collapses case, surrounding whitespace and trailing punctuation to one key', () => {
    const a = phraseHashFor('Hello!');
    const b = phraseHashFor('  hello ');
    const c = phraseHashFor('HELLO?');
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizePhrase('break   a  leg')).toBe(normalizePhrase('break a leg'));
  });

  it('produces a 40-char hex id and distinguishes different phrases', () => {
    expect(phraseHashFor('Hello')).toMatch(/^[0-9a-f]{40}$/);
    expect(phraseHashFor('Hello')).not.toBe(phraseHashFor('Goodbye'));
  });
});

describe('readCachedExplanation', () => {
  it('returns null when the doc is absent', async () => {
    expect(await readCachedExplanation(phraseHashFor('x'))).toBeNull();
  });

  it('returns ready text after writeReadyExplanation', async () => {
    const hash = phraseHashFor('Break a leg');
    await writeReadyExplanation(hash, 'Это значит удачи.', { lang: 'ru', phraseEn: 'Break a leg' });
    const got = await readCachedExplanation(hash);
    expect(got?.status).toBe('ready');
    expect(got?.text).toBe('Это значит удачи.');
    expect(got?.schemaVersion).toBe(1);
  });

  it('returns rejected after writeRejectedExplanation', async () => {
    const hash = phraseHashFor('bad');
    await writeRejectedExplanation(hash, 'toxic');
    const got = await readCachedExplanation(hash);
    expect(got?.status).toBe('rejected');
  });
});

describe('claimPendingLock — race + staleness', () => {
  it('first claim on an absent doc wins, second is blocked', async () => {
    const hash = phraseHashFor('race');
    expect(await claimPendingLock(hash, 1_000)).toBe(true);
    expect(await claimPendingLock(hash, 1_500)).toBe(false); // fresh pending blocks
  });

  it('does not re-claim a ready doc', async () => {
    const hash = phraseHashFor('done');
    await writeReadyExplanation(hash, 'ok', { lang: 'en', phraseEn: 'done' });
    expect(await claimPendingLock(hash, 5_000)).toBe(false);
  });

  it('does not re-claim a rejected doc', async () => {
    const hash = phraseHashFor('nope');
    await writeRejectedExplanation(hash, 'off_topic');
    expect(await claimPendingLock(hash, 5_000)).toBe(false);
  });

  it('re-claims a STALE pending (older than LOCK_TTL_MS), not a fresh one', async () => {
    const hash = phraseHashFor('stuck');
    const t0 = 10_000;
    expect(await claimPendingLock(hash, t0)).toBe(true);
    // fresh: within TTL → blocked
    expect(await claimPendingLock(hash, t0 + LOCK_TTL_MS - 1)).toBe(false);
    // stale: past TTL → re-claimable (crashed generation recovery)
    expect(await claimPendingLock(hash, t0 + LOCK_TTL_MS + 1)).toBe(true);
  });

  it('writes createdAtMs on the pending doc (staleness is computable)', async () => {
    const hash = phraseHashFor('ts');
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
