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
        expect((0, admin_content_studio_authoring_1.requireContentDraftWriter)({
            uid: "u-1",
            token: { admin: true, adminRole: "content_editor" },
        })).toMatchObject({ uid: "u-1", role: "content_editor" });
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
});
//# sourceMappingURL=admin_content_studio_authoring.test.js.map