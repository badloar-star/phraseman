import { types as nodeTypes } from 'node:util';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  parseDialogueV2FreeformSelection,
} from '../../shared/dialogue_v2_freeform_contract';
import type {
  DialogueV2FreeformSelection,
} from '../../shared/dialogue_v2_freeform_contract';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';

const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const STABLE_ACCOUNT_ID_RE = /^(?=.{1,256}$)[^/\u0000-\u001f\u007f]+$/;

export const DIALOGUE_V2_FREEFORM_ATOMIC_AUTHORIZATION_UNAVAILABLE =
  'dialogue_v2_freeform_atomic_authorization_unavailable';

function rethrowProductionAuthorizationHold(error: unknown): void {
  if (error instanceof HttpsError
    && error.code === 'failed-precondition'
    && error.message === DIALOGUE_V2_FREEFORM_ATOMIC_AUTHORIZATION_UNAVAILABLE) {
    throw error;
  }
}

export type DialogueV2FreeformLegacyAuthorizationDependencies = Readonly<{
  authorizeAtomic?: never;
  resolveStableAccountId(authUid: string): Promise<string>;
  assertAccountActive(authUid: string, stableAccountId: string): Promise<void>;
  resolvePremiumAccess(stableAccountId: string, authUid: string): Promise<boolean>;
}>;

type DialogueV2FreeformAtomicAuthorizationDependencies = Readonly<{
  authorizeAtomic(authUid: string): Promise<void>;
  resolveStableAccountId?: never;
  assertAccountActive?: never;
  resolvePremiumAccess?: never;
}>;

export type DialogueV2FreeformAuthorizationDependencies =
  | DialogueV2FreeformLegacyAuthorizationDependencies
  | DialogueV2FreeformAtomicAuthorizationDependencies;

export type DialogueV2FreeformAuthorizationRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  data?: unknown;
}>;

export type DialogueV2FreeformAuthorizationResponse = Readonly<{
  ok: true;
  studyTarget: DialogueV2StudyTarget;
}>;

const SAFE_ATOMIC_AUTHORIZATION_ERRORS = new Set([
  'dialogue_v2_freeform_identity_unavailable',
  'dialogue_v2_freeform_account_unavailable',
  'dialogue_v2_freeform_entitlement_unavailable',
  'dialogue_v2_freeform_plus_required',
]);

function rethrowSafeAtomicAuthorizationError(error: unknown): void {
  if (error instanceof HttpsError && SAFE_ATOMIC_AUTHORIZATION_ERRORS.has(error.message)) {
    throw error;
  }
}

/**
 * The callable's actual trust boundary. A shared structural parser cannot
 * reliably identify a transparent Proxy in every JavaScript runtime, whereas
 * the Node Functions runtime can and must reject one before inspection.
 */
export function parseDialogueV2FreeformServerSelection(
  value: unknown,
): DialogueV2FreeformSelection | null {
  if (value && typeof value === 'object' && nodeTypes.isProxy(value)) return null;
  return parseDialogueV2FreeformSelection(value);
}

/**
 * Testable, non-public authorization boundary for a future V2 freeform turn.
 * This module deliberately exposes no Firebase callable and performs no I/O
 * beyond the injected identity, account-state and entitlement authorities.
 */
export function createDialogueV2FreeformAuthorizationHandler(
  dependencies: DialogueV2FreeformAuthorizationDependencies,
): (
  request: DialogueV2FreeformAuthorizationRequest,
) => Promise<DialogueV2FreeformAuthorizationResponse> {
  return async (request) => {
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    const selection = parseDialogueV2FreeformServerSelection(request.data);
    if (!selection) {
      throw new HttpsError('invalid-argument', 'dialogue_v2_freeform_request_invalid');
    }

    if (dependencies.authorizeAtomic) {
      try {
        await dependencies.authorizeAtomic(authUid);
      } catch (error) {
        rethrowSafeAtomicAuthorizationError(error);
        throw new HttpsError(
          'failed-precondition',
          DIALOGUE_V2_FREEFORM_ATOMIC_AUTHORIZATION_UNAVAILABLE,
        );
      }
      return Object.freeze({
        ok: true as const,
        studyTarget: selection.studyTarget,
      });
    }

    let stableAccountId: string;
    try {
      stableAccountId = await dependencies.resolveStableAccountId(authUid);
      if (typeof stableAccountId !== 'string'
        || !STABLE_ACCOUNT_ID_RE.test(stableAccountId)) throw new Error('identity_invalid');
    } catch (error) {
      rethrowProductionAuthorizationHold(error);
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_identity_unavailable',
      );
    }

    try {
      await dependencies.assertAccountActive(authUid, stableAccountId);
    } catch (error) {
      rethrowProductionAuthorizationHold(error);
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_account_unavailable',
      );
    }

    let isPremium: boolean;
    try {
      isPremium = await dependencies.resolvePremiumAccess(stableAccountId, authUid);
    } catch (error) {
      rethrowProductionAuthorizationHold(error);
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_entitlement_unavailable',
      );
    }
    if (isPremium !== true) {
      throw new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required');
    }

    return Object.freeze({
      ok: true as const,
      studyTarget: selection.studyTarget,
    });
  };
}
