"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PILOT_SCORING_POLICY_CATALOG = exports.PILOT_SCORING_POLICY_BODY = exports.createCodeOwnedScoringPolicyCatalog = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const RESULT_CODES = [
    "PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN",
    "INVALID_AUDIO_OR_SYSTEM", "CORRECT", "WRONG", "COMPLETED", "SKIPPED",
];
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const validateBody = (body) => {
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
const createCodeOwnedScoringPolicyCatalog = (definitions) => {
    const entries = definitions.map((body) => {
        validateBody(body);
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = Object.freeze({
            kind: "scoring", key: body.key, version: body.version, contentHash,
        });
        const evaluate = (input) => {
            // Evidence is a required trusted input.  The resolver validates the
            // hash shape; the catalog additionally refuses an empty value.
            if (!isHash(input.evidenceComponentFingerprint))
                return 0;
            return body.scores[input.resultCode];
        };
        return Object.freeze({ body: Object.freeze({ ...body, scores: Object.freeze({ ...body.scores }) }), ref, evaluate });
    });
    const seen = new Set();
    for (const entry of entries) {
        const identity = `${entry.ref.key}@${entry.ref.version}`;
        if (seen.has(identity))
            throw new Error("v2_server_score_policy_duplicate");
        seen.add(identity);
    }
    const map = new Map(entries.map((entry) => [`${entry.ref.key}@${entry.ref.version}:${entry.ref.contentHash}`, entry]));
    return Object.freeze({
        entries: Object.freeze(entries),
        resolve: (ref) => map.get(`${ref.key}@${ref.version}:${ref.contentHash}`)?.evaluate,
    });
};
exports.createCodeOwnedScoringPolicyCatalog = createCodeOwnedScoringPolicyCatalog;
/** Pilot v1 policy: confident success earns three, practice feedback earns one,
 * and non-assessment/system outcomes are forced to zero by the resolver. */
exports.PILOT_SCORING_POLICY_BODY = Object.freeze({
    schemaVersion: "v2-scoring-policy-body.v1",
    key: "policy.scoring.pilot",
    version: 1,
    algorithm: "result_code_evidence_presence.v1",
    scores: Object.freeze({
        PASS_CONFIDENT: 3, NEEDS_WORK_CONFIDENT: 1, UNCERTAIN: 0,
        INVALID_AUDIO_OR_SYSTEM: 0, CORRECT: 3, WRONG: 0, COMPLETED: 2, SKIPPED: 0,
    }),
});
exports.PILOT_SCORING_POLICY_CATALOG = (0, exports.createCodeOwnedScoringPolicyCatalog)([
    exports.PILOT_SCORING_POLICY_BODY,
]);
//# sourceMappingURL=server_score_policy_catalog.js.map