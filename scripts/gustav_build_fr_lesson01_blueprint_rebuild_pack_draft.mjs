import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CANDIDATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review', 'lesson01_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson01_blueprint_rebuild_review_gate_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const RU_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_uk_pack_draft_v1.json');
const CONTRACT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_contract_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_LOCALES = ['ru', 'uk'];

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

function packRows(candidate, reviewGate, sourceLocale) {
  const acceptedById = new Map((reviewGate.rowDecisions ?? []).map((row) => [row.rowId, row]));
  return candidate.rows.map((row) => {
    const decision = acceptedById.get(row.id);
    return {
      phraseId: row.id,
      lessonId: 1,
      rowNumber: row.order,
      studyTarget: 'fr',
      targetContentLang: 'fr',
      sourceLocale,
      appCourseLevel: candidate.appCourseLevel,
      internalFrenchBand: candidate.internalFrenchBand,
      phraseFr: row.phraseFr,
      sourceMeaning: sourceLocale === 'ru' ? row.meaningRu : row.meaningUk,
      wordsFr: row.wordsFr,
      sourceEvidenceIds: row.sourceEvidenceIds,
      reviewDecision: decision?.decision ?? 'MISSING',
      reviewDecisionGatePath: rel(REVIEW_GATE_PATH),
      acceptedForProduction: false,
    };
  });
}

