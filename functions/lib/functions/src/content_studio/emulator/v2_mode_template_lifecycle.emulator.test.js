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
const admin_content_studio_callables_1 = require("../../admin_content_studio_callables");
const decision_registry_1 = require("../../../../modules/learning-v2/policies/decision_registry");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const hash = "a".repeat(64);
const subject = { entityType: "mode_template", entityId: "template-emulator", entityRevision: 1, entityFingerprint: hash };
const versionPath = "content_mode_template_versions/template-emulator__v1";
const lifecyclePath = "content_mode_template_lifecycle/template-emulator__v1";
const receiptDocs = {
    "content_studio_validation_receipts/validation-1": { receiptHash: "b".repeat(64), subject, status: "passed" },
    "content_studio_localization_receipts/localization-1": { receiptHash: "c".repeat(64), subject, status: "approved" },
    "content_studio_review_receipts/review-1": { receiptHash: "d".repeat(64), subject, status: "approved" },
    "content_studio_gate_receipts/gate-1": {
        schemaVersion: "content-gate-receipt-body.v1", gateKind: "approval", subject,
        validationReceiptHash: "b".repeat(64), localizationReceiptSetHash: "c".repeat(64), reviewReceiptHash: "d".repeat(64), waiverSetHash: "e".repeat(64), evaluatedBy: "publisher-1", evaluatedAt: "2026-07-16T00:00:00.000Z",
    },
};
describe("ModeTemplate lifecycle callables on Firestore emulator", () => {
    let environment;
    let app;
    const auth = { uid: "publisher-1", token: { admin: true, adminRole: "owner" } };
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST)
            throw new Error("Firestore emulator is required");
        app = admin.initializeApp({ projectId: PROJECT_ID });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } });
    });
    afterAll(async () => { await environment?.cleanup(); await app?.delete(); });
    it("publishes once, appends audit, and rejects stale replay", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, versionPath), { schemaVersion: "v2-mode-template-record.v1", templateId: "template-emulator", version: 1, contentHash: hash, object: { objectPath: "content-studio/mode-templates/x/v1/x.json", contentHash: hash, objectGeneration: "g-1", byteSize: 1 }, provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" }, createdAt: "2026-07-16T00:00:00.000Z" });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "approved", reason: "reviewed", changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
            for (const [key, value] of Object.entries(receiptDocs))
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, key), value);
        });
        const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 1, idempotencyKey: "op-publish-1", reason: "publish", receiptIds: { validationReceiptId: "validation-1", localizationReceiptId: "localization-1", reviewReceiptId: "review-1", gateReceiptId: "gate-1" } };
        const result = await admin_content_studio_callables_1.adminPublishV2ModeTemplate.run({ data, auth });
        expect(result.ok).toBe(true);
        const snapshot = await admin.firestore().doc(lifecyclePath).get();
        expect(snapshot.data()?.status).toBe("published");
        expect((await admin.firestore().doc("content_mode_template_lifecycle_audit/template-emulator__v1__r2").get()).exists).toBe(true);
        await expect(admin_content_studio_callables_1.adminPublishV2ModeTemplate.run({ data, auth })).resolves.toMatchObject({ ok: true, lifecycle: { lifecycleRevision: 2 } });
        await expect(admin_content_studio_callables_1.adminPublishV2ModeTemplate.run({ data: { ...data, reason: "changed" }, auth })).rejects.toThrow();
    });
    it("deprecates with a resolved published replacement and writes audit", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "published", reason: "publish", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 2 });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "content_mode_template_versions/template-emulator-2__v1"), { schemaVersion: "v2-mode-template-record.v1", templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64), object: { objectPath: `content-studio/mode-templates/${(0, decision_registry_1.sha256Utf8)("template-emulator-2")}/v1/${"b".repeat(64)}.json`, contentHash: "b".repeat(64), objectGeneration: "g-2", byteSize: 1 }, provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" }, createdAt: "2026-07-16T00:00:00.000Z" });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "content_mode_template_lifecycle/template-emulator-2__v1"), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64), status: "published", reason: "replacement-ready", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
        });
        const result = await admin_content_studio_callables_1.adminDeprecateV2ModeTemplate.run({ data: { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 2, idempotencyKey: "op-deprecate-1", reason: "replaced", replacementRef: { templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64) } }, auth });
        expect(result.ok).toBe(true);
        expect((await admin.firestore().doc(lifecyclePath).get()).data()?.status).toBe("deprecated");
    });
    it("fails closed when an existing idempotency operation is malformed", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "approved", reason: "re-reviewed", changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 10 });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "content_mode_template_lifecycle_operations/malformed-op"), { requestFingerprint: "not-a-complete-operation" });
        });
        const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 10, idempotencyKey: "malformed-op", reason: "publish-again", receiptIds: { validationReceiptId: "validation-1", localizationReceiptId: "localization-1", reviewReceiptId: "review-1", gateReceiptId: "gate-1" } };
        await expect(admin_content_studio_callables_1.adminPublishV2ModeTemplate.run({ data, auth })).rejects.toThrow("mode_template_idempotency_operation_invalid");
    });
    it("blocks archive for an open Episode draft, then archives and replays after closure", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "deprecated", reason: "retired", noReplacement: true, changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 20 });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "content_episode_drafts/open-draft"), {
                body: { activities: [{ activityId: "a-1", templateRef: { templateId: "template-emulator", version: 1, contentHash: hash } }] },
                record: { status: "draft" },
            });
        });
        const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 20, idempotencyKey: "op-archive-open", reason: "archive" };
        await expect(admin_content_studio_callables_1.adminArchiveV2ModeTemplate.run({ data, auth })).rejects.toThrow("mode_template_archive_open_episode_draft");
        await environment.withSecurityRulesDisabled(async (context) => {
            await (0, firestore_1.deleteDoc)((0, firestore_1.doc)(context.firestore(), "content_episode_drafts/open-draft"));
        });
        const closedData = { ...data, idempotencyKey: "op-archive-closed" };
        await expect(admin_content_studio_callables_1.adminArchiveV2ModeTemplate.run({ data: closedData, auth })).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived" } });
        await expect(admin_content_studio_callables_1.adminArchiveV2ModeTemplate.run({ data: closedData, auth })).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived" } });
    });
});
//# sourceMappingURL=v2_mode_template_lifecycle.emulator.test.js.map