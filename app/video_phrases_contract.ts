/**
 * Canonical learner-facing shape for a phrase attached to a YouTube video.
 *
 * This boundary is intentionally narrow: source documents may contain
 * examples, exercises, grammar schemes and other editorial material, but
 * none of those fields are allowed into the published learner payload.
 */
export { normalizeVideoPhraseDraft, normalizeVideoPhraseList, videoPhraseId } from '../shared/video_phrases_contract';
export type { VideoPhrase, VideoPhraseVersion } from '../shared/video_phrases_contract';
