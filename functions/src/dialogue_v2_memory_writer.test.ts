import {
  buildDialogueV2MemoryWriteCommand,
  executeDialogueV2MemoryWrite,
  makeFirestoreDialogueV2MemoryRepository,
  persistDialogueV2CompletionMemory,
  persistDialogueV2MemoryCommand,
  prepareDialogueV2CompletionMemory,
  type DialogueV2MemoryPersistenceRepository,
  type DialogueV2MemoryWriteCommand,
  type DialogueV2MemoryWriteTrustedContext,
} from './dialogue_v2_memory_writer';
import type { DialogueV2MemoryPlan } from './dialogue_v2_memory_contract';
import type { DialogueV2LanguagePack } from '../../shared/dialogue_v2_language_pack_contract';
import type { DialogueV2CompletionEnvelope } from './dialogue_v2_completion_server';

const SHARED_MEMORY_ID = `d2m_${'a'.repeat(40)}`;
const OTHER_SHARED_MEMORY_ID = `d2m_${'b'.repeat(40)}`;
const THREAD_ID = `d2t_${'c'.repeat(40)}`;
const OTHER_THREAD_ID = `d2t_${'d'.repeat(40)}`;

const FREE_PLAN: DialogueV2MemoryPlan = {
  contractVersion: 'dialogue_v2_memory_v1',
  sharedMemory: {
    id: SHARED_MEMORY_ID,
    scope: 'account_language',
    studyTarget: 'es',
    format: 'structured_summary',
    rawTranscriptRetention: 'forbidden',
  },
  scenarioThread: null,
};

const PLUS_PLAN: DialogueV2MemoryPlan = {
  ...FREE_PLAN,
  scenarioThread: {
    id: THREAD_ID,
    scope: 'account_language_scenario',
    studyTarget: 'es',
    scenarioId: 'travel_19',
    resumable: true,
    format: 'structured_checkpoint',
    rawTranscriptRetention: 'forbidden',
  },
};

const MANIFEST_REFERENCE = {
  studyTarget: 'es',
  scenarioId: 'travel_19',
  packVersion: 'dialogues_v2_2026_09_26',
  packSha256: '1'.repeat(64),
  catalogueSha256: '2'.repeat(64),
  reviewReceiptSha256: '3'.repeat(64),
} as const;

const MEMORY_OBJECTIVE_IDS = [
  'polite_requests',
  'past_tense',
  'schedule_negotiation',
  'word_order',
  'articles',
  'travel_19_o1',
  'travel_19_o2',
] as const;

const MEMORY_ALLOWLIST = {
  objectiveIds: MEMORY_OBJECTIVE_IDS,
  personaStates: { concierge: ['calm', 'helpful', 'gentle'] },
} as const;

const APPROVED_LANGUAGE_PACK: DialogueV2LanguagePack = {
  studyTarget: 'es',
  packVersion: MANIFEST_REFERENCE.packVersion,
  packSha256: MANIFEST_REFERENCE.packSha256,
  catalogueSha256: MANIFEST_REFERENCE.catalogueSha256,
  reviewReceiptSha256: MANIFEST_REFERENCE.reviewReceiptSha256,
  scenario: {
    id: 'travel_19',
    worldId: 'travel',
    rankRequired: 19,
    cefr: 'C2',
    personas: [{
      id: 'concierge',
      replyStyle: 'calm',
      voiceMode: 'text_only',
      displayName: 'Conserje',
      styleNote: 'Responde con calma.',
      mood: 'helpful',
      correctionStyle: 'gentle',
    }],
    objectives: MEMORY_OBJECTIVE_IDS.map((id) => ({ id, label: `Practica ${id}` })),
    groupReplyPolicy: {
      maxDirectReplies: 1,
      maxUsefulFollowUps: 1,
      silenceAllowed: true,
    },
  },
  content: {
    title: 'Viaje avanzado',
    briefing: 'Practica una conversación segura durante el viaje.',
    completionTone: 'Buen trabajo.',
  },
  review: {
    targetContractGuardian: 'PASS',
    scenarioPackReviewer: 'PASS',
    promptLanguageJudge: 'PASS',
    voiceLocaleGate: 'PASS',
    stateIsolationJudge: 'PASS',
    surfaceMatrixGate: 'PASS',
  },
};

