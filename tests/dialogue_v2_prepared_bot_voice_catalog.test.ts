import { createHash } from 'node:crypto';

import {
  parseDialogueV2PreparedBotVoiceCatalog,
} from '../shared/dialogue_v2_prepared_bot_voice_catalog';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function validCatalog() {
  const replyText = 'You handled that beautifully.';
  return {
    schemaVersion: 'dialogue_v2_prepared_bot_voice_catalog.v1',
    releaseId: 'dialogue_v2_voice_2026_09_27_01',
    contentManifestSha256: 'a'.repeat(64),
    entries: [{
      studyTarget: 'en',
      scenarioId: 'social_01',
      contentPackSha256: 'c'.repeat(64),
      personaId: 'host',
      preparedResponseId: 'social_01_host_milestone_01',
      responseKind: 'milestone',
      replyText,
      replyTextSha256: sha256(replyText),
      assetKey: 'social_01_host_milestone_01_en',
      assetSha256: 'b'.repeat(64),
      assetBytes: 4_096,
    }],
  };
}

describe('Dialogue V2 prepared bot voice release catalog', () => {
  it('accepts an exact immutable release pin without resolving or fetching audio', () => {
    expect(parseDialogueV2PreparedBotVoiceCatalog(validCatalog())).toEqual(validCatalog());
  });

  it.each([
    ['extra root key', (catalog: any) => { catalog.url = 'https://example.test/voice.mp3'; }],
    ['remote asset key', (catalog: any) => { catalog.entries[0].assetKey = 'https://example.test/voice.mp3'; }],
    ['path asset key', (catalog: any) => { catalog.entries[0].assetKey = '../voice.mp3'; }],
    ['wrong reply hash shape', (catalog: any) => { catalog.entries[0].replyTextSha256 = 'not-a-hash'; }],
    ['unknown scenario', (catalog: any) => { catalog.entries[0].scenarioId = 'unknown_01'; }],
    ['ordinary response', (catalog: any) => { catalog.entries[0].responseKind = 'answer'; }],
  ])('rejects %s', (_name, mutate) => {
    const catalog = validCatalog();
    mutate(catalog);
    expect(parseDialogueV2PreparedBotVoiceCatalog(catalog)).toBeNull();
  });

  it('rejects duplicate immutable response and asset identities', () => {
    const duplicateResponse = validCatalog();
    duplicateResponse.entries.push({ ...duplicateResponse.entries[0], assetKey: 'another_asset' });
    expect(parseDialogueV2PreparedBotVoiceCatalog(duplicateResponse)).toBeNull();

    const duplicateAsset = validCatalog();
    duplicateAsset.entries.push({
      ...duplicateAsset.entries[0],
      preparedResponseId: 'social_01_host_closing_01',
      responseKind: 'closing',
    });
    expect(parseDialogueV2PreparedBotVoiceCatalog(duplicateAsset)).toBeNull();
  });
});
