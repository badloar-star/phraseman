import * as admin from 'firebase-admin';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { decisionRegistryObjectPath } from '../../modules/learning-v2/policies/decision_registry';
import { resolvePinnedV2AccessPolicy } from './learning_v2_decision_registry_resolver';
import { makeFirestoreV2AccessRepository } from './learning_v2_access_adapter';
import {
  assertV2AccessStableIdentity,
  executeV2AccessPurchaseCallable,
  normalizeV2AccessPurchaseInput,
} from './learning_v2_access_callable';
import { readProgressAccountBinding } from './learning_v2/progress_event_callable';

const gatePath = (stableId: string, seasonId: string, gateId: string): string =>
  `users/${stableId}/v2_gate_receipts/${seasonId}__${gateId}`;

export const finalizeLearningV2AccessPurchase = onCall({ enforceAppCheck: false },
  async (request: CallableRequest<unknown>) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
    const input = normalizeV2AccessPurchaseInput(request.data);
    const db = admin.firestore();
    const binding = await readProgressAccountBinding(db, request.auth.uid);
    assertV2AccessStableIdentity(input, binding);
    const gateSnapshot = await db.doc(gatePath(binding.stableUid, input.request.seasonId, input.request.gateId)).get();
    const gate = gateSnapshot.data();
    const registryRef = gate?.decisionRegistryRef;
    if (
      !registryRef ||
      typeof registryRef.id !== 'string' ||
      !Number.isSafeInteger(registryRef.version) ||
      typeof registryRef.contentHash !== 'string'
    ) {
      throw new HttpsError('failed-precondition', 'decision_registry_ref_unavailable');
    }
    const artifact = await resolvePinnedV2AccessPolicy(
      {
        download: async (objectPath) => {
          const [bytes] = await admin.storage().bucket().file(objectPath).download();
          return bytes;
        },
      },
      registryRef,
    );
    if (artifact.access.policyVersion !== registryRef.version) {
      throw new HttpsError('failed-precondition', 'decision_registry_version_mismatch');
    }
    return executeV2AccessPurchaseCallable(request, {
      repository: makeFirestoreV2AccessRepository(db),
      resolveAccountBinding: async () => binding,
      resolvePolicy: async () => artifact.access.policy,
      decisionRegistryRef: registryRef,
    });
  },
);

// Keep the object-path helper reachable to the production integration contract
// without allowing callers to choose a mutable latest path.
export { decisionRegistryObjectPath };
