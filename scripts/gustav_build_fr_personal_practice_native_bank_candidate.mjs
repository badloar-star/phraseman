import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const IDS_PATH = path.join(ROOT, 'app', 'personal_practice_training_ids.ts');
const TRUSTED_SOURCES_PATH = path.join(ROOT, 'docs', 'gustav', 'trusted_sources', 'fr_trusted_sources.json');
const OUT_BANK = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_v1.json');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_gate_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_native_bank_candidate_v1.md');

const EXPECTED_ROWS = 56;
const REQUIRED_SOURCE_IDS = [
  'coe_cefr_companion_2020',
  'tv5monde_grammar',
  'le_robert_dictionary',
  'le_robert_conjugation',
  'cambridge_french_english_dictionary',
];

const FOCUS_BY_ENGLISH_ID = {
  article_a_an: ['partitive_indefinite_articles', 'Articles indéfinis et partitifs', 'un/une/des/du/de la/de l’', 'A1'],
  article_the_specific: ['definite_articles_gender_number', 'Articles définis', 'le/la/les/l’ with gender and number', 'A1'],
  article_zero: ['de_after_negation_and_quantities', 'De après négation et quantités', 'pas de, beaucoup de, assez de', 'A2'],
  preposition_time_in_on_at: ['time_prepositions_a_en_depuis_pendant', 'Prépositions de temps', 'à/en/depuis/pendant/pour', 'A2'],
  preposition_place_in_on_at: ['place_prepositions_a_en_dans_sur_chez', 'Prépositions de lieu', 'à/en/dans/sur/chez', 'A1'],
  preposition_time_place: ['time_place_preposition_contrast', 'Contrastes temps/lieu', 'à/en/dans/sur/chez/depuis', 'A2'],
  preposition_duration_for_since: ['duration_depuis_pendant_pour_il_y_a', 'Durée et point de départ', 'depuis/pendant/pour/il y a', 'A2'],
  preposition_direction_to_into_from: ['direction_a_de_en_vers_chez', 'Direction et origine', 'à/de/en/vers/chez', 'A2'],
  preposition_direction: ['movement_prepositions_and_contractions', 'Mouvement et contractions', 'au/aux/du/des/vers', 'A2'],
  preposition_common_verb_patterns: ['verb_preposition_patterns', 'Verbes à préposition', 'penser à, avoir besoin de, parler de', 'B1'],
  object_order_give_me_it: ['object_pronoun_order', 'Ordre des pronoms compléments', 'me/te/lui/le/la/y/en', 'B1'],
  word_order_basic_statement: ['basic_svo_and_adverb_position', 'Ordre de base et adverbes', 'Sujet-verbe-objet; souvent/déjà', 'A1'],
  word_order_basic_question: ['question_forms_est_ce_que_inversion', 'Questions françaises', 'intonation, est-ce que, inversion', 'A1'],
  imperative_basic: ['imperative_tu_vous_nous', 'Impératif', 'écoute, écoutez, allons', 'A2'],
  condition_zero_first: ['si_present_future_present', 'Hypothèses réelles avec si', 'si + présent, futur/présent/impératif', 'B1'],
  condition_second_basic: ['si_imparfait_conditionnel', 'Hypothèses irréelles', 'si + imparfait, conditionnel', 'B1'],
  relative_clauses_who_which_that: ['relative_pronouns_qui_que_ou_dont', 'Pronoms relatifs', 'qui/que/où/dont', 'B1'],
  reported_speech_basic: ['reported_speech_and_tense_sequence', 'Discours rapporté', 'dire que, demander si, concordance simple', 'B1'],
  verb_present_simple_negative_question: ['present_negation_questions', 'Présent, négation, questions', 'ne...pas, est-ce que, inversion', 'A1'],
  verb_present_continuous_basic: ['present_progressive_etre_en_train_de', 'Action en cours', 'être en train de vs présent simple', 'A2'],
  verb_present_simple_vs_continuous: ['present_vs_etre_en_train_de', 'Présent habituel ou action en cours', 'présent vs être en train de', 'A2'],
  verb_past_simple_regular_irregular: ['passe_compose_auxiliary_participle', 'Passé composé', 'avoir/être + participe passé', 'A2'],
  verb_past_simple_negative_question: ['passe_compose_negation_questions', 'Passé composé négatif/interrogatif', 'ne...pas autour de l’auxiliaire', 'A2'],
  verb_present_perfect_basic: ['passe_compose_life_experience', 'Expérience passée', 'déjà/jamais + passé composé', 'A2'],
  present_perfect_vs_past_simple: ['passe_compose_vs_imparfait_intro', 'Passé composé ou imparfait', 'événement vs contexte/habitude', 'B1'],
  present_perfect_questions_negatives: ['passe_compose_questions_negatives', 'Questions et négations au passé composé', 'as-tu, n’ai pas, jamais', 'A2'],
  present_perfect_for_since: ['depuis_with_present_and_past', 'Depuis avec présent/passé', 'je vis ici depuis...', 'A2'],
  past_continuous_basic: ['imparfait_background_actions', 'Imparfait de contexte', 'je faisais, il pleuvait', 'A2'],
  past_simple_vs_past_continuous: ['passe_compose_vs_imparfait_narration', 'Récit au passé', 'action ponctuelle vs arrière-plan', 'B1'],
  used_to_basic: ['imparfait_habitual_past', 'Habitudes passées', 'quand j’étais petit...', 'A2'],
  future_present_continuous_arrangements: ['near_future_and_present_arrangements', 'Futur proche et rendez-vous', 'aller + infinitif; présent planifié', 'A2'],
  verb_was_were: ['etre_imparfait_agreement', 'Être à l’imparfait', 'j’étais, tu étais, ils étaient', 'A2'],
  future_will_going_to: ['future_simple_vs_futur_proche', 'Futur simple ou futur proche', 'je partirai vs je vais partir', 'B1'],
  infinitive_vs_gerund_basic: ['infinitive_after_prepositions_verbs', 'Infinitif après verbes/prépositions', 'pour faire, sans parler, aimer faire', 'A2'],
  too_enough: ['trop_assez_si_tellement', 'Intensité et suffisance', 'trop, assez, si, tellement', 'A2'],
  modifier_very_really_quite: ['adverb_intensity_register', 'Adverbes d’intensité', 'très, vraiment, plutôt, assez', 'A2'],
  verb_present_simple_statement: ['present_regular_irregular_statement', 'Présent de l’indicatif', 'verbes réguliers et fréquents', 'A1'],
  verb_third_person: ['present_person_endings', 'Terminaisons du présent', 'je/tu/il/nous/vous/ils', 'A1'],
  to_be_present_agreement: ['etre_avoir_present_agreement', 'Être/avoir au présent', 'je suis, tu as, ils sont', 'A1'],
  modal_may_might_probability: ['probability_peut_etre_devoir_conditionnel', 'Probabilité', 'peut-être, devoir, conditionnel', 'B1'],
  modal_can_could_ability_request: ['pouvoir_savoir_requests', 'Capacité et demande polie', 'pouvoir/savoir; pourriez-vous', 'A2'],
  modal_should_must_have_to: ['devoir_falloir_obligation_advice', 'Obligation et conseil', 'devoir, il faut, tu devrais', 'A2'],
  modal_base_form: ['modal_like_verbs_plus_infinitive', 'Semi-auxiliaires + infinitif', 'pouvoir/devoir/vouloir + infinitif', 'A2'],
  modal_force: ['obligation_strength_register', 'Force de l’obligation', 'il faut, devoir, être obligé de', 'B1'],
  pronoun_case: ['subject_stressed_object_pronouns', 'Pronoms sujets, toniques, compléments', 'je/moi/me/le/lui', 'A2'],
  pronoun_possessive: ['possessive_adjectives_pronouns', 'Possessifs', 'mon/ma/mes, le mien', 'A2'],
  adjective_comparison: ['comparative_superlative_agreement', 'Comparatif et superlatif', 'plus/moins/aussi; le plus', 'A2'],
  adjective_vs_adverb: ['adjective_adverb_agreement_ment', 'Adjectif ou adverbe', 'bon/bien, lent/lentement', 'A2'],
  adverb_frequency_position: ['frequency_adverb_position', 'Position des adverbes de fréquence', 'souvent, toujours, parfois', 'A2'],
  conjunction_logic: ['logical_connectors', 'Connecteurs logiques', 'parce que, donc, mais, pourtant', 'B1'],
  phrasal_particle_pair: ['idiomatic_verb_patterns_no_phrasal_particles', 'Verbes idiomatiques français', 's’occuper de, se rendre compte de', 'B1'],
  quantifier_some_any: ['quantifiers_de_des_du_any_some_equivalents', 'Quantifieurs et articles', 'du, de la, des, quelques, aucun', 'A2'],
  determiner_this_that_these_those: ['demonstratives_ce_cet_cette_ces', 'Démonstratifs', 'ce/cet/cette/ces', 'A1'],
  there_is_are: ['il_y_a_c_est_il_est', 'Il y a, c’est, il est', 'présence vs identification', 'A1'],
  noun_singular_plural_basic: ['noun_gender_plural_patterns', 'Genre et pluriel des noms', 'un ami/des amis, un journal/des journaux', 'A1'],
  noun_possessive_apostrophe_s: ['possession_de_a_possessives', 'Possession en français', 'le livre de Marie, à moi, mon/ma', 'A2'],
};

