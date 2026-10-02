import {
  claimDialogueV2SessionTerminal,
  completeDialogueV2SessionTerminal,
  DialogueV2SessionTerminalError,
  releaseDialogueV2SessionTerminalClaim,
  stageDialogueV2SessionTerminalAssessment,
} from './dialogue_v2_session_terminal_store';

class FakeTimestamp {
  constructor(private readonly millis: number) {}
  toMillis() { return this.millis; }
}

type Ref = Readonly<{ path: string }>;

class FakeFirestore {
  readonly documents = new Map<string, Record<string, unknown>>();
  doc(path: string): Ref { return { path }; }
  async runTransaction<T>(work: (transaction: {
    get(ref: Ref): Promise<{ exists: boolean; data(): unknown }>;
    create(ref: Ref, value: Record<string, unknown>): void;
    set(ref: Ref, value: Record<string, unknown>): void;
    delete(ref: Ref): void;
  }) => Promise<T>): Promise<T> {
    const staged = new Map<string, Record<string, unknown>>();
    const deleted = new Set<string>();
    const result = await work({
      get: async (ref) => ({ exists: this.documents.has(ref.path), data: () => this.documents.get(ref.path) }),
      create: (ref, value) => { staged.set(ref.path, value); },
      set: (ref, value) => { staged.set(ref.path, value); },
      delete: (ref) => { deleted.add(ref.path); },
    });
    for (const path of deleted) this.documents.delete(path);
    for (const [path, value] of staged) this.documents.set(path, value);
    return result;
  }
}

const SESSION_ID = 'd2s_abcdefghijklmnopqrstuvwxyz123456';
const NOW = 2_000_000;
const OWNER = 'a'.repeat(64);
const releaseSnapshot = Object.freeze({
  schemaVersion: 1 as const,
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  packVersion: 'dialogues_v2_2026_09_26',
  packSha256: 'a'.repeat(64),
  catalogueSha256: 'b'.repeat(64),
  reviewReceiptSha256: 'c'.repeat(64),
  objectives: Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze({
    id: `objective_0${index + 1}`,
    label: `Step ${index + 1}`,
  }))),
  personas: Object.freeze([Object.freeze({
    id: 'mia', displayName: 'Mia', replyStyle: 'warm', voiceMode: 'text_only',
    styleNote: 'Warm and concise.', mood: 'open', correctionStyle: 'gentle',
  })]),
});

function runtime() {
  const db = new FakeFirestore();
  db.documents.set(`dialogue_v2_sessions/${SESSION_ID}`, {
    schemaVersion: 1,
    sessionId: SESSION_ID,
    ownerBinding: OWNER,
    studyTarget: 'en',
    scenarioId: 'social_01',
    createdAt: new FakeTimestamp(NOW - 1_000),
    expiresAt: new FakeTimestamp(NOW + 120_000),
    revision: 1,
    turns: [{
      turnId: 'd2t_abcdefghijklmnop',
      userText: 'A sufficiently long learner message.',
      assistantReplies: [{ personaId: 'mia', text: 'A reply.' }],
    }],
    receipts: [],
  });
  return {
    db,
    runtime: {
      db: db as never,
      timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as never,
    },
  };
}

const claim = {
  sessionId: SESSION_ID,
  ownerBinding: OWNER,
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  interfaceLang: 'en',
  nowMs: NOW,
  claimToken: `d2c_${'A'.repeat(32)}`,
};

