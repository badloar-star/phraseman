import * as admin from 'firebase-admin';
import { types as nodeTypes } from 'node:util';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getDialogueV2CatalogueEntry } from '../../shared/dialogue_v2_catalogue_index';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import type { DialogueV2MemoryStudyTarget } from './dialogue_v2_memory_contract';
import {
  executeDialogueV2MemoryRead,
  makeFirestoreDialogueV2MemoryRepository,
} from './dialogue_v2_memory_writer';
import { resolvePremiumAccess } from './premium_status';

const REGION = 'us-central1';
const DIALOGUE_V2_MEMORY_ID_SECRET = defineSecret('DIALOGUE_V2_MEMORY_ID_SECRET');
const STUDY_TARGETS: ReadonlySet<string> = new Set(['en', 'es', 'fr', 'de']);

type DialogueV2MemoryResumeSelection = Readonly<{
  studyTarget: DialogueV2MemoryStudyTarget;
  scenarioId: string;
}>;

function exactSelection(value: unknown): DialogueV2MemoryResumeSelection | null {
  try {
    if (!value
      || typeof value !== 'object'
      || nodeTypes.isProxy(value)
      || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 2
      || keys.some((key) => typeof key !== 'string')
      || !keys.includes('studyTarget')
      || !keys.includes('scenarioId')) return null;
    const studyTargetDescriptor = descriptors.studyTarget;
    const scenarioIdDescriptor = descriptors.scenarioId;
    if (!studyTargetDescriptor?.enumerable
      || !('value' in studyTargetDescriptor)
      || !scenarioIdDescriptor?.enumerable
      || !('value' in scenarioIdDescriptor)
      || typeof studyTargetDescriptor.value !== 'string'
      || !STUDY_TARGETS.has(studyTargetDescriptor.value)
      || typeof scenarioIdDescriptor.value !== 'string'
      || !getDialogueV2CatalogueEntry(scenarioIdDescriptor.value)) return null;
    return Object.freeze({
      studyTarget: studyTargetDescriptor.value as DialogueV2MemoryStudyTarget,
      scenarioId: scenarioIdDescriptor.value,
    });
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

/**
 * Returns only bounded structured dialogue memory. Identity, Plus access,
 * opaque storage IDs and the active release are resolved exclusively by the
 * server; transcript and provider inputs are not part of this boundary.
 */
export const dialogueV2MemoryResume = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [DIALOGUE_V2_MEMORY_ID_SECRET],
}, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const selection = exactSelection(request.data);
  if (!selection) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_memory_read_request_invalid');
  }

  const db = admin.firestore();
  const response = await executeDialogueV2MemoryRead({
    auth: { uid: authUid },
    data: selection,
  }, {
    repository: makeFirestoreDialogueV2MemoryRepository(db),
    identifierSecret: DIALOGUE_V2_MEMORY_ID_SECRET.value(),
    resolveStableAccountId: (candidateAuthUid) => resolveStableUidForAuth(
      db,
      candidateAuthUid,
    ),
    resolvePremiumAccess: (stableAccountId, candidateAuthUid) => resolvePremiumAccess(
      db,
      stableAccountId,
      Date.now(),
      candidateAuthUid,
    ),
    resolveRelease: () => loadDialogueV2CompletionReleaseCandidate(
      releaseRepository(db),
    ),
  });

  return Object.freeze({
    ok: true as const,
    sharedSummary: response.sharedSummary,
    scenarioCheckpoint: response.scenarioCheckpoint,
  });
});