const COMPLETION_ENVELOPE: DialogueV2CompletionEnvelope = {
  feedback: {
    overallAssessment: 'Has resuelto la mayor parte de la situación.',
    nextStep: 'Vuelve a practicar los artículos.',
    speakerPersonaId: 'concierge',
    objectiveResults: MEMORY_OBJECTIVE_IDS.map((objectiveId, index) => ({
      objectiveId,
      status: index === 1 ? 'not_met' as const : 'met' as const,
      evidenceMessageIds: ['u_0001'],
    })),
    evidenceMessageIds: ['u_0001'],
    languageNote: null,
  },
  context: {
    objectiveIds: MEMORY_OBJECTIVE_IDS,
    personaIds: ['concierge'],
    userMessageIds: ['u_0001'],
  },
  objectiveLabels: Object.fromEntries(MEMORY_OBJECTIVE_IDS.map((id) => [id, `Practica ${id}`])),
  personaNames: { concierge: 'Conserje' },
  userMessages: { u_0001: 'Este texto del alumno nunca debe guardarse.' },
  evidenceNote: 'Mensaje de esta conversación.',
};

const FREE_TRUSTED_CONTEXT: DialogueV2MemoryWriteTrustedContext = {
  memoryPlan: FREE_PLAN,
  manifestReference: MANIFEST_REFERENCE,
  originScenarioId: 'travel_19',
  memoryAllowlist: MEMORY_ALLOWLIST,
};

const PLUS_TRUSTED_CONTEXT: DialogueV2MemoryWriteTrustedContext = {
  memoryPlan: PLUS_PLAN,
  manifestReference: MANIFEST_REFERENCE,
  originScenarioId: 'travel_19',
  memoryAllowlist: MEMORY_ALLOWLIST,
};

