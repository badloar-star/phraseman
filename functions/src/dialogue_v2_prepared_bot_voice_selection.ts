import { createHash } from 'node:crypto';

import {
  parseDialogueV2PreparedBotVoiceCatalog,
} from '../../shared/dialogue_v2_prepared_bot_voice_catalog';
import {
  DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
  isDialogueV2PreparedBotVoiceToken,
  parseDialogueV2PreparedBotVoiceSelection,
  type DialogueV2PreparedBotVoiceSelection,
} from '../../shared/dialogue_v2_prepared_bot_voice_selection_contract';
import type { DialogueV2StudyTarget } from '../../shared/dialogue_v2_language_pack_contract';
import {
  dialogueV2BotVoiceUtcDayKey,
  transitionDialogueV2BotVoiceDailyClaim,
  type DialogueV2BotVoiceDailyClaimState,
} from './dialogue_v2_bot_voice_daily_claim';

export {
  DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
} from '../../shared/dialogue_v2_prepared_bot_voice_selection_contract';
export type {
  DialogueV2PreparedBotVoiceSelection,
} from '../../shared/dialogue_v2_prepared_bot_voice_selection_contract';

const OPERATION_CONTRACT = 'dialogue_v2_prepared_bot_voice_operation.v2';
const COMMITTED_TURN_CONTRACT = 'dialogue_v2_prepared_bot_voice_turn.v1';
const SESSION_ID_RE = /^d2s_[A-Za-z0-9_-]{32,96}$/;
const TURN_ID_RE = /^d2t_[A-Za-z0-9_-]{16,80}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export type DialogueV2PreparedBotVoiceCommittedReply = Readonly<{
  replyIndex: number;
  personaId: string;
  personaVoiceMode: 'text_only' | 'optional_prepared_voice';
  groupPosition: 'direct' | 'follow_up';
  text: string;
}>;

export type DialogueV2PreparedBotVoiceCommittedTurn = Readonly<{
  sessionId: string;
  turnId: string;
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  contentManifestSha256: string;
  contentPackSha256: string;
  replies: readonly DialogueV2PreparedBotVoiceCommittedReply[];
}>;

export type DialogueV2PreparedBotVoiceSelectionTransition =
  | Readonly<{
      kind: 'selected';
      selection: DialogueV2PreparedBotVoiceSelection;
      nextDailyState: DialogueV2BotVoiceDailyClaimState;
    }>
  | Readonly<{
      kind: 'replay';
      selection: DialogueV2PreparedBotVoiceSelection;
      nextDailyState: DialogueV2BotVoiceDailyClaimState | null;
    }>
  | Readonly<{
      kind: 'no_selection';
      selection: null;
      nextDailyState: DialogueV2BotVoiceDailyClaimState | null;
    }>;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function operationParts(
  selection: Omit<DialogueV2PreparedBotVoiceSelection, 'operationFingerprint'>,
): readonly unknown[] {
  return Object.freeze([
    OPERATION_CONTRACT,
    selection.sessionId,
    selection.turnId,
    selection.replyIndex,
    selection.studyTarget,
    selection.scenarioId,
    selection.voiceCatalogReleaseId,
    selection.contentManifestSha256,
    selection.contentPackSha256,
    selection.personaId,
    selection.preparedResponseId,
    selection.replyTextSha256,
    selection.responseKind,
    selection.groupPosition,
    selection.dayKey,
  ]);
}

function operationFingerprint(
  selection: Omit<DialogueV2PreparedBotVoiceSelection, 'operationFingerprint'>,
): string {
  return sha256(JSON.stringify(operationParts(selection)));
}

function committedTurnRequestId(turn: DialogueV2PreparedBotVoiceCommittedTurn, replyIndex: number): string {
  return `d2v_${sha256(JSON.stringify([
    COMMITTED_TURN_CONTRACT,
    turn.sessionId,
    turn.turnId,
    replyIndex,
  ]))}`;
}

function exactSelection(value: unknown): DialogueV2PreparedBotVoiceSelection | null {
  const selection = parseDialogueV2PreparedBotVoiceSelection(value);
  if (!selection) return null;
  const withoutFingerprint = Object.freeze({
    contractVersion: selection.contractVersion,
    sessionId: selection.sessionId,
    turnId: selection.turnId,
    replyIndex: selection.replyIndex,
    studyTarget: selection.studyTarget,
    scenarioId: selection.scenarioId,
    voiceCatalogReleaseId: selection.voiceCatalogReleaseId,
    contentManifestSha256: selection.contentManifestSha256,
    contentPackSha256: selection.contentPackSha256,
    personaId: selection.personaId,
    preparedResponseId: selection.preparedResponseId,
    replyTextSha256: selection.replyTextSha256,
    responseKind: selection.responseKind,
    groupPosition: 'direct' as const,
    dayKey: selection.dayKey,
  });
  if (operationFingerprint(withoutFingerprint) !== selection.operationFingerprint) return null;
  return Object.freeze({ ...withoutFingerprint, operationFingerprint: selection.operationFingerprint });
}

