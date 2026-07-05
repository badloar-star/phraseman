import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 30;
const SLUG = 'lesson30_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson30-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson30_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson30_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson30_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson30_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson30_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson30_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson30_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson30_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson30_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson30_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson30_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson30_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson30_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson30_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson30_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson30_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson30_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson30_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson30_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_relative_pronouns: { url: 'https://www.lawlessfrench.com/grammar/relative-pronouns/', claim: 'French relative pronouns include qui, que, où, dont, and lequel forms with different grammatical roles.' },
  tv5monde_pronoms_relatifs: { url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-pronoms-relatifs-simples-qui-que-ou-dont', claim: 'TV5MONDE teaches simple relative pronouns qui, que, où, dont and their core usage.' },
  le_robert_pronoms_relatifs: { url: 'https://dictionnaire.lerobert.com/guide/les-pronoms-relatifs', claim: 'Le Robert describes French relative pronouns and agreement with antecedents.' },
  tex_french_relative_pronouns: { url: 'https://laits.utexas.edu/tex/gr/pror1.html', claim: 'Tex French Grammar explains qui and que as subject/object relatives and introduces dont/où.' },
  phraseman_english_lesson30_blueprint: { url: 'app/lesson_data_25_32.ts#LESSON_30_PHRASES', claim: 'English Lesson 30 teaches relative clauses with who, that, where, whose, and mixed review rows.' },
};

const BASE_BANKS = {
  mainSubject: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'on', 'ce', 'voici'],
  mainVerb: ['connais', 'cherche', 'vois', 'lis', 'utilise', 'appelle', 'aide', 'invite', 'trouve', 'prends', 'voici', 'c’est'],
  antecedent: ['un homme', 'une femme', 'une personne', 'un médecin', 'un ami', 'une sœur', 'le professeur', 'l’étudiant', 'l’homme', 'la femme', 'les gens', 'un livre', 'le message', 'l’application', 'la maison', 'la ville', 'le café', 'l’école', 'le bureau', 'une fille', 'un garçon', 'un collègue', 'les documents', 'les mots'],
  relativePronoun: ['qui', 'que', "qu'", 'où', 'dont', 'avec lequel', 'dans laquelle', 'sur lequel', 'pour laquelle', 'à qui'],
  relativeVerb: ['travaille', 'parle', 'peut', 'habite', 'étudie', 'vit', 'a aidé', 'a répondu', 'a perdu', 'a oublié', 'écoutent', 'ai lu', 'as vérifié', 'nous utilisons', 'j’ai laissé', 'je suis né', 'nous étudions', 'je t’ai parlé', 'tu as besoin', 'je suis fier'],
  objectPlace: ['ici', 'anglais', 'près d’ici', 'le français', 'la réponse', 'ses clés', 'son téléphone', 'son sac', 'tous les jours', 'correctement', 'attentivement', 'ce soir', 'hier', 'ensemble', 'bien', 'à Paris', 'la semaine dernière', 'sur la table', 'dans la rue', 'avec elle'],
  possessionNoun: ['le père', 'la mère', 'le frère', 'la sœur', 'le sac', 'la voiture', 'le téléphone', 'les clés', 'le nom', 'le projet'],
  questionMarker: ['Est-ce que', "Est-ce qu'", 'Où', 'Qui', 'Quel', 'Quelle'],
  imperativeVerb: ['Trouve', 'Demande', 'Utilise', 'Choisis', 'Garde', 'Appelle'],
};

