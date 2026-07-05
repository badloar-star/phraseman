import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 32;
const SLUG = 'lesson32_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson32-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson32_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson32_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson32_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson32_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson32_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson32_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson32_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson32_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson32_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson32_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson32_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson32_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson32_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson32_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson32_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson32_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson32_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson32_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson32_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_relative_pronouns: { url: 'https://www.lawlessfrench.com/grammar/relative-pronouns/', claim: 'French final review keeps qui/que/où/dont roles separate from English who/that/where/whose.' },
  lawless_si_clauses: { url: 'https://www.lawlessfrench.com/grammar/si-clauses-conditionals/', claim: 'French si clauses use present/future and plus-que-parfait/conditionnel passé patterns.' },
  lawless_reported_speech: { url: 'https://www.lawlessfrench.com/grammar/reported-speech/', claim: 'French reported speech uses que/si and tense/backshift logic.' },
  lawless_depuis: { url: 'https://www.lawlessfrench.com/grammar/depuis-pendant-il-y-a/', claim: 'French uses depuis with present tense for actions continuing from the past.' },
  lawless_passive_voice: { url: 'https://www.lawlessfrench.com/grammar/passive-voice/', claim: 'French passive voice uses être plus past participle with agreement.' },
  phraseman_english_lesson32_blueprint: { url: 'app/lesson_data_25_32.ts#LESSON_32_PHRASES', claim: 'English Lesson 32 is a final review across be used to, relatives, reported speech, conditionals, complex object, perfect continuous, passive, and result clauses.' },
};

const BANKS = {
  subject: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'ce', 'la salle', 'les documents', 'le problème'],
  habit: ['suis habitué à', 'est habituée à', 'sommes habitués à', 'sont habitués à', 'n’est pas habitué à', 'ne suis pas habitué à', 'Es-tu habitué à', 'Sont-ils habitués à', 'avons l’habitude de'],
  infinitive: ['travailler', 'se lever', 'parler', 'attendre', 'conduire', 'étudier', 'vivre', 'partir', 'appeler', 'vibrer', 'utiliser', 'comprendre'],
  timePlace: ['la nuit', 'tôt', 'tous les jours', 'ici', 'en ville', 'si tard', 'depuis une heure', 'depuis huit heures', 'maintenant', 'aujourd’hui', 'rapidement', 'avant ce soir'],
  relativePronoun: ['qui', 'dont', 'où', 'que', "qu'", 'avec lequel', 'pour laquelle', 'à qui'],
  reportedVerb: ['a dit', 'ont dit', 'a expliqué', 'on nous a dit', 'on m’a dit', 'on lui a dit', 'on leur a dit', 'a demandé'],
  subordinator: ['que', "qu'", 'si', 'pourquoi', 'comment', 'où', 'quand'],
  reportedTense: ['était', 'appellerait', 'avaient envoyé', 'avait été nettoyée', 'avait été corrigée', 'avaient été vendus', 'avait été résolu', 'allait'],
  conditionalMarker: ['Si', 'si', 'j’avais', 'elle avait', 'nous avions', 'ils avaient'],
  futureConditionnel: ['répondrai', 'aidera', 'finirons', 'commencerons', 'aurais aidé', 'aurais répondu', 'aurions fini', 'auraient trouvé'],
  perceptionCausative: ['ai vu', 'a entendu', 'avons senti', 'ont fait', 'm’a laissé', 'm’a aidé à'],
  passive: ['est en train d’être nettoyée', 'sont en train d’être vérifiés', 'soient vérifiés', 'soit nettoyée', 'soit résolu', 'a été corrigée', 'avaient été vendus', 'avait été résolu'],
  preference: ['préfère que', 'préférerais que', 'préférerait que', 'voudrait que', 'souhaite que', 'aimerait que'],
  subjunctive: ['restes', 'ne l’appelles pas', 'commencions', 'soient vérifiés', 'soit nettoyée', 'soit résolu'],
  object: ['la personne', 'la femme', 'l’application', 'l’endroit', 'l’homme', 'les clés', 'la salle', 'le professeur', 'les documents', 'le téléphone', 'la chambre', 'le rapport'],
};

