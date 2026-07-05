import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DRAFT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_full_review_draft.json');
const DECISION_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decision_gate_audit_v1.json');
const DECISIONS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_review_draft_llm_decisions_v1.jsonl');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01');
const RU_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_ru_pack_candidate_v1.json');
const UK_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_uk_pack_candidate_v1.json');
const CONTRACT_PATH = path.join(OUT_DIR, 'fr_lesson01_pack_candidate_contract_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_pack_candidate_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_pack_candidate_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];

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

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function buildRows(draft, sourceLocale) {
  return draft.rows.map((row) => ({
    phraseId: row.phraseId,
    lessonId: row.lessonId,
    rowNumber: row.rowNumber,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    appCourseLevel: draft.appCourseLevel,
    internalFrenchBand: draft.internalFrenchBand,
    phraseFr: row.french,
    sourceMeaning: sourceLocale === 'ru' ? row.russian : row.ukrainian,
    wordsFr: row.wordsFr,
    sourceEvidenceIds: row.sourceEvidenceIds,
    reviewDecisionRequestId: `fr.lesson.01.review_draft.row.${String(row.rowNumber).padStart(2, '0')}.llm_source_review.v1`,
  }));
}

function buildPack(draft, sourceLocale, generatedAt) {
  const rows = buildRows(draft, sourceLocale);
  return {
    schemaVersion: 'gustav-fr-lesson-pack-candidate-v1',
    generatedAt,
    status: 'PACK_CANDIDATE_HOLD',
    packId: `fr.${sourceLocale}.lesson01.review_draft_v1_pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface: 'lesson',
    lessonId: 1,
    appCourseLevel: draft.appCourseLevel,
    internalFrenchBand: draft.internalFrenchBand,
    contentVersion: 'fr-lesson01-review-draft-v1.pending',
    sourceDraftPath: rel(DRAFT_PATH),
    sourceDecisionGatePath: rel(DECISION_GATE_PATH),
    rows,
    counts: {
      rows: rows.length,
      wordsFrSlots: rows.reduce((sum, row) => sum + row.wordsFr.length, 0),
    },
    safety: {
      packCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
}

function validatePack(pack) {
  const errors = [];
  if (pack.rows.length !== 50) errors.push(`${pack.sourceLocale}: expected 50 rows`);
  if (!SOURCE_LOCALES.includes(pack.sourceLocale)) errors.push(`${pack.sourceLocale}: invalid sourceLocale`);
  for (const row of pack.rows) {
    if (row.studyTarget !== 'fr' || row.targetContentLang !== 'fr') errors.push(`${row.phraseId}: language identity mismatch`);
    if (row.sourceLocale !== pack.sourceLocale) errors.push(`${row.phraseId}: sourceLocale mismatch`);
    if (hasCyrillic(row.phraseFr)) errors.push(`${row.phraseId}: Cyrillic leaked into French phrase`);
    if (hasMojibake(row.phraseFr) || hasMojibake(row.sourceMeaning)) errors.push(`${row.phraseId}: mojibake`);
    if (!row.sourceMeaning || row.sourceMeaning.length < 2) errors.push(`${row.phraseId}: missing source meaning`);
    if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 1) errors.push(`${row.phraseId}: missing wordsFr`);
    for (const word of row.wordsFr) {
      if (hasCyrillic(word.text) || hasCyrillic(word.correct)) errors.push(`${row.phraseId}: Cyrillic in wordsFr`);
      if (hasMojibake(word.text) || hasMojibake(word.correct)) errors.push(`${row.phraseId}: mojibake in wordsFr`);
      if (!Array.isArray(word.distractors) || word.distractors.length !== 5) errors.push(`${row.phraseId}:${word.text}: distractor count`);
    }
  }
  if (pack.safety.serverUploadAllowed || pack.safety.runtimeDownloadsEnabled || pack.safety.productionApplyApproved || pack.safety.activationApproved) {
    errors.push(`${pack.sourceLocale}: production flag opened`);
  }
  return errors;
}

function buildMarkdown(contract, audit) {
  const lines = [
    '# French Lesson 1 Pack Candidate',
    '',
    `Status: ${audit.status}`,
    `RU pack: ${contract.packCandidates.ru.path}`,
    `UK pack: ${contract.packCandidates.uk.path}`,
    '',
    '## Counts',
    '',
    `- rowsPerPack: ${audit.summary.rowsPerPack}`,
    `- wordsFrSlotsPerPack: ${audit.summary.wordsFrSlotsPerPack}`,
    '',
    '## Safety',
    '',
    `- appBundleModifiedByThisScript: ${contract.safety.appBundleModifiedByThisScript}`,
    `- serverUploadAllowed: ${contract.safety.serverUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${contract.safety.runtimeDownloadsEnabled}`,
    `- productionApplyApproved: ${contract.safety.productionApplyApproved}`,
    `- activationApproved: ${contract.safety.activationApproved}`,
    '',
    '## Next Gates',
    '',
    ...contract.nextRequiredGates.map((gate) => `- ${gate}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const draft = readJson(DRAFT_PATH);
  const decisionGate = readJson(DECISION_GATE_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const blockers = [];

  if (draft.schemaVersion !== 'gustav-fr-lesson01-full-review-draft-v2') blockers.push('draft schema mismatch');
  if (decisionGate.status !== 'PASS_READY_FOR_MATERIALIZATION_CONTRACT') blockers.push('decision gate not ready for materialization contract');
  if (decisions.length !== 50) blockers.push('expected 50 review decisions');
  if (decisions.some((decision) => decision.reviewerDecision !== 'accept_review_draft')) blockers.push('non-accepted review decisions present');

  const ruPack = buildPack(draft, 'ru', generatedAt);
  const ukPack = buildPack(draft, 'uk', generatedAt);
  const packErrors = [...validatePack(ruPack), ...validatePack(ukPack)];
  blockers.push(...packErrors);

  writeJson(RU_PACK_PATH, ruPack);
  writeJson(UK_PACK_PATH, ukPack);

  const contract = {
    schemaVersion: 'gustav-fr-lesson01-pack-candidate-contract-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PACK_CANDIDATE_READY_FOR_NEXT_GATES' : 'BLOCK',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    sourceDraft: {
      path: rel(DRAFT_PATH),
      sha256: sha256File(DRAFT_PATH),
    },
    decisionGate: {
      path: rel(DECISION_GATE_PATH),
      sha256: sha256File(DECISION_GATE_PATH),
      status: decisionGate.status,
    },
    packCandidates: {
      ru: {
        path: rel(RU_PACK_PATH),
        sha256: sha256File(RU_PACK_PATH),
      },
      uk: {
        path: rel(UK_PACK_PATH),
        sha256: sha256File(UK_PACK_PATH),
      },
    },
    nextRequiredGates: [
      'lesson01_pack_candidate_integrity_gate',
      'lesson01_theory_shape_materialization_gate',
      'lesson01_audio_tts_manifest_gate',
      'lesson01_server_pack_manifest_gate',
      'lesson01_runtime_delivery_gate',
      'lesson01_admin_visibility_gate',
      'lesson01_activation_gate_after_full_course_parity',
    ],
    safety: {
      packCandidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-pack-candidate-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_PACK_CANDIDATE_WRITTEN' : 'BLOCK',
    blockers,
    summary: {
      packCandidates: 2,
      rowsPerPack: ruPack.rows.length,
      wordsFrSlotsPerPack: ruPack.counts.wordsFrSlots,
      ruPackSha256: contract.packCandidates.ru.sha256,
      ukPackSha256: contract.packCandidates.uk.sha256,
      readyForNextGates: blockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
  };

  writeJson(CONTRACT_PATH, contract);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, buildMarkdown(contract, audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01PackCandidateContract = rel(CONTRACT_PATH);
    state.lesson01PackCandidateAudit = rel(AUDIT_PATH);
    state.lesson01PackCandidateSummary = audit.summary;
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} ${rel(CONTRACT_PATH)} packs=2 rows=${ruPack.rows.length} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