describe('Dialogue V2 memory persistence command builder', () => {
  test('requires a server-trusted origin scenario before accepting either memory scope', () => {
    expect(buildDialogueV2MemoryWriteCommand({
      ...FREE_TRUSTED_CONTEXT,
      originScenarioId: 'travel_19',
    } as unknown as DialogueV2MemoryWriteTrustedContext, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['past_tense'],
        completedObjectives: 4,
      },
    })).toMatchObject({ ok: true });
  });

  test('rejects missing or mismatched server-trusted origin scenarios for Free and Plus', () => {
    for (const context of [FREE_TRUSTED_CONTEXT, PLUS_TRUSTED_CONTEXT]) {
      expect(buildDialogueV2MemoryWriteCommand({
        memoryPlan: context.memoryPlan,
        manifestReference: context.manifestReference,
      }, {
        sharedMemoryId: SHARED_MEMORY_ID,
        summary: {
          strengths: ['polite_requests'],
          focusAreas: ['past_tense'],
          completedObjectives: 4,
        },
      })).toEqual({ ok: false, error: 'trusted_context_invalid' });
      expect(buildDialogueV2MemoryWriteCommand({
        ...context,
        originScenarioId: 'social_01',
      } as unknown as DialogueV2MemoryWriteTrustedContext, {
        sharedMemoryId: SHARED_MEMORY_ID,
        summary: {
          strengths: ['polite_requests'],
          focusAreas: ['past_tense'],
          completedObjectives: 4,
        },
      })).toEqual({ ok: false, error: 'manifest_reference_invalid' });
    }
  });

  test('rejects raw dialogue and voice-shaped payloads that bypass a field denylist', () => {
    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['past_tense'],
        completedObjectives: 4,
        turns: [{ speaker: 'user', text: 'raw learner sentence' }],
        voiceUri: 'file:///raw.wav',
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
  });

  test('rejects every summary key outside the compact sanctioned schema', () => {
    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['past_tense'],
        completedObjectives: 4,
        notes: 'learner said something memorable',
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
  });

  test('rejects every checkpoint key outside the compact sanctioned schema', () => {
    expect(buildDialogueV2MemoryWriteCommand(PLUS_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['past_tense'],
        completedObjectives: 4,
      },
      scenarioThreadId: THREAD_ID,
      checkpoint: {
        nextObjectiveIndex: 5,
        completedObjectiveIds: ['travel_19_o1'],
        personaState: { concierge: 'calm' },
        turns: [{ speaker: 'user', text: 'raw learner sentence' }],
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
  });

  test('rejects regex-valid learner text smuggled through structured memory labels', () => {
    const learnerText = 'learner_said_my_home_address_is_12_oak_road';

    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: [learnerText],
        focusAreas: ['articles'],
        completedObjectives: 1,
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });

    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: [learnerText],
        completedObjectives: 1,
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });

    expect(buildDialogueV2MemoryWriteCommand(PLUS_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['articles'],
        completedObjectives: 1,
      },
      scenarioThreadId: THREAD_ID,
      checkpoint: {
        nextObjectiveIndex: 1,
        completedObjectiveIds: ['travel_19_o1'],
        personaState: { concierge: learnerText },
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
  });

  test('rejects array accessors without evaluating them', () => {
    let reads = 0;
    const strengths: string[] = [];
    Object.defineProperty(strengths, '0', {
      configurable: true,
      enumerable: true,
      get: () => {
        reads += 1;
        return 'polite_requests';
      },
    });
    strengths.length = 1;

    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths,
        focusAreas: ['past_tense'],
        completedObjectives: 4,
      },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
    expect(reads).toBe(0);
  });

  test('builds one account-language summary document for a trusted Free plan', () => {
    const result = buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['past_tense'],
        completedObjectives: 4,
      },
    });

    expect(result).toEqual({
      ok: true,
      command: {
        commandVersion: 'dialogue_v2_memory_write_v1',
        authorization: { memoryAllowlist: MEMORY_ALLOWLIST },
        documents: [{
          target: FREE_PLAN.sharedMemory,
          value: {
            contractVersion: 'dialogue_v2_memory_v1',
            studyTarget: 'es',
            manifestReference: MANIFEST_REFERENCE,
            summary: {
              strengths: ['polite_requests'],
              focusAreas: ['past_tense'],
              completedObjectives: 4,
            },
          },
        }],
      },
    });
    expect(JSON.stringify(result)).not.toContain('uid');
    expect(JSON.stringify(result)).not.toContain('isPremium');
  });

  test('adds a nested resumable checkpoint document only for a trusted Plus thread', () => {
    const result = buildDialogueV2MemoryWriteCommand(PLUS_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['schedule_negotiation'],
        focusAreas: ['word_order'],
        completedObjectives: 4,
      },
      scenarioThreadId: THREAD_ID,
      checkpoint: {
        nextObjectiveIndex: 5,
        completedObjectiveIds: ['travel_19_o1', 'travel_19_o2'],
        personaState: { concierge: 'calm' },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      command: {
        documents: [
          { target: PLUS_PLAN.sharedMemory },
          {
            target: PLUS_PLAN.scenarioThread,
            value: {
              contractVersion: 'dialogue_v2_memory_v1',
              studyTarget: 'es',
              scenarioId: 'travel_19',
              manifestReference: MANIFEST_REFERENCE,
              checkpoint: {
                nextObjectiveIndex: 5,
                completedObjectiveIds: ['travel_19_o1', 'travel_19_o2'],
                personaState: { concierge: 'calm' },
              },
            },
          },
        ],
      },
    });
  });

  test('rejects a cross-account shared-memory identifier even when it is opaque', () => {
    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: OTHER_SHARED_MEMORY_ID,
      summary: { focusAreas: ['articles'] },
    })).toEqual({ ok: false, error: 'memory_identity_mismatch' });
  });

  test('rejects a different resumable thread identifier even when it is opaque', () => {
    expect(buildDialogueV2MemoryWriteCommand(PLUS_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['articles'],
        completedObjectives: 2,
      },
      scenarioThreadId: OTHER_THREAD_ID,
      checkpoint: { nextObjectiveIndex: 2 },
    })).toEqual({ ok: false, error: 'thread_identity_mismatch' });
  });

  test('rejects a checkpoint when the trusted contract did not grant a Plus thread', () => {
    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: {
        strengths: ['polite_requests'],
        focusAreas: ['articles'],
        completedObjectives: 2,
      },
      scenarioThreadId: THREAD_ID,
      checkpoint: { nextObjectiveIndex: 2 },
    })).toEqual({ ok: false, error: 'checkpoint_not_allowed' });
  });

  test.each([
    ['messages', { nested: { messages: ['hello'] } }],
    ['transcript', { nested: [{ transcript: 'hello' }] }],
    ['audio', { Audio: { uri: 'file:///raw.wav' } }],
    ['raw', { state: { raw: 'bytes' } }],
    ['recording', { recording: { localUri: 'file:///voice.wav' } }],
    ['compound rawTranscript', { memory: { rawTranscript: 'hello' } }],
    ['compound audio_uri', { memory: { audio_uri: 'file:///voice.wav' } }],
  ])('rejects recursively forbidden %s fields', (_label, injection) => {
    expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: { focusAreas: ['articles'], ...injection },
    })).toEqual({ ok: false, error: 'structured_payload_invalid' });
  });

  test('rejects client authority and path fields instead of silently accepting them', () => {
    for (const forgedField of [
      { uid: 'attacker' },
      { stableAccountId: 'attacker' },
      { isPremium: true },
      { path: `dialogue_v2_memory/${OTHER_SHARED_MEMORY_ID}` },
    ]) {
      expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
        sharedMemoryId: SHARED_MEMORY_ID,
        summary: { focusAreas: ['articles'] },
        ...forgedField,
      })).toEqual({ ok: false, error: 'request_fields_invalid' });
    }
  });

  test('rejects path-like or non-opaque identifiers in the trusted memory plan', () => {
    for (const id of [
      '../victim',
      `d2m_${'a'.repeat(39)}/x`,
      'users/victim/dialogue_v2_memory/record',
    ]) {
      expect(buildDialogueV2MemoryWriteCommand({
        ...FREE_TRUSTED_CONTEXT,
        memoryPlan: {
          ...FREE_PLAN,
          sharedMemory: { ...FREE_PLAN.sharedMemory, id },
        },
      }, {
        sharedMemoryId: id,
        summary: { focusAreas: ['articles'] },
      })).toEqual({ ok: false, error: 'trusted_context_invalid' });
    }
  });

  test('rejects a manifest reference that does not match the trusted language and scenario', () => {
    expect(buildDialogueV2MemoryWriteCommand({
      ...PLUS_TRUSTED_CONTEXT,
      manifestReference: { ...MANIFEST_REFERENCE, studyTarget: 'fr' },
    }, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: { focusAreas: ['articles'] },
    })).toEqual({ ok: false, error: 'manifest_reference_invalid' });

    expect(buildDialogueV2MemoryWriteCommand({
      ...PLUS_TRUSTED_CONTEXT,
      manifestReference: { ...MANIFEST_REFERENCE, scenarioId: 'social_01' },
    }, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: { focusAreas: ['articles'] },
    })).toEqual({ ok: false, error: 'manifest_reference_invalid' });
  });

  test('rejects payloads outside the structural size, depth, or collection bounds', () => {
    const tooDeep = { a: { b: { c: { d: { e: { f: true } } } } } };
    const tooManyItems = Array.from({ length: 33 }, (_, index) => index);
    const tooLong = 'x'.repeat(513);

    for (const summary of [
      { tooDeep },
      { tooManyItems },
      { tooLong },
    ]) {
      expect(buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
        sharedMemoryId: SHARED_MEMORY_ID,
        summary,
      })).toEqual({ ok: false, error: 'structured_payload_invalid' });
    }
  });

  test('copies and freezes the command so later request mutation cannot change a write', () => {
    const summary = {
      strengths: ['polite_requests'],
      focusAreas: ['articles'],
      completedObjectives: 2,
    };
    const result = buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary,
    });

    summary.focusAreas[0] = 'mutated';

    expect(result).toMatchObject({
      ok: true,
      command: {
        documents: [{
          value: {
            summary: {
              strengths: ['polite_requests'],
              focusAreas: ['articles'],
              completedObjectives: 2,
            },
          },
        }],
      },
    });
    if (result.ok) {
      expect(Object.isFrozen(result.command)).toBe(true);
      expect(Object.isFrozen(result.command.documents)).toBe(true);
      expect(Object.isFrozen(result.command.documents[0].value)).toBe(true);
    }
  });
});

