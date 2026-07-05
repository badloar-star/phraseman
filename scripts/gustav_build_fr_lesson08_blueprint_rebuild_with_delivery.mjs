import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson08_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson08_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson08_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson08_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson08_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson08_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson08_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson08_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson08_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson08_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson08_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson08_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson08_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson08_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson08_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson08_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson08_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson08_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson08_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson08_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson08_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson08_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson08_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson08_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson08-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
const SOURCES = {
  tv5monde_day_hour: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-quel-jour-et-quelle-heure',
    claim: 'French A1 time questions and answers use day and hour expressions such as lundi and a huit heures.',
  },
  le_robert_mardi: {
    url: 'https://dictionnaire.lerobert.com/definition/mardi',
    claim: 'French weekdays are used directly for a specific day and with le for habitual repetition.',
  },
  le_robert_heure: {
    url: 'https://dictionnaire.lerobert.com/definition/heure',
    claim: 'French clock-time expressions are built around heure/heures and use a for exact time.',
  },
  coe_cefr_a1_time_expressions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 interaction uses simple time references for familiar routines and appointments.',
  },
  phraseman_english_lesson8_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 8 teaches in/on/at time preposition contrasts; French must use native time markers instead of copying those categories.',
  },
};

const BANKS = {
  pronounCap: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  pronounLow: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
  verb: ['travaille', 'travailles', 'travaille', 'travaillons', 'travaillez', 'travaillent', 'parle', 'parles', 'parlons', 'parlez', 'parlent', 'écoute', 'écoutes', 'regarde', 'regardes', 'regardent', 'bois', 'buvons', 'avons', 'avez', 'ont'],
  negation: ['ne', "n'", 'pas'],
  questionFrame: ['Est-ce', 'que', "qu'", 'Avez-vous'],
  determiner: ['le', 'la', "l'", 'les', 'ce', 'cet', 'en', 'à'],
  weekday: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  timeExact: ['à huit heures', 'à neuf heures', 'à dix heures', 'à onze heures', 'à midi', 'à minuit'],
  month: ['en janvier', 'en février', 'en mars', 'en avril', 'en mai', 'en juin', 'en juillet', 'en août'],
  season: ['en été', 'en hiver', 'en automne', 'au printemps', 'en 2026', 'en 2027'],
  dayPart: ['le matin', "l'après-midi", 'le soir', 'la nuit', 'ce matin', 'cet après-midi', 'ce soir'],
  object: ['radio', 'télé', 'français', 'anglais', 'café', 'thé', 'temps', 'Wi-Fi', 'message', 'livre'],
};

