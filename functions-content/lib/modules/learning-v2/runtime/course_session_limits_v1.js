"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_MAX_TOTAL_INTERACTIONS_V1 = exports.LEARNING_V2_COURSE_SESSION_MAX_PRACTICE_INTERACTIONS_V1 = void 0;
// Three embedded intro questions plus at most 32 single-phrase practice turns.
// The practice ceiling is intentionally bounded: legacy multi-sentence turns may
// be split without weakening the session package's fail-closed size contract.
exports.LEARNING_V2_COURSE_SESSION_MAX_PRACTICE_INTERACTIONS_V1 = 32;
exports.LEARNING_V2_COURSE_SESSION_MAX_TOTAL_INTERACTIONS_V1 = exports.LEARNING_V2_COURSE_SESSION_MAX_PRACTICE_INTERACTIONS_V1 + 3;
//# sourceMappingURL=course_session_limits_v1.js.map