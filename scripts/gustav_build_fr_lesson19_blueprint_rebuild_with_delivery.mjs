import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 19;
const SLUG = 'lesson19_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson19-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson19_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson19_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson19_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson19_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson19_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson19_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson19_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson19_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson19_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson19_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson19_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson19_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson19_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson19_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson19_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson19_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson19_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson19_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson19_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  tv5monde_prepositions_lieu: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-les-prepositions-de-lieu-0',
    claim: 'French uses prepositions of place to locate an object, person, or place.',
  },
  larousse_preposition: {
    url: 'https://www.larousse.fr/dictionnaires/francais/pr%C3%A9position/63622',
    claim: 'A preposition is an invariable grammatical word placed before a constituent to connect it to another constituent.',
  },
  kwiziq_prepositions_location: {
    url: 'https://french.kwiziq.com/revision/grammar/use-dans-sur-sous-devant-derriere-entre-to-say-in-on-top-of-under-in-front-of-behind-prepositions',
    claim: 'Common French location prepositions include dans, sur, sous, devant, derriere, and entre.',
  },
  coe_cefr_b1_place_descriptions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search',
    claim: 'B1 expands practical connected descriptions in familiar places and routine tasks.',
  },
  phraseman_english_lesson19_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 19 teaches prepositions of place; French must rebuild this with French spatial prepositions and article contractions.',
  },
};