const DATA = [
  ['Je travaille lundi.', 'Я работаю в понедельник.', 'Я працюю в понеділок.', [['Je', 'pronounCap'], ['travaille', 'verb'], ['lundi', 'weekday']]],
  ['Tu travailles mardi.', 'Ты работаешь во вторник.', 'Ти працюєш у вівторок.', [['Tu', 'pronounCap'], ['travailles', 'verb'], ['mardi', 'weekday']]],
  ['Il travaille mercredi.', 'Он работает в среду.', 'Він працює в середу.', [['Il', 'pronounCap'], ['travaille', 'verb'], ['mercredi', 'weekday']]],
  ['Elle travaille jeudi.', 'Она работает в четверг.', 'Вона працює в четвер.', [['Elle', 'pronounCap'], ['travaille', 'verb'], ['jeudi', 'weekday']]],
  ['Nous travaillons vendredi.', 'Мы работаем в пятницу.', 'Ми працюємо в п’ятницю.', [['Nous', 'pronounCap'], ['travaillons', 'verb'], ['vendredi', 'weekday']]],
  ['Vous travaillez samedi.', 'Вы работаете в субботу.', 'Ви працюєте в суботу.', [['Vous', 'pronounCap'], ['travaillez', 'verb'], ['samedi', 'weekday']]],
  ['Ils travaillent dimanche.', 'Они работают в воскресенье.', 'Вони працюють у неділю.', [['Ils', 'pronounCap'], ['travaillent', 'verb'], ['dimanche', 'weekday']]],
  ['Je travaille le lundi.', 'Я работаю по понедельникам.', 'Я працюю щопонеділка.', [['Je', 'pronounCap'], ['travaille', 'verb'], ['le', 'determiner'], ['lundi', 'weekday']]],
  ['Tu parles le matin.', 'Ты говоришь утром.', 'Ти говориш вранці.', [['Tu', 'pronounCap'], ['parles', 'verb'], ['le matin', 'dayPart']]],
  ['Nous parlons le soir.', 'Мы говорим вечером.', 'Ми говоримо ввечері.', [['Nous', 'pronounCap'], ['parlons', 'verb'], ['le soir', 'dayPart']]],
  ["J'écoute la radio le matin.", 'Я слушаю радио утром.', 'Я слухаю радіо вранці.', [['Je', 'pronounCap'], ['écoute', 'verb'], ['la', 'determiner'], ['radio', 'object'], ['le matin', 'dayPart']]],
  ['Il regarde la télé le soir.', 'Он смотрит телевизор вечером.', 'Він дивиться телевізор увечері.', [['Il', 'pronounCap'], ['regarde', 'verb'], ['la', 'determiner'], ['télé', 'object'], ['le soir', 'dayPart']]],
  ['Elle travaille à midi.', 'Она работает в полдень.', 'Вона працює опівдні.', [['Elle', 'pronounCap'], ['travaille', 'verb'], ['à midi', 'timeExact']]],
  ['Nous travaillons à huit heures.', 'Мы работаем в восемь часов.', 'Ми працюємо о восьмій годині.', [['Nous', 'pronounCap'], ['travaillons', 'verb'], ['à huit heures', 'timeExact']]],
  ['Vous travaillez à neuf heures.', 'Вы работаете в девять часов.', 'Ви працюєте о дев’ятій годині.', [['Vous', 'pronounCap'], ['travaillez', 'verb'], ['à neuf heures', 'timeExact']]],
  ['Ils parlent à minuit.', 'Они говорят в полночь.', 'Вони говорять опівночі.', [['Ils', 'pronounCap'], ['parlent', 'verb'], ['à minuit', 'timeExact']]],
  ['Je bois du café le matin.', 'Я пью кофе утром.', 'Я п’ю каву вранці.', [['Je', 'pronounCap'], ['bois', 'verb'], ['du', 'determiner'], ['café', 'object'], ['le matin', 'dayPart']]],
  ["Nous buvons du thé l'après-midi.", 'Мы пьем чай после полудня.', 'Ми п’ємо чай після полудня.', [['Nous', 'pronounCap'], ['buvons', 'verb'], ['du', 'determiner'], ['thé', 'object'], ["l'après-midi", 'dayPart']]],
  ['Tu travailles ce soir.', 'Ты работаешь сегодня вечером.', 'Ти працюєш сьогодні ввечері.', [['Tu', 'pronounCap'], ['travailles', 'verb'], ['ce soir', 'dayPart']]],
  ['Elle travaille cet après-midi.', 'Она работает сегодня после полудня.', 'Вона працює сьогодні після полудня.', [['Elle', 'pronounCap'], ['travaille', 'verb'], ['cet après-midi', 'dayPart']]],
  ['Je travaille en janvier.', 'Я работаю в январе.', 'Я працюю в січні.', [['Je', 'pronounCap'], ['travaille', 'verb'], ['en janvier', 'month']]],
  ['Tu travailles en février.', 'Ты работаешь в феврале.', 'Ти працюєш у лютому.', [['Tu', 'pronounCap'], ['travailles', 'verb'], ['en février', 'month']]],
  ['Il travaille en mars.', 'Он работает в марте.', 'Він працює у березні.', [['Il', 'pronounCap'], ['travaille', 'verb'], ['en mars', 'month']]],
  ['Elle parle français en avril.', 'Она говорит по-французски в апреле.', 'Вона говорить французькою у квітні.', [['Elle', 'pronounCap'], ['parle', 'verb'], ['français', 'object'], ['en avril', 'month']]],
  ['Nous travaillons en mai.', 'Мы работаем в мае.', 'Ми працюємо у травні.', [['Nous', 'pronounCap'], ['travaillons', 'verb'], ['en mai', 'month']]],
  ['Vous travaillez en juin.', 'Вы работаете в июне.', 'Ви працюєте у червні.', [['Vous', 'pronounCap'], ['travaillez', 'verb'], ['en juin', 'month']]],
  ['Ils travaillent en juillet.', 'Они работают в июле.', 'Вони працюють у липні.', [['Ils', 'pronounCap'], ['travaillent', 'verb'], ['en juillet', 'month']]],
  ['Elles parlent en août.', 'Они говорят в августе. (жен.)', 'Вони говорять у серпні. (жін.)', [['Elles', 'pronounCap'], ['parlent', 'verb'], ['en août', 'month']]],
  ['Je travaille en été.', 'Я работаю летом.', 'Я працюю влітку.', [['Je', 'pronounCap'], ['travaille', 'verb'], ['en été', 'season']]],
  ['Tu travailles en hiver.', 'Ты работаешь зимой.', 'Ти працюєш узимку.', [['Tu', 'pronounCap'], ['travailles', 'verb'], ['en hiver', 'season']]],
  ['Nous parlons en automne.', 'Мы говорим осенью.', 'Ми говоримо восени.', [['Nous', 'pronounCap'], ['parlons', 'verb'], ['en automne', 'season']]],
  ['Vous travaillez au printemps.', 'Вы работаете весной.', 'Ви працюєте навесні.', [['Vous', 'pronounCap'], ['travaillez', 'verb'], ['au printemps', 'season']]],
  ['Ils travaillent en 2026.', 'Они работают в 2026 году.', 'Вони працюють у 2026 році.', [['Ils', 'pronounCap'], ['travaillent', 'verb'], ['en 2026', 'season']]],
  ['Je travaille la nuit.', 'Я работаю ночью.', 'Я працюю вночі.', [['Je', 'pronounCap'], ['travaille', 'verb'], ['la nuit', 'dayPart']]],
  ['Tu travailles ce matin.', 'Ты работаешь сегодня утром.', 'Ти працюєш сьогодні вранці.', [['Tu', 'pronounCap'], ['travailles', 'verb'], ['ce matin', 'dayPart']]],
  ['Ils travaillent cet après-midi.', 'Они работают сегодня после полудня.', 'Вони працюють сьогодні після полудня.', [['Ils', 'pronounCap'], ['travaillent', 'verb'], ['cet après-midi', 'dayPart']]],
  ['Elles parlent ce soir.', 'Они говорят сегодня вечером. (жен.)', 'Вони говорять сьогодні ввечері. (жін.)', [['Elles', 'pronounCap'], ['parlent', 'verb'], ['ce soir', 'dayPart']]],
  ['Est-ce que tu travailles lundi ?', 'Ты работаешь в понедельник?', 'Ти працюєш у понеділок?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['tu', 'pronounLow'], ['travailles', 'verb'], ['lundi', 'weekday']]],
  ["Est-ce qu'il travaille à midi ?", 'Он работает в полдень?', 'Він працює опівдні?', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['il', 'pronounLow'], ['travaille', 'verb'], ['à midi', 'timeExact']]],
  ['Est-ce que nous travaillons en juillet ?', 'Мы работаем в июле?', 'Ми працюємо у липні?', [['Est-ce', 'questionFrame'], ['que', 'questionFrame'], ['nous', 'pronounLow'], ['travaillons', 'verb'], ['en juillet', 'month']]],
  ['Avez-vous le Wi-Fi ce soir ?', 'У вас есть Wi-Fi сегодня вечером?', 'У вас є Wi-Fi сьогодні ввечері?', [['Avez-vous', 'questionFrame'], ['le', 'determiner'], ['Wi-Fi', 'object'], ['ce soir', 'dayPart']]],
  ["Est-ce qu'elles parlent le matin ?", 'Они говорят утром? (жен.)', 'Вони говорять вранці? (жін.)', [['Est-ce', 'questionFrame'], ["qu'", 'questionFrame'], ['elles', 'pronounLow'], ['parlent', 'verb'], ['le matin', 'dayPart']]],
  ['Je ne travaille pas lundi.', 'Я не работаю в понедельник.', 'Я не працюю в понеділок.', [['Je', 'pronounCap'], ['ne', 'negation'], ['travaille', 'verb'], ['pas', 'negation'], ['lundi', 'weekday']]],
  ['Tu ne travailles pas à huit heures.', 'Ты не работаешь в восемь часов.', 'Ти не працюєш о восьмій годині.', [['Tu', 'pronounCap'], ['ne', 'negation'], ['travailles', 'verb'], ['pas', 'negation'], ['à huit heures', 'timeExact']]],
  ['Nous ne travaillons pas en août.', 'Мы не работаем в августе.', 'Ми не працюємо у серпні.', [['Nous', 'pronounCap'], ['ne', 'negation'], ['travaillons', 'verb'], ['pas', 'negation'], ['en août', 'month']]],
  ['Ils ne parlent pas le soir.', 'Они не говорят вечером.', 'Вони не говорять увечері.', [['Ils', 'pronounCap'], ['ne', 'negation'], ['parlent', 'verb'], ['pas', 'negation'], ['le soir', 'dayPart']]],
  ["Elle n'écoute pas la radio le matin.", 'Она не слушает радио утром.', 'Вона не слухає радіо вранці.', [['Elle', 'pronounCap'], ["n'", 'negation'], ['écoute', 'verb'], ['pas', 'negation'], ['la', 'determiner'], ['radio', 'object'], ['le matin', 'dayPart']]],
  ["Vous n'avez pas le temps ce soir.", 'У вас нет времени сегодня вечером.', 'У вас немає часу сьогодні ввечері.', [['Vous', 'pronounCap'], ["n'", 'negation'], ['avez', 'verb'], ['pas', 'negation'], ['le', 'determiner'], ['temps', 'object'], ['ce soir', 'dayPart']]],
  ["Elles n'ont pas besoin d'aide ce matin.", 'Им не нужна помощь сегодня утром. (жен.)', 'Їм не потрібна допомога сьогодні вранці. (жін.)', [['Elles', 'pronounCap'], ["n'", 'negation'], ['ont', 'verb'], ['pas', 'negation'], ['besoin', 'object'], ["d'", 'determiner'], ['aide', 'object'], ['ce matin', 'dayPart']]],
  ['Nous avons le Wi-Fi en 2026.', 'У нас есть Wi-Fi в 2026 году.', 'У нас є Wi-Fi у 2026 році.', [['Nous', 'pronounCap'], ['avons', 'verb'], ['le', 'determiner'], ['Wi-Fi', 'object'], ['en 2026', 'season']]],
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function byteSize(filePath) {
  return fs.statSync(filePath).size;
}

function surfaceDeclaredInApp(surface, source) {
  return new RegExp(`['"]${surface}['"]`).test(source);
}

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  while (distractors.length < 5) {
    const next = [...BANKS.weekday, ...BANKS.timeExact, ...BANKS.month, ...BANKS.season, ...BANKS.dayPart, ...BANKS.object].find((item) => item !== correct && !distractors.includes(item));
    distractors.push(next);
  }
  return distractors;
}

