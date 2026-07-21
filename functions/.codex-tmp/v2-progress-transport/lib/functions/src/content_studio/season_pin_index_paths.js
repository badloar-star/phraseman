"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seasonEpisodePinIndexDocumentPath = void 0;
const seasonEpisodePinIndexDocumentPath = (ref) => `content_season_episode_pins/${ref.episodeId}__r${ref.revision}__${ref.revisionFingerprint}`;
exports.seasonEpisodePinIndexDocumentPath = seasonEpisodePinIndexDocumentPath;
