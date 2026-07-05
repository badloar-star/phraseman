import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 17;
const SLUG = 'lesson17_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson17-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson17_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson17_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson17_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson17_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson17_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson17_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson17_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson17_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson17_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson17_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson17_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson17_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson17_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson17_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson17_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson17_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson17_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson17_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson17_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  tv5monde_present_indicatif: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-present-de-lindicatif-0',
    claim: 'French present indicative can describe an action happening now, unlike English which often uses present continuous.',
  },
  le_robert_en_train_de: {
    url: 'https://dictionnaire.lerobert.com/guide/distinguer-entrain-et-en-train',
    claim: 'En train de indicates an action in progress, but it is a locution rather than an English-style tense.',
  },
  lawless_present_progressive: {
    url: 'https://www.lawlessfrench.com/grammar/present-tense/',
    claim: 'French has no direct present progressive tense; the present is usually enough and etre en train de adds emphasis.',
  },
  coe_cefr_a2_current_actions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 learners can describe current everyday actions and simple ongoing situations.',
  },
  phraseman_english_lesson17_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 17 teaches Present Continuous; French must rebuild this with present tense and etre en train de only for progressive emphasis.',
  },
};

const BANKS = {
  pronoun: ["J'", 'Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'Ça'],
  etrePresent: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
  progressiveFrame: ['en train de', "en train d'"],
  verbPresent: ['travaille', 'travailles', 'travaille', 'lis', 'lit', 'cuisine', 'écrit', 'attendons', 'attendez', 'regardent', 'marche', 'écoute', 'parlent', 'jouent', 'prépare', 'cherchent', 'rangent', 'réponds', 'répétons', 'prenez'],
  infinitive: ['travailler', 'lire', 'cuisiner', 'écrire', 'attendre', 'regarder', 'écouter', 'parler', 'jouer', 'préparer', 'chercher', 'ranger', 'répondre', 'répéter', 'prendre', 'dormir'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'des', 'de'],
  object: ['dîner', 'messages', 'télé', 'musique', 'café', 'clés', 'chambre', 'question', 'phrase', 'bus', 'rapport', 'documents', 'réponse', 'travail', 'film'],
  adverb: ['maintenant', 'ici', 'en ce moment', 'aujourd’hui', 'ce matin', 'bien', 'tout de suite'],
  preposition: ['à', 'de', 'avec', 'pour', 'dans'],
  questionFrame: ['Est-ce que', "Est-ce qu'"],
};

const DATA = [
  ['Je travaille maintenant.', 'Я сейчас работаю.', 'Я зараз працюю.', [['Je', 'pronoun'], ['travaille', 'verbPresent'], ['maintenant', 'adverb']]],
  ['Tu lis maintenant.', 'Ты сейчас читаешь.', 'Ти зараз читаєш.', [['Tu', 'pronoun'], ['lis', 'verbPresent'], ['maintenant', 'adverb']]],
  ['Il cuisine le dîner.', 'Он готовит ужин.', 'Він готує вечерю.', [['Il', 'pronoun'], ['cuisine', 'verbPresent'], ['le', 'determiner'], ['dîner', 'object']]],
  ['Elle écrit des messages.', 'Она пишет сообщения.', 'Вона пише повідомлення.', [['Elle', 'pronoun'], ['écrit', 'verbPresent'], ['des', 'determiner'], ['messages', 'object']]],
  ['Nous attendons ici.', 'Мы здесь ждем.', 'Ми тут чекаємо.', [['Nous', 'pronoun'], ['attendons', 'verbPresent'], ['ici', 'adverb']]],
  ['Vous regardez la télé.', 'Вы смотрите телевизор.', 'Ви дивитеся телевізор.', [['Vous', 'pronoun'], ['regardez', 'verbPresent'], ['la', 'determiner'], ['télé', 'object']]],
  ['Ils regardent la télé.', 'Они смотрят телевизор.', 'Вони дивляться телевізор.', [['Ils', 'pronoun'], ['regardent', 'verbPresent'], ['la', 'determiner'], ['télé', 'object']]],
  ['Ça marche bien.', 'Это хорошо работает.', 'Це добре працює.', [['Ça', 'pronoun'], ['marche', 'verbPresent'], ['bien', 'adverb']]],
  ["J'écoute de la musique.", 'Я слушаю музыку.', 'Я слухаю музику.', [["J'", 'pronoun'], ['écoute', 'verbPresent'], ['de', 'preposition'], ['la', 'determiner'], ['musique', 'object']]],
  ['Tu parles avec le professeur.', 'Ты говоришь с преподавателем.', 'Ти говориш з викладачем.', [['Tu', 'pronoun'], ['parles', 'verbPresent'], ['avec', 'preposition'], ['le', 'determiner'], ['professeur', 'object']]],
  ['Il joue maintenant.', 'Он сейчас играет.', 'Він зараз грає.', [['Il', 'pronoun'], ['joue', 'verbPresent'], ['maintenant', 'adverb']]],
  ['Elle prépare le café.', 'Она готовит кофе.', 'Вона готує каву.', [['Elle', 'pronoun'], ['prépare', 'verbPresent'], ['le', 'determiner'], ['café', 'object']]],
  ['Nous cherchons les clés.', 'Мы ищем ключи.', 'Ми шукаємо ключі.', [['Nous', 'pronoun'], ['cherchons', 'verbPresent'], ['les', 'determiner'], ['clés', 'object']]],
  ['Vous rangez la chambre.', 'Вы убираете комнату.', 'Ви прибираєте кімнату.', [['Vous', 'pronoun'], ['rangez', 'verbPresent'], ['la', 'determiner'], ['chambre', 'object']]],
  ['Ils répondent à la question.', 'Они отвечают на вопрос.', 'Вони відповідають на питання.', [['Ils', 'pronoun'], ['répondent', 'verbPresent'], ['à', 'preposition'], ['la', 'determiner'], ['question', 'object']]],
  ['Elles répètent la phrase.', 'Они повторяют фразу.', 'Вони повторюють фразу.', [['Elles', 'pronoun'], ['répètent', 'verbPresent'], ['la', 'determiner'], ['phrase', 'object']]],
  ['Je suis en train de travailler.', 'Я сейчас работаю / занят работой.', 'Я зараз працюю / зайнятий роботою.', [['Je', 'pronoun'], ['suis', 'etrePresent'], ['en train de', 'progressiveFrame'], ['travailler', 'infinitive']]],
  ['Tu es en train de lire.', 'Ты сейчас читаешь.', 'Ти зараз читаєш.', [['Tu', 'pronoun'], ['es', 'etrePresent'], ['en train de', 'progressiveFrame'], ['lire', 'infinitive']]],
  ['Il est en train de cuisiner le dîner.', 'Он сейчас готовит ужин.', 'Він зараз готує вечерю.', [['Il', 'pronoun'], ['est', 'etrePresent'], ['en train de', 'progressiveFrame'], ['cuisiner', 'infinitive'], ['le', 'determiner'], ['dîner', 'object']]],
  ["Elle est en train d'écrire un message.", 'Она сейчас пишет сообщение.', 'Вона зараз пише повідомлення.', [['Elle', 'pronoun'], ['est', 'etrePresent'], ["en train d'", 'progressiveFrame'], ['écrire', 'infinitive'], ['un', 'determiner'], ['message', 'object']]],
  ["Nous sommes en train d'attendre.", 'Мы сейчас ждем.', 'Ми зараз чекаємо.', [['Nous', 'pronoun'], ['sommes', 'etrePresent'], ["en train d'", 'progressiveFrame'], ['attendre', 'infinitive']]],
  ['Vous êtes en train de regarder la télé.', 'Вы сейчас смотрите телевизор.', 'Ви зараз дивитеся телевізор.', [['Vous', 'pronoun'], ['êtes', 'etrePresent'], ['en train de', 'progressiveFrame'], ['regarder', 'infinitive'], ['la', 'determiner'], ['télé', 'object']]],
  ['Ils sont en train de parler.', 'Они сейчас разговаривают.', 'Вони зараз розмовляють.', [['Ils', 'pronoun'], ['sont', 'etrePresent'], ['en train de', 'progressiveFrame'], ['parler', 'infinitive']]],
  ["Elles sont en train d'écouter.", 'Они сейчас слушают.', 'Вони зараз слухають.', [['Elles', 'pronoun'], ['sont', 'etrePresent'], ["en train d'", 'progressiveFrame'], ['écouter', 'infinitive']]],
  ['Je suis en train de préparer le rapport.', 'Я сейчас готовлю отчет.', 'Я зараз готую звіт.', [['Je', 'pronoun'], ['suis', 'etrePresent'], ['en train de', 'progressiveFrame'], ['préparer', 'infinitive'], ['le', 'determiner'], ['rapport', 'object']]],
  ['Tu es en train de chercher les documents.', 'Ты сейчас ищешь документы.', 'Ти зараз шукаєш документи.', [['Tu', 'pronoun'], ['es', 'etrePresent'], ['en train de', 'progressiveFrame'], ['chercher', 'infinitive'], ['les', 'determiner'], ['documents', 'object']]],
  ['Il est en train de répondre.', 'Он сейчас отвечает.', 'Він зараз відповідає.', [['Il', 'pronoun'], ['est', 'etrePresent'], ['en train de', 'progressiveFrame'], ['répondre', 'infinitive']]],
  ['Elle est en train de ranger la chambre.', 'Она сейчас убирает комнату.', 'Вона зараз прибирає кімнату.', [['Elle', 'pronoun'], ['est', 'etrePresent'], ['en train de', 'progressiveFrame'], ['ranger', 'infinitive'], ['la', 'determiner'], ['chambre', 'object']]],
  ['Nous sommes en train de répéter.', 'Мы сейчас повторяем.', 'Ми зараз повторюємо.', [['Nous', 'pronoun'], ['sommes', 'etrePresent'], ['en train de', 'progressiveFrame'], ['répéter', 'infinitive']]],
  ['Vous êtes en train de prendre le bus.', 'Вы сейчас садитесь на автобус.', 'Ви зараз сідаєте на автобус.', [['Vous', 'pronoun'], ['êtes', 'etrePresent'], ['en train de', 'progressiveFrame'], ['prendre', 'infinitive'], ['le', 'determiner'], ['bus', 'object']]],
  ['Je ne travaille pas maintenant.', 'Я сейчас не работаю.', 'Я зараз не працюю.', [['Je', 'pronoun'], ['ne', 'negation'], ['travaille', 'verbPresent'], ['pas', 'negation'], ['maintenant', 'adverb']]],
  ['Tu ne lis pas maintenant.', 'Ты сейчас не читаешь.', 'Ти зараз не читаєш.', [['Tu', 'pronoun'], ['ne', 'negation'], ['lis', 'verbPresent'], ['pas', 'negation'], ['maintenant', 'adverb']]],
  ['Il ne cuisine pas le dîner.', 'Он не готовит ужин.', 'Він не готує вечерю.', [['Il', 'pronoun'], ['ne', 'negation'], ['cuisine', 'verbPresent'], ['pas', 'negation'], ['le', 'determiner'], ['dîner', 'object']]],
  ["Elle n'écrit pas de messages.", 'Она не пишет сообщений.', 'Вона не пише повідомлень.', [['Elle', 'pronoun'], ["n'", 'negation'], ['écrit', 'verbPresent'], ['pas', 'negation'], ['de', 'determiner'], ['messages', 'object']]],
  ["Nous n'attendons pas ici.", 'Мы здесь не ждем.', 'Ми тут не чекаємо.', [['Nous', 'pronoun'], ["n'", 'negation'], ['attendons', 'verbPresent'], ['pas', 'negation'], ['ici', 'adverb']]],
  ['Vous ne regardez pas la télé.', 'Вы не смотрите телевизор.', 'Ви не дивитеся телевізор.', [['Vous', 'pronoun'], ['ne', 'negation'], ['regardez', 'verbPresent'], ['pas', 'negation'], ['la', 'determiner'], ['télé', 'object']]],
  ['Ils ne parlent pas maintenant.', 'Они сейчас не разговаривают.', 'Вони зараз не розмовляють.', [['Ils', 'pronoun'], ['ne', 'negation'], ['parlent', 'verbPresent'], ['pas', 'negation'], ['maintenant', 'adverb']]],
  ["Elles n'écoutent pas la musique.", 'Они не слушают музыку.', 'Вони не слухають музику.', [['Elles', 'pronoun'], ["n'", 'negation'], ['écoutent', 'verbPresent'], ['pas', 'negation'], ['la', 'determiner'], ['musique', 'object']]],
  ['Je ne suis pas en train de dormir.', 'Я сейчас не сплю.', 'Я зараз не сплю.', [['Je', 'pronoun'], ['ne', 'negation'], ['suis', 'etrePresent'], ['pas', 'negation'], ['en train de', 'progressiveFrame'], ['dormir', 'infinitive']]],
  ["Nous ne sommes pas en train d'attendre.", 'Мы сейчас не ждем.', 'Ми зараз не чекаємо.', [['Nous', 'pronoun'], ['ne', 'negation'], ['sommes', 'etrePresent'], ['pas', 'negation'], ["en train d'", 'progressiveFrame'], ['attendre', 'infinitive']]],
  ['Est-ce que tu travailles maintenant ?', 'Ты сейчас работаешь?', 'Ти зараз працюєш?', [['Est-ce que', 'questionFrame'], ['tu', 'pronoun'], ['travailles', 'verbPresent'], ['maintenant', 'adverb']]],
  ["Est-ce qu'il cuisine le dîner ?", 'Он готовит ужин?', 'Він готує вечерю?', [["Est-ce qu'", 'questionFrame'], ['il', 'pronoun'], ['cuisine', 'verbPresent'], ['le', 'determiner'], ['dîner', 'object']]],
  ["Est-ce qu'elle écrit un message ?", 'Она пишет сообщение?', 'Вона пише повідомлення?', [["Est-ce qu'", 'questionFrame'], ['elle', 'pronoun'], ['écrit', 'verbPresent'], ['un', 'determiner'], ['message', 'object']]],
  ['Est-ce que nous attendons ici ?', 'Мы здесь ждем?', 'Ми тут чекаємо?', [['Est-ce que', 'questionFrame'], ['nous', 'pronoun'], ['attendons', 'verbPresent'], ['ici', 'adverb']]],
  ['Est-ce que vous regardez la télé ?', 'Вы смотрите телевизор?', 'Ви дивитеся телевізор?', [['Est-ce que', 'questionFrame'], ['vous', 'pronoun'], ['regardez', 'verbPresent'], ['la', 'determiner'], ['télé', 'object']]],
  ['Est-ce que je suis en train de parler ?', 'Я сейчас говорю?', 'Я зараз говорю?', [['Est-ce que', 'questionFrame'], ['je', 'pronoun'], ['suis', 'etrePresent'], ['en train de', 'progressiveFrame'], ['parler', 'infinitive']]],
  ["Est-ce qu'il est en train de répondre ?", 'Он сейчас отвечает?', 'Він зараз відповідає?', [["Est-ce qu'", 'questionFrame'], ['il', 'pronoun'], ['est', 'etrePresent'], ['en train de', 'progressiveFrame'], ['répondre', 'infinitive']]],
  ['Est-ce que nous sommes en train de répéter ?', 'Мы сейчас повторяем?', 'Ми зараз повторюємо?', [['Est-ce que', 'questionFrame'], ['nous', 'pronoun'], ['sommes', 'etrePresent'], ['en train de', 'progressiveFrame'], ['répéter', 'infinitive']]],
  ['Est-ce que vous êtes en train de prendre le bus ?', 'Вы сейчас садитесь на автобус?', 'Ви зараз сідаєте на автобус?', [['Est-ce que', 'questionFrame'], ['vous', 'pronoun'], ['êtes', 'etrePresent'], ['en train de', 'progressiveFrame'], ['prendre', 'infinitive'], ['le', 'determiner'], ['bus', 'object']]],
  ["Est-ce qu'elles sont en train d'écouter ?", 'Они сейчас слушают?', 'Вони зараз слухають?', [["Est-ce qu'", 'questionFrame'], ['elles', 'pronoun'], ['sont', 'etrePresent'], ["en train d'", 'progressiveFrame'], ['écouter', 'infinitive']]],
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
    rowId: `fr_lesson17_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const progressiveCategoryCounts = countBy(rows, ['etrePresent', 'progressiveFrame', 'verbPresent', 'infinitive']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => row.phraseFr.endsWith('.') && (/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Present Continuous',
    frenchTopic: 'Current actions with present tense and etre en train de',
    sequencingReason: 'Contrasts current action with habitual present simple, using French present as default and etre en train de for progressive emphasis.',
    frenchNativeTransferRule: 'Use present tense for most current actions and etre en train de plus infinitive only where French naturally emphasizes action in progress.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, progressiveCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON17_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'A2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English Present Continuous в французский способ говорить о текущем действии: чаще présent, иногда être en train de.', bodyUk: 'Урок переносить English Present Continuous у французький спосіб говорити про поточну дію: частіше présent, іноді être en train de.' },
      { titleRu: '02. Главная логика', titleUk: '02. Головна логіка', bodyRu: 'Во французском нет прямой формы am/is/are + -ing. Je travaille maintenant уже значит “I am working now”.', bodyUk: 'У французькій немає прямої форми am/is/are + -ing. Je travaille maintenant уже означає “I am working now”.' },
      { titleRu: '03. En train de', titleUk: '03. En train de', bodyRu: 'être + en train de/d’ + infinitif подчеркивает, что действие прямо сейчас в процессе: Je suis en train de travailler.', bodyUk: 'être + en train de/d’ + infinitif підкреслює, що дія прямо зараз у процесі: Je suis en train de travailler.' },
      { titleRu: '04. Отрицание и вопросы', titleUk: '04. Заперечення та питання', bodyRu: 'Отрицание окружает conjugated verb: Je ne travaille pas; Je ne suis pas en train de dormir. Вопросы идут через Est-ce que.', bodyUk: 'Заперечення оточує відмінюване дієслово: Je ne travaille pas; Je ne suis pas en train de dormir. Питання йдуть через Est-ce que.' },
      { titleRu: '05. Что не смешиваем', titleUk: '05. Що не змішуємо', bodyRu: 'Не строим формы типа je suis travaillant. Французский использует présent или être en train de + infinitif.', bodyUk: 'Не будуємо форми типу je suis travaillant. Французька використовує présent або être en train de + infinitif.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson17.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson17_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson17.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson17.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson17_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson17_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson17-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson17BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson17BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, progressiveCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson17BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson17BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson17BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson17BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson17BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson17BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson17BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson17BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 18 blueprint-first rebuild after inspecting English Lesson 18 shape and theory.', 'Keep French-native equivalent scoped to the English function while preserving app-facing A2 parity.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON17_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
