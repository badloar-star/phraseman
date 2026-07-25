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
const admin = __importStar(require("firebase-admin"));
const admin_content_stage_bulk_1 = require("../../admin_content_stage_bulk");
const bulk_stage_plan_1 = require("../bulk_stage_plan");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `content-factory-bulk-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
jest.setTimeout(30000);
describe('atomic idempotent bulk plans', () => {
    test('concurrent identical calls create one plan, one stage set and one audit per stage', async () => {
        const requestId = `bulk-race-${process.pid}`;
        const input = (0, bulk_stage_plan_1.parseBulkStagePlanRequest)({ requestId, idempotencyKey: 'same-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Race test', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 3 }, dependencyPolicy: 'approved_only' });
        const results = await Promise.all([(0, admin_content_stage_bulk_1.createContentStageBulkPlan)(db, input, 'editor-1', 'content_editor'), (0, admin_content_stage_bulk_1.createContentStageBulkPlan)(db, input, 'editor-1', 'content_editor')]);
        expect(results.filter((result) => result.replayed)).toHaveLength(1);
        expect((await db.collection('content_factory_bulk_plans').where('requestId', '==', requestId).get()).size).toBe(1);
        expect((await db.collection('content_factory_stages').where('requestId', '==', requestId).get()).size).toBe(3);
        const audits = await db.collection('admin_log').where('action', '==', 'content_factory.stage.bulk_create').get();
        expect(audits.docs.filter((doc) => String(doc.data().entity?.id ?? '').startsWith(`${requestId}:`))).toHaveLength(3);
    });
    test('conflicting replay and existing-stage conflict leave no partial plan', async () => {
        const requestId = `bulk-conflict-${process.pid}`;
        const original = (0, bulk_stage_plan_1.parseBulkStagePlanRequest)({ requestId, idempotencyKey: 'fixed-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Original', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 1 }, dependencyPolicy: 'approved_only' });
        await (0, admin_content_stage_bulk_1.createContentStageBulkPlan)(db, original, 'editor-1', 'content_editor');
        const changed = (0, bulk_stage_plan_1.parseBulkStagePlanRequest)({ ...original, objective: 'Changed objective', lessonRange: undefined, scopes: ['lesson-1'] });
        await expect((0, admin_content_stage_bulk_1.createContentStageBulkPlan)(db, changed, 'editor-1', 'content_editor')).rejects.toMatchObject({ message: 'bulk_stage_idempotency_conflict' });
        const secondRequest = `bulk-atomic-${process.pid}`;
        const stageId = `${secondRequest}:lesson_outline:lesson-1:r1`;
        await db.collection('content_factory_stages').doc(stageId).set({ requestId: 'other', kind: 'lesson_outline' });
        const atomic = (0, bulk_stage_plan_1.parseBulkStagePlanRequest)({ requestId: secondRequest, idempotencyKey: 'atomic-key', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Atomic', kinds: ['lesson_outline'], lessonRange: { start: 1, end: 2 }, dependencyPolicy: 'approved_only' });
        await expect((0, admin_content_stage_bulk_1.createContentStageBulkPlan)(db, atomic, 'editor-1', 'content_editor')).rejects.toMatchObject({ message: 'bulk_stage_existing_stage_conflict' });
        expect((await db.collection('content_factory_bulk_plans').doc(`bulk:${secondRequest}:atomic-key`).get()).exists).toBe(false);
        expect((await db.collection('content_factory_stages').doc(`${secondRequest}:lesson_outline:lesson-2:r1`).get()).exists).toBe(false);
    });
});
afterAll(async () => { await db.terminate(); await app.delete(); });
//# sourceMappingURL=bulk_stage_plan.emulator.test.js.map