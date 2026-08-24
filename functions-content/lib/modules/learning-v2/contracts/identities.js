"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUniqueActivityIdsWithinRelease = exports.parseReleaseId = exports.parseSkillId = exports.parseActivityId = exports.parseNodeId = exports.parseSessionId = exports.parseEpisodeId = exports.parseSeasonId = exports.parseCourseId = exports.isReleaseId = exports.isSkillId = exports.isActivityId = exports.isNodeId = exports.isSessionId = exports.isEpisodeId = exports.isSeasonId = exports.isCourseId = exports.V2IdentityError = exports.V2_SESSION_ID_ERROR_CODE = exports.V2_IDENTITY_ERROR_CODES = exports.V2_IDENTITY_REGEX = exports.V2_IDENTITY_PATTERN = void 0;
exports.V2_IDENTITY_PATTERN = "^[A-Za-z0-9._-]{1,160}$";
exports.V2_IDENTITY_REGEX = Object.freeze(new RegExp(exports.V2_IDENTITY_PATTERN));
exports.V2_IDENTITY_ERROR_CODES = Object.freeze({
    course: "invalid_course_id",
    season: "invalid_season_id",
    episode: "invalid_episode_id",
    node: "invalid_node_id",
    activity: "invalid_activity_id",
    skill: "invalid_skill_id",
    release: "invalid_release_id",
    duplicateActivityWithinRelease: "duplicate_activity_id_within_release",
});
exports.V2_SESSION_ID_ERROR_CODE = "invalid_session_id";
class V2IdentityError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = "V2IdentityError";
    }
}
exports.V2IdentityError = V2IdentityError;
const isValidV2Identity = (value) => {
    if (typeof value !== "string")
        return false;
    const match = exports.V2_IDENTITY_REGEX.exec(value);
    return match?.[0] === value;
};
const parseIdentity = (value, code) => {
    if (!isValidV2Identity(value))
        throw new V2IdentityError(code);
    return value;
};
const isCourseId = (value) => isValidV2Identity(value);
exports.isCourseId = isCourseId;
const isSeasonId = (value) => isValidV2Identity(value);
exports.isSeasonId = isSeasonId;
const isEpisodeId = (value) => isValidV2Identity(value);
exports.isEpisodeId = isEpisodeId;
const isSessionId = (value) => isValidV2Identity(value);
exports.isSessionId = isSessionId;
const isNodeId = (value) => isValidV2Identity(value);
exports.isNodeId = isNodeId;
const isActivityId = (value) => isValidV2Identity(value);
exports.isActivityId = isActivityId;
const isSkillId = (value) => isValidV2Identity(value);
exports.isSkillId = isSkillId;
const isReleaseId = (value) => isValidV2Identity(value);
exports.isReleaseId = isReleaseId;
const parseCourseId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.course);
exports.parseCourseId = parseCourseId;
const parseSeasonId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.season);
exports.parseSeasonId = parseSeasonId;
const parseEpisodeId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.episode);
exports.parseEpisodeId = parseEpisodeId;
const parseSessionId = (value) => parseIdentity(value, exports.V2_SESSION_ID_ERROR_CODE);
exports.parseSessionId = parseSessionId;
const parseNodeId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.node);
exports.parseNodeId = parseNodeId;
const parseActivityId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.activity);
exports.parseActivityId = parseActivityId;
const parseSkillId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.skill);
exports.parseSkillId = parseSkillId;
const parseReleaseId = (value) => parseIdentity(value, exports.V2_IDENTITY_ERROR_CODES.release);
exports.parseReleaseId = parseReleaseId;
const assertUniqueActivityIdsWithinRelease = (releaseId, ids) => {
    (0, exports.parseReleaseId)(releaseId);
    const seen = new Set();
    for (const candidate of ids) {
        const activityId = (0, exports.parseActivityId)(candidate);
        if (seen.has(activityId)) {
            throw new V2IdentityError(exports.V2_IDENTITY_ERROR_CODES.duplicateActivityWithinRelease);
        }
        seen.add(activityId);
    }
};
exports.assertUniqueActivityIdsWithinRelease = assertUniqueActivityIdsWithinRelease;
//# sourceMappingURL=identities.js.map