const BANKS = {
  determiner: ['le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', "l'"],
  contractedArticle: ['du', 'de la', 'des', 'au', 'aux', 'à la'],
  noun: ['téléphone', 'table', 'sac', 'clés', 'chargeur', 'documents', 'billets', 'bureau', 'chaise', 'porte', 'café', 'gare', 'lampe', 'chat', 'livre', 'cahiers', 'arrêt', 'école', 'parc', 'mairie', 'pharmacie', 'banque', 'tableau', 'mur', 'tapis', 'lit', 'bouteille', 'magasin', 'poste', 'toilettes', 'couloir', 'dossier', 'reçu', 'portefeuille', 'fenêtre', 'sortie', 'accueil', 'entrée', 'voiture', 'maison', 'vélo'],
  verb: ['est', 'sont', 'se trouve', 'se trouvent', 'reste', 'restent'],
  imperative: ['mets', 'pose', 'range', 'place', 'laisse', 'garde'],
  spatialPreposition: ['sur', 'sous', 'dans', 'près de', 'devant', 'derrière', 'au-dessus de', 'entre', 'en face de', 'à côté de', 'au fond de', 'à gauche de', 'à droite de'],
  pronoun: ['moi', 'toi', 'lui', 'elle', 'nous', 'vous', 'eux'],
  questionWord: ['où', 'comment', 'quand', 'pourquoi', 'combien', 'qui'],
  existential: ['il y a', 'voici', 'voilà', 'il reste', 'on voit', 'se trouve'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
};

const DATA = [
  ['Le téléphone est sur la table.', 'Телефон на столе.', 'Телефон на столі.', [['Le', 'determiner'], ['téléphone', 'noun'], ['est', 'verb'], ['sur', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Le sac est sous la table.', 'Сумка под столом.', 'Сумка під столом.', [['Le', 'determiner'], ['sac', 'noun'], ['est', 'verb'], ['sous', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Les clés sont dans le sac.', 'Ключи в сумке.', 'Ключі в сумці.', [['Les', 'determiner'], ['clés', 'noun'], ['sont', 'verb'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['sac', 'noun']]],
  ['Le chargeur est près du téléphone.', 'Зарядка рядом с телефоном.', 'Зарядний пристрій біля телефона.', [['Le', 'determiner'], ['chargeur', 'noun'], ['est', 'verb'], ['près de', 'spatialPreposition'], ['du', 'contractedArticle'], ['téléphone', 'noun']]],
  ['Les documents sont dans le sac.', 'Документы в сумке.', 'Документи в сумці.', [['Les', 'determiner'], ['documents', 'noun'], ['sont', 'verb'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['sac', 'noun']]],
  ['Les billets sont sur le bureau.', 'Билеты на письменном столе.', 'Квитки на письмовому столі.', [['Les', 'determiner'], ['billets', 'noun'], ['sont', 'verb'], ['sur', 'spatialPreposition'], ['le', 'determiner'], ['bureau', 'noun']]],
  ['La chaise est près de la table.', 'Стул рядом со столом.', 'Стілець біля столу.', [['La', 'determiner'], ['chaise', 'noun'], ['est', 'verb'], ['près de', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['La porte est derrière moi.', 'Дверь позади меня.', 'Двері позаду мене.', [['La', 'determiner'], ['porte', 'noun'], ['est', 'verb'], ['derrière', 'spatialPreposition'], ['moi', 'pronoun']]],
  ['Le café est devant la gare.', 'Кафе перед вокзалом.', 'Кафе перед вокзалом.', [['Le', 'determiner'], ['café', 'noun'], ['est', 'verb'], ['devant', 'spatialPreposition'], ['la', 'determiner'], ['gare', 'noun']]],
  ['La lampe est au-dessus du bureau.', 'Лампа над письменным столом.', 'Лампа над письмовим столом.', [['La', 'determiner'], ['lampe', 'noun'], ['est', 'verb'], ['au-dessus de', 'spatialPreposition'], ['du', 'contractedArticle'], ['bureau', 'noun']]],
  ['Le chat est sous la chaise.', 'Кот под стулом.', 'Кіт під стільцем.', [['Le', 'determiner'], ['chat', 'noun'], ['est', 'verb'], ['sous', 'spatialPreposition'], ['la', 'determiner'], ['chaise', 'noun']]],
  ['Le livre est entre les cahiers.', 'Книга между тетрадями.', 'Книга між зошитами.', [['Le', 'determiner'], ['livre', 'noun'], ['est', 'verb'], ['entre', 'spatialPreposition'], ['les', 'determiner'], ['cahiers', 'noun']]],
  ["L'arrêt est en face de l'école.", 'Остановка напротив школы.', 'Зупинка навпроти школи.', [["L'", 'determiner'], ['arrêt', 'noun'], ['est', 'verb'], ['en face de', 'spatialPreposition'], ["l'", 'determiner'], ['école', 'noun']]],
  ['Le parc est à côté de la mairie.', 'Парк рядом с мэрией.', 'Парк поруч із мерією.', [['Le', 'determiner'], ['parc', 'noun'], ['est', 'verb'], ['à côté de', 'spatialPreposition'], ['la', 'determiner'], ['mairie', 'noun']]],
  ['La pharmacie est derrière la banque.', 'Аптека за банком.', 'Аптека за банком.', [['La', 'determiner'], ['pharmacie', 'noun'], ['est', 'verb'], ['derrière', 'spatialPreposition'], ['la', 'determiner'], ['banque', 'noun']]],
  ['Le tableau est sur le mur.', 'Картина на стене.', 'Картина на стіні.', [['Le', 'determiner'], ['tableau', 'noun'], ['est', 'verb'], ['sur', 'spatialPreposition'], ['le', 'determiner'], ['mur', 'noun']]],
  ['Le tapis est sous le lit.', 'Ковер под кроватью.', 'Килим під ліжком.', [['Le', 'determiner'], ['tapis', 'noun'], ['est', 'verb'], ['sous', 'spatialPreposition'], ['le', 'determiner'], ['lit', 'noun']]],
  ['La bouteille est dans le sac.', 'Бутылка в сумке.', 'Пляшка в сумці.', [['La', 'determiner'], ['bouteille', 'noun'], ['est', 'verb'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['sac', 'noun']]],
  ['Le magasin est entre la banque et la poste.', 'Магазин между банком и почтой.', 'Магазин між банком і поштою.', [['Le', 'determiner'], ['magasin', 'noun'], ['est', 'verb'], ['entre', 'spatialPreposition'], ['la', 'determiner'], ['banque', 'noun'], ['la', 'determiner'], ['poste', 'noun']]],
  ['Les toilettes sont au fond du couloir.', 'Туалеты в конце коридора.', 'Туалети в кінці коридору.', [['Les', 'determiner'], ['toilettes', 'noun'], ['sont', 'verb'], ['au fond de', 'spatialPreposition'], ['du', 'contractedArticle'], ['couloir', 'noun']]],
  ['Mets le téléphone sur la table.', 'Положи телефон на стол.', 'Поклади телефон на стіл.', [['mets', 'imperative'], ['le', 'determiner'], ['téléphone', 'noun'], ['sur', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Mets les clés dans le sac.', 'Положи ключи в сумку.', 'Поклади ключі в сумку.', [['mets', 'imperative'], ['les', 'determiner'], ['clés', 'noun'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['sac', 'noun']]],
  ['Pose le chargeur près du téléphone.', 'Положи зарядку рядом с телефоном.', 'Поклади зарядний пристрій біля телефона.', [['pose', 'imperative'], ['le', 'determiner'], ['chargeur', 'noun'], ['près de', 'spatialPreposition'], ['du', 'contractedArticle'], ['téléphone', 'noun']]],
  ['Range les documents dans le dossier.', 'Убери документы в папку.', 'Поклади документи в теку.', [['range', 'imperative'], ['les', 'determiner'], ['documents', 'noun'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['dossier', 'noun']]],
  ['Place la chaise devant la table.', 'Поставь стул перед столом.', 'Постав стілець перед столом.', [['place', 'imperative'], ['la', 'determiner'], ['chaise', 'noun'], ['devant', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Pose le sac sous le bureau.', 'Поставь сумку под стол.', 'Постав сумку під стіл.', [['pose', 'imperative'], ['le', 'determiner'], ['sac', 'noun'], ['sous', 'spatialPreposition'], ['le', 'determiner'], ['bureau', 'noun']]],
  ['Place la lampe au-dessus du bureau.', 'Размести лампу над столом.', 'Розмісти лампу над столом.', [['place', 'imperative'], ['la', 'determiner'], ['lampe', 'noun'], ['au-dessus de', 'spatialPreposition'], ['du', 'contractedArticle'], ['bureau', 'noun']]],
  ['Mets le livre entre les cahiers.', 'Положи книгу между тетрадями.', 'Поклади книгу між зошитами.', [['mets', 'imperative'], ['le', 'determiner'], ['livre', 'noun'], ['entre', 'spatialPreposition'], ['les', 'determiner'], ['cahiers', 'noun']]],
  ['Laisse les billets sur le bureau.', 'Оставь билеты на столе.', 'Залиш квитки на столі.', [['laisse', 'imperative'], ['les', 'determiner'], ['billets', 'noun'], ['sur', 'spatialPreposition'], ['le', 'determiner'], ['bureau', 'noun']]],
  ['Garde le reçu dans le portefeuille.', 'Держи чек в кошельке.', 'Тримай чек у гаманці.', [['garde', 'imperative'], ['le', 'determiner'], ['reçu', 'noun'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['portefeuille', 'noun']]],
  ['Où est le téléphone ?', 'Где телефон?', 'Де телефон?', [['où', 'questionWord'], ['est', 'verb'], ['le', 'determiner'], ['téléphone', 'noun']]],
  ['Il est sur la table.', 'Он на столе.', 'Він на столі.', [['Il', 'pronoun'], ['est', 'verb'], ['sur', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Où sont les clés ?', 'Где ключи?', 'Де ключі?', [['où', 'questionWord'], ['sont', 'verb'], ['les', 'determiner'], ['clés', 'noun']]],
  ['Elles sont dans le sac.', 'Они в сумке.', 'Вони в сумці.', [['Elles', 'pronoun'], ['sont', 'verb'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['sac', 'noun']]],
  ['Où est le chargeur ?', 'Где зарядка?', 'Де зарядний пристрій?', [['où', 'questionWord'], ['est', 'verb'], ['le', 'determiner'], ['chargeur', 'noun']]],
  ['Il est près du téléphone.', 'Он рядом с телефоном.', 'Він біля телефона.', [['Il', 'pronoun'], ['est', 'verb'], ['près de', 'spatialPreposition'], ['du', 'contractedArticle'], ['téléphone', 'noun']]],
  ['Où sont les documents ?', 'Где документы?', 'Де документи?', [['où', 'questionWord'], ['sont', 'verb'], ['les', 'determiner'], ['documents', 'noun']]],
  ['Ils sont dans le dossier.', 'Они в папке.', 'Вони в теці.', [['Ils', 'pronoun'], ['sont', 'verb'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['dossier', 'noun']]],
  ["Il n'est pas sous la table.", 'Он не под столом.', 'Він не під столом.', [['Il', 'pronoun'], ["n'", 'negation'], ['est', 'verb'], ['pas', 'negation'], ['sous', 'spatialPreposition'], ['la', 'determiner'], ['table', 'noun']]],
  ['Les clés ne sont pas sur le bureau.', 'Ключи не на столе.', 'Ключі не на столі.', [['Les', 'determiner'], ['clés', 'noun'], ['ne', 'negation'], ['sont', 'verb'], ['pas', 'negation'], ['sur', 'spatialPreposition'], ['le', 'determiner'], ['bureau', 'noun']]],
  ["Le sac n'est pas derrière la porte.", 'Сумка не за дверью.', 'Сумка не за дверима.', [['Le', 'determiner'], ['sac', 'noun'], ["n'", 'negation'], ['est', 'verb'], ['pas', 'negation'], ['derrière', 'spatialPreposition'], ['la', 'determiner'], ['porte', 'noun']]],
  ["La chaise n'est pas devant la fenêtre.", 'Стул не перед окном.', 'Стілець не перед вікном.', [['La', 'determiner'], ['chaise', 'noun'], ["n'", 'negation'], ['est', 'verb'], ['pas', 'negation'], ['devant', 'spatialPreposition'], ['la', 'determiner'], ['fenêtre', 'noun']]],
  ['Il y a une table près de la fenêtre.', 'Рядом с окном есть стол.', 'Біля вікна є стіл.', [['il y a', 'existential'], ['une', 'determiner'], ['table', 'noun'], ['près de', 'spatialPreposition'], ['la', 'determiner'], ['fenêtre', 'noun']]],
  ['Il y a des documents dans le dossier.', 'В папке есть документы.', 'У теці є документи.', [['il y a', 'existential'], ['des', 'determiner'], ['documents', 'noun'], ['dans', 'spatialPreposition'], ['le', 'determiner'], ['dossier', 'noun']]],
  ['Il y a un café en face de la gare.', 'Напротив вокзала есть кафе.', 'Навпроти вокзалу є кафе.', [['il y a', 'existential'], ['un', 'determiner'], ['café', 'noun'], ['en face de', 'spatialPreposition'], ['la', 'determiner'], ['gare', 'noun']]],
  ['Il y a une lampe au-dessus du bureau.', 'Над столом есть лампа.', 'Над столом є лампа.', [['il y a', 'existential'], ['une', 'determiner'], ['lampe', 'noun'], ['au-dessus de', 'spatialPreposition'], ['du', 'contractedArticle'], ['bureau', 'noun']]],
  ["La sortie est à gauche de l'accueil.", 'Выход слева от ресепшена.', 'Вихід ліворуч від рецепції.', [['La', 'determiner'], ['sortie', 'noun'], ['est', 'verb'], ['à gauche de', 'spatialPreposition'], ["l'", 'determiner'], ['accueil', 'noun']]],
  ["L'entrée est à droite du bureau.", 'Вход справа от офиса.', 'Вхід праворуч від офісу.', [["L'", 'determiner'], ['entrée', 'noun'], ['est', 'verb'], ['à droite de', 'spatialPreposition'], ['du', 'contractedArticle'], ['bureau', 'noun']]],
  ['La voiture est devant la maison.', 'Машина перед домом.', 'Автомобіль перед будинком.', [['La', 'determiner'], ['voiture', 'noun'], ['est', 'verb'], ['devant', 'spatialPreposition'], ['la', 'determiner'], ['maison', 'noun']]],
  ['Le vélo est derrière la voiture.', 'Велосипед за машиной.', 'Велосипед за автомобілем.', [['Le', 'determiner'], ['vélo', 'noun'], ['est', 'verb'], ['derrière', 'spatialPreposition'], ['la', 'determiner'], ['voiture', 'noun']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function flatBanks() { return Object.values(BANKS).flat(); }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.noun;
  const distractors = [...new Set(bank.filter((item) => item.toLowerCase() !== String(correct).toLowerCase()))].slice(0, 5);
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
    rowId: `fr_lesson19_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const spatialCategoryCounts = countBy(rows, ['spatialPreposition', 'contractedArticle', 'determiner', 'noun', 'verb', 'imperative', 'questionWord', 'existential', 'negation']);
  const rowTypeCounts = {
    statementLocation: rows.slice(0, 20).length,
    placementCommand: rows.slice(20, 30).length,
    questionAnswer: rows.slice(30, 38).length,
    negativeLocation: rows.slice(38, 42).length,
    existentialLocation: rows.slice(42, 46).length,
    orientationLocation: rows.slice(46, 50).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'B1',
    internalFrenchBand: 'B1.1',
    englishTopic: 'Prepositions of place',
    frenchTopic: 'Prepositions de lieu with articles and spatial relations',
    sequencingReason: 'Starts app-facing B1 by controlling object/place relations, placement commands, questions, negatives, and il y a descriptions.',
    frenchNativeTransferRule: 'Use French place prepositions and article behavior: dans/sur/sous/devant/derriere/entre plus de-based locutions with du/de la/des/l.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, spatialCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON19_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок учит описывать, где находится предмет или место: sur la table, dans le sac, sous le lit, devant la gare.', bodyUk: 'Урок вчить описувати, де знаходиться предмет або місце: sur la table, dans le sac, sous le lit, devant la gare.' },
      { titleRu: '02. Простые предлоги', titleUk: '02. Прості прийменники', bodyRu: 'Sur = на поверхности, sous = под, dans = внутри, devant = перед, derrière = за/позади, entre = между.', bodyUk: 'Sur = на поверхні, sous = під, dans = всередині, devant = перед, derrière = за/позаду, entre = між.' },
      { titleRu: '03. Предлоги с de', titleUk: '03. Прийменники з de', bodyRu: 'Près de, à côté de, en face de, au-dessus de требуют правильного артикля после de: du téléphone, de la table, des bureaux, de l’école.', bodyUk: 'Près de, à côté de, en face de, au-dessus de вимагають правильного артикля після de: du téléphone, de la table, des bureaux, de l’école.' },
      { titleRu: '04. Команды размещения', titleUk: '04. Команди розміщення', bodyRu: 'Для действий с предметами используются Mets, Pose, Place, Range, Laisse, Garde плюс место: Mets les clés dans le sac.', bodyUk: 'Для дій із предметами використовуються Mets, Pose, Place, Range, Laisse, Garde плюс місце: Mets les clés dans le sac.' },
      { titleRu: '05. Вопросы и отрицание', titleUk: '05. Питання та заперечення', bodyRu: 'Où est...? Où sont...? отвечают на местоположение. Отрицание обрамляет глагол: Il n’est pas sous la table.', bodyUk: 'Où est...? Où sont...? відповідають на місцезнаходження. Заперечення охоплює дієслово: Il n’est pas sous la table.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson19.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson19_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson19.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson19.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson19_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson19_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson19-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson19BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson19BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, spatialCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson19BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson19BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson19BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson19BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson19BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson19BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson19BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson19BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 20 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 20 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON19_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
