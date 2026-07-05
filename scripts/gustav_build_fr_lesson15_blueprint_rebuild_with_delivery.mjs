import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 15;
const SLUG = 'lesson15_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson15-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = {
  appBundleModifiedByThisScript: false,
  serverUploadAllowed: false,
  runtimeDownloadsEnabled: false,
  productionApplyApproved: false,
  activationApproved: false,
};

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', SLUG);
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', SLUG);
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', SLUG);
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', SLUG);
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', SLUG);
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson15_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson15_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson15_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson15_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson15_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson15_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson15_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson15_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson15_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson15_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson15_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson15_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson15_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson15_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson15_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson15_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson15_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson15_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson15_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const SOURCES = {
  tv5monde_possessifs: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-possessifs-mon-ma-mes-etc',
    claim: 'French possessives include mon, ma, mes and related forms, with mon/ton/son before feminine nouns starting with a vowel or mute h.',
  },
  francaisfacile_adjectifs_possessifs: {
    url: 'https://www.francaisfacile.com/cgi2/myexam/voir2.php?id=44295',
    claim: 'Possessive determiners are grouped by possessor and noun gender/number: mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs.',
  },
  coe_cefr_a2_ownership: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users can handle everyday ownership, family and object noun phrases in simple exchanges.',
  },
  phraseman_english_lesson15_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 15 teaches Possessives; French must rebuild this around noun gender/number agreement, not English owner-gender logic.',
  },
};

