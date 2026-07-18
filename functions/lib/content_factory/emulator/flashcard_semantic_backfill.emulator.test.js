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
const admin = __importStar(require("firebase-admin"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const content_stage_worker_1 = require("../../content_stage_worker");
const flashcard_semantic_registry_1 = require("../flashcard_semantic_registry");
const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `flashcard-backfill-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
const root = node_path_1.default.resolve(__dirname, '../../../../');
const script = node_path_1.default.join(root, 'scripts/content-factory-flashcard-semantic-backfill.mjs');
const manifestDir = node_path_1.default.join(root, '.codex-tmp/flashcard-registry');
const pageOneManifest = node_path_1.default.join(manifestDir, `emulator-${process.pid}-page-1.json`);
const pageTwoManifest = node_path_1.default.join(manifestDir, `emulator-${process.pid}-page-2.json`);
const completeManifest = node_path_1.default.join(manifestDir, `emulator-${process.pid}-complete.json`);
const runId = `emulator-${process.pid}`;
jest.setTimeout(120000);
function run(manifest, ...args) {
    return (0, node_child_process_1.execFileSync)(process.execPath, [script, `--run-id=${runId}`, `--manifest=${manifest}`, ...args], {
        cwd: root, env: { ...process.env, GCLOUD_PROJECT: projectId }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
}
function runComplete(...args) {
    return run(completeManifest, '--page-size=1', '--cursor=pack-b', `--previous-manifest=${pageTwoManifest}`, ...args);
}
test('multi-page backfill rejects source corruption/stale catalogs, cuts over, and bypasses the legacy 500-pack cap', async () => {
    const batch = db.batch();
    for (const id of ['pack-a', 'pack-b'])
        batch.set(db.collection('community_packs').doc(id), { listingStatus: 'published', studyTarget: 'en', cards: [{ id: `card-${id}`, en: 'Station!', ru: 'Вокзал' }] });
    batch.set(db.collection('content_factory_config').doc('flashcard_semantic_registry'), { mode: 'shadow', catalogGeneration: 7, verifiedGeneration: -1 });
    await batch.commit();
    run(pageOneManifest, '--page-size=1');
    const pageOne = JSON.parse(node_fs_1.default.readFileSync(pageOneManifest, 'utf8'));
    expect(pageOne).toMatchObject({ complete: false, nextCursor: 'pack-a', scannedPacks: 8 });
    run(pageTwoManifest, '--page-size=1', '--cursor=pack-a', `--previous-manifest=${pageOneManifest}`);
    expect(JSON.parse(node_fs_1.default.readFileSync(pageTwoManifest, 'utf8'))).toMatchObject({ complete: false, nextCursor: 'pack-b', scannedPacks: 16 });
    runComplete();
    const complete = JSON.parse(node_fs_1.default.readFileSync(completeManifest, 'utf8'));
    expect(complete).toMatchObject({ complete: true, scannedPacks: 16 });
    expect(complete.entries).toHaveLength(1);
    expect(complete.entries[0].sources).toEqual([{ packId: 'pack-a', cardId: 'card-pack-a' }, { packId: 'pack-b', cardId: 'card-pack-b' }]);
    runComplete('--apply');
    runComplete('--apply');
    let registry = await db.collection('content_factory_flashcard_semantic_keys').get();
    expect(registry.size).toBe(1);
    expect(registry.docs[0].data().sources).toHaveLength(2);
    await registry.docs[0].ref.update({ sources: [{ packId: 'pack-a', cardId: 'card-pack-a' }] });
    expect(() => run(completeManifest, '--cutover=registry')).toThrow();
    runComplete('--apply');
    await db.collection('community_packs').doc('pack-c').set({ listingStatus: 'published', studyTarget: 'en', cards: [{ id: 'card-pack-c', en: 'Airport', ru: 'Аэропорт' }] });
    expect(() => run(completeManifest, '--cutover=registry')).toThrow();
    await db.collection('community_packs').doc('pack-c').delete();
    run(completeManifest, '--cutover=registry');
    const configRef = db.collection('content_factory_config').doc('flashcard_semantic_registry');
    expect((await configRef.get()).data()).toMatchObject({ mode: 'registry', manifestComplete: true, catalogGeneration: 7, verifiedGeneration: 7 });
    const partition = { surface: 'community_flashcards', studyTarget: 'en', sourceLocale: 'ru' };
    const partitionKey = (0, flashcard_semantic_registry_1.flashcardRegistryPartitionKey)(partition);
    for (let offset = 0; offset < 1001; offset += 400) {
        const bulk = db.batch();
        for (let index = offset; index < Math.min(offset + 400, 1001); index += 1) {
            const canonicalKey = `filler ${index}\0перевод ${index}`;
            bulk.set(db.collection('content_factory_flashcard_semantic_keys').doc((0, flashcard_semantic_registry_1.flashcardRegistryDocumentId)(partition, canonicalKey)), {
                partitionKey, canonicalKey, sources: [{ packId: `filler-pack-${index}`, cardId: `filler-card-${index}` }],
            });
        }
        await bulk.commit();
    }
    expect((await db.collection('content_factory_flashcard_semantic_keys').where('partitionKey', '==', partitionKey).get()).size).toBeGreaterThan(1000);
    expect(await (0, content_stage_worker_1.findPublishedFlashcardDuplicateKeys)(db, 'en', 'ru', [{ front: 'Station!', back: 'Вокзал' }])).toEqual(['station\0вокзал']);
    expect(await (0, content_stage_worker_1.findPublishedFlashcardDuplicateKeys)(db, 'en', 'ru', [{ front: 'Never published', back: 'Никогда не публиковалось' }])).toEqual([]);
    run(completeManifest, '--rollback');
    expect((await configRef.get()).data()).toMatchObject({ mode: 'shadow', manifestComplete: false, verifiedGeneration: -1 });
    expect((await db.collection('content_factory_flashcard_semantic_keys').doc(complete.entries[0].docId).get()).exists).toBe(false);
    expect((await db.collection('content_factory_flashcard_semantic_keys').doc((0, flashcard_semantic_registry_1.flashcardRegistryDocumentId)(partition, 'filler 0\0перевод 0')).get()).exists).toBe(true);
});
afterAll(async () => {
    for (const collection of ['community_packs', 'content_factory_flashcard_semantic_keys', 'content_factory_config']) {
        const docs = await db.collection(collection).get();
        await Promise.all(docs.docs.map((doc) => doc.ref.delete()));
    }
    for (const manifest of [pageOneManifest, pageTwoManifest, completeManifest])
        if (node_fs_1.default.existsSync(manifest))
            node_fs_1.default.unlinkSync(manifest);
    await db.terminate();
    await app.delete();
});
//# sourceMappingURL=flashcard_semantic_backfill.emulator.test.js.map