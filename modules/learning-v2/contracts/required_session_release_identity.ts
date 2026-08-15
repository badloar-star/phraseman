const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;

/** Shared mobile/server identity for an immutable published session set. */
export const requiredSessionSetId = (episodeId: string, version: number): string => {
  if (!SAFE_ID.test(episodeId) || !Number.isSafeInteger(version) || version < 1) {
    throw new Error("required_session_publication_identity_invalid");
  }
  return `session-set.${episodeId}.v${version}`;
};
