import type { VersionedPolicyRef } from "../../../modules/learning-v2/contracts/activity";
import type { V2ActivityResultCode } from "../../../modules/learning-v2/contracts/activity_result";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { ScoringPolicyCatalog } from "./server_score_policy_evaluator";
import type { ServerScoreEvaluator } from "./server_score_resolver";

/** Hashable, code-owned description of a scoring policy.  The executable
 * evaluator is derived from this descriptor; no admin/client value is used. */
export interface ScoringPolicyDefinitionBody {
  readonly schemaVersion: "v2-scoring-policy-body.v1";
  readonly key: string;
  readonly version: number;
  readonly algorithm: "result_code_evidence_presence.v1";
  readonly scores: Readonly<Record<V2ActivityResultCode, 0 | 1 | 2 | 3>>;
}

export interface CodeOwnedScoringPolicy {
  readonly body: ScoringPolicyDefinitionBody;
  readonly ref: VersionedPolicyRef<"scoring">;
  readonly evaluate: ServerScoreEvaluator;
}

const RESULT_CODES: readonly V2ActivityResultCode[] = [
  "PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN",
  "INVALID_AUDIO_OR_SYSTEM", "CORRECT", "WRONG", "COMPLETED", "SKIPPED",
];

const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

const validateBody = (body: ScoringPolicyDefinitionBody): void => {
  if (body.schemaVersion !== "v2-scoring-policy-body.v1" ||
      !body.key || !Number.isSafeInteger(body.version) || body.version < 1 ||
      body.algorithm !== "result_code_evidence_presence.v1") {
    throw new Error("v2_server_score_policy_definition_invalid");
  }
  for (const code of RESULT_CODES) {
    const score = body.scores[code];
    if (!Number.isInteger(score) || score < 0 || score > 3) {
      throw new Error("v2_server_score_policy_definition_invalid");
    }
  }
};

/** Build an immutable catalog with exact content-hash/version lookup. */
export const createCodeOwnedScoringPolicyCatalog = (
  definitions: readonly ScoringPolicyDefinitionBody[],
): ScoringPolicyCatalog & { readonly entries: readonly CodeOwnedScoringPolicy[] } => {
  const entries = definitions.map((body) => {
    validateBody(body);
    const contentHash = hashCanonicalBody(body);
    const ref: VersionedPolicyRef<"scoring"> = Object.freeze({
      kind: "scoring", key: body.key, version: body.version, contentHash,
    });
    const evaluate: ServerScoreEvaluator = (input) => {
      // Evidence is a required trusted input.  The resolver validates the
      // hash shape; the catalog additionally refuses an empty value.
      if (!isHash(input.evidenceComponentFingerprint)) return 0;
      return body.scores[input.resultCode];
    };
    return Object.freeze({ body: Object.freeze({ ...body, scores: Object.freeze({ ...body.scores }) }), ref, evaluate });
  });
  const seen = new Set<string>();
  for (const entry of entries) {
    const identity = `${entry.ref.key}@${entry.ref.version}`;
    if (seen.has(identity)) throw new Error("v2_server_score_policy_duplicate");
    seen.add(identity);
  }
  const map = new Map(entries.map((entry) => [`${entry.ref.key}@${entry.ref.version}:${entry.ref.contentHash}`, entry]));
  return Object.freeze({
    entries: Object.freeze(entries),
    resolve: (ref: VersionedPolicyRef<"scoring">) => map.get(`${ref.key}@${ref.version}:${ref.contentHash}`)?.evaluate,
  });
};

/** Pilot v1 policy: confident success earns three, practice feedback earns one,
 * and non-assessment/system outcomes are forced to zero by the resolver. */
export const PILOT_SCORING_POLICY_BODY: ScoringPolicyDefinitionBody = Object.freeze({
  schemaVersion: "v2-scoring-policy-body.v1",
  key: "policy.scoring.pilot",
  version: 1,
  algorithm: "result_code_evidence_presence.v1",
  scores: Object.freeze({
    PASS_CONFIDENT: 3, NEEDS_WORK_CONFIDENT: 1, UNCERTAIN: 0,
    INVALID_AUDIO_OR_SYSTEM: 0, CORRECT: 3, WRONG: 0, COMPLETED: 2, SKIPPED: 0,
  }),
});

export const PILOT_SCORING_POLICY_CATALOG = createCodeOwnedScoringPolicyCatalog([
  PILOT_SCORING_POLICY_BODY,
]);
