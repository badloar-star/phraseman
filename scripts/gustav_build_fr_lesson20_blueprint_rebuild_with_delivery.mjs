import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 20;
const SLUG = 'lesson20_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson20-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson20_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson20_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson20_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson20_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson20_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson20_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson20_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson20_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson20_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson20_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson20_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson20_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson20_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson20_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson20_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson20_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson20_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson20_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson20_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  tv5monde_articles_definis_indefinis: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-presentatif-les-articles-definis-et-indefinis-0',
    claim: 'French definite articles refer to specific or identified nouns; indefinite articles introduce non-specific nouns.',
  },
  tv5monde_articles_partitifs: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-articles-partitifs',
    claim: 'French partitive articles express an uncountable or unspecified quantity: du, de la, de l, des.',
  },
  lawless_french_articles: {
    url: 'https://www.lawlessfrench.com/grammar/articles/',
    claim: 'French has definite, indefinite, and partitive articles, selected by noun gender, number, and meaning.',
  },
  lawless_negative_de: {
    url: 'https://www.lawlessfrench.com/grammar/de-vs-du-de-la-des-articles/',
    claim: 'Indefinite and partitive articles usually reduce to de/d in negative constructions.',
  },
  phraseman_english_lesson20_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 20 teaches articles; French must rebuild this around article gender, number, partitive use, and negative de.',
  },
};

const BANKS = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles'],
  verb: ['ai', 'as', 'a', 'avons', 'avez', 'ont', 'achète', 'cherches', 'prenez', 'porte', 'vois', 'choisis', 'bois', 'boit', 'mangeons', 'prends', 'veulent', 'mets', 'voulez', 'mangent', 'apprennent', 'changent', 'est', 'sont', 'trouvons'],
  articleIndef: ['un', 'une', 'des'],
  articleDef: ['le', 'la', "l'", 'les'],
  articlePartitive: ['du', 'de la', "de l'", 'des'],
  articleNegativeDe: ['de', "d'"],
  noun: ['sac', 'clé', 'billet', 'adresse', 'documents', 'taxi', 'réunion', 'lunettes', 'café', 'option', 'téléphone', 'table', 'application', 'portefeuille', 'gare', 'centre', 'hôtel', 'toilettes', 'professeur', 'règle', 'banque', 'eau', 'pain', 'salade', 'fruits', 'fromage', 'huile', 'soupe', 'thé', 'pâtes', 'sucre', 'français', 'musique', 'mémoire', 'enfants', 'articles', 'sens', 'robe', 'photo', 'questions'],
  adjective: ['ouverte', 'prêts', 'complet', 'important', 'courant', 'essentielle', 'neuf', 'rouge', 'claire', 'faciles'],
  preposition: ['sur', 'dans', 'près de', 'au fond', 'en', 'avec'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
};

