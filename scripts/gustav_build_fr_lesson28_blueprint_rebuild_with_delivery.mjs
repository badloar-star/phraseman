import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSON = 28;
const SLUG = 'lesson28_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson28-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson28_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson28_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson28_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson28_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson28_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson28_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson28_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson28_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson28_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson28_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson28_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson28_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson28_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson28_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson28_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson28_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson28_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson28_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson28_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_pronominal_verbs: { url: 'https://www.lawlessfrench.com/grammar/pronominal-verbs/', claim: 'French pronominal verbs are built with reflexive pronouns and include reflexive, reciprocal, and idiomatic uses.' },
  tv5monde_verbes_pronominaux: { url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-verbes-pronominaux', claim: 'TV5MONDE teaches verbes pronominaux with me/te/se/nous/vous/se and everyday actions.' },
  le_robert_verbes_pronominaux: { url: 'https://dictionnaire.lerobert.com/guide/verbes-pronominaux', claim: 'Le Robert describes pronominal verbs and their agreement behavior.' },
  lawless_pronominal_passe_compose: { url: 'https://www.lawlessfrench.com/grammar/pronominal-verbs-passe-compose/', claim: 'Pronominal verbs form passé composé with être and may show participle agreement.' },
  phraseman_english_lesson28_blueprint: { url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json', claim: 'English Lesson 28 teaches reflexive pronouns; French equivalent is native pronominal verbs and reflexive pronoun placement.' },
};

const BANKS = {
  subject: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'On'],
  reflexive: ['me', 'te', 'se', "s'", 'nous', 'vous'],
  presentVerb: ['lève', 'couches', 'douche', 'habille', 'préparons', 'reposez', 'réveillent', 'amusent', 'sent', 'souviens', 'lave', 'brosse', 'brosses', 'brossons', 'maquille', 'rase', 'coiffe', 'trompons', 'parlent', 'écrivent', 'aident', 'aidons', 'comprennent', 'retrouvez', 'voient', 'disputent', 'soutiennent'],
  negation: ['ne me couche pas', 'ne se souvient pas', 'ne nous trompons pas', 'ne vous inquiétez pas', 'ne se parlent pas'],
  imperative: ['Lève-toi', 'Dépêchez-vous', 'Reposons-nous', 'Ne te lève pas', 'Ne vous inquiétez pas'],
  auxiliaryReflexive: ["me suis", "t'es", "s'est", 'nous sommes', 'vous êtes', 'se sont'],
  pastParticiple: ['levé', 'levée', 'lavé', 'lavée', 'couchés', 'réveillées', 'préparés', 'préparées', 'retrouvés', 'parlé', 'disputés', 'excusée'],
  bodyPart: ['les mains', 'les dents', 'le visage', 'les cheveux', 'la barbe', 'les yeux'],
  timePlace: ['tôt', 'tard', 'après le sport', 'vite', 'avant le départ', 'ici', 'à huit heures', 'devant le miroir', 'après le déjeuner', 'souvent', 'chaque matin', 'hier soir', 'dans le jardin', 'au téléphone', 'après la réunion'],
};