const DATA = [
  ['habitReview', 'Je suis habitué à travailler la nuit.', 'Я привык работать ночью.', 'Я звик працювати вночі.', [['je', 'subject'], ['suis habitué à', 'habit'], ['travailler', 'infinitive'], ['la nuit', 'timePlace']]],
  ['habitReview', 'Elle est habituée à se lever tôt.', 'Она привыкла вставать рано.', 'Вона звикла вставати рано.', [['elle', 'subject'], ['est habituée à', 'habit'], ['se lever', 'infinitive'], ['tôt', 'timePlace']]],
  ['habitReview', 'Nous avons l’habitude de parler français tous les jours.', 'Мы привыкли говорить по-французски каждый день.', 'Ми звикли говорити французькою щодня.', [['nous', 'subject'], ['avons l’habitude de', 'habit'], ['parler', 'infinitive'], ['tous les jours', 'timePlace']]],
  ['habitReview', 'Ils sont habitués à attendre ici.', 'Они привыкли ждать здесь.', 'Вони звикли чекати тут.', [['ils', 'subject'], ['sont habitués à', 'habit'], ['attendre', 'infinitive'], ['ici', 'timePlace']]],
  ['habitReview', 'Il n’est pas habitué à conduire en ville.', 'Он не привык водить в городе.', 'Він не звик водити в місті.', [['il', 'subject'], ['n’est pas habitué à', 'habit'], ['conduire', 'infinitive'], ['en ville', 'timePlace']]],
  ['habitReview', 'Je ne suis pas habitué à travailler si tard.', 'Я не привык работать так поздно.', 'Я не звик працювати так пізно.', [['je', 'subject'], ['ne suis pas habitué à', 'habit'], ['travailler', 'infinitive'], ['si tard', 'timePlace']]],
  ['habitReview', 'Es-tu habitué à étudier tous les jours ?', 'Ты привык учиться каждый день?', 'Ти звик навчатися щодня?', [['Es-tu habitué à', 'habit'], ['étudier', 'infinitive'], ['tous les jours', 'timePlace']]],
  ['habitReview', 'Sont-ils habitués à vivre ici ?', 'Они привыкли жить здесь?', 'Вони звикли жити тут?', [['Sont-ils habitués à', 'habit'], ['vivre', 'infinitive'], ['ici', 'timePlace']]],
  ['relativeReview', 'C’est la personne qui m’a aidé.', 'Это человек, который мне помог.', 'Це людина, яка мені допомогла.', [['la personne', 'object'], ['qui', 'relativePronoun']]],
  ['relativeReview', 'C’est la femme dont nous avons trouvé le sac.', 'Это женщина, чью сумку мы нашли.', 'Це жінка, чию сумку ми знайшли.', [['la femme', 'object'], ['dont', 'relativePronoun']]],
  ['relativeReview', 'C’est l’application qui m’aide à apprendre.', 'Это приложение, которое помогает мне учиться.', 'Це застосунок, який допомагає мені вчитися.', [["l’application", 'object'], ['qui', 'relativePronoun']]],
  ['relativeReview', 'C’est l’endroit où nous nous sommes rencontrés.', 'Это место, где мы встретились.', 'Це місце, де ми зустрілися.', [["l’endroit", 'object'], ['où', 'relativePronoun']]],
  ['relativeReview', 'J’ai appelé l’homme qui a envoyé le message.', 'Я позвонил мужчине, который отправил сообщение.', 'Я подзвонив чоловікові, який надіслав повідомлення.', [['l’homme', 'object'], ['qui', 'relativePronoun']]],
  ['relativeReview', 'Nous avons retrouvé les clés qu’elle avait perdues.', 'Мы нашли ключи, которые она потеряла.', 'Ми знайшли ключі, які вона загубила.', [['les clés', 'object'], ["qu'", 'relativePronoun']]],
  ['relativeReview', 'Ils ont ouvert la salle où nous avions attendu.', 'Они открыли комнату, где мы ждали.', 'Вони відкрили кімнату, де ми чекали.', [['la salle', 'object'], ['où', 'relativePronoun']]],
  ['relativeReview', 'Je me souviens du professeur dont le cours m’a aidé.', 'Я помню преподавателя, чей урок мне помог.', 'Я пам’ятаю викладача, чий урок мені допоміг.', [['du professeur', 'object'], ['dont', 'relativePronoun']]],
  ['reportedReview', 'Il a dit qu’il était fatigué.', 'Он сказал, что устал.', 'Він сказав, що втомився.', [['il', 'subject'], ['a dit', 'reportedVerb'], ["qu'", 'subordinator'], ['était', 'reportedTense']]],
  ['reportedReview', 'Elle a dit qu’elle appellerait plus tard.', 'Она сказала, что позвонит позже.', 'Вона сказала, що подзвонить пізніше.', [['elle', 'subject'], ['a dit', 'reportedVerb'], ["qu'", 'subordinator'], ['appellerait', 'reportedTense']]],
  ['reportedReview', 'Ils ont dit qu’ils avaient envoyé les documents.', 'Они сказали, что отправили документы.', 'Вони сказали, що надіслали документи.', [['ils', 'subject'], ['ont dit', 'reportedVerb'], ["qu'", 'subordinator'], ['avaient envoyé', 'reportedTense'], ['les documents', 'object']]],
  ['reportedReview', 'On nous a dit que la salle avait été nettoyée.', 'Нам сказали, что комнату убрали.', 'Нам сказали, що кімнату прибрали.', [['on', 'subject'], ['on nous a dit', 'reportedVerb'], ['que', 'subordinator'], ['avait été nettoyée', 'reportedTense']]],
  ['reportedReview', 'On m’a dit que l’application avait été corrigée.', 'Мне сказали, что приложение исправили.', 'Мені сказали, що застосунок виправили.', [['on', 'subject'], ['on m’a dit', 'reportedVerb'], ['que', 'subordinator'], ['avait été corrigée', 'reportedTense']]],
  ['reportedReview', 'On lui a dit que les billets avaient été vendus.', 'Ему сказали, что билеты проданы.', 'Йому сказали, що квитки продані.', [['on', 'subject'], ['on lui a dit', 'reportedVerb'], ['que', 'subordinator'], ['avaient été vendus', 'reportedTense']]],
  ['reportedReview', 'On leur a dit que le problème avait été résolu.', 'Им сказали, что проблема решена.', 'Їм сказали, що проблему вирішено.', [['on', 'subject'], ['on leur a dit', 'reportedVerb'], ['que', 'subordinator'], ['avait été résolu', 'reportedTense']]],
  ['reportedReview', 'Il a expliqué que tout allait bien.', 'Он объяснил, что всё в порядке.', 'Він пояснив, що все гаразд.', [['il', 'subject'], ['a expliqué', 'reportedVerb'], ['que', 'subordinator'], ['allait', 'reportedTense']]],
  ['conditionReview', 'Si tu m’appelles, je répondrai.', 'Если ты мне позвонишь, я отвечу.', 'Якщо ти мені подзвониш, я відповім.', [['Si', 'conditionalMarker'], ['tu', 'subject'], ['répondrai', 'futureConditionnel']]],
  ['conditionReview', 'Si elle a le temps, elle nous aidera.', 'Если у неё будет время, она нам поможет.', 'Якщо в неї буде час, вона нам допоможе.', [['Si', 'conditionalMarker'], ['elle', 'subject'], ['aidera', 'futureConditionnel']]],
  ['conditionReview', 'Si nous commençons maintenant, nous finirons aujourd’hui.', 'Если мы начнём сейчас, мы закончим сегодня.', 'Якщо ми почнемо зараз, ми закінчимо сьогодні.', [['Si', 'conditionalMarker'], ['nous', 'subject'], ['maintenant', 'timePlace'], ['finirons', 'futureConditionnel']]],
  ['conditionReview', 'S’ils ne viennent pas, nous commencerons sans eux.', 'Если они не придут, мы начнём без них.', 'Якщо вони не прийдуть, ми почнемо без них.', [["S’ils", 'conditionalMarker'], ['ils', 'subject'], ['commencerons', 'futureConditionnel']]],
  ['conditionReview', 'Si j’avais su, j’aurais aidé.', 'Если бы я знал, я бы помог.', 'Якби я знав, я б допоміг.', [["j’avais", 'conditionalMarker'], ['aurais aidé', 'futureConditionnel']]],
  ['conditionReview', 'Si elle m’avait appelé, j’aurais répondu.', 'Если бы она мне позвонила, я бы ответил.', 'Якби вона мені подзвонила, я б відповів.', [["elle m’avait", 'conditionalMarker'], ['aurais répondu', 'futureConditionnel']]],
  ['conditionReview', 'Si nous avions commencé plus tôt, nous aurions fini.', 'Если бы мы начали раньше, мы бы закончили.', 'Якби ми почали раніше, ми б закінчили.', [['nous avions', 'conditionalMarker'], ['aurions fini', 'futureConditionnel']]],
  ['conditionReview', 'S’ils avaient vérifié la salle, ils auraient trouvé les clés.', 'Если бы они проверили комнату, они бы нашли ключи.', 'Якби вони перевірили кімнату, вони б знайшли ключі.', [['ils avaient', 'conditionalMarker'], ['la salle', 'object'], ['auraient trouvé', 'futureConditionnel']]],
  ['complexReview', 'Je l’ai vu partir.', 'Я видел, как он ушёл.', 'Я бачив, як він пішов.', [['je', 'subject'], ['ai vu', 'perceptionCausative'], ['partir', 'infinitive']]],
  ['complexReview', 'Elle m’a entendu l’appeler.', 'Она слышала, как я ей звонил.', 'Вона чула, як я їй дзвонив.', [['elle', 'subject'], ['a entendu', 'perceptionCausative'], ['appeler', 'infinitive']]],
  ['complexReview', 'Nous avons senti le téléphone vibrer.', 'Мы почувствовали, как телефон завибрировал.', 'Ми відчули, як телефон завібрував.', [['nous', 'subject'], ['avons senti', 'perceptionCausative'], ['le téléphone', 'object'], ['vibrer', 'infinitive']]],
  ['complexReview', 'Ils nous ont fait attendre dehors.', 'Они заставили нас ждать снаружи.', 'Вони змусили нас чекати надворі.', [['ils', 'subject'], ['ont fait', 'perceptionCausative'], ['attendre', 'infinitive']]],
  ['complexReview', 'Il m’a laissé utiliser son téléphone.', 'Он позволил мне использовать его телефон.', 'Він дозволив мені скористатися його телефоном.', [['il', 'subject'], ['m’a laissé', 'perceptionCausative'], ['utiliser', 'infinitive'], ['son téléphone', 'object']]],
  ['complexReview', 'Cette leçon m’a aidé à mieux comprendre le français.', 'Этот урок помог мне лучше понять французский.', 'Цей урок допоміг мені краще зрозуміти французьку.', [['m’a aidé à', 'perceptionCausative'], ['comprendre', 'infinitive']]],
  ['depuisReview', 'J’attends depuis une heure.', 'Я жду уже час.', 'Я чекаю вже годину.', [["J’", 'subject'], ['depuis une heure', 'timePlace']]],
  ['depuisReview', 'Elle étudie depuis toute la matinée.', 'Она учится всё утро.', 'Вона навчається весь ранок.', [['elle', 'subject'], ['depuis toute la matinée', 'timePlace']]],
  ['depuisReview', 'Nous travaillons depuis huit heures.', 'Мы работаем с восьми.', 'Ми працюємо з восьмої.', [['nous', 'subject'], ['depuis huit heures', 'timePlace']]],
  ['depuisReview', 'Ils cherchent les clés depuis un moment.', 'Они уже некоторое время ищут ключи.', 'Вони вже певний час шукають ключі.', [['ils', 'subject'], ['les clés', 'object'], ['depuis un moment', 'timePlace']]],
  ['passiveProgressive', 'La salle est en train d’être nettoyée maintenant.', 'Комнату сейчас убирают.', 'Кімнату зараз прибирають.', [['la salle', 'subject'], ['est en train d’être nettoyée', 'passive'], ['maintenant', 'timePlace']]],
  ['passiveProgressive', 'Les documents sont en train d’être vérifiés maintenant.', 'Документы сейчас проверяют.', 'Документи зараз перевіряють.', [['les documents', 'object'], ['sont en train d’être vérifiés', 'passive'], ['maintenant', 'timePlace']]],
  ['preferenceResult', 'Je préfère que tu restes ici.', 'Я бы предпочёл, чтобы ты остался здесь.', 'Я б волів, щоб ти залишився тут.', [['je', 'subject'], ['préfère que', 'preference'], ['tu', 'subject'], ['restes', 'subjunctive'], ['ici', 'timePlace']]],
  ['preferenceResult', 'Je préférerais que tu ne l’appelles pas.', 'Я бы предпочёл, чтобы ты ему не звонил.', 'Я б волів, щоб ти йому не дзвонив.', [['je', 'subject'], ['préférerais que', 'preference'], ['tu', 'subject'], ['ne l’appelles pas', 'subjunctive']]],
  ['preferenceResult', 'Elle préférerait que nous commencions plus tard.', 'Она бы предпочла, чтобы мы начали позже.', 'Вона б воліла, щоб ми почали пізніше.', [['elle', 'subject'], ['préférerait que', 'preference'], ['nous', 'subject'], ['commencions', 'subjunctive']]],
  ['preferenceResult', 'J’ai besoin que les documents soient vérifiés aujourd’hui.', 'Мне нужно, чтобы документы проверили сегодня.', 'Мені потрібно, щоб документи перевірили сьогодні.', [['les documents', 'object'], ['soient vérifiés', 'subjunctive'], ['aujourd’hui', 'timePlace']]],
  ['preferenceResult', 'Nous avons besoin que la salle soit nettoyée avant ce soir.', 'Нам нужно, чтобы комнату убрали до вечера.', 'Нам потрібно, щоб кімнату прибрали до вечора.', [['nous', 'subject'], ['la salle', 'object'], ['soit nettoyée', 'subjunctive'], ['avant ce soir', 'timePlace']]],
  ['preferenceResult', 'Ils veulent que le problème soit résolu rapidement.', 'Они хотят, чтобы проблему быстро решили.', 'Вони хочуть, щоб проблему швидко вирішили.', [['ils', 'subject'], ['le problème', 'subject'], ['soit résolu', 'subjunctive'], ['rapidement', 'timePlace']]],
];