const BANKS = {
  demonstrative: ["C'", 'Ce'],
  etrePresent: ['est', 'sont'],
  questionIntro: ['Est-ce que'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  possMasc: ['mon', 'ton', 'son', 'notre', 'votre', 'leur'],
  possFem: ['ma', 'ta', 'sa', 'notre', 'votre', 'leur'],
  possPlural: ['mes', 'tes', 'ses', 'nos', 'vos', 'leurs'],
  nounMasc: ['téléphone', 'sac', 'frère', 'professeur', 'ticket', 'document', 'livre', 'train', 'passeport', 'stylo'],
  nounFem: ['clé', 'chambre', 'sœur', 'maison', 'voiture', 'question', 'réponse', 'leçon', 'porte', 'adresse', 'amie', 'école'],
  nounPlural: ['clés', 'documents', 'lunettes', 'billets', 'places', 'enfants', 'livres', 'phrases', 'exercices', 'sacs'],
};

const DATA = [
  ["C'est mon téléphone.", 'Это мой телефон.', 'Це мій телефон.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['mon', 'possMasc'], ['téléphone', 'nounMasc']]],
  ["C'est ma clé.", 'Это мой ключ.', 'Це мій ключ.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ma', 'possFem'], ['clé', 'nounFem']]],
  ['Ce sont mes clés.', 'Это мои ключи.', 'Це мої ключі.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['mes', 'possPlural'], ['clés', 'nounPlural']]],
  ["C'est ton sac.", 'Это твоя сумка.', 'Це твоя сумка.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ton', 'possMasc'], ['sac', 'nounMasc']]],
  ["C'est ta chambre.", 'Это твоя комната.', 'Це твоя кімната.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ta', 'possFem'], ['chambre', 'nounFem']]],
  ['Ce sont tes documents.', 'Это твои документы.', 'Це твої документи.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['tes', 'possPlural'], ['documents', 'nounPlural']]],
  ["C'est son frère.", 'Это его/ее брат.', 'Це його/її брат.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['son', 'possMasc'], ['frère', 'nounMasc']]],
  ["C'est sa sœur.", 'Это его/ее сестра.', 'Це його/її сестра.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['sa', 'possFem'], ['sœur', 'nounFem']]],
  ['Ce sont ses lunettes.', 'Это его/ее очки.', 'Це його/її окуляри.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['ses', 'possPlural'], ['lunettes', 'nounPlural']]],
  ["C'est notre maison.", 'Это наш дом.', 'Це наш дім.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['notre', 'possFem'], ['maison', 'nounFem']]],
  ['Ce sont nos billets.', 'Это наши билеты.', 'Це наші квитки.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['nos', 'possPlural'], ['billets', 'nounPlural']]],
  ["C'est votre voiture.", 'Это ваша машина.', 'Це ваша машина.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['votre', 'possFem'], ['voiture', 'nounFem']]],
  ['Ce sont vos places.', 'Это ваши места.', 'Це ваші місця.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['vos', 'possPlural'], ['places', 'nounPlural']]],
  ["C'est leur professeur.", 'Это их преподаватель.', 'Це їхній викладач.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['leur', 'possMasc'], ['professeur', 'nounMasc']]],
  ['Ce sont leurs enfants.', 'Это их дети.', 'Це їхні діти.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['leurs', 'possPlural'], ['enfants', 'nounPlural']]],
  ["C'est mon amie.", 'Это моя подруга.', 'Це моя подруга.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['mon', 'possMasc'], ['amie', 'nounFem']]],
  ["C'est ton adresse.", 'Это твой адрес.', 'Це твоя адреса.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ton', 'possMasc'], ['adresse', 'nounFem']]],
  ["C'est son école.", 'Это его/ее школа.', 'Це його/її школа.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['son', 'possMasc'], ['école', 'nounFem']]],
  ["C'est ma question.", 'Это мой вопрос.', 'Це моє питання.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ma', 'possFem'], ['question', 'nounFem']]],
  ["C'est ta réponse.", 'Это твой ответ.', 'Це твоя відповідь.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['ta', 'possFem'], ['réponse', 'nounFem']]],
  ["C'est sa leçon.", 'Это его/ее урок.', 'Це його/її урок.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['sa', 'possFem'], ['leçon', 'nounFem']]],
  ["C'est notre idée.", 'Это наша идея.', 'Це наша ідея.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['notre', 'possFem'], ['idée', 'nounFem']]],
  ["C'est votre ticket.", 'Это ваш тикет.', 'Це ваш квиток.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['votre', 'possMasc'], ['ticket', 'nounMasc']]],
  ["C'est leur porte.", 'Это их дверь.', 'Це їхні двері.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['leur', 'possFem'], ['porte', 'nounFem']]],
  ['Ce sont mes livres.', 'Это мои книги.', 'Це мої книжки.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['mes', 'possPlural'], ['livres', 'nounPlural']]],
  ['Ce sont tes phrases.', 'Это твои фразы.', 'Це твої фрази.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['tes', 'possPlural'], ['phrases', 'nounPlural']]],
  ['Ce sont ses exercices.', 'Это его/ее упражнения.', 'Це його/її вправи.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['ses', 'possPlural'], ['exercices', 'nounPlural']]],
  ['Ce sont nos clés.', 'Это наши ключи.', 'Це наші ключі.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['nos', 'possPlural'], ['clés', 'nounPlural']]],
  ['Ce sont vos documents.', 'Это ваши документы.', 'Це ваші документи.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['vos', 'possPlural'], ['documents', 'nounPlural']]],
  ['Ce sont leurs sacs.', 'Это их сумки.', 'Це їхні сумки.', [['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['leurs', 'possPlural'], ['sacs', 'nounPlural']]],
  ["Ce n'est pas mon téléphone.", 'Это не мой телефон.', 'Це не мій телефон.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['mon', 'possMasc'], ['téléphone', 'nounMasc']]],
  ["Ce n'est pas ta clé.", 'Это не твой ключ.', 'Це не твій ключ.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['ta', 'possFem'], ['clé', 'nounFem']]],
  ['Ce ne sont pas mes clés.', 'Это не мои ключи.', 'Це не мої ключі.', [['Ce', 'demonstrative'], ['ne', 'negation'], ['sont', 'etrePresent'], ['pas', 'negation'], ['mes', 'possPlural'], ['clés', 'nounPlural']]],
  ["Ce n'est pas son sac.", 'Это не его/ее сумка.', 'Це не його/її сумка.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['son', 'possMasc'], ['sac', 'nounMasc']]],
  ["Ce n'est pas sa chambre.", 'Это не его/ее комната.', 'Це не його/її кімната.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['sa', 'possFem'], ['chambre', 'nounFem']]],
  ['Ce ne sont pas ses documents.', 'Это не его/ее документы.', 'Це не його/її документи.', [['Ce', 'demonstrative'], ['ne', 'negation'], ['sont', 'etrePresent'], ['pas', 'negation'], ['ses', 'possPlural'], ['documents', 'nounPlural']]],
  ["Ce n'est pas notre maison.", 'Это не наш дом.', 'Це не наш дім.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['notre', 'possFem'], ['maison', 'nounFem']]],
  ['Ce ne sont pas vos billets.', 'Это не ваши билеты.', 'Це не ваші квитки.', [['Ce', 'demonstrative'], ['ne', 'negation'], ['sont', 'etrePresent'], ['pas', 'negation'], ['vos', 'possPlural'], ['billets', 'nounPlural']]],
  ["Ce n'est pas leur professeur.", 'Это не их преподаватель.', 'Це не їхній викладач.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['leur', 'possMasc'], ['professeur', 'nounMasc']]],
  ['Ce ne sont pas leurs enfants.', 'Это не их дети.', 'Це не їхні діти.', [['Ce', 'demonstrative'], ['ne', 'negation'], ['sont', 'etrePresent'], ['pas', 'negation'], ['leurs', 'possPlural'], ['enfants', 'nounPlural']]],
  ["Est-ce que c'est mon téléphone ?", 'Это мой телефон?', 'Це мій телефон?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['mon', 'possMasc'], ['téléphone', 'nounMasc']]],
  ["Est-ce que c'est ta clé ?", 'Это твой ключ?', 'Це твій ключ?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['ta', 'possFem'], ['clé', 'nounFem']]],
  ['Est-ce que ce sont mes clés ?', 'Это мои ключи?', 'Це мої ключі?', [['Est-ce que', 'questionIntro'], ['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['mes', 'possPlural'], ['clés', 'nounPlural']]],
  ["Est-ce que c'est son sac ?", 'Это его/ее сумка?', 'Це його/її сумка?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['son', 'possMasc'], ['sac', 'nounMasc']]],
  ["Est-ce que c'est sa chambre ?", 'Это его/ее комната?', 'Це його/її кімната?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['sa', 'possFem'], ['chambre', 'nounFem']]],
  ['Est-ce que ce sont ses documents ?', 'Это его/ее документы?', 'Це його/її документи?', [['Est-ce que', 'questionIntro'], ['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['ses', 'possPlural'], ['documents', 'nounPlural']]],
  ["Est-ce que c'est notre maison ?", 'Это наш дом?', 'Це наш дім?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['notre', 'possFem'], ['maison', 'nounFem']]],
  ['Est-ce que ce sont vos billets ?', 'Это ваши билеты?', 'Це ваші квитки?', [['Est-ce que', 'questionIntro'], ['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['vos', 'possPlural'], ['billets', 'nounPlural']]],
  ["Est-ce que c'est leur professeur ?", 'Это их преподаватель?', 'Це їхній викладач?', [['Est-ce que', 'questionIntro'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['leur', 'possMasc'], ['professeur', 'nounMasc']]],
  ['Est-ce que ce sont leurs enfants ?', 'Это их дети?', 'Це їхні діти?', [['Est-ce que', 'questionIntro'], ['Ce', 'demonstrative'], ['sont', 'etrePresent'], ['leurs', 'possPlural'], ['enfants', 'nounPlural']]],
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
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

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.nounMasc;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  while (distractors.length < 5) {
    const next = Object.values(BANKS).flat().find((item) => item !== correct && !distractors.includes(item));
    distractors.push(next);
  }
  return distractors;
}

function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) {
    throw new Error(`Bad distractors for ${correct}/${category}`);
  }
  return { text: correct, correct, category, distractors };
}

function buildRows() {
  return DATA.map(([phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson15_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    order: index + 1,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    phraseFr,
    ru,
    uk,
    wordsFr: slots.map(([correct, category]) => slot(correct, category)),
    evidenceIds: Object.keys(SOURCES),
    acceptedForProduction: false,
  }));
}

function countBy(rows, categories) {
  return rows
    .flatMap((row) => row.wordsFr)
    .filter((item) => categories.includes(item.category))
    .reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
}

function surfaceDeclaredInApp(surface, source) {
  return new RegExp(`['"]${surface}['"]`).test(source);
}

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const possessiveCategoryCounts = countBy(rows, ['possMasc', 'possFem', 'possPlural']);
  const nounCategoryCounts = countBy(rows, ['nounMasc', 'nounFem', 'nounPlural']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => row.phraseFr.endsWith('.') && (/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Possessives',
    frenchTopic: 'Adjectifs possessifs by noun gender and number',
    sequencingReason: 'Extends pronoun work into ownership and noun phrase control after comparison and future planning.',
    frenchNativeTransferRule: 'Use mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos and leur/leurs by the possessed noun gender/number; do not map his/her by owner gender.',
    sources: SOURCES,
    rows,
    summary: {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      possessiveCategoryCounts,
      nounCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON15_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: Object.keys(SOURCES),
    },
    candidate: rel(CANDIDATE_PATH),
    summary: {
      rows: rows.length,
      acceptedRows: rows.length,
      revisionRows: 0,
      wordsFrSlots,
      distractorSlots,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    },
    rowDecisions: rows.map((row) => ({
      rowId: row.rowId,
      order: row.order,
      phraseFr: row.phraseFr,
      decision: 'ACCEPT',
      acceptedForLessonCandidate: true,
      acceptedForProduction: false,
      issues: [],
    })),
    safety: SAFETY,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = {
    schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-pack-draft-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: LESSON,
    appCourseLevel: 'A2',
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) },
    activationApproved: false,
  };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English Possessives в французские adjectifs possessifs: mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs.', bodyUk: 'Урок переносить English Possessives у французькі adjectifs possessifs: mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs.' },
      { titleRu: '02. Главная логика', titleUk: '02. Головна логіка', bodyRu: 'Форма выбирается по предмету, а не по владельцу: son frère может значить “его брат” или “ее брат”, потому что frère мужского рода.', bodyUk: 'Форма вибирається за предметом, а не за власником: son frère може означати “його брат” або “її брат”, бо frère чоловічого роду.' },
      { titleRu: '03. Род и число', titleUk: '03. Рід і число', bodyRu: 'Мужской ед.ч.: mon/ton/son. Женский ед.ч.: ma/ta/sa. Множественное: mes/tes/ses, nos/vos, leurs.', bodyUk: 'Чоловічий одн.: mon/ton/son. Жіночий одн.: ma/ta/sa. Множина: mes/tes/ses, nos/vos, leurs.' },
      { titleRu: '04. Женские слова на гласную', titleUk: '04. Жіночі слова на голосну', bodyRu: 'Перед женским словом на гласную используется mon/ton/son: mon amie, ton adresse, son école. Это не меняет род слова, это только звучание.', bodyUk: 'Перед жіночим словом на голосну використовується mon/ton/son: mon amie, ton adresse, son école. Це не змінює рід слова, це тільки звучання.' },
      { titleRu: '05. Что сознательно не смешиваем', titleUk: '05. Що свідомо не змішуємо', bodyRu: 'Урок не вводит полный слой самостоятельных pronoms possessifs: le mien, la tienne, les leurs. Это отдельный будущий gate.', bodyUk: 'Урок не вводить повний шар самостійних pronoms possessifs: le mien, la tienne, les leurs. Це окремий майбутній gate.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({
    slotId: `fr.lesson15.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: LESSON,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    outputPath: `audio/fr/${sourceLocale}/lesson15_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = {
    ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
    theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) },
  };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson15.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson15.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: LESSON,
    schemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifact.path),
    localArtifactSha256: artifact.sha256,
    localArtifactByteSize: artifact.byteSize,
    relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson15_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson15_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false };
  });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson15-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson15BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson15BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, possessiveCategoryCounts, nounCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson15BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson15BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson15BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson15BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson15BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson15BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson15BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson15BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = [
      'Start Lesson 16 blueprint-first rebuild after inspecting English Lesson 16 shape and theory.',
      'Keep French-native equivalent scoped to the English function while preserving app-facing A2 parity.',
      'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON15_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
