import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');

const MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const COURSE_PACK_SCHEMA_VERSION = 'course-pack-v1';
const CONTENT_VERSION = 'fr-lesson01-blueprint-rebuild-v1.reviewed.pending';

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function byteSize(filePath) {
  return fs.statSync(filePath).size;
}

function artifactFor(sourceLocale, surface) {
  if (surface === 'lesson') return sourceLocale === 'ru' ? RU_PACK_PATH : UK_PACK_PATH;
  if (surface === 'audio_metadata') return AUDIO_MANIFEST_PATH;
  throw new Error(`Unknown surface: ${surface}`);
}

function buildEntry(sourceLocale, surface, index, blocker) {
  const artifactPath = artifactFor(sourceLocale, surface);
  const artifactSha256 = sha256File(artifactPath);
  const artifactByteSize = byteSize(artifactPath);
  return {
    entryId: `fr.lesson01.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson01.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: 1,
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifactPath),
    localArtifactSha256: artifactSha256,
    localArtifactByteSize: artifactByteSize,
    relatedArtifacts: surface === 'lesson'
      ? [{ role: 'theory_vocab', path: rel(THEORY_PACK_PATH), sha256: sha256File(THEORY_PACK_PATH), byteSize: byteSize(THEORY_PACK_PATH) }]
      : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson01_blueprint_rebuild/${CONTENT_VERSION}/${artifactSha256}.json`,
    minAppVersion: 'blocked_until_runtime_delivery_gate',
    entryIndex: index,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
    blockers: [blocker],
  };
}

