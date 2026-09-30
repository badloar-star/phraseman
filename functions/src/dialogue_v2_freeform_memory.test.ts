import { accountDeletePermanentDenialId } from './account_delete_job';
import * as languagePackModuleExports from '../../shared/dialogue_v2_language_pack_contract';
import {
  DIALOGUE_V2_FREEFORM_MEMORY_MAX_BYTES,
  DialogueV2FreeformMemoryError,
  createDialogueV2FreeformMemoryWriteCapability,
  deleteDialogueV2FreeformMemory,
  parseDialogueV2FreeformMemoryDraft,
  readDialogueV2FreeformMemory,
  readDialogueV2FreeformMemoryWithActor,
  writeDialogueV2FreeformMemory,
} from './dialogue_v2_freeform_memory';

type DocData = Record<string, unknown>;
type Store = Record<string, DocData | undefined>;

type DocRef = Readonly<{
  kind: 'doc';
  path: string;
  id: string;
  get(): Promise<never>;
}>;

type QueryRef = Readonly<{
  kind: 'query';
  collectionName: string;
  field: string;
  op: string;
  value: unknown;
  limitValue: number;
  get(): Promise<never>;
}>;

class FakeTimestamp {
  constructor(readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

function makeHarness(initial: Store, beforeTransaction: (store: Store) => void = () => undefined) {
  const store: Store = { ...initial };
  const reads: string[] = [];
  const writes: { path: string; value: DocData }[] = [];
  const deletes: string[] = [];
  let transactionCount = 0;

  const snapshot = (reference: DocRef, data: DocData | undefined) => ({
    id: reference.id,
    exists: data !== undefined,
    data: () => data,
  });
  const doc = (path: string): DocRef => ({
    kind: 'doc',
    path,
    id: path.split('/').at(-1) ?? '',
    get: async () => { throw new Error('outside_transaction_read'); },
  });
  const collection = (collectionName: string) => ({
    doc: (id: string) => doc(`${collectionName}/${id}`),
    where: (field: string, op: string, value: unknown) => ({
      limit: (limitValue: number): QueryRef => ({
        kind: 'query', collectionName, field, op, value, limitValue,
        get: async () => { throw new Error('outside_transaction_read'); },
      }),
    }),
  });
  const transaction = {
    get: jest.fn(async (target: DocRef | QueryRef) => {
      if (target.kind === 'doc') {
        reads.push(target.path);
        return snapshot(target, store[target.path]);
      }
      reads.push(`query:${target.collectionName}:${target.field}:${String(target.value)}`);
      const documents = Object.entries(store)
        .filter(([path]) => path.startsWith(`${target.collectionName}/`))
        .filter(([, value]) => value?.[target.field] === target.value)
        .slice(0, target.limitValue)
        .map(([path, value]) => snapshot(doc(path), value));
      return { empty: documents.length === 0, docs: documents };
    }),
    getAll: jest.fn(async (...references: DocRef[]) => references.map((reference) => (
      snapshot(reference, store[reference.path])
    ))),
    set: jest.fn((reference: DocRef, value: DocData) => {
      writes.push({ path: reference.path, value });
      store[reference.path] = value;
    }),
    create: jest.fn(() => undefined),
    update: jest.fn(() => undefined),
    delete: jest.fn((reference: DocRef) => {
      deletes.push(reference.path);
      delete store[reference.path];
    }),
  };
  const db = {
    doc,
    collection,
    runTransaction: jest.fn(async <T>(operation: (tx: typeof transaction) => Promise<T>) => {
      transactionCount += 1;
      beforeTransaction(store);
      return operation(transaction);
    }),
  };

  return {
    db,
    reads,
    writes,
    deletes,
    store,
    transaction,
    get transactionCount() { return transactionCount; },
  };
}

const NOW_MS = 2_000_000_000_000;
const AUTH_UID = 'auth-user';
const STABLE_UID = 'stable-user';

function activeStore(extra: Store = {}): Store {
  return {
    [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_UID },
    [`users/${STABLE_UID}`]: {
      firebaseAuthUid: AUTH_UID,
      progress: { premium_plan: 'monthly', premium_expiry: '0' },
    },
    [`account_deletion_auth_markers/${AUTH_UID}`]: undefined,
    [`account_deletion_tombstones/${STABLE_UID}`]: undefined,
    [`account_deletion_permanent_denials/${accountDeletePermanentDenialId(AUTH_UID)}`]: undefined,
    [`account_deletion_permanent_denials/${accountDeletePermanentDenialId(STABLE_UID)}`]: undefined,
    ...extra,
  };
}

function runtime(harness: ReturnType<typeof makeHarness>) {
  return {
    db: harness.db as never,
    nowMs: () => NOW_MS,
    timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as never,
  };
}

function validDraft() {
  return {
    learnerProfile: {
      preferredRegister: 'casual',
      correctionStyle: 'gentle',
      interests: ['travel', 'product design'],
    },
    recurringPatterns: [
      {
        category: 'grammar',
        observation: 'Often switches tense while describing past events',
        guidance: 'Keep the narrative anchored in the simple past',
      },
    ],
    recentTopics: ['weekend plans', 'restaurant recommendations'],
  } as const;
}

function writeCapability(draft: unknown = validDraft()) {
  const capability = createDialogueV2FreeformMemoryWriteCapability(
    draft,
    [
      'We discussed planning a short holiday and choosing a hotel.',
      'The learner compared two menus before choosing a restaurant.',
    ],
  );
  if (!capability) throw new Error('expected_memory_write_capability');
  return capability;
}

describe('Dialogue V2 Plus freeform permanent memory contract', () => {
  test('accepts a bounded structured draft and freezes its canonical copy', () => {
    const parsed = parseDialogueV2FreeformMemoryDraft(validDraft());

    expect(parsed).toEqual(validDraft());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.learnerProfile)).toBe(true);
    expect(Object.isFrozen(parsed?.recurringPatterns)).toBe(true);
  });

  test.each([
    [{ ...validDraft(), rawTranscript: 'learner: private message' }],
    [{ ...validDraft(), scenarioId: 'social_intro_a1' }],
    [{ ...validDraft(), goals: ['finish task'] }],
    [{ ...validDraft(), recentTopics: ['User: here is my exact message'] }],
    [{ ...validDraft(), recentTopics: ['first line\nsecond line'] }],
    [{ ...validDraft(), recurringPatterns: [{
      category: 'grammar',
      observation: 'x'.repeat(121),
      guidance: 'short',
    }] }],
    [{ ...validDraft(), recentTopics: Array.from({ length: 9 }, (_, i) => `topic ${i}`) }],
  ])('rejects transcript-shaped, forbidden-key or over-cap memory', (candidate) => {
    expect(parseDialogueV2FreeformMemoryDraft(candidate)).toBeNull();
  });

  test.each([
    ['interest', (utterance: string) => ({
      ...validDraft(),
      learnerProfile: { ...validDraft().learnerProfile, interests: [utterance] },
    })],
    ['pattern observation', (utterance: string) => ({
      ...validDraft(),
      recurringPatterns: [{
        ...validDraft().recurringPatterns[0],
        observation: utterance,
      }],
    })],
    ['pattern guidance', (utterance: string) => ({
      ...validDraft(),
      recurringPatterns: [{
        ...validDraft().recurringPatterns[0],
        guidance: utterance,
      }],
    })],
    ['recent topic', (utterance: string) => ({
      ...validDraft(), recentTopics: [utterance],
    })],
  ] as const)('rejects verbatim learner utterances in %s', (_label, candidate) => {
    for (const utterance of [
      'I went to Dublin last weekend',
      'Could you please send me your home address',
    ]) {
      expect(parseDialogueV2FreeformMemoryDraft(candidate(utterance))).toBeNull();
    }
  });

  test('issues an opaque write capability only when summaries do not retain raw learner n-grams', () => {
    expect(writeCapability()).toBeTruthy();
    expect(createDialogueV2FreeformMemoryWriteCapability(
      { ...validDraft(), recentTopics: ['Dublin last weekend'] },
      ['I went to Dublin last weekend'],
    )).toBeNull();
    expect(createDialogueV2FreeformMemoryWriteCapability(
      validDraft(),
      [],
    )).toBeNull();
  });

  test('keeps the serialized prompt memory below its hard byte ceiling', () => {
    const parsed = parseDialogueV2FreeformMemoryDraft(validDraft());
    expect(Buffer.byteLength(JSON.stringify(parsed), 'utf8'))
      .toBeLessThanOrEqual(DIALOGUE_V2_FREEFORM_MEMORY_MAX_BYTES);
  });
});

