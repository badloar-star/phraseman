import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const BANK_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_v1.json');
const BANK_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_gate_v1.json');
const OUT_TAXONOMY = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_v1.json');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_gate_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_v1.md');

const EXPECTED_ROWS = 56;

const FAMILY_RULES = [
  ['article', 'articles_determiners'],
  ['determiner', 'articles_determiners'],
  ['quantifier', 'articles_determiners'],
  ['preposition', 'prepositions_relations'],
  ['pronoun', 'pronouns_objects'],
  ['object_order', 'pronouns_objects'],
  ['verb_', 'verbs_tense_aspect'],
  ['present_perfect', 'verbs_tense_aspect'],
  ['past_', 'verbs_tense_aspect'],
  ['used_to', 'verbs_tense_aspect'],
  ['future_', 'verbs_tense_aspect'],
  ['modal', 'modality_obligation_probability'],
  ['to_be', 'core_verbs_agreement'],
  ['there_is_are', 'core_verbs_agreement'],
  ['word_order', 'syntax_questions_order'],
  ['question', 'syntax_questions_order'],
  ['imperative', 'syntax_mood_clauses'],
  ['condition', 'syntax_mood_clauses'],
  ['relative', 'syntax_mood_clauses'],
  ['reported', 'syntax_mood_clauses'],
  ['adjective', 'adjectives_adverbs'],
  ['adverb', 'adjectives_adverbs'],
  ['modifier', 'adjectives_adverbs'],
  ['conjunction', 'connectors_discourse'],
  ['phrasal_particle', 'idiomatic_verb_patterns'],
  ['noun_', 'nouns_gender_number_possession'],
];

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

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function familyFor(row) {
  const haystack = `${row.sourceEnglishTrainingId} ${row.frenchTrainingId}`.toLowerCase();
  const match = FAMILY_RULES.find(([needle]) => haystack.includes(needle));
  return match?.[1] ?? 'general_french_accuracy';
}

function promptIds(row) {
  return (row.mistakeTaxonomyIds ?? []).filter((id) => id.startsWith('fr_prompt_'));
}

function mistakeIds(row) {
  return (row.mistakeTaxonomyIds ?? []).filter((id) => id.startsWith('fr_mistake_'));
}

