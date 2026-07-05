import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_uk_pack_candidate_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_theory_materialization_audit_v1.json');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson01_audio_tts_manifest_v1.json');
const GATE_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_audio_tts_manifest_gate_audit_v1.json');
const MD_PATH = path.join(AUDIO_DIR, 'fr_lesson01_audio_tts_manifest_gate_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const VOICE_POLICY = {
  provider: 'openai',
  voiceFamily: 'french_friendly_clear_a1',
  requiredFormat: 'mp3',
  requiredSampleRateHz: 24000,
  exactVoiceMustBeChosenBeforeExecution: true,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function buildSlots(pack) {
  return pack.rows.map((row) => ({
    slotId: `fr.lesson01.row${String(row.rowNumber).padStart(2, '0')}.tts.v1`,
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
    expectedAudioPath: `course-packs/fr/${pack.sourceLocale}/audio/lesson01/${row.phraseId}.mp3`,
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
  const targetPhraseKeys = new Set();
  for (const slot of slots) {
    if (slot.studyTarget !== 'fr' || slot.targetContentLang !== 'fr') errors.push(`${slot.slotId}: language identity mismatch`);
    if (!SOURCE_LOCALES.includes(slot.sourceLocale)) errors.push(`${slot.slotId}: invalid sourceLocale`);
    if (hasMojibake(slot.textForTts) || hasCyrillic(slot.textForTts)) errors.push(`${slot.slotId}: invalid French TTS text`);
    if (hasMojibake(slot.sourceMeaning)) errors.push(`${slot.slotId}: invalid source meaning encoding`);
    if (slot.audioGenerated || slot.checksumReady || slot.localAudioPath || slot.sha256 || slot.byteSize !== 0) {
      errors.push(`${slot.slotId}: audio readiness flag opened before generation`);
    }
    targetPhraseKeys.add(`${slot.phraseId}:${slot.textForTts}`);
  }
  if (targetPhraseKeys.size !== 50) errors.push(`expected 50 unique target phrase TTS texts, got ${targetPhraseKeys.size}`);
  return errors;
}

function buildMarkdown(audit) {
  const lines = [
    '# French Lesson 1 Audio TTS Manifest Gate',
    '',
    `Status: ${audit.status}`,
    `Audio slots: ${audit.summary.audioSlots}`,
    `Unique target phrases: ${audit.summary.uniqueTargetPhraseTexts}`,
    '',
    '## Blockers',
    '',
    ...(audit.blockers.length ? audit.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
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
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const blockers = [];

  if (ruPack.status !== 'PACK_CANDIDATE_HOLD' || ukPack.status !== 'PACK_CANDIDATE_HOLD') blockers.push('lesson pack candidates are not in HOLD candidate state');
  if (theoryAudit.status !== 'PASS_THEORY_CANDIDATE_WRITTEN') blockers.push('theory candidate audit is not pass');
  if (ruPack.rows.length !== 50 || ukPack.rows.length !== 50) blockers.push('expected 50 rows per source-locale pack');

  const slots = [...buildSlots(ruPack), ...buildSlots(ukPack)];
  blockers.push(...validateSlots(slots));

  const manifest = {
    schemaVersion: 'gustav-fr-lesson01-audio-tts-manifest-v1',
    generatedAt,
    status: 'HOLD_PENDING_TTS_GENERATION',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    voicePolicy: VOICE_POLICY,
    sourcePacks: {
      ru: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      uk: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
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
    schemaVersion: 'gustav-fr-lesson01-audio-tts-manifest-gate-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_AUDIO_TTS_NOT_GENERATED' : 'BLOCK',
    blockers: blockers.length === 0 ? ['blocked_pending_openai_tts_generation_and_checksum'] : blockers,
    summary: {
      audioSlots: slots.length,
      expectedSourceLocaleSlots: 100,
      uniqueTargetPhraseTexts,
      generatedSlots: slots.filter((slot) => slot.audioGenerated).length,
      checksumReadySlots: slots.filter((slot) => slot.checksumReady).length,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    safety: manifest.safety,
  };

  writeJson(GATE_AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, buildMarkdown(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01AudioTtsManifest = rel(MANIFEST_PATH);
    state.lesson01AudioTtsManifestGateAudit = rel(GATE_AUDIT_PATH);
    state.lesson01AudioTtsManifestSummary = audit.summary;
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(MANIFEST_PATH)} slots=${slots.length} generated=0 checksum=0`);
  if (audit.status === 'BLOCK') process.exitCode = 1;
}

main();
