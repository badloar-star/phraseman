import { DIALOGUE_V2_CATALOGUE_INDEX } from './dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2ApprovedLanguagePackManifest,
} from './dialogue_v2_language_pack_contract';

export type DialogueV2ReleaseCoverage =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: 'coverage_incomplete'; missing: readonly string[] }>
  | Readonly<{ ok: false; error: 'manifest_extra_or_mismatched'; keys: readonly string[] }>;

const SHA256_RE = /^[a-f0-9]{64}$/;

function expectedReleaseKeys(): readonly string[] {
  return DIALOGUE_V2_STUDY_TARGETS.flatMap((studyTarget) =>
    DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => `${studyTarget}:${entry.id}`),
  );
}

function pinMatchesKey(key: string, pin: unknown): boolean {
  if (!pin || typeof pin !== 'object' || Array.isArray(pin)) return false;
  const value = pin as Record<string, unknown>;
  const [studyTarget, scenarioId] = key.split(':');
  return value.studyTarget === studyTarget
    && value.scenarioId === scenarioId
    && typeof value.packVersion === 'string'
    && value.packVersion === value.packVersion.trim()
    && value.packVersion.length > 0
    && [value.packSha256, value.catalogueSha256, value.reviewReceiptSha256].every((hash) => (
      typeof hash === 'string' && SHA256_RE.test(hash)
    ));
}

/**
 * Release-level gate: V2 must not expose a target language until every one of
 * its 76 independently reviewed scenario packs is pinned. This intentionally
 * rejects partial, stale and mismatched manifests before a route can activate.
 */
export function validateDialogueV2ReleaseCoverage(
  manifest: DialogueV2ApprovedLanguagePackManifest,
): DialogueV2ReleaseCoverage {
  const expected = expectedReleaseKeys();
  const expectedSet = new Set(expected);
  const invalidKeys = Object.keys(manifest)
    .filter((key) => !expectedSet.has(key) || !pinMatchesKey(key, manifest[key]))
    .sort();
  if (invalidKeys.length > 0) {
    return { ok: false, error: 'manifest_extra_or_mismatched', keys: invalidKeys };
  }
  const missing = expected.filter((key) => !Object.prototype.hasOwnProperty.call(manifest, key));
  if (missing.length > 0) return { ok: false, error: 'coverage_incomplete', missing };
  return { ok: true };
}
