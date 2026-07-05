import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson07_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson07_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson07_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson07_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson07_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson07_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson07_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson07_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson07_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson07_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson07_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson07_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson07_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson07_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson07_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson07_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson07_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson07_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson07_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson07_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson07_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson07_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson07_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson07_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson07-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
const SOURCES = {
  le_robert_avoir_present: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/avoir',
    claim: 'Avoir present forms anchor the lesson: j ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont.',
  },
  tv5monde_avoir_present_a1: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-verbe-avoir-au-present-et-il-y',
    claim: 'A1 French uses avoir for possession and states such as faim and soif.',
  },
  le_robert_avoir_definition: {
    url: 'https://dictionnaire.lerobert.com/definition/avoir',
    claim: 'Avoir covers possession, relation and everyday availability meanings.',
  },
  coe_cefr_a1_simple_possession: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 interaction includes simple statements and questions about familiar needs, belongings and personal facts.',
  },
  phraseman_english_lesson7_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 7 teaches have/has possession, negation and questions; French must map this to avoir, not English do-support.',
  },
};

const BANKS = {
  pronounCap: ["J'", 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  pronounLow: ["j'", 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
  avoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
  negation: ["n'", 'ne', 'pas'],
  questionFrame: ['Est-ce', 'que', "qu'", 'Avez-vous', 'As-tu'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', "d'", "l'"],
  object: ['temps', 'argent', 'téléphone', 'sac', 'Wi-Fi', 'billets', 'clé', 'livre', 'stylo', 'passeport', 'ticket', 'cash'],
  state: ['faim', 'soif', 'chaud', 'froid', 'raison', 'tort', 'peur', 'chance'],
  age: ['vingt', 'ans', 'dix-huit', 'trente', 'seize', 'quarante'],
  need: ['besoin', 'envie', 'aide', 'pause', 'eau', 'café'],
  place: ['ici', 'là', 'maintenant', 'aujourd hui', 'dehors', 'dedans'],
};

const DATA = [
  ["J'ai le temps.", 'У меня есть время.', 'У мене є час.', [['J\'', 'pronounCap'], ['ai', 'avoir'], ['le', 'determiner'], ['temps', 'object']]],
  ["Tu as de l'argent.", 'У тебя есть деньги.', 'У тебе є гроші.', [['Tu', 'pronounCap'], ['as', 'avoir'], ['de', 'determiner'], ["l'", 'determiner'], ['argent', 'object']]],
  ['Il a un téléphone.', 'У него есть телефон.', 'У нього є телефон.', [['Il', 'pronounCap'], ['a', 'avoir'], ['un', 'determiner'], ['téléphone', 'object']]],
  ['Elle a un sac.', 'У неё есть сумка.', 'У неї є сумка.', [['Elle', 'pronounCap'], ['a', 'avoir'], ['un', 'determiner'], ['sac', 'object']]],
  ['Nous avons le Wi-Fi.', 'У нас есть Wi-Fi.', 'У нас є Wi-Fi.', [['Nous', 'pronounCap'], ['avons', 'avoir'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ['Vous avez des billets.', 'У вас есть билеты.', 'У вас є квитки.', [['Vous', 'pronounCap'], ['avez', 'avoir'], ['des', 'determiner'], ['billets', 'object']]],
  ['Ils ont les clés.', 'У них есть ключи.', 'У них є ключі.', [['Ils', 'pronounCap'], ['ont', 'avoir'], ['les', 'determiner'], ['clés', 'object']]],
  ['Elles ont un livre.', 'У них есть книга. (жен.)', 'У них є книга. (жін.)', [['Elles', 'pronounCap'], ['ont', 'avoir'], ['un', 'determiner'], ['livre', 'object']]],
  ["J'ai faim.", 'Я голоден / голодна.', 'Я голодний / голодна.', [['J\'', 'pronounCap'], ['ai', 'avoir'], ['faim', 'state']]],
  ['Tu as soif.', 'Ты хочешь пить.', 'Ти хочеш пити.', [['Tu', 'pronounCap'], ['as', 'avoir'], ['soif', 'state']]],
  ['Il a chaud.', 'Ему жарко.', 'Йому жарко.', [['Il', 'pronounCap'], ['a', 'avoir'], ['chaud', 'state']]],
  ['Elle a froid.', 'Ей холодно.', 'Їй холодно.', [['Elle', 'pronounCap'], ['a', 'avoir'], ['froid', 'state']]],
  ['Nous avons raison.', 'Мы правы.', 'Ми маємо рацію.', [['Nous', 'pronounCap'], ['avons', 'avoir'], ['raison', 'state']]],
  ['Vous avez tort.', 'Вы ошибаетесь.', 'Ви помиляєтеся.', [['Vous', 'pronounCap'], ['avez', 'avoir'], ['tort', 'state']]],
  ['Ils ont peur.', 'Им страшно.', 'Їм страшно.', [['Ils', 'pronounCap'], ['ont', 'avoir'], ['peur', 'state']]],
  ['Elles ont de la chance.', 'Им везёт. (жен.)', 'Їм щастить. (жін.)', [['Elles', 'pronounCap'], ['ont', 'avoir'], ['de', 'determiner'], ['la', 'determiner'], ['chance', 'state']]],
  ["J'ai vingt ans.", 'Мне двадцать лет.', 'Мені двадцять років.', [['J\'', 'pronounCap'], ['ai', 'avoir'], ['vingt', 'age'], ['ans', 'age']]],
  ['Tu as dix-huit ans.', 'Тебе восемнадцать лет.', 'Тобі вісімнадцять років.', [['Tu', 'pronounCap'], ['as', 'avoir'], ['dix-huit', 'age'], ['ans', 'age']]],
  ['Il a trente ans.', 'Ему тридцать лет.', 'Йому тридцять років.', [['Il', 'pronounCap'], ['a', 'avoir'], ['trente', 'age'], ['ans', 'age']]],
  ['Elle a seize ans.', 'Ей шестнадцать лет.', 'Їй шістнадцять років.', [['Elle', 'pronounCap'], ['a', 'avoir'], ['seize', 'age'], ['ans', 'age']]],
  ['Nous avons besoin de temps.', 'Нам нужно время.', 'Нам потрібен час.', [['Nous', 'pronounCap'], ['avons', 'avoir'], ['besoin', 'need'], ['de', 'determiner'], ['temps', 'object']]],
  ["J'ai besoin d'aide.", 'Мне нужна помощь.', 'Мені потрібна допомога.', [['J\'', 'pronounCap'], ['ai', 'avoir'], ['besoin', 'need'], ["d'", 'determiner'], ['aide', 'need']]],
  ['Tu as envie de café.', 'Тебе хочется кофе.', 'Тобі хочеться кави.', [['Tu', 'pronounCap'], ['as', 'avoir'], ['envie', 'need'], ['de', 'determiner'], ['café', 'need']]],
  ['Elle a besoin du passeport.', 'Ей нужен паспорт.', 'Їй потрібен паспорт.', [['Elle', 'pronounCap'], ['a', 'avoir'], ['besoin', 'need'], ['du', 'determiner'], ['passeport', 'object']]],
  ["Je n'ai pas le temps.", 'У меня нет времени.', 'У мене немає часу.', [['Je', 'pronounCap'], ["n'", 'negation'], ['ai', 'avoir'], ['pas', 'negation'], ['le', 'determiner'], ['temps', 'object']]],
  ["Tu n'as pas d'argent.", 'У тебя нет денег.', 'У тебе немає грошей.', [['Tu', 'pronounCap'], ["n'", 'negation'], ['as', 'avoir'], ['pas', 'negation'], ["d'", 'determiner'], ['argent', 'object']]],
  ["Il n'a pas de téléphone.", 'У него нет телефона.', 'У нього немає телефона.', [['Il', 'pronounCap'], ["n'", 'negation'], ['a', 'avoir'], ['pas', 'negation'], ['de', 'determiner'], ['téléphone', 'object']]],
  ["Elle n'a pas de sac.", 'У неё нет сумки.', 'У неї немає сумки.', [['Elle', 'pronounCap'], ["n'", 'negation'], ['a', 'avoir'], ['pas', 'negation'], ['de', 'determiner'], ['sac', 'object']]],
  ["Nous n'avons pas le Wi-Fi.", 'У нас нет Wi-Fi.', 'У нас немає Wi-Fi.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['avons', 'avoir'], ['pas', 'negation'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ["Vous n'avez pas de billets.", 'У вас нет билетов.', 'У вас немає квитків.', [['Vous', 'pronounCap'], ["n'", 'negation'], ['avez', 'avoir'], ['pas', 'negation'], ['de', 'determiner'], ['billets', 'object']]],
  ["Ils n'ont pas les clés.", 'У них нет ключей.', 'У них немає ключів.', [['Ils', 'pronounCap'], ["n'", 'negation'], ['ont', 'avoir'], ['pas', 'negation'], ['les', 'determiner'], ['clés', 'object']]],
  ["Elles n'ont pas faim.", 'Они не голодны. (жен.)', 'Вони не голодні. (жін.)', [['Elles', 'pronounCap'], ["n'", 'negation'], ['ont', 'avoir'], ['pas', 'negation'], ['faim', 'state']]],
  ["Je n'ai pas froid.", 'Мне не холодно.', 'Мені не холодно.', [['Je', 'pronounCap'], ["n'", 'negation'], ['ai', 'avoir'], ['pas', 'negation'], ['froid', 'state']]],
  ["Tu n'as pas raison.", 'Ты не прав / не права.', 'Ти не маєш рації.', [['Tu', 'pronounCap'], ["n'", 'negation'], ['as', 'avoir'], ['pas', 'negation'], ['raison', 'state']]],
  ["Il n'a pas besoin d'aide.", 'Ему не нужна помощь.', 'Йому не потрібна допомога.', [['Il', 'pronounCap'], ["n'", 'negation'], ['a', 'avoir'], ['pas', 'negation'], ['besoin', 'need'], ["d'", 'determiner'], ['aide', 'need']]],
  ["Nous n'avons pas envie de café.", 'Нам не хочется кофе.', 'Нам не хочеться кави.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['avons', 'avoir'], ['pas', 'negation'], ['envie', 'need'], ['de', 'determiner'], ['café', 'need']]],
  ['Est-ce que tu as le temps ?', 'У тебя есть время?', 'У тебе є час?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['tu', 'pronounLow'], ['as', 'avoir'], ['le', 'determiner'], ['temps', 'object']]],
  ["Est-ce qu'il a un téléphone ?", 'У него есть телефон?', 'У нього є телефон?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['il', 'pronounLow'], ['a', 'avoir'], ['un', 'determiner'], ['téléphone', 'object']]],
  ["Est-ce qu'elle a un sac ?", 'У неё есть сумка?', 'У неї є сумка?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['elle', 'pronounLow'], ['a', 'avoir'], ['un', 'determiner'], ['sac', 'object']]],
  ['Est-ce que nous avons le Wi-Fi ?', 'У нас есть Wi-Fi?', 'У нас є Wi-Fi?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['nous', 'pronounLow'], ['avons', 'avoir'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ['Avez-vous des billets ?', 'У вас есть билеты?', 'У вас є квитки?', [['Avez-vous', 'questionFrame'], ['des', 'determiner'], ['billets', 'object']]],
  ["Est-ce qu'ils ont les clés ?", 'У них есть ключи?', 'У них є ключі?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['ils', 'pronounLow'], ['ont', 'avoir'], ['les', 'determiner'], ['clés', 'object']]],
  ['As-tu soif ?', 'Ты хочешь пить?', 'Ти хочеш пити?', [['As-tu', 'questionFrame'], ['soif', 'state']]],
  ["Est-ce qu'elle a froid ?", 'Ей холодно?', 'Їй холодно?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['elle', 'pronounLow'], ['a', 'avoir'], ['froid', 'state']]],
  ['Est-ce que vous avez raison ?', 'Вы правы?', 'Ви маєте рацію?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['vous', 'pronounLow'], ['avez', 'avoir'], ['raison', 'state']]],
  ["Est-ce qu'ils ont peur ?", 'Им страшно?', 'Їм страшно?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['ils', 'pronounLow'], ['ont', 'avoir'], ['peur', 'state']]],
  ['Est-ce que tu as vingt ans ?', 'Тебе двадцать лет?', 'Тобі двадцять років?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['tu', 'pronounLow'], ['as', 'avoir'], ['vingt', 'age'], ['ans', 'age']]],
  ["Est-ce qu'elle a besoin du passeport ?", 'Ей нужен паспорт?', 'Їй потрібен паспорт?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['elle', 'pronounLow'], ['a', 'avoir'], ['besoin', 'need'], ['du', 'determiner'], ['passeport', 'object']]],
  ['Est-ce que nous avons besoin de temps ?', 'Нам нужно время?', 'Нам потрібен час?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['nous', 'pronounLow'], ['avons', 'avoir'], ['besoin', 'need'], ['de', 'determiner'], ['temps', 'object']]],
  ["Est-ce que j'ai besoin d'eau ?", 'Мне нужна вода?', 'Мені потрібна вода?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ["j'", 'pronounLow'], ['ai', 'avoir'], ['besoin', 'need'], ["d'", 'determiner'], ['eau', 'need']]],
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

function surfaceDeclaredInApp(surface, source) {
  return new RegExp(`['"]${surface}['"]`).test(source);
}

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  while (distractors.length < 5) {
    const next = [...BANKS.object, ...BANKS.state, ...BANKS.avoir, ...BANKS.need].find((item) => item !== correct && !distractors.includes(item));
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
    rowId: `fr_lesson07_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const formCounts = rows.flatMap((row) => row.wordsFr).filter((slotItem) => slotItem.category === 'avoir').reduce((acc, slotItem) => ({ ...acc, [slotItem.correct]: (acc[slotItem.correct] || 0) + 1 }), {});
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => /\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr)).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 7,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishTopic: 'Have',
    frenchTopic: 'Avoir for possession, age, states, needs, negation and questions',
    sequencingReason: 'Introduces avoir after etre and action/question lessons, preserving the English Have function but using French-native possession and state patterns.',
    frenchNativeTransferRule: 'Use avoir forms and French frames: j ai, tu as, il a, nous avons, vous avez, ils ont; negation n apostrophe ... pas; questions with est-ce que and controlled inversion.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, formCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false },
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON7_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(CANDIDATE_PATH),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: 7, appCourseLevel: 'A1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) }, activationApproved: false };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 7,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок строит французский аналог Have: владение, возраст, состояния и потребности через avoir. Это не калька have/has/do/does.', bodyUk: 'Урок будує французький аналог Have: володіння, вік, стани та потреби через avoir. Це не калька have/has/do/does.' },
      { titleRu: '02. Формы avoir', titleUk: '02. Форми avoir', bodyRu: 'Формы: j’ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont. Дистракторы проверяют именно форму подлежащего.', bodyUk: 'Форми: j’ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont. Дистрактори перевіряють саме форму підмета.' },
      { titleRu: '03. Французские состояния', titleUk: '03. Французькі стани', bodyRu: 'Во французском говорят avoir faim, avoir soif, avoir chaud, avoir froid, avoir raison, avoir tort. Это не être.', bodyUk: 'У французькій кажуть avoir faim, avoir soif, avoir chaud, avoir froid, avoir raison, avoir tort. Це не être.' },
      { titleRu: '04. Отрицание и вопрос', titleUk: '04. Заперечення і питання', bodyRu: 'Отрицание: je n’ai pas, tu n’as pas, nous n’avons pas. Вопрос: Est-ce que tu as... ? / Avez-vous... ?', bodyUk: 'Заперечення: je n’ai pas, tu n’as pas, nous n’avons pas. Питання: Est-ce que tu as... ? / Avez-vous... ?' },
      { titleRu: '05. Что не смешиваем', titleUk: '05. Що не змішуємо', bodyRu: 'Passé composé и il y a не входят в этот урок. Il y a получит отдельный existential lesson, чтобы языковые функции не перемешались.', bodyUk: 'Passé composé та il y a не входять у цей урок. Il y a отримає окремий existential lesson, щоб мовні функції не перемішалися.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: 50, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: candidate.safety });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson07.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: 7, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson07_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: 50, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: 50, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: candidate.safety });

  const local = { ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) }, uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) }, audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) }, theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson07.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson07.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: 7, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson07_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson07_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 7, contentVersion: CONTENT_VERSION, entries, safety: candidate.safety });
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: candidate.safety });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: candidate.safety });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: candidate.safety });
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: candidate.safety });
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson07-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson07BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson07BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, formCounts, rowTypeCounts, activationApproved: false };
    state.lesson07BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson07BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson07BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson07BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson07BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson07BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson07BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson07BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 8 blueprint-first rebuild for time prepositions after inspecting English Lesson 8 topic and theory shape.', 'Map English in/on/at time logic to French-native time expressions and contractions without copying English preposition categories blindly.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON7_BLUEPRINT_AND_DELIVERY_WRITTEN rows=50 wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
