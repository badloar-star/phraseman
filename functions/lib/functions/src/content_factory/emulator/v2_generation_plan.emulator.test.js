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
const decision_registry_1 = require("../../../../modules/learning-v2/policies/decision_registry");
const firestore_authoring_store_1 = require("../../content_studio/firestore_authoring_store");
const admin_v2_generation_1 = require("../../admin_v2_generation");
const PROJECT_ID = "demo-phraseman-generation";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const FIXTURE_PATH = node_path_1.default.resolve(__dirname, "../../../../tests/fixtures/learning-v2/episode-01.valid.json");
const JOBS = "content_v2_generation_jobs";
const STAGES = "content_v2_generation_stages";
const LOCALIZATIONS = "content_v2_generation_localizations";
const OPERATIONS = "content_v2_generation_operations";
describe("V2 generation plan callable on Firestore/Storage emulators", () => {
    let environment;
    let app;
    const fixture = JSON.parse((0, node_fs_1.readFileSync)(FIXTURE_PATH, "utf8"));
    const template = fixture.dependencies.templates[0];
    const auth = { uid: "generation-editor", token: { admin: true, adminRole: "content_editor" } };
    const request = (idempotencyKey) => ({
        schemaVersion: "v2-admin-generation-request.v1",
        seasonId: "season-emulator",
        scope: "vertical_slice",
        episodeIds: ["episode-01"],
        recipes: [{ episodeId: "episode-01", dialogue: true, speakingClub: true }],
        studyTarget: "en",
        sourceLocale: "ru",
        targetLocales: ["en"],
        templateBindings: [{ episodeId: "episode-01", templateRefs: [template.templateRef] }],
        idempotencyKey,
    });
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
            throw new Error("Firestore and Storage emulators are required");
        app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") },
        });
        const serialized = (0, decision_registry_1.canonicalJsonV1)(template.body);
        expect((0, decision_registry_1.hashCanonicalBody)(template.body)).toBe(template.templateRef.contentHash);
        const objectPath = `content-studio/mode-templates/${(0, decision_registry_1.sha256Utf8)(template.templateRef.templateId)}/v${template.templateRef.version}/${template.templateRef.contentHash}.json`;
        const file = app.storage().bucket().file(objectPath);
        await file.save(Buffer.from(serialized, "utf8"), { resumable: false, metadata: { metadata: { contentHash: template.templateRef.contentHash } } });
        const [metadata] = await file.getMetadata();
        const now = "2026-07-17T00:00:00.000Z";
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, (0, firestore_authoring_store_1.modeTemplateVersionDocumentPath)(template.templateRef.templateId, template.templateRef.version)), {
                schemaVersion: "v2-mode-template-record.v1",
                templateId: template.templateRef.templateId,
                version: template.templateRef.version,
                contentHash: template.templateRef.contentHash,
                object: {
                    objectPath,
                    contentHash: template.templateRef.contentHash,
                    objectGeneration: String(metadata.generation ?? ""),
                    byteSize: Buffer.byteLength(serialized, "utf8"),
                },
                provenance: { createdBy: "fixture", createdAt: now },
                createdAt: now,
            });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, (0, firestore_authoring_store_1.modeTemplateLifecycleDocumentPath)(template.templateRef.templateId, template.templateRef.version)), {
                schemaVersion: "v2-mode-template-lifecycle.v1",
                templateId: template.templateRef.templateId,
                version: template.templateRef.version,
                contentHash: template.templateRef.contentHash,
                status: "published",
                reason: "emulator fixture",
                changedBy: "fixture",
                changedAt: now,
                lifecycleRevision: 1,
            });
        });
    });
    afterAll(async () => {
        await environment?.cleanup();
        await app?.delete();
    });
    it("denies direct draft writes and rejects missing or stale template pins", async () => {
        await expect((0, firestore_1.setDoc)((0, firestore_1.doc)(environment.authenticatedContext("client-1").firestore(), `${JOBS}/forged-job`), { state: "queued" })).rejects.toBeDefined();
        await expect(admin_v2_generation_1.adminCreateV2GenerationPlan.run({ data: request("missing-pin"), auth: undefined })).rejects.toThrow("Admin only");
        await expect(admin_v2_generation_1.adminCreateV2GenerationPlan.run({ data: { ...request("missing-pin"), templateBindings: [{ episodeId: "episode-01", templateRefs: [{ ...template.templateRef, contentHash: "f".repeat(64) }] }] }, auth })).rejects.toThrow("v2_generation_template_pin_stale");
        await app.firestore().doc((0, firestore_authoring_store_1.modeTemplateLifecycleDocumentPath)(template.templateRef.templateId, template.templateRef.version)).set({
            schemaVersion: "v2-mode-template-lifecycle.v1",
            templateId: template.templateRef.templateId,
            version: template.templateRef.version,
            contentHash: template.templateRef.contentHash,
            status: "archived",
            reason: "retired",
            changedBy: "fixture",
            changedAt: "2026-07-17T00:00:01.000Z",
            lifecycleRevision: 2,
        });
        await expect(admin_v2_generation_1.adminCreateV2GenerationPlan.run({ data: request("stale-pin"), auth })).rejects.toThrow("v2_generation_template_pin_stale");
        await app.firestore().doc((0, firestore_authoring_store_1.modeTemplateLifecycleDocumentPath)(template.templateRef.templateId, template.templateRef.version)).set({
            schemaVersion: "v2-mode-template-lifecycle.v1",
            templateId: template.templateRef.templateId,
            version: template.templateRef.version,
            contentHash: template.templateRef.contentHash,
            status: "published",
            reason: "restored",
            changedBy: "fixture",
            changedAt: "2026-07-17T00:00:02.000Z",
            lifecycleRevision: 3,
        });
    });
    it("queues one immutable plan, appends audit, and replays idempotently", async () => {
        const resolved = await (0, firestore_authoring_store_1.createFirestoreModeTemplateResolver)(app.firestore())(template.templateRef);
        expect(resolved).toBeDefined();
        const first = await admin_v2_generation_1.adminCreateV2GenerationPlan.run({ data: request("queue-1"), auth });
        expect(first).toMatchObject({ ok: true, jobId: "queue-1", state: "queued", replayed: false });
        const db = app.firestore();
        const job = await db.doc(`${JOBS}/queue-1`).get();
        expect(job.exists).toBe(true);
        expect(job.data()?.plan.stages).toHaveLength(13);
        expect(job.data()?.plan.localizationTasks).toHaveLength(1);
        const [stages, localizations, operations, audit] = await Promise.all([
            db.collection(STAGES).where("jobId", "==", "queue-1").get(),
            db.collection(LOCALIZATIONS).where("jobId", "==", "queue-1").get(),
            db.collection(OPERATIONS).where("jobId", "==", "queue-1").get(),
            db.collection("admin_log").where("operationId", "==", "queue-1").get(),
        ]);
        expect(stages.size).toBe(13);
        expect(stages.docs.find((item) => item.id === "v2_season_outline:season-emulator")?.data()).toMatchObject({ state: "queued", attempts: 0, maxAttempts: 3 });
        expect(new Set(stages.docs.map((item) => item.id)).size).toBe(13);
        expect(localizations.size).toBe(1);
        expect(operations.size).toBe(1);
        expect(audit.size).toBe(1);
        await expect(admin_v2_generation_1.adminCreateV2GenerationPlan.run({ data: request("queue-1"), auth })).resolves.toMatchObject({ ok: true, replayed: true, jobId: "queue-1" });
        const [jobsAfter, stagesAfter, operationsAfter, auditAfter] = await Promise.all([
            db.collection(JOBS).where("jobId", "==", "queue-1").get(),
            db.collection(STAGES).where("jobId", "==", "queue-1").get(),
            db.collection(OPERATIONS).where("jobId", "==", "queue-1").get(),
            db.collection("admin_log").where("operationId", "==", "queue-1").get(),
        ]);
        expect(jobsAfter.size).toBe(1);
        expect(stagesAfter.size).toBe(13);
        expect(operationsAfter.size).toBe(1);
        expect(auditAfter.size).toBe(1);
        await expect((0, firestore_1.getDoc)((0, firestore_1.doc)(environment.authenticatedContext("client-1").firestore(), `${JOBS}/queue-1`))).rejects.toBeDefined();
    });
});
//# sourceMappingURL=v2_generation_plan.emulator.test.js.map