function persistenceRepository(initial: Readonly<Record<string, unknown>> = {}) {
  const stored = new Map<string, unknown>(Object.entries(initial));
  const repository: DialogueV2MemoryPersistenceRepository = {
    runTransaction: async (work) => work({
      get: async (path) => stored.has(path)
        ? { exists: true, data: stored.get(path) }
        : { exists: false },
      set: (path, value) => {
        stored.set(path, value);
      },
    }),
  };
  return { repository, stored };
}

describe('Dialogue V2 authenticated memory persistence boundary', () => {
  const callableDependencies = (
    repository: DialogueV2MemoryPersistenceRepository,
    isPremium: boolean,
  ) => ({
    repository,
    identifierSecret: 'server-owned-secret-with-at-least-32-bytes',
    resolveStableAccountId: jest.fn(async () => 'stable-a'),
    resolvePremiumAccess: jest.fn(async () => isPremium),
    resolveApprovedLanguagePack: jest.fn(async () => APPROVED_LANGUAGE_PACK),
  });

  test('derives and persists only a structured Free summary from a validated completion', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });

    await expect(persistDialogueV2CompletionMemory({
      authUid: 'auth-a',
      studyTarget: 'es',
      scenarioId: 'travel_19',
      completion: COMPLETION_ENVELOPE,
    }, callableDependencies(repository, false))).resolves.toEqual({
      ok: true,
      sharedMemoryStored: true,
      scenarioCheckpointStored: false,
    });

    const memoryEntries = [...stored.entries()].filter(([path]) => path.includes('/dialogue_v2_memory/'));
    expect(memoryEntries).toHaveLength(1);
    expect(memoryEntries[0][1]).toMatchObject({
      summary: {
        strengths: MEMORY_OBJECTIVE_IDS.filter((_id, index) => index !== 1),
        focusAreas: [MEMORY_OBJECTIVE_IDS[1]],
        completedObjectives: MEMORY_OBJECTIVE_IDS.length - 1,
      },
    });
    expect(JSON.stringify(memoryEntries)).not.toContain('Este texto del alumno');
    expect(JSON.stringify(memoryEntries)).not.toContain('overallAssessment');
  });

  test('prepares a canonical completion memory command without publishing any document', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const dependencies = callableDependencies(repository, true);
    const prepared = await prepareDialogueV2CompletionMemory({
      authUid: 'auth-a',
      studyTarget: 'es',
      scenarioId: 'travel_19',
      completion: COMPLETION_ENVELOPE,
      releaseSnapshot: APPROVED_LANGUAGE_PACK,
    }, dependencies);

    expect(prepared).toMatchObject({
      authUid: 'auth-a',
      stableAccountId: 'stable-a',
      receipt: { sharedMemoryStored: true, scenarioCheckpointStored: true },
      command: { commandVersion: 'dialogue_v2_memory_write_v1' },
    });
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
    expect(JSON.stringify(prepared)).not.toContain('Este texto del alumno');
    expect(JSON.stringify(prepared)).not.toContain('overallAssessment');
    expect(dependencies.resolveApprovedLanguagePack).not.toHaveBeenCalled();
  });

  test('adds an allowlisted resumable checkpoint only for server-resolved Plus', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });

    await expect(persistDialogueV2CompletionMemory({
      authUid: 'auth-a',
      studyTarget: 'es',
      scenarioId: 'travel_19',
      completion: COMPLETION_ENVELOPE,
    }, callableDependencies(repository, true))).resolves.toEqual({
      ok: true,
      sharedMemoryStored: true,
      scenarioCheckpointStored: true,
    });

    const memoryEntries = [...stored.entries()].filter(([path]) => path.includes('/dialogue_v2_memory/'));
    expect(memoryEntries).toHaveLength(2);
    const thread = memoryEntries.find(([path]) => path.includes('/threads/'))?.[1];
    expect(thread).toMatchObject({
      checkpoint: {
        nextObjectiveIndex: 1,
        completedObjectiveIds: MEMORY_OBJECTIVE_IDS.filter((_id, index) => index !== 1),
        personaState: { concierge: 'helpful' },
      },
    });
    expect(JSON.stringify(memoryEntries)).not.toContain('Este texto del alumno');
  });

  test('rejects a completion whose supposedly trusted context is not the approved pack', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const forgedCompletion = {
      ...COMPLETION_ENVELOPE,
      context: {
        ...COMPLETION_ENVELOPE.context,
        objectiveIds: [...MEMORY_OBJECTIVE_IDS.slice(0, -1), 'forged_objective'],
      },
    } as unknown as DialogueV2CompletionEnvelope;

    await expect(persistDialogueV2CompletionMemory({
      authUid: 'auth-a',
      studyTarget: 'es',
      scenarioId: 'travel_19',
      completion: forgedCompletion,
    }, callableDependencies(repository, true))).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_memory_completion_invalid',
    });
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test('persists Free structured memory to the exact server-derived account path', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const dependencies = callableDependencies(repository, false);

    await expect(executeDialogueV2MemoryWrite({
      auth: { uid: 'auth-a' },
      data: {
        studyTarget: 'es',
        scenarioId: 'travel_19',
        summary: {
          strengths: ['polite_requests'],
          focusAreas: ['articles'],
          completedObjectives: 2,
        },
      },
    }, dependencies)).resolves.toEqual({
      ok: true,
      sharedMemoryStored: true,
      scenarioCheckpointStored: false,
    });

    expect(dependencies.resolveStableAccountId).toHaveBeenCalledWith('auth-a');
    expect(dependencies.resolvePremiumAccess).toHaveBeenCalledWith('stable-a', 'auth-a');
    expect(dependencies.resolveApprovedLanguagePack).toHaveBeenCalledWith('es', 'travel_19');
    const memoryPaths = [...stored.keys()].filter((path) => path.includes('/dialogue_v2_memory/'));
    expect(memoryPaths).toHaveLength(1);
    expect(memoryPaths[0]).toMatch(/^users\/stable-a\/dialogue_v2_memory\/d2m_[a-f0-9]{40}$/);
    expect(JSON.stringify(stored.get(memoryPaths[0]))).not.toContain('auth-a');
    expect(JSON.stringify(stored.get(memoryPaths[0]))).not.toContain('server-owned-secret');
  });

  test('persists an atomic resumable scenario checkpoint only for server-resolved Plus', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });

    await expect(executeDialogueV2MemoryWrite({
      auth: { uid: 'auth-a' },
      data: {
        studyTarget: 'es',
        scenarioId: 'travel_19',
        summary: {
          strengths: ['polite_requests'],
          focusAreas: ['articles'],
          completedObjectives: 2,
        },
        checkpoint: {
          nextObjectiveIndex: 3,
          completedObjectiveIds: ['travel_19_o1'],
          personaState: { concierge: 'calm' },
        },
      },
    }, callableDependencies(repository, true))).resolves.toEqual({
      ok: true,
      sharedMemoryStored: true,
      scenarioCheckpointStored: true,
    });

    const memoryPaths = [...stored.keys()].filter((path) => path.includes('/dialogue_v2_memory/'));
    expect(memoryPaths).toHaveLength(2);
    expect(memoryPaths).toEqual(expect.arrayContaining([
      expect.stringMatching(/^users\/stable-a\/dialogue_v2_memory\/d2m_[a-f0-9]{40}$/),
      expect.stringMatching(
        /^users\/stable-a\/dialogue_v2_memory\/d2m_[a-f0-9]{40}\/threads\/d2t_[a-f0-9]{40}$/,
      ),
    ]));
  });

  test('denies resumable checkpoint persistence for server-resolved Free', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });

    await expect(executeDialogueV2MemoryWrite({
      auth: { uid: 'auth-a' },
      data: {
        studyTarget: 'es',
        scenarioId: 'travel_19',
        summary: { strengths: [], focusAreas: [], completedObjectives: 0 },
        checkpoint: {
          nextObjectiveIndex: 1,
          completedObjectiveIds: [],
          personaState: {},
        },
      },
    }, callableDependencies(repository, false))).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_memory_checkpoint_not_allowed',
    });
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test.each([
    ['unauthenticated', { auth: undefined, data: {} }],
    ['client stable identity', {
      auth: { uid: 'auth-a' },
      data: { studyTarget: 'es', scenarioId: 'travel_19', stableAccountId: 'victim', summary: {} },
    }],
    ['client premium claim', {
      auth: { uid: 'auth-a' },
      data: { studyTarget: 'es', scenarioId: 'travel_19', isPremium: true, summary: {} },
    }],
    ['client memory path', {
      auth: { uid: 'auth-a' },
      data: { studyTarget: 'es', scenarioId: 'travel_19', path: 'users/victim', summary: {} },
    }],
    ['client manifest pin', {
      auth: { uid: 'auth-a' },
      data: { studyTarget: 'es', scenarioId: 'travel_19', manifestReference: MANIFEST_REFERENCE, summary: {} },
    }],
  ])('fails closed for %s authority', async (_label, request) => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const dependencies = callableDependencies(repository, true);

    await expect(executeDialogueV2MemoryWrite(request, dependencies)).rejects.toMatchObject({
      code: request.auth ? 'invalid-argument' : 'unauthenticated',
    });
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test('fails closed when no server-approved manifest reference exists', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const dependencies = {
      ...callableDependencies(repository, false),
      resolveApprovedLanguagePack: jest.fn(async () => null),
    };

    await expect(executeDialogueV2MemoryWrite({
      auth: { uid: 'auth-a' },
      data: {
        studyTarget: 'es',
        scenarioId: 'travel_19',
        summary: { strengths: [], focusAreas: [], completedObjectives: 0 },
      },
    }, dependencies)).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_memory_release_unavailable',
    });
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test.each([
    ['missing auth link', {}],
    ['cross-account auth link', { 'auth_links/auth-a': { stable_id: 'stable-b' } }],
    ['account deletion tombstone', {
      'auth_links/auth-a': { stable_id: 'stable-a' },
      'account_deletion_tombstones/stable-a': { status: 'pending' },
    }],
  ])('transaction rejects %s before writing', async (_label, initial) => {
    const { repository, stored } = persistenceRepository(initial);
    const commandResult = buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: { strengths: [], focusAreas: [], completedObjectives: 0 },
    });
    if (!commandResult.ok) throw new Error('test command must be valid');

    await expect(persistDialogueV2MemoryCommand(
      repository,
      'auth-a',
      'stable-a',
      commandResult.command,
    )).rejects.toThrow(/dialogue_v2_memory_(identity|account_delete)/);
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test('adapter rejects a forged command containing raw transcript data', async () => {
    const { repository, stored } = persistenceRepository({
      'auth_links/auth-a': { stable_id: 'stable-a' },
    });
    const forgedCommand = {
      commandVersion: 'dialogue_v2_memory_write_v1',
      documents: [{
        target: FREE_PLAN.sharedMemory,
        value: {
          contractVersion: 'dialogue_v2_memory_v1',
          studyTarget: 'es',
          manifestReference: MANIFEST_REFERENCE,
          summary: {
            strengths: [],
            focusAreas: [],
            completedObjectives: 0,
            transcript: 'raw learner sentence',
          },
        },
      }],
    } as unknown as DialogueV2MemoryWriteCommand;

    await expect(persistDialogueV2MemoryCommand(
      repository,
      'auth-a',
      'stable-a',
      forgedCommand,
    )).rejects.toThrow('dialogue_v2_memory_command_invalid');
    expect([...stored.keys()].some((path) => path.includes('/dialogue_v2_memory/'))).toBe(false);
  });

  test('Firestore repository adapter keeps all reads and writes inside one transaction', async () => {
    const stored = new Map<string, unknown>([
      ['auth_links/auth-a', { stable_id: 'stable-a' }],
    ]);
    const transaction = {
      get: jest.fn(async (reference: { path: string }) => ({
        exists: stored.has(reference.path),
        data: () => stored.get(reference.path),
      })),
      set: jest.fn((reference: { path: string }, value: unknown) => {
        stored.set(reference.path, value);
      }),
    };
    const db = {
      doc: jest.fn((path: string) => ({ path })),
      runTransaction: jest.fn(async (work: (tx: typeof transaction) => Promise<unknown>) =>
        work(transaction)),
    };
    const commandResult = buildDialogueV2MemoryWriteCommand(FREE_TRUSTED_CONTEXT, {
      sharedMemoryId: SHARED_MEMORY_ID,
      summary: { strengths: [], focusAreas: [], completedObjectives: 0 },
    });
    if (!commandResult.ok) throw new Error('test command must be valid');

    await persistDialogueV2MemoryCommand(
      makeFirestoreDialogueV2MemoryRepository(
        db as unknown as FirebaseFirestore.Firestore,
      ),
      'auth-a',
      'stable-a',
      commandResult.command,
    );

    expect(db.runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.get).toHaveBeenCalledTimes(2);
    expect(transaction.set).toHaveBeenCalledTimes(1);
    expect(transaction.set.mock.calls[0][0].path).toMatch(
      /^users\/stable-a\/dialogue_v2_memory\/d2m_[a-f0-9]{40}$/,
    );
  });
});
