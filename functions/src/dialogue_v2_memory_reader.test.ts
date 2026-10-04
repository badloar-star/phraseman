import { deriveDialogueV2MemoryPlan } from './dialogue_v2_memory_contract';
import {
  executeDialogueV2MemoryRead,
  type DialogueV2MemoryPersistenceRepository,
  type DialogueV2MemoryReadDependencies,
} from './dialogue_v2_memory_writer';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';
import { computeDialogueV2PackSha256 } from './dialogue_v2_pack_integrity';

const AUTH_UID = 'auth-a';
const STABLE_ACCOUNT_ID = 'stable-a';
const IDENTIFIER_SECRET = 'server-owned-secret-with-at-least-32-bytes';
const ROTATED_IDENTIFIER_SECRET = 'rotated-server-secret-with-at-least-32-bytes';
const STUDY_TARGET = 'es' as const;
const SCENARIO_ID = 'travel_19';
const OBJECTIVE_IDS = [
  'travel_19_o1',
  'travel_19_o2',
  'travel_19_o3',
  'travel_19_o4',
  'travel_19_o5',
  'travel_19_o6',
] as const;

function languagePack(
  studyTarget: DialogueV2StudyTarget,
  scenarioId: string,
): DialogueV2LanguagePack {
  const catalogueEntry = DIALOGUE_V2_CATALOGUE_INDEX.find((entry) => entry.id === scenarioId);
  if (!catalogueEntry) throw new Error(`unknown_test_scenario:${scenarioId}`);
  const isSelected = studyTarget === STUDY_TARGET && scenarioId === SCENARIO_ID;
  const objectiveIds = isSelected
    ? OBJECTIVE_IDS
    : (['goal_1', 'goal_2', 'goal_3', 'goal_4', 'goal_5', 'goal_6'] as const);
  const value: DialogueV2LanguagePack = {
    studyTarget,
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: '0'.repeat(64),
    catalogueSha256: '2'.repeat(64),
    reviewReceiptSha256: '3'.repeat(64),
    scenario: {
      id: catalogueEntry.id,
      worldId: catalogueEntry.worldId,
      rankRequired: catalogueEntry.rankRequired,
      cefr: catalogueEntry.cefr,
      personas: [{
        id: isSelected ? 'concierge' : 'host',
        replyStyle: 'calm',
        voiceMode: 'text_only',
        displayName: 'Conserje',
        styleNote: 'Responde con calma.',
        mood: 'helpful',
        correctionStyle: 'gentle',
      }],
      objectives: objectiveIds.map((id) => ({ id, label: `Practica ${id}` })),
      groupReplyPolicy: {
        maxDirectReplies: 1,
        maxUsefulFollowUps: 1,
        silenceAllowed: true,
      },
    },
    content: {
      title: 'Conversacion aprobada',
      briefing: 'Practica una conversacion segura.',
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
  return { ...value, packSha256: computeDialogueV2PackSha256(value) };
}

function fullRelease(): DialogueV2ServerRelease {
  const packets = Object.fromEntries(DIALOGUE_V2_STUDY_TARGETS.flatMap((studyTarget) => (
    DIALOGUE_V2_CATALOGUE_INDEX.map((scenario) => [
      `${studyTarget}:${scenario.id}`,
      languagePack(studyTarget, scenario.id),
    ])
  ))) as Readonly<Record<string, DialogueV2LanguagePack>>;
  const manifest = Object.fromEntries(Object.entries(packets).map(([key, packet]) => [key, {
    studyTarget: packet.studyTarget,
    scenarioId: packet.scenario.id,
    packVersion: packet.packVersion,
    packSha256: packet.packSha256,
    catalogueSha256: packet.catalogueSha256,
    reviewReceiptSha256: packet.reviewReceiptSha256,
  }])) as DialogueV2ApprovedLanguagePackManifest;
  return { manifest, packets };
}

const APPROVED_RELEASE = fullRelease();
const APPROVED_LANGUAGE_PACK = APPROVED_RELEASE.packets[`${STUDY_TARGET}:${SCENARIO_ID}`];

function manifestReferenceFor(packet: DialogueV2LanguagePack) {
  return Object.freeze({
    studyTarget: packet.studyTarget,
    scenarioId: packet.scenario.id,
    packVersion: packet.packVersion,
    packSha256: packet.packSha256,
    catalogueSha256: packet.catalogueSha256,
    reviewReceiptSha256: packet.reviewReceiptSha256,
  });
}

const MANIFEST_REFERENCE = manifestReferenceFor(APPROVED_LANGUAGE_PACK);

const SUMMARY = Object.freeze({
  strengths: Object.freeze(['travel_19_o1', 'travel_19_o2']),
  focusAreas: Object.freeze(['travel_19_o3']),
  completedObjectives: 2,
});

const CHECKPOINT = Object.freeze({
  nextObjectiveIndex: 2,
  completedObjectiveIds: Object.freeze(['travel_19_o1', 'travel_19_o2']),
  personaState: Object.freeze({ concierge: 'helpful' }),
});

type RepositoryFixture = Readonly<{
  repository: DialogueV2MemoryPersistenceRepository;
  documents: Map<string, unknown>;
  reads: string[];
}>;

function makeRepository(initial: Readonly<Record<string, unknown>> = {}): RepositoryFixture {
  const documents = new Map(Object.entries(initial));
  const reads: string[] = [];
  return {
    documents,
    reads,
    repository: {
      runTransaction: async (work) => work({
        get: async (path) => {
          reads.push(path);
          return documents.has(path)
            ? { exists: true, data: documents.get(path) }
            : { exists: false };
        },
        set: () => {
          throw new Error('read_boundary_must_not_write');
        },
      }),
    },
  };
}

function memoryPaths(identifierSecret = IDENTIFIER_SECRET, isPremium = true) {
  const plan = deriveDialogueV2MemoryPlan({
    stableAccountId: STABLE_ACCOUNT_ID,
    isPremium,
    identifierSecret,
    approvedPackManifest: {
      [`${STUDY_TARGET}:${SCENARIO_ID}`]: MANIFEST_REFERENCE,
    },
  }, { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID });
  if (!plan) throw new Error('test_memory_plan_unavailable');
  return {
    shared: `users/${STABLE_ACCOUNT_ID}/dialogue_v2_memory/${plan.sharedMemory.id}`,
    thread: plan.scenarioThread
      ? `users/${STABLE_ACCOUNT_ID}/dialogue_v2_memory/${plan.sharedMemory.id}/threads/${plan.scenarioThread.id}`
      : null,
  };
}

function sharedDocument(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: STUDY_TARGET,
    manifestReference: MANIFEST_REFERENCE,
    summary: SUMMARY,
    ...overrides,
  };
}

function threadDocument(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: STUDY_TARGET,
    scenarioId: SCENARIO_ID,
    manifestReference: MANIFEST_REFERENCE,
    checkpoint: CHECKPOINT,
    ...overrides,
  };
}