function buildRow(row) {
  const mistakes = mistakeIds(row);
  const prompts = promptIds(row);
  return {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-row-v1',
    taxonomyIndex: row.slotIndex,
    sourceNativeBankSlotIndex: row.slotIndex,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    appLevel: row.appLevel,
    cefr: row.cefr,
    frenchTrainingId: row.frenchTrainingId,
    sourceEnglishTrainingId: row.sourceEnglishTrainingId,
    frenchSkillName: row.frenchSkillName,
    contrastSet: row.contrastSet,
    mistakeId: mistakes[0] ?? '',
    promptIds: prompts,
    mistakeFamily: familyFor(row),
    diagnosisSignal: {
      signalType: 'french_native_skill_gap',
      targetAnswerLanguage: 'fr',
      learnerVisibleExplanationLocales: ['ru', 'uk'],
      sourceEnglishIdUsedAsShapeOnly: true,
    },
    feedbackContract: {
      answerLanguage: 'fr',
      explanationLocales: ['ru', 'uk'],
      mustKeepRuUkExplanationsSeparate: true,
      mustKeepTargetAnswersFrenchOnly: true,
      mustNotUseEnglishAsFallbackContent: true,
      mustCiteTrustedSourceIds: true,
    },
    sourceEvidenceIds: row.sourceEvidenceIds,
    reviewStatus: 'candidate_requires_llm_trusted_source_review',
    safety: {
      candidateOnly: true,
      appBundleModified: false,
      serverUploadAllowed: false,
      runtimeApplyAllowed: false,
      activationApproved: false,
    },
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const bank = readJson(BANK_PATH);
  const bankAudit = readJson(BANK_AUDIT_PATH);
  const blockers = [];

  if (bank.status !== 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW') blockers.push('NATIVE_BANK_NOT_READY');
  if (bankAudit.summary?.readyForLlmTrustedSourceReview !== true) blockers.push('NATIVE_BANK_GATE_NOT_READY');
  if (!Array.isArray(bank.rows) || bank.rows.length !== EXPECTED_ROWS) blockers.push('NATIVE_BANK_ROW_COUNT_INVALID');

  const rows = (bank.rows ?? []).map(buildRow);
  const duplicateMistakeIds = rows.length - new Set(rows.map((row) => row.mistakeId)).size;
  const promptIdList = rows.flatMap((row) => row.promptIds);
  const duplicatePromptIds = promptIdList.length - new Set(promptIdList).size;
  const rowsWithMissingBankLink = rows.filter((row) => row.sourceNativeBankSlotIndex < 1 || row.taxonomyIndex !== row.sourceNativeBankSlotIndex).length;
  const rowsWithMissingMistakeId = rows.filter((row) => !row.mistakeId).length;
  const rowsWithMissingRuPromptId = rows.filter((row) => !row.promptIds.some((id) => id.endsWith('_ru'))).length;
  const rowsWithMissingUkPromptId = rows.filter((row) => !row.promptIds.some((id) => id.endsWith('_uk'))).length;
  const rowsWithEnglishIdReuse = rows.filter((row) => row.frenchTrainingId === row.sourceEnglishTrainingId || row.mistakeId === row.sourceEnglishTrainingId).length;
  const rowsWithUnsafeFlags = rows.filter((row) =>
    row.safety.appBundleModified ||
    row.safety.serverUploadAllowed ||
    row.safety.runtimeApplyAllowed ||
    row.safety.activationApproved,
  ).length;
  const familyCounts = rows.reduce((acc, row) => {
    acc[row.mistakeFamily] = (acc[row.mistakeFamily] || 0) + 1;
    return acc;
  }, {});

  if (rows.length !== EXPECTED_ROWS) blockers.push('EXPECTED_56_TAXONOMY_ROWS');
  if (duplicateMistakeIds > 0) blockers.push('DUPLICATE_MISTAKE_IDS');
  if (duplicatePromptIds > 0) blockers.push('DUPLICATE_PROMPT_IDS');
  if (rowsWithMissingBankLink > 0) blockers.push('ROWS_MISSING_NATIVE_BANK_LINK');
  if (rowsWithMissingMistakeId > 0) blockers.push('ROWS_MISSING_MISTAKE_ID');
  if (rowsWithMissingRuPromptId > 0) blockers.push('ROWS_MISSING_RU_PROMPT_ID');
  if (rowsWithMissingUkPromptId > 0) blockers.push('ROWS_MISSING_UK_PROMPT_ID');
  if (rowsWithEnglishIdReuse > 0) blockers.push('ROWS_REUSE_ENGLISH_IDS_AS_FRENCH_TAXONOMY');
  if (rowsWithUnsafeFlags > 0) blockers.push('ROWS_OPENED_RUNTIME_OR_ACTIVATION_FLAGS');

  const taxonomy = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-candidate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    rule: 'French mistake taxonomy is derived from the French-native bank candidate. English ids remain product-shape evidence only.',
    rows,
    safety: {
      candidateOnly: true,
      appBundleModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      serverUploadAllowed: false,
      runtimeApplyAllowed: false,
      adminWritesOpened: false,
      audioGenerated: false,
      activationApproved: false,
    },
  };
  writeJson(OUT_TAXONOMY, taxonomy);

  const audit = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-candidate-gate-v1',
    generatedAt,
    status: taxonomy.status,
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      nativeBankCandidate: rel(BANK_PATH),
      nativeBankCandidateGate: rel(BANK_AUDIT_PATH),
    },
    outputs: {
      mistakeTaxonomyCandidate: rel(OUT_TAXONOMY),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
    },
    hashes: {
      nativeBankCandidateSha256: sha256(BANK_PATH),
      mistakeTaxonomyCandidateSha256: sha256(OUT_TAXONOMY),
    },
    summary: {
      bankRows: bank.rows?.length ?? 0,
      taxonomyRows: rows.length,
      duplicateMistakeIds,
      duplicatePromptIds,
      rowsWithMissingBankLink,
      rowsWithMissingMistakeId,
      rowsWithMissingRuPromptId,
      rowsWithMissingUkPromptId,
      rowsWithEnglishIdReuse,
      rowsWithUnsafeFlags,
      familyCounts,
      readyForLlmTrustedSourceReview: blockers.length === 0,
      readyForImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    },
    blockers,
    productionHoldsRemaining: [
      'french_personal_practice_mistake_taxonomy_llm_review',
      'french_pos_workout_profile_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ],
    safety: taxonomy.safety,
    nextRequiredGates: [
      'build_llm_review_requests_for_personal_practice_mistake_taxonomy',
      'run_llm_trusted_source_review_for_personal_practice_mistake_taxonomy',
      'personal_practice_mistake_taxonomy_import_dry_run',
      'problem_coach_prompt_ru_uk_contract_review',
      'server_pack_runtime_admin_activation_gates',
    ],
  };
  writeJson(OUT_AUDIT, audit);

  const md = [
    '# French Personal Practice Mistake Taxonomy Candidate',
    '',
    `Status: ${audit.status}`,
    '',
    `Rows: ${rows.length}`,
    `Activation approved: ${audit.activationApproved}`,
    '',
    '## What This Is',
    '',
    'A French-native mistake taxonomy candidate for the 56 personal-practice diagnosis slots. It binds each French training slot to a French mistake id, separate RU/UK prompt ids, trusted source evidence, and closed runtime/apply safety flags.',
    '',
    '## Remaining Holds',
    '',
    ...audit.productionHoldsRemaining.map((item) => `- ${item}`),
    '',
  ].join('\n');
  fs.writeFileSync(OUT_MD, `${md}\n`, 'utf8');

  console.log(`${audit.status} ${rel(OUT_AUDIT)} rows=${rows.length} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