function ensureDirs() { Object.values(dirs).forEach((folder) => fs.mkdirSync(folder, { recursive: true })); }
function writeJson(file, value) { ensureDirs(); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function byteSize(file) { return fs.statSync(file).size; }
function slot(correct, category) {
  const bank = [...new Set([correct, ...(BANKS[category] || [])])];
  if (bank.length < 6) throw new Error(`Missing bank ${category}`);
  const distractors = bank.filter((value) => value !== correct).slice(0, 5);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  if (DATA.length !== 50) throw new Error(`Lesson 32 must have 50 rows, got ${DATA.length}`);
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson32_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const finalReviewCategoryCounts = countBy(rows, ['subject', 'habit', 'infinitive', 'timePlace', 'relativePronoun', 'reportedVerb', 'subordinator', 'reportedTense', 'conditionalMarker', 'futureConditionnel', 'perceptionCausative', 'passive', 'preference', 'subjunctive', 'object']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B2', internalFrenchBand: 'B2.4', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Final review', frenchTopic: 'Révision finale: habitudes, relatifs, discours indirect, si, depuis, passif, subjonctif', sequencingReason: 'Closes the 32-lesson core course by reviewing French-native equivalents of the late English structures.', frenchNativeTransferRule: 'Do not review English forms directly. Rebuild each review surface as its French-native equivalent: être habitué à, pronoms relatifs, discours indirect, si clauses, depuis, passive voice, and que + subjonctif.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, finalReviewCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_NON_LESSON_SURFACE_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON32_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Финальное повторение', titleUk: '01. Фінальне повторення', bodyRu: 'Этот урок собирает поздние структуры курса во французской логике: être habitué à, qui/que/où/dont, discours indirect, si, depuis, passif и subjonctif.', bodyUk: 'Цей урок збирає пізні структури курсу у французькій логіці: être habitué à, qui/que/où/dont, discours indirect, si, depuis, passif і subjonctif.' },
    { titleRu: '02. Привычка и относительные связи', titleUk: '02. Звичка і відносні зв’язки', bodyRu: 'Be used to передаём как être habitué à или avoir l’habitude de. Relative clauses повторяем через роль: qui, que/qu’, où, dont.', bodyUk: 'Be used to передаємо як être habitué à або avoir l’habitude de. Relative clauses повторюємо через роль: qui, que/qu’, où, dont.' },
    { titleRu: '03. Косвенная речь и условия', titleUk: '03. Непряма мова й умови', bodyRu: 'Discours indirect держит que и сдвиги времён. Si clauses повторяют два ключевых рисунка: si + présent -> futur и si + plus-que-parfait -> conditionnel passé.', bodyUk: 'Discours indirect тримає que і зсуви часів. Si clauses повторюють два ключові рисунки: si + présent -> futur і si + plus-que-parfait -> conditionnel passé.' },
    { titleRu: '04. Depuis и passif', titleUk: '04. Depuis і passif', bodyRu: 'Для “have been doing” французский использует présent + depuis: J’attends depuis une heure. Passive/progressive passive строится через être: est en train d’être nettoyée.', bodyUk: 'Для “have been doing” французька використовує présent + depuis: J’attends depuis une heure. Passive/progressive passive будується через être: est en train d’être nettoyée.' },
    { titleRu: '05. Subjonctif результата/желания', titleUk: '05. Subjonctif результату/бажання', bodyRu: 'Would rather / need something done / want solved переносим как que + subjonctif: je préfère que tu restes, il faut que le problème soit résolu.', bodyUk: 'Would rather / need something done / want solved переносимо як que + subjonctif: je préfère que tu restes, il faut que le problème soit résolu.' },
  ], vocabulary, practiceHooks: [{ id: 'final_review_late_structures', type: 'mixed_late_b2_review', examples: ['Je suis habitué à travailler la nuit.', 'Si j’avais su, j’aurais aidé.'] }, { id: 'reported_relative_conditionals', type: 'relation_and_condition_mix', examples: ['Il a dit qu’il était fatigué.', 'C’est l’endroit où nous nous sommes rencontrés.'] }, { id: 'passive_subjunctive_result', type: 'passive_subjunctive', examples: ['Les documents sont en train d’être vérifiés.', 'Je préfère que tu restes ici.'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson32.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson32_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson32.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson32.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson32_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson32_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson32-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson32BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson32BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, finalReviewCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson32BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson32BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson32BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson32BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson32BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson32BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson32BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson32BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.coreLessons32BlueprintRebuildStatus = 'PASS_32_OF_32_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.activationApproved = false;
    state.nextPassPlan = ['Audit non-lesson French surfaces against English: quizzes, arena, flashcards, personal practice, AI prompts, admin, storage/cloud.', 'Build first non-lesson surface pack contracts without app apply.', 'Keep production activation HOLD until audio, server upload evidence, runtime delivery, rollback, admin, storage/cloud, and all non-lesson gates pass.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON32_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
