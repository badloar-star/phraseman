import { types as nodeTypes } from 'node:util';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import {
  parseDialogueV2FreeformPreparedBotVoiceSelection,
  type DialogueV2FreeformPreparedBotVoiceSelection,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  createDialogueV2FreeformPreparedBotVoiceFirestoreRepository,
  type DialogueV2FreeformPreparedBotVoiceFirestoreRuntime,
  type DialogueV2FreeformPreparedBotVoiceResolveRequest,
} from './dialogue_v2_freeform_prepared_bot_voice_firestore_repository';

const buildPreparedBotVoiceRepository =
  createDialogueV2FreeformPreparedBotVoiceFirestoreRepository;
const parseSelection = parseDialogueV2FreeformPreparedBotVoiceSelection;
const isProxyObject = nodeTypes.isProxy;
const defaultPreparedBotVoiceCatalog =
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG;

const AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const FREEFORM_STUDY_TARGETS = Object.freeze(['en', 'es', 'fr', 'de'] as const);

type ResolverRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  app?: Readonly<{ appId?: unknown }>;
  data?: unknown;
}>;

type ResolverPublicResult = Readonly<{
  ok: true;
  selection: DialogueV2FreeformPreparedBotVoiceSelection | null;
}>;

export type DialogueV2FreeformPreparedBotVoiceResolverDependencies = Readonly<{
  requireAppCheck: boolean;
  resolveAuthorized(
    authUid: string,
    request: DialogueV2FreeformPreparedBotVoiceResolveRequest,
  ): Promise<unknown>;
}>;

function exactPlainRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || isProxyObject(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function exactInput(value: unknown): DialogueV2FreeformPreparedBotVoiceResolveRequest | null {
  const input = exactPlainRecord(value);
  const expectedKeys = ['sessionId', 'turnId', 'studyTarget'];
  if (!input
    || Object.keys(input).length !== expectedKeys.length
    || !Object.keys(input).every((key) => expectedKeys.includes(key))
    || typeof input.sessionId !== 'string' || !SESSION_ID_RE.test(input.sessionId)
    || typeof input.turnId !== 'string' || !TURN_ID_RE.test(input.turnId)
    || typeof input.studyTarget !== 'string'
    || !(FREEFORM_STUDY_TARGETS as readonly string[]).includes(input.studyTarget)) return null;
  return Object.freeze({
    sessionId: input.sessionId,
    turnId: input.turnId,
    studyTarget: input.studyTarget as DialogueV2StudyTarget,
  });
}

function unavailable(): HttpsError {
  return new HttpsError('unavailable', 'dialogue_v2_freeform_bot_voice_unavailable');
}

/**
 * Internal callable-compatible request handler. It is intentionally not wired
 * through onCall or exported from index.ts until the reviewed catalog and
 * trusted post-commit timing writer exist.
 */
export function createDialogueV2FreeformPreparedBotVoiceResolverHandler(
  dependencies: DialogueV2FreeformPreparedBotVoiceResolverDependencies,
): (request: ResolverRequest) => Promise<ResolverPublicResult> {
  const resolveAuthorized = dependencies.resolveAuthorized;
  const requireAppCheck = dependencies.requireAppCheck === true;
  return async (request) => {
    const authUid = request.auth?.uid;
    if (typeof authUid !== 'string' || !AUTH_UID_RE.test(authUid)) {
      throw new HttpsError('unauthenticated', 'auth_required');
    }
    if (requireAppCheck
      && (!request.app || typeof request.app.appId !== 'string' || !request.app.appId)) {
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_bot_voice_app_check_required',
      );
    }
    const input = exactInput(request.data);
    if (!input) {
      throw new HttpsError(
        'invalid-argument',
        'dialogue_v2_freeform_bot_voice_request_invalid',
      );
    }
    let rawSelection: unknown;
    try {
      rawSelection = await resolveAuthorized(authUid, input);
    } catch {
      throw unavailable();
    }
    if (rawSelection === null) return Object.freeze({ ok: true, selection: null });
    const selection = parseSelection(rawSelection);
    if (!selection
      || selection.sessionId !== input.sessionId
      || selection.turnId !== input.turnId
      || selection.studyTarget !== input.studyTarget) throw unavailable();
    return Object.freeze({ ok: true, selection });
  };
}

/**
 * Production-shaped internal composition. The accepted Stage 1 catalog is
 * deliberately null, so this cannot create claims or selections. A future
 * reviewed release must change this boundary explicitly.
 */
export function createDialogueV2FreeformPreparedBotVoiceInternalResolver(
  runtime: Omit<DialogueV2FreeformPreparedBotVoiceFirestoreRuntime, 'serverCatalog'>,
  requireAppCheck: boolean,
): ReturnType<typeof createDialogueV2FreeformPreparedBotVoiceResolverHandler> {
  const repository = buildPreparedBotVoiceRepository(Object.freeze({
    ...runtime,
    serverCatalog: defaultPreparedBotVoiceCatalog,
  }));
  const resolveAuthorized = repository.resolveAfterCommittedTurn;
  return createDialogueV2FreeformPreparedBotVoiceResolverHandler(Object.freeze({
    requireAppCheck,
    resolveAuthorized: (authUid, request) => resolveAuthorized(authUid, request),
  }));
}
