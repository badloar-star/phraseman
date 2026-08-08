import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import retention from '../functions/lib/content_factory/artifact_retention.js';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/content-factory-artifact-retention-dry-run.mjs --project <id> --output <ignored-report.json>');
  process.exit(0);
}
const valueAfter = (flag) => { const index = args.indexOf(flag); return index >= 0 ? String(args[index + 1] || '').trim() : ''; };
const projectId = valueAfter('--project');
const output = valueAfter('--output');
if (!/^[a-z0-9-]{3,100}$/.test(projectId) || !output) throw new Error('artifact_retention_dry_run_args_required');

const app = initializeApp({ credential: applicationDefault(), projectId }, `artifact-retention-${process.pid}`);
const db = getFirestore(app);
const protectedCollections = [
  'content_factory_stages', 'content_factory_job_units', 'content_factory_releases',
  'content_factory_lesson_ledgers', 'content_factory_question_ledgers',
  'content_factory_flashcard_ledgers', 'content_factory_arena_ledgers',
  'content_factory_job_reviews', 'admin_log',
];

function collectReferences(value, collection, outputReferences) {
  if (Array.isArray(value)) { value.forEach((item) => collectReferences(item, collection, outputReferences)); return; }
  if (!value || typeof value !== 'object') return;
  if (typeof value.objectPath === 'string' && typeof value.objectGeneration === 'string') outputReferences.push({ collection, objectPath: value.objectPath, objectGeneration: value.objectGeneration });
  Object.values(value).forEach((item) => collectReferences(item, collection, outputReferences));
}

const orphanSnapshot = await db.collection('content_factory_artifact_orphans').where('state', '==', 'orphan_candidate').limit(501).get();
if (orphanSnapshot.size > 500) throw new Error('artifact_retention_scan_limit_exceeded');
const candidates = orphanSnapshot.docs.map((doc) => ({ objectPath: String(doc.data().objectPath || ''), objectGeneration: String(doc.data().objectGeneration || ''), createdAtMs: Number(doc.data().detectedAtMs || 0) }));
const references = [];
for (const collection of protectedCollections) {
  const snapshot = await db.collection(collection).limit(501).get();
  if (snapshot.size > 500) throw new Error(`artifact_retention_reference_scan_truncated:${collection}`);
  snapshot.docs.forEach((doc) => collectReferences(doc.data(), collection, references));
}
const manifest = retention.buildArtifactRetentionManifest({ nowMs: Date.now(), candidates, references });
const resolvedOutput = path.resolve(output);
await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify({ projectId, generatedAt: new Date().toISOString(), protectedCollections, ...manifest }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ mode: manifest.mode, scanned: manifest.scanned, eligibleCount: manifest.eligibleCount, output: resolvedOutput }));
