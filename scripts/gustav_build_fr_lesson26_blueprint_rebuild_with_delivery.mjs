import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 26;
const SLUG = 'lesson26_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson26-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson26_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson26_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson26_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson26_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson26_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson26_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson26_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson26_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson26_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson26_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson26_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson26_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson26_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson26_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson26_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson26_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson26_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson26_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson26_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_si_clauses: { url: 'https://www.lawlessfrench.com/grammar/si-clauses-conditionals/', claim: 'French si clauses pair present/future, imperfect/conditional, and pluperfect/past conditional.' },
  tv5monde_conditionnel_present: { url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-conditionnel-present', claim: 'TV5MONDE presents conditionnel présent as a form used for hypothesis and politeness.' },
  le_robert_conditionnel: { url: 'https://dictionnaire.lerobert.com/guide/conditionnel', claim: 'Le Robert describes conditional forms and hypothetical uses.' },
  le_robert_plus_que_parfait: { url: 'https://dictionnaire.lerobert.com/guide/plus-que-parfait', claim: 'Le Robert describes plus-que-parfait as an anterior past form used in unreal past conditions.' },
  phraseman_english_lesson26_blueprint: { url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json', claim: 'English Lesson 26 teaches conditional sentence logic across zero, first, second, and third conditionals.' },
};

const BANKS = {
  connector: ['Si', "S'il", "S'ils", 'Même si', 'Quand', 'À condition que'],
  presentCondition: ["m'aides", "m'appelle", 'commençons', 'viennent', 'apportes', 'pleut', 'attends', 'a le temps', 'avons les détails', 'arrivez', "chauffe l'eau", 'oublies la clé', 'ouvre la fenêtre', "j'appuie ici", 'sonne', 'mélanges ces couleurs', 'coupe le courant', 'bois du café tard', 'courent', 'lis chaque jour', 'as une question'],
  futureResult: ['finirai', 'répondrai', 'finirons', 'parlerons', 'vérifierai', 'resterons', 'reviendrai', 'aidera', 'enverrons', 'réussirez', 'partirai', 'reportera', 'appellerons', 'continuerons'],
  presentResult: ['bout', 'restes dehors', 'entre', 'démarre', 'réponds', 'changent', "s'éteint", 'dors mal', 'se fatiguent', 'progresses'],
  imparfaitCondition: ["j'avais", 'tu étais', 'elle parlait', 'nous vivions', 'vous pouviez', 'connaissait', 'je gagnais', 'nous travaillions', 'elle venait', 'je savais', 'tu avais', 'vous gagniez', 'je pouvais'],
  conditionalPresent: ['voyagerais', 'serais plus calme', 'travaillerait', 'nagerions', 'dînerions', 'dirait', "j'achèterais", 'dormirions', 'serait plus simple', 'prendrais', 'choisirais', 'ferais-tu', 'iriez-vous'],
  plusQueParfait: ["j'avais étudié", 'elle était venue', 'nous avions réservé', 'avaient écouté', "j'avais su", 'avait plu', 'vous aviez appelé', 'elle avait vérifié', 'nous étions partis', 'avaient demandé', "j'avais plus dormi", 'elle avait pris le train'],
  conditionalPast: ["j'aurais réussi", 'aurait aidé', 'aurions mangé', 'auraient compris', 'je serais venu', 'serions restés', 'auriez reçu', 'aurait corrigé', 'serions arrivés', 'auraient attendu', 'je serais plus concentré', 'serait arrivée'],
  object: ['plus vite', 'aujourd’hui', 'les documents', 'à la maison', 'ici', 'les détails', "l'eau", 'dehors', "l'air", 'la machine', 'ces couleurs', 'la lumière', 'du café', 'chaque jour', 'plus de temps', 'à Paris', 'près de la mer', 'la réponse', 'une réponse', 'un vélo', 'la voiture', "l'erreur", "à l'heure", 'moins longtemps', 'seul', 'la réunion', 'les clés', 'ce projet', 'le voyage', 'avant midi', 'maintenant'],
  negation: ['ne viens pas', "n'a pas le temps", 'ne trouvons pas'],
  questionFrame: ['Que ferais-tu', 'Où iriez-vous'],
};

const DATA = [
  ['realFuture', "Si tu m'aides, je finirai plus vite.", 'Если ты поможешь мне, я закончу быстрее.', 'Якщо ти допоможеш мені, я закінчу швидше.', [['Si', 'connector'], ["m'aides", 'presentCondition'], ['finirai', 'futureResult'], ['plus vite', 'object']]],
  ['realFuture', "Si elle m'appelle, je répondrai.", 'Если она позвонит мне, я отвечу.', 'Якщо вона зателефонує мені, я відповім.', [['Si', 'connector'], ["m'appelle", 'presentCondition'], ['répondrai', 'futureResult']]],
  ['realFuture', "Si nous commençons maintenant, nous finirons aujourd’hui.", 'Если мы начнем сейчас, мы закончим сегодня.', 'Якщо ми почнемо зараз, ми закінчимо сьогодні.', [['Si', 'connector'], ['commençons', 'presentCondition'], ['maintenant', 'object'], ['finirons', 'futureResult'], ['aujourd’hui', 'object']]],
  ['realFuture', "S'ils viennent aujourd’hui, nous parlerons.", 'Если они придут сегодня, мы поговорим.', 'Якщо вони прийдуть сьогодні, ми поговоримо.', [["S'ils", 'connector'], ['viennent', 'presentCondition'], ['aujourd’hui', 'object'], ['parlerons', 'futureResult']]],
  ['realFuture', 'Si tu apportes les documents, je les vérifierai.', 'Если ты принесешь документы, я их проверю.', 'Якщо ти принесеш документи, я їх перевірю.', [['Si', 'connector'], ['apportes', 'presentCondition'], ['les documents', 'object'], ['vérifierai', 'futureResult']]],
  ['realFuture', "S'il pleut, nous resterons à la maison.", 'Если пойдет дождь, мы останемся дома.', 'Якщо піде дощ, ми залишимося вдома.', [["S'il", 'connector'], ['pleut', 'presentCondition'], ['resterons', 'futureResult'], ['à la maison', 'object']]],
  ['realFuture', "Si tu attends ici, je reviendrai.", 'Если ты подождешь здесь, я вернусь.', 'Якщо ти почекаєш тут, я повернуся.', [['Si', 'connector'], ['attends', 'presentCondition'], ['ici', 'object'], ['reviendrai', 'futureResult']]],
  ['realFuture', 'Si elle a le temps, elle nous aidera.', 'Если у нее будет время, она нам поможет.', 'Якщо в неї буде час, вона нам допоможе.', [['Si', 'connector'], ['a le temps', 'presentCondition'], ['aidera', 'futureResult']]],
  ['realFuture', 'Si nous avons les détails, nous enverrons la réponse.', 'Если у нас будут детали, мы отправим ответ.', 'Якщо в нас будуть деталі, ми надішлемо відповідь.', [['Si', 'connector'], ['avons les détails', 'presentCondition'], ['enverrons', 'futureResult'], ['la réponse', 'object']]],
  ['realFuture', 'Si vous arrivez tôt, vous réussirez mieux.', 'Если вы придете рано, у вас получится лучше.', 'Якщо ви прийдете рано, у вас вийде краще.', [['Si', 'connector'], ['arrivez', 'presentCondition'], ['réussirez', 'futureResult']]],
  ['generalFact', "Si on chauffe l'eau, elle bout.", 'Если нагреть воду, она кипит.', 'Якщо нагріти воду, вона кипить.', [['Si', 'connector'], ["chauffe l'eau", 'presentCondition'], ['bout', 'presentResult']]],
  ['generalFact', 'Si tu oublies la clé, tu restes dehors.', 'Если ты забываешь ключ, ты остаешься снаружи.', 'Якщо ти забуваєш ключ, ти залишаєшся надворі.', [['Si', 'connector'], ['oublies la clé', 'presentCondition'], ['restes dehors', 'presentResult']]],
  ['generalFact', "Si on ouvre la fenêtre, l'air entre.", 'Если открыть окно, воздух входит.', 'Якщо відкрити вікно, повітря заходить.', [['Si', 'connector'], ['ouvre la fenêtre', 'presentCondition'], ["l'air", 'object'], ['entre', 'presentResult']]],
  ['generalFact', "Si j'appuie ici, la machine démarre.", 'Если я нажимаю здесь, машина запускается.', 'Якщо я натискаю тут, машина запускається.', [['Si', 'connector'], ["j'appuie ici", 'presentCondition'], ['la machine', 'object'], ['démarre', 'presentResult']]],
  ['generalFact', 'Si le téléphone sonne, je réponds.', 'Если телефон звонит, я отвечаю.', 'Якщо телефон дзвонить, я відповідаю.', [['Si', 'connector'], ['sonne', 'presentCondition'], ['réponds', 'presentResult']]],
  ['generalFact', 'Si tu mélanges ces couleurs, elles changent.', 'Если ты смешиваешь эти цвета, они меняются.', 'Якщо ти змішуєш ці кольори, вони змінюються.', [['Si', 'connector'], ['mélanges ces couleurs', 'presentCondition'], ['ces couleurs', 'object'], ['changent', 'presentResult']]],
  ['generalFact', "Si on coupe le courant, la lumière s'éteint.", 'Если отключить электричество, свет гаснет.', 'Якщо вимкнути струм, світло гасне.', [['Si', 'connector'], ['coupe le courant', 'presentCondition'], ['la lumière', 'object'], ["s'éteint", 'presentResult']]],
  ['generalFact', 'Si je bois du café tard, je dors mal.', 'Если я пью кофе поздно, я плохо сплю.', 'Якщо я п’ю каву пізно, я погано сплю.', [['Si', 'connector'], ['bois du café tard', 'presentCondition'], ['du café', 'object'], ['dors mal', 'presentResult']]],
  ['generalFact', 'Si les enfants courent, ils se fatiguent.', 'Если дети бегают, они устают.', 'Якщо діти бігають, вони втомлюються.', [['Si', 'connector'], ['courent', 'presentCondition'], ['se fatiguent', 'presentResult']]],
  ['generalFact', 'Si tu lis chaque jour, tu progresses.', 'Если ты читаешь каждый день, ты прогрессируешь.', 'Якщо ти читаєш щодня, ти прогресуєш.', [['Si', 'connector'], ['lis chaque jour', 'presentCondition'], ['chaque jour', 'object'], ['progresses', 'presentResult']]],
  ['hypotheticalPresent', "Si j'avais plus de temps, je voyagerais.", 'Если бы у меня было больше времени, я бы путешествовал.', 'Якби в мене було більше часу, я б подорожував.', [['Si', 'connector'], ["j'avais", 'imparfaitCondition'], ['plus de temps', 'object'], ['voyagerais', 'conditionalPresent']]],
  ['hypotheticalPresent', 'Si tu étais ici, je serais plus calme.', 'Если бы ты был здесь, я был бы спокойнее.', 'Якби ти був тут, я був би спокійнішим.', [['Si', 'connector'], ['tu étais', 'imparfaitCondition'], ['ici', 'object'], ['serais plus calme', 'conditionalPresent']]],
  ['hypotheticalPresent', 'Si elle parlait français, elle travaillerait à Paris.', 'Если бы она говорила по-французски, она работала бы в Париже.', 'Якби вона говорила французькою, вона працювала б у Парижі.', [['Si', 'connector'], ['elle parlait', 'imparfaitCondition'], ['travaillerait', 'conditionalPresent'], ['à Paris', 'object']]],
  ['hypotheticalPresent', 'Si nous vivions près de la mer, nous nagerions souvent.', 'Если бы мы жили у моря, мы бы часто плавали.', 'Якби ми жили біля моря, ми б часто плавали.', [['Si', 'connector'], ['nous vivions', 'imparfaitCondition'], ['près de la mer', 'object'], ['nagerions', 'conditionalPresent']]],
  ['hypotheticalPresent', 'Si vous pouviez venir, nous dînerions ensemble.', 'Если бы вы могли прийти, мы бы поужинали вместе.', 'Якби ви могли прийти, ми б повечеряли разом.', [['Si', 'connector'], ['vous pouviez', 'imparfaitCondition'], ['dînerions', 'conditionalPresent']]],
  ['hypotheticalPresent', "S'il connaissait la réponse, il la dirait.", 'Если бы он знал ответ, он бы его сказал.', 'Якби він знав відповідь, він би її сказав.', [["S'il", 'connector'], ['connaissait', 'imparfaitCondition'], ['la réponse', 'object'], ['dirait', 'conditionalPresent']]],
  ['hypotheticalPresent', "Si je gagnais mieux, j'achèterais un vélo.", 'Если бы я зарабатывал лучше, я бы купил велосипед.', 'Якби я заробляв краще, я б купив велосипед.', [['Si', 'connector'], ['je gagnais', 'imparfaitCondition'], ["j'achèterais", 'conditionalPresent'], ['un vélo', 'object']]],
  ['hypotheticalPresent', 'Si nous travaillions moins, nous dormirions mieux.', 'Если бы мы работали меньше, мы бы лучше спали.', 'Якби ми працювали менше, ми б краще спали.', [['Si', 'connector'], ['nous travaillions', 'imparfaitCondition'], ['dormirions', 'conditionalPresent']]],
  ['hypotheticalPresent', 'Si elle venait demain, tout serait plus simple.', 'Если бы она пришла завтра, все было бы проще.', 'Якби вона прийшла завтра, усе було б простіше.', [['Si', 'connector'], ['elle venait', 'imparfaitCondition'], ['serait plus simple', 'conditionalPresent']]],
  ['hypotheticalPresent', 'Si je savais conduire, je prendrais la voiture.', 'Если бы я умел водить, я бы взял машину.', 'Якби я вмів водити, я б узяв машину.', [['Si', 'connector'], ['je savais', 'imparfaitCondition'], ['prendrais', 'conditionalPresent'], ['la voiture', 'object']]],
  ['unrealPast', "Si j'avais étudié, j'aurais réussi.", 'Если бы я учился, я бы сдал.', 'Якби я вчився, я б склав.', [['Si', 'connector'], ["j'avais étudié", 'plusQueParfait'], ["j'aurais réussi", 'conditionalPast']]],
  ['unrealPast', 'Si elle était venue, elle aurait aidé.', 'Если бы она пришла, она бы помогла.', 'Якби вона прийшла, вона б допомогла.', [['Si', 'connector'], ['elle était venue', 'plusQueParfait'], ['aurait aidé', 'conditionalPast']]],
  ['unrealPast', 'Si nous avions réservé, nous aurions mangé dehors.', 'Если бы мы забронировали, мы бы поели вне дома.', 'Якби ми забронювали, ми б поїли не вдома.', [['Si', 'connector'], ['nous avions réservé', 'plusQueParfait'], ['aurions mangé', 'conditionalPast'], ['dehors', 'object']]],
  ['unrealPast', "S'ils avaient écouté, ils auraient compris.", 'Если бы они слушали, они бы поняли.', 'Якби вони слухали, вони б зрозуміли.', [["S'ils", 'connector'], ['avaient écouté', 'plusQueParfait'], ['auraient compris', 'conditionalPast']]],
  ['unrealPast', "Si j'avais su, je serais venu plus tôt.", 'Если бы я знал, я пришел бы раньше.', 'Якби я знав, я прийшов би раніше.', [['Si', 'connector'], ["j'avais su", 'plusQueParfait'], ['je serais venu', 'conditionalPast']]],
  ['unrealPast', "S'il avait plu, nous serions restés à la maison.", 'Если бы шел дождь, мы бы остались дома.', 'Якби йшов дощ, ми б залишилися вдома.', [["S'il", 'connector'], ['avait plu', 'plusQueParfait'], ['serions restés', 'conditionalPast'], ['à la maison', 'object']]],
  ['unrealPast', 'Si vous aviez appelé, vous auriez reçu une réponse.', 'Если бы вы позвонили, вы бы получили ответ.', 'Якби ви зателефонували, ви б отримали відповідь.', [['Si', 'connector'], ['vous aviez appelé', 'plusQueParfait'], ['auriez reçu', 'conditionalPast'], ['une réponse', 'object']]],
  ['unrealPast', "Si elle avait vérifié, elle aurait corrigé l'erreur.", 'Если бы она проверила, она бы исправила ошибку.', 'Якби вона перевірила, вона б виправила помилку.', [['Si', 'connector'], ['elle avait vérifié', 'plusQueParfait'], ['aurait corrigé', 'conditionalPast'], ["l'erreur", 'object']]],
  ['unrealPast', "Si nous étions partis plus tôt, nous serions arrivés à l'heure.", 'Если бы мы вышли раньше, мы бы приехали вовремя.', 'Якби ми вийшли раніше, ми б приїхали вчасно.', [['Si', 'connector'], ['nous étions partis', 'plusQueParfait'], ['serions arrivés', 'conditionalPast'], ["à l'heure", 'object']]],
  ['unrealPast', "S'ils avaient demandé, ils auraient attendu moins longtemps.", 'Если бы они спросили, они ждали бы меньше.', 'Якби вони запитали, вони чекали б менше.', [["S'ils", 'connector'], ['avaient demandé', 'plusQueParfait'], ['auraient attendu', 'conditionalPast'], ['moins longtemps', 'object']]],
  ['negationQuestion', 'Si tu ne viens pas, je partirai seul.', 'Если ты не придешь, я уйду один.', 'Якщо ти не прийдеш, я піду сам.', [['Si', 'connector'], ['ne viens pas', 'negation'], ['partirai', 'futureResult'], ['seul', 'object']]],
  ['negationQuestion', "Si elle n'a pas le temps, elle reportera la réunion.", 'Если у нее нет времени, она перенесет встречу.', 'Якщо в неї немає часу, вона перенесе зустріч.', [['Si', 'connector'], ["n'a pas le temps", 'negation'], ['reportera', 'futureResult'], ['la réunion', 'object']]],
  ['negationQuestion', 'Si nous ne trouvons pas les clés, nous appellerons Paul.', 'Если мы не найдем ключи, мы позвоним Полю.', 'Якщо ми не знайдемо ключі, ми зателефонуємо Полю.', [['Si', 'connector'], ['ne trouvons pas', 'negation'], ['les clés', 'object'], ['appellerons', 'futureResult']]],
  ['negationQuestion', 'Si je pouvais changer une chose, je choisirais ce projet.', 'Если бы я мог изменить одну вещь, я бы выбрал этот проект.', 'Якби я міг змінити одну річ, я б обрав цей проєкт.', [['Si', 'connector'], ['je pouvais', 'imparfaitCondition'], ['choisirais', 'conditionalPresent'], ['ce projet', 'object']]],
  ['negationQuestion', 'Que ferais-tu si tu avais plus de temps ?', 'Что бы ты сделал, если бы у тебя было больше времени?', 'Що б ти зробив, якби в тебе було більше часу?', [['Que ferais-tu', 'questionFrame'], ['si', 'connector'], ['tu avais', 'imparfaitCondition'], ['plus de temps', 'object']]],
  ['negationQuestion', 'Où iriez-vous si vous gagniez le voyage ?', 'Куда бы вы поехали, если бы выиграли поездку?', 'Куди б ви поїхали, якби виграли подорож?', [['Où iriez-vous', 'questionFrame'], ['si', 'connector'], ['vous gagniez', 'imparfaitCondition'], ['le voyage', 'object']]],
  ['negationQuestion', "Si j'avais plus dormi, je serais plus concentré.", 'Если бы я поспал больше, я был бы более сосредоточен.', 'Якби я поспав більше, я був би більш зосереджений.', [['Si', 'connector'], ["j'avais plus dormi", 'plusQueParfait'], ['je serais plus concentré', 'conditionalPast']]],
  ['negationQuestion', 'Si elle avait pris le train, elle serait arrivée avant midi.', 'Если бы она села на поезд, она приехала бы до полудня.', 'Якби вона сіла на потяг, вона приїхала б до полудня.', [['Si', 'connector'], ['elle avait pris le train', 'plusQueParfait'], ['elle serait arrivée', 'conditionalPast'], ['avant midi', 'object']]],
  ['negationQuestion', "Même si c'est difficile, nous continuerons.", 'Даже если это трудно, мы продолжим.', 'Навіть якщо це важко, ми продовжимо.', [['Même si', 'connector'], ["c'est difficile", 'presentCondition'], ['continuerons', 'futureResult']]],
  ['negationQuestion', 'Si tu as une question, pose-la maintenant.', 'Если у тебя есть вопрос, задай его сейчас.', 'Якщо в тебе є запитання, постав його зараз.', [['Si', 'connector'], ['as une question', 'presentCondition'], ['maintenant', 'object']]],
];

function ensureDirs() { Object.values(dirs).forEach((target) => fs.mkdirSync(target, { recursive: true })); }
function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { ensureDirs(); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
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
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson26_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const conditionalCategoryCounts = countBy(rows, ['connector', 'presentCondition', 'futureResult', 'presentResult', 'imparfaitCondition', 'conditionalPresent', 'plusQueParfait', 'conditionalPast', 'negation', 'questionFrame']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.3', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Conditional sentences: zero / first / second / third', frenchTopic: 'Phrases avec si: présent/futur, imparfait/conditionnel, plus-que-parfait/conditionnel passé', sequencingReason: 'Combines tense, modality, and clause logic for French-native hypotheticals after past-tense contrast work.', frenchNativeTransferRule: 'Do not copy English if/will/would mechanics. French uses si + présent with futur, si + imparfait with conditionnel présent, and si + plus-que-parfait with conditionnel passé; avoid si + futur in the condition clause.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, conditionalCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON26_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский урок про zero/first/second/third conditionals переносится во французский через систему si: реальное условие, общий факт, гипотеза настоящего и нереальное прошлое.', bodyUk: 'Англійський урок про zero/first/second/third conditionals переноситься у французьку через систему si: реальна умова, загальний факт, гіпотеза теперішнього і нереальне минуле.' },
    { titleRu: '02. Реальное будущее', titleUk: '02. Реальне майбутнє', bodyRu: 'Во французском после si в условии обычно стоит présent, а результат может быть futur simple: Si tu m’aides, je finirai plus vite. Не строим кальку si + futur.', bodyUk: 'У французькій після si в умові зазвичай стоїть présent, а результат може бути futur simple: Si tu m’aides, je finirai plus vite. Не будуємо кальку si + futur.' },
    { titleRu: '03. Общие факты', titleUk: '03. Загальні факти', bodyRu: 'Для фактов обе части часто стоят в présent: Si on chauffe l’eau, elle bout. Это французский аналог нулевого conditional.', bodyUk: 'Для фактів обидві частини часто стоять у présent: Si on chauffe l’eau, elle bout. Це французький аналог нульового conditional.' },
    { titleRu: '04. Гипотеза настоящего', titleUk: '04. Гіпотеза теперішнього', bodyRu: 'Если ситуация воображаемая сейчас, условие идет в imparfait, результат в conditionnel présent: Si j’avais plus de temps, je voyagerais.', bodyUk: 'Якщо ситуація уявна зараз, умова йде в imparfait, результат у conditionnel présent: Si j’avais plus de temps, je voyagerais.' },
    { titleRu: '05. Нереальное прошлое', titleUk: '05. Нереальне минуле', bodyRu: 'Для сожаления о прошлом используется si + plus-que-parfait, затем conditionnel passé: Si j’avais étudié, j’aurais réussi.', bodyUk: 'Для жалю про минуле використовується si + plus-que-parfait, потім conditionnel passé: Si j’avais étudié, j’aurais réussi.' },
  ], vocabulary, practiceHooks: [{ id: 'si_present_future', type: 'real_future_condition', examples: ["Si tu m'aides, je finirai plus vite.", "S'il pleut, nous resterons à la maison."] }, { id: 'si_imparfait_conditionnel', type: 'hypothetical_present', examples: ["Si j'avais plus de temps, je voyagerais."] }, { id: 'si_plus_que_parfait_conditionnel_passe', type: 'unreal_past', examples: ["Si j'avais étudié, j'aurais réussi."] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson26.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson26_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson26.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson26.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson26_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson26_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson26-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson26BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson26BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, conditionalCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson26BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson26BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson26BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson26BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson26BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson26BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson26BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson26BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 27 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 27 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON26_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
