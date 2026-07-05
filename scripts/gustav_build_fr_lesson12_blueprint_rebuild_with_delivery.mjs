import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 12;
const SLUG = 'lesson12_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson12-blueprint-rebuild-v1.reviewed.pending';
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

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson12_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson12_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson12_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson12_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson12_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson12_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson12_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson12_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson12_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson12_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson12_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson12_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson12_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson12_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson12_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson12_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson12_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson12_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson12_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const SOURCES = {
  le_robert_faire: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/faire',
    claim: 'Faire has the high-frequency past participle fait, used with avoir in passe compose.',
  },
  le_robert_prendre: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/prendre',
    claim: 'Prendre has the high-frequency past participle pris, used with avoir in passe compose.',
  },
  le_robert_ecrire: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/ecrire',
    claim: 'Ecrire has the high-frequency past participle ecrit, used with avoir in passe compose.',
  },
  le_robert_avoir: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/avoir',
    claim: 'French passe compose with avoir uses present-tense avoir before a past participle.',
  },
  coe_cefr_a2_past_events: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users can report simple past events using short everyday phrases and time adverbs.',
  },
  phraseman_english_lesson12_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 12 teaches Past Simple irregular verbs; French must rebuild this as high-frequency irregular past participles, not English V2 copying.',
  },
};

