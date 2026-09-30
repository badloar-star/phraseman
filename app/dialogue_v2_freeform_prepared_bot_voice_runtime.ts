import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG,
  parseDialogueV2FreeformPreparedBotVoiceCatalog,
  type DialogueV2FreeformPreparedBotVoiceCatalog,
} from '../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import type { DialogueV2StudyTarget } from '../shared/dialogue_v2_language_pack_contract';
import type {
  DialogueV2FreeformPreparedBotVoiceAssetResolver,
} from './dialogue_v2_freeform_prepared_bot_voice_asset_registry';
import {
  resolveDialogueV2FreeformPreparedBotVoiceAssetUri,
} from './dialogue_v2_freeform_prepared_bot_voice_asset_registry';

/** Deliberately null until a reviewed Freeform audio release is bundled. */
export const CURRENT_DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG:
DialogueV2FreeformPreparedBotVoiceCatalog | null =
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG;

const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const FREEFORM_STUDY_TARGETS = new Set<DialogueV2StudyTarget>(['en', 'es', 'fr', 'de']);

export type DialogueV2FreeformPreparedBotVoiceRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
}>;

export type ResolveDialogueV2FreeformPreparedBotVoiceInput = Readonly<{
  catalog: unknown;
  response: Readonly<{
    sessionId: string;
    turnId: string;
    studyTarget: DialogueV2StudyTarget;
    text: string;
  }>;
  resolveAsset: DialogueV2FreeformPreparedBotVoiceAssetResolver;
  /** Stage 4 receives only identifiers it already owns, never text or asset data. */
  requestSelection: (request: DialogueV2FreeformPreparedBotVoiceRequest) => Promise<unknown>;
}>;

function exactTextOnlyResponse(value: unknown): boolean {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== 'selection') return false;
    const selection = descriptors.selection;
    return Boolean(selection?.enumerable && 'value' in selection && selection.value === null);
  } catch {
    return false;
  }
}

type SafeInputSnapshot = Readonly<{
  catalog: unknown;
  response: Readonly<{ sessionId: string; turnId: string; studyTarget: DialogueV2StudyTarget; text: string }>;
  resolveAsset: DialogueV2FreeformPreparedBotVoiceAssetResolver;
  requestSelection: (request: DialogueV2FreeformPreparedBotVoiceRequest) => Promise<unknown>;
}>;

function safeInputSnapshot(value: unknown): SafeInputSnapshot | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const expectedKeys = ['catalog', 'response', 'resolveAsset', 'requestSelection'];
    if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== 'string'
      || !expectedKeys.includes(key))) return null;
    for (const key of expectedKeys) {
      if (!descriptors[key]?.enumerable || !('value' in descriptors[key]!)) return null;
    }
    const response = descriptors.response!.value;
    if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
    const responseDescriptors = Object.getOwnPropertyDescriptors(response);
    const responseKeys = Reflect.ownKeys(responseDescriptors);
    const expectedResponseKeys = ['sessionId', 'turnId', 'studyTarget', 'text'];
    if (responseKeys.length !== expectedResponseKeys.length || responseKeys.some((key) => typeof key !== 'string'
      || !expectedResponseKeys.includes(key))) return null;
    for (const key of expectedResponseKeys) {
      if (!responseDescriptors[key]?.enumerable || !('value' in responseDescriptors[key]!)) return null;
    }
    const snapshotResponse = Object.freeze({
      sessionId: responseDescriptors.sessionId!.value,
      turnId: responseDescriptors.turnId!.value,
      studyTarget: responseDescriptors.studyTarget!.value,
      text: responseDescriptors.text!.value,
    });
    if (typeof snapshotResponse.sessionId !== 'string' || !SESSION_ID_RE.test(snapshotResponse.sessionId)
      || typeof snapshotResponse.turnId !== 'string' || !TURN_ID_RE.test(snapshotResponse.turnId)
      || typeof snapshotResponse.studyTarget !== 'string'
      || !FREEFORM_STUDY_TARGETS.has(snapshotResponse.studyTarget as DialogueV2StudyTarget)
      || typeof snapshotResponse.text !== 'string'
      || typeof descriptors.resolveAsset!.value !== 'function'
      || typeof descriptors.requestSelection!.value !== 'function') return null;
    return Object.freeze({
      catalog: descriptors.catalog!.value,
      response: snapshotResponse as SafeInputSnapshot['response'],
      resolveAsset: descriptors.resolveAsset!.value as DialogueV2FreeformPreparedBotVoiceAssetResolver,
      requestSelection: descriptors.requestSelection!.value as SafeInputSnapshot['requestSelection'],
    });
  } catch {
    return null;
  }
}

/**
 * Current catalog state is null, so this always remains text-only and makes no
 * callable request. The future path gates any request on exact reviewed text
 * plus a verified build-local asset; response data is never accepted as audio.
 */
export async function resolveDialogueV2FreeformPreparedBotVoice(
  input: ResolveDialogueV2FreeformPreparedBotVoiceInput,
): Promise<null> {
  const snapshot = safeInputSnapshot(input);
  if (!snapshot) return null;
  const catalog = snapshot.catalog === null
    ? null
    : parseDialogueV2FreeformPreparedBotVoiceCatalog(snapshot.catalog);
  if (!catalog) return null;
  const entry = catalog.entries.find((candidate) => (
    candidate.studyTarget === snapshot.response.studyTarget
    && candidate.replyText === snapshot.response.text
  ));
  if (!entry) return null;

  let capability: unknown;
  try { capability = await snapshot.resolveAsset(entry.assetKey); } catch { return null; }
  if (!resolveDialogueV2FreeformPreparedBotVoiceAssetUri(capability, entry)) return null;

  const request = Object.freeze({
    sessionId: snapshot.response.sessionId,
    turnId: snapshot.response.turnId,
    studyTarget: snapshot.response.studyTarget,
  });
  let result: unknown;
  try { result = await snapshot.requestSelection(request); } catch { return null; }
  if (!exactTextOnlyResponse(result)) return null;
  // Stage 4 is deliberately text-only; a future audio-bearing public response
  // requires a new reviewed contract rather than silently changing this path.
  return null;
}

export async function resolveCurrentDialogueV2FreeformPreparedBotVoice(
  input: Omit<ResolveDialogueV2FreeformPreparedBotVoiceInput, 'catalog' | 'resolveAsset'> & {
    resolveAsset: DialogueV2FreeformPreparedBotVoiceAssetResolver;
  },
): Promise<null> {
  try {
    return await resolveDialogueV2FreeformPreparedBotVoice({
      response: input.response,
      resolveAsset: input.resolveAsset,
      requestSelection: input.requestSelection,
      catalog: CURRENT_DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG,
    });
  } catch {
    return null;
  }
}
