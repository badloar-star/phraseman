import * as feedbackEntries from './feedback_entries';
import fs from 'node:fs';
import path from 'node:path';

const { feedbackEntryDocId, sanitizeFeedbackRating, FEEDBACK_KINDS } = feedbackEntries;

describe('sanitizeFeedbackRating', () => {
  it('accepts 1-5', () => {
    expect(sanitizeFeedbackRating(1)).toBe(1);
    expect(sanitizeFeedbackRating(3)).toBe(3);
    expect(sanitizeFeedbackRating(5)).toBe(5);
  });

  it('rounds fractional values', () => {
    expect(sanitizeFeedbackRating(4.6)).toBe(5);
    expect(sanitizeFeedbackRating(3.2)).toBe(3);
  });

  it('rejects out-of-range and garbage as "no rating" (0)', () => {
    expect(sanitizeFeedbackRating(0)).toBe(0);
    expect(sanitizeFeedbackRating(6)).toBe(0);
    expect(sanitizeFeedbackRating(-1)).toBe(0);
    expect(sanitizeFeedbackRating('five')).toBe(0);
    expect(sanitizeFeedbackRating(null)).toBe(0);
    expect(sanitizeFeedbackRating(undefined)).toBe(0);
    expect(sanitizeFeedbackRating(NaN)).toBe(0);
  });
});

describe('feedbackEntryDocId', () => {
  it('is deterministic for the same uid+kind+entityId — one feedback per attempt', () => {
    const a = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    const b = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    expect(a).toBe(b);
  });

  it('differs across kinds for the same user+entity — sections never collide', () => {
    const lesson = feedbackEntryDocId('uid123', 'lesson', 'shared-id');
    const vocab = feedbackEntryDocId('uid123', 'vocab', 'shared-id');
    expect(lesson).not.toBe(vocab);
  });

  it('differs across entities of the same kind', () => {
    const a = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    const b = feedbackEntryDocId('uid123', 'lesson', 'es:6');
    expect(a).not.toBe(b);
  });

  it('strips characters unsafe for a Firestore doc id', () => {
    const id = feedbackEntryDocId('uid/with:slash', 'dialogue', 'scenario/with:colon');
    expect(id).not.toMatch(/[/:]/);
  });

  it('does not collide when punctuation or Unicode are the only difference', () => {
    expect(feedbackEntryDocId('uid', 'dialogue', 'hello/world'))
      .not.toBe(feedbackEntryDocId('uid', 'dialogue', 'helloworld'));
    expect(feedbackEntryDocId('uid', 'dialogue', 'урок-1'))
      .not.toBe(feedbackEntryDocId('uid', 'dialogue', '-1'));
  });

  it('does not collide for long entity ids sharing the first 80 safe characters', () => {
    const prefix = 'a'.repeat(80);
    expect(feedbackEntryDocId('uid', 'lesson', `${prefix}-one`))
      .not.toBe(feedbackEntryDocId('uid', 'lesson', `${prefix}-two`));
  });

  it('is opaque and does not expose raw uid or entity text', () => {
    const id = feedbackEntryDocId('private-user@example.com', 'lesson', 'private lesson name');
    expect(id).toMatch(/^fbe_v2_[A-Za-z0-9_-]+$/);
    expect(id).not.toContain('private');
    expect(id).not.toContain('lesson');
  });
});

