"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredSessionSetId = void 0;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
/** Shared mobile/server identity for an immutable published session set. */
const requiredSessionSetId = (episodeId, version) => {
    if (!SAFE_ID.test(episodeId) || !Number.isSafeInteger(version) || version < 1) {
        throw new Error("required_session_publication_identity_invalid");
    }
    return `session-set.${episodeId}.v${version}`;
};
exports.requiredSessionSetId = requiredSessionSetId;
//# sourceMappingURL=required_session_release_identity.js.map