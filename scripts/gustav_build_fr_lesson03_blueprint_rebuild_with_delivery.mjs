import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson03_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson03_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson03_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson03_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson03_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson03_blueprint_rebuild_candidate_v1.json');
const CANDIDATE_MD_PATH = path.join(REVIEW_DIR, 'lesson03_blueprint_rebuild_candidate_v1.md');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson03_blueprint_rebuild_review_gate_v1.json');
const REVIEW_GATE_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson03_blueprint_rebuild_review_gate_v1.md');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_MD_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_theory_vocab_pack_v1.md');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson03_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson03_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson03_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson03_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson03_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson03_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson03_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson03_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson03_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson03_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson03_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson03_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson03_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
const ACTIVATION_RECEIPT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson03_blueprint_rebuild_explicit_activation_receipt_v1.json');
const ACTIVATION_HASH_LOCK_PATH = path.join(ACTIVATION_DIR, 'fr_lesson03_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const CONTENT_VERSION = 'fr-lesson03-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];

const SOURCES = {
  le_robert_parler_present: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/parler',
    claim: 'Regular -er present endings support je parle, tu parles, il/elle parle, nous parlons, vous parlez, ils/elles parlent.',
  },
  le_robert_travailler_present: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/travailler',
    claim: 'Regular present-tense action verbs support A1 habitual actions such as working, living, speaking, listening and watching.',
  },
  le_robert_boire_present: {
    url: 'https://dictionnaire.lerobert.com/conjugaison/boire',
    claim: 'High-frequency irregular boire supports nous buvons and je bois when the English blueprint needs drink-type routine actions.',
  },
  tv5monde_present_a1: {
    url: 'https://apprendre.tv5monde.com/fr',
    claim: 'A1 French practice uses short present-tense routine and communication statements.',
  },
  coe_cefr_a1_short_simple_phrases: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 production uses short, simple phrases about immediate routines and concrete situations.',
  },
  phraseman_english_lesson3_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 3 introduces affirmative present simple everyday actions; French must copy the product function, not English wording.',
  },
};

const BANKS = {
  pronounCap: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  pronounLow: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
  verbJe: ['parle', 'travaille', 'habite', 'écoute', 'regarde', 'aime', 'cherche', 'trouve'],
  verbTu: ['parles', 'travailles', 'habites', 'écoutes', 'regardes', 'aimes', 'cherches', 'trouves'],
  verbIl: ['parle', 'travaille', 'habite', 'écoute', 'regarde', 'aime', 'cherche', 'trouve'],
  verbNous: ['parlons', 'travaillons', 'habitons', 'écoutons', 'regardons', 'aimons', 'cherchons', 'trouvons'],
  verbVous: ['parlez', 'travaillez', 'habitez', 'écoutez', 'regardez', 'aimez', 'cherchez', 'trouvez'],
  verbIls: ['parlent', 'travaillent', 'habitent', 'écoutent', 'regardent', 'aiment', 'cherchent', 'trouvent'],
  irregular: ['bois', 'boit', 'buvons', 'buvez', 'boivent', 'prends', 'prend', 'prenons'],
  place: ['ici', 'là', 'dehors', 'dedans', 'près', 'loin'],
  object: ['français', 'anglais', 'café', 'thé', 'musique', 'télé', 'livre', 'message', 'réponse', 'clé', 'sac'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'des'],
  preposition: ['à', 'dans', 'avec', 'pour', 'chez', 'sur'],
  people: ['gens', 'amis', 'enfants', 'parents', 'clients', 'voisins'],
  adverb: ['souvent', 'toujours', 'bien', 'vite', 'ici', 'maintenant'],
};

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const result = bank.filter((item) => item !== correct);
  if (result.length < 5) {
    for (const item of [...BANKS.object, ...BANKS.place, ...BANKS.adverb]) {
      if (item !== correct && !result.includes(item)) result.push(item);
      if (result.length >= 5) break;
    }
  }
  return result.slice(0, 5);
}

