import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import {
  parseDialogueV2FreeformSessionStartShape,
  parseDialogueV2FreeformSessionTurnShape,
  type DialogueV2FreeformSessionStart,
  type DialogueV2FreeformSessionTurn,
} from '../shared/dialogue_v2_freeform_session_contract';

const FUNCTIONS_REGION = 'us-central1';
const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const FREEFORM_STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);

export type DialogueV2FreeformSessionStartResponse = Readonly<{
  ok: true;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformTurnResponse = Readonly<{
  ok: true;
  assistantMessage: string;
  sessionId: string;
  expiresAtMs: number;
}>;

export type DialogueV2FreeformPreparedBotVoiceRequest = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: 'en' | 'es' | 'fr' | 'de';
}>;

export type DialogueV2FreeformPreparedBotVoiceTextOnlyResponse = Readonly<{
  selection: null;
}>;

/** Callable failures may include internal provider details; UI gets one neutral state. */
export class DialogueV2FreeformUnavailableError extends Error {
  constructor() {
    super('dialogue_v2_freeform_unavailable');
    this.name = 'DialogueV2FreeformUnavailableError';
  }
}

type PlainRecord = Record<string, unknown>;

function exactPlainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    const snapshot: PlainRecord = Object.create(null) as PlainRecord;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function validAssistantMessage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  return normalized === value && normalized.length > 0 && !UNSAFE_TEXT_RE.test(value)
    && utf8ByteLength(value) <= 3_072;
}

function validStartResponse(value: unknown): DialogueV2FreeformSessionStartResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['ok', 'sessionId', 'expiresAtMs'])
    || response.ok !== true || typeof response.sessionId !== 'string'
    || !SESSION_ID_RE.test(response.sessionId)
    || !Number.isSafeInteger(response.expiresAtMs) || Number(response.expiresAtMs) <= 0) return null;
  return Object.freeze({ ok: true, sessionId: response.sessionId, expiresAtMs: Number(response.expiresAtMs) });
}

function validTurnResponse(
  value: unknown,
  request: DialogueV2FreeformSessionTurn,
): DialogueV2FreeformTurnResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['ok', 'assistantMessage', 'sessionId', 'expiresAtMs'])
    || response.ok !== true || response.sessionId !== request.sessionId
    || !validAssistantMessage(response.assistantMessage)
    || !Number.isSafeInteger(response.expiresAtMs) || Number(response.expiresAtMs) <= 0) return null;
  return Object.freeze({
    ok: true,
    assistantMessage: response.assistantMessage,
    sessionId: request.sessionId,
    expiresAtMs: Number(response.expiresAtMs),
  });
}

function validPreparedBotVoiceRequest(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceRequest | null {
  const request = exactPlainRecord(value);
  if (!request || !hasExactKeys(request, ['sessionId', 'turnId', 'studyTarget'])
    || typeof request.sessionId !== 'string' || !SESSION_ID_RE.test(request.sessionId)
    || typeof request.turnId !== 'string' || !TURN_ID_RE.test(request.turnId)
    || typeof request.studyTarget !== 'string' || !FREEFORM_STUDY_TARGETS.has(request.studyTarget)) {
    return null;
  }
  return Object.freeze({
    sessionId: request.sessionId,
    turnId: request.turnId,
    studyTarget: request.studyTarget as DialogueV2FreeformPreparedBotVoiceRequest['studyTarget'],
  });
}

function validPreparedBotVoiceTextOnlyResponse(
  value: unknown,
): DialogueV2FreeformPreparedBotVoiceTextOnlyResponse | null {
  const response = exactPlainRecord(value);
  if (!response || !hasExactKeys(response, ['selection']) || response.selection !== null) return null;
  return Object.freeze({ selection: null });
}

export async function startDialogueV2FreeformSession(
  selection: DialogueV2FreeformSessionStart,
): Promise<DialogueV2FreeformSessionStartResponse | null> {
  const request = parseDialogueV2FreeformSessionStartShape(selection);
  if (!request) return null;
  try {
    const callable = httpsCallable<DialogueV2FreeformSessionStart, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformSessionStart',
    );
    return validStartResponse((await callable(request)).data);
  } catch {
    throw new DialogueV2FreeformUnavailableError();
  }
}

export async function sendDialogueV2FreeformTurn(
  selection: DialogueV2FreeformSessionTurn,
): Promise<DialogueV2FreeformTurnResponse | null> {
  const request = parseDialogueV2FreeformSessionTurnShape(selection);
  if (!request) return null;
  try {
    const callable = httpsCallable<DialogueV2FreeformSessionTurn, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformSessionTurn',
    );
    return validTurnResponse((await callable(request)).data, request);
  } catch {
    throw new DialogueV2FreeformUnavailableError();
  }
}

/**
 * The current public Stage 4 contract intentionally returns only text-only.
 * This client never transports reply text, asset references, or scenario data.
 */
export async function requestDialogueV2FreeformPreparedBotVoice(
  selection: DialogueV2FreeformPreparedBotVoiceRequest,
): Promise<DialogueV2FreeformPreparedBotVoiceTextOnlyResponse | null> {
  const request = validPreparedBotVoiceRequest(selection);
  if (!request) return null;
  try {
    const callable = httpsCallable<DialogueV2FreeformPreparedBotVoiceRequest, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2FreeformPreparedBotVoiceResolve',
    );
    return validPreparedBotVoiceTextOnlyResponse((await callable(request)).data);
  } catch {
    throw new DialogueV2FreeformUnavailableError();
  }
}