function makeDependencies(
  repository: DialogueV2MemoryPersistenceRepository,
  overrides: Partial<DialogueV2MemoryReadDependencies> = {},
): DialogueV2MemoryReadDependencies {
  return {
    repository,
    identifierSecret: IDENTIFIER_SECRET,
    resolveStableAccountId: jest.fn(async () => STABLE_ACCOUNT_ID),
    resolvePremiumAccess: jest.fn(async () => false),
    resolveRelease: jest.fn(async () => APPROVED_RELEASE),
    ...overrides,
  };
}

function request(data: unknown = { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID }) {
  return { auth: { uid: AUTH_UID }, data };
}

describe('Dialogue V2 authenticated memory read/resume boundary', () => {
  test('requires Plus before release resolution or any memory transaction', async () => {
    const paths = memoryPaths(IDENTIFIER_SECRET, false);
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument(),
    });
    const resolvePremiumAccess = jest.fn(async () => false);
    const resolveRelease = jest.fn(async () => APPROVED_RELEASE);

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, { resolvePremiumAccess, resolveRelease }),
    )).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_memory_plus_required',
    });

    expect(resolvePremiumAccess).toHaveBeenCalledWith(STABLE_ACCOUNT_ID, AUTH_UID);
    expect(resolveRelease).not.toHaveBeenCalled();
    expect(fixture.reads).toEqual([]);
  });

  test('returns the selected released scenario checkpoint to Plus', async () => {
    const paths = memoryPaths();
    if (!paths.thread) throw new Error('test_thread_path_unavailable');
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument(),
      [paths.thread]: threadDocument(),
    });

    const result = await executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    );

    expect(result).toEqual({
      ok: true,
      sharedSummary: SUMMARY,
      scenarioCheckpoint: CHECKPOINT,
    });
    expect(fixture.reads).toContain(paths.thread);
    expect(JSON.stringify(result)).not.toMatch(/manifest|transcript|audio|assessment|evidence/i);
  });

  test('keeps account-language summary readable across scenarios in the same approved release', async () => {
    const paths = memoryPaths();
    const originPacket = APPROVED_RELEASE.packets[`${STUDY_TARGET}:social_01`];
    const originSummary = {
      strengths: ['goal_1'],
      focusAreas: ['goal_2'],
      completedObjectives: 1,
    };
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument({
        manifestReference: manifestReferenceFor(originPacket),
        summary: originSummary,
      }),
    });

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    )).resolves.toEqual({
      ok: true,
      sharedSummary: originSummary,
      scenarioCheckpoint: null,
    });
  });

  test.each([
    ['stable account claim', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, stableAccountId: STABLE_ACCOUNT_ID }],
    ['premium claim', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, isPremium: true }],
    ['rank claim', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, achievedRank: 19 }],
    ['shared opaque id', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, sharedMemoryId: `d2m_${'a'.repeat(40)}` }],
    ['thread opaque id', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, scenarioThreadId: `d2t_${'b'.repeat(40)}` }],
    ['document path', { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID, path: 'users/victim/dialogue_v2_memory/x' }],
  ])('rejects a client-provided %s before authority dependencies run', async (_label, data) => {
    const fixture = makeRepository();
    const resolveStableAccountId = jest.fn(async () => STABLE_ACCOUNT_ID);
    const resolvePremiumAccess = jest.fn(async () => true);
    const resolveRelease = jest.fn(async () => APPROVED_RELEASE);

    await expect(executeDialogueV2MemoryRead(request(data), makeDependencies(
      fixture.repository,
      { resolveStableAccountId, resolvePremiumAccess, resolveRelease },
    ))).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'dialogue_v2_memory_read_request_invalid',
    });
    expect(resolveStableAccountId).not.toHaveBeenCalled();
    expect(resolvePremiumAccess).not.toHaveBeenCalled();
    expect(resolveRelease).not.toHaveBeenCalled();
    expect(fixture.reads).toEqual([]);
  });

  test('requires an exact approved pack before deriving or reading memory paths', async () => {
    const fixture = makeRepository();
    const unverifiedPacket = {
      ...APPROVED_LANGUAGE_PACK,
      packSha256: '9'.repeat(64),
    };
    const resolveRelease = jest.fn(async () => ({
      manifest: {
        ...APPROVED_RELEASE.manifest,
        [`${STUDY_TARGET}:${SCENARIO_ID}`]: manifestReferenceFor(unverifiedPacket),
      },
      packets: {
        ...APPROVED_RELEASE.packets,
        [`${STUDY_TARGET}:${SCENARIO_ID}`]: unverifiedPacket,
      },
    }));

    await expect(executeDialogueV2MemoryRead(request(), makeDependencies(
      fixture.repository,
      {
        resolvePremiumAccess: jest.fn(async () => true),
        resolveRelease,
      },
    ))).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_memory_release_unavailable',
    });
    expect(fixture.reads).toEqual([]);
  });

  test('fails closed for an auth-link mismatch and for account deletion before reading memory', async () => {
    const paths = memoryPaths();
    if (!paths.thread) throw new Error('test_thread_path_unavailable');
    for (const initial of [
      { [`auth_links/${AUTH_UID}`]: { stable_id: 'stable-victim' } },
      {
        [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
        [`account_deletion_tombstones/${STABLE_ACCOUNT_ID}`]: { deletedAt: 1 },
      },
    ]) {
      const fixture = makeRepository({
        ...initial,
        [paths.shared]: sharedDocument(),
        [paths.thread]: threadDocument(),
      });
      await expect(executeDialogueV2MemoryRead(
        request(),
        makeDependencies(fixture.repository, {
          resolvePremiumAccess: jest.fn(async () => true),
        }),
      )).rejects.toMatchObject({
        code: expect.stringMatching(/permission-denied|failed-precondition/),
      });
      expect(fixture.reads).not.toContain(paths.shared);
      expect(fixture.reads).not.toContain(paths.thread);
    }
  });

  test('treats stale release references and extra sensitive fields as absent memory', async () => {
    const paths = memoryPaths();
    if (!paths.thread) throw new Error('test_thread_path_unavailable');
    const staleReference = { ...MANIFEST_REFERENCE, packSha256: '9'.repeat(64) };
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument({
        manifestReference: staleReference,
        rawTranscript: 'learner secret',
      }),
      [paths.thread]: threadDocument({
        manifestReference: staleReference,
        assessment: 'private generated prose',
        audioUri: 'file:///private.m4a',
      }),
    });

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    )).resolves.toEqual({
      ok: true,
      sharedSummary: null,
      scenarioCheckpoint: null,
    });
  });

  test('does not discover old opaque documents after an identifier-secret rotation', async () => {
    const oldPaths = memoryPaths();
    const rotatedPaths = memoryPaths(ROTATED_IDENTIFIER_SECRET);
    if (!oldPaths.thread || !rotatedPaths.thread) throw new Error('test_thread_path_unavailable');
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [oldPaths.shared]: sharedDocument(),
      [oldPaths.thread]: threadDocument(),
    });

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        identifierSecret: ROTATED_IDENTIFIER_SECRET,
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    )).resolves.toEqual({
      ok: true,
      sharedSummary: null,
      scenarioCheckpoint: null,
    });
    expect(fixture.reads).toEqual(expect.arrayContaining([
      rotatedPaths.shared,
      rotatedPaths.thread,
    ]));
    expect(fixture.reads).not.toContain(oldPaths.shared);
    expect(fixture.reads).not.toContain(oldPaths.thread);
  });

  test('rejects a checkpoint whose scenario identity or release pin differs from the selection', async () => {
    const paths = memoryPaths();
    if (!paths.thread) throw new Error('test_thread_path_unavailable');
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument(),
      [paths.thread]: threadDocument({ scenarioId: 'social_01' }),
    });

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    )).resolves.toEqual({
      ok: true,
      sharedSummary: SUMMARY,
      scenarioCheckpoint: null,
    });
  });

  test('rejects malformed structured values instead of returning partial sensitive documents', async () => {
    const paths = memoryPaths();
    if (!paths.thread) throw new Error('test_thread_path_unavailable');
    const fixture = makeRepository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ACCOUNT_ID },
      [paths.shared]: sharedDocument({
        summary: { ...SUMMARY, completedObjectives: 12 },
      }),
      [paths.thread]: threadDocument({
        checkpoint: { ...CHECKPOINT, nextObjectiveIndex: 12 },
      }),
    });

    await expect(executeDialogueV2MemoryRead(
      request(),
      makeDependencies(fixture.repository, {
        resolvePremiumAccess: jest.fn(async () => true),
      }),
    )).resolves.toEqual({
      ok: true,
      sharedSummary: null,
      scenarioCheckpoint: null,
    });
  });
});
