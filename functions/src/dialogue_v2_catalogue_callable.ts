import * as admin from 'firebase-admin';
import { types as nodeTypes } from 'node:util';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../../shared/dialogue_v2_language_pack_contract';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  loadDialogueV2CompletionReleaseCandidate,
  type DialogueV2CompletionReleaseRepository,
} from './dialogue_v2_completion_release_source';
import { authorizeDialogueV2ServerCatalogue } from './dialogue_v2_server_authorization';

const REGION = 'us-central1';

function exactStudyTarget(value: unknown): DialogueV2StudyTarget | null {
  try {
    if (!value
      || typeof value !== 'object'
      || nodeTypes.isProxy(value)
      || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== 'studyTarget') return null;
    const descriptor = descriptors.studyTarget;
    if (!descriptor?.enumerable || !('value' in descriptor)) return null;
    return typeof descriptor.value === 'string'
      && (DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(descriptor.value)
      ? descriptor.value as DialogueV2StudyTarget
      : null;
  } catch {
    return null;
  }
}

function releaseRepository(
  db: FirebaseFirestore.Firestore,
): DialogueV2CompletionReleaseRepository {
  return Object.freeze({
    readDocument: async (documentPath: string) => {
      const snapshot = await db.doc(documentPath).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    readCollection: async (collectionPath: string) => {
      const snapshot = await db.collection(collectionPath).get();
      return snapshot.docs.map((document) => Object.freeze({
        id: document.id,
        data: document.data(),
      }));
    },
  });
}

/**
 * Returns the learner-safe, manifest-pinned catalogue for one study target.
 * No release control fields, authoring metadata or access decisions cross this
 * boundary; rank gating remains a local product rule.
 */
export const dialogueV2Catalogue = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 20,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const studyTarget = exactStudyTarget(request.data);
  if (!studyTarget) {
    throw new HttpsError('invalid-argument', 'dialogue_v2_catalogue_request_invalid');
  }

  try {
    const release = await loadDialogueV2CompletionReleaseCandidate(
      releaseRepository(admin.firestore()),
    );
    const authorized = release
      ? authorizeDialogueV2ServerCatalogue(studyTarget, release)
      : null;
    if (!authorized) throw new Error('release_unavailable');
    return Object.freeze({
      ok: true as const,
      packets: authorized.packets,
    });
  } catch {
    throw new HttpsError(
      'failed-precondition',
      'dialogue_v2_catalogue_release_unavailable',
    );
  }
});
