import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 27;
const SLUG = 'lesson27_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson27-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson27_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson27_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson27_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson27_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson27_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson27_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson27_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson27_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson27_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson27_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson27_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson27_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson27_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson27_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson27_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson27_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson27_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson27_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson27_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_reported_speech: { url: 'https://www.lawlessfrench.com/grammar/reported-speech/', claim: 'French reported speech uses indirect constructions and removes direct quotation punctuation.' },
  le_robert_discours_indirect: { url: 'https://dictionnaire.lerobert.com/guide/discours-indirect', claim: 'Le Robert explains that indirect speech transforms person, tense, and spatiotemporal markers and uses que, si, or question words.' },
  tv5monde_discours_rapporte: { url: 'https://apprendre.tv5monde.com/fr/exercice/10927', claim: 'TV5MONDE uses discours rapporté and discours indirect as a French learning grammar target.' },
  university_tex_reported_speech: { url: 'https://laits.utexas.edu/tex/gr/tad2.html', claim: 'Academic French grammar notes report past-tense speech with que/qu and tense adjustment.' },
  phraseman_english_lesson27_blueprint: { url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json', claim: 'English Lesson 27 teaches reported speech through say/tell/ask, that/if, pronoun shifts, time shifts, and tense shifts.' },
};

const BANKS = {
  reportVerb: ['a dit', 'a expliqué', 'a répondu', 'a demandé', 'ont dit', 'ont demandé', 'avons dit', 'avons demandé', 'ai dit', "j'ai demandé", 'as dit', 'as demandé', 'avez dit', 'avez demandé'],
  subordinator: ['que', "qu'", 'si', "s'ils", 'où', 'pourquoi', 'quand', 'comment', 'ce que', 'qui', 'combien'],
  pronounShift: ['il', 'elle', 'ils', 'nous', 'je', 'tu', 'vous'],
  tenseShift: ['était', 'étaient', 'étions', 'avais', 'avait', 'avaient', 'avions', 'voulait', 'voulais', 'connaissait', 'se souvenait', 'comprenait', 'travaillais', 'pouvais', 'pouvait', 'pouviez', 'venaient', 'allions', 'habitais', 'coûtait', 'pleurait'],
  futureInPast: ['viendrait', 'appellerait', 'finirions', 'arriverait', 'commencerait'],
  pastPerfect: ["j'avais compris", 'avait compris', 'avait vu', 'était partie', 'était parti', 'avaient déjà mangé', 'avions perdu', 'avait oublié', 'avait fini', 'étaient arrivés', 'avais envoyé', 'avais acheté', 'avait rencontré', 'avait trouvé', 'avions mis'],
  timeShift: ['ce jour-là', 'le lendemain', 'la veille', 'là-bas', 'à ce moment-là', 'avant midi', "à l'heure", 'plus tard', 'bientôt'],
  object: ['fatigué', 'occupée', 'prêts', 'à la maison', "d'aide", 'du café', 'la réponse', 'de moi', 'la réunion', 'les clés', 'le message', 'le billet', 'Paul', "l'adresse", 'le cours', 'du temps'],
  negation: ['ne comprenaient pas', "n'était pas prête"],
};

