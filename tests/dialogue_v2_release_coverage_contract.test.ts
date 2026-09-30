import {
  validateDialogueV2ReleaseCoverage,
} from '../shared/dialogue_v2_release_coverage_contract';
import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2ApprovedLanguagePackManifest,
} from '../shared/dialogue_v2_language_pack_contract';

const HASH = 'a'.repeat(64);

function fullManifest(): Record<string, DialogueV2ApprovedLanguagePackManifest[string]> {
  return Object.fromEntries(DIALOGUE_V2_STUDY_TARGETS.flatMap((studyTarget) =>
    DIALOGUE_V2_CATALOGUE_INDEX.map((scenario) => {
      const pin = {
        studyTarget,
        scenarioId: scenario.id,
        packVersion: 'v1',
        packSha256: HASH,
        catalogueSha256: HASH,
        reviewReceiptSha256: HASH,
      };
      return [`${studyTarget}:${scenario.id}`, pin];
    }),
  )) as Record<string, DialogueV2ApprovedLanguagePackManifest[string]>;
}

describe('validateDialogueV2ReleaseCoverage', () => {
  it('requires every one of the 76 scenarios for every active dialogue language before V2 can release', () => {
    expect(validateDialogueV2ReleaseCoverage(fullManifest())).toEqual({ ok: true });
  });

  it('fails closed and identifies the exact missing language/scenario release pin', () => {
    const manifest = fullManifest();
    delete manifest['fr:work_19'];

    expect(validateDialogueV2ReleaseCoverage(manifest)).toEqual({
      ok: false,
      error: 'coverage_incomplete',
      missing: ['fr:work_19'],
    });
  });

  it('rejects an extra or mismatched manifest key instead of silently shipping a partial catalogue', () => {
    const manifest = fullManifest();
    manifest['en:unknown_01'] = {
      studyTarget: 'en',
      scenarioId: 'unknown_01',
      packVersion: 'v1',
      packSha256: HASH,
      catalogueSha256: HASH,
      reviewReceiptSha256: HASH,
    };

    expect(validateDialogueV2ReleaseCoverage(manifest)).toEqual({
      ok: false,
      error: 'manifest_extra_or_mismatched',
      keys: ['en:unknown_01'],
    });
  });
});
