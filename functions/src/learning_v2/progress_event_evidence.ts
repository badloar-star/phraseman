import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { buildLearningEvidenceTupleKey, validateLearningEvidenceBody, validateLearningNonAssessmentBody, type LearningEvidenceBody, type LearningNonAssessmentBody, type LearningMaterializationRef } from "../../../modules/learning-v2/contracts/evidence";
import type { CanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";

export interface ProgressEvidenceBundle {
  readonly schemaVersion: "v2-progress-evidence-bundle.v1";
  readonly attemptRef: CanonicalAttemptRef;
  readonly evidenceBodies: readonly LearningEvidenceBody[];
  readonly nonAssessmentBodies: readonly LearningNonAssessmentBody[];
}
export interface MaterializedProgressEvidence {
  /** Present for materialized bundles; optional only for legacy test doubles. */
  readonly attemptRef?: CanonicalAttemptRef;
  readonly refs: readonly LearningMaterializationRef[];
  readonly componentFingerprint: string;
}

export const mergeProgressEvidenceIndex = (existing: Readonly<Record<string, LearningMaterializationRef>>, incoming: readonly LearningMaterializationRef[], maxEntries = 256): Readonly<Record<string, LearningMaterializationRef>> => {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 1024) throw new Error("v2_progress_evidence_index_bound_invalid");
  const next: Record<string, LearningMaterializationRef> = { ...existing };
  for (const ref of incoming) {
    const key = ref.tupleKey;
    const prior = next[key];
    if (prior) {
      const priorHash = "evidenceBodyHash" in prior ? prior.evidenceBodyHash : prior.nonAssessmentBodyHash;
      const nextHash = "evidenceBodyHash" in ref ? ref.evidenceBodyHash : ref.nonAssessmentBodyHash;
      if (priorHash !== nextHash) throw new Error("v2_progress_evidence_index_conflict");
      continue;
    }
    if (Object.keys(next).length >= maxEntries) throw new Error("v2_progress_evidence_index_overflow");
    next[key] = ref;
  }
  return Object.freeze(next);
};

const sameAttempt = (left: CanonicalAttemptRef, right: CanonicalAttemptRef): boolean => left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isRef = (value: unknown): value is CanonicalAttemptRef => typeof value === "object" && value !== null && !Array.isArray(value) && exactKeys(value as Record<string, unknown>, ["schemaVersion", "opId", "attemptBodyHash"]) && (value as Record<string, unknown>).schemaVersion === "v2-attempt-ref.v1" && typeof (value as Record<string, unknown>).opId === "string" && /^[a-f0-9]{64}$/.test(String((value as Record<string, unknown>).attemptBodyHash));

export const materializeProgressEvidenceBundle = (bundle: ProgressEvidenceBundle): MaterializedProgressEvidence => {
  if (bundle.schemaVersion !== "v2-progress-evidence-bundle.v1" || !isRef(bundle.attemptRef) || bundle.evidenceBodies.length > 256 || bundle.nonAssessmentBodies.length > 256) throw new Error("v2_progress_evidence_bundle_invalid");
  const refs: LearningMaterializationRef[] = [];
  const tupleKeys = new Set<string>();
  for (const body of bundle.evidenceBodies) {
    if (!validateLearningEvidenceBody(body).ok || !sameAttempt(body.sourceAttempt, bundle.attemptRef)) throw new Error("v2_progress_evidence_body_invalid");
    const tupleKey = buildLearningEvidenceTupleKey(body);
    if (tupleKeys.has(tupleKey)) throw new Error("v2_progress_evidence_tuple_duplicate");
    tupleKeys.add(tupleKey); refs.push({ observationId: body.observationId, evidenceBodyHash: hashCanonicalBody(body), tupleKey: tupleKey as LearningMaterializationRef["tupleKey"], sourceAttempt: body.sourceAttempt });
  }
  for (const body of bundle.nonAssessmentBodies) {
    if (!validateLearningNonAssessmentBody(body).ok || !sameAttempt(body.sourceAttempt, bundle.attemptRef)) throw new Error("v2_progress_non_assessment_body_invalid");
    const tupleKey = buildLearningEvidenceTupleKey(body);
    if (tupleKeys.has(tupleKey)) throw new Error("v2_progress_evidence_tuple_duplicate");
    tupleKeys.add(tupleKey); refs.push({ nonAssessmentId: body.nonAssessmentId, nonAssessmentBodyHash: hashCanonicalBody(body), tupleKey: tupleKey as LearningMaterializationRef["tupleKey"], sourceAttempt: body.sourceAttempt });
  }
  return { attemptRef: bundle.attemptRef, refs, componentFingerprint: hashCanonicalBody({ attemptRef: bundle.attemptRef, refs }) };
};