function validateEntries(entries) {
  const problems = [];
  for (const entry of entries) {
    if (entry.studyTarget !== 'fr' || entry.targetContentLang !== 'fr') problems.push(`${entry.entryId}: language identity mismatch`);
    if (!SOURCE_LOCALES.includes(entry.sourceLocale)) problems.push(`${entry.entryId}: invalid sourceLocale`);
    if (!entry.packId.startsWith(`fr.${entry.sourceLocale}.lesson01.blueprint_rebuild.`)) problems.push(`${entry.entryId}: packId sourceLocale mismatch`);
    if (!['lesson', 'audio_metadata'].includes(entry.surface)) problems.push(`${entry.entryId}: surface is not app-known runtime surface`);
    if (!entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`)) {
      problems.push(`${entry.entryId}: serverPath is not source-locale scoped`);
    }
    if (entry.serverPath.includes('course-packs/en/') || entry.serverPath.includes('uiLocale') || entry.serverPath.includes('sourceLocale') || entry.serverPath.includes('..')) {
      problems.push(`${entry.entryId}: forbidden serverPath token`);
    }
    if (
      entry.serverUploadAllowed ||
      entry.firebaseUploadAllowed ||
      entry.downloadablePacksPublished ||
      entry.runtimeDownloadsEnabled ||
      entry.productionApplyApproved ||
      entry.activationApproved
    ) {
      problems.push(`${entry.entryId}: production flag opened before server gates`);
    }
    if (entry.surface !== 'audio_manifest' && !/^[a-f0-9]{64}$/.test(entry.localArtifactSha256)) {
      problems.push(`${entry.entryId}: materialized artifact sha missing`);
    }
  }
  return problems;
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Server Pack Manifest Gate',
    '',
    `Status: ${audit.status}`,
    `Server entries: ${audit.summary.serverManifestEntries}`,
    `Source-scoped entries: ${audit.summary.sourceLocaleScopedEntries}`,
    `Upload allowed entries: ${audit.summary.serverUploadAllowedEntries}`,
    `Runtime enabled entries: ${audit.summary.runtimeDownloadsEnabledEntries}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- serverUploadAllowed: ${audit.safety.serverUploadAllowed}`,
    `- firebaseUploadAllowed: ${audit.safety.firebaseUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- productionApplyApproved: ${audit.safety.productionApplyApproved}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const ruPack = readJson(RU_PACK_PATH);
  const ukPack = readJson(UK_PACK_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const theoryPack = readJson(THEORY_PACK_PATH);
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const audioManifest = readJson(AUDIO_MANIFEST_PATH);
  const audioAudit = readJson(AUDIO_AUDIT_PATH);
  const blockers = [];

  if (ruPack.status !== 'PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY') blockers.push('RU_PACK_DRAFT_NOT_HOLD_REVIEWED');
  if (ukPack.status !== 'PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY') blockers.push('UK_PACK_DRAFT_NOT_HOLD_REVIEWED');
  if (packAudit.status !== 'PASS_PACK_DRAFT_WRITTEN') blockers.push('PACK_DRAFT_AUDIT_NOT_PASS');
  if (theoryPack.status !== 'THEORY_VOCAB_PACK_HOLD_READY_FOR_NEXT_GATES') blockers.push('THEORY_VOCAB_PACK_NOT_READY');
  if (theoryAudit.status !== 'PASS_THEORY_VOCAB_PACK_WRITTEN') blockers.push('THEORY_VOCAB_AUDIT_NOT_PASS');
  if (audioManifest.status !== 'HOLD_PENDING_TTS_GENERATION') blockers.push('AUDIO_MANIFEST_NOT_PENDING_TTS');
  if (audioAudit.status !== 'HOLD_AUDIO_TTS_NOT_GENERATED') blockers.push('AUDIO_TTS_GATE_NOT_HOLD');
  if (audioAudit.summary?.generatedSlots !== 0 || audioAudit.summary?.checksumReadySlots !== 0) blockers.push('AUDIO_CHECKSUM_STATE_UNEXPECTEDLY_OPEN');

  const serverReadinessBlocker = 'blocked_pending_audio_tts_checksum_payload_hash_lock_runtime_delivery';
  const entries = SOURCE_LOCALES.flatMap((sourceLocale) => [
    buildEntry(sourceLocale, 'lesson', `lesson/${sourceLocale}/lesson01_blueprint_rebuild.json`, serverReadinessBlocker),
    buildEntry(sourceLocale, 'audio_metadata', `audio/${sourceLocale}/lesson01_blueprint_rebuild.json`, serverReadinessBlocker),
  ]);
  blockers.push(...validateEntries(entries));

  const manifest = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED' : 'BLOCK_SERVER_PACK_MANIFEST_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    coursePackSchemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: {
      ruPack: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH), rows: ruPack.rows.length },
      ukPack: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH), rows: ukPack.rows.length },
      packAudit: { path: rel(PACK_AUDIT_PATH), sha256: sha256File(PACK_AUDIT_PATH), status: packAudit.status },
      theoryPack: { path: rel(THEORY_PACK_PATH), sha256: sha256File(THEORY_PACK_PATH), sections: theoryPack.theory.sections.length },
      theoryAudit: { path: rel(THEORY_AUDIT_PATH), sha256: sha256File(THEORY_AUDIT_PATH), status: theoryAudit.status },
      audioManifest: { path: rel(AUDIO_MANIFEST_PATH), sha256: sha256File(AUDIO_MANIFEST_PATH), slots: audioManifest.slots.length },
      audioAudit: { path: rel(AUDIO_AUDIT_PATH), sha256: sha256File(AUDIO_AUDIT_PATH), status: audioAudit.status },
    },
    uploadPolicy: {
      allowedStoragePathPrefixes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedStoragePathPrefixes: ['course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/fr/*/../../'],
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackManifest: true,
      requiresRuntimeDeliveryGate: true,
      requiresExplicitActivationApproval: true,
    },
    entries,
    safety: {
      manifestOnly: true,
      payloadFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(MANIFEST_PATH, manifest);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-gate-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED' : 'BLOCK_SERVER_PACK_MANIFEST_INVALID',
    blockers: blockers.length === 0 ? [serverReadinessBlocker] : blockers,
    summary: {
      serverManifestEntries: entries.length,
      sourceLocaleScopedEntries: entries.filter((entry) => entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/`)).length,
      ruEntries: entries.filter((entry) => entry.sourceLocale === 'ru').length,
      ukEntries: entries.filter((entry) => entry.sourceLocale === 'uk').length,
      lessonEntries: entries.filter((entry) => entry.surface === 'lesson').length,
      audioMetadataEntries: entries.filter((entry) => entry.surface === 'audio_metadata').length,
      lessonEntriesWithTheoryArtifact: entries.filter((entry) => entry.surface === 'lesson' && entry.relatedArtifacts.some((artifact) => artifact.role === 'theory_vocab')).length,
      sourceRows: ruPack.rows.length + ukPack.rows.length,
      theorySections: theoryPack.theory.sections.length,
      audioSlots: audioManifest.slots.length,
      generatedAudioSlots: audioAudit.summary?.generatedSlots ?? -1,
      checksumReadySlots: audioAudit.summary?.checksumReadySlots ?? -1,
      serverUploadAllowedEntries: entries.filter((entry) => entry.serverUploadAllowed).length,
      firebaseUploadAllowedEntries: entries.filter((entry) => entry.firebaseUploadAllowed).length,
      downloadablePublishedEntries: entries.filter((entry) => entry.downloadablePacksPublished).length,
      runtimeDownloadsEnabledEntries: entries.filter((entry) => entry.runtimeDownloadsEnabled).length,
      activationApprovedEntries: entries.filter((entry) => entry.activationApproved).length,
      readyForPayloadMaterialization: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    productionBlockers: [
      'AUDIO_TTS_NOT_GENERATED',
      'AUDIO_SHA256_CHECKSUMS_MISSING',
      'SERVER_PAYLOAD_HASH_LOCK_NOT_WRITTEN',
      'SERVER_UPLOAD_NOT_ALLOWED',
      'RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: manifest.safety,
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildServerPackManifest = rel(MANIFEST_PATH);
    state.lesson01BlueprintRebuildServerPackManifestGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildServerPackManifestStatus = audit.status;
    state.lesson01BlueprintRebuildServerPackManifestSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 runtime delivery dry-run gate with downloads disabled.',
      'Create Lesson 1 payload materialization/hash-lock gate that remains closed until audio checksums exist.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} entries=${entries.length} upload=0 runtime=0 activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_SERVER_PACK_MANIFEST_INVALID') process.exitCode = 1;
}

main();
