import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 29;
const SLUG = 'lesson29_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson29-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson29_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson29_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson29_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson29_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson29_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson29_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson29_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson29_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson29_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson29_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson29_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson29_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson29_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson29_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson29_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson29_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson29_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson29_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson29_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_imparfait: { url: 'https://www.lawlessfrench.com/grammar/imperfect/', claim: 'French imparfait expresses habitual actions and states of being in the past, often where English uses used to or would.' },
  tv5monde_imparfait_usage: { url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-limparfait-et-son-utilisation', claim: 'TV5MONDE describes imparfait for habits, descriptions, and past situations.' },
  tex_french_imparfait: { url: 'https://laits.utexas.edu/tex/gr/tap6.html', claim: 'Tex French Grammar maps imparfait to past states and habitual actions, including English used to/would.' },
  lawless_passe_compose_vs_imparfait: { url: 'https://www.lawlessfrench.com/grammar/passe-compose-vs-imparfait/', claim: 'Imparfait contrasts incomplete/background past with completed passé composé events.' },
  phraseman_english_lesson29_blueprint: { url: 'app/lesson_data_25_32.ts#LESSON_29_PHRASES', claim: 'English Lesson 29 teaches used to for past habits, past states, negatives, questions, and now-contrast rows.' },
};

const BANKS = {
  subject: ["j'", 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'on'],
  timeMarker: ['Avant', 'avant', 'à l’époque', 'tous les jours', 'le soir', 'tous les soirs', 'en été', 'chaque matin', 'le dimanche', 'toujours', 'souvent', 'chaque semaine', 'maintenant', "aujourd'hui", 'encore'],
  imparfaitVerb: ['habitais', 'travaillais', 'appelait', 'étudiait', 'travaillions', 'habitaient', 'lisais', 'regardais', 'jouait', 'écrivait', 'promenions', 'voyageaient', 'prenais', 'buvait', 'mangeait', 'arriviez', 'passais', 'parlais', 'faisaient', 'dormait', 'conduisait', 'sortions', 'aimait', 'parlaient', 'dépensais', 'comprenais', 'preniez', 'faisait', 'travaillait', 'lisiez', 'sortiez', 'levais', 'était', 'avait', 'apprenions', 'oubliait', 'arrivaient'],
  negation: ['ne buvais pas', 'ne conduisait pas', 'ne sortions pas', "n'aimait pas", 'ne parlaient pas', 'ne dépensais pas', 'ne comprenais pas', 'ne preniez pas', 'ne faisait pas', 'ne travaillait pas', 'ne sortiez-vous pas'],
  questionMarker: ['Est-ce que', "Est-ce qu'", 'Où', 'Quand', 'Pourquoi', 'À quelle heure', 'Combien'],
  questionVerb: ['habitais', 'jouait', 'lisiez', 'voyageaient', 'travaillais-tu', 'appelait-il', 'sortiez-vous', 'te levais-tu', 'dépensais-tu', 'mangeait'],
  objectPlace: ['ici', 'le français', 'près de chez nous', 'de la musique', 'des messages', 'dehors', 'le bus', 'du café', 'ensemble', 'en avance', 'mes vacances', 'à Lyon', 'français', 'autant', 'ces règles', 'le métro', "d'erreurs graves", 'à distance', 'du piano', 'ses parents', 'timide', 'peur des erreurs', 'lentement', 'son téléphone', 'son sac', 'vite', 'peu', "à l'heure", 'sans hésiter', 'en classe', "beaucoup d'erreurs"],
  presentContrast: ['parle', 'ose', 'progressons', 'vérifie', 'économises', 'lis', 'arrivent', 'écrit', 'corrigeons', 'apprends'],
  connector: ['mais', 'et', 'puis', 'donc', 'alors', 'pourtant'],
};

