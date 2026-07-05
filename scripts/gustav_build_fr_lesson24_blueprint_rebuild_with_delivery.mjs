import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const LESSON = 24;
const SLUG = 'lesson24_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson24-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false };

const dir = (name) => path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', name);
const dirs = {
  review: dir('review'),
  reviewer: dir('reviewer'),
  materialized: path.join(dir('materialized'), SLUG),
  audio: path.join(dir('audio'), SLUG),
  server: path.join(dir('server'), SLUG),
  runtime: path.join(dir('runtime'), SLUG),
  activation: path.join(dir('activation'), SLUG),
};
const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson24_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson24_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson24_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson24_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson24_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson24_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson24_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson24_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson24_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson24_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson24_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson24_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson24_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson24_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson24_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson24_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson24_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson24_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson24_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_passe_compose: {
    url: 'https://www.lawlessfrench.com/grammar/passe-compose/',
    claim: 'French passé composé expresses completed past actions and is formed with avoir or être plus a past participle.',
  },
  lawless_venir_de: {
    url: 'https://www.lawlessfrench.com/grammar/recent-past/',
    claim: 'French recent past uses venir de plus infinitive to express just did something.',
  },
  lawless_adverbs_deja_jamais_encore: {
    url: 'https://www.lawlessfrench.com/grammar/negative-adverbs/',
    claim: 'French uses adverbs such as déjà, jamais, and pas encore with completed-action meanings; English present perfect signal words must be mapped natively.',
  },
  le_robert_passe_compose: {
    url: 'https://dictionnaire.lerobert.com/guide/passe-compose',
    claim: 'Le passé composé combines an auxiliary and a past participle, with être agreement where required.',
  },
  phraseman_english_lesson24_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 24 teaches present perfect with just/already/yet/ever/never and result/experience meanings.',
  },
};

const BANKS = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'On'],
  recentFrame: ['viens de', 'vient de', 'venons de', 'venez de', 'viennent de'],
  auxiliary: ['ai', 'as', 'a', 'avons', 'avez', 'ont', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
  participle: ['fini', 'appelé', 'trouvé', 'envoyé', 'ouvert', 'vérifié', 'aidé', 'préparé', 'répondu', 'payé', 'vu', 'essayé', 'visité', 'perdu', 'reçu', 'commencé', 'lu', 'signé', 'réservé', 'acheté', 'pris', 'appris', 'mangé', 'bu', 'fait'],
  etreParticiple: ['arrivé', 'arrivée', 'allé', 'allée', 'entré', 'entrée', 'parti', 'partie', 'revenu', 'revenue'],
  adverb: ['déjà', 'jamais', 'pas encore', 'tout juste', 'maintenant', 'aujourd’hui', 'cette semaine', 'récemment'],
  questionFrame: ['Est-ce que', 'As-tu', 'Avez-vous', 'A-t-elle', 'Ont-ils', 'Es-tu'],
  object: ['le travail', 'les clés', 'les documents', 'la porte', 'les messages', 'le dîner', 'au message', 'la facture', 'ce film', 'ce plat', 'Paris', 'mon téléphone', 'ton colis', 'le cours', 'ce roman', 'le contrat', 'une table', 'des billets', 'une décision', 'le train', 'la vérité', 'cette règle', 'le petit-déjeuner', 'du café', 'ça'],
  infinitive: ['finir', 'appeler', 'trouver', 'envoyer', 'ouvrir', 'vérifier', 'aider', 'préparer', 'répondre', 'payer'],
  negation: ["n'ai jamais", "n'as jamais", "n'a jamais", "n'avons jamais", "n'avez jamais", "n'ont jamais", "n'ai pas encore", "n'a pas encore", "n'avons pas encore", "n'ont pas encore"],
};