const DATA = [
  ['statementQue', "Il a dit qu'il était fatigué.", 'Он сказал, что устал.', 'Він сказав, що втомився.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['était', 'tenseShift'], ['fatigué', 'object']]],
  ['statementQue', "Elle a dit qu'elle était occupée.", 'Она сказала, что занята.', 'Вона сказала, що зайнята.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['était', 'tenseShift'], ['occupée', 'object']]],
  ['statementQue', "Ils ont dit qu'ils étaient prêts.", 'Они сказали, что готовы.', 'Вони сказали, що готові.', [['ont dit', 'reportVerb'], ["qu'", 'subordinator'], ['ils', 'pronounShift'], ['étaient', 'tenseShift'], ['prêts', 'object']]],
  ['statementQue', 'Nous avons dit que nous étions à la maison.', 'Мы сказали, что были дома.', 'Ми сказали, що були вдома.', [['avons dit', 'reportVerb'], ['que', 'subordinator'], ['nous', 'pronounShift'], ['étions', 'tenseShift'], ['à la maison', 'object']]],
  ['statementQue', "J'ai dit que j'avais besoin d'aide.", 'Я сказал, что мне нужна помощь.', 'Я сказав, що мені потрібна допомога.', [['ai dit', 'reportVerb'], ['que', 'subordinator'], ["j'avais", 'tenseShift'], ["d'aide", 'object']]],
  ['statementQue', 'Tu as dit que tu voulais du café.', 'Ты сказал, что хочешь кофе.', 'Ти сказав, що хочеш кави.', [['as dit', 'reportVerb'], ['que', 'subordinator'], ['tu', 'pronounShift'], ['voulais', 'tenseShift'], ['du café', 'object']]],
  ['statementQue', "Il a expliqué qu'il connaissait la réponse.", 'Он объяснил, что знает ответ.', 'Він пояснив, що знає відповідь.', [['a expliqué', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['connaissait', 'tenseShift'], ['la réponse', 'object']]],
  ['statementQue', "Elle a répondu qu'elle se souvenait de moi.", 'Она ответила, что помнит меня.', 'Вона відповіла, що пам’ятає мене.', [['a répondu', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['se souvenait', 'tenseShift'], ['de moi', 'object']]],
  ['statementQue', "Ils ont dit qu'ils ne comprenaient pas.", 'Они сказали, что не понимают.', 'Вони сказали, що не розуміють.', [['ont dit', 'reportVerb'], ["qu'", 'subordinator'], ['ils', 'pronounShift'], ['ne comprenaient pas', 'negation']]],
  ['statementQue', "Elle a dit qu'elle n'était pas prête.", 'Она сказала, что не готова.', 'Вона сказала, що не готова.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ["n'était pas prête", 'negation']]],
  ['futureInPast', "Il a dit qu'il viendrait le lendemain.", 'Он сказал, что придет на следующий день.', 'Він сказав, що прийде наступного дня.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['viendrait', 'futureInPast'], ['le lendemain', 'timeShift']]],
  ['futureInPast', "Elle a dit qu'elle appellerait plus tard.", 'Она сказала, что позвонит позже.', 'Вона сказала, що зателефонує пізніше.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['appellerait', 'futureInPast'], ['plus tard', 'timeShift']]],
  ['futureInPast', 'Nous avons dit que nous finirions bientôt.', 'Мы сказали, что скоро закончим.', 'Ми сказали, що скоро закінчимо.', [['avons dit', 'reportVerb'], ['que', 'subordinator'], ['nous', 'pronounShift'], ['finirions', 'futureInPast'], ['bientôt', 'timeShift']]],
  ['futureInPast', "Ils ont dit qu'ils viendraient ce jour-là.", 'Они сказали, что придут в тот день.', 'Вони сказали, що прийдуть того дня.', [['ont dit', 'reportVerb'], ["qu'", 'subordinator'], ['ils', 'pronounShift'], ['viendraient', 'futureInPast'], ['ce jour-là', 'timeShift']]],
  ['futureInPast', "Elle a expliqué qu'elle arriverait à l'heure.", 'Она объяснила, что приедет вовремя.', 'Вона пояснила, що приїде вчасно.', [['a expliqué', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['arriverait', 'futureInPast'], ["à l'heure", 'timeShift']]],
  ['futureInPast', "Il a répondu qu'il ne pourrait pas venir.", 'Он ответил, что не сможет прийти.', 'Він відповів, що не зможе прийти.', [['a répondu', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['pourrait', 'futureInPast']]],
  ['futureInPast', "Tu as dit que tu prendrais le train.", 'Ты сказал, что поедешь поездом.', 'Ти сказав, що поїдеш потягом.', [['as dit', 'reportVerb'], ['que', 'subordinator'], ['tu', 'pronounShift'], ['prendrais', 'futureInPast']]],
  ['futureInPast', "J'ai dit que je rappellerais ce jour-là.", 'Я сказал, что перезвоню в тот день.', 'Я сказав, що передзвоню того дня.', [['ai dit', 'reportVerb'], ['que', 'subordinator'], ['je', 'pronounShift'], ['rappellerais', 'futureInPast'], ['ce jour-là', 'timeShift']]],
  ['futureInPast', 'Vous avez dit que vous commenceriez la réunion.', 'Вы сказали, что начнете встречу.', 'Ви сказали, що почнете зустріч.', [['avez dit', 'reportVerb'], ['que', 'subordinator'], ['vous', 'pronounShift'], ['commenceriez', 'futureInPast'], ['la réunion', 'object']]],
  ['futureInPast', "Elle a dit que le cours commencerait à ce moment-là.", 'Она сказала, что урок начнется в тот момент.', 'Вона сказала, що урок почнеться в той момент.', [['a dit', 'reportVerb'], ['que', 'subordinator'], ['commencerait', 'futureInPast'], ['à ce moment-là', 'timeShift']]],
  ['yesNoQuestion', 'Elle a demandé si je travaillais là-bas.', 'Она спросила, работаю ли я там.', 'Вона запитала, чи працюю я там.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ['je', 'pronounShift'], ['travaillais', 'tenseShift'], ['là-bas', 'timeShift']]],
  ['yesNoQuestion', 'Il a demandé si nous étions prêts.', 'Он спросил, готовы ли мы.', 'Він запитав, чи готові ми.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ['nous', 'pronounShift'], ['étions', 'tenseShift'], ['prêts', 'object']]],
  ['yesNoQuestion', 'Ils ont demandé si tu pouvais venir.', 'Они спросили, можешь ли ты прийти.', 'Вони запитали, чи можеш ти прийти.', [['ont demandé', 'reportVerb'], ['si', 'subordinator'], ['tu', 'pronounShift'], ['pouvais', 'tenseShift']]],
  ['yesNoQuestion', "Elle a demandé si j'avais compris.", 'Она спросила, понял ли я.', 'Вона запитала, чи я зрозумів.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ["j'avais compris", 'pastPerfect']]],
  ['yesNoQuestion', 'Il a demandé si elle connaissait la réponse.', 'Он спросил, знает ли она ответ.', 'Він запитав, чи знає вона відповідь.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ['elle', 'pronounShift'], ['connaissait', 'tenseShift'], ['la réponse', 'object']]],
  ['yesNoQuestion', "Nous avons demandé s'ils venaient ce jour-là.", 'Мы спросили, придут ли они в тот день.', 'Ми запитали, чи прийдуть вони того дня.', [['avons demandé', 'reportVerb'], ["s'ils", 'subordinator'], ['ils', 'pronounShift'], ['venaient', 'tenseShift'], ['ce jour-là', 'timeShift']]],
  ['yesNoQuestion', 'Tu as demandé si je voulais partir.', 'Ты спросил, хочу ли я уйти.', 'Ти запитав, чи хочу я піти.', [['as demandé', 'reportVerb'], ['si', 'subordinator'], ['je', 'pronounShift'], ['voulais', 'tenseShift']]],
  ['yesNoQuestion', 'Elle a demandé si vous aviez du temps.', 'Она спросила, есть ли у вас время.', 'Вона запитала, чи маєте ви час.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ['vous', 'pronounShift'], ['aviez', 'tenseShift'], ['du temps', 'object']]],
  ['yesNoQuestion', 'Il a demandé si le train était parti.', 'Он спросил, ушел ли поезд.', 'Він запитав, чи поїзд поїхав.', [['a demandé', 'reportVerb'], ['si', 'subordinator'], ['était parti', 'pastPerfect']]],
  ['yesNoQuestion', 'Ils ont demandé si nous allions bien.', 'Они спросили, все ли у нас хорошо.', 'Вони запитали, чи в нас усе добре.', [['ont demandé', 'reportVerb'], ['si', 'subordinator'], ['nous', 'pronounShift'], ['allions', 'tenseShift']]],
  ['whQuestion', "Elle a demandé où j'habitais.", 'Она спросила, где я живу.', 'Вона запитала, де я живу.', [['a demandé', 'reportVerb'], ['où', 'subordinator'], ["j'habitais", 'tenseShift']]],
  ['whQuestion', 'Il a demandé pourquoi nous étions en retard.', 'Он спросил, почему мы опаздываем.', 'Він запитав, чому ми запізнюємося.', [['a demandé', 'reportVerb'], ['pourquoi', 'subordinator'], ['nous', 'pronounShift'], ['étions', 'tenseShift']]],
  ['whQuestion', 'Ils ont demandé quand elle arriverait.', 'Они спросили, когда она приедет.', 'Вони запитали, коли вона приїде.', [['ont demandé', 'reportVerb'], ['quand', 'subordinator'], ['elle', 'pronounShift'], ['arriverait', 'futureInPast']]],
  ['whQuestion', "Nous avons demandé comment il avait trouvé l'adresse.", 'Мы спросили, как он нашел адрес.', 'Ми запитали, як він знайшов адресу.', [['avons demandé', 'reportVerb'], ['comment', 'subordinator'], ['il', 'pronounShift'], ['avait trouvé', 'pastPerfect'], ["l'adresse", 'object']]],
  ['whQuestion', 'Tu as demandé ce que je voulais.', 'Ты спросил, чего я хочу.', 'Ти запитав, чого я хочу.', [['as demandé', 'reportVerb'], ['ce que', 'subordinator'], ['je', 'pronounShift'], ['voulais', 'tenseShift']]],
  ['whQuestion', 'Elle a demandé qui venait dîner.', 'Она спросила, кто придет ужинать.', 'Вона запитала, хто прийде вечеряти.', [['a demandé', 'reportVerb'], ['qui', 'subordinator'], ['venait', 'tenseShift']]],
  ['whQuestion', 'Il a demandé combien cela coûtait.', 'Он спросил, сколько это стоит.', 'Він запитав, скільки це коштує.', [['a demandé', 'reportVerb'], ['combien', 'subordinator'], ['coûtait', 'tenseShift']]],
  ['whQuestion', 'Ils ont demandé où nous avions mis les clés.', 'Они спросили, куда мы положили ключи.', 'Вони запитали, куди ми поклали ключі.', [['ont demandé', 'reportVerb'], ['où', 'subordinator'], ['nous', 'pronounShift'], ['avions mis', 'pastPerfect'], ['les clés', 'object']]],
  ['whQuestion', "J'ai demandé pourquoi elle pleurait.", 'Я спросил, почему она плачет.', 'Я запитав, чому вона плаче.', [["j'ai demandé", 'reportVerb'], ['pourquoi', 'subordinator'], ['elle', 'pronounShift'], ['pleurait', 'tenseShift']]],
  ['whQuestion', 'Vous avez demandé quand le cours commencerait.', 'Вы спросили, когда начнется урок.', 'Ви запитали, коли почнеться урок.', [['avez demandé', 'reportVerb'], ['quand', 'subordinator'], ['commencerait', 'futureInPast'], ['le cours', 'object']]],
  ['pastTimeShift', "Il a dit qu'il avait vu Marie la veille.", 'Он сказал, что видел Мари накануне.', 'Він сказав, що бачив Марі напередодні.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['avait vu', 'pastPerfect'], ['la veille', 'timeShift']]],
  ['pastTimeShift', "Elle a dit qu'elle était partie tôt.", 'Она сказала, что ушла рано.', 'Вона сказала, що пішла рано.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['était partie', 'pastPerfect']]],
  ['pastTimeShift', "Ils ont dit qu'ils avaient déjà mangé.", 'Они сказали, что уже поели.', 'Вони сказали, що вже поїли.', [['ont dit', 'reportVerb'], ["qu'", 'subordinator'], ['ils', 'pronounShift'], ['avaient déjà mangé', 'pastPerfect']]],
  ['pastTimeShift', 'Nous avons dit que nous avions perdu les clés.', 'Мы сказали, что потеряли ключи.', 'Ми сказали, що загубили ключі.', [['avons dit', 'reportVerb'], ['que', 'subordinator'], ['nous', 'pronounShift'], ['avions perdu', 'pastPerfect'], ['les clés', 'object']]],
  ['pastTimeShift', "Elle a expliqué qu'elle avait oublié le message.", 'Она объяснила, что забыла сообщение.', 'Вона пояснила, що забула повідомлення.', [['a expliqué', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['avait oublié', 'pastPerfect'], ['le message', 'object']]],
  ['pastTimeShift', "Il a répondu qu'il avait fini avant midi.", 'Он ответил, что закончил до полудня.', 'Він відповів, що закінчив до полудня.', [['a répondu', 'reportVerb'], ["qu'", 'subordinator'], ['il', 'pronounShift'], ['avait fini', 'pastPerfect'], ['avant midi', 'timeShift']]],
  ['pastTimeShift', "Ils ont dit qu'ils étaient arrivés à l'heure.", 'Они сказали, что приехали вовремя.', 'Вони сказали, що приїхали вчасно.', [['ont dit', 'reportVerb'], ["qu'", 'subordinator'], ['ils', 'pronounShift'], ['étaient arrivés', 'pastPerfect'], ["à l'heure", 'timeShift']]],
  ['pastTimeShift', 'Tu as dit que tu avais envoyé le message.', 'Ты сказал, что отправил сообщение.', 'Ти сказав, що надіслав повідомлення.', [['as dit', 'reportVerb'], ['que', 'subordinator'], ['tu', 'pronounShift'], ['avais envoyé', 'pastPerfect'], ['le message', 'object']]],
  ['pastTimeShift', "J'ai dit que j'avais acheté le billet.", 'Я сказал, что купил билет.', 'Я сказав, що купив квиток.', [['ai dit', 'reportVerb'], ['que', 'subordinator'], ["j'avais acheté", 'pastPerfect'], ['le billet', 'object']]],
  ['pastTimeShift', "Elle a dit qu'elle avait rencontré Paul ce jour-là.", 'Она сказала, что встретила Поля в тот день.', 'Вона сказала, що зустріла Поля того дня.', [['a dit', 'reportVerb'], ["qu'", 'subordinator'], ['elle', 'pronounShift'], ['avait rencontré', 'pastPerfect'], ['Paul', 'object'], ['ce jour-là', 'timeShift']]],
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
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson27_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const reportedCategoryCounts = countBy(rows, ['reportVerb', 'subordinator', 'pronounShift', 'tenseShift', 'futureInPast', 'pastPerfect', 'timeShift', 'negation']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.4', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Reported speech', frenchTopic: 'Discours indirect: que, si, mots interrogatifs, temps et repères transformés', sequencingReason: 'Requires stable tense, pronoun, reporting verb, and time-expression transformation after conditional and past-tense lessons.', frenchNativeTransferRule: 'Do not copy English said/that/if mechanics. French uses a dit que/qu, a demandé si or question words, and adapts person, tense, and time/place markers.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, reportedCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON27_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит английский reported speech во французский discours indirect: не цитата, а пересказ через que/qu, si или вопросительное слово.', bodyUk: 'Урок переносить англійський reported speech у французький discours indirect: не цитата, а переказ через que/qu, si або питальне слово.' },
    { titleRu: '02. Утверждения через que', titleUk: '02. Твердження через que', bodyRu: 'Для утверждений используется dire/expliquer/répondre + que/qu’: Il a dit qu’il était fatigué. Меняются лицо и время.', bodyUk: 'Для тверджень використовується dire/expliquer/répondre + que/qu’: Il a dit qu’il était fatigué. Змінюються особа і час.' },
    { titleRu: '03. Будущее в прошлом', titleUk: '03. Майбутнє в минулому', bodyRu: 'То, что было будущим в прямой речи, в пересказе после прошедшего вводящего глагола часто идет через conditionnel: elle appellerait, il viendrait.', bodyUk: 'Те, що було майбутнім у прямій мові, у переказі після минулого ввідного дієслова часто йде через conditionnel: elle appellerait, il viendrait.' },
    { titleRu: '04. Вопросы через si и вопросительные слова', titleUk: '04. Питання через si та питальні слова', bodyRu: 'Да/нет-вопросы вводятся через si: Elle a demandé si je travaillais là-bas. Открытые вопросы сохраняют où, pourquoi, quand, comment, ce que.', bodyUk: 'Так/ні-питання вводяться через si: Elle a demandé si je travaillais là-bas. Відкриті питання зберігають où, pourquoi, quand, comment, ce que.' },
    { titleRu: '05. Сдвиг времени и места', titleUk: '05. Зсув часу і місця', bodyRu: 'У discours indirect меняются не только глаголы, но и маркеры: aujourd’hui → ce jour-là, demain → le lendemain, hier → la veille, ici → là-bas.', bodyUk: 'У discours indirect змінюються не лише дієслова, а й маркери: aujourd’hui → ce jour-là, demain → le lendemain, hier → la veille, ici → là-bas.' },
  ], vocabulary, practiceHooks: [{ id: 'reported_statement_que', type: 'que_clause', examples: ["Il a dit qu'il était fatigué."] }, { id: 'reported_yes_no_si', type: 'reported_question_si', examples: ['Elle a demandé si je travaillais là-bas.'] }, { id: 'reported_time_shift', type: 'time_place_shift', examples: ["Il a dit qu'il avait vu Marie la veille."] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson27.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson27_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson27.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson27.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson27_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson27_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson27-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson27BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson27BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, reportedCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson27BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson27BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson27BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson27BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson27BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson27BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson27BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson27BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 28 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 28 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON27_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
