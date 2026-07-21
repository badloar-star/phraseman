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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const admin = __importStar(require("firebase-admin"));
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const firestore_1 = require("firebase/firestore");
const content_gate_repository_1 = require("../content_gate_repository");
const firestore_authoring_store_1 = require("../firestore_authoring_store");
const decision_registry_1 = require("../../../../modules/learning-v2/policies/decision_registry");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
describe("ContentGate immutable Storage emulator", () => {
    let environment;
    let app;
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
            throw new Error("Firestore and Storage emulators are required");
        app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` }, `gate-${Date.now()}`);
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } });
    });
    afterAll(async () => { await environment?.cleanup(); await app?.delete(); });
    it("writes canonical gate bytes, persists record metadata, and rejects tampered bytes on read-back", async () => {
        const subject = { entityType: "episode", entityId: "gate-episode", entityRevision: 1, entityFingerprint: "a".repeat(64) };
        await environment.withSecurityRulesDisabled(async (context) => {
            for (const [collection, hash, status] of [["content_studio_validation_receipts", "b".repeat(64), "passed"], ["content_studio_localization_receipts", "c".repeat(64), "approved"], ["content_studio_review_receipts", "d".repeat(64), "approved"]]) {
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(context.firestore(), collection, `${collection}-1`), { receiptHash: hash, subject, status, ...(collection.includes("review") ? { reviewerId: "reviewer-1" } : {}) });
            }
        });
        const repository = new content_gate_repository_1.ContentGateReceiptRepository((0, firestore_authoring_store_1.createFirestoreContentGateIssueStore)(app.firestore(), {
            write: async (path, gateBody) => {
                const bytes = Buffer.from((0, decision_registry_1.canonicalJsonV1)(gateBody), "utf8");
                const file = app.storage().bucket().file(path);
                await file.save(bytes, { resumable: false });
                const [metadata] = await file.getMetadata();
                return { objectGeneration: String(metadata.generation ?? ""), byteSize: bytes.byteLength, contentHash: (0, decision_registry_1.hashCanonicalBody)(gateBody) };
            },
        }), { actorId: "publisher-1" });
        const body = await repository.issue(subject, { validationReceiptId: "content_studio_validation_receipts-1", localizationReceiptId: "content_studio_localization_receipts-1", reviewReceiptId: "content_studio_review_receipts-1" }, "approve", "gate-emulator-1");
        const gateId = `${subject.entityType}__${subject.entityId}__r${subject.entityRevision}__${subject.entityFingerprint}`;
        const gateSnapshot = await app.firestore().doc(`content_studio_gate_receipts/${gateId}`).get();
        const envelope = gateSnapshot.data();
        expect(envelope.record.receiptHash).toBe((0, decision_registry_1.hashCanonicalBody)(body));
        const file = app.storage().bucket().file(envelope.record.object.objectPath);
        const [bytes] = await file.download();
        expect((0, decision_registry_1.hashCanonicalBody)(JSON.parse(bytes.toString("utf8")))).toBe(envelope.record.object.contentHash);
        await file.save(Buffer.from((0, decision_registry_1.canonicalJsonV1)({ tampered: true }), "utf8"), { resumable: false });
        const [tampered] = await file.download();
        expect((0, decision_registry_1.hashCanonicalBody)(JSON.parse(tampered.toString("utf8")))).not.toBe(envelope.record.object.contentHash);
    });
});
//# sourceMappingURL=v2_content_gate_storage.emulator.test.js.map