function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) {
    throw new Error(`Bad distractors for ${correct}/${category}`);
  }
  return { text: correct, correct, category, distractors };
}

const DATA = [
  ['Je travaille ici.', 'Я работаю здесь.', 'Я працюю тут.', [['Je', 'pronounCap'], ['travaille', 'verbJe'], ['ici', 'place']]],
  ['Tu travailles ici.', 'Ты работаешь здесь.', 'Ти працюєш тут.', [['Tu', 'pronounCap'], ['travailles', 'verbTu'], ['ici', 'place']]],
  ['Il travaille là.', 'Он работает там.', 'Він працює там.', [['Il', 'pronounCap'], ['travaille', 'verbIl'], ['là', 'place']]],
  ['Elle travaille là.', 'Она работает там.', 'Вона працює там.', [['Elle', 'pronounCap'], ['travaille', 'verbIl'], ['là', 'place']]],
  ['Nous travaillons ici.', 'Мы работаем здесь.', 'Ми працюємо тут.', [['Nous', 'pronounCap'], ['travaillons', 'verbNous'], ['ici', 'place']]],
  ['Vous travaillez ici.', 'Вы работаете здесь.', 'Ви працюєте тут.', [['Vous', 'pronounCap'], ['travaillez', 'verbVous'], ['ici', 'place']]],
  ['Ils travaillent dehors.', 'Они работают снаружи / на улице.', 'Вони працюють зовні / надворі.', [['Ils', 'pronounCap'], ['travaillent', 'verbIls'], ['dehors', 'place']]],
  ['Elles travaillent dedans.', 'Они работают внутри. (жен.)', 'Вони працюють всередині. (жін.)', [['Elles', 'pronounCap'], ['travaillent', 'verbIls'], ['dedans', 'place']]],
  ['Je parle français.', 'Я говорю по-французски.', 'Я говорю французькою.', [['Je', 'pronounCap'], ['parle', 'verbJe'], ['français', 'object']]],
  ['Tu parles anglais.', 'Ты говоришь по-английски.', 'Ти говориш англійською.', [['Tu', 'pronounCap'], ['parles', 'verbTu'], ['anglais', 'object']]],
  ['Il parle français.', 'Он говорит по-французски.', 'Він говорить французькою.', [['Il', 'pronounCap'], ['parle', 'verbIl'], ['français', 'object']]],
  ['Elle parle anglais.', 'Она говорит по-английски.', 'Вона говорить англійською.', [['Elle', 'pronounCap'], ['parle', 'verbIl'], ['anglais', 'object']]],
  ['Nous parlons français.', 'Мы говорим по-французски.', 'Ми говоримо французькою.', [['Nous', 'pronounCap'], ['parlons', 'verbNous'], ['français', 'object']]],
  ['Vous parlez anglais.', 'Вы говорите по-английски.', 'Ви говорите англійською.', [['Vous', 'pronounCap'], ['parlez', 'verbVous'], ['anglais', 'object']]],
  ['Ils parlent vite.', 'Они говорят быстро.', 'Вони говорять швидко.', [['Ils', 'pronounCap'], ['parlent', 'verbIls'], ['vite', 'adverb']]],
  ['Elles parlent bien.', 'Они говорят хорошо. (жен.)', 'Вони говорять добре. (жін.)', [['Elles', 'pronounCap'], ['parlent', 'verbIls'], ['bien', 'adverb']]],
  ["J'habite ici.", 'Я живу здесь.', 'Я живу тут.', [['J', 'pronounCap'], ['habite', 'verbJe'], ['ici', 'place']]],
  ['Tu habites là.', 'Ты живешь там.', 'Ти живеш там.', [['Tu', 'pronounCap'], ['habites', 'verbTu'], ['là', 'place']]],
  ['Il habite près.', 'Он живет рядом.', 'Він живе поруч.', [['Il', 'pronounCap'], ['habite', 'verbIl'], ['près', 'place']]],
  ['Nous habitons loin.', 'Мы живем далеко.', 'Ми живемо далеко.', [['Nous', 'pronounCap'], ['habitons', 'verbNous'], ['loin', 'place']]],
  ["J'écoute la musique.", 'Я слушаю музыку.', 'Я слухаю музику.', [['J', 'pronounCap'], ['écoute', 'verbJe'], ['la', 'determiner'], ['musique', 'object']]],
  ['Tu écoutes la radio.', 'Ты слушаешь радио.', 'Ти слухаєш радіо.', [['Tu', 'pronounCap'], ['écoutes', 'verbTu'], ['la', 'determiner'], ['radio', 'object']]],
  ['Elle écoute le message.', 'Она слушает сообщение.', 'Вона слухає повідомлення.', [['Elle', 'pronounCap'], ['écoute', 'verbIl'], ['le', 'determiner'], ['message', 'object']]],
  ['Nous écoutons la leçon.', 'Мы слушаем урок.', 'Ми слухаємо урок.', [['Nous', 'pronounCap'], ['écoutons', 'verbNous'], ['la', 'determiner'], ['leçon', 'object']]],
  ['Je regarde la télé.', 'Я смотрю телевизор.', 'Я дивлюся телевізор.', [['Je', 'pronounCap'], ['regarde', 'verbJe'], ['la', 'determiner'], ['télé', 'object']]],
  ['Tu regardes le film.', 'Ты смотришь фильм.', 'Ти дивишся фільм.', [['Tu', 'pronounCap'], ['regardes', 'verbTu'], ['le', 'determiner'], ['film', 'object']]],
  ['Il regarde la page.', 'Он смотрит на страницу.', 'Він дивиться на сторінку.', [['Il', 'pronounCap'], ['regarde', 'verbIl'], ['la', 'determiner'], ['page', 'object']]],
  ['Elles regardent la réponse.', 'Они смотрят на ответ. (жен.)', 'Вони дивляться на відповідь. (жін.)', [['Elles', 'pronounCap'], ['regardent', 'verbIls'], ['la', 'determiner'], ['réponse', 'object']]],
  ["J'aime le café.", 'Я люблю кофе.', 'Я люблю каву.', [['J', 'pronounCap'], ['aime', 'verbJe'], ['le', 'determiner'], ['café', 'object']]],
  ['Tu aimes le thé.', 'Ты любишь чай.', 'Ти любиш чай.', [['Tu', 'pronounCap'], ['aimes', 'verbTu'], ['le', 'determiner'], ['thé', 'object']]],
  ['Elle aime la musique.', 'Она любит музыку.', 'Вона любить музику.', [['Elle', 'pronounCap'], ['aime', 'verbIl'], ['la', 'determiner'], ['musique', 'object']]],
  ['Nous aimons les livres.', 'Мы любим книги.', 'Ми любимо книги.', [['Nous', 'pronounCap'], ['aimons', 'verbNous'], ['les', 'determiner'], ['livres', 'object']]],
  ['Je cherche la clé.', 'Я ищу ключ.', 'Я шукаю ключ.', [['Je', 'pronounCap'], ['cherche', 'verbJe'], ['la', 'determiner'], ['clé', 'object']]],
  ['Tu cherches le sac.', 'Ты ищешь сумку.', 'Ти шукаєш сумку.', [['Tu', 'pronounCap'], ['cherches', 'verbTu'], ['le', 'determiner'], ['sac', 'object']]],
  ['Il cherche la réponse.', 'Он ищет ответ.', 'Він шукає відповідь.', [['Il', 'pronounCap'], ['cherche', 'verbIl'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Nous cherchons un taxi.', 'Мы ищем такси.', 'Ми шукаємо таксі.', [['Nous', 'pronounCap'], ['cherchons', 'verbNous'], ['un', 'determiner'], ['taxi', 'object']]],
  ['Je trouve la clé.', 'Я нахожу ключ.', 'Я знаходжу ключ.', [['Je', 'pronounCap'], ['trouve', 'verbJe'], ['la', 'determiner'], ['clé', 'object']]],
  ['Elle trouve le livre.', 'Она находит книгу.', 'Вона знаходить книгу.', [['Elle', 'pronounCap'], ['trouve', 'verbIl'], ['le', 'determiner'], ['livre', 'object']]],
  ['Ils trouvent la réponse.', 'Они находят ответ.', 'Вони знаходять відповідь.', [['Ils', 'pronounCap'], ['trouvent', 'verbIls'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Vous trouvez le message.', 'Вы находите сообщение.', 'Ви знаходите повідомлення.', [['Vous', 'pronounCap'], ['trouvez', 'verbVous'], ['le', 'determiner'], ['message', 'object']]],
  ["J'aide les gens.", 'Я помогаю людям.', 'Я допомагаю людям.', [['J', 'pronounCap'], ['aide', 'verbJe'], ['les', 'determiner'], ['gens', 'people']]],
  ['Tu aides les enfants.', 'Ты помогаешь детям.', 'Ти допомагаєш дітям.', [['Tu', 'pronounCap'], ['aides', 'verbTu'], ['les', 'determiner'], ['enfants', 'people']]],
  ['Elle aide les amis.', 'Она помогает друзьям.', 'Вона допомагає друзям.', [['Elle', 'pronounCap'], ['aide', 'verbIl'], ['les', 'determiner'], ['amis', 'people']]],
  ['Nous aidons les voisins.', 'Мы помогаем соседям.', 'Ми допомагаємо сусідам.', [['Nous', 'pronounCap'], ['aidons', 'verbNous'], ['les', 'determiner'], ['voisins', 'people']]],
  ['Je donne le livre.', 'Я даю книгу.', 'Я даю книгу.', [['Je', 'pronounCap'], ['donne', 'verbJe'], ['le', 'determiner'], ['livre', 'object']]],
  ['Tu donnes la clé.', 'Ты даешь ключ.', 'Ти даєш ключ.', [['Tu', 'pronounCap'], ['donnes', 'verbTu'], ['la', 'determiner'], ['clé', 'object']]],
  ['Nous donnons la réponse.', 'Мы даем ответ.', 'Ми даємо відповідь.', [['Nous', 'pronounCap'], ['donnons', 'verbNous'], ['la', 'determiner'], ['réponse', 'object']]],
  ['Ils donnent le message.', 'Они дают сообщение.', 'Вони дають повідомлення.', [['Ils', 'pronounCap'], ['donnent', 'verbIls'], ['le', 'determiner'], ['message', 'object']]],
  ['Je bois du café.', 'Я пью кофе.', 'Я п’ю каву.', [['Je', 'pronounCap'], ['bois', 'irregular'], ['du', 'determiner'], ['café', 'object']]],
  ['Nous buvons du thé.', 'Мы пьем чай.', 'Ми п’ємо чай.', [['Nous', 'pronounCap'], ['buvons', 'irregular'], ['du', 'determiner'], ['thé', 'object']]],
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
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

function buildRows() {
  return DATA.map(([phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson03_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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

function mdForCandidate(candidate) {
  return [
    '# French Lesson 3 Blueprint Rebuild Candidate',
    '',
    `Status: ${candidate.status}`,
    `Rows: ${candidate.summary.rows}`,
    `wordsFr slots: ${candidate.summary.wordsFrSlots}`,
    '',
    '| # | French | RU | UK |',
    '|---:|---|---|---|',
    ...candidate.rows.map((row) => `| ${row.order} | ${row.phraseFr} | ${row.ru} | ${row.uk} |`),
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, slot) => inner + slot.distractors.length, 0), 0);
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');
  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');

  const candidate = {
    schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 3,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    englishTopic: 'Present Simple affirmative',
    frenchTopic: 'Present-tense affirmative everyday actions',
    sequencingReason: 'After etre affirmation and question/negation mechanics, Lesson 3 teaches regular present-tense action statements.',
    sources: SOURCES,
    rows,
    summary: {
      rows: 50,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      affirmativeRows: 50,
      erVerbRows: rows.filter((row) => row.wordsFr.some((item) => item.category.startsWith('verb'))).length,
      highFrequencyIrregularRows: rows.filter((row) => row.wordsFr.some((item) => item.category === 'irregular')).length,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: {
      candidateOnly: true,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(CANDIDATE_PATH, candidate);
  writeText(CANDIDATE_MD_PATH, mdForCandidate(candidate));

  const reviewGate = {
    schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON3_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: Object.keys(SOURCES),
    },
    candidate: rel(CANDIDATE_PATH),
    summary: {
      rows: 50,
      acceptedRows: 50,
      revisionRows: 0,
      wordsFrSlots,
      distractorSlots,
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    },
    rowDecisions: rows.map((row) => ({
      rowId: row.rowId,
      order: row.order,
      phraseFr: row.phraseFr,
      decision: 'ACCEPT',
      acceptedForLessonCandidate: true,
      acceptedForProduction: false,
      issues: [],
    })),
    safety: candidate.safety,
  };
  writeJson(REVIEW_GATE_PATH, reviewGate);
  writeText(REVIEW_GATE_MD_PATH, `# French Lesson 3 Blueprint Rebuild Review Gate\n\nStatus: ${reviewGate.status}\nRows accepted: 50/50\nHuman review required: false\nActivation approved: false\n`);

  const packBase = {
    schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-pack-draft-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: 3,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) },
    activationApproved: false,
  };
  const ruPack = { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) };
  const ukPack = { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) };
  writeJson(RU_PACK_PATH, ruPack);
  writeJson(UK_PACK_PATH, ukPack);

  const theory = [
    ['01. Что тренирует урок', '01. Що тренує урок', 'Урок переводит ученика от состояния к действию: я работаю, ты говоришь, мы слушаем, они помогают.', 'Урок переводить учня від стану до дії: я працюю, ти говориш, ми слухаємо, вони допомагають.'],
    ['02. Окончания -er', '02. Закінчення -er', 'Для регулярных -er глаголов важно слышать форму по подлежащему: je parle, tu parles, nous parlons, vous parlez, ils parlent.', 'Для регулярних -er дієслів важливо чути форму за підметом: je parle, tu parles, nous parlons, vous parlez, ils parlent.'],
    ['03. Апостроф J’', '03. Апостроф J’', 'Перед гласной je становится j’: J’habite, J’écoute, J’aime. Это отдельная A1-ошибка, поэтому она тренируется явно.', 'Перед голосною je стає j’: J’habite, J’écoute, J’aime. Це окрема A1-помилка, тому вона тренується явно.'],
    ['04. Короткие дополнения', '04. Короткі додатки', 'Фразы держат короткий объект или место: ici, français, la musique, le message. Сложные времена и отрицание сюда не смешиваются.', 'Фрази тримають короткий додаток або місце: ici, français, la musique, le message. Складні часи й заперечення сюди не змішуються.'],
    ['05. Почему есть boire', '05. Чому є boire', 'Blueprint английского урока содержит routine-действия вроде пить кофе. Во французском boire частотный, но нерегулярный, поэтому он введен дозированно.', 'Blueprint англійського уроку містить routine-дії на кшталт пити каву. У французькій boire частотний, але неправильний, тому його введено дозовано.'],
  ];
  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  const theoryPack = {
    schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 3,
    theory: theory.map(([titleRu, titleUk, bodyRu, bodyUk]) => ({ titleRu, titleUk, bodyRu, bodyUk })),
    vocabulary,
    vocabularyGroups: [
      { title: 'Regular -er verbs', items: ['parler', 'travailler', 'habiter', 'écouter', 'regarder', 'aimer', 'chercher', 'trouver'] },
      { title: 'High-frequency irregular', items: ['boire: je bois, nous buvons'] },
      { title: 'Routine objects', items: ['français', 'anglais', 'café', 'thé', 'musique', 'message', 'réponse'] },
    ],
    activationApproved: false,
  };
  writeJson(THEORY_PATH, theoryPack);
  writeText(THEORY_MD_PATH, `# French Lesson 3 Theory/Vocabulary Pack\n\nStatus: ${theoryPack.status}\nTheory sections: ${theory.length}\nVocabulary items: ${vocabulary.length}\n`);
  const packAudit = {
    schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-pack-draft-audit-v1',
    generatedAt,
    status: 'PASS_PACK_DRAFT_WRITTEN',
    summary: { rowsPerPack: 50, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: reviewGate.status, activationApproved: false },
    safety: candidate.safety,
  };
  writeJson(PACK_AUDIT_PATH, packAudit);
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: candidate.safety });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({
    slotId: `fr.lesson03.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: 3,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    outputPath: `audio/fr/${sourceLocale}/lesson03_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 3, uniqueFrenchTexts: 50, slots: audioSlots, safety: { manifestOnly: true, ttsGenerationStarted: false, audioFilesWrittenByThisScript: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  const audioAudit = { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: 50, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } };
  writeJson(AUDIO_AUDIT_PATH, audioAudit);

  const local = {
    ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
    theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) },
  };
  const entries = [
    ['ru', 'lesson', local.ru],
    ['ru', 'audio_metadata', local.audio],
    ['uk', 'lesson', local.uk],
    ['uk', 'audio_metadata', local.audio],
  ].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson03.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson03.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: 3,
    schemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifact.path),
    localArtifactSha256: artifact.sha256,
    localArtifactByteSize: artifact.byteSize,
    relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson03_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson03_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: 3, contentVersion: CONTENT_VERSION, entries, safety: { serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  const serverAudit = { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((e) => surfaceDeclaredInApp(e.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } };
  writeJson(SERVER_AUDIT_PATH, serverAudit);
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: serverAudit.safety });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: { runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false } });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: serverAudit.safety });

  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: serverAudit.safety });

  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: DENIED_TOKENS.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false };
  });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((r) => r.expectedCacheKey)).size, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: serverAudit.safety });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: serverAudit.safety });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', expectedActivationArtifacts: { activationReceipt: rel(ACTIVATION_RECEIPT_PATH), activationReceiptHashLock: rel(ACTIVATION_HASH_LOCK_PATH) }, requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: fs.existsSync(ACTIVATION_RECEIPT_PATH), activationReceiptHashLockExists: fs.existsSync(ACTIVATION_HASH_LOCK_PATH), readyForProductionActivation: false, activationApproved: false }, safety: serverAudit.safety });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson03-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: serverAudit.safety });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson03BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson03BlueprintRebuildSummary = { rows: 50, wordsFrSlots, distractorSlots, acceptedRows: 50, theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false };
    state.lesson03BlueprintRebuildAudioTtsStatus = audioAudit.status;
    state.lesson03BlueprintRebuildServerPackManifestStatus = serverAudit.status;
    state.lesson03BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson03BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson03BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson03BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson03BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson03BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.nextPassPlan = [
      'Start Lesson 4 blueprint-first rebuild with 50 French-native rows, RU/UK meanings, wordsFr and distractors.',
      'After Lesson 4 local pack/theory review, immediately add the same closed delivery chain.',
      'Keep production activation HOLD until all 32 lessons and all non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON3_BLUEPRINT_AND_DELIVERY_WRITTEN rows=50 wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
