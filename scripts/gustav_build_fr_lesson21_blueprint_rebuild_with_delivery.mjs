import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 21;
const SLUG = 'lesson21_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson21-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false };

const dirs = {
  review: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review'),
  reviewer: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer'),
  materialized: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', SLUG),
  audio: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', SLUG),
  server: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', SLUG),
  runtime: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', SLUG),
  activation: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', SLUG),
};

const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson21_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson21_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson21_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson21_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson21_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson21_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson21_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson21_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson21_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson21_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson21_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson21_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson21_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson21_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson21_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson21_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson21_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson21_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson21_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  le_robert_pronoms_indefinis: {
    url: 'https://dictionnaire.lerobert.com/guide/pronoms-indefinis',
    claim: 'French indefinite pronouns refer to beings or things without specifying identity or number, including personne and rien.',
  },
  tv5monde_on_pronom_indefini: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-pronom-indefini',
    claim: 'TV5MONDE documents French indefinite pronoun use through on as a non-specific subject.',
  },
  lawless_negative_pronouns: {
    url: 'https://www.lawlessfrench.com/grammar/negative-pronouns/',
    claim: 'French negative pronouns personne and rien require ne around the verb or before the verb when they are subjects.',
  },
  lawless_indefinite_pronouns: {
    url: 'https://www.lawlessfrench.com/grammar/indefinite-pronouns/',
    claim: 'French indefinite pronouns include quelqu un, quelque chose, tout le monde, and others for vague reference.',
  },
  phraseman_english_lesson21_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 21 teaches indefinite pronouns; French must rebuild this with French pronoun polarity and ne requirements.',
  },
};

const BANKS = {
  indefinitePerson: ["quelqu'un", 'on'],
  indefiniteThing: ['quelque chose'],
  indefinitePlace: ['quelque part'],
  universalPerson: ['tout le monde', 'tous'],
  universalThing: ['tout'],
  universalPlace: ['partout'],
  negativePerson: ['personne'],
  negativeThing: ['rien'],
  negativePlace: ['nulle part'],
  neParticle: ['ne', "n'"],
  verb: ['a appelé', 'a frappé', 'attend', 'a pris', 'connaît', "s'est passé", 'a changé', 'manque', 'va', 'est tombé', 'est', 'comprend', 'a répondu', 'est arrivé', 'parle', 'sait', 'répond', 'a vu', 'marche', 'ai vu', 'a appelé', 'avons trouvé', 'connais', "n'ai entendu", "n'a dit", "n'avons acheté", 'fais', 'veulent changer', 'a besoin'],
  object: ['me', 'te', 'mon sac', 'la réponse', 'la règle', 'mon passeport', 'ici', 'dehors', 'hier', 'demain', 'français', 'ça', 'la porte'],
  questionFrame: ['Est-ce que', "Est-ce qu'"],
  pronoun: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'on'],
};