describe('Dialogue V2 authoritative terminal store', () => {
  // зачем (баг 02.10, прод: итог диалога — session_invalid на claim): журнал ходов пишет
  // groupState в документ сессии; итог обязан принимать и старую, и текущую форму.
  test('claims a current session document that carries groupState', async () => {
    const setup = runtime();
    const key = `dialogue_v2_sessions/${SESSION_ID}`;
    setup.db.documents.set(key, {
      ...(setup.db.documents.get(key) as Record<string, unknown>),
      groupState: { schemaVersion: 1, turnCount: 1, lastSpeakerId: 'mia', relevanceByPersonaId: { mia: 1 } },
    });
    const first = await claimDialogueV2SessionTerminal(setup.runtime, claim);
    expect(first.kind).toBe('new');
  });

  test('still rejects an unknown extra field in the session document', async () => {
    const setup = runtime();
    const key = `dialogue_v2_sessions/${SESSION_ID}`;
    setup.db.documents.set(key, { ...(setup.db.documents.get(key) as Record<string, unknown>), unexpected: true });
    await expect(claimDialogueV2SessionTerminal(setup.runtime, claim))
      .rejects.toEqual(new DialogueV2SessionTerminalError('session_invalid'));
  });

  test('atomically claims the session before assessment and blocks concurrent claims', async () => {
    const setup = runtime();
    const first = await claimDialogueV2SessionTerminal(setup.runtime, claim);
    expect(first.kind).toBe('new');
    expect(first.session).toMatchObject({ sessionId: SESSION_ID, turns: expect.any(Array) });
    await expect(claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim, claimToken: `d2c_${'B'.repeat(32)}`,
    })).rejects.toEqual(new DialogueV2SessionTerminalError('completion_in_progress'));
    expect(setup.db.documents.get(`dialogue_v2_session_terminals/${SESSION_ID}`)).toMatchObject({
      state: 'pending', ownerBinding: OWNER, studyTarget: 'en', scenarioId: 'social_01',
    });
  });

  test('stores no transcript in the replay receipt and returns the same completed assessment', async () => {
    const setup = runtime();
    await claimDialogueV2SessionTerminal(setup.runtime, claim);
    const assessmentRaw = JSON.stringify({
      overallAssessment: 'A detailed assessment grounded in this conversation.',
      nextStep: 'Add one specific detail next time.',
      languageNote: null,
    });
    await stageDialogueV2SessionTerminalAssessment(setup.runtime, {
      ...claim, assessmentRaw, releaseSnapshot,
    });
    await completeDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      assessmentRaw,
      releaseSnapshot,
      memoryReceipt: { sharedMemoryStored: true, scenarioCheckpointStored: false },
    });
    const replay = await claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim, claimToken: `d2c_${'C'.repeat(32)}`,
    });
    expect(replay).toMatchObject({ kind: 'replay', assessmentRaw, releaseSnapshot, memoryReceipt: {
      sharedMemoryStored: true, scenarioCheckpointStored: false,
    } });
    const stored = setup.db.documents.get(`dialogue_v2_session_terminals/${SESSION_ID}`);
    expect(JSON.stringify(stored)).not.toContain('learner message');
    expect(stored).not.toHaveProperty('turns');
    expect(stored).not.toHaveProperty('history');
    expect(stored).not.toHaveProperty('transcript');
    expect(stored?.releaseSnapshot).toEqual(releaseSnapshot);
  });

  test('fails closed for wrong owner, selection, expiry and malformed terminal receipt', async () => {
    const setup = runtime();
    await expect(claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim, ownerBinding: 'b'.repeat(64),
    })).rejects.toEqual(new DialogueV2SessionTerminalError('access_denied'));
    await expect(claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim, scenarioId: 'social_02',
    })).rejects.toEqual(new DialogueV2SessionTerminalError('selection_mismatch'));
    const session = setup.db.documents.get(`dialogue_v2_sessions/${SESSION_ID}`)!;
    setup.db.documents.set(`dialogue_v2_sessions/${SESSION_ID}`, {
      ...session, expiresAt: new FakeTimestamp(NOW),
    });
    await expect(claimDialogueV2SessionTerminal(setup.runtime, claim)).rejects.toEqual(
      new DialogueV2SessionTerminalError('session_expired'),
    );
  });

  test('rejects a replay in another interface language so the envelope stays byte-stable', async () => {
    const setup = runtime();
    await claimDialogueV2SessionTerminal(setup.runtime, claim);
    const assessmentRaw = JSON.stringify({
      overallAssessment: 'A detailed assessment grounded in this conversation.',
      nextStep: 'Add one specific detail next time.',
      languageNote: null,
      objectiveResults: [],
    });
    await stageDialogueV2SessionTerminalAssessment(setup.runtime, {
      ...claim, assessmentRaw, releaseSnapshot,
    });
    await completeDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      assessmentRaw,
      releaseSnapshot,
      memoryReceipt: { sharedMemoryStored: true, scenarioCheckpointStored: false },
    });
    await expect(claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      interfaceLang: 'de',
      claimToken: `d2c_${'D'.repeat(32)}`,
    })).rejects.toEqual(new DialogueV2SessionTerminalError('selection_mismatch'));
  });

  test('does not claim completion while a turn transaction is still in progress', async () => {
    const setup = runtime();
    const sessionPath = `dialogue_v2_sessions/${SESSION_ID}`;
    setup.db.documents.set(sessionPath, {
      ...setup.db.documents.get(sessionPath)!,
      receipts: [{
        turnId: 'd2t_pendingabcdefgh',
        requestDigest: 'a'.repeat(64),
        claimToken: `d2c_${'Z'.repeat(32)}`,
        claimExpiresAtMs: NOW + 10_000,
        state: 'pending',
      }],
    });
    await expect(claimDialogueV2SessionTerminal(setup.runtime, claim)).rejects.toEqual(
      new DialogueV2SessionTerminalError('completion_in_progress'),
    );
    expect(setup.db.documents.has(`dialogue_v2_session_terminals/${SESSION_ID}`)).toBe(false);
  });

  test('releases only the exact unassessed claim after a safe pre-result failure', async () => {
    const setup = runtime();
    await claimDialogueV2SessionTerminal(setup.runtime, claim);
    await expect(releaseDialogueV2SessionTerminalClaim(setup.runtime, {
      ...claim, claimToken: `d2c_${'B'.repeat(32)}`,
    })).resolves.toBe(false);
    expect(setup.db.documents.has(`dialogue_v2_session_terminals/${SESSION_ID}`)).toBe(true);
    await expect(releaseDialogueV2SessionTerminalClaim(setup.runtime, claim)).resolves.toBe(true);
    expect(setup.db.documents.has(`dialogue_v2_session_terminals/${SESSION_ID}`)).toBe(false);
  });

  test('stages one validated assessment and resumes it after the lease without provider regeneration', async () => {
    const setup = runtime();
    const assessmentRaw = JSON.stringify({
      overallAssessment: 'A detailed assessment grounded in this conversation.',
      nextStep: 'Add one specific detail next time.',
      languageNote: null,
    });
    await claimDialogueV2SessionTerminal(setup.runtime, claim);
    await stageDialogueV2SessionTerminalAssessment(setup.runtime, {
      ...claim, assessmentRaw, releaseSnapshot,
    });
    await expect(releaseDialogueV2SessionTerminalClaim(setup.runtime, claim)).resolves.toBe(false);
    const resumed = await claimDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      nowMs: NOW + 60_001,
      claimToken: `d2c_${'R'.repeat(32)}`,
    });
    expect(resumed).toMatchObject({ kind: 'resume', assessmentRaw, releaseSnapshot });
  });

  test('publishes memory and the completed terminal atomically', async () => {
    const setup = runtime();
    const assessmentRaw = JSON.stringify({
      overallAssessment: 'A detailed assessment grounded in this conversation.',
      nextStep: 'Add one specific detail next time.',
      languageNote: null,
    });
    await claimDialogueV2SessionTerminal(setup.runtime, claim);
    await stageDialogueV2SessionTerminalAssessment(setup.runtime, {
      ...claim, assessmentRaw, releaseSnapshot,
    });
    const memoryRef = setup.db.doc('users/stable/dialogue_v2_memory/d2m_test');
    await expect(completeDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      assessmentRaw,
      releaseSnapshot,
      memoryReceipt: { sharedMemoryStored: true, scenarioCheckpointStored: false },
      publishMemory: async (transaction) => {
        transaction.set(memoryRef, { safe: true });
        throw new Error('memory_commit_failed');
      },
    })).rejects.toEqual(new DialogueV2SessionTerminalError('store_unavailable'));
    expect(setup.db.documents.has(memoryRef.path)).toBe(false);
    expect(setup.db.documents.get(`dialogue_v2_session_terminals/${SESSION_ID}`)).toMatchObject({
      state: 'pending', assessmentRaw,
    });

    await completeDialogueV2SessionTerminal(setup.runtime, {
      ...claim,
      assessmentRaw,
      releaseSnapshot,
      memoryReceipt: { sharedMemoryStored: true, scenarioCheckpointStored: false },
      publishMemory: async (transaction) => {
        transaction.set(memoryRef, { safe: true });
      },
    });
    expect(setup.db.documents.get(memoryRef.path)).toEqual({ safe: true });
    expect(setup.db.documents.get(`dialogue_v2_session_terminals/${SESSION_ID}`)).toMatchObject({
      state: 'completed', assessmentRaw,
    });
  });
});