const SOURCE_IDS_BY_LEVEL = {
  A1: ['coe_cefr_companion_2020', 'tv5monde_a1', 'tv5monde_grammar', 'le_robert_dictionary'],
  A2: ['coe_cefr_companion_2020', 'tv5monde_a2', 'tv5monde_grammar', 'le_robert_dictionary'],
  B1: ['coe_cefr_companion_2020', 'tv5monde_grammar', 'le_robert_dictionary', 'le_robert_conjugation'],
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
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

function extractIds(source) {
  const match = source.match(/DIAGNOSIS_TRAINING_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function appLevelForIndex(index) {
  if (index <= 14) return 'A1';
  if (index <= 34) return 'A2';
  if (index <= 50) return 'B1';
  return 'B2';
}

function buildRow(englishId, index, trustedSourceIds) {
  const focus = FOCUS_BY_ENGLISH_ID[englishId];
  if (!focus) throw new Error(`Missing French focus mapping for ${englishId}`);
  const [frenchFocusId, frenchSkillName, contrastSet, cefr] = focus;
  const sourceEvidenceIds = [...new Set([...(SOURCE_IDS_BY_LEVEL[cefr] || SOURCE_IDS_BY_LEVEL.A2), 'cambridge_french_english_dictionary'])]
    .filter((id) => trustedSourceIds.has(id));
  return {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-row-v1',
    slotIndex: index,
    sourceEnglishTrainingId: englishId,
    frenchTrainingId: `fr_${frenchFocusId}`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    appLevel: appLevelForIndex(index),
    cefr,
    frenchSkillName,
    contrastSet,
    candidateStatus: 'candidate_requires_llm_trusted_source_review',
    sourceEvidenceIds,
    mistakeTaxonomyIds: [
      `fr_mistake_${frenchFocusId}`,
      `fr_prompt_${frenchFocusId}_ru`,
      `fr_prompt_${frenchFocusId}_uk`,
    ],
    requiredTrainingShape: {
      introBlocksMin: 2,
      stepsMin: 4,
      stepTypes: ['easy', 'contrast', 'mixed', 'mixed_review'],
      answerLanguage: 'fr',
      explanationLocales: ['ru', 'uk'],
      smartTrainerRequired: true,
    },
    generationContract: {
      mayUseEnglishTrainingAsShapeOnly: true,
      mayTranslateEnglishTrainingText: false,
      mustUseFrenchNativeGrammar: true,
      mustCiteTrustedSourceIds: true,
      mustKeepRuUkExplanationsSeparate: true,
      mustKeepTargetAnswersFrenchOnly: true,
    },
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
  const ids = extractIds(readText(IDS_PATH));
  const trusted = readJson(TRUSTED_SOURCES_PATH);
  const trustedSourceIds = new Set(trusted.sources.map((source) => source.id));
  const rows = ids.map((id, index) => buildRow(id, index + 1, trustedSourceIds));

  const duplicateFrenchTrainingIds = rows.length - new Set(rows.map((row) => row.frenchTrainingId)).size;
  const missingFocusMappings = ids.filter((id) => !FOCUS_BY_ENGLISH_ID[id]);
  const rowsWithEnglishIdReuse = rows.filter((row) => row.frenchTrainingId === row.sourceEnglishTrainingId).length;
  const rowsMissingSources = rows.filter((row) => row.sourceEvidenceIds.length < 3).length;
  const rowsWithUnsafeFlags = rows.filter((row) =>
    row.safety.appBundleModified ||
    row.safety.serverUploadAllowed ||
    row.safety.runtimeApplyAllowed ||
    row.safety.activationApproved,
  ).length;
  const rowsByCefr = rows.reduce((acc, row) => {
    acc[row.cefr] = (acc[row.cefr] || 0) + 1;
    return acc;
  }, {});
  const rowsByAppLevel = rows.reduce((acc, row) => {
    acc[row.appLevel] = (acc[row.appLevel] || 0) + 1;
    return acc;
  }, {});
  const sourceCoverage = REQUIRED_SOURCE_IDS.reduce((acc, sourceId) => {
    acc[sourceId] = rows.filter((row) => row.sourceEvidenceIds.includes(sourceId)).length;
    return acc;
  }, {});

  const blockers = [];
  if (ids.length !== EXPECTED_ROWS) blockers.push(`EXPECTED_${EXPECTED_ROWS}_ENGLISH_BLUEPRINT_IDS`);
  if (rows.length !== EXPECTED_ROWS) blockers.push(`EXPECTED_${EXPECTED_ROWS}_FRENCH_BANK_ROWS`);
  if (missingFocusMappings.length > 0) blockers.push('MISSING_FRENCH_FOCUS_MAPPINGS');
  if (duplicateFrenchTrainingIds > 0) blockers.push('DUPLICATE_FRENCH_TRAINING_IDS');
  if (rowsWithEnglishIdReuse > 0) blockers.push('FRENCH_TRAINING_ID_REUSES_ENGLISH_ID');
  if (rowsMissingSources > 0) blockers.push('ROWS_MISSING_TRUSTED_SOURCE_COVERAGE');
  if (rowsWithUnsafeFlags > 0) blockers.push('ROWS_OPENED_RUNTIME_OR_ACTIVATION_FLAGS');

  const bank = {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-candidate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    rule: 'This is a French-native personal-practice bank candidate. English diagnosis ids are used only as product-shape slots, not as translated content.',
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
  writeJson(OUT_BANK, bank);

  const audit = {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-candidate-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_CANDIDATE_READY_FOR_LLM_TRUSTED_SOURCE_REVIEW' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    inputs: {
      englishTrainingIds: rel(IDS_PATH),
      trustedSources: rel(TRUSTED_SOURCES_PATH),
    },
    outputs: {
      bankCandidate: rel(OUT_BANK),
      audit: rel(OUT_AUDIT),
      markdown: rel(OUT_MD),
    },
    hashes: {
      englishTrainingIdsSha256: sha256(IDS_PATH),
      trustedSourcesSha256: sha256(TRUSTED_SOURCES_PATH),
      bankCandidateSha256: sha256(OUT_BANK),
    },
    summary: {
      englishBlueprintRows: ids.length,
      frenchBankCandidateRows: rows.length,
      duplicateFrenchTrainingIds,
      rowsWithEnglishIdReuse,
      rowsMissingSources,
      rowsWithUnsafeFlags,
      rowsByCefr,
      rowsByAppLevel,
      sourceCoverage,
      readyForLlmTrustedSourceReview: blockers.length === 0,
      readyForImport: false,
      readyForRuntimeEnable: false,
      readyForApply: false,
    },
    blockers,
    productionHoldsRemaining: [
      'french_personal_practice_native_bank_llm_review',
      'french_personal_practice_mistake_taxonomy_llm_review',
      'french_pos_workout_profile_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ],
    safety: bank.safety,
    nextRequiredGates: [
      'build_llm_review_requests_for_personal_practice_native_bank',
      'run_llm_trusted_source_review_for_personal_practice_native_bank',
      'personal_practice_native_bank_import_dry_run',
      'problem_coach_prompt_ru_uk_contract_review',
      'server_pack_runtime_admin_activation_gates',
    ],
  };
  writeJson(OUT_AUDIT, audit);

  const md = [
    '# French Personal Practice Native Bank Candidate',
    '',
    `Status: ${audit.status}`,
    '',
    `Rows: ${rows.length}`,
    `Activation approved: ${audit.activationApproved}`,
    '',
    '## What This Is',
    '',
    'A French-native 56-slot personal-practice bank candidate shaped from the English product slots, not translated from English training content.',
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
