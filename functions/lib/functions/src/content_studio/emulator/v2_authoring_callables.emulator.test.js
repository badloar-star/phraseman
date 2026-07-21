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
const episode_draft_1 = require("../../../../modules/learning-v2/authoring/episode_draft");
const admin_content_studio_callables_1 = require("../../admin_content_studio_callables");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const validFirstDraft = () => {
    const base = (0, episode_draft_1.createEpisodeDraft)({
        draftId: "callable-draft-1",
        episodeId: "callable-episode-1",
        seasonId: "callable-season-1",
        ordinal: 1,
        chapterId: "callable-chapter-1",
    });
    return {
        ...base,
        body: {
            ...base.body,
            activities: [{ activityId: "activity-1" }],
            graph: {
                ...base.body.graph,
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
        },
    };
};
describe("V2 authoring exported callable lifecycle", () => {
    let environment;
    beforeAll(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST)
            throw new Error("FIRESTORE_EMULATOR_HOST is required; run through firebase emulators:exec");
        if (!admin.apps.length)
            admin.initializeApp({ projectId: PROJECT_ID });
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") },
        });
    });
    afterAll(async () => {
        await environment?.cleanup();
        await Promise.all(admin.apps.filter(Boolean).map((app) => app.delete()));
    });
    it("creates, updates with the returned CAS head, and rejects a replay", async () => {
        const draft = validFirstDraft();
        const auth = {
            uid: "admin-callable-1",
            token: { admin: true, adminRole: "content_editor" },
        };
        const call = (data) => admin_content_studio_callables_1.adminSaveV2EpisodeDraft.run({
            data,
            auth,
            app: { appId: "emulator-app" },
        });
        const first = await call({
            draftId: draft.body.draftId,
            expectedRevision: 0,
            expectedFingerprint: "",
            draft,
        });
        expect(first.ok).toBe(true);
        expect(first.draft.record.revision).toBe(1);
        let snapshot;
        await environment.withSecurityRulesDisabled(async (context) => {
            snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)(context.firestore(), "content_episode_drafts", draft.body.draftId));
        });
        if (!snapshot)
            throw new Error("missing emulator snapshot");
        expect(snapshot.exists()).toBe(true);
        expect(snapshot.data()?.ownerId).toBe(auth.uid);
        const second = await call({
            draftId: draft.body.draftId,
            expectedRevision: first.draft.record.revision,
            expectedFingerprint: first.draft.record.fingerprint,
            draft: first.draft,
        });
        expect(second.draft.record.revision).toBe(2);
        await expect(call({
            draftId: draft.body.draftId,
            expectedRevision: first.draft.record.revision,
            expectedFingerprint: first.draft.record.fingerprint,
            draft: first.draft,
        })).rejects.toThrow("authoring_revision_stale");
    });
    it("keeps direct client Firestore reads denied for the callable-owned document", async () => {
        await expect((0, firestore_1.getDoc)((0, firestore_1.doc)(environment.authenticatedContext("admin-callable-1").firestore(), "content_episode_drafts/callable-draft-1"))).rejects.toBeDefined();
    });
    it("rejects missing auth and non-editor roles before touching Firestore", async () => {
        const draft = validFirstDraft();
        const data = {
            draftId: draft.body.draftId,
            expectedRevision: 0,
            expectedFingerprint: "",
            draft,
        };
        await expect(admin_content_studio_callables_1.adminSaveV2EpisodeDraft.run({ data })).rejects.toThrow("Admin only");
        await expect(admin_content_studio_callables_1.adminSaveV2EpisodeDraft.run({
            data,
            auth: {
                uid: "support-user",
                token: { admin: true, adminRole: "support" },
            },
        })).rejects.toThrow("Role cannot edit V2 drafts");
    });
});
//# sourceMappingURL=v2_authoring_callables.emulator.test.js.map