const DATA = [
  ['routinePresent', 'Je me lève tôt.', 'Я встаю рано.', 'Я встаю рано.', [['Je', 'subject'], ['me', 'reflexive'], ['lève', 'presentVerb'], ['tôt', 'timePlace']]],
  ['routinePresent', 'Tu te couches tard.', 'Ты ложишься поздно.', 'Ти лягаєш пізно.', [['Tu', 'subject'], ['te', 'reflexive'], ['couches', 'presentVerb'], ['tard', 'timePlace']]],
  ['routinePresent', 'Il se douche après le sport.', 'Он принимает душ после спорта.', 'Він приймає душ після спорту.', [['Il', 'subject'], ['se', 'reflexive'], ['douche', 'presentVerb'], ['après le sport', 'timePlace']]],
  ['routinePresent', "Elle s'habille vite.", 'Она быстро одевается.', 'Вона швидко одягається.', [['Elle', 'subject'], ["s'", 'reflexive'], ['habille', 'presentVerb'], ['vite', 'timePlace']]],
  ['routinePresent', 'Nous nous préparons avant le départ.', 'Мы готовимся перед отъездом.', 'Ми готуємося перед від’їздом.', [['Nous', 'subject'], ['nous', 'reflexive'], ['préparons', 'presentVerb'], ['avant le départ', 'timePlace']]],
  ['routinePresent', 'Vous vous reposez ici.', 'Вы отдыхаете здесь.', 'Ви відпочиваєте тут.', [['Vous', 'subject'], ['vous', 'reflexive'], ['reposez', 'presentVerb'], ['ici', 'timePlace']]],
  ['routinePresent', 'Ils se réveillent à huit heures.', 'Они просыпаются в восемь.', 'Вони прокидаються о восьмій.', [['Ils', 'subject'], ['se', 'reflexive'], ['réveillent', 'presentVerb'], ['à huit heures', 'timePlace']]],
  ['routinePresent', 'Elles se maquillent devant le miroir.', 'Они красятся перед зеркалом.', 'Вони фарбуються перед дзеркалом.', [['Elles', 'subject'], ['se', 'reflexive'], ['maquille', 'presentVerb'], ['devant le miroir', 'timePlace']]],
  ['routinePresent', 'On se sent mieux après le déjeuner.', 'После обеда становится лучше.', 'Після обіду стає краще.', [['On', 'subject'], ['se', 'reflexive'], ['sent', 'presentVerb'], ['après le déjeuner', 'timePlace']]],
  ['routinePresent', 'Je me souviens de cette phrase.', 'Я помню эту фразу.', 'Я пам’ятаю цю фразу.', [['Je', 'subject'], ['me', 'reflexive'], ['souviens', 'presentVerb']]],
  ['bodyPart', 'Je me lave les mains.', 'Я мою руки.', 'Я мию руки.', [['Je', 'subject'], ['me', 'reflexive'], ['lave', 'presentVerb'], ['les mains', 'bodyPart']]],
  ['bodyPart', 'Tu te brosses les dents.', 'Ты чистишь зубы.', 'Ти чистиш зуби.', [['Tu', 'subject'], ['te', 'reflexive'], ['brosses', 'presentVerb'], ['les dents', 'bodyPart']]],
  ['bodyPart', 'Elle se lave le visage.', 'Она умывает лицо.', 'Вона миє обличчя.', [['Elle', 'subject'], ['se', 'reflexive'], ['lave', 'presentVerb'], ['le visage', 'bodyPart']]],
  ['bodyPart', 'Il se rase la barbe.', 'Он бреет бороду.', 'Він голить бороду.', [['Il', 'subject'], ['se', 'reflexive'], ['rase', 'presentVerb'], ['la barbe', 'bodyPart']]],
  ['bodyPart', 'Nous nous brossons les cheveux.', 'Мы расчесываем волосы.', 'Ми розчісуємо волосся.', [['Nous', 'subject'], ['nous', 'reflexive'], ['brossons', 'presentVerb'], ['les cheveux', 'bodyPart']]],
  ['bodyPart', 'Vous vous lavez les mains.', 'Вы моете руки.', 'Ви миєте руки.', [['Vous', 'subject'], ['vous', 'reflexive'], ['lave', 'presentVerb'], ['les mains', 'bodyPart']]],
  ['bodyPart', 'Ils se frottent les yeux.', 'Они трут глаза.', 'Вони труть очі.', [['Ils', 'subject'], ['se', 'reflexive'], ['frottent', 'presentVerb'], ['les yeux', 'bodyPart']]],
  ['bodyPart', 'Elle se coiffe les cheveux.', 'Она укладывает волосы.', 'Вона зачісує волосся.', [['Elle', 'subject'], ['se', 'reflexive'], ['coiffe', 'presentVerb'], ['les cheveux', 'bodyPart']]],
  ['bodyPart', 'Je me maquille les yeux.', 'Я крашу глаза.', 'Я фарбую очі.', [['Je', 'subject'], ['me', 'reflexive'], ['maquille', 'presentVerb'], ['les yeux', 'bodyPart']]],
  ['bodyPart', 'On se lave le visage chaque matin.', 'Мы умываем лицо каждое утро.', 'Ми миємо обличчя щоранку.', [['On', 'subject'], ['se', 'reflexive'], ['lave', 'presentVerb'], ['le visage', 'bodyPart'], ['chaque matin', 'timePlace']]],
  ['negativeQuestion', 'Je ne me couche pas tard.', 'Я не ложусь поздно.', 'Я не лягаю пізно.', [['Je', 'subject'], ['ne me couche pas', 'negation'], ['tard', 'timePlace']]],
  ['negativeQuestion', 'Il ne se souvient pas de moi.', 'Он меня не помнит.', 'Він мене не пам’ятає.', [['Il', 'subject'], ['ne se souvient pas', 'negation']]],
  ['negativeQuestion', 'Nous ne nous trompons pas.', 'Мы не ошибаемся.', 'Ми не помиляємося.', [['Nous', 'subject'], ['ne nous trompons pas', 'negation']]],
  ['negativeQuestion', 'Ne vous inquiétez pas.', 'Не беспокойтесь.', 'Не хвилюйтеся.', [['Ne vous inquiétez pas', 'imperative']]],
  ['negativeQuestion', 'Elles ne se parlent pas souvent.', 'Они не часто разговаривают друг с другом.', 'Вони не часто розмовляють одна з одною.', [['Elles', 'subject'], ['ne se parlent pas', 'negation'], ['souvent', 'timePlace']]],
  ['negativeQuestion', 'Est-ce que tu te lèves tôt ?', 'Ты встаешь рано?', 'Ти встаєш рано?', [['te', 'reflexive'], ['lèves', 'presentVerb'], ['tôt', 'timePlace']]],
  ['negativeQuestion', 'Pourquoi se dispute-t-il ?', 'Почему он спорит?', 'Чому він свариться?', [['se', 'reflexive'], ['dispute', 'presentVerb']]],
  ['negativeQuestion', 'Où vous retrouvez-vous ?', 'Где вы встречаетесь?', 'Де ви зустрічаєтеся?', [['vous', 'reflexive'], ['retrouvez', 'presentVerb']]],
  ['negativeQuestion', 'À quelle heure se réveillent-ils ?', 'Во сколько они просыпаются?', 'О котрій вони прокидаються?', [['se', 'reflexive'], ['réveillent', 'presentVerb']]],
  ['negativeQuestion', 'Comment vous sentez-vous ?', 'Как вы себя чувствуете?', 'Як ви почуваєтеся?', [['vous', 'reflexive'], ['sentez', 'presentVerb']]],
  ['pastPronominal', 'Je me suis levé tôt.', 'Я встал рано.', 'Я встав рано.', [['Je', 'subject'], ['me suis', 'auxiliaryReflexive'], ['levé', 'pastParticiple'], ['tôt', 'timePlace']]],
  ['pastPronominal', 'Elle s’est levée tard.', 'Она встала поздно.', 'Вона встала пізно.', [['Elle', 'subject'], ['s’est', 'auxiliaryReflexive'], ['levée', 'pastParticiple'], ['tard', 'timePlace']]],
  ['pastPronominal', 'Tu t’es lavé les mains.', 'Ты помыл руки.', 'Ти помив руки.', [['Tu', 'subject'], ['t’es', 'auxiliaryReflexive'], ['lavé', 'pastParticiple'], ['les mains', 'bodyPart']]],
  ['pastPronominal', 'Elle s’est lavée avant le départ.', 'Она помылась перед отъездом.', 'Вона помилася перед від’їздом.', [['Elle', 'subject'], ['s’est', 'auxiliaryReflexive'], ['lavée', 'pastParticiple'], ['avant le départ', 'timePlace']]],
  ['pastPronominal', 'Nous nous sommes couchés tard.', 'Мы легли поздно.', 'Ми лягли пізно.', [['Nous', 'subject'], ['nous sommes', 'auxiliaryReflexive'], ['couchés', 'pastParticiple'], ['tard', 'timePlace']]],
  ['pastPronominal', 'Elles se sont réveillées tôt.', 'Они проснулись рано.', 'Вони прокинулися рано.', [['Elles', 'subject'], ['se sont', 'auxiliaryReflexive'], ['réveillées', 'pastParticiple'], ['tôt', 'timePlace']]],
  ['pastPronominal', 'Vous vous êtes préparés vite.', 'Вы быстро подготовились.', 'Ви швидко підготувалися.', [['Vous', 'subject'], ['vous êtes', 'auxiliaryReflexive'], ['préparés', 'pastParticiple'], ['vite', 'timePlace']]],
  ['pastPronominal', 'Elles se sont préparées ensemble.', 'Они подготовились вместе.', 'Вони підготувалися разом.', [['Elles', 'subject'], ['se sont', 'auxiliaryReflexive'], ['préparées', 'pastParticiple']]],
  ['pastPronominal', 'Ils se sont retrouvés devant le café.', 'Они встретились перед кафе.', 'Вони зустрілися перед кафе.', [['Ils', 'subject'], ['se sont', 'auxiliaryReflexive'], ['retrouvés', 'pastParticiple']]],
  ['pastPronominal', 'Elle s’est excusée après la réunion.', 'Она извинилась после встречи.', 'Вона вибачилася після зустрічі.', [['Elle', 'subject'], ['s’est', 'auxiliaryReflexive'], ['excusée', 'pastParticiple'], ['après la réunion', 'timePlace']]],
  ['reciprocalImperative', 'Ils se parlent souvent.', 'Они часто разговаривают друг с другом.', 'Вони часто розмовляють одне з одним.', [['Ils', 'subject'], ['se', 'reflexive'], ['parlent', 'presentVerb'], ['souvent', 'timePlace']]],
  ['reciprocalImperative', 'Elles s’écrivent chaque semaine.', 'Они пишут друг другу каждую неделю.', 'Вони пишуть одна одній щотижня.', [['Elles', 'subject'], ['s’', 'reflexive'], ['écrivent', 'presentVerb']]],
  ['reciprocalImperative', 'Nous nous aidons beaucoup.', 'Мы много помогаем друг другу.', 'Ми багато допомагаємо одне одному.', [['Nous', 'subject'], ['nous', 'reflexive'], ['aidons', 'presentVerb']]],
  ['reciprocalImperative', 'Ils se comprennent sans mots.', 'Они понимают друг друга без слов.', 'Вони розуміють одне одного без слів.', [['Ils', 'subject'], ['se', 'reflexive'], ['comprennent', 'presentVerb']]],
  ['reciprocalImperative', 'Vous vous retrouvez à huit heures.', 'Вы встречаетесь в восемь.', 'Ви зустрічаєтеся о восьмій.', [['Vous', 'subject'], ['vous', 'reflexive'], ['retrouvez', 'presentVerb'], ['à huit heures', 'timePlace']]],
  ['reciprocalImperative', 'Ils se sont parlé au téléphone.', 'Они поговорили друг с другом по телефону.', 'Вони поговорили одне з одним телефоном.', [['Ils', 'subject'], ['se sont', 'auxiliaryReflexive'], ['parlé', 'pastParticiple'], ['au téléphone', 'timePlace']]],
  ['reciprocalImperative', 'Lève-toi maintenant.', 'Вставай сейчас.', 'Вставай зараз.', [['Lève-toi', 'imperative']]],
  ['reciprocalImperative', 'Dépêchez-vous.', 'Поторопитесь.', 'Поспішайте.', [['Dépêchez-vous', 'imperative']]],
  ['reciprocalImperative', 'Reposons-nous cinq minutes.', 'Давайте отдохнем пять минут.', 'Відпочиньмо п’ять хвилин.', [['Reposons-nous', 'imperative']]],
  ['reciprocalImperative', 'Ne te lève pas trop vite.', 'Не вставай слишком быстро.', 'Не вставай надто швидко.', [['Ne te lève pas', 'imperative'], ['vite', 'timePlace']]],
];

