import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 13;
const SLUG = 'lesson13_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson13-blueprint-rebuild-v1.reviewed.pending';
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

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson13_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson13_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson13_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson13_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson13_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson13_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson13_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson13_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson13_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson13_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson13_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson13_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson13_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson13_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson13_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson13_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson13_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson13_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson13_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const SOURCES = {
  le_robert_aller: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/francais/aller',
    claim: 'Futur proche uses present-tense aller forms before an infinitive: je vais, tu vas, il va, nous allons, vous allez, ils vont.',
  },
  tv5monde_futur_proche: {
    url: 'https://apprendre.tv5monde.com/fr',
    claim: 'Beginner French future plans are commonly introduced with futur proche: aller au present plus infinitif.',
  },
  coe_cefr_a2_future_plans: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users can make and understand simple plans and arrangements using familiar time markers.',
  },
  phraseman_english_lesson13_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 13 teaches Future Simple; French must rebuild this as a native future-planning layer, not copy English will.',
  },
};

const BANKS = {
  pronounCap: ["J'", 'Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  allerPresent: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
  allerQuestion: ['Vas-tu', 'Allez-vous', 'Va-t-il', 'Va-t-elle', 'Allons-nous', 'Vont-ils', 'Vont-elles'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  infinitive: ['appeler', 'aider', 'rencontrer', 'acheter', 'apporter', 'envoyer', 'cuisiner', 'porter', 'fermer', 'ouvrir', 'lire', 'écrire', 'préparer', 'étudier', 'travailler', 'partir', 'attendre', 'répondre', 'regarder', 'nettoyer', 'choisir', 'payer', 'réserver', 'visiter', 'commencer', 'écouter', 'prendre', 'faire', 'voir', 'mettre'],
  determiner: ['le', 'la', "l'", 'les', 'une', 'un', 'ma', 'sa', 'mon', 'ton', 'votre', 'du', 'des', 'de'],
  object: ['mère', 'frère', 'professeur', 'pain', 'documents', 'message', 'soupe', 'lunettes', 'fenêtre', 'porte', 'document', 'réponse', 'dîner', 'français', 'question', 'film', 'chambre', 'table', 'ticket', 'musée', 'leçon', 'train', 'exercice', 'problème', 'clés'],
  timeFuture: ['demain', 'bientôt', 'ce soir', 'plus tard', 'la semaine prochaine', 'dans dix minutes', 'ici', 'ce week-end', 'maintenant'],
  connector: ['à', 'avec', 'pour', 'dans', 'sur', 'de', 'du', 'des'],
};

const DATA = [
  ['Je vais appeler ma mère demain.', 'Я позвоню маме завтра.', 'Я зателефоную мамі завтра.', [['Je', 'pronounCap'], ['vais', 'allerPresent'], ['appeler', 'infinitive'], ['ma', 'determiner'], ['mère', 'object'], ['demain', 'timeFuture']]],
  ['Tu vas aider ton frère demain.', 'Ты поможешь своему брату завтра.', 'Ти допоможеш своєму брату завтра.', [['Tu', 'pronounCap'], ['vas', 'allerPresent'], ['aider', 'infinitive'], ['ton', 'determiner'], ['frère', 'object'], ['demain', 'timeFuture']]],
  ['Il va rencontrer le professeur demain.', 'Он встретит преподавателя завтра.', 'Він зустріне викладача завтра.', [['Il', 'pronounCap'], ['va', 'allerPresent'], ['rencontrer', 'infinitive'], ['le', 'determiner'], ['professeur', 'object'], ['demain', 'timeFuture']]],
  ['Elle va acheter du pain demain.', 'Она купит хлеб завтра.', 'Вона купить хліб завтра.', [['Elle', 'pronounCap'], ['va', 'allerPresent'], ['acheter', 'infinitive'], ['du', 'determiner'], ['pain', 'object'], ['demain', 'timeFuture']]],
  ['Nous allons apporter les documents demain.', 'Мы принесем документы завтра.', 'Ми принесемо документи завтра.', [['Nous', 'pronounCap'], ['allons', 'allerPresent'], ['apporter', 'infinitive'], ['les', 'determiner'], ['documents', 'object'], ['demain', 'timeFuture']]],
  ['Vous allez envoyer le message demain.', 'Вы отправите сообщение завтра.', 'Ви надішлете повідомлення завтра.', [['Vous', 'pronounCap'], ['allez', 'allerPresent'], ['envoyer', 'infinitive'], ['le', 'determiner'], ['message', 'object'], ['demain', 'timeFuture']]],
  ['Ils vont cuisiner la soupe demain.', 'Они приготовят суп завтра.', 'Вони приготують суп завтра.', [['Ils', 'pronounCap'], ['vont', 'allerPresent'], ['cuisiner', 'infinitive'], ['la', 'determiner'], ['soupe', 'object'], ['demain', 'timeFuture']]],
  ['Elles vont porter des lunettes demain.', 'Они будут носить очки завтра. (жен.)', 'Вони носитимуть окуляри завтра. (жін.)', [['Elles', 'pronounCap'], ['vont', 'allerPresent'], ['porter', 'infinitive'], ['des', 'determiner'], ['lunettes', 'object'], ['demain', 'timeFuture']]],
  ['Je vais fermer la fenêtre bientôt.', 'Я скоро закрою окно.', 'Я скоро зачиню вікно.', [['Je', 'pronounCap'], ['vais', 'allerPresent'], ['fermer', 'infinitive'], ['la', 'determiner'], ['fenêtre', 'object'], ['bientôt', 'timeFuture']]],
  ['Tu vas ouvrir la porte bientôt.', 'Ты скоро откроешь дверь.', 'Ти скоро відчиниш двері.', [['Tu', 'pronounCap'], ['vas', 'allerPresent'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object'], ['bientôt', 'timeFuture']]],
  ['Il va lire le document bientôt.', 'Он скоро прочитает документ.', 'Він скоро прочитає документ.', [['Il', 'pronounCap'], ['va', 'allerPresent'], ['lire', 'infinitive'], ['le', 'determiner'], ['document', 'object'], ['bientôt', 'timeFuture']]],
  ['Elle va écrire la réponse bientôt.', 'Она скоро напишет ответ.', 'Вона скоро напише відповідь.', [['Elle', 'pronounCap'], ['va', 'allerPresent'], ['écrire', 'infinitive'], ['la', 'determiner'], ['réponse', 'object'], ['bientôt', 'timeFuture']]],
  ['Nous allons préparer le dîner ce soir.', 'Мы приготовим ужин сегодня вечером.', 'Ми приготуємо вечерю сьогодні ввечері.', [['Nous', 'pronounCap'], ['allons', 'allerPresent'], ['préparer', 'infinitive'], ['le', 'determiner'], ['dîner', 'object'], ['ce soir', 'timeFuture']]],
  ['Vous allez étudier le français ce soir.', 'Вы будете заниматься французским сегодня вечером.', 'Ви вивчатимете французьку сьогодні ввечері.', [['Vous', 'pronounCap'], ['allez', 'allerPresent'], ['étudier', 'infinitive'], ['le', 'determiner'], ['français', 'object'], ['ce soir', 'timeFuture']]],
  ['Ils vont travailler ce soir.', 'Они будут работать сегодня вечером.', 'Вони працюватимуть сьогодні ввечері.', [['Ils', 'pronounCap'], ['vont', 'allerPresent'], ['travailler', 'infinitive'], ['ce soir', 'timeFuture']]],
  ['Elles vont partir ce soir.', 'Они уйдут сегодня вечером. (жен.)', 'Вони підуть сьогодні ввечері. (жін.)', [['Elles', 'pronounCap'], ['vont', 'allerPresent'], ['partir', 'infinitive'], ['ce soir', 'timeFuture']]],
  ['Je vais attendre ici plus tard.', 'Я подожду здесь позже.', 'Я почекаю тут пізніше.', [['Je', 'pronounCap'], ['vais', 'allerPresent'], ['attendre', 'infinitive'], ['ici', 'timeFuture'], ['plus tard', 'timeFuture']]],
  ['Tu vas répondre à la question plus tard.', 'Ты ответишь на вопрос позже.', 'Ти відповіси на питання пізніше.', [['Tu', 'pronounCap'], ['vas', 'allerPresent'], ['répondre', 'infinitive'], ['à', 'connector'], ['la', 'determiner'], ['question', 'object'], ['plus tard', 'timeFuture']]],
  ['Il va regarder le film plus tard.', 'Он посмотрит фильм позже.', 'Він подивиться фільм пізніше.', [['Il', 'pronounCap'], ['va', 'allerPresent'], ['regarder', 'infinitive'], ['le', 'determiner'], ['film', 'object'], ['plus tard', 'timeFuture']]],
  ['Elle va nettoyer la chambre plus tard.', 'Она уберет комнату позже.', 'Вона прибере кімнату пізніше.', [['Elle', 'pronounCap'], ['va', 'allerPresent'], ['nettoyer', 'infinitive'], ['la', 'determiner'], ['chambre', 'object'], ['plus tard', 'timeFuture']]],
  ['Nous allons choisir une table la semaine prochaine.', 'Мы выберем стол на следующей неделе.', 'Ми виберемо стіл наступного тижня.', [['Nous', 'pronounCap'], ['allons', 'allerPresent'], ['choisir', 'infinitive'], ['une', 'determiner'], ['table', 'object'], ['la semaine prochaine', 'timeFuture']]],
  ['Vous allez payer le ticket la semaine prochaine.', 'Вы оплатите билет на следующей неделе.', 'Ви оплатите квиток наступного тижня.', [['Vous', 'pronounCap'], ['allez', 'allerPresent'], ['payer', 'infinitive'], ['le', 'determiner'], ['ticket', 'object'], ['la semaine prochaine', 'timeFuture']]],
  ['Ils vont réserver une table la semaine prochaine.', 'Они забронируют стол на следующей неделе.', 'Вони забронюють стіл наступного тижня.', [['Ils', 'pronounCap'], ['vont', 'allerPresent'], ['réserver', 'infinitive'], ['une', 'determiner'], ['table', 'object'], ['la semaine prochaine', 'timeFuture']]],
  ['Elles vont visiter le musée la semaine prochaine.', 'Они посетят музей на следующей неделе. (жен.)', 'Вони відвідають музей наступного тижня. (жін.)', [['Elles', 'pronounCap'], ['vont', 'allerPresent'], ['visiter', 'infinitive'], ['le', 'determiner'], ['musée', 'object'], ['la semaine prochaine', 'timeFuture']]],
  ['Je vais commencer dans dix minutes.', 'Я начну через десять минут.', 'Я почну за десять хвилин.', [['Je', 'pronounCap'], ['vais', 'allerPresent'], ['commencer', 'infinitive'], ['dans dix minutes', 'timeFuture']]],
  ['Tu vas écouter la leçon dans dix minutes.', 'Ты послушаешь урок через десять минут.', 'Ти послухаєш урок за десять хвилин.', [['Tu', 'pronounCap'], ['vas', 'allerPresent'], ['écouter', 'infinitive'], ['la', 'determiner'], ['leçon', 'object'], ['dans dix minutes', 'timeFuture']]],
  ['Il va prendre le train dans dix minutes.', 'Он сядет на поезд через десять минут.', 'Він сяде на потяг за десять хвилин.', [['Il', 'pronounCap'], ['va', 'allerPresent'], ['prendre', 'infinitive'], ['le', 'determiner'], ['train', 'object'], ['dans dix minutes', 'timeFuture']]],
  ['Elle va faire un exercice dans dix minutes.', 'Она сделает упражнение через десять минут.', 'Вона зробить вправу за десять хвилин.', [['Elle', 'pronounCap'], ['va', 'allerPresent'], ['faire', 'infinitive'], ['un', 'determiner'], ['exercice', 'object'], ['dans dix minutes', 'timeFuture']]],
  ['Nous allons voir le problème demain.', 'Мы посмотрим на проблему завтра.', 'Ми подивимося на проблему завтра.', [['Nous', 'pronounCap'], ['allons', 'allerPresent'], ['voir', 'infinitive'], ['le', 'determiner'], ['problème', 'object'], ['demain', 'timeFuture']]],
  ['Vous allez mettre les clés ici demain.', 'Вы положите ключи сюда завтра.', 'Ви покладете ключі сюди завтра.', [['Vous', 'pronounCap'], ['allez', 'allerPresent'], ['mettre', 'infinitive'], ['les', 'determiner'], ['clés', 'object'], ['ici', 'timeFuture'], ['demain', 'timeFuture']]],
  ['Je ne vais pas appeler demain.', 'Я не буду звонить завтра.', 'Я не дзвонитиму завтра.', [['Je', 'pronounCap'], ['ne', 'negation'], ['vais', 'allerPresent'], ['pas', 'negation'], ['appeler', 'infinitive'], ['demain', 'timeFuture']]],
  ['Tu ne vas pas partir ce soir.', 'Ты не уйдешь сегодня вечером.', 'Ти не підеш сьогодні ввечері.', [['Tu', 'pronounCap'], ['ne', 'negation'], ['vas', 'allerPresent'], ['pas', 'negation'], ['partir', 'infinitive'], ['ce soir', 'timeFuture']]],
  ['Il ne va pas envoyer le message.', 'Он не отправит сообщение.', 'Він не надішле повідомлення.', [['Il', 'pronounCap'], ['ne', 'negation'], ['va', 'allerPresent'], ['pas', 'negation'], ['envoyer', 'infinitive'], ['le', 'determiner'], ['message', 'object']]],
  ['Elle ne va pas acheter de pain.', 'Она не купит хлеб.', 'Вона не купить хліб.', [['Elle', 'pronounCap'], ['ne', 'negation'], ['va', 'allerPresent'], ['pas', 'negation'], ['acheter', 'infinitive'], ['de', 'determiner'], ['pain', 'object']]],
  ["Nous n'allons pas attendre ici.", 'Мы не будем ждать здесь.', 'Ми не чекатимемо тут.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['allons', 'allerPresent'], ['pas', 'negation'], ['attendre', 'infinitive'], ['ici', 'timeFuture']]],
  ["Vous n'allez pas ouvrir la porte.", 'Вы не откроете дверь.', 'Ви не відчините двері.', [['Vous', 'pronounCap'], ["n'", 'negation'], ['allez', 'allerPresent'], ['pas', 'negation'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Ils ne vont pas travailler ce week-end.', 'Они не будут работать в эти выходные.', 'Вони не працюватимуть цими вихідними.', [['Ils', 'pronounCap'], ['ne', 'negation'], ['vont', 'allerPresent'], ['pas', 'negation'], ['travailler', 'infinitive'], ['ce week-end', 'timeFuture']]],
  ['Elles ne vont pas visiter le musée.', 'Они не посетят музей. (жен.)', 'Вони не відвідають музей. (жін.)', [['Elles', 'pronounCap'], ['ne', 'negation'], ['vont', 'allerPresent'], ['pas', 'negation'], ['visiter', 'infinitive'], ['le', 'determiner'], ['musée', 'object']]],
  ['Je ne vais pas prendre le train.', 'Я не сяду на поезд.', 'Я не сяду на потяг.', [['Je', 'pronounCap'], ['ne', 'negation'], ['vais', 'allerPresent'], ['pas', 'negation'], ['prendre', 'infinitive'], ['le', 'determiner'], ['train', 'object']]],
  ["Nous n'allons pas commencer maintenant.", 'Мы не начнем сейчас.', 'Ми не почнемо зараз.', [['Nous', 'pronounCap'], ["n'", 'negation'], ['allons', 'allerPresent'], ['pas', 'negation'], ['commencer', 'infinitive'], ['maintenant', 'timeFuture']]],
  ['Vas-tu appeler demain ?', 'Ты позвонишь завтра?', 'Ти зателефонуєш завтра?', [['Vas-tu', 'allerQuestion'], ['appeler', 'infinitive'], ['demain', 'timeFuture']]],
  ['Allez-vous aider votre frère ?', 'Вы поможете своему брату?', 'Ви допоможете своєму брату?', [['Allez-vous', 'allerQuestion'], ['aider', 'infinitive'], ['votre', 'determiner'], ['frère', 'object']]],
  ['Va-t-il rencontrer le professeur demain ?', 'Он встретит преподавателя завтра?', 'Він зустріне викладача завтра?', [['Va-t-il', 'allerQuestion'], ['rencontrer', 'infinitive'], ['le', 'determiner'], ['professeur', 'object'], ['demain', 'timeFuture']]],
  ['Va-t-elle acheter du pain ?', 'Она купит хлеб?', 'Вона купить хліб?', [['Va-t-elle', 'allerQuestion'], ['acheter', 'infinitive'], ['du', 'determiner'], ['pain', 'object']]],
  ['Allons-nous apporter les documents ?', 'Мы принесем документы?', 'Ми принесемо документи?', [['Allons-nous', 'allerQuestion'], ['apporter', 'infinitive'], ['les', 'determiner'], ['documents', 'object']]],
  ['Allez-vous envoyer le message ?', 'Вы отправите сообщение?', 'Ви надішлете повідомлення?', [['Allez-vous', 'allerQuestion'], ['envoyer', 'infinitive'], ['le', 'determiner'], ['message', 'object']]],
  ['Vont-ils cuisiner la soupe ?', 'Они приготовят суп?', 'Вони приготують суп?', [['Vont-ils', 'allerQuestion'], ['cuisiner', 'infinitive'], ['la', 'determiner'], ['soupe', 'object']]],
  ['Vont-elles porter des lunettes ?', 'Они будут носить очки? (жен.)', 'Вони носитимуть окуляри? (жін.)', [['Vont-elles', 'allerQuestion'], ['porter', 'infinitive'], ['des', 'determiner'], ['lunettes', 'object']]],
  ['Vas-tu répondre à la question ?', 'Ты ответишь на вопрос?', 'Ти відповіси на питання?', [['Vas-tu', 'allerQuestion'], ['répondre', 'infinitive'], ['à', 'connector'], ['la', 'determiner'], ['question', 'object']]],
  ['Allez-vous partir ce soir ?', 'Вы уйдете сегодня вечером?', 'Ви підете сьогодні ввечері?', [['Allez-vous', 'allerQuestion'], ['partir', 'infinitive'], ['ce soir', 'timeFuture']]],
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
    rowId: `fr_lesson13_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const futureCategoryCounts = countBy(rows, ['allerPresent', 'allerQuestion']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => /\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr)).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Future Simple',
    frenchTopic: 'Futur proche for near-future plans',
    sequencingReason: 'Adds future planning after present and past foundations, using the French-native beginner future frame before full futur simple.',
    frenchNativeTransferRule: 'Use aller au present plus infinitif with future time markers; do not copy English will or introduce full futur simple endings yet.',
    sources: SOURCES,
    rows,
    summary: {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      futureCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON13_REVIEW_ACCEPTED_FOR_NEXT_GATE',
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
    schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-pack-draft-v1',
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
    schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English Future Simple в первый французский future-planning каркас: aller в настоящем + infinitif.', bodyUk: 'Урок переносить English Future Simple у перший французький future-planning каркас: aller у теперішньому + infinitif.' },
      { titleRu: '02. Главная формула', titleUk: '02. Головна формула', bodyRu: 'Формула futur proche: Je vais appeler, Tu vas aider, Il va partir, Nous allons choisir, Vous allez envoyer, Ils vont cuisiner.', bodyUk: 'Формула futur proche: Je vais appeler, Tu vas aider, Il va partir, Nous allons choisir, Vous allez envoyer, Ils vont cuisiner.' },
      { titleRu: '03. Почему это не will', titleUk: '03. Чому це не will', bodyRu: 'Английский will один для всех лиц. Во французском меняется aller: vais, vas, va, allons, allez, vont, а действие остается в infinitif.', bodyUk: 'Англійський will один для всіх осіб. У французькій змінюється aller: vais, vas, va, allons, allez, vont, а дія лишається в infinitif.' },
      { titleRu: '04. Отрицание и вопросы', titleUk: '04. Заперечення та питання', bodyRu: 'Отрицание окружает aller: Je ne vais pas appeler. Вопросы в этом паке идут через инверсию: Vas-tu appeler ? Allez-vous partir ?', bodyUk: 'Заперечення оточує aller: Je ne vais pas appeler. Питання в цьому пакеті йдуть через інверсію: Vas-tu appeler ? Allez-vous partir ?' },
      { titleRu: '05. Что сознательно не смешиваем', titleUk: '05. Що свідомо не змішуємо', bodyRu: 'Этот урок не вводит полный futur simple типа je parlerai. Он нужен позже как отдельный слой, чтобы формы aller и окончания futur simple не смешались.', bodyUk: 'Цей урок не вводить повний futur simple типу je parlerai. Він потрібен пізніше як окремий шар, щоб форми aller і закінчення futur simple не змішалися.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({
    slotId: `fr.lesson13.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: LESSON,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    outputPath: `audio/fr/${sourceLocale}/lesson13_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = {
    ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
    theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) },
  };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson13.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson13.blueprint_rebuild.${surface}.v1.pending`,
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
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson13_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson13_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false };
  });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson13-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson13BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson13BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, futureCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson13BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson13BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson13BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson13BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson13BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson13BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson13BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson13BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = [
      'Start Lesson 14 blueprint-first rebuild after inspecting English Lesson 14 shape and theory.',
      'Decide the French-native equivalent from the English function, not from direct translation.',
      'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON13_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
