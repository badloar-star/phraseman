export const REVIEWED_CARD_EVIDENCE_SCHEMA = "reviewed-card-evidence-v2";

export function reviewedCardEligible({
  candidate,
  viewSource,
  projectionFresh,
  readiness,
  sourceQualityFindings,
  sourceReleaseFindings,
}) {
  return candidate !== true &&
    viewSource === "reviewed_source" &&
    projectionFresh === true &&
    readiness?.ready === true &&
    Array.isArray(sourceQualityFindings) && sourceQualityFindings.length === 0 &&
    Array.isArray(sourceReleaseFindings) && sourceReleaseFindings.length === 0;
}