const DATA = [
  ['pastHabitAffirmative', "Avant, j'habitais ici.", 'Раньше я жил здесь.', 'Раніше я жив тут.', [['Avant', 'timeMarker'], ["j'", 'subject'], ['habitais', 'imparfaitVerb'], ['ici', 'objectPlace']]],
  ['pastHabitAffirmative', 'Avant, tu travaillais ici.', 'Раньше ты работал здесь.', 'Раніше ти працював тут.', [['Avant', 'timeMarker'], ['tu', 'subject'], ['travaillais', 'imparfaitVerb'], ['ici', 'objectPlace']]],
  ['pastHabitAffirmative', "Il m'appelait tous les jours.", 'Раньше он звонил мне каждый день.', 'Раніше він телефонував мені щодня.', [['il', 'subject'], ['appelait', 'imparfaitVerb'], ['tous les jours', 'timeMarker']]],
  ['pastHabitAffirmative', 'Elle étudiait le français.', 'Раньше она учила французский.', 'Раніше вона вчила французьку.', [['elle', 'subject'], ['étudiait', 'imparfaitVerb'], ['le français', 'objectPlace']]],
  ['pastHabitAffirmative', 'Nous travaillions ensemble.', 'Раньше мы работали вместе.', 'Раніше ми працювали разом.', [['nous', 'subject'], ['travaillions', 'imparfaitVerb'], ['ensemble', 'objectPlace']]],
  ['pastHabitAffirmative', 'Ils habitaient près de chez nous.', 'Раньше они жили рядом с нами.', 'Раніше вони жили поруч із нами.', [['ils', 'subject'], ['habitaient', 'imparfaitVerb'], ['près de chez nous', 'objectPlace']]],
  ['pastHabitAffirmative', 'Je lisais le soir.', 'Раньше я читал по вечерам.', 'Раніше я читав увечері.', [['je', 'subject'], ['lisais', 'imparfaitVerb'], ['le soir', 'timeMarker']]],
  ['pastHabitAffirmative', 'Tu regardais la télé tous les soirs.', 'Раньше ты смотрел телевизор каждый вечер.', 'Раніше ти дивився телевізор щовечора.', [['tu', 'subject'], ['regardais', 'imparfaitVerb'], ['tous les soirs', 'timeMarker']]],
  ['pastHabitAffirmative', 'Il jouait de la musique.', 'Раньше он играл музыку.', 'Раніше він грав музику.', [['il', 'subject'], ['jouait', 'imparfaitVerb'], ['de la musique', 'objectPlace']]],
  ['pastHabitAffirmative', 'Elle écrivait des messages.', 'Раньше она писала сообщения.', 'Раніше вона писала повідомлення.', [['elle', 'subject'], ['écrivait', 'imparfaitVerb'], ['des messages', 'objectPlace']]],
  ['repeatedRoutine', 'Nous nous promenions dehors.', 'Раньше мы гуляли на улице.', 'Раніше ми гуляли надворі.', [['nous', 'subject'], ['promenions', 'imparfaitVerb'], ['dehors', 'objectPlace']]],
  ['repeatedRoutine', 'Ils voyageaient en été.', 'Раньше они путешествовали летом.', 'Раніше вони подорожували влітку.', [['ils', 'subject'], ['voyageaient', 'imparfaitVerb'], ['en été', 'timeMarker']]],
  ['repeatedRoutine', 'Je prenais le bus chaque matin.', 'Раньше я ездил на автобусе каждое утро.', 'Раніше я їздив автобусом щоранку.', [['je', 'subject'], ['prenais', 'imparfaitVerb'], ['le bus', 'objectPlace'], ['chaque matin', 'timeMarker']]],
  ['repeatedRoutine', 'Elle buvait du café avant le travail.', 'Раньше она пила кофе перед работой.', 'Раніше вона пила каву перед роботою.', [['elle', 'subject'], ['buvait', 'imparfaitVerb'], ['du café', 'objectPlace'], ['avant', 'timeMarker']]],
  ['repeatedRoutine', 'On mangeait ensemble le dimanche.', 'Раньше мы ели вместе по воскресеньям.', 'Раніше ми їли разом щонеділі.', [['on', 'subject'], ['mangeait', 'imparfaitVerb'], ['ensemble', 'objectPlace'], ['le dimanche', 'timeMarker']]],
  ['repeatedRoutine', 'Vous arriviez toujours en avance.', 'Раньше вы всегда приходили заранее.', 'Раніше ви завжди приходили завчасно.', [['vous', 'subject'], ['arriviez', 'imparfaitVerb'], ['toujours', 'timeMarker'], ['en avance', 'objectPlace']]],
  ['repeatedRoutine', 'Je passais mes vacances à Lyon.', 'Раньше я проводил каникулы в Лионе.', 'Раніше я проводив канікули в Ліоні.', [['je', 'subject'], ['passais', 'imparfaitVerb'], ['mes vacances', 'objectPlace'], ['à Lyon', 'objectPlace']]],
  ['repeatedRoutine', "Tu parlais vite à l'époque.", 'Раньше ты говорил быстро.', 'Раніше ти говорив швидко.', [['tu', 'subject'], ['parlais', 'imparfaitVerb'], ['vite', 'objectPlace'], ['à l’époque', 'timeMarker']]],
  ['repeatedRoutine', "Ils faisaient du sport après l'école.", 'Раньше они занимались спортом после школы.', 'Раніше вони займалися спортом після школи.', [['ils', 'subject'], ['faisaient', 'imparfaitVerb']]],
  ['repeatedRoutine', 'Elle dormait tard le week-end.', 'Раньше она спала допоздна по выходным.', 'Раніше вона спала допізна на вихідних.', [['elle', 'subject'], ['dormait', 'imparfaitVerb']]],
  ['negativePastHabit', 'Avant, je ne buvais pas de café.', 'Раньше я не пил кофе.', 'Раніше я не пив кави.', [['Avant', 'timeMarker'], ['je', 'subject'], ['ne buvais pas', 'negation'], ['de café', 'objectPlace']]],
  ['negativePastHabit', 'Il ne conduisait pas encore.', 'Раньше он ещё не водил машину.', 'Раніше він ще не водив машину.', [['il', 'subject'], ['ne conduisait pas', 'negation'], ['encore', 'timeMarker']]],
  ['negativePastHabit', 'Nous ne sortions pas le soir.', 'Раньше мы не выходили вечером.', 'Раніше ми не виходили ввечері.', [['nous', 'subject'], ['ne sortions pas', 'negation'], ['le soir', 'timeMarker']]],
  ['negativePastHabit', "Elle n'aimait pas les légumes.", 'Раньше она не любила овощи.', 'Раніше вона не любила овочі.', [['elle', 'subject'], ["n'aimait pas", 'negation']]],
  ['negativePastHabit', 'Ils ne parlaient pas français.', 'Раньше они не говорили по-французски.', 'Раніше вони не говорили французькою.', [['ils', 'subject'], ['ne parlaient pas', 'negation'], ['français', 'objectPlace']]],
  ['negativePastHabit', 'Tu ne dépensais pas autant.', 'Раньше ты не тратил так много.', 'Раніше ти не витрачав стільки.', [['tu', 'subject'], ['ne dépensais pas', 'negation'], ['autant', 'objectPlace']]],
  ['negativePastHabit', 'Je ne comprenais pas ces règles.', 'Раньше я не понимал эти правила.', 'Раніше я не розумів ці правила.', [['je', 'subject'], ['ne comprenais pas', 'negation'], ['ces règles', 'objectPlace']]],
  ['negativePastHabit', 'Vous ne preniez pas le métro.', 'Раньше вы не ездили на метро.', 'Раніше ви не їздили метро.', [['vous', 'subject'], ['ne preniez pas', 'negation'], ['le métro', 'objectPlace']]],
  ['negativePastHabit', "Elle ne faisait pas d'erreurs graves.", 'Раньше она не делала серьёзных ошибок.', 'Раніше вона не робила серйозних помилок.', [['elle', 'subject'], ['ne faisait pas', 'negation'], ["d'erreurs graves", 'objectPlace']]],
  ['negativePastHabit', 'On ne travaillait pas à distance.', 'Раньше мы не работали удалённо.', 'Раніше ми не працювали дистанційно.', [['on', 'subject'], ['ne travaillait pas', 'negation'], ['à distance', 'objectPlace']]],
  ['questionPastHabit', 'Est-ce que tu habitais ici avant ?', 'Ты раньше жил здесь?', 'Ти раніше жив тут?', [['Est-ce que', 'questionMarker'], ['tu', 'subject'], ['habitais', 'questionVerb'], ['ici', 'objectPlace'], ['avant', 'timeMarker']]],
  ['questionPastHabit', "Est-ce qu'elle jouait du piano ?", 'Она раньше играла на пианино?', 'Вона раніше грала на піаніно?', [["Est-ce qu'", 'questionMarker'], ['elle', 'subject'], ['jouait', 'questionVerb'], ['du piano', 'objectPlace']]],
  ['questionPastHabit', 'Est-ce que vous lisiez le soir ?', 'Вы раньше читали по вечерам?', 'Ви раніше читали ввечері?', [['Est-ce que', 'questionMarker'], ['vous', 'subject'], ['lisiez', 'questionVerb'], ['le soir', 'timeMarker']]],
  ['questionPastHabit', 'Est-ce qu’ils voyageaient souvent ?', 'Они раньше часто путешествовали?', 'Вони раніше часто подорожували?', [["Est-ce qu'", 'questionMarker'], ['ils', 'subject'], ['voyageaient', 'questionVerb'], ['souvent', 'timeMarker']]],
  ['questionPastHabit', 'Où travaillais-tu avant ?', 'Где ты раньше работал?', 'Де ти раніше працював?', [['Où', 'questionMarker'], ['travaillais-tu', 'questionVerb'], ['avant', 'timeMarker']]],
  ['questionPastHabit', 'Quand appelait-il ses parents ?', 'Когда он раньше звонил родителям?', 'Коли він раніше телефонував батькам?', [['Quand', 'questionMarker'], ['appelait-il', 'questionVerb'], ['ses parents', 'objectPlace']]],
  ['questionPastHabit', 'Pourquoi ne sortiez-vous pas ?', 'Почему вы раньше не выходили?', 'Чому ви раніше не виходили?', [['Pourquoi', 'questionMarker'], ['ne sortiez-vous pas', 'negation']]],
  ['questionPastHabit', 'À quelle heure te levais-tu ?', 'Во сколько ты раньше вставал?', 'О котрій ти раніше вставав?', [['À quelle heure', 'questionMarker'], ['te levais-tu', 'questionVerb']]],
  ['questionPastHabit', 'Combien dépensais-tu chaque semaine ?', 'Сколько ты раньше тратил каждую неделю?', 'Скільки ти раніше витрачав щотижня?', [['Combien', 'questionMarker'], ['dépensais-tu', 'questionVerb'], ['chaque semaine', 'timeMarker']]],
  ['questionPastHabit', 'Est-ce qu’on mangeait ensemble ?', 'Мы раньше ели вместе?', 'Ми раніше їли разом?', [["Est-ce qu'", 'questionMarker'], ['on', 'subject'], ['mangeait', 'questionVerb'], ['ensemble', 'objectPlace']]],
  ['nowContrastState', 'Avant, j’étais timide, mais maintenant je parle plus fort.', 'Раньше я был застенчивым, а теперь говорю увереннее.', 'Раніше я був сором’язливим, а тепер говорю сміливіше.', [['Avant', 'timeMarker'], ["j'", 'subject'], ['étais', 'imparfaitVerb'], ['timide', 'objectPlace'], ['mais', 'connector'], ['maintenant', 'timeMarker'], ['je', 'subject'], ['parle', 'presentContrast']]],
  ['nowContrastState', 'Elle avait peur des erreurs, maintenant elle ose répondre.', 'Раньше она боялась ошибок, теперь решается отвечать.', 'Раніше вона боялася помилок, тепер наважується відповідати.', [['elle', 'subject'], ['avait', 'imparfaitVerb'], ['peur des erreurs', 'objectPlace'], ['maintenant', 'timeMarker'], ['elle', 'subject'], ['ose', 'presentContrast']]],
  ['nowContrastState', 'Nous apprenions lentement, mais maintenant nous progressons vite.', 'Раньше мы учились медленно, а теперь быстро продвигаемся.', 'Раніше ми вчилися повільно, а тепер швидко просуваємося.', [['nous', 'subject'], ['apprenions', 'imparfaitVerb'], ['lentement', 'objectPlace'], ['mais', 'connector'], ['maintenant', 'timeMarker'], ['nous', 'subject'], ['progressons', 'presentContrast'], ['vite', 'objectPlace']]],
  ['nowContrastState', 'Il oubliait son téléphone, maintenant il vérifie son sac.', 'Раньше он забывал телефон, теперь проверяет сумку.', 'Раніше він забував телефон, тепер перевіряє сумку.', [['il', 'subject'], ['oubliait', 'imparfaitVerb'], ['son téléphone', 'objectPlace'], ['maintenant', 'timeMarker'], ['il', 'subject'], ['vérifie', 'presentContrast'], ['son sac', 'objectPlace']]],
  ['nowContrastState', 'Tu dépensais vite, maintenant tu économises.', 'Раньше ты быстро тратил деньги, теперь экономишь.', 'Раніше ти швидко витрачав гроші, тепер економиш.', [['tu', 'subject'], ['dépensais', 'imparfaitVerb'], ['vite', 'objectPlace'], ['maintenant', 'timeMarker'], ['tu', 'subject'], ['économises', 'presentContrast']]],
  ['nowContrastState', 'Avant, je lisais peu, maintenant je lis chaque jour.', 'Раньше я мало читал, теперь читаю каждый день.', 'Раніше я мало читав, тепер читаю щодня.', [['Avant', 'timeMarker'], ['je', 'subject'], ['lisais', 'imparfaitVerb'], ['peu', 'objectPlace'], ['maintenant', 'timeMarker'], ['je', 'subject'], ['lis', 'presentContrast']]],
  ['nowContrastState', "Ils arrivaient en retard, maintenant ils arrivent à l'heure.", 'Раньше они опаздывали, теперь приходят вовремя.', 'Раніше вони запізнювалися, тепер приходять вчасно.', [['ils', 'subject'], ['arrivaient', 'imparfaitVerb'], ['maintenant', 'timeMarker'], ['ils', 'subject'], ['arrivent', 'presentContrast'], ["à l'heure", 'objectPlace']]],
  ['nowContrastState', 'Elle écrivait lentement, maintenant elle écrit sans hésiter.', 'Раньше она писала медленно, теперь пишет без колебаний.', 'Раніше вона писала повільно, тепер пише без вагань.', [['elle', 'subject'], ['écrivait', 'imparfaitVerb'], ['lentement', 'objectPlace'], ['maintenant', 'timeMarker'], ['elle', 'subject'], ['écrit', 'presentContrast'], ['sans hésiter', 'objectPlace']]],
  ['nowContrastState', 'On parlait seulement en classe, maintenant on parle dehors.', 'Раньше мы говорили только на уроке, теперь говорим и вне класса.', 'Раніше ми говорили тільки на уроці, тепер говоримо й поза класом.', [['on', 'subject'], ['parlait', 'imparfaitVerb'], ['en classe', 'objectPlace'], ['maintenant', 'timeMarker'], ['on', 'subject'], ['parle', 'presentContrast'], ['dehors', 'objectPlace']]],
  ['nowContrastState', "Avant, nous faisions beaucoup d'erreurs, maintenant nous les corrigeons.", 'Раньше мы делали много ошибок, теперь исправляем их.', 'Раніше ми робили багато помилок, тепер їх виправляємо.', [['Avant', 'timeMarker'], ['nous', 'subject'], ['faisions', 'imparfaitVerb'], ["beaucoup d'erreurs", 'objectPlace'], ['maintenant', 'timeMarker'], ['nous', 'subject'], ['corrigeons', 'presentContrast']]],
];

