import * as admin from 'firebase-admin';
import { types as nodeTypes } from 'node:util';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import {
  buildDialogueV2MemoryLanguageAuthorization,
  executeDialogueV2MemoryClear,
  executeDialogueV2MemoryView,
  makeFirestoreDialogueV2MemoryManagementRepository,
  type DialogueV2MemoryManagementDependencies,
} from './dialogue_v2_memory_management';
import type { DialogueV2MemoryStudyTarget } from './dialogue_v2_memory_contract';
import { authorizeDialogueV2ServerLanguagePacks } from './dialogue_v2_server_authorization';
import { resolvePremiumAccess } from './premium_status';

const REGION = 'us-central1';
const STUDY_TARGETS: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de']);
const DIALOGUE_V2_MEMORY_ID_SECRET = defineSecret('DIALOGUE_V2_MEMORY_ID_SECRET');

const CALLABLE_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  maxInstances: 20,
  secrets: [DIALOGUE_V2_MEMORY_ID_SECRET],
});

type Selection = Readonly<{ studyTarget: DialogueV2MemoryStudyTarget }>;

function exactSelection(value: unknown): Selection | null {
  try {
    if (!value
      || typeof value !== 'object'
      || Array.isArray(value)
      || nodeTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== 'studyTarget') return null;
    const descriptor = descriptors.studyTarget;
    if (!descriptor?.enumerable
      || !('value' in descriptor)
      || typeof descriptor.value !== 'string'
      || !STUDY_TARGETS.has(descriptor.value)) return null;
    return Object.freeze({ studyTarget: descriptor.value as DialogueV2MemoryStudyTarget });
  } catch {
    return null;
  }
}

function releaseRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2CompletionReleaseRepository {
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

function dependencies(
  db: FirebaseFirestore.Firestore,
): DialogueV2MemoryManagementDependencies {
  return Object.freeze({
    repository: makeFirestoreDialogueV2MemoryManagementRepository(db),
    identifierSecret: DIALOGUE_V2_MEMORY_ID_SECRET.value(),
    resolveStableAccountId: (authUid: string) => resolveStableUidForAuth(db, authUid),
    resolvePremiumAccess: (stableAccountId: string, authUid: string) => resolvePremiumAccess(
      db,
      stableAccountId,
      Date.now(),
      authUid,
    ),
    resolveLanguageAuthorization: async (studyTarget, stableAccountId, identifierSecret) => {
      const release = await loadDialogueV2CompletionReleaseCandidate(releaseRepository(db));
      if (!release) return null;
      const approvedPacks = authorizeDialogueV2ServerLanguagePacks(studyTarget, release);
      if (!approvedPacks) return null;
      return buildDialogueV2MemoryLanguageAuthorization({
        studyTarget,
        stableAccountId,
        identifierSecret,
        approvedPacks,
      });
    },
  });
}

function exactRequest(request: Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>): Readonly<{ auth: Readonly<{ uid: string }>; data: Selection }> {
  const authUid = request.auth?.uid;
  if (typeof authUid !== 'string' || authUid.length < 1 || authUid.length > 128) {
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const selection = exactSelection(request.data);
  if (!selection) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_management_request_invalid');
  }
  return Object.freeze({ auth: Object.freeze({ uid: authUid }), data: selection });
}

export const dialogueV2MemoryView = onCall(CALLABLE_OPTIONS, async (request) => {
  const safeRequest = exactRequest(request);
  const response = await executeDialogueV2MemoryView(
    safeRequest,
    dependencies(admin.firestore()),
  );
  return Object.freeze({
    ok: true as const,
    studyTarget: response.studyTarget,
    sharedSummary: response.sharedSummary,
    scenarioCheckpoints: response.scenarioCheckpoints,
  });
});

export const dialogueV2MemoryClear = onCall(CALLABLE_OPTIONS, async (request) => {
  const safeRequest = exactRequest(request);
  const response = await executeDialogueV2MemoryClear(
    safeRequest,
    dependencies(admin.firestore()),
  );
  return Object.freeze({
    ok: true as const,
    studyTarget: response.studyTarget,
    cleared: true as const,
    deletedDocuments: response.deletedDocuments,
  });
});
