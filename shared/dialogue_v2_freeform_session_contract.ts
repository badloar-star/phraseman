import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from './dialogue_v2_language_pack_contract';

export const DIALOGUE_V2_FREEFORM_SESSION_ID_PREFIX = 'd2fs_' as const;
export const DIALOGUE_V2_FREEFORM_TURN_ID_PREFIX = 'd2ft_' as const;
export const DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES = 2_048;

const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;

type PlainRecord = Record<string, unknown>;

export type DialogueV2FreeformSessionStart = Readonly<{
  studyTarget: DialogueV2StudyTarget;
}>;

export type DialogueV2FreeformSessionTurn = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  userMessage: string;
}>;

function exactPlainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
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

function hasExactKeys(record: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function studyTarget(value: unknown): DialogueV2StudyTarget | null {
  return typeof value === 'string'
    && (DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(value)
    ? value as DialogueV2StudyTarget
    : null;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function canonicalUserMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!normalized || normalized !== value || UNSAFE_TEXT_RE.test(normalized)) return null;
  return utf8ByteLength(normalized) <= DIALOGUE_V2_FREEFORM_MAX_USER_MESSAGE_BYTES
    ? normalized
    : null;
}

/**
 * Portable shape canonicalizer for client/shared code. This is deliberately
 * not an authoritative trust gate: transparent Proxy detection is not
 * available consistently in JavaScript/React Native. Server boundaries must
 * perform their environment-specific Proxy rejection before calling it.
 */
export function parseDialogueV2FreeformSessionStartShape(
  value: unknown,
): DialogueV2FreeformSessionStart | null {
  const record = exactPlainRecord(value);
  if (!record || !hasExactKeys(record, ['studyTarget'])) return null;
  const target = studyTarget(record.studyTarget);
  return target ? Object.freeze({ studyTarget: target }) : null;
}

/**
 * Portable shape canonicalizer only. See the start-shape parser above; a
 * server must reject Proxy inputs before using this canonicalized value.
 */
export function parseDialogueV2FreeformSessionTurnShape(
  value: unknown,
): DialogueV2FreeformSessionTurn | null {
  const record = exactPlainRecord(value);
  if (!record || !hasExactKeys(
    record,
    ['sessionId', 'turnId', 'studyTarget', 'userMessage'],
  )
    || typeof record.sessionId !== 'string'
    || !SESSION_ID_RE.test(record.sessionId)
    || typeof record.turnId !== 'string'
    || !TURN_ID_RE.test(record.turnId)) return null;
  const target = studyTarget(record.studyTarget);
  const userMessage = canonicalUserMessage(record.userMessage);
  if (!target || !userMessage) return null;
  return Object.freeze({
    sessionId: record.sessionId,
    turnId: record.turnId,
    studyTarget: target,
    userMessage,
  });
}
