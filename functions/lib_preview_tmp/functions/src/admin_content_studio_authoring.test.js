"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_studio_authoring_1 = require("./admin_content_studio_authoring");
describe("V2 Content Studio callable boundary", () => {
    it("rejects malformed/stale mutation envelopes before repository access", () => {
        expect(() => (0, admin_content_studio_authoring_1.parseV2AuthoringRequest)({
            draftId: "",
            expectedRevision: 0,
            expectedFingerprint: "",
            draft: {},
        })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.parseV2AuthoringRequest)({
            draftId: "draft-1",
            expectedRevision: 1,
            expectedFingerprint: "fingerprint",
            draft: { body: {}, record: {} },
        })).toMatchObject({ draftId: "draft-1", expectedRevision: 1 });
    });
    it("requires admin content draft permission", () => {
        expect(() => (0, admin_content_studio_authoring_1.requireContentDraftWriter)(undefined)).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_studio_authoring_1.requireContentDraftWriter)({
            uid: "u-1",
            token: { admin: true, adminRole: "support" },
        })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_studio_authoring_1.requireContentDraftWriter)({
            uid: "u-1",
            token: { admin: "true", adminRole: "content_editor" },
        })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.requireContentDraftWriter)({
            uid: "u-1",
            token: { admin: true, adminRole: "content_editor" },
        })).toMatchObject({ uid: "u-1", role: "content_editor" });
    });
    it("accepts the explicit zero-head fingerprint only for first-create", () => {
        expect((0, admin_content_studio_authoring_1.parseV2AuthoringRequest)({
            draftId: "draft-new",
            expectedRevision: 0,
            expectedFingerprint: "",
            draft: { body: {}, record: {} },
        })).toMatchObject({ expectedRevision: 0, expectedFingerprint: "" });
    });
    it("authorizes before invoking the repository dependency", async () => {
        const save = jest.fn(async (writer, request) => ({
            uid: writer.uid,
            draftId: request.draftId,
        }));
        await expect((0, admin_content_studio_authoring_1.handleAdminSaveV2Draft)({
            auth: {
                uid: "u-1",
                token: { admin: true, adminRole: "content_editor" },
            },
            data: {
                draftId: "draft-1",
                expectedRevision: 1,
                expectedFingerprint: "f",
                draft: { body: {}, record: {} },
            },
        }, { save })).resolves.toEqual({ uid: "u-1", draftId: "draft-1" });
        expect(save).toHaveBeenCalledTimes(1);
        await expect((0, admin_content_studio_authoring_1.handleAdminSaveV2Draft)({
            auth: { uid: "u-1", token: { admin: true, adminRole: "support" } },
            data: {},
        }, { save })).rejects.toThrow(https_1.HttpsError);
        expect(save).toHaveBeenCalledTimes(1);
    });
    it("covers create, CAS update, and replay rejection at the callable boundary", async () => {
        let revision = 0;
        let fingerprint = "";
        const save = jest.fn(async (_writer, request) => {
            if (request.expectedRevision !== revision ||
                request.expectedFingerprint !== fingerprint)
                throw new Error("authoring_revision_stale");
            revision += 1;
            fingerprint = `r${revision}`;
            return { revision, fingerprint };
        });
        const auth = {
            uid: "u-1",
            token: { admin: true, adminRole: "content_editor" },
        };
        const draft = { body: {}, record: {} };
        await expect((0, admin_content_studio_authoring_1.handleAdminSaveV2Draft)({
            auth,
            data: {
                draftId: "d-1",
                expectedRevision: 0,
                expectedFingerprint: "",
                draft,
            },
        }, { save })).resolves.toMatchObject({ revision: 1 });
        await expect((0, admin_content_studio_authoring_1.handleAdminSaveV2Draft)({
            auth,
            data: {
                draftId: "d-1",
                expectedRevision: 1,
                expectedFingerprint: "r1",
                draft,
            },
        }, { save })).resolves.toMatchObject({ revision: 2 });
        await expect((0, admin_content_studio_authoring_1.handleAdminSaveV2Draft)({
            auth,
            data: {
                draftId: "d-1",
                expectedRevision: 1,
                expectedFingerprint: "r1",
                draft,
            },
        }, { save })).rejects.toThrow("authoring_revision_stale");
        expect(save).toHaveBeenCalledTimes(3);
    });
    it("parses strict ModeTemplate publish/deprecate envelopes and publisher permission", () => {
        const base = {
            templateRef: { templateId: "template-1", version: 1, contentHash: "a".repeat(64) },
            expectedLifecycleRevision: 1,
            idempotencyKey: "op-1",
            reason: "publish after review",
        };
        expect((0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)({
            ...base,
            receiptIds: {
                validationReceiptId: "v",
                localizationReceiptId: "l",
                reviewReceiptId: "r",
                gateReceiptId: "g",
            },
        })).toMatchObject({ expectedLifecycleRevision: 1 });
        expect((0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)({ ...base, noReplacement: true })).toMatchObject({ noReplacement: true });
        expect(() => (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)({ ...base, noReplacement: false })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)({ ...base, unexpected: true })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_studio_authoring_1.parseV2ModeTemplateLifecycleRequest)({
            ...base,
            replacementRef: { templateId: "template-2", version: 1, contentHash: "b".repeat(64) },
            noReplacement: true,
        })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.requireContentPublisher)({ uid: "u-1", token: { admin: true, adminRole: "owner" } })).toMatchObject({ uid: "u-1", role: "owner" });
        expect(() => (0, admin_content_studio_authoring_1.requireContentPublisher)({ uid: "u-1", token: { admin: true, adminRole: "content_editor" } })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.requireContentReviewer)({ uid: "u-2", token: { admin: true, adminRole: "content_reviewer" } })).toMatchObject({ uid: "u-2", role: "content_reviewer" });
        expect(() => (0, admin_content_studio_authoring_1.requireContentReviewer)({ uid: "u-1", token: { admin: true, adminRole: "content_editor" } })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.parseV2ApprovedEpisodeRevisionRef)({ revisionRef: {
                draftId: "draft-1", episodeId: "episode-1", revision: 1,
                revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64),
                ordinal: 1, chapterId: "chapter-1",
            } })).toMatchObject({ episodeId: "episode-1" });
        expect(() => (0, admin_content_studio_authoring_1.parseV2ApprovedEpisodeRevisionRef)({ revisionRef: {
                draftId: "bad/id", episodeId: "episode-1", revision: 1,
                revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64),
                ordinal: 1, chapterId: "chapter-1",
            } })).toThrow(https_1.HttpsError);
        expect((0, admin_content_studio_authoring_1.parseV2EpisodeReviewRequest)({
            revisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1" },
            status: "approved", idempotencyKey: "review-1", reason: "semantic review",
        })).toMatchObject({ status: "approved" });
        expect((0, admin_content_studio_authoring_1.parseV2ContentGateRequest)({
            subject: { entityType: "episode", entityId: "episode-1", entityRevision: 1, entityFingerprint: "a".repeat(64) },
            receiptIds: { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r" },
            idempotencyKey: "gate-1", reason: "approve",
        })).toMatchObject({ subject: { entityType: "episode" } });
        expect((0, admin_content_studio_authoring_1.parseV2EpisodeValidationRequest)({
            revisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1" },
            idempotencyKey: "validation-1", reason: "validate",
        })).toMatchObject({ idempotencyKey: "validation-1" });
        expect((0, admin_content_studio_authoring_1.parseV2EpisodeLifecycleRequest)({
            revisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1" },
            expectedLifecycleRevision: 1, idempotencyKey: "approve-1", reason: "approve",
            receiptIds: { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" },
        })).toMatchObject({ expectedLifecycleRevision: 1 });
        expect(() => (0, admin_content_studio_authoring_1.parseV2EpisodeReviewRequest)({
            revisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1" },
            status: "approved", idempotencyKey: "review-2", reason: "review", unexpected: true,
        })).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_content_studio_authoring.test.js.map