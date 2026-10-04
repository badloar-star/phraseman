import * as admin from 'firebase-admin';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import { resolveStableUidForAuth } from './auth_identity';
import { loadDialogueV2CompletionReleaseCandidate } from './dialogue_v2_completion_release_source';
import { deriveDialogueV2MemoryPlan } from './dialogue_v2_memory_contract';
import { dialogueV2MemoryResume } from './dialogue_v2_memory_resume_callable';
import {
  executeDialogueV2MemoryRead,
  makeFirestoreDialogueV2MemoryRepository,
  type DialogueV2MemoryPersistenceRepository,
} from './dialogue_v2_memory_writer';
import { computeDialogueV2PackSha256 } from './dialogue_v2_pack_integrity';
import type { DialogueV2ServerRelease } from './dialogue_v2_server_authorization';
import { resolvePremiumAccess } from './premium_status';

const PROJECT_ID = 'demo-phraseman-dialogue-v2-memory-resume';
const RELEASE_ID = 'emulator_dialogue_v2_release';
const IDENTIFIER_SECRET = 'emulator-dialogue-memory-secret-2026-09-26';
const STUDY_TARGET = 'es' as const;
const SCENARIO_ID = 'travel_19';
const AUTH_FREE = 'auth-free';
const AUTH_PLUS = 'auth-plus';
const STABLE_FREE = 'stable-free';
const STABLE_PLUS = 'stable-plus';
const STABLE_VICTIM = 'stable-victim';

