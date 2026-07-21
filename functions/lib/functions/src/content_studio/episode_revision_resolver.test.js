"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const episode_revision_resolver_1 = require("./episode_revision_resolver");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const envelopeParts = (ref) => ({
    record: {
        schemaVersion: "episode-authoring-record.v1",
        draftId: ref.draftId,
        episodeId: ref.episodeId,
        revision: ref.revision,
        contentHash: ref.contentHash,
        revisionFingerprint: ref.revisionFingerprint,
        object: {
            objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(ref.draftId, ref.revision, ref.contentHash),
            contentHash: ref.contentHash,
            objectGeneration: "g-1",
            byteSize: 2,
        },
        provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" },
        createdAt: "2026-07-16T00:00:00.000Z",
    },
    lifecycle: {
        schemaVersion: "episode-lifecycle.v1",
        draftId: ref.draftId,
        episodeId: ref.episodeId,
        revision: ref.revision,
        revisionFingerprint: ref.revisionFingerprint,
        status: "approved",
        changedBy: "owner-1",
        changedAt: "2026-07-16T00:00:00.000Z",
        lifecycleRevision: 1,
    },
});
const minimalEpisodeBody = (activity) => ({
    schemaVersion: "episode-authoring-body.v1",
    draftId: "draft-activity-contract",
    episodeId: "ep-activity-contract",
    revision: 1,
    seasonId: "season-activity-contract",
    ordinal: 1,
    chapterId: "chapter-activity-contract",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    title: [],
    canDoOutcome: [],
    scenario: {},
    phraseFrames: [],
    semanticSlots: [],
    contentUnits: {},
    activityInstances: [activity],
    delayedProbeDefinitions: [],
    graph: {
        startNodeId: "node-1",
        capstoneNodeId: "node-1",
        nodes: [
            {
                nodeId: "node-1",
                activityId: "activity-1",
                position: 1,
                visible: true,
                requiredForCore: true,
                voiceEvidenceOptional: true,
                phase: "encounter_build",
                evidenceDeclarations: [],
                gateEligible: false,
                maxStars: 0,
            },
        ],
        edges: [],
    },
    starSlots: [],
    requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
    assessmentNodes: { independentProbeNodeIds: [] },
    capstoneContract: {
        objectiveIds: [],
        requiredSemanticSlotIds: [],
        criticalConstraintIds: [],
        primaryNodeIds: [],
        deterministicAlternateNodeIds: [],
    },
    masteryContract: { requirements: [] },
    learningDesign: {
        primaryOutcomeId: "outcome-1",
        objectiveIds: ["objective-1"],
        prerequisiteEdges: [],
        supportPlan: [
            {
                objectiveId: "objective-1",
                initialSupport: "partial_cue",
                fadeRuleId: "fade.model-to-partial.v1",
                escalationRuleId: "escalate.targeted-repair.v1",
            },
        ],
        independentProbeRef: "probe-independent-1",
        delayedProbeRef: { probeId: "probe-delayed-1", contentHash: "a".repeat(64) },
        delayedWindowPolicyId: "HYP-V2-007.window.d3-d7",
    },
    voiceGovernance: { requirementsByTemplate: [] },
    reviewLinks: [],
    minAppVersion: "1.0.0",
});
describe("immutable Episode revision object binding", () => {
    it("derives the content-addressed Storage path from draft, revision and hash", () => {
        expect((0, episode_revision_resolver_1.episodeRevisionObjectPath)("draft-1", 3, "a".repeat(64))).toMatch(/^content-studio\/episodes\/[a-f0-9]{64}\/r3\/a{64}\.json$/);
    });
    it("rejects an artifact whose object path is not the exact pinned path", async () => {
        const body = { schemaVersion: "v2-episode-contract.v1" };
        const ref = {
            draftId: "draft-1",
            episodeId: "ep-1",
            revision: 3,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-1", 3, (0, decision_registry_1.hashCanonicalBody)(body)),
            contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
            ordinal: 1,
            chapterId: "chapter-1",
            approvalStatus: "approved",
        };
        await expect((0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)({
            validateBody: () => true,
            resolve: async () => ({
                ...ref,
                ...envelopeParts(ref),
                body,
                bodyHash: ref.contentHash,
                objectPath: "wrong/path.json",
                objectGeneration: "g-1",
            }),
        }, ref)).rejects.toThrow("season_episode_object_path_invalid");
    });
    it("rejects a hash-valid body belonging to another episode", async () => {
        const body = {
            draftId: "draft-1",
            episodeId: "other-episode",
            revision: 3,
            ordinal: 1,
            chapterId: "chapter-1",
        };
        const ref = {
            draftId: "draft-1",
            episodeId: "ep-1",
            revision: 3,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-1", 3, (0, decision_registry_1.hashCanonicalBody)(body)),
            contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
            ordinal: 1,
            chapterId: "chapter-1",
            approvalStatus: "approved",
        };
        await expect((0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)({
            validateBody: () => true,
            resolve: async () => ({
                ...ref,
                ...envelopeParts(ref),
                body,
                bodyHash: ref.contentHash,
                objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(ref.draftId, ref.revision, ref.contentHash),
                objectGeneration: "g-1",
            }),
        }, ref)).rejects.toThrow("season_episode_body_identity_mismatch");
    });
    it("rejects an authoring body with an empty graph shell", () => {
        const body = {
            schemaVersion: "episode-authoring-body.v1",
            draftId: "draft-1",
            episodeId: "ep-1",
            revision: 1,
            seasonId: "season-1",
            ordinal: 1,
            chapterId: "chapter-1",
            studyTarget: "en",
            learnerSourceLocale: "ru",
            title: [],
            canDoOutcome: [],
            scenario: {},
            phraseFrames: [],
            semanticSlots: [],
            contentUnits: {},
            activityInstances: [],
            delayedProbeDefinitions: [],
            graph: {},
            starSlots: [],
            requiredLoops: {},
            assessmentNodes: {},
            capstoneContract: {},
            masteryContract: {},
            learningDesign: {},
            voiceGovernance: {},
            reviewLinks: [],
            minAppVersion: "1.0.0",
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(body)).toBe(false);
    });
    it("rejects a normative ActivityInstance body missing localization and payload hash", () => {
        const activity = {
            schemaVersion: "v2-activity-instance-body.v1",
            activityId: "activity-1",
            revision: 1,
            episodeId: "ep-activity-contract",
            progressCompatibilityKey: "activity-1",
            templateRef: {
                templateId: "template-1",
                version: 1,
                contentHash: "a".repeat(64),
            },
            family: "visual_discovery",
            estimatedSeconds: 10,
            payload: {},
            contentUnitIds: [],
            overrides: {},
            tags: {
                skillIds: [],
                grammar: [],
                vocabulary: [],
                scenario: [],
                modalities: ["reading"],
            },
            assets: [],
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(minimalEpisodeBody(activity))).toBe(false);
    });
    it("accepts a structurally complete normative ActivityInstance body", () => {
        const activity = {
            schemaVersion: "v2-activity-instance-body.v1",
            activityId: "activity-1",
            revision: 1,
            episodeId: "ep-activity-contract",
            progressCompatibilityKey: "activity-1",
            templateRef: {
                templateId: "template-1",
                version: 1,
                contentHash: "a".repeat(64),
            },
            family: "visual_discovery",
            estimatedSeconds: 10,
            payload: {},
            payloadHash: (0, decision_registry_1.hashCanonicalBody)({}),
            contentUnitIds: [],
            overrides: {},
            tags: {
                skillIds: [],
                grammar: [],
                vocabulary: [],
                scenario: [],
                modalities: ["reading"],
            },
            localization: {
                studyTarget: "en",
                learnerSourceLocale: "ru",
                requiredLocales: ["en", "ru"],
                fieldSourceHashes: {},
            },
            assets: [],
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(minimalEpisodeBody(activity))).toBe(true);
    });
    it("rejects a normative ActivityInstance body with a forged payload hash", () => {
        const activity = {
            schemaVersion: "v2-activity-instance-body.v1",
            activityId: "activity-1",
            revision: 1,
            episodeId: "ep-activity-contract",
            progressCompatibilityKey: "activity-1",
            templateRef: {
                templateId: "template-1",
                version: 1,
                contentHash: "a".repeat(64),
            },
            family: "visual_discovery",
            estimatedSeconds: 10,
            payload: { answer: "hello" },
            payloadHash: "b".repeat(64),
            contentUnitIds: [],
            overrides: {},
            tags: {
                skillIds: [],
                grammar: [],
                vocabulary: [],
                scenario: [],
                modalities: ["reading"],
            },
            localization: {
                studyTarget: "en",
                learnerSourceLocale: "ru",
                requiredLocales: ["en", "ru"],
                fieldSourceHashes: {},
            },
            assets: [],
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(minimalEpisodeBody(activity))).toBe(false);
    });
    it("requires a template resolver and enforces its override allowlist", async () => {
        const activity = {
            schemaVersion: "v2-activity-instance-body.v1",
            activityId: "activity-1",
            revision: 1,
            episodeId: "ep-activity-contract",
            progressCompatibilityKey: "activity-1",
            templateRef: {
                templateId: "template-1",
                version: 1,
                contentHash: "a".repeat(64),
            },
            family: "visual_discovery",
            estimatedSeconds: 10,
            payload: {},
            payloadHash: (0, decision_registry_1.hashCanonicalBody)({}),
            contentUnitIds: [],
            overrides: { "prompt.text": "custom" },
            tags: {
                skillIds: [],
                grammar: [],
                vocabulary: [],
                scenario: [],
                modalities: ["reading"],
            },
            localization: {
                studyTarget: "en",
                learnerSourceLocale: "ru",
                requiredLocales: ["en", "ru"],
                fieldSourceHashes: {},
            },
            assets: [],
        };
        const body = minimalEpisodeBody(activity);
        await expect((0, episode_revision_resolver_1.assertEpisodeModeTemplateOverrides)({ resolve: async () => undefined }, body)).rejects.toThrow("season_episode_template_resolver_missing");
        await expect((0, episode_revision_resolver_1.assertEpisodeModeTemplateOverrides)({ resolve: async () => undefined }, minimalEpisodeBody({ ...activity, overrides: {} }))).rejects.toThrow("season_episode_template_resolver_missing");
        const resolver = {
            resolve: async () => undefined,
            resolveModeTemplate: async () => ({
                templateRef: activity.templateRef,
                allowedOverridePaths: ["prompt.text"],
            }),
        };
        await expect((0, episode_revision_resolver_1.assertEpisodeModeTemplateOverrides)(resolver, body)).resolves.toBeUndefined();
        await expect((0, episode_revision_resolver_1.assertEpisodeModeTemplateOverrides)({
            resolve: async () => undefined,
            resolveModeTemplate: async () => ({
                templateRef: activity.templateRef,
                allowedOverridePaths: [],
            }),
        }, body)).rejects.toThrow("season_episode_activity_override_not_allowed");
    });
    it("rejects delayed probe definitions with a non-delayed evidence phase", () => {
        const activity = {
            schemaVersion: "v2-activity-instance-body.v1",
            activityId: "activity-1",
            revision: 1,
            episodeId: "ep-activity-contract",
            progressCompatibilityKey: "activity-1",
            templateRef: {
                templateId: "template-1",
                version: 1,
                contentHash: "a".repeat(64),
            },
            family: "visual_discovery",
            estimatedSeconds: 10,
            payload: {},
            payloadHash: (0, decision_registry_1.hashCanonicalBody)({}),
            contentUnitIds: [],
            overrides: {},
            tags: {
                skillIds: [],
                grammar: [],
                vocabulary: [],
                scenario: [],
                modalities: ["reading"],
            },
            localization: {
                studyTarget: "en",
                learnerSourceLocale: "ru",
                requiredLocales: ["en", "ru"],
                fieldSourceHashes: {},
            },
            assets: [],
        };
        const body = minimalEpisodeBody(activity);
        body.delayedProbeDefinitions = [
            {
                ref: { probeId: "probe-1", contentHash: "c".repeat(64) },
                body: {
                    schemaVersion: "v2-delayed-probe-definition.v1",
                    probeId: "probe-1",
                    targetEpisodeId: "ep-activity-contract",
                    probeNodeId: "delayed-node-1",
                    activityBinding: {
                        activityId: "activity-1",
                        progressCompatibilityKey: "activity-1",
                        templateRef: activity.templateRef,
                    },
                    evidenceDeclarations: [{ phase: "independent_probe" }],
                    pedagogicalContextContract: {},
                },
            },
        ];
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(body)).toBe(false);
    });
    it("validates learningDesign prerequisite and support contracts", () => {
        const valid = {
            primaryOutcomeId: "outcome-1",
            objectiveIds: ["objective-1"],
            prerequisiteEdges: [
                {
                    from: { kind: "objective", id: "objective-0", sourceEpisodeId: "ep-0" },
                    toObjectiveId: "objective-1",
                    requiredState: "independent_evidence",
                },
            ],
            supportPlan: [
                {
                    objectiveId: "objective-1",
                    initialSupport: "partial_cue",
                    fadeRuleId: "fade.model-to-partial.v1",
                    escalationRuleId: "escalate.targeted-repair.v1",
                },
            ],
            independentProbeRef: "probe-independent-1",
            delayedProbeRef: { probeId: "probe-delayed-1", contentHash: "a".repeat(64) },
            delayedWindowPolicyId: "HYP-V2-007.window.d3-d7",
        };
        expect((0, episode_revision_resolver_1.validateEpisodeLearningDesignShape)(valid)).toBe(true);
        expect((0, episode_revision_resolver_1.validateEpisodeLearningDesignShape)({
            ...valid,
            prerequisiteEdges: [
                { ...valid.prerequisiteEdges[0], requiredState: "unsupported" },
            ],
        })).toBe(false);
        expect((0, episode_revision_resolver_1.validateEpisodeLearningDesignShape)({ ...valid, delayedProbeRef: { probeId: "x" } })).toBe(false);
    });
    it("rejects a graph node that omits its canonical nested fields", () => {
        const body = {
            schemaVersion: "episode-authoring-body.v1",
            draftId: "draft-nested",
            episodeId: "ep-nested",
            revision: 1,
            seasonId: "season-nested",
            ordinal: 1,
            chapterId: "chapter-nested",
            studyTarget: "en",
            learnerSourceLocale: "ru",
            title: [],
            canDoOutcome: [],
            scenario: {},
            phraseFrames: [],
            semanticSlots: [],
            contentUnits: {},
            activityInstances: [{ activityId: "activity-1" }],
            delayedProbeDefinitions: [],
            graph: {
                startNodeId: "node-1",
                capstoneNodeId: "node-1",
                nodes: [{ nodeId: "node-1", activityId: "activity-1" }],
                edges: [],
            },
            starSlots: [],
            requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
            assessmentNodes: { independentProbeNodeIds: [] },
            capstoneContract: {
                objectiveIds: [],
                requiredSemanticSlotIds: [],
                criticalConstraintIds: [],
                primaryNodeIds: [],
                deterministicAlternateNodeIds: [],
            },
            masteryContract: { requirements: [] },
            learningDesign: {},
            voiceGovernance: { requirementsByTemplate: [] },
            reviewLinks: [],
            minAppVersion: "1.0.0",
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(body)).toBe(false);
    });
    it("fail-closes malformed graph edges instead of throwing during validation", () => {
        const body = {
            schemaVersion: "episode-authoring-body.v1",
            draftId: "draft-edge",
            episodeId: "ep-edge",
            revision: 1,
            seasonId: "season-edge",
            ordinal: 1,
            chapterId: "chapter-edge",
            studyTarget: "en",
            learnerSourceLocale: "ru",
            title: [],
            canDoOutcome: [],
            scenario: {},
            phraseFrames: [],
            semanticSlots: [],
            contentUnits: {},
            activityInstances: [],
            delayedProbeDefinitions: [],
            graph: {
                startNodeId: "node-1",
                capstoneNodeId: "node-1",
                nodes: [
                    {
                        nodeId: "node-1",
                        activityId: "activity-1",
                        position: 1,
                        visible: true,
                        requiredForCore: true,
                        voiceEvidenceOptional: true,
                        phase: "encounter_build",
                        evidenceDeclarations: [],
                        gateEligible: false,
                        maxStars: 0,
                    },
                ],
                edges: [null],
            },
            starSlots: [],
            requiredLoops: { encounterBuildNodeIds: [], nearTransferNodeIds: [] },
            assessmentNodes: { independentProbeNodeIds: [] },
            capstoneContract: {
                objectiveIds: [],
                requiredSemanticSlotIds: [],
                criticalConstraintIds: [],
                primaryNodeIds: [],
                deterministicAlternateNodeIds: [],
            },
            masteryContract: { requirements: [] },
            learningDesign: {},
            voiceGovernance: { requirementsByTemplate: [] },
            reviewLinks: [],
            minAppVersion: "1.0.0",
        };
        expect(() => (0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(body)).not.toThrow();
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionArtifactBody)(body)).toBe(false);
    });
    it("rejects downloaded bytes whose raw hash differs from the pinned hash", () => {
        const body = { schemaVersion: "episode-authoring-body.v1" };
        expect(() => (0, episode_revision_resolver_1.verifyCanonicalEpisodeObjectBytes)(new TextEncoder().encode(JSON.stringify(body, null, 2)), (0, decision_registry_1.hashCanonicalBody)(body))).toThrow("episode_object_bytes_hash_mismatch");
    });
    it("rejects malformed UTF-8 even when replacement text hashes canonically", () => {
        const expected = (0, decision_registry_1.hashCanonicalBody)({ x: "�" });
        const bytes = new Uint8Array([
            0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d,
        ]);
        expect(() => (0, episode_revision_resolver_1.verifyCanonicalEpisodeObjectBytes)(bytes, expected)).toThrow("episode_object_utf8_invalid");
    });
    it("rejects a flat revision record without object/lifecycle envelopes", () => {
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionEnvelope)({
            body: {},
            draftId: "draft-1",
            episodeId: "ep-1",
        })).toBe(false);
    });
    it("rejects an inline Firestore body in the Storage-only record envelope", () => {
        const body = {};
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = {
            draftId: "draft-storage-only",
            episodeId: "episode-storage-only",
            revision: 1,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-storage-only", 1, contentHash),
            contentHash,
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)({ body, ...envelopeParts(ref) })).toBe(false);
    });
    it("rejects unknown keys in immutable Episode index envelopes", () => {
        const body = {};
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = {
            draftId: "draft-strict-keys",
            episodeId: "episode-strict-keys",
            revision: 1,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-strict-keys", 1, contentHash),
            contentHash,
        };
        const valid = envelopeParts(ref);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)({
            ...valid,
            unexpected: true,
        })).toBe(false);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)({
            ...valid,
            record: { ...valid.record, unexpected: true },
        })).toBe(false);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)({
            ...valid,
            record: {
                ...valid.record,
                object: { ...valid.record.object, unexpected: true },
            },
        })).toBe(false);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)({
            ...valid,
            lifecycle: { ...valid.lifecycle, unexpected: true },
        })).toBe(false);
    });
    it("accepts the canonical record-only index without lifecycle or body", () => {
        const body = {};
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = { draftId: "record-only", episodeId: "episode-record-only", revision: 1, revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("record-only", 1, contentHash), contentHash };
        const parts = envelopeParts(ref);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordOnly)({ record: parts.record })).toBe(true);
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordOnly)({ record: parts.record, lifecycle: parts.lifecycle })).toBe(false);
    });
    it("accepts normative clone and generator provenance extensions", () => {
        const body = {};
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = {
            draftId: "draft-provenance",
            episodeId: "episode-provenance",
            revision: 1,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-provenance", 1, contentHash),
            contentHash,
        };
        const envelope = envelopeParts(ref);
        envelope.record.provenance = {
            ...envelope.record.provenance,
            basedOn: {
                entityType: "episode",
                entityId: "source-episode",
                versionOrRevision: 2,
                contentHash: "a".repeat(64),
            },
            generator: {
                stageId: "episode-body",
                artifactId: "artifact-1",
                promptVersion: "prompt-v1",
                schemaVersion: 1,
            },
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionRecordEnvelope)(envelope)).toBe(true);
    });
    it("rejects a regex-valid but forged revision fingerprint", () => {
        const body = {};
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const draftId = "draft-1";
        const revision = 1;
        const fingerprint = (0, episode_revision_resolver_1.episodeRevisionFingerprint)(draftId, revision, contentHash);
        const envelope = {
            body,
            record: {
                schemaVersion: "episode-authoring-record.v1",
                draftId,
                episodeId: "ep-1",
                revision,
                contentHash,
                revisionFingerprint: "f".repeat(64),
                object: {
                    objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(draftId, revision, contentHash),
                    contentHash,
                    objectGeneration: "g-1",
                    byteSize: 2,
                },
                provenance: {
                    createdBy: "owner-1",
                    createdAt: "2026-07-16T00:00:00.000Z",
                },
                createdAt: "2026-07-16T00:00:00.000Z",
            },
            lifecycle: {
                schemaVersion: "episode-lifecycle.v1",
                draftId,
                episodeId: "ep-1",
                revision,
                revisionFingerprint: fingerprint,
                status: "approved",
                changedBy: "owner-1",
                changedAt: "2026-07-16T00:00:00.000Z",
                lifecycleRevision: 1,
            },
        };
        expect((0, episode_revision_resolver_1.validateEpisodeRevisionEnvelope)(envelope)).toBe(false);
    });
    it("rejects a flat injected artifact without record and lifecycle", async () => {
        const body = {
            draftId: "draft-flat",
            episodeId: "episode-flat",
            revision: 1,
            ordinal: 1,
            chapterId: "chapter-flat",
        };
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = {
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision: body.revision,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)(body.draftId, body.revision, contentHash),
            contentHash,
            ordinal: body.ordinal,
            chapterId: body.chapterId,
            approvalStatus: "approved",
        };
        await expect((0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)({
            validateBody: () => true,
            resolve: async () => ({
                ...ref,
                body,
                bodyHash: contentHash,
                objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(ref.draftId, ref.revision, ref.contentHash),
                objectGeneration: "g-1",
            }),
        }, ref)).rejects.toThrow("season_episode_revision_envelope_invalid");
    });
    it("rejects a self-validating record that belongs to another top-level ref", async () => {
        const body = {
            draftId: "draft-cross",
            episodeId: "episode-cross",
            revision: 1,
            ordinal: 1,
            chapterId: "chapter-cross",
        };
        const contentHash = (0, decision_registry_1.hashCanonicalBody)(body);
        const ref = {
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision: body.revision,
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)(body.draftId, body.revision, contentHash),
            contentHash,
            ordinal: body.ordinal,
            chapterId: body.chapterId,
            approvalStatus: "approved",
        };
        const otherRef = {
            ...ref,
            draftId: "other-draft",
            episodeId: "other-episode",
            revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("other-draft", body.revision, contentHash),
        };
        await expect((0, episode_revision_resolver_1.assertExactImmutableEpisodeRevision)({
            validateBody: () => true,
            resolve: async () => ({
                ...ref,
                ...envelopeParts(otherRef),
                body,
                bodyHash: contentHash,
                objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(ref.draftId, ref.revision, ref.contentHash),
                objectGeneration: "g-1",
            }),
        }, ref)).rejects.toThrow("season_episode_revision_envelope_mismatch");
    });
});
//# sourceMappingURL=episode_revision_resolver.test.js.map