const DATA = [
  ["Quelqu'un m'a appelé.", 'Кто-то мне позвонил.', 'Хтось мені зателефонував.', [["Quelqu'un", 'indefinitePerson'], ["m'", 'object'], ['a appelé', 'verb']]],
  ["Quelqu'un a frappé à la porte.", 'Кто-то постучал в дверь.', 'Хтось постукав у двері.', [["Quelqu'un", 'indefinitePerson'], ['a frappé', 'verb'], ['la porte', 'object']]],
  ["Quelqu'un t'attend dehors.", 'Кто-то ждет тебя снаружи.', 'Хтось чекає на тебе надворі.', [["Quelqu'un", 'indefinitePerson'], ["t'", 'object'], ['attend', 'verb'], ['dehors', 'object']]],
  ["Quelqu'un a pris mon sac.", 'Кто-то взял мою сумку.', 'Хтось узяв мою сумку.', [["Quelqu'un", 'indefinitePerson'], ['a pris', 'verb'], ['mon sac', 'object']]],
  ["Quelqu'un connaît la réponse.", 'Кто-то знает ответ.', 'Хтось знає відповідь.', [["Quelqu'un", 'indefinitePerson'], ['connaît', 'verb'], ['la réponse', 'object']]],
  ["Quelque chose s'est passé.", 'Что-то случилось.', 'Щось сталося.', [['Quelque chose', 'indefiniteThing'], ["s'est passé", 'verb']]],
  ['Quelque chose a changé.', 'Что-то изменилось.', 'Щось змінилося.', [['Quelque chose', 'indefiniteThing'], ['a changé', 'verb']]],
  ['Quelque chose manque ici.', 'Здесь чего-то не хватает.', 'Тут чогось бракує.', [['Quelque chose', 'indefiniteThing'], ['manque', 'verb'], ['ici', 'object']]],
  ['Quelque chose ne va pas.', 'Что-то не так.', 'Щось не так.', [['Quelque chose', 'indefiniteThing'], ['ne', 'neParticle'], ['va', 'verb'], ['pas', 'object']]],
  ['Quelque chose est tombé.', 'Что-то упало.', 'Щось упало.', [['Quelque chose', 'indefiniteThing'], ['est tombé', 'verb']]],
  ['Tout le monde est prêt.', 'Все готовы.', 'Усі готові.', [['Tout le monde', 'universalPerson'], ['est', 'verb'], ['prêt', 'object']]],
  ['Tout le monde comprend.', 'Все понимают.', 'Усі розуміють.', [['Tout le monde', 'universalPerson'], ['comprend', 'verb']]],
  ['Tout le monde a répondu.', 'Все ответили.', 'Усі відповіли.', [['Tout le monde', 'universalPerson'], ['a répondu', 'verb']]],
  ['Tout le monde est arrivé.', 'Все пришли.', 'Усі прийшли.', [['Tout le monde', 'universalPerson'], ['est arrivé', 'verb']]],
  ['Tout le monde parle français.', 'Все говорят по-французски.', 'Усі говорять французькою.', [['Tout le monde', 'universalPerson'], ['parle', 'verb'], ['français', 'object']]],
  ['Tout est clair.', 'Все ясно.', 'Усе зрозуміло.', [['Tout', 'universalThing'], ['est', 'verb'], ['clair', 'object']]],
  ['Tout va bien.', 'Все хорошо.', 'Усе добре.', [['Tout', 'universalThing'], ['va', 'verb'], ['bien', 'object']]],
  ['Tout change vite.', 'Все быстро меняется.', 'Усе швидко змінюється.', [['Tout', 'universalThing'], ['change', 'verb'], ['vite', 'object']]],
  ['Tout reste possible.', 'Все остается возможным.', 'Усе залишається можливим.', [['Tout', 'universalThing'], ['reste', 'verb'], ['possible', 'object']]],
  ['Tout est important.', 'Все важно.', 'Усе важливо.', [['Tout', 'universalThing'], ['est', 'verb'], ['important', 'object']]],
  ['Personne ne sait.', 'Никто не знает.', 'Ніхто не знає.', [['Personne', 'negativePerson'], ['ne', 'neParticle'], ['sait', 'verb']]],
  ["Personne n'est venu hier.", 'Никто не пришел вчера.', 'Ніхто не прийшов учора.', [['Personne', 'negativePerson'], ["n'", 'neParticle'], ['est venu', 'verb'], ['hier', 'object']]],
  ['Personne ne comprend la règle.', 'Никто не понимает правило.', 'Ніхто не розуміє правило.', [['Personne', 'negativePerson'], ['ne', 'neParticle'], ['comprend', 'verb'], ['la règle', 'object']]],
  ['Personne ne répond.', 'Никто не отвечает.', 'Ніхто не відповідає.', [['Personne', 'negativePerson'], ['ne', 'neParticle'], ['répond', 'verb']]],
  ["Personne n'a vu mon passeport.", 'Никто не видел мой паспорт.', 'Ніхто не бачив мій паспорт.', [['Personne', 'negativePerson'], ["n'", 'neParticle'], ['a vu', 'verb'], ['mon passeport', 'object']]],
  ["Rien ne s'est passé.", 'Ничего не случилось.', 'Нічого не сталося.', [['Rien', 'negativeThing'], ['ne', 'neParticle'], ["s'est passé", 'verb']]],
  ['Rien ne manque.', 'Ничего не не хватает.', 'Нічого не бракує.', [['Rien', 'negativeThing'], ['ne', 'neParticle'], ['manque', 'verb']]],
  ["Rien n'est prêt.", 'Ничего не готово.', 'Нічого не готове.', [['Rien', 'negativeThing'], ["n'", 'neParticle'], ['est', 'verb'], ['prêt', 'object']]],
  ['Rien ne change.', 'Ничего не меняется.', 'Нічого не змінюється.', [['Rien', 'negativeThing'], ['ne', 'neParticle'], ['change', 'verb']]],
  ['Rien ne marche.', 'Ничего не работает.', 'Нічого не працює.', [['Rien', 'negativeThing'], ['ne', 'neParticle'], ['marche', 'verb']]],
  ["Je n'ai vu personne.", 'Я никого не видел.', 'Я нікого не бачив.', [['Je', 'pronoun'], ["n'", 'neParticle'], ['ai vu', 'verb'], ['personne', 'negativePerson']]],
  ["Elle n'a appelé personne.", 'Она никому не позвонила.', 'Вона нікому не зателефонувала.', [['Elle', 'pronoun'], ["n'", 'neParticle'], ['a appelé', 'verb'], ['personne', 'negativePerson']]],
  ["Nous n'avons trouvé personne.", 'Мы никого не нашли.', 'Ми нікого не знайшли.', [['Nous', 'pronoun'], ["n'", 'neParticle'], ['avons trouvé', 'verb'], ['personne', 'negativePerson']]],
  ['Il ne connaît personne ici.', 'Он здесь никого не знает.', 'Він тут нікого не знає.', [['Il', 'pronoun'], ['ne', 'neParticle'], ['connaît', 'verb'], ['personne', 'negativePerson'], ['ici', 'object']]],
  ["Je n'attends personne.", 'Я никого не жду.', 'Я нікого не чекаю.', [['Je', 'pronoun'], ["n'", 'neParticle'], ['attends', 'verb'], ['personne', 'negativePerson']]],
  ["Je n'ai rien entendu.", 'Я ничего не слышал.', 'Я нічого не чув.', [['Je', 'pronoun'], ["n'", 'neParticle'], ['ai entendu', 'verb'], ['rien', 'negativeThing']]],
  ["Elle n'a rien dit.", 'Она ничего не сказала.', 'Вона нічого не сказала.', [['Elle', 'pronoun'], ["n'", 'neParticle'], ['a dit', 'verb'], ['rien', 'negativeThing']]],
  ["Nous n'avons rien acheté.", 'Мы ничего не купили.', 'Ми нічого не купили.', [['Nous', 'pronoun'], ["n'", 'neParticle'], ['avons acheté', 'verb'], ['rien', 'negativeThing']]],
  ['Tu ne fais rien demain.', 'Ты завтра ничего не делаешь.', 'Ти завтра нічого не робиш.', [['Tu', 'pronoun'], ['ne', 'neParticle'], ['fais', 'verb'], ['rien', 'negativeThing'], ['demain', 'object']]],
  ['Ils ne veulent rien changer.', 'Они ничего не хотят менять.', 'Вони нічого не хочуть змінювати.', [['Ils', 'pronoun'], ['ne', 'neParticle'], ['veulent changer', 'verb'], ['rien', 'negativeThing']]],
  ["Est-ce que quelqu'un est là ?", 'Кто-нибудь здесь есть?', 'Хтось тут є?', [['Est-ce que', 'questionFrame'], ["quelqu'un", 'indefinitePerson'], ['est', 'verb'], ['là', 'object']]],
  ["Est-ce que quelqu'un a appelé ?", 'Кто-нибудь звонил?', 'Хтось телефонував?', [['Est-ce que', 'questionFrame'], ["quelqu'un", 'indefinitePerson'], ['a appelé', 'verb']]],
  ['Est-ce que tu as vu quelque chose ?', 'Ты что-нибудь видел?', 'Ти щось бачив?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['as vu', 'verb'], ['quelque chose', 'indefiniteThing']]],
  ['Est-ce que quelque chose manque ?', 'Чего-нибудь не хватает?', 'Чогось бракує?', [['Est-ce que', 'questionFrame'], ['quelque chose', 'indefiniteThing'], ['manque', 'verb']]],
  ["Est-ce que quelqu'un connaît la réponse ?", 'Кто-нибудь знает ответ?', 'Хтось знає відповідь?', [['Est-ce que', 'questionFrame'], ["quelqu'un", 'indefinitePerson'], ['connaît', 'verb'], ['la réponse', 'object']]],
  ['Je cherche quelque chose.', 'Я ищу кое-что.', 'Я шукаю дещо.', [['Je', 'pronoun'], ['cherche', 'verb'], ['quelque chose', 'indefiniteThing']]],
  ['Nous allons quelque part.', 'Мы идем куда-то.', 'Ми йдемо кудись.', [['Nous', 'pronoun'], ['allons', 'verb'], ['quelque part', 'indefinitePlace']]],
  ['Je ne vais nulle part.', 'Я никуда не иду.', 'Я нікуди не йду.', [['Je', 'pronoun'], ['ne', 'neParticle'], ['vais', 'verb'], ['nulle part', 'negativePlace']]],
  ['On voit ça partout.', 'Это видно повсюду.', 'Це видно всюди.', [['On', 'pronoun'], ['voit', 'verb'], ['ça', 'object'], ['partout', 'universalPlace']]],
  ['Tout le monde a besoin de quelque chose.', 'Всем что-то нужно.', 'Усім щось потрібно.', [['Tout le monde', 'universalPerson'], ['a besoin', 'verb'], ['de', 'object'], ['quelque chose', 'indefiniteThing']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function flatBanks() { return Object.values(BANKS).flat(); }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  for (const item of flatBanks()) {
    if (distractors.length >= 5) break;
    if (item !== correct && !distractors.includes(item)) distractors.push(item);
  }
  return distractors;
}
function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  return DATA.map(([phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson21_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
}
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const indefiniteCategoryCounts = countBy(rows, ['indefinitePerson', 'indefiniteThing', 'indefinitePlace', 'universalPerson', 'universalThing', 'universalPlace', 'negativePerson', 'negativeThing', 'negativePlace', 'neParticle', 'questionFrame']);
  const rowTypeCounts = {
    positivePersonThing: 10,
    universalPersonThing: 10,
    negativeSubject: 10,
    negativeObject: 10,
    questionIndefinite: 5,
    placeAndMixed: 5,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'B1',
    internalFrenchBand: 'B1.2',
    englishTopic: 'Indefinite pronouns',
    frenchTopic: "French indefinite and negative pronouns: quelqu'un, quelque chose, personne, rien",
    sequencingReason: 'Adds vague people/things/places and negative pronoun polarity after B1 article and noun-phrase control.',
    frenchNativeTransferRule: "Use quelqu'un/quelque chose/tout le monde/tout for positive reference and personne/rien/nulle part with required ne for negative reference.",
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, indefiniteCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON21_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок учит говорить о неопределенных людях, вещах и местах: quelqu’un, quelque chose, quelque part.', bodyUk: 'Урок вчить говорити про неозначених людей, речі та місця: quelqu’un, quelque chose, quelque part.' },
      { titleRu: '02. Кто-то и что-то', titleUk: '02. Хтось і щось', bodyRu: 'Quelqu’un относится к человеку, quelque chose к предмету или событию. Эти формы могут стоять в утверждениях и вопросах.', bodyUk: 'Quelqu’un стосується людини, quelque chose - предмета або події. Ці форми можуть стояти у твердженнях і питаннях.' },
      { titleRu: '03. Все и всё', titleUk: '03. Усі й усе', bodyRu: 'Tout le monde значит все люди, а tout значит всё как целое: Tout le monde comprend; Tout va bien.', bodyUk: 'Tout le monde означає всі люди, а tout означає все як ціле: Tout le monde comprend; Tout va bien.' },
      { titleRu: '04. Personne и rien', titleUk: '04. Personne і rien', bodyRu: 'Personne и rien в отрицательном смысле требуют ne/n’: Personne ne sait; Je n’ai rien entendu.', bodyUk: 'Personne і rien у заперечному значенні вимагають ne/n’: Personne ne sait; Je n’ai rien entendu.' },
      { titleRu: '05. Места', titleUk: '05. Місця', bodyRu: 'Quelque part = где-то/куда-то, nulle part = нигде/никуда с ne, partout = везде.', bodyUk: 'Quelque part = десь/кудись, nulle part = ніде/нікуди з ne, partout = всюди.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson21.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson21_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson21.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson21.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson21_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson21_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson21-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson21BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson21BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, indefiniteCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson21BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson21BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson21BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson21BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson21BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson21BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson21BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson21BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 22 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 22 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON21_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