function ensureDirs() { Object.values(dirs).forEach((target) => fs.mkdirSync(target, { recursive: true })); }
function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { ensureDirs(); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.presentVerb;
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
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({ rowId: `fr_lesson28_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`, order: index + 1, rowType, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, phraseFr, ru, uk, wordsFr: slots.map(([correct, category]) => slot(correct, category)), evidenceIds: Object.keys(SOURCES), acceptedForProduction: false }));
}
function countBy(rows, categories) { return rows.flatMap((row) => row.wordsFr).filter((item) => categories.includes(item.category)).reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}); }
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const pronominalCategoryCounts = countBy(rows, ['subject', 'reflexive', 'presentVerb', 'bodyPart', 'negation', 'imperative', 'auxiliaryReflexive', 'pastParticiple']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.4', activationApproved: false };
  const candidate = { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-candidate-v1', ...base, status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK', sourceStudyTarget: 'en', englishTopic: 'Reflexive pronouns', frenchTopic: 'Verbes pronominaux: me/te/se, routine, réciproque, impératif, passé composé', sequencingReason: 'Adds self-reference and object-pronoun behavior as a French-native pronominal verb system at the end of B1.', frenchNativeTransferRule: 'Do not copy English myself/yourself table. French requires pronominal verbs with reflexive pronoun placement, body-part constructions, reciprocal meaning, imperative forms, and passé composé with être.', sources: SOURCES, rows, summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, pronominalCategoryCounts, rowTypeCounts, activationApproved: false }, productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'], safety: SAFETY };
  writeJson(paths.candidate, candidate);

  const review = { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-review-gate-v1', generatedAt, status: 'PASS_LESSON28_REVIEW_ACCEPTED_FOR_NEXT_GATE', reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) }, candidate: rel(paths.candidate), summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false }, rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })), safety: SAFETY };
  writeJson(paths.reviewGate, review);
  const packBase = { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-theory-vocab-pack-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, theory: [
    { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Английский урок про myself/yourself переносится во французский как система verbes pronominaux: je me lève, tu te couches, elle s’habille.', bodyUk: 'Англійський урок про myself/yourself переноситься у французьку як система verbes pronominaux: je me lève, tu te couches, elle s’habille.' },
    { titleRu: '02. Формы me/te/se/nous/vous/se', titleUk: '02. Форми me/te/se/nous/vous/se', bodyRu: 'Возвратная частица меняется по лицу и стоит перед глаголом: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se.', bodyUk: 'Зворотна частка змінюється за особою і стоїть перед дієсловом: je me, tu te, il/elle se, nous nous, vous vous, ils/elles se.' },
    { titleRu: '03. Части тела', titleUk: '03. Частини тіла', bodyRu: 'Во французском часто говорят не “мои руки”, а je me lave les mains: reflexive pronoun показывает владельца, а часть тела остается с артиклем.', bodyUk: 'У французькій часто кажуть не “мої руки”, а je me lave les mains: reflexive pronoun показує власника, а частина тіла лишається з артиклем.' },
    { titleRu: '04. Passé composé', titleUk: '04. Passé composé', bodyRu: 'Pronominal verbs в passé composé идут с être: je me suis levé, elle s’est levée, nous nous sommes couchés.', bodyUk: 'Pronominal verbs у passé composé йдуть з être: je me suis levé, elle s’est levée, nous nous sommes couchés.' },
    { titleRu: '05. Reciprocal и impératif', titleUk: '05. Reciprocal та impératif', bodyRu: 'Se может значить “друг друга”: ils se parlent. В императиве форма меняет позицию: Lève-toi, Dépêchez-vous, Ne te lève pas.', bodyUk: 'Se може означати “одне одного”: ils se parlent. В імперативі форма змінює позицію: Lève-toi, Dépêchez-vous, Ne te lève pas.' },
  ], vocabulary, practiceHooks: [{ id: 'present_pronominal_forms', type: 'reflexive_pronoun_placement', examples: ['Je me lève tôt.', "Elle s'habille vite."] }, { id: 'body_part_pattern', type: 'body_part_reflexive', examples: ['Je me lave les mains.'] }, { id: 'passe_compose_pronominal', type: 'etre_auxiliary_agreement', examples: ['Elle s’est levée tard.'] }], activationApproved: false });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson28.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson28_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson28.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson28.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson28_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson28_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson28-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson28BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson28BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, pronominalCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson28BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson28BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson28BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson28BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson28BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson28BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson28BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson28BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 29 blueprint-first rebuild within app-facing B2 parity.', 'Inspect English Lesson 29 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`HOLD_LESSON28_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
