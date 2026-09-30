import { createHash } from 'node:crypto';

import {
  CURRENT_DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG,
  resolveDialogueV2FreeformPreparedBotVoice,
} from '../app/dialogue_v2_freeform_prepared_bot_voice_runtime';
import {
  computeDialogueV2FreeformPreparedBotVoiceTextSha256,
} from '../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';

const replyText = 'That was a thoughtful answer.';
const sessionId = `d2fs_${'s'.repeat(32)}`;
const turnId = `d2ft_${'t'.repeat(16)}`;
const entry = Object.freeze({
  studyTarget: 'en' as const,
  voiceStyleId: 'warm_tutor_en',
  preparedResponseId: 'milestone_en_01',
  responseKind: 'milestone' as const,
  replyText,
  replyTextSha256: computeDialogueV2FreeformPreparedBotVoiceTextSha256(replyText),
  assetKey: 'freeform_milestone_en_01',
  assetSha256: 'a'.repeat(64),
  assetBytes: 4096,
  durationMs: 1250,
  mime: 'audio/mpeg' as const,
});
const catalog = Object.freeze({
  schemaVersion: 'dialogue_v2_freeform_prepared_bot_voice_catalog.v1' as const,
  releaseId: 'freeform_voice_2026_09_27_01',
  releaseSha256: createHash('sha256').update(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    'freeform_voice_2026_09_27_01',
    [[entry.studyTarget, entry.voiceStyleId, entry.preparedResponseId, entry.responseKind,
      entry.replyText, entry.replyTextSha256, entry.assetKey, entry.assetSha256,
      entry.assetBytes, entry.durationMs, entry.mime]],
  ]), 'utf8').digest('hex'),
  entries: Object.freeze([entry]),
});

const response = Object.freeze({ sessionId, turnId, studyTarget: 'en' as const, text: replyText });
const localAsset = Object.freeze({
  localUri: 'file:///app/dialogue-v2/freeform-milestone-en-01.m4a',
  assetSha256: entry.assetSha256,
  assetBytes: entry.assetBytes,
});

describe('Dialogue V2 Freeform prepared bot voice runtime', () => {
  it('ships a null catalog and makes neither a callable request nor UI metadata', async () => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    const resolveAsset = jest.fn(async () => localAsset as never);

    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog: CURRENT_DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_CATALOG,
      response,
      resolveAsset,
      requestSelection,
    })).resolves.toBeNull();

    expect(resolveAsset).not.toHaveBeenCalled();
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it('does not promote a metadata-shaped value into an asset capability', async () => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    const resolveAsset = jest.fn(async () => localAsset as never);

    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset,
      requestSelection,
    })).resolves.toBeNull();

    expect(resolveAsset).toHaveBeenCalledWith(entry.assetKey);
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed text-only response', { selection: null, extra: true }],
    ['server asset response', { selection: null, assetKey: entry.assetKey }],
    ['server selection response', { selection: { preparedResponseId: entry.preparedResponseId } }],
  ])('falls back to text-only for %s', async (_name, result) => {
    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset: async () => localAsset as never,
      requestSelection: async () => result,
    })).resolves.toBeNull();
  });

  it.each([
    ['remote URI', { ...localAsset, localUri: 'https://cdn.example/voice.m4a' }],
    ['wrong bytes', { ...localAsset, assetBytes: localAsset.assetBytes + 1 }],
    ['wrong hash', { ...localAsset, assetSha256: 'b'.repeat(64) }],
  ])('does not call Stage 4 for %s', async (_name, asset) => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset: async () => asset as never,
      requestSelection,
    })).resolves.toBeNull();
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it('treats a hostile local asset resolver result as text-only without leaking an async failure', async () => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    const hostileAsset = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostileAsset, 'localUri', {
      enumerable: true,
      get() { throw new Error('asset_getter_must_not_escape'); },
    });
    hostileAsset.assetSha256 = entry.assetSha256;
    hostileAsset.assetBytes = entry.assetBytes;

    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset: async () => hostileAsset as never,
      requestSelection,
    })).resolves.toBeNull();
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it.each([
    ['a hostile response snapshot', () => {
      const hostile = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(hostile, 'sessionId', {
        enumerable: true,
        get() { throw new Error('response_getter_must_not_escape'); },
      });
      hostile.turnId = turnId;
      hostile.studyTarget = 'en';
      hostile.text = replyText;
      return hostile;
    }],
    ['a hostile catalog snapshot', () => new Proxy(catalog, {
      ownKeys() { throw new Error('catalog_proxy_must_not_escape'); },
    })],
  ])('fails closed without an unhandled rejection for %s', async (_name, createHostile) => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    const resolveAsset = jest.fn(async () => localAsset as never);
    const input = {
      catalog,
      response,
      resolveAsset,
      requestSelection,
    };
    if (_name === 'a hostile response snapshot') input.response = createHostile() as never;
    else input.catalog = createHostile() as never;

    await expect(resolveDialogueV2FreeformPreparedBotVoice(input)).resolves.toBeNull();
    expect(resolveAsset).not.toHaveBeenCalled();
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it('fails closed when a hostile selection callback throws synchronously', async () => {
    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset: async () => localAsset as never,
      requestSelection: () => { throw new Error('callback_must_not_escape'); },
    })).resolves.toBeNull();
  });

  it('does not treat copied local metadata and an arbitrary file URI as a registry-issued asset', async () => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response,
      resolveAsset: async () => ({
        ...localAsset,
        localUri: 'file:///arbitrary/copied-metadata.m4a',
      }) as never,
      requestSelection,
    })).resolves.toBeNull();
    expect(requestSelection).not.toHaveBeenCalled();
  });

  it('does not call Stage 4 when the rendered reply is not the exact reviewed text', async () => {
    const requestSelection = jest.fn<Promise<unknown>, [unknown]>(async () => ({ selection: null }));
    await expect(resolveDialogueV2FreeformPreparedBotVoice({
      catalog,
      response: { ...response, text: `${replyText}!` },
      resolveAsset: async () => localAsset as never,
      requestSelection,
    })).resolves.toBeNull();
    expect(requestSelection).not.toHaveBeenCalled();
  });
});
