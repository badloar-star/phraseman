#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';
import { mergeFlashcardRegistryBackfillManifests, planFlashcardRegistryBackfill } from '../functions/lib/content_factory/flashcard_semantic_registry.js';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const rollback = args.has('--rollback');
const cutoverMode = valueFromArgs(process.argv, '--cutover');
if (apply && rollback) throw new Error('Choose only --apply or --rollback');
function valueFromArgs(argv, name, fallback = '') { const prefix = `${name}=`; return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || fallback; }
const value = (name, fallback = '') => valueFromArgs(process.argv, name, fallback);
const runId = value('--run-id', `flashcard-registry-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const pageSize = Math.min(100, Math.max(1, Number(value('--page-size', '50'))));
const reportPath = path.resolve(value('--manifest', `.codex-tmp/flashcard-registry/${runId}.json`));
const previousManifestPath = value('--previous-manifest');
const existingAppliedManifest = apply && fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const registry = db.collection('content_factory_flashcard_semantic_keys');
const configRef = db.collection('content_factory_config').doc('flashcard_semantic_registry');
const sourceKeys = (sources = []) => sources.map((source) => `${source.packId}\0${source.cardId}`).sort();

const packsForDocs = (docs) => docs.flatMap((doc) => {
  const data = doc.data(); const cards = Array.isArray(data.cards) ? data.cards : [];
  return ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].map((sourceLocale) => ({ id: doc.id, studyTarget: data.studyTarget || 'en', sourceLocale, cards: cards.map((card) => ({ ...card, front: card.front || card.en, back: sourceLocale === 'ru' || sourceLocale === 'uk' || sourceLocale === 'es' ? card[sourceLocale] : card.sourceLocales?.[sourceLocale] })).filter((card) => String(card.back || '').trim()) }));
});

if (cutoverMode) {
  if (!['shadow', 'registry'].includes(cutoverMode) || !fs.existsSync(reportPath)) throw new Error('Cutover requires --cutover=shadow|registry and an existing --manifest');
  const manifest = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (!manifest.complete || manifest.conflicts?.length) throw new Error('Cutover requires a complete conflict-free manifest');
  const catalogSnapshot = await db.collection('community_packs').where('listingStatus', '==', 'published').orderBy(admin.firestore.FieldPath.documentId()).limit(501).get();
  if (catalogSnapshot.size > 500) throw new Error('Cutover catalog exceeds bounded verification');
  const current = planFlashcardRegistryBackfill({ runId: manifest.runId, dryRun: true, packs: packsForDocs(catalogSnapshot.docs) });
  if (current.catalogFingerprint !== manifest.catalogFingerprint || current.catalogHighWaterMark !== manifest.catalogHighWaterMark) throw new Error('Cutover manifest is stale');
  const partitions = [...new Set(manifest.entries.map((entry) => entry.partitionKey))];
  const actual = [];
  for (const partitionKey of partitions) {
    const snapshot = await registry.where('partitionKey', '==', partitionKey).limit(1001).get();
    if (snapshot.size > 1000) throw new Error('Cutover registry partition exceeds bounded verification');
    actual.push(...snapshot.docs.map((doc) => ({ docId: doc.id, ...doc.data() })));
  }
  const expectedIds = manifest.entries.map((entry) => entry.docId).sort(); const actualIds = actual.map((entry) => entry.docId).sort();
  const parityFailed = JSON.stringify(expectedIds) !== JSON.stringify(actualIds) || actual.some((entry) => {
    const expected = manifest.entries.find((candidate) => candidate.docId === entry.docId);
    return !expected || expected.canonicalKey !== entry.canonicalKey || JSON.stringify(sourceKeys(expected.sources)) !== JSON.stringify(sourceKeys(entry.sources));
  });
  if (parityFailed) throw new Error('Cutover registry parity failed');
  const configSnapshot = await configRef.get();
  const catalogGeneration = Number.isSafeInteger(Number(configSnapshot.data()?.catalogGeneration)) ? Number(configSnapshot.data()?.catalogGeneration) : 0;
  await configRef.set({ mode: cutoverMode, manifestComplete: true, catalogFingerprint: manifest.catalogFingerprint, catalogHighWaterMark: manifest.catalogHighWaterMark, manifestRunId: manifest.runId, catalogGeneration, verifiedGeneration: catalogGeneration, updatedAt: Date.now() }, { merge: true });
  console.log(JSON.stringify({ ok: true, cutoverMode, manifest: reportPath, entries: actual.length })); await db.terminate(); process.exit(0);
}

if (rollback) {
  const manifest = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  for (const entry of manifest.entries || []) {
    const ref = registry.doc(entry.docId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref); if (!snap.exists) return;
      const current = snap.data(); const introduced = new Set((entry.introducedSources || []).map((s) => `${s.packId}\0${s.cardId}`));
      const sources = (current.sources || []).filter((s) => !introduced.has(`${s.packId}\0${s.cardId}`));
      if (sources.length) tx.set(ref, { ...current, sources, backfillRunIds: admin.firestore.FieldValue.arrayRemove(manifest.runId) }, { merge: false }); else tx.delete(ref);
    });
  }
  await configRef.set({ mode: 'shadow', manifestComplete: false, verifiedGeneration: -1, updatedAt: Date.now() }, { merge: true });
  console.log(JSON.stringify({ ok: true, rollback: true, runId })); await db.terminate(); process.exit(0);
}

let query = db.collection('community_packs').where('listingStatus', '==', 'published').orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
const cursor = value('--cursor'); if (cursor) query = query.startAfter(cursor);
const snap = await query.get();
const packs = packsForDocs(snap.docs);
const nextCursor = snap.size === pageSize ? snap.docs.at(-1).id : null;
const pageManifest = planFlashcardRegistryBackfill({ runId, dryRun: !apply, inputCursor: cursor || null, nextCursor, packs });
const manifest = previousManifestPath ? mergeFlashcardRegistryBackfillManifests(JSON.parse(fs.readFileSync(path.resolve(previousManifestPath), 'utf8')), pageManifest) : pageManifest;
fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (apply) {
  if (manifest.conflicts.length) throw new Error('Backfill conflicts must be resolved before apply');
  if (!manifest.complete) throw new Error('Backfill apply requires a complete chained manifest');
  const appliedEntries = [];
  for (const entry of manifest.entries) {
    const ref = registry.doc(entry.docId);
    const introducedSources = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref); const current = snap.data();
      if (current && (current.partitionKey !== entry.partitionKey || current.canonicalKey !== entry.canonicalKey)) throw new Error(`Registry collision at ${entry.docId}`);
      const currentKeys = new Set((current?.sources || []).map((source) => `${source.packId}\0${source.cardId}`));
      const introducedSources = entry.sources.filter((source) => !currentKeys.has(`${source.packId}\0${source.cardId}`));
      const sourceMap = new Map([...(current?.sources || []), ...entry.sources].map((source) => [`${source.packId}\0${source.cardId}`, source]));
      tx.set(ref, { ...entry, sources: [...sourceMap.values()], backfillRunIds: admin.firestore.FieldValue.arrayUnion(runId), updatedAt: Date.now() }, { merge: true });
      return introducedSources;
    });
    const priorIntroduced = existingAppliedManifest?.runId === runId ? existingAppliedManifest.entries?.find((item) => item.docId === entry.docId)?.introducedSources ?? [] : [];
    const introducedMap = new Map([...priorIntroduced, ...introducedSources].map((source) => [`${source.packId}\0${source.cardId}`, source]));
    appliedEntries.push({ ...entry, introducedSources: [...introducedMap.values()] });
  }
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...manifest, dryRun: false, entries: appliedEntries }, null, 2)}\n`);
}
console.log(JSON.stringify({ ok: true, dryRun: !apply, manifest: reportPath, scannedPacks: manifest.scannedPacks, entries: manifest.entries.length, conflicts: manifest.conflicts.length, nextCursor }));
await db.terminate();