describe('submitFeedbackEntry idempotency and consent contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'feedback_entries.ts'), 'utf8');

  it('creates once transactionally and returns the same receipt on retry without overwriting', () => {
    expect(source).toContain('db.runTransaction(async (tx) =>');
    expect(source).toContain('const existing = await tx.get(feedbackRef);');
    expect(source).toContain('if (existing.exists) return true;');
    expect(source).toContain('tx.create(feedbackRef, document);');
    expect(source).not.toMatch(/ref\.set\([\s\S]*?merge:\s*true/);
  });

  it('stores explicit AI-summary consent metadata only for the current exact version', () => {
    expect(source).toContain("FEEDBACK_AI_SUMMARY_CONSENT_VERSION = 'feedback-ai-summary-v2'");
    expect(source).toContain('aiSummaryConsent: consentGranted');
    expect(source).toContain('aiSummaryConsentVersion: consentGranted ? FEEDBACK_AI_SUMMARY_CONSENT_VERSION : null');
    expect(source).toContain('aiSummaryConsentAt: consentGranted ? admin.firestore.FieldValue.serverTimestamp() : null');
  });

  it('exports a bounded atomic quota commit seam for behavioral concurrency coverage', () => {
    const module = feedbackEntries as Record<string, unknown>;
    expect(typeof module.commitFeedbackEntryWithQuota).toBe('function');
    expect(typeof module.feedbackQuotaDocId).toBe('function');
    expect(module.FEEDBACK_DAILY_SUBMISSION_LIMIT).toBe(30);
    expect(feedbackEntries.feedbackQuotaDocId('stable-1'))
      .not.toBe(feedbackEntries.feedbackQuotaDocId('stable-2'));
  });

  it('concurrent retries create and charge once while preserving the original receipt', async () => {
    const store = new Map<string, Record<string, unknown>>();
    let lock = Promise.resolve();
    const db = {
      runTransaction<T>(work: (tx: any) => Promise<T>): Promise<T> {
        const run = lock.then(async () => {
          const writes: Array<() => void> = [];
          const tx = {
            get: async (ref: { path: string }) => ({
              exists: store.has(ref.path),
              data: () => store.get(ref.path),
            }),
            create: (ref: { path: string }, data: Record<string, unknown>) => {
              if (store.has(ref.path)) throw new Error('already-exists');
              writes.push(() => store.set(ref.path, { ...data }));
            },
            set: (ref: { path: string }, data: Record<string, unknown>) => {
              writes.push(() => store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data }));
            },
          };
          const result = await work(tx);
          writes.forEach((write) => write());
          return result;
        });
        lock = run.then(() => undefined, () => undefined);
        return run;
      },
    };
    const feedbackRef = { path: 'feedback/attempt-1' };
    const quotaRef = { path: 'quota/user-day' };
    const identity = { stableUid: 'stable-1', authUid: 'auth-1', utcDay: '2026-08-25' };
    const original = {
      message: 'original', status: 'new', createdAtMs: 100,
      aiSummaryConsent: true, aiSummaryConsentVersion: 'feedback-ai-summary-v2',
    };
    const alteredRetry = {
      message: 'changed', status: 'new', createdAtMs: 999,
      aiSummaryConsent: false, aiSummaryConsentVersion: null,
    };

    const outcomes = await Promise.all([
      feedbackEntries.commitFeedbackEntryWithQuota(
        db as never, feedbackRef as never, quotaRef as never, original, identity, 100,
      ),
      feedbackEntries.commitFeedbackEntryWithQuota(
        db as never, feedbackRef as never, quotaRef as never, alteredRetry, identity, 999,
      ),
    ]);

    expect(outcomes.sort()).toEqual([false, true]);
    expect(store.get(feedbackRef.path)).toEqual(original);
    expect(store.get(quotaRef.path)).toMatchObject({
      count: 1, utcDay: '2026-08-25', stableUid: 'stable-1', authUid: 'auth-1',
    });
  });

  it('rejects a new receipt at the daily cap but still allows an existing replay', async () => {
    const feedbackRef = { path: 'feedback/new' };
    const quotaRef = { path: 'quota/full' };
    const store = new Map<string, Record<string, unknown>>([
      [quotaRef.path, { utcDay: '2026-08-25', count: feedbackEntries.FEEDBACK_DAILY_SUBMISSION_LIMIT }],
    ]);
    const db = {
      runTransaction: async (work: (tx: any) => Promise<unknown>) => work({
        get: async (ref: { path: string }) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
        create: jest.fn(),
        set: jest.fn(),
      }),
    };
    const args = [
      db as never, feedbackRef as never, quotaRef as never, { status: 'new' },
      { stableUid: 'stable-1', authUid: 'auth-1', utcDay: '2026-08-25' }, 100,
    ] as const;

    await expect(feedbackEntries.commitFeedbackEntryWithQuota(...args))
      .rejects.toMatchObject({ code: 'resource-exhausted', message: 'feedback_daily_limit' });
    store.set(feedbackRef.path, { status: 'handled', createdAtMs: 1, aiSummaryConsent: true });
    await expect(feedbackEntries.commitFeedbackEntryWithQuota(...args)).resolves.toBe(true);
    expect(store.get(feedbackRef.path)).toMatchObject({ status: 'handled', createdAtMs: 1, aiSummaryConsent: true });
  });

  it('reuses one bounded quota document and resets its count on a new UTC day', async () => {
    const feedbackRef = { path: 'feedback/new-day' };
    const quotaRef = { path: 'quota/stable-1' };
    const created = jest.fn();
    const set = jest.fn();
    const db = {
      runTransaction: async (work: (tx: any) => Promise<unknown>) => work({
        get: async (ref: { path: string }) => ref.path === feedbackRef.path
          ? { exists: false, data: () => undefined }
          : { exists: true, data: () => ({
            utcDay: '2026-08-24', count: feedbackEntries.FEEDBACK_DAILY_SUBMISSION_LIMIT,
          }) },
        create: created,
        set,
      }),
    };

    await expect(feedbackEntries.commitFeedbackEntryWithQuota(
      db as never,
      feedbackRef as never,
      quotaRef as never,
      { status: 'new' },
      { stableUid: 'stable-1', authUid: 'auth-1', utcDay: '2026-08-25' },
      100,
    )).resolves.toBe(false);
    expect(created).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(quotaRef, expect.objectContaining({
      utcDay: '2026-08-25', count: 1,
    }), { merge: true });
  });
});

describe('FEEDBACK_KINDS', () => {
  it('covers every screen the owner asked for (lesson/vocab/dialogue/arena_blitz/arena_rating)', () => {
    expect([...FEEDBACK_KINDS].sort()).toEqual(
      ['arena_blitz', 'arena_rating', 'dialogue', 'lesson', 'vocab'].sort(),
    );
  });
});
