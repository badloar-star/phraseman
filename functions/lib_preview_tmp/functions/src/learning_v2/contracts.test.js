"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const contracts_1 = require("./contracts");
const readJson = (...segments) => JSON.parse(fs.readFileSync(path.join(__dirname, "../../../tests", ...segments), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const applyMutations = (target, mutations) => {
    for (const mutation of mutations) {
        let cursor = target;
        for (const segment of mutation.path.slice(0, -1)) {
            cursor = cursor[segment];
        }
        const leaf = mutation.path[mutation.path.length - 1];
        if (mutation.op === "delete") {
            if (Array.isArray(cursor) && typeof leaf === "number")
                cursor.splice(leaf, 1);
            else
                delete cursor[leaf];
        }
        else {
            cursor[leaf] = clone(mutation.value);
        }
    }
};
const issueSummary = (result) => result.issues.map(({ code, path: issuePath }) => ({ code, path: issuePath }));
const withBoundDelayedAccessibilityAlternate = (input) => {
    const candidate = clone(input);
    const episode = candidate.episode;
    const definition = episode.delayedProbeDefinitions[0];
    const body = definition.body;
    body.accessibilityAlternateActivityId = "ep01.a09";
    definition.ref.contentHash = (0, contracts_1.hashCanonicalBody)(body);
    episode.learningDesign.delayedProbeRef = clone(definition.ref);
    episode.reviewLinks[0].probeRef = clone(definition.ref);
    const episodeRef = candidate.curriculum.episodeRefs.find((ref) => ref.episodeId === episode.episodeId);
    if (!episodeRef)
        throw new Error("test_fixture_episode_ref_missing");
    episodeRef.contentHash = (0, contracts_1.hashCanonicalBody)(episode);
    return candidate;
};
const fixture = withBoundDelayedAccessibilityAlternate(readJson("fixtures", "learning-v2", "episode-01.valid.json"));
const registry = readJson("fixtures", "learning-v2", "content-studio", "decision-registry.v1.json");
const invalidCorpus = readJson("fixtures", "learning-v2", "episode.invalid.json");
describe("Learning V2 Functions conformance mirror", () => {
    test("publishes one canonical schema/hash manifest", () => {
        expect(contracts_1.FUNCTIONS_V2_CONTRACT_MANIFEST).toEqual({
            packageSchemaVersion: "learning-v2-contract-fixture.v1",
            episodeSchemaVersion: "v2-episode-contract.v1",
            curriculumSchemaVersion: "v2-curriculum-contract.v1",
            attemptBodySchemaVersion: "v2-attempt-body.v1",
            evidenceBodySchemaVersion: "learning-evidence-body.v1",
            nonAssessmentBodySchemaVersion: "learning-non-assessment-body.v1",
            canonicalJsonVersion: "canonical-json.v1",
            hashAlgorithm: "sha256-utf8",
        });
    });
    test("accepts the checked-in valid package and all canonical hashes are stable", () => {
        const result = (0, contracts_1.validateV2LearningPackage)(fixture, {
            decisionRegistry: registry.baseline,
        });
        expect(result.ok).toBe(true);
        const body = {
            schemaVersion: "v2-attempt-body.v1",
            opId: "mirror.attempt.1",
            attemptSurface: { kind: "episode_graph_node" },
            outcome: { resultCode: "CORRECT" },
            evidence: { hintsUsed: 0 },
            provenance: { phase: "near_transfer" },
            inputBinding: { source: "keyboard" },
            learningTupleDispositions: [],
        };
        const ref = (0, contracts_1.buildCanonicalAttemptRef)(body);
        expect(ref.attemptBodyHash).toBe((0, contracts_1.hashCanonicalBody)(body));
        expect(ref.attemptBodyHash).toMatch(/^[a-f0-9]{64}$/);
        const evidenceBody = {
            schemaVersion: "learning-evidence-body.v1",
            observationId: "mirror.observation.1",
            nodeId: "ep01.n01",
            objectiveId: "obj.1",
            skillId: "skill.1",
            construct: "semantic",
            phase: "near_transfer",
            targetKind: "objective",
            targetId: "obj.1",
            assessmentStatus: "assessed",
            outcome: "success",
            sourceAttempt: ref,
            policyId: "policy.evidence.v1",
            policyVersion: 1,
            provenance: {
                phase: "near_transfer",
                support: { hintsUsed: 0 },
                context: { contextId: "ctx.1" },
                prompt: { promptId: "prompt.1" },
            },
            route: {
                kind: "non_voice",
                input: {
                    source: "keyboard",
                    runtimeEvidenceRef: {
                        runtimeEvidenceHash: "a".repeat(64),
                        sourceAttempt: ref,
                    },
                },
            },
            timing: { occurredAt: "2026-01-01T00:00:00.000Z" },
        };
        const evidenceRef = (0, contracts_1.buildLearningEvidenceRef)(evidenceBody);
        expect(evidenceRef.evidenceBodyHash).toBe((0, contracts_1.hashCanonicalBody)(evidenceBody));
    });
    test.each(invalidCorpus.invalidCases)("rejects corpus case $caseId with the normative issue manifest", (invalidCase) => {
        const candidate = clone(fixture);
        applyMutations(candidate, invalidCase.mutations);
        const result = (0, contracts_1.validateV2LearningPackage)(candidate, {
            decisionRegistry: registry.baseline,
        });
        expect(result.ok).toBe(false);
        expect(issueSummary(result)).toEqual(invalidCase.expectedIssues);
    });
});
//# sourceMappingURL=contracts.test.js.map