function validateCommittedTurn(turn: DialogueV2PreparedBotVoiceCommittedTurn): void {
  if (!SESSION_ID_RE.test(turn.sessionId) || !TURN_ID_RE.test(turn.turnId)
    || !isDialogueV2PreparedBotVoiceToken(turn.scenarioId)
    || !SHA256_RE.test(turn.contentManifestSha256)
    || !SHA256_RE.test(turn.contentPackSha256)
    || !Array.isArray(turn.replies) || turn.replies.length > 2) {
    throw new Error('invalid_dialogue_v2_prepared_bot_voice_committed_turn');
  }
  for (const [index, reply] of turn.replies.entries()) {
    if (!Number.isSafeInteger(reply.replyIndex) || reply.replyIndex !== index
      || !isDialogueV2PreparedBotVoiceToken(reply.personaId)
      || (reply.personaVoiceMode !== 'text_only' && reply.personaVoiceMode !== 'optional_prepared_voice')
      || (reply.groupPosition !== 'direct' && reply.groupPosition !== 'follow_up')
      || (index === 0 ? reply.groupPosition !== 'direct' : reply.groupPosition !== 'follow_up')
      || typeof reply.text !== 'string' || reply.text !== reply.text.trim()
      || reply.text.length < 1 || reply.text.length > 800) {
      throw new Error('invalid_dialogue_v2_prepared_bot_voice_committed_turn');
    }
  }
}

function selectionMatchesCommittedTurn(
  selection: DialogueV2PreparedBotVoiceSelection,
  turn: DialogueV2PreparedBotVoiceCommittedTurn,
): boolean {
  const reply = turn.replies[selection.replyIndex];
  return selection.sessionId === turn.sessionId
    && selection.turnId === turn.turnId
    && selection.studyTarget === turn.studyTarget
    && selection.scenarioId === turn.scenarioId
    && selection.contentManifestSha256 === turn.contentManifestSha256
    && selection.contentPackSha256 === turn.contentPackSha256
    && Boolean(reply)
    && reply.groupPosition === 'direct'
    && selection.personaId === reply.personaId
    && selection.replyTextSha256 === sha256(reply.text);
}

function candidateSelection(
  nowMs: number,
  turn: DialogueV2PreparedBotVoiceCommittedTurn,
  serverCatalog: unknown,
): DialogueV2PreparedBotVoiceSelection | null {
  const catalog = parseDialogueV2PreparedBotVoiceCatalog(serverCatalog);
  const reply = turn.replies[0];
  if (!catalog || !reply || reply.groupPosition !== 'direct'
    || reply.personaVoiceMode !== 'optional_prepared_voice'
    || catalog.contentManifestSha256 !== turn.contentManifestSha256) return null;
  const matches = catalog.entries.filter((entry) => (
    entry.studyTarget === turn.studyTarget
    && entry.scenarioId === turn.scenarioId
    && entry.contentPackSha256 === turn.contentPackSha256
    && entry.personaId === reply.personaId
    && entry.replyText === reply.text
    && entry.replyTextSha256 === sha256(reply.text)
  ));
  if (matches.length !== 1) return null;
  const entry = matches[0];
  const base = Object.freeze({
    contractVersion: DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
    sessionId: turn.sessionId,
    turnId: turn.turnId,
    replyIndex: reply.replyIndex,
    studyTarget: turn.studyTarget,
    scenarioId: turn.scenarioId,
    voiceCatalogReleaseId: catalog.releaseId,
    contentManifestSha256: turn.contentManifestSha256,
    contentPackSha256: turn.contentPackSha256,
    personaId: reply.personaId,
    preparedResponseId: entry.preparedResponseId,
    replyTextSha256: entry.replyTextSha256,
    responseKind: entry.responseKind,
    groupPosition: 'direct' as const,
    dayKey: dialogueV2BotVoiceUtcDayKey(nowMs),
  });
  return Object.freeze({ ...base, operationFingerprint: operationFingerprint(base) });
}

/**
 * Pure server-only transition. The caller may invoke it only after the session
 * ledger returned the exact durably committed turn. It performs no I/O and
 * never accepts a callable request body, URI, asset key or client claim.
 */
export function transitionDialogueV2PreparedBotVoiceSelection(input: Readonly<{
  nowMs: number;
  committedTurn: DialogueV2PreparedBotVoiceCommittedTurn;
  serverCatalog: unknown;
  existingTurnSelection: unknown | null;
  trustedDailyState: DialogueV2BotVoiceDailyClaimState | null;
}>): DialogueV2PreparedBotVoiceSelectionTransition {
  validateCommittedTurn(input.committedTurn);

  if (input.existingTurnSelection !== null) {
    const existing = exactSelection(input.existingTurnSelection);
    if (!existing || !selectionMatchesCommittedTurn(existing, input.committedTurn)) {
      throw new Error('invalid_dialogue_v2_prepared_bot_voice_replay');
    }
    return Object.freeze({ kind: 'replay', selection: existing, nextDailyState: input.trustedDailyState });
  }

  const selection = candidateSelection(input.nowMs, input.committedTurn, input.serverCatalog);
  if (!selection) {
    return Object.freeze({ kind: 'no_selection', selection: null, nextDailyState: input.trustedDailyState });
  }
  const claim = transitionDialogueV2BotVoiceDailyClaim({
    nowMs: input.nowMs,
    requestId: committedTurnRequestId(input.committedTurn, selection.replyIndex),
    operationFingerprint: selection.operationFingerprint,
    trustedAccountState: input.trustedDailyState,
  });
  if (claim.kind === 'daily_slot_already_claimed') {
    return Object.freeze({ kind: 'no_selection', selection: null, nextDailyState: claim.nextState });
  }
  return Object.freeze({
    kind: claim.kind === 'replay' ? 'replay' : 'selected',
    selection,
    nextDailyState: claim.nextState,
  });
}