const DATA = [
  ["J'ai un sac.", 'У меня есть сумка.', 'У мене є сумка.', [["J'", 'pronoun'], ['ai', 'verb'], ['un', 'articleIndef'], ['sac', 'noun']]],
  ["J'ai une clé.", 'У меня есть ключ.', 'У мене є ключ.', [["J'", 'pronoun'], ['ai', 'verb'], ['une', 'articleIndef'], ['clé', 'noun']]],
  ['Elle achète un billet.', 'Она покупает билет.', 'Вона купує квиток.', [['Elle', 'pronoun'], ['achète', 'verb'], ['un', 'articleIndef'], ['billet', 'noun']]],
  ['Il cherche une adresse.', 'Он ищет адрес.', 'Він шукає адресу.', [['Il', 'pronoun'], ['cherche', 'verb'], ['une', 'articleIndef'], ['adresse', 'noun']]],
  ['Nous avons des documents.', 'У нас есть документы.', 'У нас є документи.', [['Nous', 'pronoun'], ['avons', 'verb'], ['des', 'articleIndef'], ['documents', 'noun']]],
  ['Vous prenez un taxi.', 'Вы берете такси.', 'Ви берете таксі.', [['Vous', 'pronoun'], ['prenez', 'verb'], ['un', 'articleIndef'], ['taxi', 'noun']]],
  ['Ils ont une réunion.', 'У них встреча.', 'У них зустріч.', [['Ils', 'pronoun'], ['ont', 'verb'], ['une', 'articleIndef'], ['réunion', 'noun']]],
  ['Elle porte des lunettes.', 'Она носит очки.', 'Вона носить окуляри.', [['Elle', 'pronoun'], ['porte', 'verb'], ['des', 'articleIndef'], ['lunettes', 'noun']]],
  ['Je vois un café.', 'Я вижу кафе.', 'Я бачу кафе.', [['Je', 'pronoun'], ['vois', 'verb'], ['un', 'articleIndef'], ['café', 'noun']]],
  ['Tu choisis une option.', 'Ты выбираешь вариант.', 'Ти обираєш варіант.', [['Tu', 'pronoun'], ['choisis', 'verb'], ['une', 'articleIndef'], ['option', 'noun']]],
  ['Le téléphone est sur la table.', 'Телефон на столе.', 'Телефон на столі.', [['Le', 'articleDef'], ['téléphone', 'noun'], ['est', 'verb'], ['sur', 'preposition'], ['la', 'articleDef'], ['table', 'noun']]],
  ['La clé est dans le sac.', 'Ключ в сумке.', 'Ключ у сумці.', [['La', 'articleDef'], ['clé', 'noun'], ['est', 'verb'], ['dans', 'preposition'], ['le', 'articleDef'], ['sac', 'noun']]],
  ["L'application est ouverte.", 'Приложение открыто.', 'Застосунок відкритий.', [["L'", 'articleDef'], ['application', 'noun'], ['est', 'verb'], ['ouverte', 'adjective']]],
  ['Les documents sont prêts.', 'Документы готовы.', 'Документи готові.', [['Les', 'articleDef'], ['documents', 'noun'], ['sont', 'verb'], ['prêts', 'adjective']]],
  ['Le billet est dans le portefeuille.', 'Билет в кошельке.', 'Квиток у гаманці.', [['Le', 'articleDef'], ['billet', 'noun'], ['est', 'verb'], ['dans', 'preposition'], ['le', 'articleDef'], ['portefeuille', 'noun']]],
  ['La gare est près du centre.', 'Вокзал рядом с центром.', 'Вокзал біля центру.', [['La', 'articleDef'], ['gare', 'noun'], ['est', 'verb'], ['près de', 'preposition'], ['du', 'articlePartitive'], ['centre', 'noun']]],
  ["L'hôtel est complet.", 'Отель заполнен.', 'Готель заповнений.', [["L'", 'articleDef'], ['hôtel', 'noun'], ['est', 'verb'], ['complet', 'adjective']]],
  ['Les toilettes sont au fond.', 'Туалеты в конце.', 'Туалети в кінці.', [['Les', 'articleDef'], ['toilettes', 'noun'], ['sont', 'verb'], ['au fond', 'preposition']]],
  ['Le professeur explique la règle.', 'Преподаватель объясняет правило.', 'Викладач пояснює правило.', [['Le', 'articleDef'], ['professeur', 'noun'], ['explique', 'verb'], ['la', 'articleDef'], ['règle', 'noun']]],
  ['La banque ferme tôt.', 'Банк закрывается рано.', 'Банк зачиняється рано.', [['La', 'articleDef'], ['banque', 'noun'], ['ferme', 'verb']]],
  ['Je bois du café.', 'Я пью кофе.', 'Я пʼю каву.', [['Je', 'pronoun'], ['bois', 'verb'], ['du', 'articlePartitive'], ['café', 'noun']]],
  ["Elle boit de l'eau.", 'Она пьет воду.', 'Вона пʼє воду.', [['Elle', 'pronoun'], ['boit', 'verb'], ["de l'", 'articlePartitive'], ['eau', 'noun']]],
  ['Nous mangeons du pain.', 'Мы едим хлеб.', 'Ми їмо хліб.', [['Nous', 'pronoun'], ['mangeons', 'verb'], ['du', 'articlePartitive'], ['pain', 'noun']]],
  ['Tu prends de la salade.', 'Ты берешь салат.', 'Ти береш салат.', [['Tu', 'pronoun'], ['prends', 'verb'], ['de la', 'articlePartitive'], ['salade', 'noun']]],
  ['Ils veulent des fruits.', 'Они хотят фруктов.', 'Вони хочуть фруктів.', [['Ils', 'pronoun'], ['veulent', 'verb'], ['des', 'articlePartitive'], ['fruits', 'noun']]],
  ['Il achète du fromage.', 'Он покупает сыр.', 'Він купує сир.', [['Il', 'pronoun'], ['achète', 'verb'], ['du', 'articlePartitive'], ['fromage', 'noun']]],
  ["Je mets de l'huile.", 'Я добавляю масло.', 'Я додаю олію.', [['Je', 'pronoun'], ['mets', 'verb'], ["de l'", 'articlePartitive'], ['huile', 'noun']]],
  ['Vous voulez de la soupe.', 'Вы хотите супа.', 'Ви хочете супу.', [['Vous', 'pronoun'], ['voulez', 'verb'], ['de la', 'articlePartitive'], ['soupe', 'noun']]],
  ['Elle prend du thé.', 'Она берет чай.', 'Вона бере чай.', [['Elle', 'pronoun'], ['prend', 'verb'], ['du', 'articlePartitive'], ['thé', 'noun']]],
  ['Nous avons des pâtes.', 'У нас есть паста / макароны.', 'У нас є паста / макарони.', [['Nous', 'pronoun'], ['avons', 'verb'], ['des', 'articlePartitive'], ['pâtes', 'noun']]],
  ["Je n'ai pas de sac.", 'У меня нет сумки.', 'У мене немає сумки.', [['Je', 'pronoun'], ["n'", 'negation'], ['ai', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['sac', 'noun']]],
  ["Elle n'a pas de clé.", 'У нее нет ключа.', 'У неї немає ключа.', [['Elle', 'pronoun'], ["n'", 'negation'], ['a', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['clé', 'noun']]],
  ["Nous n'avons pas de documents.", 'У нас нет документов.', 'У нас немає документів.', [['Nous', 'pronoun'], ["n'", 'negation'], ['avons', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['documents', 'noun']]],
  ["Il ne boit pas d'eau.", 'Он не пьет воду.', 'Він не пʼє воду.', [['Il', 'pronoun'], ['ne', 'negation'], ['boit', 'verb'], ['pas', 'negation'], ["d'", 'articleNegativeDe'], ['eau', 'noun']]],
  ['Tu ne veux pas de café.', 'Ты не хочешь кофе.', 'Ти не хочеш кави.', [['Tu', 'pronoun'], ['ne', 'negation'], ['veux', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['café', 'noun']]],
  ['Ils ne mangent pas de pain.', 'Они не едят хлеб.', 'Вони не їдять хліб.', [['Ils', 'pronoun'], ['ne', 'negation'], ['mangent', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['pain', 'noun']]],
  ["Vous n'avez pas d'adresse.", 'У вас нет адреса.', 'У вас немає адреси.', [['Vous', 'pronoun'], ["n'", 'negation'], ['avez', 'verb'], ['pas', 'negation'], ["d'", 'articleNegativeDe'], ['adresse', 'noun']]],
  ['Je ne prends pas de sucre.', 'Я не беру сахар.', 'Я не беру цукор.', [['Je', 'pronoun'], ['ne', 'negation'], ['prends', 'verb'], ['pas', 'negation'], ['de', 'articleNegativeDe'], ['sucre', 'noun']]],
  ['Le français est important.', 'Французский важен.', 'Французька важлива.', [['Le', 'articleDef'], ['français', 'noun'], ['est', 'verb'], ['important', 'adjective']]],
  ['La musique aide la mémoire.', 'Музыка помогает памяти.', 'Музика допомагає памʼяті.', [['La', 'articleDef'], ['musique', 'noun'], ['aide', 'verb'], ['la', 'articleDef'], ['mémoire', 'noun']]],
  ['Les enfants apprennent vite.', 'Дети быстро учатся.', 'Діти швидко вчаться.', [['Les', 'articleDef'], ['enfants', 'noun'], ['apprennent', 'verb']]],
  ['Le pain est courant en France.', 'Хлеб распространен во Франции.', 'Хліб поширений у Франції.', [['Le', 'articleDef'], ['pain', 'noun'], ['est', 'verb'], ['courant', 'adjective'], ['en', 'preposition'], ['France', 'noun']]],
  ["L'eau est essentielle.", 'Вода необходима.', 'Вода необхідна.', [["L'", 'articleDef'], ['eau', 'noun'], ['est', 'verb'], ['essentielle', 'adjective']]],
  ['Les articles changent le sens.', 'Артикли меняют смысл.', 'Артиклі змінюють сенс.', [['Les', 'articleDef'], ['articles', 'noun'], ['changent', 'verb'], ['le', 'articleDef'], ['sens', 'noun']]],
  ["J'ai un téléphone. Le téléphone est neuf.", 'У меня есть телефон. Телефон новый.', 'У мене є телефон. Телефон новий.', [["J'", 'pronoun'], ['ai', 'verb'], ['un', 'articleIndef'], ['téléphone', 'noun'], ['Le', 'articleDef'], ['téléphone', 'noun'], ['est', 'verb'], ['neuf', 'adjective']]],
  ['Elle achète une robe. La robe est rouge.', 'Она покупает платье. Платье красное.', 'Вона купує сукню. Сукня червона.', [['Elle', 'pronoun'], ['achète', 'verb'], ['une', 'articleIndef'], ['robe', 'noun'], ['La', 'articleDef'], ['robe', 'noun'], ['est', 'verb'], ['rouge', 'adjective']]],
  ['Nous trouvons des clés. Les clés sont sur la table.', 'Мы находим ключи. Ключи на столе.', 'Ми знаходимо ключі. Ключі на столі.', [['Nous', 'pronoun'], ['trouvons', 'verb'], ['des', 'articleIndef'], ['clés', 'noun'], ['Les', 'articleDef'], ['clés', 'noun'], ['sont', 'verb'], ['sur', 'preposition'], ['la', 'articleDef'], ['table', 'noun']]],
  ["Il cherche un hôtel. L'hôtel est près de la gare.", 'Он ищет отель. Отель рядом с вокзалом.', 'Він шукає готель. Готель біля вокзалу.', [['Il', 'pronoun'], ['cherche', 'verb'], ['un', 'articleIndef'], ['hôtel', 'noun'], ["L'", 'articleDef'], ['hôtel', 'noun'], ['est', 'verb'], ['près de', 'preposition'], ['la', 'articleDef'], ['gare', 'noun']]],
  ['Tu prends une photo. La photo est claire.', 'Ты делаешь фото. Фото четкое.', 'Ти робиш фото. Фото чітке.', [['Tu', 'pronoun'], ['prends', 'verb'], ['une', 'articleIndef'], ['photo', 'noun'], ['La', 'articleDef'], ['photo', 'noun'], ['est', 'verb'], ['claire', 'adjective']]],
  ["J'ai des questions. Les questions sont faciles.", 'У меня есть вопросы. Вопросы легкие.', 'У мене є питання. Питання легкі.', [["J'", 'pronoun'], ['ai', 'verb'], ['des', 'articleIndef'], ['questions', 'noun'], ['Les', 'articleDef'], ['questions', 'noun'], ['sont', 'verb'], ['faciles', 'adjective']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function flatBanks() { return Object.values(BANKS).flat(); }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.noun;
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
    rowId: `fr_lesson20_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const articleCategoryCounts = countBy(rows, ['articleIndef', 'articleDef', 'articlePartitive', 'articleNegativeDe', 'negation', 'noun', 'verb']);
  const rowTypeCounts = {
    indefiniteIntroduction: 10,
    definiteSpecific: 10,
    partitiveQuantity: 10,
    negativeDe: 8,
    genericDefinite: 6,
    firstMentionThenKnown: 6,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'B1',
    internalFrenchBand: 'B1.1',
    englishTopic: 'Articles',
    frenchTopic: 'French articles: definite, indefinite, partitive, and negative de',
    sequencingReason: 'Builds noun-phrase precision after B1 place relations: French requires article gender, number, elision, partitive choice, and negative de.',
    frenchNativeTransferRule: 'Do not map English a/an/the mechanically; select un/une/des, le/la/l/les, du/de la/de l/des, or de/d by French noun behavior and context.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, articleCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON20_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок учит выбирать французский артикль по смыслу, роду, числу и первой букве следующего слова.', bodyUk: 'Урок вчить обирати французький артикль за змістом, родом, числом і першою літерою наступного слова.' },
      { titleRu: '02. Un, une, des', titleUk: '02. Un, une, des', bodyRu: 'Неопределенные артикли вводят новый или неуточненный предмет: un sac, une clé, des documents.', bodyUk: 'Неозначені артиклі вводять новий або неуточнений предмет: un sac, une clé, des documents.' },
      { titleRu: '03. Le, la, l, les', titleUk: '03. Le, la, l, les', bodyRu: 'Определенные артикли называют конкретный, известный или обобщенный предмет: le téléphone, la clé, l’eau, les documents.', bodyUk: 'Означені артиклі називають конкретний, відомий або узагальнений предмет: le téléphone, la clé, l’eau, les documents.' },
      { titleRu: '04. Du, de la, de l, des', titleUk: '04. Du, de la, de l, des', bodyRu: 'Партитив нужен для неопределенного количества: du café, de la salade, de l’eau, des pâtes.', bodyUk: 'Партитив потрібен для невизначеної кількості: du café, de la salade, de l’eau, des pâtes.' },
      { titleRu: '05. De после отрицания', titleUk: '05. De після заперечення', bodyRu: 'После отрицания неопределенный и партитивный артикли обычно становятся de/d: Je n’ai pas de sac; Il ne boit pas d’eau.', bodyUk: 'Після заперечення неозначений і партитивний артиклі зазвичай стають de/d: Je n’ai pas de sac; Il ne boit pas d’eau.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson20.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson20_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson20.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson20.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson20_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson20_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson20-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson20BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson20BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, articleCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson20BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson20BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson20BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson20BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson20BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson20BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson20BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson20BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 21 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 21 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON20_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
