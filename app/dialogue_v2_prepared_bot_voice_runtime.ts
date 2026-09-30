import * as Crypto from 'expo-crypto';

import {
  planDialogueV2BotVoice,
} from '../shared/dialogue_v2_bot_voice_policy';
import {
  parseDialogueV2PreparedBotVoiceCatalog,
  type DialogueV2PreparedBotVoiceCatalog,
} from '../shared/dialogue_v2_prepared_bot_voice_catalog';
import {
  parseDialogueV2PreparedBotVoiceSelection,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';
import type { DialogueV2StudyTarget } from '../shared/dialogue_v2_language_pack_contract';
import {
  resolveBundledDialogueV2PreparedBotVoiceAsset,
  type DialogueV2PreparedBotVoiceAssetResolver,
} from './dialogue_v2_prepared_bot_voice_asset_registry';

export {
  DIALOGUE_V2_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
} from '../shared/dialogue_v2_prepared_bot_voice_selection_contract';

/** Deliberately null until reviewed audio and a matching catalog are bundled. */
export const CURRENT_DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG:
DialogueV2PreparedBotVoiceCatalog | null = null;

export type DialogueV2ResolvedPreparedBotVoice = Readonly<{
  localUri: string;
  preparedResponseId: string;
  replyTextSha256: string;
}>;

function utcDayKey(nowMs: number): string | null {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) return null;
  try {
    return new Date(nowMs).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export type ResolveDialogueV2PreparedBotVoiceInput = Readonly<{
  nowMs: number;
  catalog: unknown;
  /** Must originate from the server-authoritative committed turn response. */
  serverSelection: unknown;
  response: Readonly<{
    sessionId: string;
    turnId: string;
    replyIndex: number;
    studyTarget: DialogueV2StudyTarget;
    scenarioId: string;
    personaId: string;
    text: string;
  }>;
  resolveAsset: DialogueV2PreparedBotVoiceAssetResolver;
}>;

/**
 * Resolves only already-authorized, server-selected, build-local audio. It
 * performs no network, claim, synthesis, download, provider or persistence work.
 */
export async function resolveDialogueV2PreparedBotVoice(
  input: ResolveDialogueV2PreparedBotVoiceInput,
): Promise<DialogueV2ResolvedPreparedBotVoice | null> {
  const catalog = parseDialogueV2PreparedBotVoiceCatalog(input.catalog);
  const selection = parseDialogueV2PreparedBotVoiceSelection(input.serverSelection);
  if (!catalog || !selection || selection.dayKey !== utcDayKey(input.nowMs)) return null;
  if (selection.voiceCatalogReleaseId !== catalog.releaseId
    || selection.contentManifestSha256 !== catalog.contentManifestSha256) return null;
  if (selection.sessionId !== input.response.sessionId
    || selection.turnId !== input.response.turnId
    || selection.replyIndex !== input.response.replyIndex
    || selection.studyTarget !== input.response.studyTarget
    || selection.scenarioId !== input.response.scenarioId
    || selection.personaId !== input.response.personaId) return null;

  const [actualReplyHash, actualOperationFingerprint] = await Promise.all([
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input.response.text),
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([
      'dialogue_v2_prepared_bot_voice_operation.v2',
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
    ])),
  ]);
  if (actualReplyHash !== selection.replyTextSha256
    || actualOperationFingerprint !== selection.operationFingerprint) return null;
  const entry = catalog.entries.find((candidate) => (
    candidate.studyTarget === selection.studyTarget
    && candidate.scenarioId === selection.scenarioId
    && candidate.contentPackSha256 === selection.contentPackSha256
    && candidate.personaId === selection.personaId
    && candidate.preparedResponseId === selection.preparedResponseId
  ));
  if (!entry || entry.responseKind !== selection.responseKind
    || entry.replyText !== input.response.text
    || entry.replyTextSha256 !== selection.replyTextSha256) return null;

  const resolvedAsset = await input.resolveAsset(entry.assetKey).catch(() => null);
  if (!resolvedAsset || !resolvedAsset.localUri.startsWith('file://')
    || resolvedAsset.assetSha256 !== entry.assetSha256
    || resolvedAsset.assetBytes !== entry.assetBytes) return null;
  const plan = planDialogueV2BotVoice({
    nowMs: input.nowMs,
    target: input.response.studyTarget,
    personaVoiceMode: 'optional_prepared_voice',
    preparedAudio: {
      target: input.response.studyTarget,
      replyText: input.response.text,
      localUri: resolvedAsset.localUri,
    },
    responseText: input.response.text,
    responseKind: selection.responseKind,
    botVoiceRepliesToday: 0,
    botVoiceReplyDayKey: selection.dayKey,
    isGroupFollowUp: false,
  });
  return plan.kind === 'play_prepared'
    ? Object.freeze({
      localUri: plan.localUri,
      preparedResponseId: entry.preparedResponseId,
      replyTextSha256: entry.replyTextSha256,
    })
    : null;
}

export async function resolveCurrentDialogueV2PreparedBotVoice(
  input: Omit<ResolveDialogueV2PreparedBotVoiceInput, 'catalog' | 'resolveAsset'>,
): Promise<DialogueV2ResolvedPreparedBotVoice | null> {
  if (!CURRENT_DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG) return null;
  return resolveDialogueV2PreparedBotVoice({
    ...input,
    catalog: CURRENT_DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG,
    resolveAsset: resolveBundledDialogueV2PreparedBotVoiceAsset,
  });
}