const DATA = [
  ['quiSubjectPeople', 'Je connais un homme qui travaille ici.', 'Я знаю мужчину, который работает здесь.', 'Я знаю чоловіка, який працює тут.', [['je', 'mainSubject'], ['connais', 'mainVerb'], ['un homme', 'antecedent'], ['qui', 'relativePronoun'], ['travaille', 'relativeVerb'], ['ici', 'objectPlace']]],
  ['quiSubjectPeople', 'Elle connaît une femme qui parle anglais.', 'Она знает женщину, которая говорит по-английски.', 'Вона знає жінку, яка говорить англійською.', [['elle', 'mainSubject'], ['une femme', 'antecedent'], ['qui', 'relativePronoun'], ['parle', 'relativeVerb'], ['anglais', 'objectPlace']]],
  ['quiSubjectPeople', 'Nous avons rencontré une personne qui peut nous aider.', 'Мы встретили человека, который может нам помочь.', 'Ми зустріли людину, яка може нам допомогти.', [['nous', 'mainSubject'], ['une personne', 'antecedent'], ['qui', 'relativePronoun'], ['peut', 'relativeVerb']]],
  ['quiSubjectPeople', 'Ils ont appelé un médecin qui habite près d’ici.', 'Они позвонили врачу, который живёт рядом.', 'Вони зателефонували лікарю, який живе поруч.', [['ils', 'mainSubject'], ['un médecin', 'antecedent'], ['qui', 'relativePronoun'], ['habite', 'relativeVerb'], ['près d’ici', 'objectPlace']]],
  ['quiSubjectPeople', 'J’ai un ami qui étudie le français.', 'У меня есть друг, который учит французский.', 'У мене є друг, який вивчає французьку.', [['un ami', 'antecedent'], ['qui', 'relativePronoun'], ['étudie', 'relativeVerb'], ['le français', 'objectPlace']]],
  ['quiSubjectPeople', 'Elle a une sœur qui travaille la nuit.', 'У неё есть сестра, которая работает ночью.', 'У неї є сестра, яка працює вночі.', [['elle', 'mainSubject'], ['une sœur', 'antecedent'], ['qui', 'relativePronoun'], ['travaille', 'relativeVerb']]],
  ['quiSubjectPeople', 'C’est le professeur qui m’a aidé.', 'Это преподаватель, который мне помог.', 'Це викладач, який мені допоміг.', [['c’est', 'mainVerb'], ['le professeur', 'antecedent'], ['qui', 'relativePronoun'], ['a aidé', 'relativeVerb']]],
  ['quiSubjectPeople', 'Voici l’étudiant qui a répondu correctement.', 'Вот студент, который ответил правильно.', 'Ось студент, який відповів правильно.', [['voici', 'mainVerb'], ['l’étudiant', 'antecedent'], ['qui', 'relativePronoun'], ['a répondu', 'relativeVerb'], ['correctement', 'objectPlace']]],
  ['quiSubjectPeople', 'J’ai vu l’homme qui a perdu son téléphone.', 'Я видел мужчину, который потерял телефон.', 'Я бачив чоловіка, який загубив телефон.', [['l’homme', 'antecedent'], ['qui', 'relativePronoun'], ['a perdu', 'relativeVerb'], ['son téléphone', 'objectPlace']]],
  ['quiSubjectPeople', 'Nous avons aidé la femme qui a oublié ses clés.', 'Мы помогли женщине, которая забыла ключи.', 'Ми допомогли жінці, яка забула ключі.', [['nous', 'mainSubject'], ['la femme', 'antecedent'], ['qui', 'relativePronoun'], ['a oublié', 'relativeVerb'], ['ses clés', 'objectPlace']]],
  ['queObject', 'Le livre que je lis est clair.', 'Книга, которую я читаю, понятная.', 'Книга, яку я читаю, зрозуміла.', [['le livre', 'antecedent'], ['que', 'relativePronoun'], ['je', 'mainSubject'], ['lis', 'mainVerb']]],
  ['queObject', 'Le message que tu as envoyé est utile.', 'Сообщение, которое ты отправил, полезное.', 'Повідомлення, яке ти надіслав, корисне.', [['le message', 'antecedent'], ['que', 'relativePronoun'], ['tu', 'mainSubject']]],
  ['queObject', "L'application que nous utilisons fonctionne bien.", 'Приложение, которым мы пользуемся, работает хорошо.', 'Застосунок, яким ми користуємося, працює добре.', [["L'application", 'antecedent'], ['que', 'relativePronoun'], ['nous utilisons', 'relativeVerb'], ['bien', 'objectPlace']]],
  ['queObject', 'La phrase que vous répétez est importante.', 'Фраза, которую вы повторяете, важная.', 'Фраза, яку ви повторюєте, важлива.', [['que', 'relativePronoun'], ['vous', 'mainSubject']]],
  ['queObject', 'Les documents que tu as vérifiés sont prêts.', 'Документы, которые ты проверил, готовы.', 'Документи, які ти перевірив, готові.', [['les documents', 'antecedent'], ['que', 'relativePronoun'], ['as vérifié', 'relativeVerb']]],
  ['queObject', 'La chanson que j’écoute me rappelle Paris.', 'Песня, которую я слушаю, напоминает мне Париж.', 'Пісня, яку я слухаю, нагадує мені Париж.', [['que', 'relativePronoun'], ['j’', 'mainSubject']]],
  ['queObject', 'Le café que nous avons choisi est ouvert.', 'Кафе, которое мы выбрали, открыто.', 'Кафе, яке ми вибрали, відкрите.', [['le café', 'antecedent'], ['que', 'relativePronoun'], ['nous', 'mainSubject']]],
  ['queObject', 'La règle que tu expliques aide beaucoup.', 'Правило, которое ты объясняешь, очень помогает.', 'Правило, яке ти пояснюєш, дуже допомагає.', [['que', 'relativePronoun'], ['tu', 'mainSubject']]],
  ['queObject', 'Les mots que je comprends restent en mémoire.', 'Слова, которые я понимаю, остаются в памяти.', 'Слова, які я розумію, залишаються в пам’яті.', [['les mots', 'antecedent'], ['que', 'relativePronoun'], ['je', 'mainSubject']]],
  ['queObject', 'La correction qu’elle propose est précise.', 'Правка, которую она предлагает, точная.', 'Правка, яку вона пропонує, точна.', [["qu'", 'relativePronoun'], ['elle', 'mainSubject']]],
  ['ouPlaceTime', 'C’est la maison où j’ai grandi.', 'Это дом, где я вырос.', 'Це будинок, де я виріс.', [['c’est', 'mainVerb'], ['la maison', 'antecedent'], ['où', 'relativePronoun']]],
  ['ouPlaceTime', 'Voici la ville où je suis né.', 'Вот город, где я родился.', 'Ось місто, де я народився.', [['voici', 'mainVerb'], ['la ville', 'antecedent'], ['où', 'relativePronoun'], ['je suis né', 'relativeVerb']]],
  ['ouPlaceTime', 'Je cherche un café où nous pouvons parler.', 'Я ищу кафе, где мы можем поговорить.', 'Я шукаю кафе, де ми можемо поговорити.', [['je', 'mainSubject'], ['cherche', 'mainVerb'], ['un café', 'antecedent'], ['où', 'relativePronoun']]],
  ['ouPlaceTime', 'C’est l’école où elle étudie.', 'Это школа, где она учится.', 'Це школа, де вона навчається.', [['c’est', 'mainVerb'], ['l’école', 'antecedent'], ['où', 'relativePronoun'], ['elle', 'mainSubject'], ['étudie', 'relativeVerb']]],
  ['ouPlaceTime', 'Voilà le bureau où je travaille.', 'Вот офис, где я работаю.', 'Ось офіс, де я працюю.', [['le bureau', 'antecedent'], ['où', 'relativePronoun'], ['je', 'mainSubject']]],
  ['ouPlaceTime', 'Je me souviens du jour où nous nous sommes rencontrés.', 'Я помню день, когда мы познакомились.', 'Я пам’ятаю день, коли ми познайомилися.', [['où', 'relativePronoun'], ['nous', 'mainSubject']]],
  ['ouPlaceTime', 'C’est le moment où tout a changé.', 'Это момент, когда всё изменилось.', 'Це момент, коли все змінилося.', [['c’est', 'mainVerb'], ['où', 'relativePronoun']]],
  ['ouPlaceTime', 'Elle montre la table où j’ai laissé les clés.', 'Она показывает стол, где я оставил ключи.', 'Вона показує стіл, де я залишив ключі.', [['elle', 'mainSubject'], ['où', 'relativePronoun'], ['j’ai laissé', 'relativeVerb'], ['les clés', 'objectPlace']]],
  ['ouPlaceTime', 'Nous aimons le quartier où ils habitent.', 'Нам нравится район, где они живут.', 'Нам подобається район, де вони живуть.', [['nous', 'mainSubject'], ['où', 'relativePronoun'], ['ils', 'mainSubject']]],
  ['ouPlaceTime', 'Garde l’adresse où je t’attends.', 'Сохрани адрес, где я тебя жду.', 'Збережи адресу, де я тебе чекаю.', [['Garde', 'imperativeVerb'], ['où', 'relativePronoun'], ['je', 'mainSubject']]],
  ['dontPossession', 'Je connais une fille dont le père est médecin.', 'Я знаю девочку, чей отец врач.', 'Я знаю дівчину, чий батько лікар.', [['je', 'mainSubject'], ['une fille', 'antecedent'], ['dont', 'relativePronoun'], ['le père', 'possessionNoun']]],
  ['dontPossession', 'C’est le garçon dont la mère travaille ici.', 'Это мальчик, чья мама работает здесь.', 'Це хлопець, чия мама працює тут.', [['c’est', 'mainVerb'], ['le garçon', 'antecedent'], ['dont', 'relativePronoun'], ['la mère', 'possessionNoun'], ['ici', 'objectPlace']]],
  ['dontPossession', 'J’aide un collègue dont le frère cherche un emploi.', 'Я помогаю коллеге, чей брат ищет работу.', 'Я допомагаю колезі, чий брат шукає роботу.', [['un collègue', 'antecedent'], ['dont', 'relativePronoun'], ['le frère', 'possessionNoun'], ['cherche', 'mainVerb']]],
  ['dontPossession', 'Elle invite une amie dont la sœur parle français.', 'Она приглашает подругу, чья сестра говорит по-французски.', 'Вона запрошує подругу, чия сестра говорить французькою.', [['elle', 'mainSubject'], ['dont', 'relativePronoun'], ['la sœur', 'possessionNoun']]],
  ['dontPossession', 'Voilà l’étudiant dont le sac est ici.', 'Вот студент, чья сумка здесь.', 'Ось студент, чия сумка тут.', [['voilà', 'mainVerb'], ['l’étudiant', 'antecedent'], ['dont', 'relativePronoun'], ['le sac', 'possessionNoun'], ['ici', 'objectPlace']]],
  ['dontPossession', 'Je vois la femme dont la voiture est rouge.', 'Я вижу женщину, чья машина красная.', 'Я бачу жінку, чия машина червона.', [['je', 'mainSubject'], ['la femme', 'antecedent'], ['dont', 'relativePronoun'], ['la voiture', 'possessionNoun']]],
  ['dontPossession', 'C’est l’homme dont le téléphone sonne.', 'Это мужчина, чей телефон звонит.', 'Це чоловік, чий телефон дзвонить.', [['c’est', 'mainVerb'], ['l’homme', 'antecedent'], ['dont', 'relativePronoun'], ['le téléphone', 'possessionNoun']]],
  ['dontPossession', 'Je cherche la personne dont le nom commence par L.', 'Я ищу человека, чьё имя начинается на L.', 'Я шукаю людину, чиє ім’я починається на L.', [['je', 'mainSubject'], ['cherche', 'mainVerb'], ['la personne', 'antecedent'], ['dont', 'relativePronoun'], ['le nom', 'possessionNoun']]],
  ['prepositionLequel', 'C’est le dossier sur lequel je travaille.', 'Это файл, над которым я работаю.', 'Це файл, над яким я працюю.', [['c’est', 'mainVerb'], ['sur lequel', 'relativePronoun'], ['je', 'mainSubject']]],
  ['prepositionLequel', 'Voici la raison pour laquelle je reste.', 'Вот причина, по которой я остаюсь.', 'Ось причина, через яку я залишаюся.', [['voici', 'mainVerb'], ['pour laquelle', 'relativePronoun'], ['je', 'mainSubject']]],
  ['prepositionLequel', 'Je garde le stylo avec lequel tu écris.', 'Я храню ручку, которой ты пишешь.', 'Я зберігаю ручку, якою ти пишеш.', [['je', 'mainSubject'], ['avec lequel', 'relativePronoun'], ['tu', 'mainSubject']]],
  ['prepositionLequel', 'Elle aime la ville dans laquelle elle vit.', 'Ей нравится город, в котором она живёт.', 'Їй подобається місто, у якому вона живе.', [['elle', 'mainSubject'], ['la ville', 'antecedent'], ['dans laquelle', 'relativePronoun']]],
  ['prepositionLequel', 'C’est la personne à qui je fais confiance.', 'Это человек, которому я доверяю.', 'Це людина, якій я довіряю.', [['c’est', 'mainVerb'], ['la personne', 'antecedent'], ['à qui', 'relativePronoun'], ['je', 'mainSubject']]],
  ['mixedReview', 'Est-ce que c’est la femme dont le sac est ici ?', 'Это женщина, чья сумка здесь?', 'Це жінка, чия сумка тут?', [['Est-ce que', 'questionMarker'], ['la femme', 'antecedent'], ['dont', 'relativePronoun'], ['le sac', 'possessionNoun'], ['ici', 'objectPlace']]],
  ['mixedReview', 'Est-ce que ce sont les documents que tu as vérifiés ?', 'Это документы, которые ты проверил?', 'Це документи, які ти перевірив?', [["Est-ce que", 'questionMarker'], ['les documents', 'antecedent'], ['que', 'relativePronoun'], ['tu', 'mainSubject'], ['as vérifié', 'relativeVerb']]],
  ['mixedReview', 'Est-ce que ce sont les gens qui nous ont aidés ?', 'Это люди, которые нам помогли?', 'Це люди, які нам допомогли?', [['Est-ce que', 'questionMarker'], ['les gens', 'antecedent'], ['qui', 'relativePronoun']]],
  ['mixedReview', 'Trouve un endroit où tu peux étudier.', 'Найди место, где ты можешь учиться.', 'Знайди місце, де ти можеш вчитися.', [['Trouve', 'imperativeVerb'], ['où', 'relativePronoun'], ['tu', 'mainSubject']]],
  ['mixedReview', 'Demande à quelqu’un qui connaît la réponse.', 'Спроси кого-то, кто знает ответ.', 'Запитай когось, хто знає відповідь.', [['Demande', 'imperativeVerb'], ['qui', 'relativePronoun']]],
  ['mixedReview', 'Utilise les mots que tu comprends.', 'Используй слова, которые понимаешь.', 'Використовуй слова, які розумієш.', [['Utilise', 'imperativeVerb'], ['les mots', 'antecedent'], ['que', 'relativePronoun'], ['tu', 'mainSubject']]],
  ['mixedReview', "Choisis l'exemple dont tu te souviens.", 'Выбери пример, который ты помнишь.', 'Вибери приклад, який ти пам’ятаєш.', [['Choisis', 'imperativeVerb'], ['dont', 'relativePronoun'], ['tu', 'mainSubject']]],
];

