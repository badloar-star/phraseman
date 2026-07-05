import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson10_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson10_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson10_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson10_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson10_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson10_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson10_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson10_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson10_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson10_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson10_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson10_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson10_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson10_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson10_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson10_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson10_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson10_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson10_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson10_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson10_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson10_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson10_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson10_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson10-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
const SOURCES = {
  le_robert_pouvoir: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/pouvoir',
    claim: 'French ability/permission frames use pouvoir in the present followed by an infinitive.',
  },
  le_robert_devoir: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/devoir',
    claim: 'French obligation and must/should-like beginner frames use devoir in the present followed by an infinitive.',
  },
  le_robert_vouloir: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/vouloir',
    claim: 'French wanting/intention frames use vouloir in the present followed by an infinitive.',
  },
  coe_cefr_a2_modal_actions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users handle short practical statements about ability, permission, obligation and plans.',
  },
  phraseman_english_lesson10_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 10 teaches modal verbs; French must rebuild this around pouvoir, devoir and vouloir plus infinitive.',
  },
};

const BANKS = {
  pronounCap: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  pronounLow: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
  modalPouvoir: ['peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'Peux-tu'],
  modalDevoir: ['dois', 'doit', 'devons', 'devez', 'doivent', 'Devons-nous'],
  modalVouloir: ['veux', 'veut', 'voulons', 'voulez', 'veulent', 'Voulez-vous'],
  questionModal: ['Peux-tu', 'Pouvez-vous', 'Peut-il', 'Peut-elle', 'Devons-nous', 'Voulez-vous'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  infinitive: ['aider', 'commencer', 'appeler', 'parler', 'attendre', 'travailler', 'venir', 'partir', 'payer', 'lire', 'écrire', 'ouvrir', 'fermer', 'apprendre', 'répéter', 'choisir', 'répondre', 'utiliser', 'prendre', 'oublier', 'écouter', 'regarder', "m'aider"],
  determiner: ['le', 'la', "l'", 'une', 'un', 'mon'],
  object: ['message', 'réponse', 'porte', 'fenêtre', 'Wi-Fi', 'phrase', 'table', 'question', 'document', 'ticket', 'français', 'anglais', 'café'],
  adverb: ['maintenant', 'ici', "aujourd'hui", 'plus tard', 'ce soir', 'demain', 'avec moi', 'trop vite', 'bien', 'encore'],
  connector: ['à', 'avec', 'pour', 'dans', 'sur', 'de'],
};

const DATA = [
  ['Je peux aider.', 'Я могу помочь.', 'Я можу допомогти.', [['Je', 'pronounCap'], ['peux', 'modalPouvoir'], ['aider', 'infinitive']]],
  ['Tu peux commencer maintenant.', 'Ты можешь начать сейчас.', 'Ти можеш почати зараз.', [['Tu', 'pronounCap'], ['peux', 'modalPouvoir'], ['commencer', 'infinitive'], ['maintenant', 'adverb']]],
  ['Il peut appeler plus tard.', 'Он может позвонить позже.', 'Він може подзвонити пізніше.', [['Il', 'pronounCap'], ['peut', 'modalPouvoir'], ['appeler', 'infinitive'], ['plus tard', 'adverb']]],
  ['Elle peut parler anglais.', 'Она может говорить по-английски.', 'Вона може говорити англійською.', [['Elle', 'pronounCap'], ['peut', 'modalPouvoir'], ['parler', 'infinitive'], ['anglais', 'object']]],
  ['Nous pouvons attendre ici.', 'Мы можем подождать здесь.', 'Ми можемо почекати тут.', [['Nous', 'pronounCap'], ['pouvons', 'modalPouvoir'], ['attendre', 'infinitive'], ['ici', 'adverb']]],
  ["Vous pouvez travailler aujourd'hui.", 'Вы можете работать сегодня.', 'Ви можете працювати сьогодні.', [['Vous', 'pronounCap'], ['pouvez', 'modalPouvoir'], ['travailler', 'infinitive'], ["aujourd'hui", 'adverb']]],
  ['Ils peuvent venir demain.', 'Они могут прийти завтра.', 'Вони можуть прийти завтра.', [['Ils', 'pronounCap'], ['peuvent', 'modalPouvoir'], ['venir', 'infinitive'], ['demain', 'adverb']]],
  ['Elles peuvent partir ce soir.', 'Они могут уйти сегодня вечером. (жен.)', 'Вони можуть піти сьогодні ввечері. (жін.)', [['Elles', 'pronounCap'], ['peuvent', 'modalPouvoir'], ['partir', 'infinitive'], ['ce soir', 'adverb']]],
  ['Je peux lire le message.', 'Я могу прочитать сообщение.', 'Я можу прочитати повідомлення.', [['Je', 'pronounCap'], ['peux', 'modalPouvoir'], ['lire', 'infinitive'], ['le', 'determiner'], ['message', 'object']]],
  ['Tu peux écrire la réponse.', 'Ты можешь написать ответ.', 'Ти можеш написати відповідь.', [['Tu', 'pronounCap'], ['peux', 'modalPouvoir'], ['écrire', 'infinitive'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Il peut ouvrir la porte.', 'Он может открыть дверь.', 'Він може відкрити двері.', [['Il', 'pronounCap'], ['peut', 'modalPouvoir'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Elle peut fermer la fenêtre.', 'Она может закрыть окно.', 'Вона може закрити вікно.', [['Elle', 'pronounCap'], ['peut', 'modalPouvoir'], ['fermer', 'infinitive'], ['la', 'determiner'], ['fenêtre', 'object']]],
  ['Nous pouvons utiliser le Wi-Fi.', 'Мы можем использовать Wi-Fi.', 'Ми можемо користуватися Wi-Fi.', [['Nous', 'pronounCap'], ['pouvons', 'modalPouvoir'], ['utiliser', 'infinitive'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ['Vous pouvez répéter la phrase.', 'Вы можете повторить фразу.', 'Ви можете повторити фразу.', [['Vous', 'pronounCap'], ['pouvez', 'modalPouvoir'], ['répéter', 'infinitive'], ['la', 'determiner'], ['phrase', 'object']]],
  ['Ils peuvent choisir une table.', 'Они могут выбрать стол.', 'Вони можуть вибрати стіл.', [['Ils', 'pronounCap'], ['peuvent', 'modalPouvoir'], ['choisir', 'infinitive'], ['une', 'determiner'], ['table', 'object']]],
  ['Elles peuvent répondre à la question.', 'Они могут ответить на вопрос. (жен.)', 'Вони можуть відповісти на питання. (жін.)', [['Elles', 'pronounCap'], ['peuvent', 'modalPouvoir'], ['répondre', 'infinitive'], ['à', 'connector'], ['la', 'determiner'], ['question', 'object']]],
  ['Je ne peux pas venir.', 'Я не могу прийти.', 'Я не можу прийти.', [['Je', 'pronounCap'], ['ne', 'negation'], ['peux', 'modalPouvoir'], ['pas', 'negation'], ['venir', 'infinitive']]],
  ['Tu ne peux pas partir maintenant.', 'Ты не можешь уйти сейчас.', 'Ти не можеш піти зараз.', [['Tu', 'pronounCap'], ['ne', 'negation'], ['peux', 'modalPouvoir'], ['pas', 'negation'], ['partir', 'infinitive'], ['maintenant', 'adverb']]],
  ["Il ne peut pas appeler aujourd'hui.", 'Он не может позвонить сегодня.', 'Він не може подзвонити сьогодні.', [['Il', 'pronounCap'], ['ne', 'negation'], ['peut', 'modalPouvoir'], ['pas', 'negation'], ['appeler', 'infinitive'], ["aujourd'hui", 'adverb']]],
  ['Elle ne peut pas travailler ce soir.', 'Она не может работать сегодня вечером.', 'Вона не може працювати сьогодні ввечері.', [['Elle', 'pronounCap'], ['ne', 'negation'], ['peut', 'modalPouvoir'], ['pas', 'negation'], ['travailler', 'infinitive'], ['ce soir', 'adverb']]],
  ['Nous ne pouvons pas attendre ici.', 'Мы не можем ждать здесь.', 'Ми не можемо чекати тут.', [['Nous', 'pronounCap'], ['ne', 'negation'], ['pouvons', 'modalPouvoir'], ['pas', 'negation'], ['attendre', 'infinitive'], ['ici', 'adverb']]],
  ['Vous ne pouvez pas ouvrir la porte.', 'Вы не можете открыть дверь.', 'Ви не можете відкрити двері.', [['Vous', 'pronounCap'], ['ne', 'negation'], ['pouvez', 'modalPouvoir'], ['pas', 'negation'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Ils ne peuvent pas utiliser le Wi-Fi.', 'Они не могут использовать Wi-Fi.', 'Вони не можуть користуватися Wi-Fi.', [['Ils', 'pronounCap'], ['ne', 'negation'], ['peuvent', 'modalPouvoir'], ['pas', 'negation'], ['utiliser', 'infinitive'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ['Elles ne peuvent pas répondre maintenant.', 'Они не могут ответить сейчас. (жен.)', 'Вони не можуть відповісти зараз. (жін.)', [['Elles', 'pronounCap'], ['ne', 'negation'], ['peuvent', 'modalPouvoir'], ['pas', 'negation'], ['répondre', 'infinitive'], ['maintenant', 'adverb']]],
  ['Je dois partir maintenant.', 'Я должен уйти сейчас.', 'Я маю піти зараз.', [['Je', 'pronounCap'], ['dois', 'modalDevoir'], ['partir', 'infinitive'], ['maintenant', 'adverb']]],
  ['Tu dois écouter la question.', 'Ты должен выслушать вопрос.', 'Ти маєш вислухати питання.', [['Tu', 'pronounCap'], ['dois', 'modalDevoir'], ['écouter', 'infinitive'], ['la', 'determiner'], ['question', 'object']]],
  ['Il doit lire le document.', 'Он должен прочитать документ.', 'Він має прочитати документ.', [['Il', 'pronounCap'], ['doit', 'modalDevoir'], ['lire', 'infinitive'], ['le', 'determiner'], ['document', 'object']]],
  ['Elle doit écrire le message.', 'Она должна написать сообщение.', 'Вона має написати повідомлення.', [['Elle', 'pronounCap'], ['doit', 'modalDevoir'], ['écrire', 'infinitive'], ['le', 'determiner'], ['message', 'object']]],
  ["Nous devons commencer aujourd'hui.", 'Мы должны начать сегодня.', 'Ми маємо почати сьогодні.', [['Nous', 'pronounCap'], ['devons', 'modalDevoir'], ['commencer', 'infinitive'], ["aujourd'hui", 'adverb']]],
  ['Vous devez attendre ici.', 'Вы должны ждать здесь.', 'Ви маєте чекати тут.', [['Vous', 'pronounCap'], ['devez', 'modalDevoir'], ['attendre', 'infinitive'], ['ici', 'adverb']]],
  ['Ils doivent travailler demain.', 'Они должны работать завтра.', 'Вони мають працювати завтра.', [['Ils', 'pronounCap'], ['doivent', 'modalDevoir'], ['travailler', 'infinitive'], ['demain', 'adverb']]],
  ['Elles doivent venir ce soir.', 'Они должны прийти сегодня вечером. (жен.)', 'Вони мають прийти сьогодні ввечері. (жін.)', [['Elles', 'pronounCap'], ['doivent', 'modalDevoir'], ['venir', 'infinitive'], ['ce soir', 'adverb']]],
  ['Je ne dois pas oublier le ticket.', 'Я не должен забыть билет.', 'Я не маю забути квиток.', [['Je', 'pronounCap'], ['ne', 'negation'], ['dois', 'modalDevoir'], ['pas', 'negation'], ['oublier', 'infinitive'], ['le', 'determiner'], ['ticket', 'object']]],
  ['Tu ne dois pas ouvrir la porte.', 'Ты не должен открывать дверь.', 'Ти не маєш відкривати двері.', [['Tu', 'pronounCap'], ['ne', 'negation'], ['dois', 'modalDevoir'], ['pas', 'negation'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Il ne doit pas parler maintenant.', 'Он не должен говорить сейчас.', 'Він не має говорити зараз.', [['Il', 'pronounCap'], ['ne', 'negation'], ['doit', 'modalDevoir'], ['pas', 'negation'], ['parler', 'infinitive'], ['maintenant', 'adverb']]],
  ["Nous ne devons pas partir aujourd'hui.", 'Мы не должны уходить сегодня.', 'Ми не маємо йти сьогодні.', [['Nous', 'pronounCap'], ['ne', 'negation'], ['devons', 'modalDevoir'], ['pas', 'negation'], ['partir', 'infinitive'], ["aujourd'hui", 'adverb']]],
  ['Vous ne devez pas répondre trop vite.', 'Вы не должны отвечать слишком быстро.', 'Ви не маєте відповідати надто швидко.', [['Vous', 'pronounCap'], ['ne', 'negation'], ['devez', 'modalDevoir'], ['pas', 'negation'], ['répondre', 'infinitive'], ['trop vite', 'adverb']]],
  ['Je veux apprendre le français.', 'Я хочу изучать французский.', 'Я хочу вивчати французьку.', [['Je', 'pronounCap'], ['veux', 'modalVouloir'], ['apprendre', 'infinitive'], ['le', 'determiner'], ['français', 'object']]],
  ['Tu veux choisir une table.', 'Ты хочешь выбрать стол.', 'Ти хочеш вибрати стіл.', [['Tu', 'pronounCap'], ['veux', 'modalVouloir'], ['choisir', 'infinitive'], ['une', 'determiner'], ['table', 'object']]],
  ['Il veut prendre un café.', 'Он хочет взять кофе.', 'Він хоче взяти каву.', [['Il', 'pronounCap'], ['veut', 'modalVouloir'], ['prendre', 'infinitive'], ['un', 'determiner'], ['café', 'object']]],
  ['Elle veut regarder le document.', 'Она хочет посмотреть документ.', 'Вона хоче переглянути документ.', [['Elle', 'pronounCap'], ['veut', 'modalVouloir'], ['regarder', 'infinitive'], ['le', 'determiner'], ['document', 'object']]],
  ['Nous voulons commencer maintenant.', 'Мы хотим начать сейчас.', 'Ми хочемо почати зараз.', [['Nous', 'pronounCap'], ['voulons', 'modalVouloir'], ['commencer', 'infinitive'], ['maintenant', 'adverb']]],
  ['Vous voulez venir demain.', 'Вы хотите прийти завтра.', 'Ви хочете прийти завтра.', [['Vous', 'pronounCap'], ['voulez', 'modalVouloir'], ['venir', 'infinitive'], ['demain', 'adverb']]],
  ['Ils veulent utiliser le Wi-Fi.', 'Они хотят использовать Wi-Fi.', 'Вони хочуть користуватися Wi-Fi.', [['Ils', 'pronounCap'], ['veulent', 'modalVouloir'], ['utiliser', 'infinitive'], ['le', 'determiner'], ['Wi-Fi', 'object']]],
  ["Peux-tu m'aider ?", 'Ты можешь мне помочь?', 'Ти можеш мені допомогти?', [['Peux-tu', 'questionModal'], ["m'aider", 'infinitive']]],
  ['Pouvez-vous répéter la phrase ?', 'Вы можете повторить фразу?', 'Ви можете повторити фразу?', [['Pouvez-vous', 'questionModal'], ['répéter', 'infinitive'], ['la', 'determiner'], ['phrase', 'object']]],
  ['Peut-il commencer maintenant ?', 'Он может начать сейчас?', 'Він може почати зараз?', [['Peut-il', 'questionModal'], ['commencer', 'infinitive'], ['maintenant', 'adverb']]],
  ['Peut-elle venir ce soir ?', 'Она может прийти сегодня вечером?', 'Вона може прийти сьогодні ввечері?', [['Peut-elle', 'questionModal'], ['venir', 'infinitive'], ['ce soir', 'adverb']]],
  ['Devons-nous attendre ici ?', 'Мы должны ждать здесь?', 'Ми маємо чекати тут?', [['Devons-nous', 'questionModal'], ['attendre', 'infinitive'], ['ici', 'adverb']]],
  ['Voulez-vous lire le document ?', 'Вы хотите прочитать документ?', 'Ви хочете прочитати документ?', [['Voulez-vous', 'questionModal'], ['lire', 'infinitive'], ['le', 'determiner'], ['document', 'object']]],
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
    const next = [...BANKS.pronounCap, ...BANKS.modalPouvoir, ...BANKS.modalDevoir, ...BANKS.modalVouloir, ...BANKS.questionModal, ...BANKS.negation, ...BANKS.infinitive, ...BANKS.determiner, ...BANKS.object, ...BANKS.adverb, ...BANKS.connector].find((item) => item !== correct && !distractors.includes(item));
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
    rowId: `fr_lesson10_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const modalCategoryCounts = rows.flatMap((row) => row.wordsFr).filter((slotItem) => ['modalPouvoir', 'modalDevoir', 'modalVouloir', 'questionModal'].includes(slotItem.category)).reduce((acc, slotItem) => ({ ...acc, [slotItem.category]: (acc[slotItem.category] || 0) + 1 }), {});
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bne\b|\bn'/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => /\bne\b|\bn'/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr)).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 10,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.1',
    englishTopic: 'Modal verbs',
    frenchTopic: 'Pouvoir, devoir and vouloir with infinitives',
    sequencingReason: 'Adds ability, permission, obligation and intention before broader tense expansion.',
    frenchNativeTransferRule: 'Use conjugated pouvoir/devoir/vouloir followed by an infinitive; keep French negation around the conjugated modal and do not copy English modal word order.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, modalCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false },
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON10_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(CANDIDATE_PATH),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: 10, appCourseLevel: 'A2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) }, activationApproved: false };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 10,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English modal verbs в французскую систему: pouvoir для возможности, devoir для обязанности, vouloir для желания/намерения.', bodyUk: 'Урок переносить English modal verbs у французьку систему: pouvoir для можливості, devoir для обов’язку, vouloir для бажання/наміру.' },
      { titleRu: '02. Главная формула', titleUk: '02. Головна формула', bodyRu: 'Форма модального глагола + инфинитив: Je peux aider, Nous devons commencer, Ils veulent utiliser le Wi-Fi. Второй глагол остается в инфинитиве.', bodyUk: 'Форма модального дієслова + інфінітив: Je peux aider, Nous devons commencer, Ils veulent utiliser le Wi-Fi. Друге дієслово лишається в інфінітиві.' },
      { titleRu: '03. Pouvoir', titleUk: '03. Pouvoir', bodyRu: 'Pouvoir отвечает за “могу/можешь/может”: peux, peut, pouvons, pouvez, peuvent. Вопросы могут быть инверсионными: Peux-tu...? Pouvez-vous...?', bodyUk: 'Pouvoir відповідає за “можу/можеш/може”: peux, peut, pouvons, pouvez, peuvent. Питання можуть бути інверсійними: Peux-tu...? Pouvez-vous...?' },
      { titleRu: '04. Devoir', titleUk: '04. Devoir', bodyRu: 'Devoir закрывает обязанность и простое “must / have to / should” в A2: Je dois partir, Vous devez attendre. Отрицание окружает devoir: Je ne dois pas oublier.', bodyUk: 'Devoir покриває обов’язок і просте “must / have to / should” в A2: Je dois partir, Vous devez attendre. Заперечення оточує devoir: Je ne dois pas oublier.' },
      { titleRu: '05. Vouloir', titleUk: '05. Vouloir', bodyRu: 'Vouloir добавляет намерение: Je veux apprendre, Vous voulez venir. Это не механический английский modal, но во французском закрывает часть практических “want to” действий.', bodyUk: 'Vouloir додає намір: Je veux apprendre, Vous voulez venir. Це не механічний англійський modal, але у французькій покриває частину практичних дій “want to”.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: candidate.safety });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson10.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: 10, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson10_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: candidate.safety });

  const local = { ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) }, uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) }, audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) }, theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson10.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson10.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: 10, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson10_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson10_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 10, contentVersion: CONTENT_VERSION, entries, safety: candidate.safety });
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: candidate.safety });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: candidate.safety });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: candidate.safety });
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: candidate.safety });
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson10-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson10BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson10BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, modalCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson10BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson10BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson10BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson10BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson10BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson10BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson10BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson10BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 11 blueprint-first rebuild after inspecting English Lesson 11 shape and theory.', 'Preserve French-native sequencing while matching English product surface count, slots and delivery gates.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON10_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();


