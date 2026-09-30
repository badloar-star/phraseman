import { createHash } from 'node:crypto';

import {
  parseDialogueV2FreeformPreparedBotVoiceCatalog,
  type DialogueV2FreeformPreparedBotVoiceCatalog,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
  parseDialogueV2FreeformPreparedBotVoiceSelection,
  type DialogueV2FreeformPreparedBotVoiceSelection,
} from '../../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  dialogueV2BotVoiceUtcDayKey,
  transitionDialogueV2BotVoiceDailyClaim,
  type DialogueV2BotVoiceDailyClaimState,
} from './dialogue_v2_bot_voice_daily_claim';

const parseServerCatalog = parseDialogueV2FreeformPreparedBotVoiceCatalog;
const parseStoredSelection = parseDialogueV2FreeformPreparedBotVoiceSelection;
const utcDayKey = dialogueV2BotVoiceUtcDayKey;
const transitionDailyClaim = transitionDialogueV2BotVoiceDailyClaim;
const createSha256Hash = createHash;
const selectionContractVersion =
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT;

const SESSION_ID_RE = /^d2fs_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2ft_[A-Za-z0-9_-]{16,80}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const UNSAFE_TEXT_RE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/u;
const FREEFORM_STUDY_TARGETS = Object.freeze(['en', 'es', 'fr', 'de'] as const);
const HMAC_ELIGIBLE_FIRST_BYTE_EXCLUSIVE = 32;
const MAX_ASSISTANT_MESSAGE_BYTES = 3_072;

export type DialogueV2FreeformPreparedBotVoiceCommittedTurn = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  assistantMessage: string;
  /** Null for the current v1 ledger, which deliberately disables new selection. */
  completedAtMs: number | null;
}>;

export type DialogueV2FreeformPreparedBotVoiceSelectionTransition =
  | Readonly<{
      kind: 'no_selection';
      selection: null;
      nextDailyState: DialogueV2BotVoiceDailyClaimState | null;
    }>
  | Readonly<{
      kind: 'selected' | 'replay';
      selection: DialogueV2FreeformPreparedBotVoiceSelection;
      nextDailyState: DialogueV2BotVoiceDailyClaimState | null;
    }>;

function sha256(value: string): string {
  return createSha256Hash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalAssistantMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const canonical = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!canonical || canonical !== value || UNSAFE_TEXT_RE.test(canonical)) return null;
  return Buffer.byteLength(canonical, 'utf8') <= MAX_ASSISTANT_MESSAGE_BYTES
    ? canonical
    : null;
}

function validateCommittedTurn(
  turn: DialogueV2FreeformPreparedBotVoiceCommittedTurn,
  nowMs: number,
): string {
  const assistantMessage = canonicalAssistantMessage(turn.assistantMessage);
  if (!SESSION_ID_RE.test(turn.sessionId)
    || !TURN_ID_RE.test(turn.turnId)
    || !(FREEFORM_STUDY_TARGETS as readonly string[]).includes(turn.studyTarget)
    || !assistantMessage
    || (turn.completedAtMs !== null
      && (!Number.isSafeInteger(turn.completedAtMs)
        || turn.completedAtMs <= 0
        || turn.completedAtMs > nowMs))) {
    throw new Error('invalid_dialogue_v2_freeform_prepared_bot_voice_committed_turn');
  }
  return assistantMessage;
}

function operationFingerprint(
  selection: Omit<DialogueV2FreeformPreparedBotVoiceSelection, 'operationFingerprint'>,
): string {
  return sha256(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_operation.v1',
    selection.sessionId,
    selection.turnId,
    selection.studyTarget,
    selection.voiceCatalogReleaseId,
    selection.voiceCatalogReleaseSha256,
    selection.voiceStyleId,
    selection.preparedResponseId,
    selection.replyTextSha256,
    selection.responseKind,
    selection.dayKey,
  ]));
}

function selectionMatchesTurn(
  selection: DialogueV2FreeformPreparedBotVoiceSelection,
  turn: DialogueV2FreeformPreparedBotVoiceCommittedTurn,
  assistantMessage: string,
): boolean {
  return selection.sessionId === turn.sessionId
    && selection.turnId === turn.turnId
    && selection.studyTarget === turn.studyTarget
    && selection.replyTextSha256 === sha256(assistantMessage);
}

function selectionMatchesCatalog(
  selection: DialogueV2FreeformPreparedBotVoiceSelection,
  catalog: DialogueV2FreeformPreparedBotVoiceCatalog,
  assistantMessage: string,
): boolean {
  if (selection.voiceCatalogReleaseId !== catalog.releaseId
    || selection.voiceCatalogReleaseSha256 !== catalog.releaseSha256) return false;
  const matches = catalog.entries.filter((entry) => (
    entry.studyTarget === selection.studyTarget
    && entry.voiceStyleId === selection.voiceStyleId
    && entry.preparedResponseId === selection.preparedResponseId
    && entry.replyText === assistantMessage
    && entry.replyTextSha256 === selection.replyTextSha256
    && entry.responseKind === selection.responseKind
  ));
  return matches.length === 1;
}

