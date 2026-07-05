import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LESSON_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');

const RU_PACK_PATH = path.join(LESSON_DIR, 'fr_lesson01_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(LESSON_DIR, 'fr_lesson01_uk_pack_candidate_v1.json');
const PACK_CONTRACT_PATH = path.join(LESSON_DIR, 'fr_lesson01_pack_candidate_contract_v1.json');
const PACK_AUDIT_PATH = path.join(LESSON_DIR, 'fr_lesson01_pack_candidate_audit_v1.json');
const THEORY_PATH = path.join(LESSON_DIR, 'fr_lesson01_theory_candidate_v1.json');
const THEORY_AUDIT_PATH = path.join(LESSON_DIR, 'fr_lesson01_theory_materialization_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson01_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_audio_tts_manifest_gate_audit_v1.json');
const REVIEW_DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decisions_v1.jsonl');
const REVIEW_DECISION_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.json');
const OUT_AUDIT_PATH = path.join(LESSON_DIR, 'fr_lesson01_integrity_gate_audit_v1.json');
const OUT_MD_PATH = path.join(LESSON_DIR, 'fr_lesson01_integrity_gate_audit_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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

function productionFlagOpened(value) {
  return Boolean(
    value?.activationApproved ||
    value?.productionApplyApproved ||
    value?.readyForApply ||
    value?.readyForServerUpload ||
    value?.readyForRuntimeDelivery ||
    value?.runtimeDownloadsEnabled ||
    value?.serverUploadAllowed ||
    value?.firebaseUploadAllowed ||
    value?.downloadablePacksPublished
  );
}

function inspectPack(pack, sourceLocale) {
  const errors = [];
  if (pack.schemaVersion !== 'gustav-fr-lesson-pack-candidate-v1') errors.push(`${sourceLocale}: schema mismatch`);
  if (pack.status !== 'PACK_CANDIDATE_HOLD') errors.push(`${sourceLocale}: status must remain PACK_CANDIDATE_HOLD`);
  if (pack.studyTarget !== 'fr' || pack.targetContentLang !== 'fr') errors.push(`${sourceLocale}: language identity mismatch`);
  if (pack.sourceLocale !== sourceLocale) errors.push(`${sourceLocale}: sourceLocale mismatch`);
  if (pack.rows?.length !== 50) errors.push(`${sourceLocale}: expected 50 rows`);
  if (productionFlagOpened(pack.safety)) errors.push(`${sourceLocale}: safety production flag opened`);
  for (const row of pack.rows ?? []) {
    if (row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') errors.push(`${row.phraseId}: row language identity mismatch`);
    if (row.sourceLocale !== sourceLocale) errors.push(`${row.phraseId}: row sourceLocale mismatch`);
    if (row.lessonId !== 1 || row.appCourseLevel !== 'A1') errors.push(`${row.phraseId}: lesson/app level mismatch`);
    if (hasCyrillic(row.phraseFr) || hasMojibake(row.phraseFr) || hasMojibake(row.sourceMeaning)) {
      errors.push(`${row.phraseId}: text encoding/language leak`);
    }
    if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 1) errors.push(`${row.phraseId}: missing wordsFr`);
  }
  return errors;
}

function main() {
  const generatedAt = new Date().toISOString();
  const ruPack = readJson(RU_PACK_PATH);
  const ukPack = readJson(UK_PACK_PATH);
  const packContract = readJson(PACK_CONTRACT_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const theory = readJson(THEORY_PATH);
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const audioManifest = readJson(AUDIO_MANIFEST_PATH);
  const audioAudit = readJson(AUDIO_AUDIT_PATH);
  const decisions = readJsonl(REVIEW_DECISIONS_PATH);
  const reviewDecisionGate = readJson(REVIEW_DECISION_GATE_PATH);
  const blockers = [];
  const warnings = [];

  if (packAudit.status !== 'PASS_PACK_CANDIDATE_WRITTEN') blockers.push('pack_candidate_audit_not_pass');
  if (theoryAudit.status !== 'PASS_THEORY_CANDIDATE_WRITTEN') blockers.push('theory_audit_not_pass');
  if (reviewDecisionGate.status !== 'PASS_READY_FOR_MATERIALIZATION_CONTRACT') blockers.push('review_decision_gate_not_pass');
  if (packContract.packCandidates?.ru?.sha256 !== sha256File(RU_PACK_PATH)) blockers.push('ru_pack_sha_mismatch');
  if (packContract.packCandidates?.uk?.sha256 !== sha256File(UK_PACK_PATH)) blockers.push('uk_pack_sha_mismatch');

  blockers.push(...inspectPack(ruPack, 'ru'), ...inspectPack(ukPack, 'uk'));

  const ruRowsById = new Map(ruPack.rows.map((row) => [row.phraseId, row]));
  const ukRowsById = new Map(ukPack.rows.map((row) => [row.phraseId, row]));
  for (const [phraseId, ruRow] of ruRowsById) {
    const ukRow = ukRowsById.get(phraseId);
    if (!ukRow) {
      blockers.push(`${phraseId}: missing in UK pack`);
      continue;
    }
    if (ruRow.phraseFr !== ukRow.phraseFr) blockers.push(`${phraseId}: French phrase differs between source locales`);
    if (JSON.stringify(ruRow.wordsFr) !== JSON.stringify(ukRow.wordsFr)) blockers.push(`${phraseId}: wordsFr differs between source locales`);
    if (ruRow.reviewDecisionRequestId !== ukRow.reviewDecisionRequestId) blockers.push(`${phraseId}: reviewDecisionRequestId differs`);
  }

  const acceptedDecisionIds = new Set();
  for (const decision of decisions) {
    if (decision.reviewerDecision !== 'accept_review_draft') blockers.push(`${decision.requestId}: non-accepted review decision`);
    if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) {
      blockers.push(`${decision.requestId}: review decision opened production flag`);
    }
    acceptedDecisionIds.add(decision.requestId);
  }
  if (decisions.length !== 50 || acceptedDecisionIds.size !== 50) blockers.push('expected_50_unique_accepted_review_decisions');
  for (const row of ruPack.rows) {
    if (!acceptedDecisionIds.has(row.reviewDecisionRequestId)) blockers.push(`${row.phraseId}: missing accepted review decision`);
  }

  if (theory.schemaVersion !== 'gustav-fr-lesson01-theory-candidate-v1') blockers.push('theory_schema_mismatch');
  if (theory.sections?.length !== 7) blockers.push('theory_expected_7_sections');
  if (theoryAudit.summary?.blocks !== 21) blockers.push('theory_expected_21_blocks');
  if (productionFlagOpened(theory.safety) || productionFlagOpened(theoryAudit.summary)) blockers.push('theory_production_flag_opened');
  if (hasMojibake(JSON.stringify(theory))) blockers.push('theory_mojibake_detected');

  const audioSlots = audioManifest.slots ?? [];
  if (audioManifest.schemaVersion !== 'gustav-fr-lesson01-audio-tts-manifest-v1') blockers.push('audio_manifest_schema_mismatch');
  if (audioSlots.length !== 100) blockers.push('audio_expected_100_source_locale_slots');
  if (audioAudit.status !== 'HOLD_AUDIO_TTS_NOT_GENERATED') warnings.push('audio_gate_status_not_expected_hold');
  if (audioAudit.summary?.generatedSlots !== 0 || audioAudit.summary?.checksumReadySlots !== 0) blockers.push('audio_slots_unexpectedly_generated_without_checksum_gate');
  if (productionFlagOpened(audioManifest.safety) || productionFlagOpened(audioAudit.summary) || productionFlagOpened(audioAudit.safety)) {
    blockers.push('audio_production_flag_opened');
  }
  const uniqueAudioPhraseTexts = new Set(audioSlots.map((slot) => `${slot.phraseId}:${slot.textForTts}`));
  if (uniqueAudioPhraseTexts.size !== 50) blockers.push('audio_expected_50_unique_target_phrase_texts');
  for (const locale of SOURCE_LOCALES) {
    const pack = locale === 'ru' ? ruPack : ukPack;
    const slots = audioSlots.filter((slot) => slot.sourceLocale === locale);
    if (slots.length !== 50) blockers.push(`audio_expected_50_${locale}_slots`);
    const slotByPhraseId = new Map(slots.map((slot) => [slot.phraseId, slot]));
    for (const row of pack.rows) {
      const slot = slotByPhraseId.get(row.phraseId);
      if (!slot) {
        blockers.push(`${row.phraseId}: missing ${locale} audio slot`);
        continue;
      }
      if (slot.textForTts !== row.phraseFr) blockers.push(`${row.phraseId}: ${locale} audio text differs from pack`);
      if (slot.sourceMeaning !== row.sourceMeaning) blockers.push(`${row.phraseId}: ${locale} audio source meaning differs from pack`);
      if (!String(slot.expectedAudioPath || '').startsWith(`course-packs/fr/${locale}/audio/lesson01/`)) {
        blockers.push(`${row.phraseId}: ${locale} audio path not source-locale scoped`);
      }
      if (slot.audioGenerated || slot.checksumReady || slot.localAudioPath || slot.sha256 || Number(slot.byteSize) !== 0) {
        blockers.push(`${row.phraseId}: ${locale} audio readiness opened`);
      }
    }
  }

  const structuralPass = blockers.length === 0;
  const productionBlockers = [
    'blocked_pending_openai_tts_generation_and_checksum',
    'blocked_pending_lesson01_server_pack_manifest_gate',
    'blocked_pending_lesson01_runtime_delivery_gate',
    'blocked_pending_admin_visibility_and_activation_gates',
    'blocked_until_full_32_lesson_course_parity',
  ];

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-integrity-gate-audit-v1',
    generatedAt,
    status: structuralPass ? 'PASS_INTEGRITY_WITH_AUDIO_HOLD' : 'BLOCK',
    blockers,
    warnings,
    productionBlockers,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: 1,
    appCourseLevel: 'A1',
    sourceLocales: SOURCE_LOCALES,
    inputs: {
      ruPack: { path: rel(RU_PACK_PATH), sha256: sha256File(RU_PACK_PATH) },
      ukPack: { path: rel(UK_PACK_PATH), sha256: sha256File(UK_PACK_PATH) },
      theory: { path: rel(THEORY_PATH), sha256: sha256File(THEORY_PATH) },
      audioManifest: { path: rel(AUDIO_MANIFEST_PATH), sha256: sha256File(AUDIO_MANIFEST_PATH) },
      reviewDecisionGate: { path: rel(REVIEW_DECISION_GATE_PATH), sha256: sha256File(REVIEW_DECISION_GATE_PATH) },
    },
    summary: {
      ruRows: ruPack.rows.length,
      ukRows: ukPack.rows.length,
      acceptedReviewDecisions: acceptedDecisionIds.size,
      theorySections: theory.sections.length,
      theoryBlocks: theoryAudit.summary?.blocks,
      audioSlots: audioSlots.length,
      uniqueAudioPhraseTexts: uniqueAudioPhraseTexts.size,
      generatedAudioSlots: audioAudit.summary?.generatedSlots,
      checksumReadySlots: audioAudit.summary?.checksumReadySlots,
      structuralIntegrityReady: structuralPass,
      readyForAudioGeneration: structuralPass,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    safety: {
      readOnlyGate: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(OUT_AUDIT_PATH, audit);
  const markdown = [
    '# French Lesson 1 Integrity Gate',
    '',
    `Status: ${audit.status}`,
    `Rows: RU ${audit.summary.ruRows}, UK ${audit.summary.ukRows}`,
    `Accepted review decisions: ${audit.summary.acceptedReviewDecisions}`,
    `Theory: ${audit.summary.theorySections} sections, ${audit.summary.theoryBlocks} blocks`,
    `Audio: ${audit.summary.audioSlots} slots, generated ${audit.summary.generatedAudioSlots}, checksum ${audit.summary.checksumReadySlots}`,
    '',
    '## Production Blockers',
    '',
    ...productionBlockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- serverUploadAllowed: ${audit.safety.serverUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ].join('\n');
  fs.writeFileSync(OUT_MD_PATH, `${markdown}\n`, 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01IntegrityGateAudit = rel(OUT_AUDIT_PATH);
    state.lesson01IntegrityGateStatus = audit.status;
    state.lesson01IntegrityGateSummary = audit.summary;
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(OUT_AUDIT_PATH)} rows=${audit.summary.ruRows}/${audit.summary.ukRows} audio=${audit.summary.generatedAudioSlots}/${audit.summary.audioSlots} blockers=${blockers.length}`);
  if (audit.status === 'BLOCK') process.exitCode = 1;
}

main();
