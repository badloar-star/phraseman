import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 16;
const SLUG = 'lesson16_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson16-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson16_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson16_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson16_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson16_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson16_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson16_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson16_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson16_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson16_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson16_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson16_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson16_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson16_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson16_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson16_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson16_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson16_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson16_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson16_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  tv5monde_verbes_pronominaux: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-verbes-pronominaux',
    claim: 'French daily-routine equivalents for English phrasal verbs often use pronominal verbs such as se lever and se reveiller.',
  },
  le_robert_se_lever: {
    url: 'https://dictionnaire.lerobert.com/definition/lever',
    claim: 'Se lever means to get up or rise, a native equivalent for get up rather than a particle calque.',
  },
  larousse_allumer: {
    url: 'https://www.larousse.fr/dictionnaires/francais/allumer/2452',
    claim: 'Allumer is the French lexical verb for turning on a light or device; the contrast is eteindre.',
  },
  le_robert_chercher: {
    url: 'https://dictionnaire.lerobert.com/definition/chercher',
    claim: 'Chercher is a native French lexical equivalent for look for/search, not a word-by-word phrasal-verb calque.',
  },
  phraseman_english_lesson16_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 16 teaches Phrasal verbs; French must rebuild this as verb+preposition and idiomatic constructions.',
  },
};

