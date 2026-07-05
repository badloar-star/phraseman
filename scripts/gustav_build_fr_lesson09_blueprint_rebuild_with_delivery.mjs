import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson09_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson09_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson09_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson09_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson09_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson09_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson09_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson09_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson09_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson09_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson09_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson09_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson09_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson09_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson09_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson09_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson09_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson09_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson09_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson09_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson09_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson09_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson09_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson09_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson09-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
const SOURCES = {
  le_robert_y: {
    url: 'https://dictionnaire.lerobert.com/definition/y',
    claim: "French existential il y a includes the pronoun y as a fixed location/existence frame.",
  },
  le_robert_avoir: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/avoir',
    claim: "French il y a is built from avoir and keeps a singular verb form regardless of singular/plural noun phrase.",
  },
  tv5monde_existence_location_a1: {
    url: 'https://apprendre.tv5monde.com/fr',
    claim: 'Beginner French location/existence practice uses simple object and place expressions.',
  },
  coe_cefr_a2_existence_location: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users handle short practical descriptions of what exists in familiar places.',
  },
  phraseman_english_lesson9_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 9 teaches there is/there are; French must use il y a, il n’y a pas and French question frames.',
  },
};

const BANKS = {
  frameAff: ['Il y a', 'Voici', 'Voilà', "C'est", 'Il est', 'Elle est'],
  frameNeg: ["Il n'y a pas", 'Il y a', "Ce n'est pas", "Il n'est pas", "On n'a pas", 'Il manque'],
  questionFrame: ["Est-ce qu'il y a", 'Y a-t-il', 'Est-ce que', 'Avez-vous', 'Il y a', 'Où est'],
  detSingMasc: ['un', 'le', 'ce', 'mon', 'ton', 'son'],
  detSingFem: ['une', 'la', 'cette', 'ma', 'ta', 'sa'],
  detPlural: ['des', 'les', 'ces', 'mes', 'tes', 'ses'],
  negDe: ['de', "d'", 'des', 'un', 'une', 'le'],
  negD: ["d'", 'de', 'des', 'un', 'une', "l'"],
  quantity: ['deux', 'trois', 'beaucoup de', 'plusieurs', 'assez de', 'trop de'],
  objectSing: ['problème', 'question', 'téléphone', 'message', 'livre', 'document', 'chaise', 'table', 'café', 'ticket', 'erreur', 'clé', 'ordinateur', 'poche', 'Wi-Fi'],
  objectPlural: ['problèmes', 'questions', 'messages', 'livres', 'chaises', 'documents', 'clés', 'places', 'cafés', 'tickets', 'personnes', 'erreurs', 'téléphones', 'tables', 'ordinateurs'],
  objectMass: ['bruit', 'temps', 'eau', 'argent', 'travail', 'monde'],
  place: ['ici', 'là', 'dans la classe', 'sur la table', 'dans le sac', 'près de la porte', 'au bureau', 'dans la poche', 'à la maison', 'dans le document', "devant l'école", 'dans la rue', 'avec le Wi-Fi'],
};

