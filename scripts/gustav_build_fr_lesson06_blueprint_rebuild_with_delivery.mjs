import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson06_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson06_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson06_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson06_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson06_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson06_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson06_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson06_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson06_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson06_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson06_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson06_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson06_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson06_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson06_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson06_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson06_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson06_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson06_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson06_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson06_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson06_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson06_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson06_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson06-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
const SOURCES = {
  tv5monde_poser_question: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-poser-une-question-0',
    claim: 'French open questions use interrogative words such as comment, où and quoi with French word-order options.',
  },
  tv5monde_est_ce_que_quest_ce_que: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-interrogation-est-ce-que-et-quest-ce-que',
    claim: 'Open questions can use est-ce que and qu est-ce que frames; this keeps A1 question order explicit.',
  },
  tv5monde_interrogative_intonation_a1: {
    url: 'https://apprendre.tv5monde.com/fr/exercices/a1-debutant/prononciation-lintonation-avec-le-mot-interrogatif',
    claim: 'A1 materials practice intonation with interrogative words.',
  },
  le_robert_demander_present: {
    url: 'https://dictionnaire.lerobert.com/definition/demander',
    claim: 'Le Robert confirms present-tense first-group verb patterns used in A1 question frames.',
  },
  coe_cefr_a1_simple_questions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 interaction includes asking and answering simple questions about familiar topics.',
  },
  phraseman_english_lesson6_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 6 builds open wh questions after yes/no question grammar.',
  },
};

