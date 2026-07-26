import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";

export const seasonEpisodePinIndexDocumentPath = (ref: Pick<ApprovedEpisodeRevision, "episodeId" | "revision" | "revisionFingerprint">): string =>
  `content_season_episode_pins/${ref.episodeId}__r${ref.revision}__${ref.revisionFingerprint}`;
