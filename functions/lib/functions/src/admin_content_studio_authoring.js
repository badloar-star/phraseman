"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseV2AuthoringRequest = parseV2AuthoringRequest;
exports.requireContentDraftWriter = requireContentDraftWriter;
exports.handleAdminSaveV2Draft = handleAdminSaveV2Draft;
exports.createAdminSaveV2DraftCallable = createAdminSaveV2DraftCallable;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const roles_1 = require("./admin/roles");
const permissions_1 = require("./admin/permissions");
const callable_options_1 = require("./callable_options");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function parseV2AuthoringRequest(data) {
    if (!isRecord(data))
        throw new https_1.HttpsError("invalid-argument", "invalid V2 authoring mutation envelope");
    const expectedRevision = data.expectedRevision;
    if (typeof data.draftId !== "string" ||
        !/^[A-Za-z0-9._-]{1,160}$/.test(data.draftId) ||
        typeof expectedRevision !== "number" ||
        !Number.isInteger(expectedRevision) ||
        expectedRevision < 1 ||
        typeof data.expectedFingerprint !== "string" ||
        !data.expectedFingerprint ||
        !isRecord(data.draft) ||
        !isRecord(data.draft.body) ||
        !isRecord(data.draft.record))
        throw new https_1.HttpsError("invalid-argument", "invalid V2 authoring mutation envelope");
    return Object.freeze({
        draftId: data.draftId,
        expectedRevision: expectedRevision,
        expectedFingerprint: data.expectedFingerprint,
        draft: Object.freeze({ body: data.draft.body, record: data.draft.record }),
    });
}
function requireContentDraftWriter(auth) {
    if (!auth?.uid || !auth.token?.admin || !(0, roles_1.hasAdminRole)(auth.token.adminRole))
        throw new https_1.HttpsError("permission-denied", "Admin only");
    const role = auth.token.adminRole;
    if (!(0, permissions_1.hasPermission)(role, "content.draft.write"))
        throw new https_1.HttpsError("permission-denied", "Role cannot edit V2 drafts");
    return Object.freeze({ uid: auth.uid, role });
}
async function handleAdminSaveV2Draft(request, dependencies) {
    const writer = requireContentDraftWriter(request.auth);
    const mutation = parseV2AuthoringRequest(request.data);
    return dependencies.save(writer, mutation);
}
function createAdminSaveV2DraftCallable(dependencies) {
    return (0, https_2.onCall)({ region: "us-central1", enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => handleAdminSaveV2Draft(request, dependencies));
}
//# sourceMappingURL=admin_content_studio_authoring.js.map