describe('Dialogue V2 Plus freeform permanent memory repository', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  test.each(['en', 'es', 'fr', 'de'] as const)(
    'writes %s memory under the server-derived stable-account path in one transaction',
    async (studyTarget) => {
      const harness = makeHarness(activeStore());

      await expect(writeDialogueV2FreeformMemory(
        runtime(harness),
        AUTH_UID,
        studyTarget,
        writeCapability(),
        0,
      )).resolves.toMatchObject({
        schemaVersion: 1,
        kind: 'dialogue_v2_plus_freeform_memory',
        studyTarget,
        revision: 1,
        updatedAtMs: NOW_MS,
      });

      expect(harness.transactionCount).toBe(1);
      expect(harness.writes).toHaveLength(1);
      expect(harness.writes[0]?.path).toBe(
        `users/${STABLE_UID}/dialogue_v2_freeform_memory/${studyTarget}`,
      );
      expect(harness.writes[0]?.value).not.toHaveProperty('authUid');
      expect(harness.writes[0]?.value).not.toHaveProperty('stableAccountId');
      expect(harness.writes[0]?.value).not.toHaveProperty('messages');
      expect(harness.writes[0]?.value).not.toHaveProperty('scenarioId');
    },
  );

  test('returns null for absent memory after rechecking identity, deletion fences and Plus', async () => {
    const harness = makeHarness(activeStore());

    await expect(readDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'en'))
      .resolves.toBeNull();

    expect(harness.transactionCount).toBe(1);
    expect(harness.reads).toEqual(expect.arrayContaining([
      `auth_links/${AUTH_UID}`,
      `users/${STABLE_UID}`,
      `account_deletion_auth_markers/${AUTH_UID}`,
      `account_deletion_tombstones/${STABLE_UID}`,
      `users/${STABLE_UID}/dialogue_v2_freeform_memory/en`,
    ]));
    expect(harness.writes).toEqual([]);
  });

  test('returns memory with the canonical actor selected in the same transaction', async () => {
    const harness = makeHarness(activeStore());
    await writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'es', writeCapability(), 0,
    );

    const envelope = await readDialogueV2FreeformMemoryWithActor(
      runtime(harness), AUTH_UID, 'es',
    );

    expect(envelope).toMatchObject({
      actor: { authUid: AUTH_UID, stableAccountId: STABLE_UID },
      memory: { studyTarget: 'es', revision: 1 },
    });
    expect(Object.keys(envelope)).toEqual(['actor', 'memory']);
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.actor)).toBe(true);
  });

  test('round-trips strict memory and increments revision only with the expected revision', async () => {
    const harness = makeHarness(activeStore());
    await writeDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'fr', writeCapability(), 0);

    const first = await readDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'fr');
    expect(first).toMatchObject({ revision: 1, studyTarget: 'fr' });

    const changed = {
      ...validDraft(),
      recentTopics: ['public speaking'],
    };
    const second = await writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'fr', writeCapability(changed), 1,
    );
    expect(second).toMatchObject({ revision: 2, recentTopics: ['public speaking'] });

    await expect(writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'fr', writeCapability(), 1,
    )).rejects.toMatchObject({ code: 'revision_conflict' });
  });

  test.each([
    ['auth deletion marker', {
      [`account_deletion_auth_markers/${AUTH_UID}`]: { status: 'pending' },
    }],
    ['stable deletion tombstone', {
      [`account_deletion_tombstones/${STABLE_UID}`]: { status: 'pending' },
    }],
    ['auth permanent denial', {
      [`account_deletion_permanent_denials/${accountDeletePermanentDenialId(AUTH_UID)}`]: {
        status: 'closure_fenced',
      },
    }],
    ['stable permanent denial', {
      [`account_deletion_permanent_denials/${accountDeletePermanentDenialId(STABLE_UID)}`]: {
        status: 'closure_fenced',
      },
    }],
  ])('denies %s before reading or writing memory', async (_label, extra) => {
    const harness = makeHarness(activeStore(extra));

    await expect(readDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'de'))
      .rejects.toMatchObject({ code: 'access_denied' });
    expect(harness.reads).not.toContain(
      `users/${STABLE_UID}/dialogue_v2_freeform_memory/de`,
    );
    expect(harness.writes).toEqual([]);
  });

  test('denies a non-Plus account before memory access', async () => {
    const harness = makeHarness(activeStore({
      [`users/${STABLE_UID}`]: {
        firebaseAuthUid: AUTH_UID,
        progress: { premium_plan: 'free', premium_expiry: '0' },
      },
    }));

    await expect(writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'en', writeCapability(), 0,
    )).rejects.toMatchObject({ code: 'plus_required' });
    expect(harness.writes).toEqual([]);
  });

  test('fails closed on malformed stored data and does not overwrite it', async () => {
    const memoryPath = `users/${STABLE_UID}/dialogue_v2_freeform_memory/en`;
    const harness = makeHarness(activeStore({
      [memoryPath]: {
        schemaVersion: 1,
        kind: 'dialogue_v2_plus_freeform_memory',
        studyTarget: 'en',
        revision: 1,
        updatedAt: new FakeTimestamp(NOW_MS),
        learnerProfile: validDraft().learnerProfile,
        recurringPatterns: validDraft().recurringPatterns,
        recentTopics: validDraft().recentTopics,
        rawTranscript: 'must never be accepted',
      },
    }));

    await expect(readDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'en'))
      .rejects.toMatchObject({ code: 'storage_invalid' });
    expect(harness.writes).toEqual([]);
  });

  test('rejects invalid auth, language, draft and expected revision before opening a transaction', async () => {
    const harness = makeHarness(activeStore());

    await expect(readDialogueV2FreeformMemory(runtime(harness), 'bad/auth', 'en'))
      .rejects.toBeInstanceOf(DialogueV2FreeformMemoryError);
    await expect(readDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'it' as never))
      .rejects.toMatchObject({ code: 'request_invalid' });
    await expect(writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'en', { messages: ['raw'] }, 0,
    )).rejects.toMatchObject({ code: 'request_invalid' });
    await expect(writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'en', writeCapability(), -1,
    )).rejects.toMatchObject({ code: 'request_invalid' });
    expect(harness.transactionCount).toBe(0);
  });

  test('a deletion race at transaction start denies access and produces no write', async () => {
    const harness = makeHarness(activeStore(), (store) => {
      store[`account_deletion_tombstones/${STABLE_UID}`] = { status: 'pending' };
    });

    await expect(writeDialogueV2FreeformMemory(
      runtime(harness), AUTH_UID, 'es', writeCapability(), 0,
    )).rejects.toMatchObject({ code: 'access_denied' });
    expect(harness.writes).toEqual([]);
  });

  test('ignores a hostile post-load mutation of the shared study-target export', async () => {
    const mutableTargets = (
      languagePackModuleExports.DIALOGUE_V2_STUDY_TARGETS as unknown as string[]
    );
    mutableTargets.push('it');
    const harness = makeHarness(activeStore());

    try {
      await expect(readDialogueV2FreeformMemory(
        runtime(harness), AUTH_UID, 'it' as never,
      )).rejects.toMatchObject({ code: 'request_invalid' });
      expect(harness.transactionCount).toBe(0);
    } finally {
      mutableTargets.pop();
    }
  });

  test('lets an authenticated downgraded owner erase one language without reading it', async () => {
    const memoryPath = `users/${STABLE_UID}/dialogue_v2_freeform_memory/de`;
    const harness = makeHarness(activeStore({
      [`users/${STABLE_UID}`]: {
        firebaseAuthUid: AUTH_UID,
        progress: { premium_plan: 'free', premium_expiry: '0' },
      },
      [memoryPath]: { private: 'must not be read by delete-only flow' },
    }));

    await expect(deleteDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'de'))
      .resolves.toBeUndefined();

    expect(harness.reads).not.toContain(memoryPath);
    expect(harness.deletes).toEqual([memoryPath]);
    expect(harness.writes).toEqual([]);
  });

  test('delete-only fails closed for a cross-owner stable account', async () => {
    const harness = makeHarness(activeStore({
      [`users/${STABLE_UID}`]: {
        firebaseAuthUid: 'different-auth-owner',
        progress: { premium_plan: 'free', premium_expiry: '0' },
      },
    }));

    await expect(deleteDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'en'))
      .rejects.toMatchObject({ code: 'access_denied' });
    expect(harness.deletes).toEqual([]);
  });

  test.each([
    ['auth deletion', {
      [`account_deletion_auth_markers/${AUTH_UID}`]: { status: 'deleted' },
    }],
    ['stable deletion', {
      [`account_deletion_tombstones/${STABLE_UID}`]: { status: 'deleted' },
    }],
  ])('delete-only fails closed for %s', async (_label, extra) => {
    const harness = makeHarness(activeStore(extra));

    await expect(deleteDialogueV2FreeformMemory(runtime(harness), AUTH_UID, 'en'))
      .rejects.toMatchObject({ code: 'access_denied' });
    expect(harness.deletes).toEqual([]);
  });
});
