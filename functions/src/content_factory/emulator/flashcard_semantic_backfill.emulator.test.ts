import * as admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { findPublishedFlashcardDuplicateKeys } from '../../content_stage_worker';
import { flashcardRegistryDocumentId, flashcardRegistryPartitionKey } from '../flashcard_semantic_registry';

const projectId = process.env.GCLOUD_PROJECT || 'phraseman-content-factory-emulator';
const appName = `flashcard-backfill-${process.pid}`;
const app = admin.apps.find((candidate) => candidate?.name === appName) ?? admin.initializeApp({ projectId }, appName);
const db = app.firestore();
const root = path.resolve(__dirname, '../../../../');
const script = path.join(root, 'scripts/content-factory-flashcard-semantic-backfill.mjs');
const manifestDir = path.join(root, '.codex-tmp/flashcard-registry');
const pageOneManifest = path.join(manifestDir, `emulator-${process.pid}-page-1.json`);
const pageTwoManifest = path.join(manifestDir, `emulator-${process.pid}-page-2.json`);
const completeManifest = path.join(manifestDir, `emulator-${process.pid}-complete.json`);
const runId = `emulator-${process.pid}`;
jest.setTimeout(120_000);

function run(manifest: string, ...args: string[]) {
  return execFileSync(process.execPath, [script, `--run-id=${runId}`, `--manifest=${manifest}`, ...args], {
    cwd: root, env: { ...process.env, GCLOUD_PROJECT: projectId }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function runComplete(...args: string[]) {
  return run(completeManifest, '--page-size=1', '--cursor=pack-b', `--previous-manifest=${pageTwoManifest}`, ...args);
}

test('multi-page backfill rejects source corruption/stale catalogs, cuts over, and bypasses the legacy 500-pack cap', async () => {
  const batch = db.batch();
  for (const id of ['pack-a', 'pack-b']) batch.set(db.collection('community_packs').doc(id), { listingStatus: 'published', studyTarget: 'en', cards: [{ id: `card-${id}`, en: 'Station!', ru: 'Вокзал' }] });
  batch.set(db.collection('content_factory_config').doc('flashcard_semantic_registry'), { mode: 'shadow', catalogGeneration: 7, verifiedGeneration: -1 });
  await batch.commit();

  run(pageOneManifest, '--page-size=1');
  const pageOne = JSON.parse(fs.readFileSync(pageOneManifest, 'utf8'));
  expect(pageOne).toMatchObject({ complete: false, nextCursor: 'pack-a', scannedPacks: 8 });
  run(pageTwoManifest, '--page-size=1', '--cursor=pack-a', `--previous-manifest=${pageOneManifest}`);
  expect(JSON.parse(fs.readFileSync(pageTwoManifest, 'utf8'))).toMatchObject({ complete: false, nextCursor: 'pack-b', scannedPacks: 16 });
  runComplete();
  const complete = JSON.parse(fs.readFileSync(completeManifest, 'utf8'));
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

  const partition = { surface: 'community_flashcards' as const, studyTarget: 'en', sourceLocale: 'ru' };
  const partitionKey = flashcardRegistryPartitionKey(partition);
  for (let offset = 0; offset < 1001; offset += 400) {
    const bulk = db.batch();
    for (let index = offset; index < Math.min(offset + 400, 1001); index += 1) {
      const canonicalKey = `filler ${index}\0перевод ${index}`;
      bulk.set(db.collection('content_factory_flashcard_semantic_keys').doc(flashcardRegistryDocumentId(partition, canonicalKey)), {
        partitionKey, canonicalKey, sources: [{ packId: `filler-pack-${index}`, cardId: `filler-card-${index}` }],
      });
    }
    await bulk.commit();
  }
  expect((await db.collection('content_factory_flashcard_semantic_keys').where('partitionKey', '==', partitionKey).get()).size).toBeGreaterThan(1000);
  expect(await findPublishedFlashcardDuplicateKeys(db, 'en', 'ru', [{ front: 'Station!', back: 'Вокзал' }])).toEqual(['station\0вокзал']);
  expect(await findPublishedFlashcardDuplicateKeys(db, 'en', 'ru', [{ front: 'Never published', back: 'Никогда не публиковалось' }])).toEqual([]);

  run(completeManifest, '--rollback');
  expect((await configRef.get()).data()).toMatchObject({ mode: 'shadow', manifestComplete: false, verifiedGeneration: -1 });
  expect((await db.collection('content_factory_flashcard_semantic_keys').doc(complete.entries[0].docId).get()).exists).toBe(false);
  expect((await db.collection('content_factory_flashcard_semantic_keys').doc(flashcardRegistryDocumentId(partition, 'filler 0\0перевод 0')).get()).exists).toBe(true);
});

afterAll(async () => {
  for (const collection of ['community_packs', 'content_factory_flashcard_semantic_keys', 'content_factory_config']) {
    const docs = await db.collection(collection).get(); await Promise.all(docs.docs.map((doc) => doc.ref.delete()));
  }
  for (const manifest of [pageOneManifest, pageTwoManifest, completeManifest]) if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
  await db.terminate(); await app.delete();
});
