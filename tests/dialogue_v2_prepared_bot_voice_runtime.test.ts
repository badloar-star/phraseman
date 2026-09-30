import { createHash } from 'node:crypto';

import {
  CURRENT_DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG,
  resolveCurrentDialogueV2PreparedBotVoice,
  resolveDialogueV2PreparedBotVoice,
} from '../app/dialogue_v2_prepared_bot_voice_runtime';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const nowMs = Date.UTC(2026, 8, 27, 12, 0, 0);
const replyText = 'You handled that beautifully.';
const entry = Object.freeze({
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  contentPackSha256: 'c'.repeat(64),
  personaId: 'host',
  preparedResponseId: 'social_01_host_milestone_01',
  responseKind: 'milestone' as const,
  replyText,
  replyTextSha256: sha256(replyText),
  assetKey: 'social_01_host_milestone_01_en',
  assetSha256: 'b'.repeat(64),
  assetBytes: 4_096,
});
const catalog = Object.freeze({
  schemaVersion: 'dialogue_v2_prepared_bot_voice_catalog.v1' as const,
  releaseId: 'dialogue_v2_voice_2026_09_27_01',
  contentManifestSha256: 'a'.repeat(64),
  entries: Object.freeze([entry]),
});
const selection = Object.freeze({
  contractVersion: 'dialogue_v2_prepared_bot_voice_selection.v2',
  sessionId: `d2s_${'s'.repeat(32)}`,
  turnId: `d2t_${'t'.repeat(16)}`,
  replyIndex: 0,
  studyTarget: 'en',
  scenarioId: 'social_01',
  voiceCatalogReleaseId: catalog.releaseId,
  contentManifestSha256: catalog.contentManifestSha256,
  contentPackSha256: entry.contentPackSha256,
  personaId: 'host',
  preparedResponseId: 'social_01_host_milestone_01',
  replyTextSha256: sha256(replyText),
  responseKind: 'milestone',
  groupPosition: 'direct',
  dayKey: '2026-09-27',
  operationFingerprint: sha256(JSON.stringify([
    'dialogue_v2_prepared_bot_voice_operation.v2',
    `d2s_${'s'.repeat(32)}`,
    `d2t_${'t'.repeat(16)}`,
    0,
    'en',
    'social_01',
    catalog.releaseId,
    catalog.contentManifestSha256,
    entry.contentPackSha256,
    entry.personaId,
    entry.preparedResponseId,
    sha256(replyText),
    'milestone',
    'direct',
    '2026-09-27',
  ])),
});
const response = Object.freeze({
  sessionId: selection.sessionId,
  turnId: selection.turnId,
  replyIndex: 0,
  studyTarget: 'en' as const,
  scenarioId: 'social_01',
  personaId: 'host',
  text: replyText,
});
const localAsset = Object.freeze({
  localUri: 'file:///app/dialogue-v2/social-01-host.m4a',
  assetSha256: entry.assetSha256,
  assetBytes: entry.assetBytes,
});

describe('Dialogue V2 prepared bot voice runtime', () => {
  it('resolves only an exact server-selected, release-pinned local asset', async () => {
    const resolveAsset = jest.fn(async () => localAsset);
    await expect(resolveDialogueV2PreparedBotVoice({
      nowMs, catalog, serverSelection: selection, response, resolveAsset,
    })).resolves.toEqual({
      localUri: localAsset.localUri,
      preparedResponseId: entry.preparedResponseId,
      replyTextSha256: entry.replyTextSha256,
    });
    expect(resolveAsset).toHaveBeenCalledWith(entry.assetKey);
  });

  it.each([
    ['no server selection', null],
    ['client-shaped unrecognized selection', { ...selection, extra: true }],
    ['group follow-up', { ...selection, groupPosition: 'follow_up' }],
    ['different server response id', { ...selection, preparedResponseId: 'other_response' }],
    ['different content manifest pin', { ...selection, contentManifestSha256: 'd'.repeat(64) }],
    ['different catalog release', { ...selection, voiceCatalogReleaseId: 'other_release' }],
  ])('returns null before touching assets for %s', async (_name, serverSelection) => {
    const resolveAsset = jest.fn(async () => localAsset);
    await expect(resolveDialogueV2PreparedBotVoice({
      nowMs, catalog, serverSelection, response, resolveAsset,
    })).resolves.toBeNull();
    expect(resolveAsset).not.toHaveBeenCalled();
  });

  it('rejects a selection fingerprint that is not bound to the exact committed response', async () => {
    const resolveAsset = jest.fn(async () => localAsset);
    await expect(resolveDialogueV2PreparedBotVoice({
      nowMs,
      catalog,
      serverSelection: { ...selection, operationFingerprint: 'e'.repeat(64) },
      response,
      resolveAsset,
    })).resolves.toBeNull();
    expect(resolveAsset).not.toHaveBeenCalled();
  });

  it.each([
    ['remote URI', { ...localAsset, localUri: 'https://cdn.test/voice.m4a' }],
    ['wrong bytes', { ...localAsset, assetBytes: localAsset.assetBytes + 1 }],
    ['wrong audio hash', { ...localAsset, assetSha256: 'c'.repeat(64) }],
  ])('rejects %s from the build-local asset resolver', async (_name, resolvedAsset) => {
    await expect(resolveDialogueV2PreparedBotVoice({
      nowMs, catalog, serverSelection: selection, response,
      resolveAsset: async () => resolvedAsset,
    })).resolves.toBeNull();
  });

  it('ships no pretend prepared catalog and therefore resolves no current bot voice', async () => {
    expect(CURRENT_DIALOGUE_V2_PREPARED_BOT_VOICE_CATALOG).toBeNull();
    await expect(resolveCurrentDialogueV2PreparedBotVoice({
      nowMs, serverSelection: selection, response,
    })).resolves.toBeNull();
  });
});