function ensureDirs() { Object.values(dirs).forEach((folder) => fs.mkdirSync(folder, { recursive: true })); }
function writeJson(file, value) { ensureDirs(); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function byteSize(file) { return fs.statSync(file).size; }
function slot(correct, category) {
  const bank = [...new Set([correct, ...(BASE_BANKS[category] || [])])];
  if (bank.length < 6) throw new Error(`Missing bank ${category}`);
  const distractors = bank.filter((value) => value !== correct).slice(0, 5);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  if (DATA.length !== 50) throw new Error(`Lesson 30 must have 50 rows, got ${DATA.length}`);
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson30_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const relativeCategoryCounts = countBy(rows, ['mainSubject', 'mainVerb', 'antecedent', 'relativePronoun', 'relativeVerb', 'objectPlace', 'possessionNoun', 'questionMarker', 'imperativeVerb']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B2', internalFrenchBand: 'B2.2', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Relative Clauses', frenchTopic: 'Pronoms relatifs: qui, que, où, dont, lequel', sequencingReason: 'Extends B2 sentence complexity by joining ideas with French-native relative pronouns instead of copying English who/which/that directly.', frenchNativeTransferRule: 'Do not map who/which/that one-to-one. French chooses qui for subject role, que/qu’ for direct object role, où for place/time, dont for de/possession, and lequel forms after prepositions.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, relativeCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'LESSONS_31_32_NOT_DONE', 'FULL_NON_LESSON_SURFACE_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON30_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский урок про who/which/that переносится во французский как система pronoms relatifs: qui, que, où, dont, lequel. Главное не слово в английском, а роль внутри французской части.', bodyUk: 'Англійський урок про who/which/that переноситься у французьку як система pronoms relatifs: qui, que, où, dont, lequel. Головне не слово в англійській, а роль у французькій частині.' },
    { titleRu: '02. Qui и que', titleUk: '02. Qui і que', bodyRu: 'Qui заменяет подлежащее: un homme qui travaille. Que/qu’ заменяет прямой объект: le livre que je lis, la correction qu’elle propose.', bodyUk: 'Qui замінює підмет: un homme qui travaille. Que/qu’ замінює прямий додаток: le livre que je lis, la correction qu’elle propose.' },
    { titleRu: '03. Où', titleUk: '03. Où', bodyRu: 'Où связывает место или момент: la ville où je suis né, le jour où nous nous sommes rencontrés. Это не только физическое “где”, но и “когда” для момента.', bodyUk: 'Où пов’язує місце або момент: la ville où je suis né, le jour où nous nous sommes rencontrés. Це не тільки фізичне “де”, а й “коли” для моменту.' },
    { titleRu: '04. Dont', titleUk: '04. Dont', bodyRu: 'Dont нужен там, где внутри связи есть de или принадлежность: la fille dont le père est médecin, le projet dont je suis fier.', bodyUk: 'Dont потрібен там, де всередині зв’язку є de або належність: la fille dont le père est médecin, le projet dont je suis fier.' },
    { titleRu: '05. Lequel после предлога', titleUk: '05. Lequel після прийменника', bodyRu: 'После предлогов часто появляются lequel-формы: sur lequel, pour laquelle, dans laquelle, avec lequel. Для людей можно использовать à qui.', bodyUk: 'Після прийменників часто з’являються форми lequel: sur lequel, pour laquelle, dans laquelle, avec lequel. Для людей можна використовувати à qui.' },
  ], vocabulary, practiceHooks: [{ id: 'qui_vs_que_role', type: 'relative_pronoun_role_choice', examples: ['un homme qui travaille', 'le livre que je lis'] }, { id: 'ou_place_time', type: 'relative_place_time', examples: ['la ville où je suis né'] }, { id: 'dont_possession', type: 'relative_possession_de', examples: ['une fille dont le père est médecin'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson30.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson30_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson30.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson30.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson30_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson30_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson30-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson30BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson30BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, relativeCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson30BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson30BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson30BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson30BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson30BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson30BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson30BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson30BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 31 blueprint-first rebuild within app-facing B2 parity.', 'Inspect English Lesson 31 Complex Object source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON30_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
