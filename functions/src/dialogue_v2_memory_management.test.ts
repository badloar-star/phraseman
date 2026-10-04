import { HttpsError } from 'firebase-functions/v2/https';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import { deriveDialogueV2MemoryPlan } from './dialogue_v2_memory_contract';
import {
  executeDialogueV2MemoryClear,
  executeDialogueV2MemoryView,
  type DialogueV2MemoryLanguageAuthorization,
  type DialogueV2MemoryManagementRepository,
} from './dialogue_v2_memory_management';

const SECRET = 'dialogue-v2-memory-management-test-secret';
const AUTH_UID = 'auth-user';
const STABLE_ID = 'stable-user';

function manifestReference(studyTarget: 'en' | 'es' | 'fr' | 'de', scenarioId: string) {
  return Object.freeze({
    studyTarget,
    scenarioId,
    packVersion: 'dialogues_v2_2026_09_26',
    packSha256: '1'.repeat(64),
    catalogueSha256: '2'.repeat(64),
    reviewReceiptSha256: '3'.repeat(64),
  });
}

function languageAuthorization(
  studyTarget: 'en' | 'es' | 'fr' | 'de' = 'de',
): DialogueV2MemoryLanguageAuthorization {
  return Object.freeze({
    studyTarget,
    scenarios: Object.freeze(DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => {
      const reference = manifestReference(studyTarget, entry.id);
      const memoryPlan = deriveDialogueV2MemoryPlan({
        stableAccountId: STABLE_ID,
        isPremium: true,
        identifierSecret: SECRET,
        approvedPackManifest: { [`${studyTarget}:${entry.id}`]: reference },
      }, { studyTarget, scenarioId: entry.id });
      if (!memoryPlan?.scenarioThread) throw new Error('test_memory_plan_unavailable');
      return Object.freeze({
        scenarioId: entry.id,
        manifestReference: reference,
        memoryAllowlist: Object.freeze({
          objectiveIds: Object.freeze([`${entry.id}_goal_1`, `${entry.id}_goal_2`]),
          personaStates: Object.freeze({ host: Object.freeze(['warm', 'direct']) }),
        }),
        memoryPlan,
      });
    })),
  });
}

function sharedPath(authorization: DialogueV2MemoryLanguageAuthorization): string {
  return `users/${STABLE_ID}/dialogue_v2_memory/${authorization.scenarios[0].memoryPlan.sharedMemory.id}`;
}

function threadPath(
  authorization: DialogueV2MemoryLanguageAuthorization,
  scenarioId: string,
): string {
  const scenario = authorization.scenarios.find((item) => item.scenarioId === scenarioId);
  if (!scenario?.memoryPlan.scenarioThread) throw new Error('test_thread_missing');
  return `${sharedPath(authorization)}/threads/${scenario.memoryPlan.scenarioThread.id}`;
}

function validSharedDocument(authorization: DialogueV2MemoryLanguageAuthorization) {
  const scenario = authorization.scenarios[0];
  return Object.freeze({
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: authorization.studyTarget,
    manifestReference: scenario.manifestReference,
    summary: Object.freeze({
      strengths: Object.freeze([`${scenario.scenarioId}_goal_1`]),
      focusAreas: Object.freeze([`${scenario.scenarioId}_goal_2`]),
      completedObjectives: 1,
    }),
  });
}

function validThreadDocument(
  authorization: DialogueV2MemoryLanguageAuthorization,
  scenarioId: string,
) {
  const scenario = authorization.scenarios.find((item) => item.scenarioId === scenarioId);
  if (!scenario) throw new Error('test_scenario_missing');
  return Object.freeze({
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: authorization.studyTarget,
    scenarioId,
    manifestReference: scenario.manifestReference,
    checkpoint: Object.freeze({
      nextObjectiveIndex: 1,
      completedObjectiveIds: Object.freeze([`${scenarioId}_goal_1`]),
      personaState: Object.freeze({ host: 'warm' }),
    }),
  });
}

function repository(initial: Readonly<Record<string, unknown>> = {}) {
  const stored = new Map<string, unknown>(Object.entries(initial));
  const transactionRuns: string[][] = [];
  const managementRepository: DialogueV2MemoryManagementRepository = {
    runTransaction: async (work) => {
      const stagedDeletes: string[] = [];
      const result = await work({
        get: async (path) => ({
          exists: stored.has(path),
          ...(stored.has(path) ? { data: stored.get(path) } : {}),
        }),
        delete: (path) => { stagedDeletes.push(path); },
      });
      for (const path of stagedDeletes) stored.delete(path);
      transactionRuns.push(stagedDeletes);
      return result;
    },
  };
  return { repository: managementRepository, stored, transactionRuns };
}

