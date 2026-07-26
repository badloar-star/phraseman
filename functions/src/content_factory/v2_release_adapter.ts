/**
 * Compatibility entry point for Functions. Canonical release contracts live in
 * the React/Functions-independent shared module so the client cannot drift.
 */
export {
  assertV2RollbackTarget,
  assertV2SeasonReleaseManifestBody,
  assertV2SeasonReleasePointer,
  buildV2SeasonReleaseRecord,
  resolveV2ReleaseManifest,
  validateV2SeasonReleaseManifestBody,
  validateV2SeasonReleasePointer,
  v2ManifestHash,
} from '../../../modules/learning-v2/content/release_manifest';
export type {
  V2ObjectRef,
  V2Ref,
  V2ReleaseEnvironment,
  V2ReleaseScope,
  V2ReleaseState,
  V2ResolvedReleaseManifest,
  V2SeasonReleaseManifestBody,
  V2SeasonReleaseManifestRecord,
  V2SeasonReleasePointer,
  V2SupportRef,
} from '../../../modules/learning-v2/content/release_manifest';