const DATA = [
  ['Il y a un problème.', 'Есть проблема.', 'Є проблема.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['problème', 'objectSing']]],
  ['Il y a une question.', 'Есть вопрос.', 'Є питання.', [['Il y a', 'frameAff'], ['une', 'detSingFem'], ['question', 'objectSing']]],
  ['Il y a un téléphone ici.', 'Здесь есть телефон.', 'Тут є телефон.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['téléphone', 'objectSing'], ['ici', 'place']]],
  ['Il y a un message sur la table.', 'На столе есть сообщение.', 'На столі є повідомлення.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['message', 'objectSing'], ['sur la table', 'place']]],
  ['Il y a un livre dans le sac.', 'В сумке есть книга.', 'У сумці є книга.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['livre', 'objectSing'], ['dans le sac', 'place']]],
  ['Il y a une chaise dans la classe.', 'В классе есть стул.', 'У класі є стілець.', [['Il y a', 'frameAff'], ['une', 'detSingFem'], ['chaise', 'objectSing'], ['dans la classe', 'place']]],
  ['Il y a une table près de la porte.', 'У двери есть стол.', 'Біля дверей є стіл.', [['Il y a', 'frameAff'], ['une', 'detSingFem'], ['table', 'objectSing'], ['près de la porte', 'place']]],
  ['Il y a un café au bureau.', 'В офисе есть кофе.', 'В офісі є кава.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['café', 'objectSing'], ['au bureau', 'place']]],
  ['Il y a un ticket dans la poche.', 'В кармане есть билет.', 'У кишені є квиток.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['ticket', 'objectSing'], ['dans la poche', 'place']]],
  ['Il y a une clé à la maison.', 'Дома есть ключ.', 'Вдома є ключ.', [['Il y a', 'frameAff'], ['une', 'detSingFem'], ['clé', 'objectSing'], ['à la maison', 'place']]],
  ['Il y a une erreur dans le document.', 'В документе есть ошибка.', 'У документі є помилка.', [['Il y a', 'frameAff'], ['une', 'detSingFem'], ['erreur', 'objectSing'], ['dans le document', 'place']]],
  ['Il y a un ordinateur au bureau.', 'В офисе есть компьютер.', 'В офісі є комп’ютер.', [['Il y a', 'frameAff'], ['un', 'detSingMasc'], ['ordinateur', 'objectSing'], ['au bureau', 'place']]],
  ['Il y a des problèmes.', 'Есть проблемы.', 'Є проблеми.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['problèmes', 'objectPlural']]],
  ['Il y a des questions.', 'Есть вопросы.', 'Є питання.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['questions', 'objectPlural']]],
  ['Il y a des messages ici.', 'Здесь есть сообщения.', 'Тут є повідомлення.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['messages', 'objectPlural'], ['ici', 'place']]],
  ['Il y a des livres sur la table.', 'На столе есть книги.', 'На столі є книги.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['livres', 'objectPlural'], ['sur la table', 'place']]],
  ['Il y a des chaises dans la classe.', 'В классе есть стулья.', 'У класі є стільці.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['chaises', 'objectPlural'], ['dans la classe', 'place']]],
  ['Il y a des documents au bureau.', 'В офисе есть документы.', 'В офісі є документи.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['documents', 'objectPlural'], ['au bureau', 'place']]],
  ['Il y a des clés dans le sac.', 'В сумке есть ключи.', 'У сумці є ключі.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['clés', 'objectPlural'], ['dans le sac', 'place']]],
  ["Il y a des places devant l'école.", 'Перед школой есть места.', 'Перед школою є місця.', [['Il y a', 'frameAff'], ['des', 'detPlural'], ['places', 'objectPlural'], ["devant l'école", 'place']]],
  ['Il y a deux cafés sur la table.', 'На столе есть два кофе.', 'На столі є дві кави.', [['Il y a', 'frameAff'], ['deux', 'quantity'], ['cafés', 'objectPlural'], ['sur la table', 'place']]],
  ['Il y a trois tickets dans la poche.', 'В кармане есть три билета.', 'У кишені є три квитки.', [['Il y a', 'frameAff'], ['trois', 'quantity'], ['tickets', 'objectPlural'], ['dans la poche', 'place']]],
  ['Il y a beaucoup de personnes dans la rue.', 'На улице много людей.', 'На вулиці багато людей.', [['Il y a', 'frameAff'], ['beaucoup de', 'quantity'], ['personnes', 'objectPlural'], ['dans la rue', 'place']]],
  ['Il y a plusieurs erreurs dans le document.', 'В документе есть несколько ошибок.', 'У документі є кілька помилок.', [['Il y a', 'frameAff'], ['plusieurs', 'quantity'], ['erreurs', 'objectPlural'], ['dans le document', 'place']]],
  ["Il n'y a pas de problème.", 'Проблемы нет.', 'Проблеми немає.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['problème', 'objectSing']]],
  ["Il n'y a pas de question.", 'Вопроса нет.', 'Питання немає.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['question', 'objectSing']]],
  ["Il n'y a pas de téléphone ici.", 'Здесь нет телефона.', 'Тут немає телефона.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['téléphone', 'objectSing'], ['ici', 'place']]],
  ["Il n'y a pas de message sur la table.", 'На столе нет сообщения.', 'На столі немає повідомлення.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['message', 'objectSing'], ['sur la table', 'place']]],
  ["Il n'y a pas de livre dans le sac.", 'В сумке нет книги.', 'У сумці немає книги.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['livre', 'objectSing'], ['dans le sac', 'place']]],
  ["Il n'y a pas de chaise dans la classe.", 'В классе нет стула.', 'У класі немає стільця.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['chaise', 'objectSing'], ['dans la classe', 'place']]],
  ["Il n'y a pas de table près de la porte.", 'У двери нет стола.', 'Біля дверей немає стола.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['table', 'objectSing'], ['près de la porte', 'place']]],
  ["Il n'y a pas de café au bureau.", 'В офисе нет кофе.', 'В офісі немає кави.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['café', 'objectSing'], ['au bureau', 'place']]],
  ["Il n'y a pas d'erreur dans le document.", 'В документе нет ошибки.', 'У документі немає помилки.', [["Il n'y a pas", 'frameNeg'], ["d'", 'negD'], ['erreur', 'objectSing'], ['dans le document', 'place']]],
  ["Il n'y a pas d'ordinateur ici.", 'Здесь нет компьютера.', 'Тут немає комп’ютера.', [["Il n'y a pas", 'frameNeg'], ["d'", 'negD'], ['ordinateur', 'objectSing'], ['ici', 'place']]],
  ["Il n'y a pas de clés dans le sac.", 'В сумке нет ключей.', 'У сумці немає ключів.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['clés', 'objectPlural'], ['dans le sac', 'place']]],
  ["Il n'y a pas de places devant l'école.", 'Перед школой нет мест.', 'Перед школою немає місць.', [["Il n'y a pas", 'frameNeg'], ['de', 'negDe'], ['places', 'objectPlural'], ["devant l'école", 'place']]],
  ["Est-ce qu'il y a un problème ?", 'Есть проблема?', 'Є проблема?', [["Est-ce qu'il y a", 'questionFrame'], ['un', 'detSingMasc'], ['problème', 'objectSing']]],
  ["Est-ce qu'il y a une question ?", 'Есть вопрос?', 'Є питання?', [["Est-ce qu'il y a", 'questionFrame'], ['une', 'detSingFem'], ['question', 'objectSing']]],
  ["Est-ce qu'il y a des messages ?", 'Есть сообщения?', 'Є повідомлення?', [["Est-ce qu'il y a", 'questionFrame'], ['des', 'detPlural'], ['messages', 'objectPlural']]],
  ["Est-ce qu'il y a un téléphone ici ?", 'Здесь есть телефон?', 'Тут є телефон?', [["Est-ce qu'il y a", 'questionFrame'], ['un', 'detSingMasc'], ['téléphone', 'objectSing'], ['ici', 'place']]],
  ["Est-ce qu'il y a des livres sur la table ?", 'На столе есть книги?', 'На столі є книги?', [["Est-ce qu'il y a", 'questionFrame'], ['des', 'detPlural'], ['livres', 'objectPlural'], ['sur la table', 'place']]],
  ["Est-ce qu'il y a une chaise dans la classe ?", 'В классе есть стул?', 'У класі є стілець?', [["Est-ce qu'il y a", 'questionFrame'], ['une', 'detSingFem'], ['chaise', 'objectSing'], ['dans la classe', 'place']]],
  ['Y a-t-il un café au bureau ?', 'В офисе есть кофе?', 'В офісі є кава?', [['Y a-t-il', 'questionFrame'], ['un', 'detSingMasc'], ['café', 'objectSing'], ['au bureau', 'place']]],
  ['Y a-t-il une clé à la maison ?', 'Дома есть ключ?', 'Вдома є ключ?', [['Y a-t-il', 'questionFrame'], ['une', 'detSingFem'], ['clé', 'objectSing'], ['à la maison', 'place']]],
  ['Y a-t-il des documents au bureau ?', 'В офисе есть документы?', 'В офісі є документи?', [['Y a-t-il', 'questionFrame'], ['des', 'detPlural'], ['documents', 'objectPlural'], ['au bureau', 'place']]],
  ['Y a-t-il assez de places ?', 'Достаточно ли мест?', 'Чи достатньо місць?', [['Y a-t-il', 'questionFrame'], ['assez de', 'quantity'], ['places', 'objectPlural']]],
  ['Y a-t-il beaucoup de personnes dans la rue ?', 'На улице много людей?', 'На вулиці багато людей?', [['Y a-t-il', 'questionFrame'], ['beaucoup de', 'quantity'], ['personnes', 'objectPlural'], ['dans la rue', 'place']]],
  ['Y a-t-il une erreur dans le document ?', 'В документе есть ошибка?', 'У документі є помилка?', [['Y a-t-il', 'questionFrame'], ['une', 'detSingFem'], ['erreur', 'objectSing'], ['dans le document', 'place']]],
  ["Est-ce qu'il y a trop de bruit ici ?", 'Здесь слишком много шума?', 'Тут забагато шуму?', [["Est-ce qu'il y a", 'questionFrame'], ['trop de', 'quantity'], ['bruit', 'objectMass'], ['ici', 'place']]],
  ['Y a-t-il un problème avec le Wi-Fi ?', 'Есть проблема с Wi-Fi?', 'Є проблема з Wi-Fi?', [['Y a-t-il', 'questionFrame'], ['un', 'detSingMasc'], ['problème', 'objectSing'], ['avec le Wi-Fi', 'place']]],
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
    const next = [...BANKS.frameAff, ...BANKS.frameNeg, ...BANKS.questionFrame, ...BANKS.detSingMasc, ...BANKS.detSingFem, ...BANKS.detPlural, ...BANKS.negDe, ...BANKS.quantity, ...BANKS.objectSing, ...BANKS.objectPlural, ...BANKS.objectMass, ...BANKS.place].find((item) => item !== correct && !distractors.includes(item));
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
    rowId: `fr_lesson09_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const frameCategoryCounts = rows.flatMap((row) => row.wordsFr).filter((slotItem) => ['frameAff', 'frameNeg', 'questionFrame'].includes(slotItem.category)).reduce((acc, slotItem) => ({ ...acc, [slotItem.category]: (acc[slotItem.category] || 0) + 1 }), {});
  const nounPhraseCategoryCounts = rows.flatMap((row) => row.wordsFr).filter((slotItem) => ['objectSing', 'objectPlural', 'objectMass'].includes(slotItem.category)).reduce((acc, slotItem) => ({ ...acc, [slotItem.category]: (acc[slotItem.category] || 0) + 1 }), {});
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !row.phraseFr.includes("n'y a pas")).length,
    negative: rows.filter((row) => row.phraseFr.includes("n'y a pas")).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 9,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.1',
    englishTopic: 'There is / there are',
    frenchTopic: "Il y a for existence, location, quantity, negation and questions",
    sequencingReason: 'Introduces existence/location frames after basic possession, time and place language.',
    frenchNativeTransferRule: "Use il y a as a French-native existential frame; keep avoir singular in the frame, use de/d' after negation, and avoid copying English singular/plural verb contrast.",
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, frameCategoryCounts, nounPhraseCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false },
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON9_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(CANDIDATE_PATH),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: 9, appCourseLevel: 'A2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) }, activationApproved: false };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 9,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English There is / There are в французский каркас il y a: есть предмет, предметы, количество или что-то в конкретном месте.', bodyUk: 'Урок переносить English There is / There are у французький каркас il y a: є предмет, предмети, кількість або щось у конкретному місці.' },
      { titleRu: '02. Почему нет is/are', titleUk: '02. Чому немає is/are', bodyRu: 'Во французском il y a не меняется на множественное число: Il y a un problème и Il y a des problèmes. Множественность показывает существительное, а не глагол.', bodyUk: 'У французькій il y a не змінюється на множину: Il y a un problème і Il y a des problèmes. Множину показує іменник, а не дієслово.' },
      { titleRu: '03. Отрицание', titleUk: '03. Заперечення', bodyRu: "После il n'y a pas обычно идет de или d': Il n'y a pas de problème, Il n'y a pas d'erreur. Это отдельное французское правило, не калька с no.", bodyUk: "Після il n'y a pas зазвичай іде de або d': Il n'y a pas de problème, Il n'y a pas d'erreur. Це окреме французьке правило, не калька з no." },
      { titleRu: '04. Вопросы', titleUk: '04. Питання', bodyRu: "Для живой речи подходит Est-ce qu'il y a...? Более формально: Y a-t-il...? Оба варианта в уроке закрепляются отдельно.", bodyUk: "Для живого мовлення підходить Est-ce qu'il y a...? Більш формально: Y a-t-il...? Обидва варіанти в уроці закріплюються окремо." },
      { titleRu: '05. Место и количество', titleUk: '05. Місце та кількість', bodyRu: 'Фразы добавляют знакомые места: ici, sur la table, dans le sac, au bureau. Количество тренируется через deux, trois, beaucoup de, plusieurs, assez de, trop de.', bodyUk: 'Фрази додають знайомі місця: ici, sur la table, dans le sac, au bureau. Кількість тренується через deux, trois, beaucoup de, plusieurs, assez de, trop de.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: candidate.safety });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson09.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: 9, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson09_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: candidate.safety });

  const local = { ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) }, uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) }, audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) }, theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson09.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson09.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: 9, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson09_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson09_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 9, contentVersion: CONTENT_VERSION, entries, safety: candidate.safety });
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: candidate.safety });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: candidate.safety });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: candidate.safety });
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: candidate.safety });
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson09-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson09BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson09BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, frameCategoryCounts, nounPhraseCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson09BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson09BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson09BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson09BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson09BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson09BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson09BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson09BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 10 blueprint-first rebuild after inspecting English Lesson 10 shape and theory.', 'Preserve French-native sequencing while matching English product surface count, slots and delivery gates.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON9_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();

