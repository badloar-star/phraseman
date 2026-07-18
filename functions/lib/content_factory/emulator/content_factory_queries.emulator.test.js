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
const admin_content_stages_1 = require("../../admin_content_stages");
const dependency_catalog_1 = require("../dependency_catalog");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `content-factory-queries-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
test('cursor pages have no gaps or duplicates and filters run before limit', async () => {
    const requestId = `paging-${process.pid}`;
    const batch = db.batch();
    for (let index = 0; index < 205; index += 1) {
        const id = `${requestId}:challenge_topic:${String(index).padStart(3, '0')}:r1`;
        batch.set(db.collection('content_factory_stages').doc(id), { requestId, kind: index % 2 ? 'challenge_topic' : 'lesson_outline', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru' });
    }
    await batch.commit();
    const ids = [];
    let cursor = '';
    do {
        const input = (0, admin_content_stages_1.parseContentStageListRequest)({ requestId, kind: 'challenge_topic', studyTarget: 'fr', sourceLocale: 'ru', limit: 40, cursor });
        const snapshot = await (0, admin_content_stages_1.buildContentStageListQuery)(db, input).get();
        const docs = snapshot.docs.slice(0, input.limit);
        ids.push(...docs.map((doc) => doc.id));
        cursor = snapshot.size > input.limit ? docs.at(-1)?.id ?? '' : '';
    } while (cursor);
    expect(ids).toHaveLength(102);
    expect(new Set(ids).size).toBe(102);
    expect(ids).toEqual([...ids].sort());
    expect(ids.every((id) => Number(id.split(':')[2]) % 2 === 1)).toBe(true);
});
test('approved dependency pages never leak wrong state, request or language', async () => {
    const requestId = `dependencies-${process.pid}`;
    const batch = db.batch();
    for (let index = 0; index < 205; index += 1) {
        const valid = index % 2 === 0;
        const id = `${requestId}:challenge_topic:${String(index).padStart(3, '0')}:r1`;
        batch.set(db.collection('content_factory_stages').doc(id), { requestId: valid ? requestId : `${requestId}-other`, kind: 'challenge_topic', state: index % 4 === 3 ? 'rejected' : 'approved', studyTarget: index % 6 === 5 ? 'fr' : 'en', sourceLocale: 'ru', scopeId: `topic-${index}`, revision: 1, artifactId: `artifact-${index}`, contentHash: 'a'.repeat(64) });
    }
    await batch.commit();
    const ids = [];
    let cursor = '';
    do {
        const input = (0, dependency_catalog_1.parseDependencyCatalogRequest)({ requestId, studyTarget: 'en', sourceLocale: 'ru', consumerKind: 'challenge_questions', limit: 17, cursor });
        const snapshot = await (0, admin_content_stages_1.buildContentStageDependencyQuery)(db, input).get();
        const page = (0, dependency_catalog_1.dependencyCatalogItems)(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })), input.limit);
        ids.push(...page.items.map((item) => item.stageId));
        cursor = page.nextCursor;
    } while (cursor);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    const snapshots = await Promise.all(ids.map((id) => db.collection('content_factory_stages').doc(id).get()));
    expect(snapshots.every((snapshot) => snapshot.data()?.requestId === requestId && snapshot.data()?.studyTarget === 'en' && snapshot.data()?.state === 'approved')).toBe(true);
});
afterAll(async () => {
    await db.terminate();
    await app.delete();
});
//# sourceMappingURL=content_factory_queries.emulator.test.js.map