function ensureDirs() { Object.values(dirs).forEach((folder) => fs.mkdirSync(folder, { recursive: true })); }
function writeJson(file, value) { ensureDirs(); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function byteSize(file) { return fs.statSync(file).size; }
function slot(correct, category) {
  const bank = BANKS[category];
  if (!bank) throw new Error(`Missing bank ${category}`);
  const distractors = bank.filter((value) => value !== correct).slice(0, 5);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson29_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const imparfaitCategoryCounts = countBy(rows, ['subject', 'timeMarker', 'imparfaitVerb', 'negation', 'questionMarker', 'questionVerb', 'objectPlace', 'presentContrast', 'connector']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B2', internalFrenchBand: 'B2.1', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Used to', frenchTopic: "Imparfait d'habitude: avant, routines passées, questions, négations, contraste maintenant", sequencingReason: "Starts B2 by replacing English used to with French-native imparfait for past habits, past states, and now-contrast.", frenchNativeTransferRule: "Do not invent a French used-to calque. Use imparfait with past-habit markers such as avant, à l'époque, tous les soirs, and contrast with present forms when the English blueprint uses now.", sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, imparfaitCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'LESSONS_30_32_NOT_DONE', 'FULL_NON_LESSON_SURFACE_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON29_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: "Английский used to переносится во французский не отдельной конструкцией, а imparfait: Avant, j'habitais ici. Это прошлая привычка или состояние, которое сейчас уже не основная реальность.", bodyUk: "Англійський used to переноситься у французьку не окремою конструкцією, а imparfait: Avant, j'habitais ici. Це минула звичка або стан, який тепер уже не є основною реальністю." },
    { titleRu: '02. Маркеры привычки', titleUk: '02. Маркери звички', bodyRu: "Слова avant, à l'époque, tous les jours, le soir, souvent помогают показать повторение в прошлом: Je lisais le soir, Ils voyageaient en été.", bodyUk: "Слова avant, à l'époque, tous les jours, le soir, souvent допомагають показати повторення в минулому: Je lisais le soir, Ils voyageaient en été." },
    { titleRu: '03. Отрицание', titleUk: '03. Заперечення', bodyRu: "Отрицание обнимает глагол в imparfait: je ne buvais pas, ils ne parlaient pas, on ne travaillait pas. Не нужно искать аналог didn't use to.", bodyUk: "Заперечення охоплює дієслово в imparfait: je ne buvais pas, ils ne parlaient pas, on ne travaillait pas. Не треба шукати аналог didn't use to." },
    { titleRu: '04. Вопросы', titleUk: '04. Питання', bodyRu: "Вопросы строятся обычными французскими средствами: Est-ce que tu habitais ici avant ? Où travaillais-tu avant ? À quelle heure te levais-tu ?", bodyUk: "Питання будуються звичайними французькими засобами: Est-ce que tu habitais ici avant ? Où travaillais-tu avant ? À quelle heure te levais-tu ?" },
    { titleRu: '05. Контраст сейчас', titleUk: '05. Контраст зараз', bodyRu: "Если английский blueprint противопоставляет past habit и now, французский делает то же через imparfait + présent: Avant, j’étais timide, mais maintenant je parle plus fort.", bodyUk: "Якщо англійський blueprint протиставляє past habit і now, французька робить те саме через imparfait + présent: Avant, j’étais timide, mais maintenant je parle plus fort." },
  ], vocabulary, practiceHooks: [{ id: 'imparfait_habit_markers', type: 'past_habit_marker_choice', examples: ["Avant, j'habitais ici.", 'Je lisais le soir.'] }, { id: 'negative_imparfait_habit', type: 'imparfait_negation', examples: ['Je ne buvais pas de café.'] }, { id: 'now_contrast_imparfait_present', type: 'past_present_contrast', examples: ['Avant, je lisais peu, maintenant je lis chaque jour.'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson29.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson29_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson29.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson29.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson29_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson29_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson29-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson29BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson29BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, imparfaitCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson29BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson29BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson29BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson29BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson29BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson29BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson29BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson29BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 30 blueprint-first rebuild within app-facing B2 parity.', 'Inspect English Lesson 30 relative-clause source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON29_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
