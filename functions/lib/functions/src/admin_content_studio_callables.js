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
exports.adminSaveV2SeasonDraft = exports.adminSaveV2EpisodeDraft = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const admin_content_studio_authoring_1 = require("./admin_content_studio_authoring");
const authoring_transaction_repository_1 = require("./content_studio/authoring_transaction_repository");
const season_authoring_transaction_repository_1 = require("./content_studio/season_authoring_transaction_repository");
const firestore_authoring_store_1 = require("./content_studio/firestore_authoring_store");
const callableOptions = {
    region: "us-central1",
    enforceAppCheck: true,
};
const asHttpsError = (error) => error instanceof https_1.HttpsError
    ? error
    : new https_1.HttpsError("failed-precondition", error instanceof Error
        ? error.message
        : "V2 authoring mutation rejected");
exports.adminSaveV2EpisodeDraft = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const writer = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
        const mutation = (0, admin_content_studio_authoring_1.parseV2AuthoringRequest)(request.data);
        const repository = new authoring_transaction_repository_1.FirestoreEpisodeDraftRepository((0, firestore_authoring_store_1.createFirestoreEpisodeDraftStore)(admin.firestore()), { ownerId: writer.uid });
        const saved = await repository.save(mutation.draftId, mutation.draft, {
            expectedRevision: mutation.expectedRevision,
            expectedFingerprint: mutation.expectedFingerprint,
        });
        return { ok: true, draft: saved };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
exports.adminSaveV2SeasonDraft = (0, https_1.onCall)(callableOptions, async (request) => {
    try {
        const writer = (0, admin_content_studio_authoring_1.requireContentDraftWriter)(request.auth);
        const mutation = (0, admin_content_studio_authoring_1.parseV2AuthoringRequest)(request.data);
        const db = admin.firestore();
        const repository = new season_authoring_transaction_repository_1.FirestoreSeasonDraftRepository((0, firestore_authoring_store_1.createFirestoreSeasonDraftStore)(db), { ownerId: writer.uid }, (0, firestore_authoring_store_1.createFirestoreEpisodeRevisionResolver)(db), (0, firestore_authoring_store_1.createFirestoreDecisionRegistryResolver)(db));
        const saved = await repository.save(mutation.draftId, mutation.draft, {
            expectedRevision: mutation.expectedRevision,
            expectedFingerprint: mutation.expectedFingerprint,
        });
        return { ok: true, draft: saved };
    }
    catch (error) {
        throw asHttpsError(error);
    }
});
//# sourceMappingURL=admin_content_studio_callables.js.map