function dependencies(
  memoryRepository: DialogueV2MemoryManagementRepository,
  authorization: DialogueV2MemoryLanguageAuthorization | null,
  isPremium = true,
) {
  return Object.freeze({
    repository: memoryRepository,
    identifierSecret: SECRET,
    resolveStableAccountId: jest.fn(async () => STABLE_ID),
    resolvePremiumAccess: jest.fn(async () => isPremium),
    resolveLanguageAuthorization: jest.fn(async () => authorization),
  });
}

describe('Dialogue V2 memory management authority boundary', () => {
  test('returns only validated structured memory for the authenticated Plus owner language', async () => {
    const authorization = languageAuthorization('de');
    const firstScenarioId = authorization.scenarios[0].scenarioId;
    const secondScenarioId = authorization.scenarios[1].scenarioId;
    const initial = {
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
      [sharedPath(authorization)]: validSharedDocument(authorization),
      [threadPath(authorization, firstScenarioId)]: validThreadDocument(authorization, firstScenarioId),
      [threadPath(authorization, secondScenarioId)]: {
        ...validThreadDocument(authorization, secondScenarioId),
        transcript: 'must never cross the callable boundary',
      },
    };
    const memoryRepository = repository(initial);

    await expect(executeDialogueV2MemoryView({
      auth: { uid: AUTH_UID },
      data: { studyTarget: 'de' },
    }, dependencies(memoryRepository.repository, authorization))).resolves.toEqual({
      ok: true,
      studyTarget: 'de',
      sharedSummary: {
        scenarioId: firstScenarioId,
        strengths: [`${firstScenarioId}_goal_1`],
        focusAreas: [`${firstScenarioId}_goal_2`],
        completedObjectives: 1,
      },
      scenarioCheckpoints: [{
        scenarioId: firstScenarioId,
        nextObjectiveIndex: 1,
        completedObjectiveIds: [`${firstScenarioId}_goal_1`],
        personaState: { host: 'warm' },
      }],
    });
  });

  test('keeps view Plus-gated before reading the release or any memory document', async () => {
    const authorization = languageAuthorization('fr');
    const memoryRepository = repository();
    const deps = dependencies(memoryRepository.repository, authorization, false);

    await expect(executeDialogueV2MemoryView({
      auth: { uid: AUTH_UID },
      data: { studyTarget: 'fr' },
    }, deps)).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_memory_plus_required',
    });
    expect(deps.resolveLanguageAuthorization).not.toHaveBeenCalled();
    expect(memoryRepository.transactionRuns).toEqual([]);
  });

  test('lets an authenticated downgraded owner clear all 77 exact language documents', async () => {
    const authorization = languageAuthorization('fr');
    const firstScenarioId = authorization.scenarios[0].scenarioId;
    const memoryRepository = repository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
      [sharedPath(authorization)]: validSharedDocument(authorization),
      [threadPath(authorization, firstScenarioId)]: validThreadDocument(
        authorization,
        firstScenarioId,
      ),
    });
    const deps = dependencies(memoryRepository.repository, authorization, false);

    await expect(executeDialogueV2MemoryClear({
      auth: { uid: AUTH_UID },
      data: { studyTarget: 'fr' },
    }, deps)).resolves.toEqual({
      ok: true,
      studyTarget: 'fr',
      cleared: true,
      deletedDocuments: 2,
    });

    expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
    expect(deps.resolveLanguageAuthorization).not.toHaveBeenCalled();
    expect(memoryRepository.transactionRuns).toHaveLength(1);
    expect(memoryRepository.transactionRuns[0]).toHaveLength(77);
    expect(new Set(memoryRepository.transactionRuns[0]).size).toBe(77);
  });

  test('clears all 77 exact language documents when the current release is unavailable', async () => {
    const authorization = languageAuthorization('es');
    const lastScenarioId = authorization.scenarios.at(-1)!.scenarioId;
    const memoryRepository = repository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
      [sharedPath(authorization)]: validSharedDocument(authorization),
      [threadPath(authorization, lastScenarioId)]: validThreadDocument(
        authorization,
        lastScenarioId,
      ),
    });
    const deps = dependencies(memoryRepository.repository, null, true);
    deps.resolveLanguageAuthorization.mockRejectedValueOnce(new Error('release_unavailable'));

    await expect(executeDialogueV2MemoryClear({
      auth: { uid: AUTH_UID },
      data: { studyTarget: 'es' },
    }, deps)).resolves.toEqual({
      ok: true,
      studyTarget: 'es',
      cleared: true,
      deletedDocuments: 2,
    });

    expect(deps.resolvePremiumAccess).not.toHaveBeenCalled();
    expect(deps.resolveLanguageAuthorization).not.toHaveBeenCalled();
    expect(memoryRepository.transactionRuns).toHaveLength(1);
    expect(memoryRepository.transactionRuns[0]).toHaveLength(77);
    expect(new Set(memoryRepository.transactionRuns[0]).size).toBe(77);
  });

  test('rejects authority, path, scenario and payload fields supplied by the client', async () => {
    const authorization = languageAuthorization('es');
    const memoryRepository = repository();
    const deps = dependencies(memoryRepository.repository, authorization);
    const invalidData = [
      {},
      { studyTarget: 'it' },
      { studyTarget: 'es', stableAccountId: 'victim' },
      { studyTarget: 'es', uid: 'victim' },
      { studyTarget: 'es', isPremium: true },
      { studyTarget: 'es', path: 'users/victim/dialogue_v2_memory' },
      { studyTarget: 'es', scenarioId: 'social_01' },
      { studyTarget: 'es', summary: { strengths: ['forged'] } },
    ];

    await expect(executeDialogueV2MemoryView({ data: { studyTarget: 'es' } }, deps))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    for (const data of invalidData) {
      await expect(executeDialogueV2MemoryView({ auth: { uid: AUTH_UID }, data }, deps))
        .rejects.toBeInstanceOf(HttpsError);
      await expect(executeDialogueV2MemoryClear({ auth: { uid: AUTH_UID }, data }, deps))
        .rejects.toBeInstanceOf(HttpsError);
    }
    expect(deps.resolveStableAccountId).not.toHaveBeenCalled();
    expect(memoryRepository.transactionRuns).toEqual([]);
  });

  test('atomically deletes exactly the shared language memory and every released scenario checkpoint', async () => {
    const authorization = languageAuthorization('en');
    const firstScenarioId = authorization.scenarios[0].scenarioId;
    const lastScenarioId = authorization.scenarios.at(-1)!.scenarioId;
    const unrelatedPath = 'users/other/dialogue_v2_memory/d2m_unrelated';
    const memoryRepository = repository({
      [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
      [sharedPath(authorization)]: validSharedDocument(authorization),
      [threadPath(authorization, firstScenarioId)]: validThreadDocument(authorization, firstScenarioId),
      [threadPath(authorization, lastScenarioId)]: validThreadDocument(authorization, lastScenarioId),
      [unrelatedPath]: { keep: true },
    });

    await expect(executeDialogueV2MemoryClear({
      auth: { uid: AUTH_UID },
      data: { studyTarget: 'en' },
    }, dependencies(memoryRepository.repository, authorization))).resolves.toEqual({
      ok: true,
      studyTarget: 'en',
      cleared: true,
      deletedDocuments: 3,
    });

    expect(memoryRepository.transactionRuns).toHaveLength(1);
    expect(memoryRepository.transactionRuns[0]).toHaveLength(DIALOGUE_V2_CATALOGUE_INDEX.length + 1);
    expect(memoryRepository.transactionRuns[0]).toContain(sharedPath(authorization));
    expect(memoryRepository.transactionRuns[0]).toContain(threadPath(authorization, firstScenarioId));
    expect(memoryRepository.transactionRuns[0]).toContain(threadPath(authorization, lastScenarioId));
    expect(memoryRepository.stored.has(unrelatedPath)).toBe(true);
  });

  test('leaves every memory document intact when owner validation or deletion fencing fails', async () => {
    const authorization = languageAuthorization('de');
    const scenarioId = authorization.scenarios[0].scenarioId;
    const memoryPaths = {
      [sharedPath(authorization)]: validSharedDocument(authorization),
      [threadPath(authorization, scenarioId)]: validThreadDocument(authorization, scenarioId),
    };
    for (const identityDocuments of [
      { [`auth_links/${AUTH_UID}`]: { stable_id: 'someone-else' } },
      {
        [`auth_links/${AUTH_UID}`]: { stable_id: STABLE_ID },
        [`account_deletion_tombstones/${STABLE_ID}`]: { pending: true },
      },
    ]) {
      const memoryRepository = repository({ ...identityDocuments, ...memoryPaths });
      await expect(executeDialogueV2MemoryClear({
        auth: { uid: AUTH_UID },
        data: { studyTarget: 'de' },
      }, dependencies(memoryRepository.repository, authorization))).rejects.toBeInstanceOf(HttpsError);
      expect(memoryRepository.stored.has(sharedPath(authorization))).toBe(true);
      expect(memoryRepository.stored.has(threadPath(authorization, scenarioId))).toBe(true);
      expect(memoryRepository.transactionRuns).toEqual([]);
    }
  });
});