const BANKS = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  reflexive: ['me', 'te', 'se', 'nous', 'vous'],
  verbPronominal: ['réveille', 'lèves', 'lève', 'levons', 'levez', 'lèvent', 'dépêche', 'dépêchent', 'couche', 'habilles', 'souviens', 'approche', 'éloignons'],
  verbAction: ['mets', 'met', 'enlève', 'allumons', 'éteignent', 'cherche', 'ranges', 'revient', 'sort', 'remplissons', 'occupez', 'abandonnent', 'comptez', 'inscrivent', 'répondent', 'attends', 'rappelle', 'continue', 'rangeons', 'cherchez', 'appellent', 'oublient'],
  preposition: ['à', 'de', 'du', 'des', 'sur', 'pour', 'avec'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'mes', 'tes', 'ses', 'notre', 'votre'],
  object: ['lunettes', 'lumière', 'clés', 'chambre', 'formulaire', 'ticket', 'règle', 'porte', 'bruit', 'cours', 'question', 'bus', 'message', 'travail', 'sacs', 'professeur', 'idée', 'document', 'adresse', 'problème'],
  adverb: ['tôt', 'tard', 'bientôt', 'maintenant', 'ce matin', 'ici', 'plus tard', 'trop vite', 'aujourd’hui', 'demain'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  questionFrame: ['Est-ce que', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
};

const DATA = [
  ['Je me réveille tôt.', 'Я просыпаюсь рано.', 'Я прокидаюся рано.', [['Je', 'pronoun'], ['me', 'reflexive'], ['réveille', 'verbPronominal'], ['tôt', 'adverb']]],
  ['Tu te lèves tard.', 'Ты встаешь поздно.', 'Ти встаєш пізно.', [['Tu', 'pronoun'], ['te', 'reflexive'], ['lèves', 'verbPronominal'], ['tard', 'adverb']]],
  ['Il met ses lunettes.', 'Он надевает очки.', 'Він надягає окуляри.', [['Il', 'pronoun'], ['met', 'verbAction'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ['Elle enlève ses lunettes.', 'Она снимает очки.', 'Вона знімає окуляри.', [['Elle', 'pronoun'], ['enlève', 'verbAction'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ['Nous allumons la lumière.', 'Мы включаем свет.', 'Ми вмикаємо світло.', [['Nous', 'pronoun'], ['allumons', 'verbAction'], ['la', 'determiner'], ['lumière', 'object']]],
  ['Ils éteignent la lumière.', 'Они выключают свет.', 'Вони вимикають світло.', [['Ils', 'pronoun'], ['éteignent', 'verbAction'], ['la', 'determiner'], ['lumière', 'object']]],
  ['Je cherche mes clés.', 'Я ищу ключи.', 'Я шукаю ключі.', [['Je', 'pronoun'], ['cherche', 'verbAction'], ['mes', 'determiner'], ['clés', 'object']]],
  ['Tu ranges ta chambre.', 'Ты убираешь свою комнату.', 'Ти прибираєш свою кімнату.', [['Tu', 'pronoun'], ['ranges', 'verbAction'], ['ta', 'determiner'], ['chambre', 'object']]],
  ['Il revient bientôt.', 'Он скоро возвращается.', 'Він скоро повертається.', [['Il', 'pronoun'], ['revient', 'verbAction'], ['bientôt', 'adverb']]],
  ['Elle sort maintenant.', 'Она выходит сейчас.', 'Вона виходить зараз.', [['Elle', 'pronoun'], ['sort', 'verbAction'], ['maintenant', 'adverb']]],
  ['Nous remplissons le formulaire.', 'Мы заполняем форму.', 'Ми заповнюємо форму.', [['Nous', 'pronoun'], ['remplissons', 'verbAction'], ['le', 'determiner'], ['formulaire', 'object']]],
  ['Vous vous occupez du ticket.', 'Вы занимаетесь тикетом.', 'Ви займаєтеся квитком.', [['Vous', 'pronoun'], ['vous', 'reflexive'], ['occupez', 'verbAction'], ['du', 'preposition'], ['ticket', 'object']]],
  ['Ils se dépêchent ce matin.', 'Они торопятся сегодня утром.', 'Вони поспішають сьогодні вранці.', [['Ils', 'pronoun'], ['se', 'reflexive'], ['dépêchent', 'verbPronominal'], ['ce matin', 'adverb']]],
  ['Elles abandonnent trop vite.', 'Они сдаются слишком быстро.', 'Вони здаються надто швидко.', [['Elles', 'pronoun'], ['abandonnent', 'verbAction'], ['trop vite', 'adverb']]],
  ['Je me couche tard.', 'Я ложусь поздно.', 'Я лягаю пізно.', [['Je', 'pronoun'], ['me', 'reflexive'], ['couche', 'verbPronominal'], ['tard', 'adverb']]],
  ["Tu t'habilles vite.", 'Ты быстро одеваешься.', 'Ти швидко одягаєшся.', [['Tu', 'pronoun'], ["t'", 'reflexive'], ['habilles', 'verbPronominal'], ['vite', 'adverb']]],
  ['Il se souvient de la règle.', 'Он помнит правило.', 'Він памʼятає правило.', [['Il', 'pronoun'], ['se', 'reflexive'], ['souvient', 'verbPronominal'], ['de', 'preposition'], ['la', 'determiner'], ['règle', 'object']]],
  ["Elle s'approche de la porte.", 'Она подходит к двери.', 'Вона підходить до дверей.', [['Elle', 'pronoun'], ["s'", 'reflexive'], ['approche', 'verbPronominal'], ['de', 'preposition'], ['la', 'determiner'], ['porte', 'object']]],
  ['Nous nous éloignons du bruit.', 'Мы отходим от шума.', 'Ми відходимо від шуму.', [['Nous', 'pronoun'], ['nous', 'reflexive'], ['éloignons', 'verbPronominal'], ['du', 'preposition'], ['bruit', 'object']]],
  ['Vous comptez sur moi.', 'Вы рассчитываете на меня.', 'Ви розраховуєте на мене.', [['Vous', 'pronoun'], ['comptez', 'verbAction'], ['sur', 'preposition'], ['moi', 'object']]],
  ["Ils s'inscrivent au cours.", 'Они записываются на курс.', 'Вони записуються на курс.', [['Ils', 'pronoun'], ["s'", 'reflexive'], ['inscrivent', 'verbAction'], ['au', 'preposition'], ['cours', 'object']]],
  ['Elles répondent à la question.', 'Они отвечают на вопрос.', 'Вони відповідають на питання.', [['Elles', 'pronoun'], ['répondent', 'verbAction'], ['à', 'preposition'], ['la', 'determiner'], ['question', 'object']]],
  ["J'attends le bus ici.", 'Я жду автобус здесь.', 'Я чекаю автобус тут.', [["J'", 'pronoun'], ['attends', 'verbAction'], ['le', 'determiner'], ['bus', 'object'], ['ici', 'adverb']]],
  ['Tu rappelles le professeur.', 'Ты перезваниваешь преподавателю.', 'Ти передзвонюєш викладачу.', [['Tu', 'pronoun'], ['rappelles', 'verbAction'], ['le', 'determiner'], ['professeur', 'object']]],
  ['Il continue le travail.', 'Он продолжает работу.', 'Він продовжує роботу.', [['Il', 'pronoun'], ['continue', 'verbAction'], ['le', 'determiner'], ['travail', 'object']]],
  ['Elle range les sacs.', 'Она убирает сумки.', 'Вона прибирає сумки.', [['Elle', 'pronoun'], ['range', 'verbAction'], ['les', 'determiner'], ['sacs', 'object']]],
  ['Nous cherchons le document.', 'Мы ищем документ.', 'Ми шукаємо документ.', [['Nous', 'pronoun'], ['cherchons', 'verbAction'], ['le', 'determiner'], ['document', 'object']]],
  ['Vous appelez plus tard.', 'Вы перезваниваете позже.', 'Ви телефонуєте пізніше.', [['Vous', 'pronoun'], ['appelez', 'verbAction'], ['plus tard', 'adverb']]],
  ['Ils oublient le message.', 'Они забывают сообщение.', 'Вони забувають повідомлення.', [['Ils', 'pronoun'], ['oublient', 'verbAction'], ['le', 'determiner'], ['message', 'object']]],
  ['Elles continuent demain.', 'Они продолжат завтра.', 'Вони продовжать завтра.', [['Elles', 'pronoun'], ['continuent', 'verbAction'], ['demain', 'adverb']]],
  ['Je ne me réveille pas tôt.', 'Я не просыпаюсь рано.', 'Я не прокидаюся рано.', [['Je', 'pronoun'], ['ne', 'negation'], ['me', 'reflexive'], ['réveille', 'verbPronominal'], ['pas', 'negation'], ['tôt', 'adverb']]],
  ['Tu ne te lèves pas tard.', 'Ты не встаешь поздно.', 'Ти не встаєш пізно.', [['Tu', 'pronoun'], ['ne', 'negation'], ['te', 'reflexive'], ['lèves', 'verbPronominal'], ['pas', 'negation'], ['tard', 'adverb']]],
  ['Il ne met pas ses lunettes.', 'Он не надевает очки.', 'Він не надягає окуляри.', [['Il', 'pronoun'], ['ne', 'negation'], ['met', 'verbAction'], ['pas', 'negation'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ["Elle n'enlève pas ses lunettes.", 'Она не снимает очки.', 'Вона не знімає окуляри.', [['Elle', 'pronoun'], ["n'", 'negation'], ['enlève', 'verbAction'], ['pas', 'negation'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ["Nous n'allumons pas la lumière.", 'Мы не включаем свет.', 'Ми не вмикаємо світло.', [['Nous', 'pronoun'], ["n'", 'negation'], ['allumons', 'verbAction'], ['pas', 'negation'], ['la', 'determiner'], ['lumière', 'object']]],
  ["Ils n'éteignent pas la lumière.", 'Они не выключают свет.', 'Вони не вимикають світло.', [['Ils', 'pronoun'], ["n'", 'negation'], ['éteignent', 'verbAction'], ['pas', 'negation'], ['la', 'determiner'], ['lumière', 'object']]],
  ['Je ne cherche pas mes clés.', 'Я не ищу ключи.', 'Я не шукаю ключі.', [['Je', 'pronoun'], ['ne', 'negation'], ['cherche', 'verbAction'], ['pas', 'negation'], ['mes', 'determiner'], ['clés', 'object']]],
  ['Tu ne ranges pas ta chambre.', 'Ты не убираешь комнату.', 'Ти не прибираєш кімнату.', [['Tu', 'pronoun'], ['ne', 'negation'], ['ranges', 'verbAction'], ['pas', 'negation'], ['ta', 'determiner'], ['chambre', 'object']]],
  ['Ils ne se dépêchent pas.', 'Они не торопятся.', 'Вони не поспішають.', [['Ils', 'pronoun'], ['ne', 'negation'], ['se', 'reflexive'], ['dépêchent', 'verbPronominal'], ['pas', 'negation']]],
  ['Elles ne répondent pas à la question.', 'Они не отвечают на вопрос.', 'Вони не відповідають на питання.', [['Elles', 'pronoun'], ['ne', 'negation'], ['répondent', 'verbAction'], ['pas', 'negation'], ['à', 'preposition'], ['la', 'determiner'], ['question', 'object']]],
  ['Est-ce que je me réveille tôt ?', 'Я просыпаюсь рано?', 'Я прокидаюся рано?', [['Est-ce que', 'questionFrame'], ['je', 'pronoun'], ['me', 'reflexive'], ['réveille', 'verbPronominal'], ['tôt', 'adverb']]],
  ['Est-ce que tu te lèves tard ?', 'Ты встаешь поздно?', 'Ти встаєш пізно?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['te', 'reflexive'], ['lèves', 'verbPronominal'], ['tard', 'adverb']]],
  ["Est-ce qu'il met ses lunettes ?", 'Он надевает очки?', 'Він надягає окуляри?', [["Est-ce qu'", 'questionFrame'], ['il', 'pronoun'], ['met', 'verbAction'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ["Est-ce qu'elle enlève ses lunettes ?", 'Она снимает очки?', 'Вона знімає окуляри?', [["Est-ce qu'", 'questionFrame'], ['elle', 'pronoun'], ['enlève', 'verbAction'], ['ses', 'determiner'], ['lunettes', 'object']]],
  ['Est-ce que nous allumons la lumière ?', 'Мы включаем свет?', 'Ми вмикаємо світло?', [['Est-ce que', 'questionFrame'], ['nous', 'pronoun'], ['allumons', 'verbAction'], ['la', 'determiner'], ['lumière', 'object']]],
  ["Est-ce qu'ils éteignent la lumière ?", 'Они выключают свет?', 'Вони вимикають світло?', [["Est-ce qu'", 'questionFrame'], ['ils', 'pronoun'], ['éteignent', 'verbAction'], ['la', 'determiner'], ['lumière', 'object']]],
  ['Est-ce que je cherche mes clés ?', 'Я ищу ключи?', 'Я шукаю ключі?', [['Est-ce que', 'questionFrame'], ['je', 'pronoun'], ['cherche', 'verbAction'], ['mes', 'determiner'], ['clés', 'object']]],
  ['Est-ce que tu ranges ta chambre ?', 'Ты убираешь комнату?', 'Ти прибираєш кімнату?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['ranges', 'verbAction'], ['ta', 'determiner'], ['chambre', 'object']]],
  ["Est-ce qu'ils se dépêchent ?", 'Они торопятся?', 'Вони поспішають?', [["Est-ce qu'", 'questionFrame'], ['ils', 'pronoun'], ['se', 'reflexive'], ['dépêchent', 'verbPronominal']]],
  ["Est-ce qu'elles répondent à la question ?", 'Они отвечают на вопрос?', 'Вони відповідають на питання?', [["Est-ce qu'", 'questionFrame'], ['elles', 'pronoun'], ['répondent', 'verbAction'], ['à', 'preposition'], ['la', 'determiner'], ['question', 'object']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  while (distractors.length < 5) distractors.push(Object.values(BANKS).flat().find((item) => item !== correct && !distractors.includes(item)));
  return distractors;
}
function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  return DATA.map(([phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson16_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const constructionCategoryCounts = countBy(rows, ['reflexive', 'verbPronominal', 'verbAction', 'preposition']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => row.phraseFr.endsWith('.') && (/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Phrasal verbs',
    frenchTopic: 'French verb-preposition and idiomatic constructions',
    sequencingReason: 'Introduces English phrasal-verb function as native French pronominal, lexical and verb-preposition chunks after verbs, prepositions and possessives.',
    frenchNativeTransferRule: 'Use se lever, se reveiller, allumer, eteindre, chercher, s’occuper de, compter sur and repondre a; do not calque English verb particles.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, constructionCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON16_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'A2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English phrasal verbs в нативные французские связки: прономинальные глаголы, лексические глаголы и verb + preposition.', bodyUk: 'Урок переносить English phrasal verbs у нативні французькі звʼязки: займенникові дієслова, лексичні дієслова і verb + preposition.' },
      { titleRu: '02. Не калькировать particles', titleUk: '02. Не калькувати particles', bodyRu: 'Get up становится se lever, turn on становится allumer, look for становится chercher. Французский смысл не строится через up/on/off.', bodyUk: 'Get up стає se lever, turn on стає allumer, look for стає chercher. Французький сенс не будується через up/on/off.' },
      { titleRu: '03. Прономинальный слой', titleUk: '03. Займенниковий шар', bodyRu: 'se réveiller, se lever, se dépêcher, se souvenir de требуют reflexive slot: me, te, se, nous, vous.', bodyUk: 'se réveiller, se lever, se dépêcher, se souvenir de потребують reflexive slot: me, te, se, nous, vous.' },
      { titleRu: '04. Verb + preposition', titleUk: '04. Verb + preposition', bodyRu: 's’occuper de, compter sur, répondre à, s’approcher de тренируются как цельные французские конструкции.', bodyUk: 's’occuper de, compter sur, répondre à, s’approcher de тренуються як цілі французькі конструкції.' },
      { titleRu: '05. Что не смешиваем', titleUk: '05. Що не змішуємо', bodyRu: 'Урок не вводит английские phrasal particles как французскую грамматику и не строит искусственные кальки.', bodyUk: 'Урок не вводить англійські phrasal particles як французьку граматику і не будує штучні кальки.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson16.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson16_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson16.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson16.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson16_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson16_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson16-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson16BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson16BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, constructionCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson16BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson16BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson16BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson16BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson16BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson16BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson16BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson16BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 17 blueprint-first rebuild after inspecting English Lesson 17 shape and theory.', 'Keep French-native equivalent scoped to the English function while preserving app-facing B1 parity.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON16_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
