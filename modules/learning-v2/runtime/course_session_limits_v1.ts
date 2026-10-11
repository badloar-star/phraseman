// Three embedded intro questions plus at most 32 single-phrase practice turns.
// The practice ceiling is intentionally bounded: legacy multi-sentence turns may
// be split without weakening the session package's fail-closed size contract.
export const LEARNING_V2_COURSE_SESSION_MAX_PRACTICE_INTERACTIONS_V1 = 32;
export const LEARNING_V2_COURSE_SESSION_MAX_TOTAL_INTERACTIONS_V1 =
  LEARNING_V2_COURSE_SESSION_MAX_PRACTICE_INTERACTIONS_V1 + 3;