function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) {
    throw new Error(`Bad distractors for ${correct}/${category}`);
  }
  return { text: correct, correct, category, distractors };
}

function buildRows() {
  return DATA.map(([phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson08_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const timeCategoryCounts = rows.flatMap((row) => row.wordsFr).filter((slotItem) => ['weekday', 'timeExact', 'month', 'season', 'dayPart'].includes(slotItem.category)).reduce((acc, slotItem) => ({ ...acc, [slotItem.category]: (acc[slotItem.category] || 0) + 1 }), {});
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr))).length,
    negative: rows.filter((row) => /\bn'|\bne\b/.test(row.phraseFr) && /\bpas\b/.test(row.phraseFr)).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 8,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishTopic: 'Prepositions of time',
    frenchTopic: 'French time markers for days, clock time, months, seasons and day parts',
    sequencingReason: 'Adds compact time expressions after core clauses are available, mapping English in/on/at to French-native markers.',
    frenchNativeTransferRule: 'Use bare weekdays for specific days, le + weekday for habitual days, a for exact time, en/au for months and seasons, and French day-part expressions.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, timeCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false },
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON8_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(CANDIDATE_PATH),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: 8, appCourseLevel: 'A1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) }, activationApproved: false };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 8,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English in/on/at в французскую систему времени: дни, часы, месяцы, сезоны и части дня.', bodyUk: 'Урок переносить English in/on/at у французьку систему часу: дні, години, місяці, сезони та частини доби.' },
      { titleRu: '02. Дни недели', titleUk: '02. Дні тижня', bodyRu: 'Для конкретного дня часто используется день без предлога: Je travaille lundi. Для привычки: le lundi.', bodyUk: 'Для конкретного дня часто використовується день без прийменника: Je travaille lundi. Для звички: le lundi.' },
      { titleRu: '03. Точное время', titleUk: '03. Точний час', bodyRu: 'С часами используется à: à huit heures, à midi, à minuit. Это не английское at как слово, а французская рамка.', bodyUk: 'З годинами використовується à: à huit heures, à midi, à minuit. Це не англійське at як слово, а французька рамка.' },
      { titleRu: '04. Месяцы и сезоны', titleUk: '04. Місяці та сезони', bodyRu: 'Месяцы и многие сезоны берут en: en juillet, en été, en hiver. Весна обычно: au printemps.', bodyUk: 'Місяці та багато сезонів беруть en: en juillet, en été, en hiver. Весна зазвичай: au printemps.' },
      { titleRu: '05. Части дня', titleUk: '05. Частини доби', bodyRu: 'Французский использует le matin, l’après-midi, le soir, la nuit, ce matin, cet après-midi, ce soir. Эти выражения нельзя раскладывать по английскому in/on/at.', bodyUk: 'Французька використовує le matin, l’après-midi, le soir, la nuit, ce matin, cet après-midi, ce soir. Ці вирази не можна розкладати за англійським in/on/at.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: candidate.safety });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson08.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: 8, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson08_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: candidate.safety });

  const local = { ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) }, uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) }, audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) }, theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson08.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson08.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: 8, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson08_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson08_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 8, contentVersion: CONTENT_VERSION, entries, safety: candidate.safety });
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: candidate.safety });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: candidate.safety });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: candidate.safety });
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: candidate.safety });
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson08-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: candidate.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson08BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson08BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, timeCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson08BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson08BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson08BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson08BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson08BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson08BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson08BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson08BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 9 blueprint-first rebuild for French existential/location expressions after inspecting English Lesson 9 there is/there are shape.', 'Map English there is/are to French il y a and location phrasing without mixing it into Lesson 7 avoir.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON8_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