function languagePack(
  studyTarget: DialogueV2StudyTarget,
  scenarioId: string,
): DialogueV2LanguagePack {
  const catalogueEntry = DIALOGUE_V2_CATALOGUE_INDEX.find((entry) => entry.id === scenarioId);
  if (!catalogueEntry) throw new Error(`unknown_emulator_scenario:${scenarioId}`);
  const objectiveIds = Array.from(
    { length: 6 },
    (_, index) => `${scenarioId}_o${index + 1}`,
  );
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
        id: 'host',
        replyStyle: 'calm',
        voiceMode: 'text_only',
        displayName: 'Anfitrion',
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
      title: `Conversacion ${scenarioId}`,
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

function approvedRelease(): DialogueV2ServerRelease {
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
  return Object.freeze({ manifest, packets });
}

const APPROVED_RELEASE = approvedRelease();
const SELECTED_PACKET = APPROVED_RELEASE.packets[`${STUDY_TARGET}:${SCENARIO_ID}`];
if (!SELECTED_PACKET) throw new Error('selected_emulator_packet_missing');
const SELECTED_REFERENCE = APPROVED_RELEASE.manifest[`${STUDY_TARGET}:${SCENARIO_ID}`];
if (!SELECTED_REFERENCE) throw new Error('selected_emulator_manifest_reference_missing');
const OBJECTIVE_IDS = SELECTED_PACKET.scenario.objectives.map((objective) => objective.id);
const SUMMARY = Object.freeze({
  strengths: Object.freeze([OBJECTIVE_IDS[0]]),
  focusAreas: Object.freeze([OBJECTIVE_IDS[1]]),
  completedObjectives: 1,
});
const CHECKPOINT = Object.freeze({
  nextObjectiveIndex: 1,
  completedObjectiveIds: Object.freeze([OBJECTIVE_IDS[0]]),
  personaState: Object.freeze({ host: 'helpful' }),
});

type ResumeCallable = Readonly<{
  run(request: unknown): Promise<unknown>;
}>;

function callable(): ResumeCallable {
  return dialogueV2MemoryResume as unknown as ResumeCallable;
}

function releaseRepository(db: FirebaseFirestore.Firestore) {
  return Object.freeze({
    readDocument: async (path: string) => {
      const snapshot = await db.doc(path).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    readCollection: async (path: string) => {
      const snapshot = await db.collection(path).get();
      return snapshot.docs.map((document) => Object.freeze({
        id: document.id,
        data: document.data(),
      }));
    },
  });
}

function memoryPaths(stableAccountId: string, isPremium: boolean) {
  const plan = deriveDialogueV2MemoryPlan({
    stableAccountId,
    isPremium,
    identifierSecret: IDENTIFIER_SECRET,
    approvedPackManifest: APPROVED_RELEASE.manifest,
  }, { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID });
  if (!plan) throw new Error('emulator_memory_plan_unavailable');
  const shared = `users/${stableAccountId}/dialogue_v2_memory/${plan.sharedMemory.id}`;
  return Object.freeze({
    shared,
    thread: plan.scenarioThread
      ? `${shared}/threads/${plan.scenarioThread.id}`
      : null,
  });
}

function sharedDocument() {
  return {
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: STUDY_TARGET,
    manifestReference: SELECTED_REFERENCE,
    summary: SUMMARY,
  };
}

function threadDocument() {
  return {
    contractVersion: 'dialogue_v2_memory_v1',
    studyTarget: STUDY_TARGET,
    scenarioId: SCENARIO_ID,
    manifestReference: SELECTED_REFERENCE,
    checkpoint: CHECKPOINT,
  };
}

function trackedRepository(db: FirebaseFirestore.Firestore): Readonly<{
  repository: DialogueV2MemoryPersistenceRepository;
  transactionCalls(): number;
}> {
  const base = makeFirestoreDialogueV2MemoryRepository(db);
  let calls = 0;
  return Object.freeze({
    repository: Object.freeze({
      runTransaction: async <T>(work: Parameters<DialogueV2MemoryPersistenceRepository['runTransaction']>[0]) => {
        calls += 1;
        return base.runTransaction(work) as Promise<T>;
      },
    }),
    transactionCalls: () => calls,
  });
}

jest.setTimeout(120_000);

describe('Dialogue V2 memory resume callable (Firestore emulator)', () => {
  let app: admin.app.App;
  let db: admin.firestore.Firestore;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    process.env.DIALOGUE_V2_MEMORY_ID_SECRET = IDENTIFIER_SECRET;
    app = admin.apps.find((candidate): candidate is admin.app.App => Boolean(
      candidate && candidate.name === '[DEFAULT]',
    )) ?? admin.initializeApp({ projectId: PROJECT_ID });
    db = admin.firestore(app);

    const batch = db.batch();
    batch.set(db.doc('dialogue_v2_release_control/active'), {
      schemaVersion: 'dialogue-v2-release-pointer.v1',
      status: 'active',
      releaseId: RELEASE_ID,
    });
    batch.set(db.doc(`dialogue_v2_releases/${RELEASE_ID}`), {
      schemaVersion: 'dialogue-v2-server-release.v1',
      status: 'approved',
      manifest: APPROVED_RELEASE.manifest,
    });
    for (const [key, packet] of Object.entries(APPROVED_RELEASE.packets)) {
      batch.set(
        db.doc(`dialogue_v2_releases/${RELEASE_ID}/packets/${key.replace(':', '__')}`),
        packet,
      );
    }
    await batch.commit();
  });

  afterAll(async () => {
    delete process.env.DIALOGUE_V2_MEMORY_ID_SECRET;
    await db.terminate();
    await app.delete();
  });

  beforeEach(async () => {
    const batch = db.batch();
    batch.set(db.doc('dialogue_v2_release_control/active'), {
      schemaVersion: 'dialogue-v2-release-pointer.v1',
      status: 'active',
      releaseId: RELEASE_ID,
    });
    batch.set(db.doc(`auth_links/${AUTH_FREE}`), { stable_id: STABLE_FREE });
    batch.set(db.doc(`auth_links/${AUTH_PLUS}`), { stable_id: STABLE_PLUS });
    batch.set(db.doc(`users/${STABLE_FREE}`), {
      firebaseAuthUid: AUTH_FREE,
      progress: {},
    });
    batch.set(db.doc(`users/${STABLE_PLUS}`), {
      firebaseAuthUid: AUTH_PLUS,
      progress: { premium_plan: 'monthly', premium_expiry: '0' },
    });
    batch.set(db.doc(`users/${STABLE_VICTIM}`), {
      firebaseAuthUid: 'auth-victim',
      progress: { premium_plan: 'monthly', premium_expiry: '0' },
    });
    batch.delete(db.doc(`account_deletion_tombstones/${STABLE_FREE}`));
    batch.delete(db.doc(`account_deletion_tombstones/${STABLE_PLUS}`));

    for (const stableAccountId of [STABLE_FREE, STABLE_PLUS, STABLE_VICTIM]) {
      const paths = memoryPaths(stableAccountId, true);
      if (!paths.thread) throw new Error('emulator_thread_path_unavailable');
      batch.set(db.doc(paths.shared), sharedDocument());
      batch.set(db.doc(paths.thread), threadDocument());
    }
    await batch.commit();
  });

  test('Free is Plus-gated before any released memory can be returned', async () => {
    await expect(callable().run({
      auth: { uid: AUTH_FREE },
      data: { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID },
    })).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_memory_plus_required',
    });
  });

  test('Plus receives its own released scenario checkpoint', async () => {
    await expect(callable().run({
      auth: { uid: AUTH_PLUS },
      data: { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID },
    })).resolves.toEqual({
      ok: true,
      sharedSummary: SUMMARY,
      scenarioCheckpoint: CHECKPOINT,
    });
  });

  test('denies a cross-account auth-link race and an account tombstone', async () => {
    const request = {
      auth: { uid: AUTH_PLUS },
      data: { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID },
    } as const;

    const mismatchRepository = makeFirestoreDialogueV2MemoryRepository(db);
    await expect(executeDialogueV2MemoryRead(request, {
      repository: mismatchRepository,
      identifierSecret: IDENTIFIER_SECRET,
      resolveStableAccountId: (authUid) => resolveStableUidForAuth(db, authUid),
      resolvePremiumAccess: (stableAccountId, authUid) => resolvePremiumAccess(
        db,
        stableAccountId,
        Date.now(),
        authUid,
      ),
      resolveRelease: async () => {
        const release = await loadDialogueV2CompletionReleaseCandidate(releaseRepository(db));
        await db.doc(`auth_links/${AUTH_PLUS}`).set({ stable_id: STABLE_VICTIM });
        return release;
      },
    })).rejects.toMatchObject({
      code: 'permission-denied',
      message: 'dialogue_v2_memory_identity_mismatch',
    });

    await db.doc(`auth_links/${AUTH_PLUS}`).set({ stable_id: STABLE_PLUS });
    await expect(executeDialogueV2MemoryRead(request, {
      repository: makeFirestoreDialogueV2MemoryRepository(db),
      identifierSecret: IDENTIFIER_SECRET,
      resolveStableAccountId: (authUid) => resolveStableUidForAuth(db, authUid),
      resolvePremiumAccess: (stableAccountId, authUid) => resolvePremiumAccess(
        db,
        stableAccountId,
        Date.now(),
        authUid,
      ),
      resolveRelease: async () => {
        const release = await loadDialogueV2CompletionReleaseCandidate(releaseRepository(db));
        await db.doc(`account_deletion_tombstones/${STABLE_PLUS}`).set({ deletedAt: 1 });
        return release;
      },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_memory_account_delete_pending',
    });
  });

  test('rejects an unavailable active release before opening a memory transaction', async () => {
    await db.doc('dialogue_v2_release_control/active').delete();
    const tracked = trackedRepository(db);

    await expect(executeDialogueV2MemoryRead({
      auth: { uid: AUTH_PLUS },
      data: { studyTarget: STUDY_TARGET, scenarioId: SCENARIO_ID },
    }, {
      repository: tracked.repository,
      identifierSecret: IDENTIFIER_SECRET,
      resolveStableAccountId: (authUid) => resolveStableUidForAuth(db, authUid),
      resolvePremiumAccess: (stableAccountId, authUid) => resolvePremiumAccess(
        db,
        stableAccountId,
        Date.now(),
        authUid,
      ),
      resolveRelease: () => loadDialogueV2CompletionReleaseCandidate(releaseRepository(db)),
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'dialogue_v2_memory_release_unavailable',
    });
    expect(tracked.transactionCalls()).toBe(0);
  });
});
