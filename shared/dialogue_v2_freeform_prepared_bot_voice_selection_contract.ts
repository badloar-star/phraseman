import type {
  DialogueV2FreeformPreparedBotVoiceResponseKind,
} from './dialogue_v2_freeform_prepared_bot_voice_catalog';
import type { DialogueV2StudyTarget } from './dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT =
  'dialogue_v2_freeform_prepared_bot_voice_selection.v1' as const;

export type DialogueV2FreeformPreparedBotVoiceSelection = Readonly<{
  contractVersion: typeof DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT;
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  voiceCatalogReleaseId: string;
  voiceCatalogReleaseSha256: string;
  voiceStyleId: string;
  preparedResponseId: string;
  replyTextSha256: string;
  responseKind: DialogueV2FreeformPreparedBotVoiceResponseKind;
  dayKey: string;
  operationFingerprint: string;
}>;

type PlainRecord = Record<string, unknown>;

const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const UTC_DAY_KEY_RE = /^(19[7-9]\d|[2-9]\d{3})-(\d{2})-(\d{2})$/;
const FREEFORM_STUDY_TARGETS = Object.freeze(['en', 'es', 'fr', 'de'] as const);
const RESPONSE_KINDS = new Set<DialogueV2FreeformPreparedBotVoiceResponseKind>([
  'milestone', 'celebration', 'closing',
]);
const SELECTION_KEYS = Object.freeze([
  'contractVersion', 'sessionId', 'turnId', 'studyTarget', 'voiceCatalogReleaseId',
  'voiceCatalogReleaseSha256', 'voiceStyleId', 'preparedResponseId', 'replyTextSha256',
  'responseKind', 'dayKey', 'operationFingerprint',
] as const);

function exactPlainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== SELECTION_KEYS.length
      || keys.some((key) => typeof key !== 'string' || !SELECTION_KEYS.includes(
        key as typeof SELECTION_KEYS[number],
      ))) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
    for (const key of SELECTION_KEYS) {
      const descriptor = descriptors[key];
      if (!descriptor?.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function isToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function isUtcDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_DAY_KEY_RE.test(value)) return false;
  try {
    return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  } catch {
    return false;
  }
}

export function parseDialogueV2FreeformPreparedBotVoiceSelection(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceSelection | null {
  const selection = exactPlainRecord(value);
  if (!selection
    || selection.contractVersion !== DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT
    || typeof selection.sessionId !== 'string' || !SESSION_ID_RE.test(selection.sessionId)
    || typeof selection.turnId !== 'string' || !TURN_ID_RE.test(selection.turnId)
    || typeof selection.studyTarget !== 'string'
    || !(FREEFORM_STUDY_TARGETS as readonly string[]).includes(selection.studyTarget)
    || !isToken(selection.voiceCatalogReleaseId)
    || !isSha256(selection.voiceCatalogReleaseSha256)
    || !isToken(selection.voiceStyleId)
    || !isToken(selection.preparedResponseId)
    || !isSha256(selection.replyTextSha256)
    || typeof selection.responseKind !== 'string'
    || !RESPONSE_KINDS.has(selection.responseKind as DialogueV2FreeformPreparedBotVoiceResponseKind)
    || !isUtcDayKey(selection.dayKey)
    || !isSha256(selection.operationFingerprint)) return null;

  return Object.freeze({
    contractVersion: DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
    sessionId: selection.sessionId,
    turnId: selection.turnId,
    studyTarget: selection.studyTarget as DialogueV2StudyTarget,
    voiceCatalogReleaseId: selection.voiceCatalogReleaseId,
    voiceCatalogReleaseSha256: selection.voiceCatalogReleaseSha256,
    voiceStyleId: selection.voiceStyleId,
    preparedResponseId: selection.preparedResponseId,
    replyTextSha256: selection.replyTextSha256,
    responseKind: selection.responseKind as DialogueV2FreeformPreparedBotVoiceResponseKind,
    dayKey: selection.dayKey,
    operationFingerprint: selection.operationFingerprint,
  });
}

/** Produces a stable ordered transport payload after strict shape validation. */
export function encodeDialogueV2FreeformPreparedBotVoiceSelection(value: unknown): string {
  const selection = parseDialogueV2FreeformPreparedBotVoiceSelection(value);
  if (!selection) {
    throw new Error('invalid_dialogue_v2_freeform_prepared_bot_voice_selection');
  }
  return JSON.stringify(selection);
}

