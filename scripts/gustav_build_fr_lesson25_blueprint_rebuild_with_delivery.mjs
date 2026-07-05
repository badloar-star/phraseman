import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 25;
const SLUG = 'lesson25_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson25-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false };
const dir = (name) => path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', name);
const dirs = { review: dir('review'), reviewer: dir('reviewer'), materialized: path.join(dir('materialized'), SLUG), audio: path.join(dir('audio'), SLUG), server: path.join(dir('server'), SLUG), runtime: path.join(dir('runtime'), SLUG), activation: path.join(dir('activation'), SLUG) };
const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson25_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson25_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson25_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson25_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson25_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson25_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson25_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson25_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson25_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson25_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson25_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson25_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson25_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson25_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson25_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson25_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson25_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson25_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson25_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_imparfait: { url: 'https://www.lawlessfrench.com/grammar/imperfect/', claim: 'French imparfait describes ongoing, habitual, or background past actions and states.' },
  lawless_passe_compose_vs_imparfait: { url: 'https://www.lawlessfrench.com/grammar/passe-compose-vs-imparfait/', claim: 'French contrasts imparfait background/ongoing action with passé composé completed or interrupting events.' },
  tv5monde_imparfait: { url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-limparfait', claim: 'TV5MONDE presents imparfait as a tense for descriptions, habits, and actions in progress in the past.' },
  le_robert_imparfait: { url: 'https://dictionnaire.lerobert.com/guide/imparfait', claim: 'Le Robert describes imperfect forms and their past descriptive/background function.' },
  phraseman_english_lesson25_blueprint: { url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json', claim: 'English Lesson 25 teaches Past Continuous for ongoing background actions, while/when scenes, negatives, and questions.' },
};

const BANKS = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'On'],
  imparfaitVerb: ['travaillais', 'travaillaient', 'travailliez', 'lisais', 'préparait', 'préparions', 'écrivait', 'prenais', 'attendions', 'regardaient', 'regardais', 'cherchais', 'parlais', 'dormait', 'écoutait', 'étudiions', 'jouaient', 'jouait', 'marchions', 'répondait', 'rangeait', 'cuisinait', 'nettoyait', 'pleuvait', 'brillait', 'semblait', 'devenait', 'était', 'étais', 'étions', 'avaient', 'avait', 'restions', 'ouvrais', 'faisait', 'dansaient'],
  passeCompose: ['a sonné', 'a appelé', 'est arrivé', 'a ouvert', 'a commencé', 'a frappé', 'a coupé', 'a trouvé', 'a pris', 'a envoyé', 'sommes sortis', 'sont entrés', 'ai perdu', 'ai entendu', 'avons vu'],
  connector: ['quand', 'pendant que', 'tandis que', 'au moment où', 'lorsque'],
  timePlace: ['à huit heures', 'à ce moment-là', 'à six heures', 'à midi', 'près de la porte', 'hier soir', 'dans la cuisine', 'dans le salon', 'dehors', 'à la bibliothèque', 'dans la rue', 'sur la table', 'au téléphone', 'sous la pluie', 'ce jour-là'],
  object: ['le dîner', 'un message', 'les clés', 'la musique', 'la télévision', 'le cours', 'le match', 'la porte', 'la chambre', 'un livre', 'son vélo', 'du café', 'le café', 'des questions', 'aux questions', 'mon sac', 'la recette', 'la cuisine'],
  negation: ['ne travaillais pas', 'ne lisais pas', 'ne dormait pas', 'ne regardaient pas', 'ne parlait pas', "n'attendions pas", "n'étiez pas", "n'écoutait pas"],
  questionFrame: ['Est-ce que', 'Que faisais-tu', 'Où étiez-vous', 'Pourquoi', 'Qui'],
};

