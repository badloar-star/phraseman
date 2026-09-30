import { createHash } from 'node:crypto';

import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG,
  computeDialogueV2FreeformPreparedBotVoiceTextSha256,
  encodeDialogueV2FreeformPreparedBotVoiceCatalog,
  parseDialogueV2FreeformPreparedBotVoiceCatalog,
  validateDialogueV2FreeformPreparedBotVoiceCatalogRelease,
} from '../shared/dialogue_v2_freeform_prepared_bot_voice_catalog';
import { DIALOGUE_V2_STUDY_TARGETS } from '../shared/dialogue_v2_language_pack_contract';

function releaseSha256(releaseId: string, entries: readonly Record<string, unknown>[]): string {
  return createHash('sha256').update(JSON.stringify([
    'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    entries.map((entry) => [
      entry.studyTarget, entry.voiceStyleId, entry.preparedResponseId, entry.responseKind,
      entry.replyText, entry.replyTextSha256, entry.assetKey, entry.assetSha256,
      entry.assetBytes, entry.durationMs, entry.mime,
    ]),
  ]), 'utf8').digest('hex');
}

function validCatalog() {
  const entries = ['en', 'es', 'fr', 'de'].map((studyTarget, index) => {
    const replyText = `Prepared reply ${index + 1}.`;
    return {
      studyTarget,
      voiceStyleId: `warm_tutor_${studyTarget}`,
      preparedResponseId: `milestone_${studyTarget}_01`,
      responseKind: 'milestone',
      replyText,
      replyTextSha256: computeDialogueV2FreeformPreparedBotVoiceTextSha256(replyText),
      assetKey: `freeform_milestone_${studyTarget}_01`,
      assetSha256: `${index + 1}`.repeat(64),
      assetBytes: 4_096 + index,
      durationMs: 1_250 + index,
      mime: 'audio/mpeg',
    };
  });
  const releaseId = 'freeform_voice_2026_09_27_01';
  return {
    schemaVersion: 'dialogue_v2_freeform_prepared_bot_voice_catalog.v1',
    releaseId,
    releaseSha256: releaseSha256(releaseId, entries),
    entries,
  };
}

