import { callSemanticProviderForJob } from './admin_tournament_tasks';
import { createTournamentSemanticCandidate } from './tournament_semantic_contract';

type Data = Record<string, any>;

class Snapshot {
  constructor(readonly value: Data | undefined) {}
  get exists() { return this.value !== undefined; }
  data() { return this.value === undefined ? undefined : structuredClone(this.value); }
  get(field: string) { return this.value?.[field]; }
}

class Ref {
  constructor(readonly db: FakeFirestore, readonly path: string) {}
  collection(name: string) { return new Collection(this.db, `${this.path}/${name}`); }
}

class Collection {
  constructor(readonly db: FakeFirestore, readonly path: string) {}
  doc(id: string) { return new Ref(this.db, `${this.path}/${id}`); }
}

class FakeTransaction {
  constructor(readonly db: FakeFirestore) {}
  async get(ref: Ref) { return new Snapshot(this.db.rows.get(ref.path)); }
  set(ref: Ref, value: Data, options?: { merge?: boolean }) {
    const next = structuredClone(value);
    this.db.rows.set(ref.path, options?.merge ? { ...(this.db.rows.get(ref.path) ?? {}), ...next } : next);
  }
  create(ref: Ref, value: Data) {
    if (this.db.rows.has(ref.path)) throw new Error('already_exists');
    this.db.rows.set(ref.path, structuredClone(value));
  }
}

class FakeFirestore {
  readonly rows = new Map<string, Data>();
  collection(name: string) { return new Collection(this, name); }
  async runTransaction<T>(run: (tx: FakeTransaction) => Promise<T>) { return run(new FakeTransaction(this)); }
}

describe('semantic provider returned-response lease fence', () => {
  it('persists no response, billing, receipt, or checkpoint after the lease changes during the provider await', async () => {
    const db = new FakeFirestore();
    const jobId = `tsj_${'a'.repeat(64)}`;
    const jobPath = `tournament_semantic_jobs/${jobId}`;
    db.rows.set(jobPath, {
      lifecycle: 'running',
      cursor: 7,
      lease: { token: 'lease-a', expiresAtMs: Date.now() + 60_000 },
    });
    const candidate = createTournamentSemanticCandidate({
      candidateId: 'lease-race-candidate', mode: 'guess_phrase', difficulty: 1,
      prompt: 'Choose the reviewed answer.', context: { topic: 'lease race' },
      reviewSubjects: Array.from({ length: 4 }, (_, index) => ({
        subjectId: `option_${index}`, kind: 'choice_option' as const,
        declaredRole: index === 0 ? 'correct' as const : 'distractor' as const,
        text: `option-${index}`,
        ...(index === 0 ? {} : {
          trapType: 'agreement' as const,
          reason: 'The subject and verb do not agree.',
        }),
        metadata: { partOfSpeech: 'verb', grammaticality: index === 0 ? 'valid' : 'invalid', minimalTwin: 'true' },
      })),
      provenanceKeys: ['fixture:1:lease-race'],
    });

    await expect(callSemanticProviderForJob({
      db: db as never,
      config: { semanticDailyRequestCap: 10 } as never,
      active: { jobId, leaseToken: 'lease-a' },
      candidate,
      request: {
        pass: 'primary', model: 'gpt-4.1-mini', promptVersion: 'p1', prompt: 'review',
        contentSha256: candidate.contentSha256,
      } as never,
      invokeProvider: async () => {
        db.rows.set(jobPath, {
          ...db.rows.get(jobPath),
          lease: { token: 'lease-b', expiresAtMs: Date.now() + 60_000 },
        });
        return { raw: { verdict: 'PASS' }, inputTokens: 4, outputTokens: 2 };
      },
    })).rejects.toThrow('semantic_attempt_stale_lease');

    const attempt = [...db.rows.entries()].find(([path]) => path.includes('/attempts/'))?.[1];
    expect(attempt).toEqual(expect.objectContaining({ state: 'calling', leaseToken: 'lease-a' }));
    expect(attempt).not.toHaveProperty('structuredResult');
    expect([...db.rows.keys()].some((path) => path.includes('billing/'))).toBe(false);
    expect([...db.rows.keys()].some((path) => path.includes('/terminals/'))).toBe(false);
    expect(db.rows.get(jobPath)).toEqual(expect.objectContaining({ cursor: 7 }));
  });
});
