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
exports.decisionRegistryDocumentPath = exports.episodeRevisionDocumentPath = exports.seasonDraftDocumentPath = exports.episodeDraftDocumentPath = void 0;
exports.createFirestoreEpisodeDraftStore = createFirestoreEpisodeDraftStore;
exports.createFirestoreSeasonDraftStore = createFirestoreSeasonDraftStore;
exports.createFirestoreEpisodeRevisionResolver = createFirestoreEpisodeRevisionResolver;
exports.createFirestoreDecisionRegistryResolver = createFirestoreDecisionRegistryResolver;
const admin = __importStar(require("firebase-admin"));
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const episodeDraftDocumentPath = (draftId) => `content_episode_drafts/${draftId}`;
exports.episodeDraftDocumentPath = episodeDraftDocumentPath;
const seasonDraftDocumentPath = (draftId) => `content_season_drafts/${draftId}`;
exports.seasonDraftDocumentPath = seasonDraftDocumentPath;
const episodeRevisionDocumentPath = (episodeId, revision) => `content_episode_revisions/${episodeId}__r${revision}`;
exports.episodeRevisionDocumentPath = episodeRevisionDocumentPath;
const decisionRegistryDocumentPath = (id, version) => `content_decision_registries/${id}__v${version}`;
exports.decisionRegistryDocumentPath = decisionRegistryDocumentPath;
function createFirestoreEpisodeDraftStore(db) {
    return {
        runTransaction: (work) => db.runTransaction(async (transaction) => work(createEpisodeTransactionStore(db, transaction))),
        read: async (id) => {
            const snap = await db.doc((0, exports.episodeDraftDocumentPath)(id)).get();
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async () => {
            throw new Error("authoring_transaction_required");
        },
    };
}
function createEpisodeTransactionStore(db, transaction) {
    return {
        runTransaction: async (work) => work(createEpisodeTransactionStore(db, transaction)),
        read: async (id) => {
            const snap = await transaction.get(db.doc((0, exports.episodeDraftDocumentPath)(id)));
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
            const ref = db.doc((0, exports.episodeDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            const current = snap.data();
            if (!current?.draft ||
                current.draft.record.revision !== expectedRevision ||
                current.draft.record.fingerprint !== expectedFingerprint)
                throw new Error("authoring_revision_stale");
            transaction.set(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
    };
}
function createFirestoreSeasonDraftStore(db) {
    return {
        runTransaction: (work) => db.runTransaction(async (transaction) => work(createSeasonTransactionStore(db, transaction))),
        read: async (id) => {
            const snap = await db.doc((0, exports.seasonDraftDocumentPath)(id)).get();
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async () => {
            throw new Error("authoring_transaction_required");
        },
    };
}
function createSeasonTransactionStore(db, transaction) {
    return {
        runTransaction: async (work) => work(createSeasonTransactionStore(db, transaction)),
        read: async (id) => {
            const snap = await transaction.get(db.doc((0, exports.seasonDraftDocumentPath)(id)));
            return snap.exists
                ? snap.data()
                : undefined;
        },
        compareAndSet: async (id, expectedRevision, expectedFingerprint, value) => {
            const ref = db.doc((0, exports.seasonDraftDocumentPath)(id));
            const snap = await transaction.get(ref);
            const current = snap.data();
            if (!current?.draft ||
                current.draft.record.revision !== expectedRevision ||
                current.draft.record.fingerprint !== expectedFingerprint)
                throw new Error("authoring_revision_stale");
            transaction.set(ref, {
                ...value,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        },
    };
}
function createFirestoreEpisodeRevisionResolver(db) {
    return {
        validateBody: (body) => (0, validation_1.validateV2EpisodeContract)(body).ok,
        resolve: async (ref) => {
            const snap = await db
                .doc((0, exports.episodeRevisionDocumentPath)(ref.episodeId, ref.revision))
                .get();
            return snap.exists
                ? snap.data()
                : undefined;
        },
    };
}
function createFirestoreDecisionRegistryResolver(db) {
    return {
        resolve: async (ref) => {
            const snap = await db
                .doc((0, exports.decisionRegistryDocumentPath)(ref.id, ref.version))
                .get();
            return snap.exists ? snap.data() : undefined;
        },
    };
}
//# sourceMappingURL=firestore_authoring_store.js.map