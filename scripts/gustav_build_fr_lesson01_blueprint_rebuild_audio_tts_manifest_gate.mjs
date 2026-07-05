import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PACK_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const RU_PACK_PATH = path.join(PACK_DIR, 'fr_lesson01_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(PACK_DIR, 'fr_lesson01_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(PACK_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_AUDIT_PATH = path.join(PACK_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const MD_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const VOICE_POLICY = {
  provider: 'openai',
  voiceFamily: 'french_friendly_clear_a1',
  requiredFormat: 'mp3',
  requiredSampleRateHz: 24000,
  exactVoiceMustBeChosenBeforeExecution: true,
  speakingStyle: 'clear beginner French, natural pace, no theatrical emphasis',
};

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

function hasSourceLocaleLeak(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/u.test(String(value));
}

function hasMojibake(value) {
  return /[ï¿½ÃƒÃÃ‘Ã’]/u.test(String(value));
}

function buildSlots(pack) {
  return pack.rows.map((row) => ({
    slotId: `fr.lesson01.blueprint_rebuild.${pack.sourceLocale}.row${String(row.rowNumber).padStart(2, '0')}.tts.v1`,
    lessonId: 1,
    rowNumber: row.rowNumber,
    phraseId: row.phraseId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale: pack.sourceLocale,
    textForTts: row.phraseFr,
    sourceMeaning: row.sourceMeaning,
    ttsProvider: VOICE_POLICY.provider,
    requiredFormat: VOICE_POLICY.requiredFormat,
    requiredSampleRateHz: VOICE_POLICY.requiredSampleRateHz,
    expectedAudioPath: `course-packs/fr/${pack.sourceLocale}/audio/lesson01_blueprint_rebuild/${row.phraseId}.mp3`,
    localAudioPath: '',
    audioGenerated: false,
    checksumReady: false,
    sha256: '',
    byteSize: 0,
    blockers: ['blocked_pending_openai_tts_generation_and_checksum'],
  }));
}

function validateSlots(slots) {
  const errors = [];
  if (slots.length !== 100) errors.push(`expected 100 source-locale audio slots, got ${slots.length}`);
  const sourceCounts = new Map(SOURCE_LOCALES.map((locale) => [locale, 0]));
  const targetPhraseKeys = new Set();
  for (const slot of slots) {
    sourceCounts.set(slot.sourceLocale, (sourceCounts.get(slot.sourceLocale) ?? 0) + 1);
    if (slot.studyTarget !== 'fr' || slot.targetContentLang !== 'fr') errors.push(`${slot.slotId}: language identity mismatch`);
    if (!SOURCE_LOCALES.includes(slot.sourceLocale)) errors.push(`${slot.slotId}: invalid sourceLocale`);
    if (!slot.textForTts || hasMojibake(slot.textForTts) || hasSourceLocaleLeak(slot.textForTts)) errors.push(`${slot.slotId}: invalid French TTS text`);
    if (!slot.sourceMeaning || hasMojibake(slot.sourceMeaning)) errors.push(`${slot.slotId}: invalid source meaning encoding`);
    if (!slot.expectedAudioPath.startsWith(`course-packs/fr/${slot.sourceLocale}/audio/lesson01_blueprint_rebuild/`)) {
      errors.push(`${slot.slotId}: expected audio path is not source-locale scoped`);
    }
    if (slot.audioGenerated || slot.checksumReady || slot.localAudioPath || slot.sha256 || slot.byteSize !== 0) {
      errors.push(`${slot.slotId}: audio readiness flag opened before generation`);
    }
    targetPhraseKeys.add(`${slot.phraseId}:${slot.textForTts}`);
  }
  for (const locale of SOURCE_LOCALES) {
    if (sourceCounts.get(locale) !== 50) errors.push(`expected 50 ${locale} slots, got ${sourceCounts.get(locale)}`);
  }
  if (targetPhraseKeys.size !== 50) errors.push(`expected 50 unique target phrase TTS texts, got ${targetPhraseKeys.size}`);
  return errors;
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Audio TTS Manifest Gate',
    '',
    `Status: ${audit.status}`,
    `Audio slots: ${audit.summary.audioSlots}`,
    `Unique target phrases: ${audit.summary.uniqueTargetPhraseTexts}`,
    `Generated slots: ${audit.summary.generatedSlots}`,
    `Checksum-ready slots: ${audit.summary.checksumReadySlots}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- ttsApiCalledByThisScript: ${audit.safety.ttsApiCalledByThisScript}`,
    `- audioFilesWrittenByThisScript: ${audit.safety.audioFilesWrittenByThisScript}`,
    `- serverUploadAllowed: ${audit.safety.serverUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
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
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const blockers = [];

  if (ruPack.status !== 'PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY') blockers.push('RU_PACK_DRAFT_NOT_HOLD_REVIEWED');
  if (ukPack.status !== 'PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY') blockers.push('UK_PACK_DRAFT_NOT_HOLD_REVIEWED');
  if (packAudit.status !== 'PASS_PACK_DRAFT_WRITTEN') blockers.push('PACK_DRAFT_AUDIT_NOT_PASS');
  if (theoryAudit.status !== 'PASS_THEORY_VOCAB_PACK_WRITTEN') blockers.push('THEORY_VOCAB_AUDIT_NOT_PASS');
  if (ruPack.rows.length !== 50 || ukPack.rows.length !== 50) blockers.push('EXPECTED_50_ROWS_PER_SOURCE_PACK');

  const slots = [...buildSlots(ruPack), ...buildSlots(ukPack)];
  blockers.push(...validateSlots(slots));

  const manifest = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-audio-tts-manifest-v1',
    generatedAt,
    status: 'HOLD_PENDING_TTS_GENERATION',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    sourceContentVersion: ruPack.contentVersion,
    voicePolicy: VOICE_POLICY,
    sourcePacks: {
      ru: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      uk: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
    },
    sourceAudits: {
      packDraft: { path: rel(PACK_AUDIT_PATH), sha256: sha256File(PACK_AUDIT_PATH), status: packAudit.status },
      theoryVocab: { path: rel(THEORY_AUDIT_PATH), sha256: sha256File(THEORY_AUDIT_PATH), status: theoryAudit.status },
    },
    slots,
    safety: {
      manifestOnly: true,
      ttsApiCalledByThisScript: false,
      audioFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(MANIFEST_PATH, manifest);

  const uniqueTargetPhraseTexts = new Set(slots.map((slot) => `${slot.phraseId}:${slot.textForTts}`)).size;
  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-audio-tts-manifest-gate-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_AUDIO_TTS_NOT_GENERATED' : 'BLOCK_AUDIO_TTS_MANIFEST_INVALID',
    blockers: blockers.length === 0 ? ['blocked_pending_openai_tts_generation_and_checksum'] : blockers,
    summary: {
      audioSlots: slots.length,
      expectedSourceLocaleSlots: 100,
      uniqueTargetPhraseTexts,
      generatedSlots: slots.filter((slot) => slot.audioGenerated).length,
      checksumReadySlots: slots.filter((slot) => slot.checksumReady).length,
      readyForTtsGeneration: blockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    productionBlockers: [
      'OPENAI_TTS_NOT_EXECUTED',
      'AUDIO_FILES_NOT_WRITTEN',
      'AUDIO_SHA256_CHECKSUMS_MISSING',
      'SERVER_PACK_NOT_BUILT',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: manifest.safety,
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildAudioTtsManifest = rel(MANIFEST_PATH);
    state.lesson01BlueprintRebuildAudioTtsManifestGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildAudioTtsManifestStatus = audit.status;
    state.lesson01BlueprintRebuildAudioTtsManifestSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 server manifest draft with upload closed until audio checksums exist.',
      'Create Lesson 1 runtime delivery dry-run gate with downloads disabled.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} slots=${slots.length} generated=0 checksum=0 blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_AUDIO_TTS_MANIFEST_INVALID') process.exitCode = 1;
}

main();