function noSelection(
  nextDailyState: DialogueV2BotVoiceDailyClaimState | null,
): DialogueV2FreeformPreparedBotVoiceSelectionTransition {
  return Object.freeze({ kind: 'no_selection', selection: null, nextDailyState });
}

/**
 * Pure server-only transition. It never accepts a client-selected asset or
 * response id. A future reviewed catalog can select only an exact reply whose
 * completion time came from trusted server evidence. The current v1 freeform
 * ledger has no such timestamp, so it always remains text-only unless a
 * separate trusted completion-evidence record is present.
 */
export function transitionDialogueV2FreeformPreparedBotVoiceSelection(input: Readonly<{
  nowMs: number;
  committedTurn: DialogueV2FreeformPreparedBotVoiceCommittedTurn;
  serverCatalog: unknown;
  existingTurnSelection: unknown | null;
  trustedDailyState: DialogueV2BotVoiceDailyClaimState | null;
  computeEligibilityHmac(material: string): string;
}>): DialogueV2FreeformPreparedBotVoiceSelectionTransition {
  const dayKey = utcDayKey(input.nowMs);
  const assistantMessage = validateCommittedTurn(input.committedTurn, input.nowMs);
  const catalog = input.serverCatalog === null ? null : parseServerCatalog(input.serverCatalog);
  if (!catalog) return noSelection(input.trustedDailyState);

  if (input.existingTurnSelection !== null) {
    const existing = parseStoredSelection(input.existingTurnSelection);
    if (!existing
      || !selectionMatchesTurn(existing, input.committedTurn, assistantMessage)
      || !selectionMatchesCatalog(existing, catalog, assistantMessage)) {
      throw new Error('invalid_dialogue_v2_freeform_prepared_bot_voice_replay');
    }
    return Object.freeze({
      kind: 'replay',
      selection: existing,
      nextDailyState: input.trustedDailyState,
    });
  }

  if (input.committedTurn.completedAtMs === null) {
    return noSelection(input.trustedDailyState);
  }
  const replyTextSha256 = sha256(assistantMessage);
  const candidates = catalog.entries.filter((entry) => (
    entry.studyTarget === input.committedTurn.studyTarget
    && entry.replyText === assistantMessage
    && entry.replyTextSha256 === replyTextSha256
  ));
  if (candidates.length !== 1) return noSelection(input.trustedDailyState);

  const entry = candidates[0];
  const hmacMaterial = JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_eligibility.v1',
    input.committedTurn.sessionId,
    input.committedTurn.turnId,
    input.committedTurn.studyTarget,
    replyTextSha256,
    input.committedTurn.completedAtMs,
    catalog.releaseId,
    catalog.releaseSha256,
  ]);
  let eligibilityDigest: unknown;
  try {
    eligibilityDigest = input.computeEligibilityHmac(hmacMaterial);
  } catch {
    throw new Error('dialogue_v2_freeform_prepared_bot_voice_hmac_unavailable');
  }
  if (typeof eligibilityDigest !== 'string' || !SHA256_RE.test(eligibilityDigest)) {
    throw new Error('dialogue_v2_freeform_prepared_bot_voice_hmac_unavailable');
  }
  if (Number.parseInt(eligibilityDigest.slice(0, 2), 16)
    >= HMAC_ELIGIBLE_FIRST_BYTE_EXCLUSIVE) return noSelection(input.trustedDailyState);

  const base = Object.freeze({
    contractVersion: selectionContractVersion,
    sessionId: input.committedTurn.sessionId,
    turnId: input.committedTurn.turnId,
    studyTarget: input.committedTurn.studyTarget,
    voiceCatalogReleaseId: catalog.releaseId,
    voiceCatalogReleaseSha256: catalog.releaseSha256,
    voiceStyleId: entry.voiceStyleId,
    preparedResponseId: entry.preparedResponseId,
    replyTextSha256,
    responseKind: entry.responseKind,
    dayKey,
  });
  const selection = Object.freeze({
    ...base,
    operationFingerprint: operationFingerprint(base),
  });
  const requestId = `ff:${sha256(`${selection.sessionId}\u0000${selection.turnId}`)}`;
  const claim = transitionDailyClaim({
    nowMs: input.nowMs,
    requestId,
    operationFingerprint: selection.operationFingerprint,
    trustedAccountState: input.trustedDailyState,
  });
  if (claim.kind === 'daily_slot_already_claimed') return noSelection(claim.nextState);
  return Object.freeze({
    kind: claim.kind === 'replay' ? 'replay' : 'selected',
    selection,
    nextDailyState: claim.nextState,
  });
}