describe('Dialogue V2 Freeform prepared bot voice catalog contract', () => {
  it('computes the standard UTF-8 SHA-256 digest used to bind exact reply text', () => {
    expect(computeDialogueV2FreeformPreparedBotVoiceTextSha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    const malformedUtf16 = '\ud800';
    expect(computeDialogueV2FreeformPreparedBotVoiceTextSha256(malformedUtf16)).toBe(
      createHash('sha256').update(malformedUtf16, 'utf8').digest('hex'),
    );
  });

  it('ships with no fictional prepared-audio release', () => {
    expect(DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_DEFAULT_CATALOG).toBeNull();
    expect(validateDialogueV2FreeformPreparedBotVoiceCatalogRelease(null)).toBeNull();
  });

  it('accepts, copies and deeply freezes an exact four-contour release', () => {
    const input = validCatalog();
    const parsed = parseDialogueV2FreeformPreparedBotVoiceCatalog(input);

    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(parsed?.entries).not.toBe(input.entries);
    expect(parsed?.entries[0]).not.toBe(input.entries[0]);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.entries)).toBe(true);
    expect(Object.isFrozen(parsed?.entries[0])).toBe(true);
  });

  it('encodes only the canonical ordered release fields', () => {
    const catalog = validCatalog();
    expect(encodeDialogueV2FreeformPreparedBotVoiceCatalog(catalog)).toBe(JSON.stringify(catalog));
  });

  it.each([
    ['wrong target', (catalog: any) => { catalog.entries[0].studyTarget = 'it'; }],
    ['root extra field', (catalog: any) => { catalog.model = 'forbidden'; }],
    ['entry extra field', (catalog: any) => { catalog.entries[0].scenarioId = 'social_01'; }],
    ['bad release hash', (catalog: any) => { catalog.releaseSha256 = 'not-a-hash'; }],
    ['bad reply hash', (catalog: any) => { catalog.entries[0].replyTextSha256 = 'A'.repeat(64); }],
    ['bad asset hash', (catalog: any) => { catalog.entries[0].assetSha256 = 'f'.repeat(63); }],
    ['bad release id', (catalog: any) => { catalog.releaseId = '../release'; }],
    ['bad voice style id', (catalog: any) => { catalog.entries[0].voiceStyleId = 'voice/style'; }],
    ['bad response id', (catalog: any) => { catalog.entries[0].preparedResponseId = 'reply.mp3'; }],
    ['path asset key', (catalog: any) => { catalog.entries[0].assetKey = '../reply.mp3'; }],
    ['unsupported mime', (catalog: any) => { catalog.entries[0].mime = 'audio/wav'; }],
    ['ordinary reply kind', (catalog: any) => { catalog.entries[0].responseKind = 'answer'; }],
    ['zero bytes', (catalog: any) => { catalog.entries[0].assetBytes = 0; }],
    ['oversized asset', (catalog: any) => { catalog.entries[0].assetBytes = 10_000_001; }],
    ['too-short duration', (catalog: any) => { catalog.entries[0].durationMs = 249; }],
    ['too-long duration', (catalog: any) => { catalog.entries[0].durationMs = 30_001; }],
  ])('rejects %s', (_name, mutate) => {
    const catalog = validCatalog();
    mutate(catalog);
    if (/^[a-f0-9]{64}$/.test(catalog.releaseSha256)) {
      catalog.releaseSha256 = releaseSha256(catalog.releaseId, catalog.entries);
    }
    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(catalog)).toBeNull();
  });

  it('rejects text whose exact UTF-8 hash does not match the reviewed text', () => {
    const catalog = validCatalog();
    catalog.entries[0].replyText = 'A changed reply.';
    catalog.releaseSha256 = releaseSha256(catalog.releaseId, catalog.entries);

    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(catalog)).toBeNull();
  });

  it('rejects duplicate prepared-response and asset keys', () => {
    const duplicateResponse = validCatalog();
    duplicateResponse.entries[1].preparedResponseId = duplicateResponse.entries[0].preparedResponseId;
    duplicateResponse.releaseSha256 = releaseSha256(
      duplicateResponse.releaseId,
      duplicateResponse.entries,
    );
    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(duplicateResponse)).toBeNull();

    const duplicateAsset = validCatalog();
    duplicateAsset.entries[1].assetKey = duplicateAsset.entries[0].assetKey;
    duplicateAsset.releaseSha256 = releaseSha256(duplicateAsset.releaseId, duplicateAsset.entries);
    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(duplicateAsset)).toBeNull();
  });

  it('rejects accessors and hostile proxies without evaluating field getters', () => {
    let getterCalls = 0;
    const accessor = validCatalog();
    Object.defineProperty(accessor.entries[0], 'replyText', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'Never read me.';
      },
    });
    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(accessor)).toBeNull();
    expect(getterCalls).toBe(0);

    const hostileProxy = new Proxy(validCatalog(), {
      ownKeys() {
        throw new Error('proxy_trap_must_not_escape');
      },
    });
    expect(() => parseDialogueV2FreeformPreparedBotVoiceCatalog(hostileProxy)).not.toThrow();
    expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(hostileProxy)).toBeNull();
  });

  it('reports one stable release-validation error without echoing rejected content', () => {
    const rejected = validCatalog() as any;
    rejected.entries[0].replyText = 'PRIVATE_REJECTED_TEXT';

    expect(() => validateDialogueV2FreeformPreparedBotVoiceCatalogRelease(rejected))
      .toThrow('invalid_dialogue_v2_freeform_prepared_bot_voice_catalog_release');
    try {
      validateDialogueV2FreeformPreparedBotVoiceCatalogRelease(rejected);
    } catch (error) {
      expect(String(error)).not.toContain('PRIVATE_REJECTED_TEXT');
    }
  });

  it('rejects an injected target after the mutable language export is changed post-load', () => {
    const mutableTargets = DIALOGUE_V2_STUDY_TARGETS as unknown as string[];
    mutableTargets.push('it');
    try {
      const catalog = validCatalog();
      catalog.entries[0].studyTarget = 'it';
      catalog.releaseSha256 = releaseSha256(catalog.releaseId, catalog.entries);
      expect(parseDialogueV2FreeformPreparedBotVoiceCatalog(catalog)).toBeNull();
    } finally {
      mutableTargets.splice(mutableTargets.lastIndexOf('it'), 1);
    }
  });

  it('rejects an injected target even when the mutable language export changes before import', async () => {
    await jest.isolateModulesAsync(async () => {
      const languageModule = await import('../shared/dialogue_v2_language_pack_contract');
      const mutableTargets = languageModule.DIALOGUE_V2_STUDY_TARGETS as unknown as string[];
      mutableTargets.push('it');
      const catalogModule = await import(
        '../shared/dialogue_v2_freeform_prepared_bot_voice_catalog'
      );
      const catalog = validCatalog();
      catalog.entries[0].studyTarget = 'it';
      catalog.releaseSha256 = releaseSha256(catalog.releaseId, catalog.entries);

      expect(catalogModule.parseDialogueV2FreeformPreparedBotVoiceCatalog(catalog)).toBeNull();
    });
  });
});