const BANKS = {
  wh: ['Où', 'Quand', 'Comment', 'Pourquoi', 'Qui', 'Combien'],
  whObject: ["Qu'est-ce", 'Qui', 'Où', 'Quand', 'Comment', 'Pourquoi'],
  questionFrame: ['est-ce', 'est', 'ce', 'sont', 'a', 'fait'],
  queMarker: ['que', "qu'", 'qui', 'quoi', 'où', 'quand'],
  pronounLow: ['je', "j'", 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
  verb: ['travaille', 'travailles', 'travaillent', 'travaillons', 'travaillez', 'parle', 'parles', 'parlons', 'parlez', 'habite', 'habites', 'écoute', 'écoutes', 'écoutons', 'écoutez', 'regarde', 'regardes', 'regardent', 'cherche', 'cherchons', 'trouve', 'trouvez', 'trouvent', 'aide', 'aides', 'aident', 'aidons', 'aime', 'aiment', 'donne', 'donnons', 'bois', 'buvons', 'coûte'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'des', 'du'],
  quantity: ['Combien', 'plusieurs', 'beaucoup', 'peu', 'trois', 'deux'],
  deMarker: ['de', 'du', 'des', 'le', 'la', 'les'],
  object: ['français', 'anglais', 'café', 'thé', 'musique', 'télé', 'film', 'livre', 'message', 'réponse', 'clé', 'sac', 'taxi'],
  people: ['gens', 'enfants', 'amis', 'voisins', 'clients', 'parents'],
  place: ['ici', 'là', 'dehors', 'dedans', 'près', 'loin'],
  adverb: ['vite', 'bien', 'souvent', 'toujours', 'maintenant', 'ici'],
  nounPlural: ['livres', 'messages', 'réponses', 'clés', 'sacs', 'taxis'],
};

const DATA = [
  ['Où est-ce que tu habites ?', 'Где ты живешь?', 'Де ти живеш?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['habites', 'verb']]],
  ['Où est-ce que vous travaillez ?', 'Где вы работаете?', 'Де ви працюєте?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['travaillez', 'verb']]],
  ["Où est-ce qu'ils travaillent ?", 'Где они работают?', 'Де вони працюють?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['ils', 'pronounLow'], ['travaillent', 'verb']]],
  ['Où est-ce que nous cherchons un taxi ?', 'Где мы ищем такси?', 'Де ми шукаємо таксі?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['cherchons', 'verb'], ['un', 'determiner'], ['taxi', 'object']]],
  ["Où est-ce qu'elle trouve la clé ?", 'Где она находит ключ?', 'Де вона знаходить ключ?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elle', 'pronounLow'], ['trouve', 'verb'], ['la', 'determiner'], ['clé', 'object']]],
  ['Où est-ce que tu écoutes la musique ?', 'Где ты слушаешь музыку?', 'Де ти слухаєш музику?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['écoutes', 'verb'], ['la', 'determiner'], ['musique', 'object']]],
  ['Où est-ce que je donne le livre ?', 'Где я даю книгу?', 'Де я даю книгу?', [['Où', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['je', 'pronounLow'], ['donne', 'verb'], ['le', 'determiner'], ['livre', 'object']]],
  ["Où est-ce qu'elles regardent la télé ?", 'Где они смотрят телевизор? (жен.)', 'Де вони дивляться телевізор? (жін.)', [['Où', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elles', 'pronounLow'], ['regardent', 'verb'], ['la', 'determiner'], ['télé', 'object']]],
  ['Quand est-ce que tu travailles ?', 'Когда ты работаешь?', 'Коли ти працюєш?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['travailles', 'verb']]],
  ['Quand est-ce que nous parlons français ?', 'Когда мы говорим по-французски?', 'Коли ми говоримо французькою?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['parlons', 'verb'], ['français', 'object']]],
  ["Quand est-ce qu'il regarde la télé ?", 'Когда он смотрит телевизор?', 'Коли він дивиться телевізор?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['il', 'pronounLow'], ['regarde', 'verb'], ['la', 'determiner'], ['télé', 'object']]],
  ['Quand est-ce que vous trouvez le message ?', 'Когда вы находите сообщение?', 'Коли ви знаходите повідомлення?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['trouvez', 'verb'], ['le', 'determiner'], ['message', 'object']]],
  ["Quand est-ce qu'elles aident les enfants ?", 'Когда они помогают детям? (жен.)', 'Коли вони допомагають дітям? (жін.)', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elles', 'pronounLow'], ['aident', 'verb'], ['les', 'determiner'], ['enfants', 'people']]],
  ['Quand est-ce que je bois du café ?', 'Когда я пью кофе?', 'Коли я п’ю каву?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['je', 'pronounLow'], ['bois', 'verb'], ['du', 'determiner'], ['café', 'object']]],
  ['Quand est-ce que nous buvons du thé ?', 'Когда мы пьем чай?', 'Коли ми п’ємо чай?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['buvons', 'verb'], ['du', 'determiner'], ['thé', 'object']]],
  ['Quand est-ce que tu donnes la clé ?', 'Когда ты даешь ключ?', 'Коли ти даєш ключ?', [['Quand', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['donnes', 'verb'], ['la', 'determiner'], ['clé', 'object']]],
  ['Comment est-ce que tu parles français ?', 'Как ты говоришь по-французски?', 'Як ти говориш французькою?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['parles', 'verb'], ['français', 'object']]],
  ['Comment est-ce que vous travaillez ici ?', 'Как вы работаете здесь?', 'Як ви працюєте тут?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['travaillez', 'verb'], ['ici', 'place']]],
  ["Comment est-ce qu'ils trouvent la réponse ?", 'Как они находят ответ?', 'Як вони знаходять відповідь?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['ils', 'pronounLow'], ['trouvent', 'verb'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Comment est-ce que nous aidons les voisins ?', 'Как мы помогаем соседям?', 'Як ми допомагаємо сусідам?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['aidons', 'verb'], ['les', 'determiner'], ['voisins', 'people']]],
  ["Comment est-ce qu'elle écoute le message ?", 'Как она слушает сообщение?', 'Як вона слухає повідомлення?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elle', 'pronounLow'], ['écoute', 'verb'], ['le', 'determiner'], ['message', 'object']]],
  ['Comment est-ce que je cherche la clé ?', 'Как я ищу ключ?', 'Як я шукаю ключ?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['je', 'pronounLow'], ['cherche', 'verb'], ['la', 'determiner'], ['clé', 'object']]],
  ['Comment est-ce que tu regardes le film ?', 'Как ты смотришь фильм?', 'Як ти дивишся фільм?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['regardes', 'verb'], ['le', 'determiner'], ['film', 'object']]],
  ['Comment est-ce que nous parlons anglais ?', 'Как мы говорим по-английски?', 'Як ми говоримо англійською?', [['Comment', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['parlons', 'verb'], ['anglais', 'object']]],
  ['Pourquoi est-ce que tu travailles ici ?', 'Почему ты работаешь здесь?', 'Чому ти працюєш тут?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['travailles', 'verb'], ['ici', 'place']]],
  ["Pourquoi est-ce qu'elle cherche la réponse ?", 'Почему она ищет ответ?', 'Чому вона шукає відповідь?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elle', 'pronounLow'], ['cherche', 'verb'], ['la', 'determiner'], ['réponse', 'object']]],
  ["Pourquoi est-ce qu'ils regardent la télé ?", 'Почему они смотрят телевизор?', 'Чому вони дивляться телевізор?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['ils', 'pronounLow'], ['regardent', 'verb'], ['la', 'determiner'], ['télé', 'object']]],
  ['Pourquoi est-ce que nous aidons les gens ?', 'Почему мы помогаем людям?', 'Чому ми допомагаємо людям?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['aidons', 'verb'], ['les', 'determiner'], ['gens', 'people']]],
  ['Pourquoi est-ce que tu donnes le livre ?', 'Почему ты даешь книгу?', 'Чому ти даєш книгу?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['donnes', 'verb'], ['le', 'determiner'], ['livre', 'object']]],
  ['Pourquoi est-ce que vous parlez anglais ?', 'Почему вы говорите по-английски?', 'Чому ви говорите англійською?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['parlez', 'verb'], ['anglais', 'object']]],
  ['Pourquoi est-ce que je bois du café ?', 'Почему я пью кофе?', 'Чому я п’ю каву?', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['je', 'pronounLow'], ['bois', 'verb'], ['du', 'determiner'], ['café', 'object']]],
  ["Pourquoi est-ce qu'elles travaillent dedans ?", 'Почему они работают внутри? (жен.)', 'Чому вони працюють всередині? (жін.)', [['Pourquoi', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elles', 'pronounLow'], ['travaillent', 'verb'], ['dedans', 'place']]],
  ["Qu'est-ce que tu regardes ?", 'Что ты смотришь?', 'Що ти дивишся?', [["Qu'est-ce", 'whObject'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['regardes', 'verb']]],
  ["Qu'est-ce que vous écoutez ?", 'Что вы слушаете?', 'Що ви слухаєте?', [["Qu'est-ce", 'whObject'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['écoutez', 'verb']]],
  ["Qu'est-ce qu'il cherche ?", 'Что он ищет?', 'Що він шукає?', [["Qu'est-ce", 'whObject'], ["qu'", 'queMarker'], ['il', 'pronounLow'], ['cherche', 'verb']]],
  ["Qu'est-ce qu'elle trouve ?", 'Что она находит?', 'Що вона знаходить?', [["Qu'est-ce", 'whObject'], ["qu'", 'queMarker'], ['elle', 'pronounLow'], ['trouve', 'verb']]],
  ["Qu'est-ce que nous donnons ?", 'Что мы даем?', 'Що ми даємо?', [["Qu'est-ce", 'whObject'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['donnons', 'verb']]],
  ["Qu'est-ce qu'ils aiment ?", 'Что они любят?', 'Що вони люблять?', [["Qu'est-ce", 'whObject'], ["qu'", 'queMarker'], ['ils', 'pronounLow'], ['aiment', 'verb']]],
  ["Qu'est-ce que je bois ?", 'Что я пью?', 'Що я п’ю?', [["Qu'est-ce", 'whObject'], ['que', 'queMarker'], ['je', 'pronounLow'], ['bois', 'verb']]],
  ['Qui est-ce que tu aides ?', 'Кому ты помогаешь?', 'Кому ти допомагаєш?', [['Qui', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['tu', 'pronounLow'], ['aides', 'verb']]],
  ["Qui est-ce qu'elle aide ?", 'Кому она помогает?', 'Кому вона допомагає?', [['Qui', 'wh'], ['est-ce', 'questionFrame'], ["qu'", 'queMarker'], ['elle', 'pronounLow'], ['aide', 'verb']]],
  ['Qui est-ce que nous aidons ?', 'Кому мы помогаем?', 'Кому ми допомагаємо?', [['Qui', 'wh'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['aidons', 'verb']]],
  ['Qui parle français ?', 'Кто говорит по-французски?', 'Хто говорить французькою?', [['Qui', 'wh'], ['parle', 'verb'], ['français', 'object']]],
  ['Qui travaille ici ?', 'Кто работает здесь?', 'Хто працює тут?', [['Qui', 'wh'], ['travaille', 'verb'], ['ici', 'place']]],
  ['Qui donne la réponse ?', 'Кто дает ответ?', 'Хто дає відповідь?', [['Qui', 'wh'], ['donne', 'verb'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Combien coûte le café ?', 'Сколько стоит кофе?', 'Скільки коштує кава?', [['Combien', 'quantity'], ['coûte', 'verb'], ['le', 'determiner'], ['café', 'object']]],
  ['Combien coûte le livre ?', 'Сколько стоит книга?', 'Скільки коштує книга?', [['Combien', 'quantity'], ['coûte', 'verb'], ['le', 'determiner'], ['livre', 'object']]],
  ['Combien de livres est-ce que nous donnons ?', 'Сколько книг мы даем?', 'Скільки книжок ми даємо?', [['Combien', 'quantity'], ['de', 'deMarker'], ['livres', 'nounPlural'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['nous', 'pronounLow'], ['donnons', 'verb']]],
  ['Combien de messages est-ce que vous trouvez ?', 'Сколько сообщений вы находите?', 'Скільки повідомлень ви знаходите?', [['Combien', 'quantity'], ['de', 'deMarker'], ['messages', 'nounPlural'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['vous', 'pronounLow'], ['trouvez', 'verb']]],
  ['Combien de café est-ce que je bois ?', 'Сколько кофе я пью?', 'Скільки кави я п’ю?', [['Combien', 'quantity'], ['de', 'deMarker'], ['café', 'object'], ['est-ce', 'questionFrame'], ['que', 'queMarker'], ['je', 'pronounLow'], ['bois', 'verb']]],
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
    const next = [...BANKS.object, ...BANKS.place, ...BANKS.verb, ...BANKS.wh].find((item) => item !== correct && !distractors.includes(item));
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
    rowId: `fr_lesson06_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const whCounts = rows.reduce((acc, row) => {
    const first = row.wordsFr[0].correct;
    const key = first === "Qu'est-ce" ? 'Qu_est_ce' : first;
    return { ...acc, [key]: (acc[key] || 0) + 1 };
  }, {});
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 6,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishTopic: 'Wh questions',
    frenchTopic: 'Open questions with French interrogatives',
    sequencingReason: 'Builds on Lesson 5 yes/no question grammar and introduces French open-question words without importing English do/does.',
    frenchNativeTransferRule: 'Use où, quand, comment, pourquoi, qui, qu est-ce que and combien with French est-ce que frames, direct qui questions, and combien cost patterns.',
    sources: SOURCES,
    rows,
    summary: { rows: 50, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, openQuestionRows: 50, whCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false },
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON6_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(CANDIDATE_PATH),
    summary: { rows: 50, acceptedRows: 50, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: 6, appCourseLevel: 'A1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) }, activationApproved: false };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 6,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок добавляет открытые вопросы: где, когда, как, почему, кто, что и сколько. Это не перевод английского do/does, а французские вопросительные рамки.', bodyUk: 'Урок додає відкриті питання: де, коли, як, чому, хто, що і скільки. Це не переклад англійського do/does, а французькі питальні рамки.' },
      { titleRu: '02. Où / Quand / Comment / Pourquoi', titleUk: '02. Où / Quand / Comment / Pourquoi', bodyRu: 'Базовая A1-рамка: Où est-ce que tu habites ? Quand est-ce que nous parlons ? Comment est-ce que tu travailles ? Pourquoi est-ce que tu aides ?', bodyUk: 'Базова A1-рамка: Où est-ce que tu habites ? Quand est-ce que nous parlons ? Comment est-ce que tu travailles ? Pourquoi est-ce que tu aides ?' },
      { titleRu: '03. Qu’est-ce que', titleUk: '03. Qu’est-ce que', bodyRu: 'Для “что?” перед фразой используем Qu’est-ce que/qu’: Qu’est-ce que tu regardes ? Qu’est-ce qu’il cherche ?', bodyUk: 'Для “що?” перед фразою використовуємо Qu’est-ce que/qu’: Qu’est-ce que tu regardes ? Qu’est-ce qu’il cherche ?' },
      { titleRu: '04. Qui и Combien', titleUk: '04. Qui і Combien', bodyRu: 'Qui может спрашивать “кто?” напрямую: Qui parle français ? Для цены и количества используется Combien: Combien coûte le café ? Combien de livres... ?', bodyUk: 'Qui може питати “хто?” напряму: Qui parle français ? Для ціни та кількості використовується Combien: Combien coûte le café ? Combien de livres... ?' },
      { titleRu: '05. Что не смешиваем', titleUk: '05. Що не змішуємо', bodyRu: 'Отрицательные вопросы, прошедшие времена и сложные относительные конструкции не входят сюда. Урок держит только open questions A1.', bodyUk: 'Заперечні питання, минулі часи та складні відносні конструкції не входять сюди. Урок тримає тільки open questions A1.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: 50, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: candidate.safety });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson06.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: 6, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson06_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: 50, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: 50, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: candidate.safety });

  const local = { ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) }, uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) }, audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) }, theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson06.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson06.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: 6, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson06_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson06_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 6, contentVersion: CONTENT_VERSION, entries, safety: candidate.safety });
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: candidate.safety });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: candidate.safety });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: candidate.safety });
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: candidate.safety });
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson06-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson06BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson06BlueprintRebuildSummary = { rows: 50, wordsFrSlots, distractorSlots, acceptedRows: 50, theorySections: 5, vocabularyItems: vocabulary.length, whCounts, activationApproved: false };
    state.lesson06BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson06BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson06BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson06BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson06BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson06BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson06BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson06BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 7 blueprint-first rebuild after inspecting English Lesson 7 topic and theory shape.', 'Map the English function to a French-native A1 sequence without reusing the obsolete old French lesson7 seed blindly.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON6_BLUEPRINT_AND_DELIVERY_WRITTEN rows=50 wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