function buildPack(candidate, reviewGate, sourceLocale) {
  const rows = packRows(candidate, reviewGate, sourceLocale);
  return {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-pack-draft-v1',
    generatedAt: new Date().toISOString(),
    status: 'PACK_DRAFT_HOLD_REVIEWED_LOCAL_ONLY',
    packId: `fr.${sourceLocale}.lesson01.blueprint_rebuild_v1.reviewed.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface: 'lesson',
    lessonId: 1,
    appCourseLevel: candidate.appCourseLevel,
    internalFrenchBand: candidate.internalFrenchBand,
    contentVersion: 'fr-lesson01-blueprint-rebuild-v1.reviewed.pending',
    sourceCandidatePath: rel(CANDIDATE_PATH),
    sourceReviewGatePath: rel(REVIEW_GATE_PATH),
    rows,
    counts: {
      rows: rows.length,
      wordsFrSlots: rows.reduce((sum, row) => sum + row.wordsFr.length, 0),
      distractorSlots: rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, word) => inner + word.distractors.length, 0), 0),
    },
    safety: {
      packDraftOnly: true,
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
  const blockers = [];
  if (pack.rows.length !== 50) blockers.push(`${pack.sourceLocale}_PACK_ROWS_NOT_50`);
  if (pack.counts.wordsFrSlots < 150) blockers.push(`${pack.sourceLocale}_WORDS_FR_SLOTS_TOO_LOW`);
  if (pack.counts.distractorSlots < 750) blockers.push(`${pack.sourceLocale}_DISTRACTOR_SLOTS_TOO_LOW`);
  if (pack.rows.some((row) => row.studyTarget !== 'fr' || row.targetContentLang !== 'fr')) blockers.push(`${pack.sourceLocale}_LANGUAGE_CONTRACT_BROKEN`);
  if (pack.rows.some((row) => row.sourceLocale !== pack.sourceLocale)) blockers.push(`${pack.sourceLocale}_SOURCE_LOCALE_MISMATCH`);
  if (pack.rows.some((row) => hasSourceLocaleLeak(row.phraseFr))) blockers.push(`${pack.sourceLocale}_SOURCE_LOCALE_LEAK_IN_TARGET_PHRASE`);
  if (pack.rows.some((row) => hasMojibake(row.phraseFr) || hasMojibake(row.sourceMeaning))) blockers.push(`${pack.sourceLocale}_MOJIBAKE_DETECTED`);
  if (pack.rows.some((row) => row.reviewDecision !== 'ACCEPT')) blockers.push(`${pack.sourceLocale}_NON_ACCEPTED_REVIEW_ROW`);
  if (pack.safety.serverUploadAllowed || pack.safety.runtimeDownloadsEnabled || pack.safety.activationApproved) blockers.push(`${pack.sourceLocale}_PRODUCTION_FLAG_OPENED`);
  return blockers;
}

function markdownFor(audit, ruPack, ukPack) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Pack Draft',
    '',
    `Status: ${audit.status}`,
    `Rows per pack: ${audit.summary.rowsPerPack}`,
    `wordsFr slots per pack: ${audit.summary.wordsFrSlotsPerPack}`,
    '',
    '## Packs',
    '',
    `- RU: ${rel(RU_PACK_PATH)}`,
    `- UK: ${rel(UK_PACK_PATH)}`,
    '',
    '## Sample Rows',
    '',
    '| # | FR | RU | UK |',
    '|---:|---|---|---|',
    ...ruPack.rows.slice(0, 8).map((row, index) => `| ${row.rowNumber} | ${row.phraseFr} | ${row.sourceMeaning} | ${ukPack.rows[index].sourceMeaning} |`),
    '',
    '## Production Blockers',
    '',
    ...audit.productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const candidate = readJson(CANDIDATE_PATH);
  const reviewGate = readJson(REVIEW_GATE_PATH);
  const blockers = [];

  if (candidate.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-candidate-v1') blockers.push('CANDIDATE_SCHEMA_MISMATCH');
  if (reviewGate.status !== 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE') blockers.push('REVIEW_GATE_NOT_PASS');
  if (reviewGate.summary?.acceptedRows !== 50 || reviewGate.summary?.revisionRows !== 0) blockers.push('REVIEW_GATE_NOT_50_ACCEPTED');
  if (candidate.activationApproved || candidate.readyForApply) blockers.push('CANDIDATE_ACTIVATION_OR_APPLY_OPENED');

  const ruPack = buildPack(candidate, reviewGate, 'ru');
  const ukPack = buildPack(candidate, reviewGate, 'uk');
  const packBlockers = [...validatePack(ruPack), ...validatePack(ukPack)];
  blockers.push(...packBlockers);

  writeJson(RU_PACK_PATH, ruPack);
  writeJson(UK_PACK_PATH, ukPack);

  const contract = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-pack-draft-contract-v1',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'PACK_DRAFT_READY_FOR_THEORY_AUDIO_SERVER_GATES' : 'BLOCK_PACK_DRAFT_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    sourceCandidate: {
      path: rel(CANDIDATE_PATH),
      sha256: sha256File(CANDIDATE_PATH),
    },
    reviewGate: {
      path: rel(REVIEW_GATE_PATH),
      sha256: sha256File(REVIEW_GATE_PATH),
      status: reviewGate.status,
    },
    packDrafts: {
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
      'lesson01_blueprint_rebuild_theory_pack_gate',
      'lesson01_blueprint_rebuild_audio_tts_manifest_gate',
      'lesson01_blueprint_rebuild_server_pack_manifest_gate',
      'lesson01_blueprint_rebuild_runtime_delivery_gate',
      'lesson01_activation_gate_after_full_32_lesson_parity',
    ],
    safety: {
      packDraftOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(CONTRACT_PATH, contract);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-pack-draft-audit-v1',
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'PASS_PACK_DRAFT_WRITTEN' : 'BLOCK_PACK_DRAFT_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    contract: rel(CONTRACT_PATH),
    blockers,
    summary: {
      packDrafts: 2,
      rowsPerPack: ruPack.rows.length,
      wordsFrSlotsPerPack: ruPack.counts.wordsFrSlots,
      distractorSlotsPerPack: ruPack.counts.distractorSlots,
      ruPackSha256: sha256File(RU_PACK_PATH),
      ukPackSha256: sha256File(UK_PACK_PATH),
      readyForTheoryAudioServerGates: blockers.length === 0,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    productionBlockers: [
      'THEORY_PACK_NOT_MATERIALIZED',
      'AUDIO_TTS_NOT_GENERATED',
      'SERVER_UPLOAD_NOT_ALLOWED',
      'RUNTIME_DELIVERY_NOT_ENABLED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: contract.safety,
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit, ruPack, ukPack), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildPackDraftContract = rel(CONTRACT_PATH);
    state.lesson01BlueprintRebuildPackDraftAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildPackDraftStatus = audit.status;
    state.lesson01BlueprintRebuildPackDraftSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 blueprint rebuild theory/vocabulary parity pack.',
      'Create Lesson 1 audio/TTS manifest from reviewed pack draft, still with generation closed.',
      'Then start Lesson 2 blueprint-first rebuild using the accepted Lesson 1 pattern.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} rows=${audit.summary.rowsPerPack} words=${audit.summary.wordsFrSlotsPerPack} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