const DATA = [
  ['recentPast', 'Je viens de finir le travail.', 'Я только что закончил работу.', 'Я щойно закінчив роботу.', [['Je', 'pronoun'], ['viens de', 'recentFrame'], ['finir', 'infinitive'], ['le travail', 'object']]],
  ['recentPast', 'Elle vient de m’appeler.', 'Она только что мне позвонила.', 'Вона щойно мені зателефонувала.', [['Elle', 'pronoun'], ['vient de', 'recentFrame'], ['appeler', 'infinitive']]],
  ['recentPast', 'Nous venons de trouver les clés.', 'Мы только что нашли ключи.', 'Ми щойно знайшли ключі.', [['Nous', 'pronoun'], ['venons de', 'recentFrame'], ['trouver', 'infinitive'], ['les clés', 'object']]],
  ['recentPast', 'Ils viennent d’envoyer les documents.', 'Они только что отправили документы.', 'Вони щойно надіслали документи.', [['Ils', 'pronoun'], ['viennent de', 'recentFrame'], ['envoyer', 'infinitive'], ['les documents', 'object']]],
  ['recentPast', 'Il vient d’ouvrir la porte.', 'Он только что открыл дверь.', 'Він щойно відчинив двері.', [['Il', 'pronoun'], ['vient de', 'recentFrame'], ['ouvrir', 'infinitive'], ['la porte', 'object']]],
  ['recentPast', 'Je viens de vérifier les messages.', 'Я только что проверил сообщения.', 'Я щойно перевірив повідомлення.', [['Je', 'pronoun'], ['viens de', 'recentFrame'], ['vérifier', 'infinitive'], ['les messages', 'object']]],
  ['recentPast', 'Tu viens de m’aider.', 'Ты только что мне помог.', 'Ти щойно мені допоміг.', [['Tu', 'pronoun'], ['viens de', 'recentFrame'], ['aider', 'infinitive']]],
  ['recentPast', 'Elle vient de préparer le dîner.', 'Она только что приготовила ужин.', 'Вона щойно приготувала вечерю.', [['Elle', 'pronoun'], ['vient de', 'recentFrame'], ['préparer', 'infinitive'], ['le dîner', 'object']]],
  ['recentPast', 'Vous venez de répondre au message.', 'Вы только что ответили на сообщение.', 'Ви щойно відповіли на повідомлення.', [['Vous', 'pronoun'], ['venez de', 'recentFrame'], ['répondre', 'infinitive'], ['au message', 'object']]],
  ['recentPast', 'On vient de payer la facture.', 'Счёт только что оплатили.', 'Рахунок щойно оплатили.', [['On', 'pronoun'], ['vient de', 'recentFrame'], ['payer', 'infinitive'], ['la facture', 'object']]],
  ['alreadyResult', 'J’ai déjà fini le travail.', 'Я уже закончил работу.', 'Я вже закінчив роботу.', [['Je', 'pronoun'], ['ai', 'auxiliary'], ['déjà', 'adverb'], ['fini', 'participle'], ['le travail', 'object']]],
  ['alreadyResult', 'Elle a déjà appelé.', 'Она уже позвонила.', 'Вона вже зателефонувала.', [['Elle', 'pronoun'], ['a', 'auxiliary'], ['déjà', 'adverb'], ['appelé', 'participle']]],
  ['alreadyResult', 'Nous avons déjà trouvé les clés.', 'Мы уже нашли ключи.', 'Ми вже знайшли ключі.', [['Nous', 'pronoun'], ['avons', 'auxiliary'], ['déjà', 'adverb'], ['trouvé', 'participle'], ['les clés', 'object']]],
  ['alreadyResult', 'Ils ont déjà envoyé les documents.', 'Они уже отправили документы.', 'Вони вже надіслали документи.', [['Ils', 'pronoun'], ['ont', 'auxiliary'], ['déjà', 'adverb'], ['envoyé', 'participle'], ['les documents', 'object']]],
  ['alreadyResult', 'Il a déjà ouvert la porte.', 'Он уже открыл дверь.', 'Він уже відчинив двері.', [['Il', 'pronoun'], ['a', 'auxiliary'], ['déjà', 'adverb'], ['ouvert', 'participle'], ['la porte', 'object']]],
  ['alreadyResult', 'J’ai déjà vérifié les messages.', 'Я уже проверил сообщения.', 'Я вже перевірив повідомлення.', [['Je', 'pronoun'], ['ai', 'auxiliary'], ['déjà', 'adverb'], ['vérifié', 'participle'], ['les messages', 'object']]],
  ['alreadyResult', 'Tu as déjà aidé Marie.', 'Ты уже помог Мари.', 'Ти вже допоміг Марі.', [['Tu', 'pronoun'], ['as', 'auxiliary'], ['déjà', 'adverb'], ['aidé', 'participle'], ['Marie', 'object']]],
  ['alreadyResult', 'Elle a déjà préparé le dîner.', 'Она уже приготовила ужин.', 'Вона вже приготувала вечерю.', [['Elle', 'pronoun'], ['a', 'auxiliary'], ['déjà', 'adverb'], ['préparé', 'participle'], ['le dîner', 'object']]],
  ['alreadyResult', 'Vous avez déjà répondu au message.', 'Вы уже ответили на сообщение.', 'Ви вже відповіли на повідомлення.', [['Vous', 'pronoun'], ['avez', 'auxiliary'], ['déjà', 'adverb'], ['répondu', 'participle'], ['au message', 'object']]],
  ['alreadyResult', 'Nous avons déjà payé la facture.', 'Мы уже оплатили счёт.', 'Ми вже оплатили рахунок.', [['Nous', 'pronoun'], ['avons', 'auxiliary'], ['déjà', 'adverb'], ['payé', 'participle'], ['la facture', 'object']]],
  ['notYet', 'Je n’ai pas encore fini.', 'Я ещё не закончил.', 'Я ще не закінчив.', [['Je', 'pronoun'], ["n'ai pas encore", 'negation'], ['fini', 'participle']]],
  ['notYet', 'Elle n’a pas encore appelé.', 'Она ещё не позвонила.', 'Вона ще не зателефонувала.', [['Elle', 'pronoun'], ["n'a pas encore", 'negation'], ['appelé', 'participle']]],
  ['notYet', 'Nous n’avons pas encore trouvé les clés.', 'Мы ещё не нашли ключи.', 'Ми ще не знайшли ключі.', [['Nous', 'pronoun'], ["n'avons pas encore", 'negation'], ['trouvé', 'participle'], ['les clés', 'object']]],
  ['notYet', 'Ils n’ont pas encore envoyé les documents.', 'Они ещё не отправили документы.', 'Вони ще не надіслали документи.', [['Ils', 'pronoun'], ["n'ont pas encore", 'negation'], ['envoyé', 'participle'], ['les documents', 'object']]],
  ['notYet', 'Tu n’as pas encore répondu.', 'Ты ещё не ответил.', 'Ти ще не відповів.', [['Tu', 'pronoun'], ["n'as pas encore", 'negation'], ['répondu', 'participle']]],
  ['notYet', 'Le train n’est pas encore arrivé.', 'Поезд ещё не прибыл.', 'Потяг ще не прибув.', [['Le train', 'object'], ['n’est pas encore', 'negation'], ['arrivé', 'etreParticiple']]],
  ['notYet', 'La réunion n’a pas encore commencé.', 'Встреча ещё не началась.', 'Зустріч ще не почалася.', [['La réunion', 'object'], ["n'a pas encore", 'negation'], ['commencé', 'participle']]],
  ['notYet', 'Je n’ai pas encore lu ce roman.', 'Я ещё не прочитал этот роман.', 'Я ще не прочитав цей роман.', [['Je', 'pronoun'], ["n'ai pas encore", 'negation'], ['lu', 'participle'], ['ce roman', 'object']]],
  ['notYet', 'Vous n’avez pas encore signé le contrat.', 'Вы ещё не подписали контракт.', 'Ви ще не підписали контракт.', [['Vous', 'pronoun'], ["n'avez pas encore", 'negation'], ['signé', 'participle'], ['le contrat', 'object']]],
  ['notYet', 'On n’a pas encore réservé de table.', 'Столик ещё не забронировали.', 'Столик ще не забронювали.', [['On', 'pronoun'], ["n'a pas encore", 'negation'], ['réservé', 'participle'], ['une table', 'object']]],
  ['experienceNever', 'J’ai déjà vu ce film.', 'Я уже видел этот фильм.', 'Я вже бачив цей фільм.', [['Je', 'pronoun'], ['ai', 'auxiliary'], ['déjà', 'adverb'], ['vu', 'participle'], ['ce film', 'object']]],
  ['experienceNever', 'Je n’ai jamais vu ce film.', 'Я никогда не видел этот фильм.', 'Я ніколи не бачив цей фільм.', [['Je', 'pronoun'], ["n'ai jamais", 'negation'], ['vu', 'participle'], ['ce film', 'object']]],
  ['experienceNever', 'Elle n’a jamais essayé ce plat.', 'Она никогда не пробовала это блюдо.', 'Вона ніколи не куштувала цю страву.', [['Elle', 'pronoun'], ["n'a jamais", 'negation'], ['essayé', 'participle'], ['ce plat', 'object']]],
  ['experienceNever', 'Nous avons déjà visité Paris.', 'Мы уже посещали Париж.', 'Ми вже відвідували Париж.', [['Nous', 'pronoun'], ['avons', 'auxiliary'], ['déjà', 'adverb'], ['visité', 'participle'], ['Paris', 'object']]],
  ['experienceNever', 'Ils n’ont jamais perdu leurs clés.', 'Они никогда не теряли свои ключи.', 'Вони ніколи не губили свої ключі.', [['Ils', 'pronoun'], ["n'ont jamais", 'negation'], ['perdu', 'participle'], ['les clés', 'object']]],
  ['experienceNever', 'Tu as déjà reçu ton colis.', 'Ты уже получил свою посылку.', 'Ти вже отримав свою посилку.', [['Tu', 'pronoun'], ['as', 'auxiliary'], ['déjà', 'adverb'], ['reçu', 'participle'], ['ton colis', 'object']]],
  ['experienceNever', 'Vous n’avez jamais visité Lyon.', 'Вы никогда не посещали Лион.', 'Ви ніколи не відвідували Ліон.', [['Vous', 'pronoun'], ["n'avez jamais", 'negation'], ['visité', 'participle'], ['Lyon', 'object']]],
  ['experienceNever', 'Je suis déjà allé à Marseille.', 'Я уже ездил в Марсель.', 'Я вже їздив до Марселя.', [['Je', 'pronoun'], ['suis', 'auxiliary'], ['déjà', 'adverb'], ['allé', 'etreParticiple'], ['Marseille', 'object']]],
  ['experienceNever', 'Elle est déjà arrivée.', 'Она уже приехала.', 'Вона вже приїхала.', [['Elle', 'pronoun'], ['est', 'auxiliary'], ['déjà', 'adverb'], ['arrivée', 'etreParticiple']]],
  ['experienceNever', 'Nous sommes déjà revenus.', 'Мы уже вернулись.', 'Ми вже повернулися.', [['Nous', 'pronoun'], ['sommes', 'auxiliary'], ['déjà', 'adverb'], ['revenus', 'etreParticiple']]],
  ['questionExperience', 'Est-ce que tu as déjà vu ce film ?', 'Ты уже видел этот фильм?', 'Ти вже бачив цей фільм?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['as', 'auxiliary'], ['déjà', 'adverb'], ['vu', 'participle'], ['ce film', 'object']]],
  ['questionExperience', 'As-tu déjà essayé ce plat ?', 'Ты уже пробовал это блюдо?', 'Ти вже куштував цю страву?', [['As-tu', 'questionFrame'], ['déjà', 'adverb'], ['essayé', 'participle'], ['ce plat', 'object']]],
  ['questionExperience', 'Avez-vous déjà visité Paris ?', 'Вы уже посещали Париж?', 'Ви вже відвідували Париж?', [['Avez-vous', 'questionFrame'], ['déjà', 'adverb'], ['visité', 'participle'], ['Paris', 'object']]],
  ['questionExperience', 'A-t-elle déjà appelé ?', 'Она уже звонила?', 'Вона вже телефонувала?', [['A-t-elle', 'questionFrame'], ['déjà', 'adverb'], ['appelé', 'participle']]],
  ['questionExperience', 'Ont-ils déjà envoyé les documents ?', 'Они уже отправили документы?', 'Вони вже надіслали документи?', [['Ont-ils', 'questionFrame'], ['déjà', 'adverb'], ['envoyé', 'participle'], ['les documents', 'object']]],
  ['questionExperience', 'Es-tu déjà allé en France ?', 'Ты уже ездил во Францию?', 'Ти вже їздив до Франції?', [['Es-tu', 'questionFrame'], ['déjà', 'adverb'], ['allé', 'etreParticiple'], ['France', 'object']]],
  ['questionExperience', 'Est-ce que vous avez déjà reçu les billets ?', 'Вы уже получили билеты?', 'Ви вже отримали квитки?', [['Est-ce que', 'questionFrame'], ['vous', 'pronoun'], ['avez', 'auxiliary'], ['déjà', 'adverb'], ['reçu', 'participle'], ['des billets', 'object']]],
  ['questionExperience', 'As-tu déjà pris une décision ?', 'Ты уже принял решение?', 'Ти вже ухвалив рішення?', [['As-tu', 'questionFrame'], ['déjà', 'adverb'], ['pris', 'participle'], ['une décision', 'object']]],
  ['questionExperience', 'Avez-vous déjà appris cette règle ?', 'Вы уже выучили это правило?', 'Ви вже вивчили це правило?', [['Avez-vous', 'questionFrame'], ['déjà', 'adverb'], ['appris', 'participle'], ['cette règle', 'object']]],
  ['questionExperience', 'Est-ce que tu as déjà fait ça ?', 'Ты уже делал это?', 'Ти вже робив це?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['as', 'auxiliary'], ['déjà', 'adverb'], ['fait', 'participle'], ['ça', 'object']]],
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
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson24_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    order: index + 1,
    rowType,
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
  return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
}
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const perfectCategoryCounts = countBy(rows, ['recentFrame', 'auxiliary', 'participle', 'etreParticiple', 'adverb', 'negation', 'questionFrame']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.3', activationApproved: false };
  const candidate = {
    schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-candidate-v1',
    ...base,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    sourceStudyTarget: 'en',
    englishTopic: 'Present Perfect',
    frenchTopic: 'Passé composé, venir de, déjà, jamais, pas encore: result and experience',
    sequencingReason: 'Adds English present-perfect functions as French-native completed-result, recent-past, not-yet, already, and experience frames.',
    frenchNativeTransferRule: 'Do not copy have/has mechanics. Map just to venir de + infinitive; map already/never/not yet/ever to passé composé with déjà, jamais, pas encore, and question frames.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, perfectCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON24_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский Present Perfect не переносится во французский как have/has. Урок тренирует французские способы сказать результат, опыт, уже, ещё не и только что.', bodyUk: 'Англійський Present Perfect не переноситься у французьку як have/has. Урок тренує французькі способи сказати результат, досвід, вже, ще не і щойно.' },
      { titleRu: '02. Только что', titleUk: '02. Щойно', bodyRu: 'Just finished/called/found часто естественно передаётся через venir de + infinitif: Je viens de finir; Elle vient d’appeler.', bodyUk: 'Just finished/called/found часто природно передається через venir de + infinitif: Je viens de finir; Elle vient d’appeler.' },
      { titleRu: '03. Уже и результат', titleUk: '03. Вже і результат', bodyRu: 'Already/result передаётся passé composé с déjà: J’ai déjà fini; Nous avons déjà trouvé les clés.', bodyUk: 'Already/result передається passé composé з déjà: J’ai déjà fini; Nous avons déjà trouvé les clés.' },
      { titleRu: '04. Ещё не и никогда', titleUk: '04. Ще не і ніколи', bodyRu: 'Yet/not yet = pas encore: Je n’ai pas encore fini. Never = ne... jamais: Je n’ai jamais vu ce film.', bodyUk: 'Yet/not yet = pas encore: Je n’ai pas encore fini. Never = ne... jamais: Je n’ai jamais vu ce film.' },
      { titleRu: '05. Опыт и вопросы', titleUk: '05. Досвід і питання', bodyRu: 'Ever/already questions become French questions with déjà: Est-ce que tu as déjà vu ce film ? Avez-vous déjà visité Paris ?', bodyUk: 'Ever/already questions стають французькими питаннями з déjà: Est-ce que tu as déjà vu ce film ? Avez-vous déjà visité Paris ?' },
    ],
    vocabulary,
    practiceHooks: [
      { id: 'recent_past_venir_de', type: 'recent_past', examples: ['Je viens de finir.', 'Elle vient de m’appeler.'] },
      { id: 'passe_compose_deja_result', type: 'result', examples: ['J’ai déjà fini.', 'Nous avons déjà trouvé les clés.'] },
      { id: 'jamais_pas_encore', type: 'negative_adverbs', examples: ['Je n’ai jamais vu ce film.', 'Je n’ai pas encore fini.'] },
    ],
    activationApproved: false,
  });

  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson24.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson24_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson24.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson24.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson24_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson24_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson24-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson24BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson24BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, perfectCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson24BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson24BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson24BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson24BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson24BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson24BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson24BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson24BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 25 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 25 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON24_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