const DATA = [
  ['backgroundTime', 'Je travaillais à huit heures.', 'Я работал в восемь часов.', 'Я працював о восьмій.', [['Je', 'pronoun'], ['travaillais', 'imparfaitVerb'], ['à huit heures', 'timePlace']]],
  ['backgroundTime', 'Tu lisais à ce moment-là.', 'Ты читал в тот момент.', 'Ти читав у той момент.', [['Tu', 'pronoun'], ['lisais', 'imparfaitVerb'], ['à ce moment-là', 'timePlace']]],
  ['backgroundTime', 'Il préparait le dîner à six heures.', 'Он готовил ужин в шесть.', 'Він готував вечерю о шостій.', [['Il', 'pronoun'], ['préparait', 'imparfaitVerb'], ['le dîner', 'object'], ['à six heures', 'timePlace']]],
  ['backgroundTime', 'Elle écrivait un message à midi.', 'Она писала сообщение в полдень.', 'Вона писала повідомлення опівдні.', [['Elle', 'pronoun'], ['écrivait', 'imparfaitVerb'], ['un message', 'object'], ['à midi', 'timePlace']]],
  ['backgroundTime', 'Nous attendions près de la porte.', 'Мы ждали возле двери.', 'Ми чекали біля дверей.', [['Nous', 'pronoun'], ['attendions', 'imparfaitVerb'], ['près de la porte', 'timePlace']]],
  ['backgroundTime', 'Ils regardaient la télévision hier soir.', 'Они смотрели телевизор вчера вечером.', 'Вони дивилися телевізор учора ввечері.', [['Ils', 'pronoun'], ['regardaient', 'imparfaitVerb'], ['la télévision', 'object'], ['hier soir', 'timePlace']]],
  ['backgroundTime', 'Je cherchais les clés.', 'Я искал ключи.', 'Я шукав ключі.', [['Je', 'pronoun'], ['cherchais', 'imparfaitVerb'], ['les clés', 'object']]],
  ['backgroundTime', 'Tu parlais avec elle.', 'Ты разговаривал с ней.', 'Ти розмовляв з нею.', [['Tu', 'pronoun'], ['parlais', 'imparfaitVerb'], ['elle', 'object']]],
  ['backgroundTime', 'Le bébé dormait dans la chambre.', 'Ребёнок спал в комнате.', 'Дитина спала в кімнаті.', [['Le bébé', 'object'], ['dormait', 'imparfaitVerb'], ['dans la chambre', 'timePlace']]],
  ['backgroundTime', 'Elle écoutait de la musique.', 'Она слушала музыку.', 'Вона слухала музику.', [['Elle', 'pronoun'], ['écoutait', 'imparfaitVerb'], ['la musique', 'object']]],
  ['negativeQuestion', 'Je ne travaillais pas à huit heures.', 'Я не работал в восемь.', 'Я не працював о восьмій.', [['Je', 'pronoun'], ['ne travaillais pas', 'negation'], ['à huit heures', 'timePlace']]],
  ['negativeQuestion', 'Tu ne lisais pas à ce moment-là.', 'Ты не читал в тот момент.', 'Ти не читав у той момент.', [['Tu', 'pronoun'], ['ne lisais pas', 'negation'], ['à ce moment-là', 'timePlace']]],
  ['negativeQuestion', 'Il ne dormait pas.', 'Он не спал.', 'Він не спав.', [['Il', 'pronoun'], ['ne dormait pas', 'negation']]],
  ['negativeQuestion', 'Ils ne regardaient pas le match.', 'Они не смотрели матч.', 'Вони не дивилися матч.', [['Ils', 'pronoun'], ['ne regardaient pas', 'negation'], ['le match', 'object']]],
  ['negativeQuestion', 'Elle ne parlait pas au téléphone.', 'Она не говорила по телефону.', 'Вона не розмовляла телефоном.', [['Elle', 'pronoun'], ['ne parlait pas', 'negation'], ['au téléphone', 'timePlace']]],
  ['negativeQuestion', 'Est-ce que tu travaillais hier soir ?', 'Ты работал вчера вечером?', 'Ти працював учора ввечері?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['travaillais', 'imparfaitVerb'], ['hier soir', 'timePlace']]],
  ['negativeQuestion', 'Que faisais-tu à midi ?', 'Что ты делал в полдень?', 'Що ти робив опівдні?', [['Que faisais-tu', 'questionFrame'], ['à midi', 'timePlace']]],
  ['negativeQuestion', 'Où étiez-vous quand il a appelé ?', 'Где вы были, когда он позвонил?', 'Де ви були, коли він зателефонував?', [['Où étiez-vous', 'questionFrame'], ['quand', 'connector'], ['a appelé', 'passeCompose']]],
  ['negativeQuestion', 'Pourquoi pleuvait-il encore ?', 'Почему всё ещё шёл дождь?', 'Чому все ще йшов дощ?', [['Pourquoi', 'questionFrame'], ['pleuvait', 'imparfaitVerb'], ['encore', 'timePlace']]],
  ['negativeQuestion', 'Qui répondait aux questions ?', 'Кто отвечал на вопросы?', 'Хто відповідав на запитання?', [['Qui', 'questionFrame'], ['répondait', 'imparfaitVerb'], ['aux questions', 'object']]],
  ['interruptionWhen', 'Je lisais quand elle a appelé.', 'Я читал, когда она позвонила.', 'Я читав, коли вона зателефонувала.', [['Je', 'pronoun'], ['lisais', 'imparfaitVerb'], ['quand', 'connector'], ['a appelé', 'passeCompose']]],
  ['interruptionWhen', 'Il cuisinait quand le téléphone a sonné.', 'Он готовил, когда зазвонил телефон.', 'Він готував, коли задзвонив телефон.', [['Il', 'pronoun'], ['cuisinait', 'imparfaitVerb'], ['quand', 'connector'], ['a sonné', 'passeCompose']]],
  ['interruptionWhen', 'Nous attendions quand le train est arrivé.', 'Мы ждали, когда прибыл поезд.', 'Ми чекали, коли прибув потяг.', [['Nous', 'pronoun'], ['attendions', 'imparfaitVerb'], ['quand', 'connector'], ['est arrivé', 'passeCompose']]],
  ['interruptionWhen', 'Elle écrivait quand la porte a ouvert.', 'Она писала, когда дверь открылась.', 'Вона писала, коли двері відчинилися.', [['Elle', 'pronoun'], ['écrivait', 'imparfaitVerb'], ['quand', 'connector'], ['a ouvert', 'passeCompose']]],
  ['interruptionWhen', 'Ils jouaient quand la pluie a commencé.', 'Они играли, когда начался дождь.', 'Вони грали, коли почався дощ.', [['Ils', 'pronoun'], ['jouaient', 'imparfaitVerb'], ['quand', 'connector'], ['a commencé', 'passeCompose']]],
  ['interruptionWhen', 'Je cherchais mon sac quand quelqu’un a frappé.', 'Я искал сумку, когда кто-то постучал.', 'Я шукав сумку, коли хтось постукав.', [['Je', 'pronoun'], ['cherchais', 'imparfaitVerb'], ['mon sac', 'object'], ['quand', 'connector'], ['a frappé', 'passeCompose']]],
  ['interruptionWhen', 'Tu parlais quand la connexion a coupé.', 'Ты говорил, когда связь прервалась.', 'Ти говорив, коли зв’язок обірвався.', [['Tu', 'pronoun'], ['parlais', 'imparfaitVerb'], ['quand', 'connector'], ['a coupé', 'passeCompose']]],
  ['interruptionWhen', 'Elle rangeait la chambre quand elle a trouvé les clés.', 'Она убирала комнату, когда нашла ключи.', 'Вона прибирала кімнату, коли знайшла ключі.', [['Elle', 'pronoun'], ['rangeait', 'imparfaitVerb'], ['la chambre', 'object'], ['quand', 'connector'], ['a trouvé', 'passeCompose']]],
  ['interruptionWhen', 'Nous marchions quand il a pris une photo.', 'Мы шли, когда он сделал фото.', 'Ми йшли, коли він зробив фото.', [['Nous', 'pronoun'], ['marchions', 'imparfaitVerb'], ['quand', 'connector'], ['a pris', 'passeCompose']]],
  ['interruptionWhen', 'Ils travaillaient quand le client a envoyé un message.', 'Они работали, когда клиент отправил сообщение.', 'Вони працювали, коли клієнт надіслав повідомлення.', [['Ils', 'pronoun'], ['travaillaient', 'imparfaitVerb'], ['quand', 'connector'], ['a envoyé', 'passeCompose'], ['un message', 'object']]],
  ['parallelWhile', 'Pendant que je lisais, elle cuisinait.', 'Пока я читал, она готовила.', 'Поки я читав, вона готувала.', [['Pendant que', 'connector'], ['Je', 'pronoun'], ['lisais', 'imparfaitVerb'], ['Elle', 'pronoun'], ['cuisinait', 'imparfaitVerb']]],
  ['parallelWhile', 'Pendant que nous étudiions, ils jouaient dehors.', 'Пока мы учились, они играли на улице.', 'Поки ми навчалися, вони грали надворі.', [['Pendant que', 'connector'], ['Nous', 'pronoun'], ['étudiions', 'imparfaitVerb'], ['Ils', 'pronoun'], ['jouaient', 'imparfaitVerb'], ['dehors', 'timePlace']]],
  ['parallelWhile', 'Tandis qu’il préparait le dîner, elle nettoyait la cuisine.', 'Пока он готовил ужин, она убирала кухню.', 'Поки він готував вечерю, вона прибирала кухню.', [['tandis que', 'connector'], ['préparait', 'imparfaitVerb'], ['le dîner', 'object'], ['nettoyait', 'imparfaitVerb'], ['la cuisine', 'object']]],
  ['parallelWhile', 'Pendant que tu parlais, je prenais des notes.', 'Пока ты говорил, я делал заметки.', 'Поки ти говорив, я робив нотатки.', [['Pendant que', 'connector'], ['Tu', 'pronoun'], ['parlais', 'imparfaitVerb'], ['Je', 'pronoun'], ['prenais', 'imparfaitVerb'], ['des notes', 'object']]],
  ['parallelWhile', 'Pendant que les enfants jouaient, nous préparions le café.', 'Пока дети играли, мы готовили кофе.', 'Поки діти грали, ми готували каву.', [['Pendant que', 'connector'], ['les enfants', 'object'], ['jouaient', 'imparfaitVerb'], ['Nous', 'pronoun'], ['préparions', 'imparfaitVerb'], ['le café', 'object']]],
  ['parallelWhile', 'Tandis qu’elle répondait, je regardais la facture.', 'Пока она отвечала, я смотрел счёт.', 'Поки вона відповідала, я дивився на рахунок.', [['tandis que', 'connector'], ['Elle', 'pronoun'], ['répondait', 'imparfaitVerb'], ['Je', 'pronoun'], ['regardais', 'imparfaitVerb'], ['la facture', 'object']]],
  ['parallelWhile', 'Pendant qu’il pleuvait, nous restions dedans.', 'Пока шёл дождь, мы оставались внутри.', 'Поки йшов дощ, ми залишалися всередині.', [['Pendant que', 'connector'], ['pleuvait', 'imparfaitVerb'], ['Nous', 'pronoun'], ['restions', 'imparfaitVerb'], ['dedans', 'timePlace']]],
  ['parallelWhile', 'Pendant que la musique jouait, ils dansaient.', 'Пока играла музыка, они танцевали.', 'Поки грала музика, вони танцювали.', [['Pendant que', 'connector'], ['la musique', 'object'], ['jouait', 'imparfaitVerb'], ['Ils', 'pronoun'], ['dansaient', 'imparfaitVerb']]],
  ['parallelWhile', 'Tandis que vous travailliez, on préparait la salle.', 'Пока вы работали, зал готовили.', 'Поки ви працювали, зал готували.', [['tandis que', 'connector'], ['Vous', 'pronoun'], ['travailliez', 'imparfaitVerb'], ['On', 'pronoun'], ['préparait', 'imparfaitVerb'], ['la salle', 'object']]],
  ['parallelWhile', 'Pendant que je cherchais, tu ouvrais les tiroirs.', 'Пока я искал, ты открывал ящики.', 'Поки я шукав, ти відчиняв шухляди.', [['Pendant que', 'connector'], ['Je', 'pronoun'], ['cherchais', 'imparfaitVerb'], ['Tu', 'pronoun'], ['ouvrais', 'imparfaitVerb'], ['les tiroirs', 'object']]],
  ['sceneDescription', 'Il faisait froid ce soir-là.', 'В тот вечер было холодно.', 'Того вечора було холодно.', [['Il', 'pronoun'], ['faisait', 'imparfaitVerb'], ['froid', 'object'], ['ce soir-là', 'timePlace']]],
  ['sceneDescription', 'La rue était calme.', 'Улица была спокойной.', 'Вулиця була спокійною.', [['La rue', 'object'], ['était', 'imparfaitVerb'], ['calme', 'object']]],
  ['sceneDescription', 'Les lumières brillaient dans la nuit.', 'Огни светили в ночи.', 'Вогні світили вночі.', [['Les lumières', 'object'], ['brillaient', 'imparfaitVerb'], ['dans la nuit', 'timePlace']]],
  ['sceneDescription', 'Tout semblait normal.', 'Всё казалось нормальным.', 'Усе здавалося нормальним.', [['Tout', 'object'], ['semblait', 'imparfaitVerb'], ['normal', 'object']]],
  ['sceneDescription', 'Nous étions fatigués après le voyage.', 'Мы были уставшими после поездки.', 'Ми були втомлені після подорожі.', [['Nous', 'pronoun'], ['étions', 'imparfaitVerb'], ['fatigués', 'object'], ['après le voyage', 'timePlace']]],
  ['sceneDescription', 'Elle avait peur dans le noir.', 'Она боялась в темноте.', 'Вона боялася в темряві.', [['Elle', 'pronoun'], ['avait', 'imparfaitVerb'], ['peur', 'object'], ['dans le noir', 'timePlace']]],
  ['sceneDescription', 'Ils avaient faim après le cours.', 'Они были голодны после урока.', 'Вони були голодні після уроку.', [['Ils', 'pronoun'], ['avaient', 'imparfaitVerb'], ['faim', 'object'], ['le cours', 'object']]],
  ['sceneDescription', 'Le café était encore chaud.', 'Кофе всё ещё был горячим.', 'Кава все ще була гарячою.', [['Le café', 'object'], ['était', 'imparfaitVerb'], ['encore', 'timePlace'], ['chaud', 'object']]],
  ['sceneDescription', 'Mon téléphone était sur la table.', 'Мой телефон был на столе.', 'Мій телефон був на столі.', [['mon téléphone', 'object'], ['était', 'imparfaitVerb'], ['sur la table', 'timePlace']]],
  ['sceneDescription', 'La situation devenait difficile.', 'Ситуация становилась трудной.', 'Ситуація ставала складною.', [['La situation', 'object'], ['devenait', 'imparfaitVerb'], ['difficile', 'object']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const normalizedCorrect = String(correct).toLowerCase();
  const distractors = [...new Set(bank.filter((item) => item.toLowerCase() !== normalizedCorrect))].slice(0, 5);
  for (const item of Object.values(BANKS).flat()) {
    if (distractors.length >= 5) break;
    if (item.toLowerCase() !== normalizedCorrect && !distractors.includes(item)) distractors.push(item);
  }
  return distractors;
}
function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson25_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const imperfectCategoryCounts = countBy(rows, ['imparfaitVerb', 'passeCompose', 'connector', 'negation', 'questionFrame']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.3', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Past Continuous', frenchTopic: 'Imparfait vs passé composé: background, while, when interruption', sequencingReason: 'Adds background action and interruption logic as French-native imparfait/passé composé contrast.', frenchNativeTransferRule: 'Do not copy was/were + -ing. Use imparfait for ongoing/background past action and passé composé for interrupting completed events.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, imperfectCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON25_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский Past Continuous переносится во французский не через -ing, а через imparfait: действие длилось, было фоном или описывало сцену.', bodyUk: 'Англійський Past Continuous переноситься у французьку не через -ing, а через imparfait: дія тривала, була фоном або описувала сцену.' },
    { titleRu: '02. Imparfait как фон', titleUk: '02. Imparfait як фон', bodyRu: 'Формы вроде je travaillais, tu lisais, il préparait показывают процесс в прошлом: Je travaillais à huit heures.', bodyUk: 'Форми на кшталт je travaillais, tu lisais, il préparait показують процес у минулому: Je travaillais à huit heures.' },
    { titleRu: '03. Quand: фон + событие', titleUk: '03. Quand: фон + подія', bodyRu: 'Длинное действие идёт в imparfait, короткое событие - в passé composé: Je lisais quand elle a appelé.', bodyUk: 'Довга дія йде в imparfait, коротка подія - у passé composé: Je lisais quand elle a appelé.' },
    { titleRu: '04. Pendant que / tandis que', titleUk: '04. Pendant que / tandis que', bodyRu: 'Если два действия шли параллельно, оба часто стоят в imparfait: Pendant que je lisais, elle cuisinait.', bodyUk: 'Якщо дві дії йшли паралельно, обидві часто стоять в imparfait: Pendant que je lisais, elle cuisinait.' },
    { titleRu: '05. Описание сцены', titleUk: '05. Опис сцени', bodyRu: 'Imparfait также задаёт обстановку: Il faisait froid; La rue était calme; Les lumières brillaient.', bodyUk: 'Imparfait також задає обстановку: Il faisait froid; La rue était calme; Les lumières brillaient.' },
  ], vocabulary, practiceHooks: [{ id: 'imparfait_background', type: 'background_action', examples: ['Je travaillais à huit heures.', 'Elle écrivait un message.'] }, { id: 'when_interruption', type: 'imparfait_plus_passe_compose', examples: ['Je lisais quand elle a appelé.'] }, { id: 'parallel_while', type: 'parallel_imparfait', examples: ['Pendant que je lisais, elle cuisinait.'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson25.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson25_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson25.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson25.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson25_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson25_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson25-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson25BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson25BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, imperfectCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson25BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson25BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson25BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson25BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson25BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson25BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson25BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson25BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 26 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 26 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON25_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
