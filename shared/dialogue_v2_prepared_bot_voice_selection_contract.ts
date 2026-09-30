import {
  isDialogueV2PreparedBotVoiceToken,
  type DialogueV2PreparedBotVoiceResponseKind,
} from './dialogue_v2_prepared_bot_voice_catalog';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from './dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT =
  'dialogue_v2_prepared_bot_voice_selection.v2' as const;

export type DialogueV2PreparedBotVoiceSelection = Readonly<{
  contractVersion: typeof DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT;
  sessionId: string;
  turnId: string;
  replyIndex: number;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  voiceCatalogReleaseId: string;
  contentManifestSha256: string;
  contentPackSha256: string;
  personaId: string;
  preparedResponseId: string;
  replyTextSha256: string;
  responseKind: DialogueV2PreparedBotVoiceResponseKind;
  groupPosition: 'direct';
  dayKey: string;
  operationFingerprint: string;
}>;

type PlainRecord = Record<string, unknown>;

const SHA256_RE = /^[a-f0-9]{64}$/;
const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2t_[A-Za-z0-9_-]{16,80}$/;
const UTC_DAY_KEY_RE = /^(19[7-9]\d|[2-9]\d{3})-(\d{2})-(\d{2})$/;
const RESPONSE_KINDS = new Set<DialogueV2PreparedBotVoiceResponseKind>([
  'milestone', 'celebration', 'closing',
]);

function exactPlainRecord(value: unknown, expectedKeys: readonly string[]): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))) return null;
    const output: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

export { isDialogueV2PreparedBotVoiceToken } from './dialogue_v2_prepared_bot_voice_catalog';

export function isDialogueV2UtcDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_DAY_KEY_RE.test(value)) return false;
  try {
    return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  } catch {
    return false;
  }
}

/**
 * Canonical structural parser shared by the server replay boundary, public
 * turn client and local asset runtime. Cryptographic binding is verified by
 * the server/runtime after this transport-safe shape has been accepted.
 */
export function parseDialogueV2PreparedBotVoiceSelection(
  value: unknown,
): DialogueV2PreparedBotVoiceSelection | null {
  const selection = exactPlainRecord(value, [
    'contractVersion', 'sessionId', 'turnId', 'replyIndex', 'studyTarget', 'scenarioId',
    'voiceCatalogReleaseId', 'contentManifestSha256', 'contentPackSha256', 'personaId',
    'preparedResponseId', 'replyTextSha256', 'responseKind', 'groupPosition', 'dayKey',
    'operationFingerprint',
  ]);
  if (!selection
    || selection.contractVersion !== DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT
    || typeof selection.sessionId !== 'string' || !SESSION_ID_RE.test(selection.sessionId)
    || typeof selection.turnId !== 'string' || !TURN_ID_RE.test(selection.turnId)
    || !Number.isSafeInteger(selection.replyIndex) || Number(selection.replyIndex) < 0
    || typeof selection.studyTarget !== 'string'
    || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(selection.studyTarget)
    || !isDialogueV2PreparedBotVoiceToken(selection.scenarioId)
    || !isDialogueV2PreparedBotVoiceToken(selection.voiceCatalogReleaseId)
    || typeof selection.contentManifestSha256 !== 'string'
    || !SHA256_RE.test(selection.contentManifestSha256)
    || typeof selection.contentPackSha256 !== 'string' || !SHA256_RE.test(selection.contentPackSha256)
    || !isDialogueV2PreparedBotVoiceToken(selection.personaId)
    || !isDialogueV2PreparedBotVoiceToken(selection.preparedResponseId)
    || typeof selection.replyTextSha256 !== 'string' || !SHA256_RE.test(selection.replyTextSha256)
    || typeof selection.responseKind !== 'string'
    || !RESPONSE_KINDS.has(selection.responseKind as DialogueV2PreparedBotVoiceResponseKind)
    || selection.groupPosition !== 'direct'
    || !isDialogueV2UtcDayKey(selection.dayKey)
    || typeof selection.operationFingerprint !== 'string'
    || !SHA256_RE.test(selection.operationFingerprint)) return null;

  return Object.freeze({
    contractVersion: DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
    sessionId: selection.sessionId,
    turnId: selection.turnId,
    replyIndex: selection.replyIndex as number,
    studyTarget: selection.studyTarget as DialogueV2StudyTarget,
    scenarioId: selection.scenarioId,
    voiceCatalogReleaseId: selection.voiceCatalogReleaseId,
    contentManifestSha256: selection.contentManifestSha256,
    contentPackSha256: selection.contentPackSha256,
    personaId: selection.personaId,
    preparedResponseId: selection.preparedResponseId,
    replyTextSha256: selection.replyTextSha256,
    responseKind: selection.responseKind as DialogueV2PreparedBotVoiceResponseKind,
    groupPosition: 'direct',
    dayKey: selection.dayKey,
    operationFingerprint: selection.operationFingerprint,
  });
}