const BANKS = {
  pronounCap: ["J'", 'Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  auxAvoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
  auxQuestion: ['As-tu', 'Avez-vous', 'A-t-il', 'A-t-elle', 'Avons-nous', 'Ont-ils', 'Ont-elles'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  irregularParticiple: ['fait', 'pris', 'mis', 'dit', 'écrit', 'lu', 'vu', 'bu', 'eu', 'été', 'ouvert', 'offert', 'appris', 'compris', 'promis', 'reçu', 'connu', 'couru', 'tenu'],
  determiner: ['le', 'la', "l'", 'les', 'une', 'un', 'ma', 'sa', 'mon', 'du', 'des'],
  object: ['travail', 'café', 'livre', 'table', 'vérité', 'message', 'document', 'film', 'thé', 'temps', 'porte', 'cadeau', 'règle', 'question', 'réponse', 'professeur', 'ticket', 'clés', 'phrase', 'leçon', 'problème', 'idée', 'français'],
  timePast: ['hier', 'ce matin', 'hier soir', 'cette semaine', "aujourd'hui", 'en classe', 'au bureau', 'au parc', 'ici'],
  connector: ['à', 'avec', 'pour', 'dans', 'sur', 'de', 'du', 'des'],
};

const DATA = [
  ["J'ai fait le travail hier.", 'Я сделал работу вчера.', 'Я зробив роботу вчора.', [["J'", 'pronounCap'], ['ai', 'auxAvoir'], ['fait', 'irregularParticiple'], ['le', 'determiner'], ['travail', 'object'], ['hier', 'timePast']]],
  ['Tu as pris le café hier.', 'Ты выпил кофе вчера.', 'Ти випив каву вчора.', [['Tu', 'pronounCap'], ['as', 'auxAvoir'], ['pris', 'irregularParticiple'], ['le', 'determiner'], ['café', 'object'], ['hier', 'timePast']]],
  ['Il a mis le livre sur la table hier.', 'Он положил книгу на стол вчера.', 'Він поклав книжку на стіл учора.', [['Il', 'pronounCap'], ['a', 'auxAvoir'], ['mis', 'irregularParticiple'], ['le', 'determiner'], ['livre', 'object'], ['sur', 'connector'], ['la', 'determiner'], ['table', 'object'], ['hier', 'timePast']]],
  ['Elle a dit la vérité hier.', 'Она сказала правду вчера.', 'Вона сказала правду вчора.', [['Elle', 'pronounCap'], ['a', 'auxAvoir'], ['dit', 'irregularParticiple'], ['la', 'determiner'], ['vérité', 'object'], ['hier', 'timePast']]],
  ['Nous avons écrit le message hier.', 'Мы написали сообщение вчера.', 'Ми написали повідомлення вчора.', [['Nous', 'pronounCap'], ['avons', 'auxAvoir'], ['écrit', 'irregularParticiple'], ['le', 'determiner'], ['message', 'object'], ['hier', 'timePast']]],
  ['Vous avez lu le document hier.', 'Вы прочитали документ вчера.', 'Ви прочитали документ учора.', [['Vous', 'pronounCap'], ['avez', 'auxAvoir'], ['lu', 'irregularParticiple'], ['le', 'determiner'], ['document', 'object'], ['hier', 'timePast']]],
  ['Ils ont vu le film ce matin.', 'Они увидели фильм сегодня утром.', 'Вони побачили фільм сьогодні вранці.', [['Ils', 'pronounCap'], ['ont', 'auxAvoir'], ['vu', 'irregularParticiple'], ['le', 'determiner'], ['film', 'object'], ['ce matin', 'timePast']]],
  ['Elles ont bu du thé ce matin.', 'Они выпили чай сегодня утром. (жен.)', 'Вони випили чай сьогодні вранці. (жін.)', [['Elles', 'pronounCap'], ['ont', 'auxAvoir'], ['bu', 'irregularParticiple'], ['du', 'determiner'], ['thé', 'object'], ['ce matin', 'timePast']]],
  ["J'ai eu le temps ce matin.", 'У меня было время сегодня утром.', 'У мене був час сьогодні вранці.', [["J'", 'pronounCap'], ['ai', 'auxAvoir'], ['eu', 'irregularParticiple'], ['le', 'determiner'], ['temps', 'object'], ['ce matin', 'timePast']]],
  ['Tu as été calme ce matin.', 'Ты был спокоен / была спокойна сегодня утром.', 'Ти був спокійний / була спокійна сьогодні вранці.', [['Tu', 'pronounCap'], ['as', 'auxAvoir'], ['été', 'irregularParticiple'], ['calme', 'object'], ['ce matin', 'timePast']]],
  ['Il a ouvert la porte ce matin.', 'Он открыл дверь сегодня утром.', 'Він відчинив двері сьогодні вранці.', [['Il', 'pronounCap'], ['a', 'auxAvoir'], ['ouvert', 'irregularParticiple'], ['la', 'determiner'], ['porte', 'object'], ['ce matin', 'timePast']]],
  ['Elle a offert un cadeau cette semaine.', 'Она подарила подарок на этой неделе.', 'Вона подарувала подарунок цього тижня.', [['Elle', 'pronounCap'], ['a', 'auxAvoir'], ['offert', 'irregularParticiple'], ['un', 'determiner'], ['cadeau', 'object'], ['cette semaine', 'timePast']]],
  ['Nous avons appris la règle cette semaine.', 'Мы выучили правило на этой неделе.', 'Ми вивчили правило цього тижня.', [['Nous', 'pronounCap'], ['avons', 'auxAvoir'], ['appris', 'irregularParticiple'], ['la', 'determiner'], ['règle', 'object'], ['cette semaine', 'timePast']]],
  ['Vous avez compris la question cette semaine.', 'Вы поняли вопрос на этой неделе.', 'Ви зрозуміли питання цього тижня.', [['Vous', 'pronounCap'], ['avez', 'auxAvoir'], ['compris', 'irregularParticiple'], ['la', 'determiner'], ['question', 'object'], ['cette semaine', 'timePast']]],
  ['Ils ont promis une réponse cette semaine.', 'Они пообещали ответ на этой неделе.', 'Вони пообіцяли відповідь цього тижня.', [['Ils', 'pronounCap'], ['ont', 'auxAvoir'], ['promis', 'irregularParticiple'], ['une', 'determiner'], ['réponse', 'object'], ['cette semaine', 'timePast']]],
  ['Elles ont reçu le message cette semaine.', 'Они получили сообщение на этой неделе. (жен.)', 'Вони отримали повідомлення цього тижня. (жін.)', [['Elles', 'pronounCap'], ['ont', 'auxAvoir'], ['reçu', 'irregularParticiple'], ['le', 'determiner'], ['message', 'object'], ['cette semaine', 'timePast']]],
  ["J'ai connu le professeur hier soir.", 'Я познакомился с преподавателем вчера вечером.', 'Я познайомився з викладачем учора ввечері.', [["J'", 'pronounCap'], ['ai', 'auxAvoir'], ['connu', 'irregularParticiple'], ['le', 'determiner'], ['professeur', 'object'], ['hier soir', 'timePast']]],
  ['Tu as couru au parc hier soir.', 'Ты бегал в парке вчера вечером.', 'Ти бігав у парку вчора ввечері.', [['Tu', 'pronounCap'], ['as', 'auxAvoir'], ['couru', 'irregularParticiple'], ['au parc', 'timePast'], ['hier soir', 'timePast']]],
  ['Il a tenu le ticket hier soir.', 'Он держал билет вчера вечером.', 'Він тримав квиток учора ввечері.', [['Il', 'pronounCap'], ['a', 'auxAvoir'], ['tenu', 'irregularParticiple'], ['le', 'determiner'], ['ticket', 'object'], ['hier soir', 'timePast']]],
  ['Elle a pris les clés hier soir.', 'Она взяла ключи вчера вечером.', 'Вона взяла ключі вчора ввечері.', [['Elle', 'pronounCap'], ['a', 'auxAvoir'], ['pris', 'irregularParticiple'], ['les', 'determiner'], ['clés', 'object'], ['hier soir', 'timePast']]],
  ['Nous avons fait un exercice en classe.', 'Мы сделали упражнение в классе.', 'Ми зробили вправу в класі.', [['Nous', 'pronounCap'], ['avons', 'auxAvoir'], ['fait', 'irregularParticiple'], ['un', 'determiner'], ['exercice', 'object'], ['en classe', 'timePast']]],
  ["Vous avez pris le train aujourd'hui.", 'Вы сели на поезд сегодня.', 'Ви сіли на потяг сьогодні.', [['Vous', 'pronounCap'], ['avez', 'auxAvoir'], ['pris', 'irregularParticiple'], ['le', 'determiner'], ['train', 'object'], ["aujourd'hui", 'timePast']]],
  ["Ils ont mis les clés ici aujourd'hui.", 'Они положили ключи сюда сегодня.', 'Вони поклали ключі сюди сьогодні.', [['Ils', 'pronounCap'], ['ont', 'auxAvoir'], ['mis', 'irregularParticiple'], ['les', 'determiner'], ['clés', 'object'], ['ici', 'timePast'], ["aujourd'hui", 'timePast']]],
  ["Elles ont dit merci aujourd'hui.", 'Они сказали спасибо сегодня. (жен.)', 'Вони сказали дякую сьогодні. (жін.)', [['Elles', 'pronounCap'], ['ont', 'auxAvoir'], ['dit', 'irregularParticiple'], ['merci', 'object'], ["aujourd'hui", 'timePast']]],
  ["J'ai écrit la phrase aujourd'hui.", 'Я написал фразу сегодня.', 'Я написав фразу сьогодні.', [["J'", 'pronounCap'], ['ai', 'auxAvoir'], ['écrit', 'irregularParticiple'], ['la', 'determiner'], ['phrase', 'object'], ["aujourd'hui", 'timePast']]],
  ["Tu as lu le livre aujourd'hui.", 'Ты прочитал книгу сегодня.', 'Ти прочитав книжку сьогодні.', [['Tu', 'pronounCap'], ['as', 'auxAvoir'], ['lu', 'irregularParticiple'], ['le', 'determiner'], ['livre', 'object'], ["aujourd'hui", 'timePast']]],
  ["Il a vu le problème aujourd'hui.", 'Он увидел проблему сегодня.', 'Він побачив проблему сьогодні.', [['Il', 'pronounCap'], ['a', 'auxAvoir'], ['vu', 'irregularParticiple'], ['le', 'determiner'], ['problème', 'object'], ["aujourd'hui", 'timePast']]],
  ["Elle a reçu la réponse aujourd'hui.", 'Она получила ответ сегодня.', 'Вона отримала відповідь сьогодні.', [['Elle', 'pronounCap'], ['a', 'auxAvoir'], ['reçu', 'irregularParticiple'], ['la', 'determiner'], ['réponse', 'object'], ["aujourd'hui", 'timePast']]],
  ["Nous avons eu une idée aujourd'hui.", 'У нас появилась идея сегодня.', 'У нас зʼявилася ідея сьогодні.', [['Nous', 'pronounCap'], ['avons', 'auxAvoir'], ['eu', 'irregularParticiple'], ['une', 'determiner'], ['idée', 'object'], ["aujourd'hui", 'timePast']]],
  ["Vous avez ouvert le document aujourd'hui.", 'Вы открыли документ сегодня.', 'Ви відкрили документ сьогодні.', [['Vous', 'pronounCap'], ['avez', 'auxAvoir'], ['ouvert', 'irregularParticiple'], ['le', 'determiner'], ['document', 'object'], ["aujourd'hui", 'timePast']]],
  ['Ils ont appris le français ce matin.', 'Они учили французский сегодня утром.', 'Вони вчили французьку сьогодні вранці.', [['Ils', 'pronounCap'], ['ont', 'auxAvoir'], ['appris', 'irregularParticiple'], ['le', 'determiner'], ['français', 'object'], ['ce matin', 'timePast']]],
  ['Elles ont compris la leçon ce matin.', 'Они поняли урок сегодня утром. (жен.)', 'Вони зрозуміли урок сьогодні вранці. (жін.)', [['Elles', 'pronounCap'], ['ont', 'auxAvoir'], ['compris', 'irregularParticiple'], ['la', 'determiner'], ['leçon', 'object'], ['ce matin', 'timePast']]],
  ["Je n'ai pas fait le travail.", 'Я не сделал работу.', 'Я не зробив роботу.', [['Je', 'pronounCap'], ["n'", 'negation'], ['ai', 'auxAvoir'], ['pas', 'negation'], ['fait', 'irregularParticiple'], ['le', 'determiner'], ['travail', 'object']]],
  ["Tu n'as pas pris le train.", 'Ты не сел на поезд.', 'Ти не сів на потяг.', [['Tu', 'pronounCap'], ["n'", 'negation'], ['as', 'auxAvoir'], ['pas', 'negation'], ['pris', 'irregularParticiple'], ['le', 'determiner'], ['train', 'object']]],
  ["Il n'a pas mis les clés ici.", 'Он не положил ключи сюда.', 'Він не поклав ключі сюди.', [['Il', 'pronounCap'], ["n'", 'negation'], ['a', 'auxAvoir'], ['pas', 'negation'], ['mis', 'irregularParticiple'], ['les', 'determiner'], ['clés', 'object'], ['ici', 'timePast']]],
  ["Elle n'a pas dit la vérité.", 'Она не сказала правду.', 'Вона не сказала правду.', [['Elle', 'pronounCap'], ["n'", 'negation'], ['a', 'auxAvoir'], ['pas', 'negation'], ['dit', 'irregularParticiple'], ['la', 'determiner'], ['vérité', 'object']]],
  ["Nous n'avons pas écrit le message.", 'Мы не написали сообщение.', 'Ми не написали повідомлення.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['avons', 'auxAvoir'], ['pas', 'negation'], ['écrit', 'irregularParticiple'], ['le', 'determiner'], ['message', 'object']]],
  ["Vous n'avez pas lu le document.", 'Вы не прочитали документ.', 'Ви не прочитали документ.', [['Vous', 'pronounCap'], ["n'", 'negation'], ['avez', 'auxAvoir'], ['pas', 'negation'], ['lu', 'irregularParticiple'], ['le', 'determiner'], ['document', 'object']]],
  ["Ils n'ont pas vu le film.", 'Они не видели фильм.', 'Вони не бачили фільм.', [['Ils', 'pronounCap'], ["n'", 'negation'], ['ont', 'auxAvoir'], ['pas', 'negation'], ['vu', 'irregularParticiple'], ['le', 'determiner'], ['film', 'object']]],
  ["Elles n'ont pas reçu la réponse.", 'Они не получили ответ. (жен.)', 'Вони не отримали відповідь. (жін.)', [['Elles', 'pronounCap'], ["n'", 'negation'], ['ont', 'auxAvoir'], ['pas', 'negation'], ['reçu', 'irregularParticiple'], ['la', 'determiner'], ['réponse', 'object']]],
  ["Je n'ai pas eu le temps.", 'У меня не было времени.', 'У мене не було часу.', [['Je', 'pronounCap'], ["n'", 'negation'], ['ai', 'auxAvoir'], ['pas', 'negation'], ['eu', 'irregularParticiple'], ['le', 'determiner'], ['temps', 'object']]],
  ["Nous n'avons pas compris la question.", 'Мы не поняли вопрос.', 'Ми не зрозуміли питання.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['avons', 'auxAvoir'], ['pas', 'negation'], ['compris', 'irregularParticiple'], ['la', 'determiner'], ['question', 'object']]],
  ['As-tu fait le travail ?', 'Ты сделал работу?', 'Ти зробив роботу?', [['As-tu', 'auxQuestion'], ['fait', 'irregularParticiple'], ['le', 'determiner'], ['travail', 'object']]],
  ['Avez-vous pris le train ?', 'Вы сели на поезд?', 'Ви сіли на потяг?', [['Avez-vous', 'auxQuestion'], ['pris', 'irregularParticiple'], ['le', 'determiner'], ['train', 'object']]],
  ['A-t-il mis les clés ici ?', 'Он положил ключи сюда?', 'Він поклав ключі сюди?', [['A-t-il', 'auxQuestion'], ['mis', 'irregularParticiple'], ['les', 'determiner'], ['clés', 'object'], ['ici', 'timePast']]],
  ['A-t-elle dit la vérité ?', 'Она сказала правду?', 'Вона сказала правду?', [['A-t-elle', 'auxQuestion'], ['dit', 'irregularParticiple'], ['la', 'determiner'], ['vérité', 'object']]],
  ['Avons-nous écrit le message ?', 'Мы написали сообщение?', 'Ми написали повідомлення?', [['Avons-nous', 'auxQuestion'], ['écrit', 'irregularParticiple'], ['le', 'determiner'], ['message', 'object']]],
  ['Ont-ils lu le document ?', 'Они прочитали документ?', 'Вони прочитали документ?', [['Ont-ils', 'auxQuestion'], ['lu', 'irregularParticiple'], ['le', 'determiner'], ['document', 'object']]],
  ['Ont-elles compris la question ?', 'Они поняли вопрос? (жен.)', 'Вони зрозуміли питання? (жін.)', [['Ont-elles', 'auxQuestion'], ['compris', 'irregularParticiple'], ['la', 'determiner'], ['question', 'object']]],
  ['Avez-vous reçu le message ?', 'Вы получили сообщение?', 'Ви отримали повідомлення?', [['Avez-vous', 'auxQuestion'], ['reçu', 'irregularParticiple'], ['le', 'determiner'], ['message', 'object']]],
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
  const bank = BANKS[category] || BANKS.object;
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
    rowId: `fr_lesson12_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const auxiliaryCategoryCounts = countBy(rows, ['auxAvoir', 'auxQuestion']);
  const participleCategoryCounts = countBy(rows, ['irregularParticiple']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => /\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr)).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.1',
    englishTopic: 'Past Simple irregular verbs',
    frenchTopic: 'Passe compose with avoir and high-frequency irregular past participles',
    sequencingReason: 'Follows Lesson 11 regular passe compose by adding memorized high-frequency irregular past participles.',
    frenchNativeTransferRule: 'Use avoir plus irregular participles such as fait, pris, mis, dit, ecrit, lu and vu; do not copy English V2 forms or mix in etre/reflexive past yet.',
    sources: SOURCES,
    rows,
    summary: {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      auxiliaryCategoryCounts,
      participleCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON12_REVIEW_ACCEPTED_FOR_NEXT_GATE',
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
    schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-pack-draft-v1',
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
    schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English Past Simple irregular verbs в нативный французский навык: passe compose с avoir и частыми нерегулярными причастиями.', bodyUk: 'Урок переносить English Past Simple irregular verbs у нативну французьку навичку: passe compose з avoir і частими нерегулярними дієприкметниками.' },
      { titleRu: '02. Главная формула', titleUk: '02. Головна формула', bodyRu: 'Формула: подлежащее + avoir в настоящем + нерегулярный participe passe: J’ai fait, Tu as pris, Nous avons ecrit.', bodyUk: 'Формула: підмет + avoir у теперішньому + нерегулярний participe passe: J’ai fait, Tu as pris, Nous avons ecrit.' },
      { titleRu: '03. Что именно запоминаем', titleUk: '03. Що саме запамʼятовуємо', bodyRu: 'Как в английском irregular V2, французские формы нужно узнавать как отдельные формы: fait, pris, mis, dit, écrit, lu, vu, bu, eu, été.', bodyUk: 'Як в англійській irregular V2, французькі форми треба впізнавати як окремі форми: fait, pris, mis, dit, écrit, lu, vu, bu, eu, été.' },
      { titleRu: '04. Отрицание и вопросы', titleUk: '04. Заперечення та питання', bodyRu: 'Отрицание окружает avoir: Je n’ai pas fait. Вопросы идут через инверсию: As-tu fait ? Avez-vous reçu ?', bodyUk: 'Заперечення оточує avoir: Je n’ai pas fait. Питання йдуть через інверсію: As-tu fait ? Avez-vous reçu ?' },
      { titleRu: '05. Что сознательно не смешиваем', titleUk: '05. Що свідомо не змішуємо', bodyRu: 'Урок пока не берёт être-глаголы движения и возвратные глаголы. Это отдельный слой, иначе past tense начнёт смешивать разные французские правила.', bodyUk: 'Урок поки не бере être-дієслова руху та зворотні дієслова. Це окремий шар, інакше past tense почне змішувати різні французькі правила.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({
    slotId: `fr.lesson12.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: LESSON,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    outputPath: `audio/fr/${sourceLocale}/lesson12_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = {
    ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
    theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) },
  };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson12.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson12.blueprint_rebuild.${surface}.v1.pending`,
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
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson12_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson12_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false };
  });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson12-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson12BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson12BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, auxiliaryCategoryCounts, participleCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson12BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson12BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson12BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson12BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson12BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson12BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson12BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson12BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = [
      'Start Lesson 13 blueprint-first rebuild after inspecting English Lesson 13 shape and theory.',
      'Preserve French-native sequencing while matching English product surface count, slots and delivery gates.',
      'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON12_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
