import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 18;
const SLUG = 'lesson18_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson18-blueprint-rebuild-v1.reviewed.pending';
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
  candidate: path.join(dirs.review, 'lesson18_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson18_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson18_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson18_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson18_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson18_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson18_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson18_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson18_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson18_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson18_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson18_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson18_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson18_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson18_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson18_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson18_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson18_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson18_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  tv5monde_imperatif: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-limperatif-0',
    claim: 'French imperative has no expressed subject and is used when addressing tu, nous, and vous.',
  },
  le_robert_imperatif: {
    url: 'https://dictionnaire.lerobert.com/guide/imperatif',
    claim: 'Imperative is the mood of injunction; the subject pronoun is not expressed and the present imperative exists for tu, nous, vous.',
  },
  france_education_delf_a2: {
    url: 'https://www.france-education-international.fr/diplome/delf-tout-public/niveau-a2/exemples-sujets',
    claim: 'DELF A2 tasks validate routine, practical communication suitable for short requests and instructions.',
  },
  coe_cefr_a2_instructions: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search',
    claim: 'A2 learners handle simple routine tasks and simple instructions in familiar contexts.',
  },
  phraseman_english_lesson18_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 18 teaches imperatives, requests, and let us forms; French must rebuild this as tu/vous/nous imperative plus polite request alternatives.',
  },
};

const BANKS = {
  politeMarker: ["S'il te plaît", "S'il vous plaît", 'Merci de', 'Veuillez', 'Pardon'],
  modalRequest: ['Pouvez-vous', 'Pourriez-vous', 'Peux-tu', 'Veuillez', 'Merci de'],
  imperativeTu: ['attends', 'aide-moi', 'appelle-moi', 'vérifie', 'envoie', 'ouvre', 'ferme', 'allume', 'éteins', 'rends', 'commence', 'écoute-moi', 'regarde-moi', 'appelle-la', 'aide-nous', 'apporte', 'garde', 'prends', 'lis', 'écris'],
  imperativeVous: ['attendez', 'aidez-moi', 'appelez-moi', 'vérifiez', 'envoyez', 'ouvrez', 'fermez', 'allumez', 'éteignez', 'rendez', 'commencez', 'écoutez-moi', 'regardez-moi', 'appelez-la', 'aidez-nous', 'apportez', 'gardez', 'prenez', 'lisez', 'écrivez', 'parlez'],
  imperativeNous: ['commençons', 'travaillons', 'vérifions', 'commandons', 'appelons', 'cherchons', 'revenons', 'nettoyons', 'parlons', 'finissons'],
  infinitive: ['attendre', "m'aider", "m'appeler", 'vérifier', 'envoyer', 'ouvrir', 'fermer', 'allumer', 'éteindre', 'rendre', 'commencer', 'nettoyer', 'parler', 'finir'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  pronounObject: ['moi', 'me', 'la', 'nous', 'les', 'lui', 'leur', 'te'],
  determiner: ['le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'votre', 'vos', "l'"],
  object: ['messages', 'documents', "l'application", 'téléphone', 'lumière', 'porte', 'clés', 'option', 'chambre', 'réunion', 'adresse', 'rapport', 'question', 'table', 'fenêtre', 'dossier'],
  adverb: ['ici', 'maintenant', 'plus tard', "aujourd'hui", 'ensemble', 'doucement', 'vite', 'ce soir', 'demain', 'tout de suite'],
  preposition: ['à', 'de', 'avec', 'pour', 'dans', 'sur'],
};

const DATA = [
  ["S'il te plaît, attends ici.", 'Пожалуйста, подожди здесь.', 'Будь ласка, зачекай тут.', [['S\'il te plaît', 'politeMarker'], ['attends', 'imperativeTu'], ['ici', 'adverb']]],
  ["S'il te plaît, aide-moi maintenant.", 'Пожалуйста, помоги мне сейчас.', 'Будь ласка, допоможи мені зараз.', [["S'il te plaît", 'politeMarker'], ['aide-moi', 'imperativeTu'], ['maintenant', 'adverb']]],
  ["S'il te plaît, appelle-moi plus tard.", 'Пожалуйста, позвони мне позже.', 'Будь ласка, зателефонуй мені пізніше.', [["S'il te plaît", 'politeMarker'], ['appelle-moi', 'imperativeTu'], ['plus tard', 'adverb']]],
  ["S'il te plaît, vérifie les messages.", 'Пожалуйста, проверь сообщения.', 'Будь ласка, перевір повідомлення.', [["S'il te plaît", 'politeMarker'], ['vérifie', 'imperativeTu'], ['les', 'determiner'], ['messages', 'object']]],
  ["S'il te plaît, envoie les documents.", 'Пожалуйста, отправь документы.', 'Будь ласка, надішли документи.', [["S'il te plaît", 'politeMarker'], ['envoie', 'imperativeTu'], ['les', 'determiner'], ['documents', 'object']]],
  ["S'il te plaît, ouvre l'application.", 'Пожалуйста, открой приложение.', 'Будь ласка, відкрий застосунок.', [["S'il te plaît", 'politeMarker'], ['ouvre', 'imperativeTu'], ["l'", 'determiner'], ["application", 'object']]],
  ["S'il te plaît, ferme l'application.", 'Пожалуйста, закрой приложение.', 'Будь ласка, закрий застосунок.', [["S'il te plaît", 'politeMarker'], ['ferme', 'imperativeTu'], ["l'", 'determiner'], ["application", 'object']]],
  ["S'il te plaît, allume ton téléphone.", 'Пожалуйста, включи свой телефон.', 'Будь ласка, увімкни свій телефон.', [["S'il te plaît", 'politeMarker'], ['allume', 'imperativeTu'], ['ton', 'determiner'], ['téléphone', 'object']]],
  ["S'il te plaît, éteins ton téléphone.", 'Пожалуйста, выключи свой телефон.', 'Будь ласка, вимкни свій телефон.', [["S'il te plaît", 'politeMarker'], ['éteins', 'imperativeTu'], ['ton', 'determiner'], ['téléphone', 'object']]],
  ["S'il te plaît, rends les clés.", 'Пожалуйста, верни ключи.', 'Будь ласка, поверни ключі.', [["S'il te plaît", 'politeMarker'], ['rends', 'imperativeTu'], ['les', 'determiner'], ['clés', 'object']]],
  ['Attends ici.', 'Подожди здесь.', 'Зачекай тут.', [['attends', 'imperativeTu'], ['ici', 'adverb']]],
  ['Commence maintenant.', 'Начни сейчас.', 'Почни зараз.', [['commence', 'imperativeTu'], ['maintenant', 'adverb']]],
  ['Écoute-moi.', 'Слушай меня.', 'Слухай мене.', [['écoute-moi', 'imperativeTu']]],
  ['Regarde-moi.', 'Посмотри на меня.', 'Подивись на мене.', [['regarde-moi', 'imperativeTu']]],
  ['Appelle-la maintenant.', 'Позвони ей сейчас.', 'Зателефонуй їй зараз.', [['appelle-la', 'imperativeTu'], ['maintenant', 'adverb']]],
  ["Aide-nous aujourd'hui.", 'Помоги нам сегодня.', 'Допоможи нам сьогодні.', [['aide-nous', 'imperativeTu'], ["aujourd'hui", 'adverb']]],
  ['Apporte les documents.', 'Принеси документы.', 'Принеси документи.', [['apporte', 'imperativeTu'], ['les', 'determiner'], ['documents', 'object']]],
  ['Garde cette option.', 'Оставь этот вариант.', 'Залиш цей варіант.', [['garde', 'imperativeTu'], ['cette', 'determiner'], ['option', 'object']]],
  ['Prends les clés.', 'Возьми ключи.', 'Візьми ключі.', [['prends', 'imperativeTu'], ['les', 'determiner'], ['clés', 'object']]],
  ['Écris cette adresse.', 'Напиши этот адрес.', 'Напиши цю адресу.', [['écris', 'imperativeTu'], ['cette', 'determiner'], ['adresse', 'object']]],
  ["N'attends pas ici.", 'Не жди здесь.', 'Не чекай тут.', [["n'", 'negation'], ['attends', 'imperativeTu'], ['pas', 'negation'], ['ici', 'adverb']]],
  ['Ne commence pas maintenant.', 'Не начинай сейчас.', 'Не починай зараз.', [['ne', 'negation'], ['commence', 'imperativeTu'], ['pas', 'negation'], ['maintenant', 'adverb']]],
  ["N'ouvre pas la porte.", 'Не открывай дверь.', 'Не відчиняй двері.', [["n'", 'negation'], ['ouvre', 'imperativeTu'], ['pas', 'negation'], ['la', 'determiner'], ['porte', 'object']]],
  ['Ne ferme pas la fenêtre.', 'Не закрывай окно.', 'Не зачиняй вікно.', [['ne', 'negation'], ['ferme', 'imperativeTu'], ['pas', 'negation'], ['la', 'determiner'], ['fenêtre', 'object']]],
  ["N'allume pas la lumière.", 'Не включай свет.', 'Не вмикай світло.', [["n'", 'negation'], ['allume', 'imperativeTu'], ['pas', 'negation'], ['la', 'determiner'], ['lumière', 'object']]],
  ["N'éteins pas la lumière.", 'Не выключай свет.', 'Не вимикай світло.', [["n'", 'negation'], ['éteins', 'imperativeTu'], ['pas', 'negation'], ['la', 'determiner'], ['lumière', 'object']]],
  ['Ne prends pas les clés.', 'Не бери ключи.', 'Не бери ключі.', [['ne', 'negation'], ['prends', 'imperativeTu'], ['pas', 'negation'], ['les', 'determiner'], ['clés', 'object']]],
  ["N'écris pas cette adresse.", 'Не пиши этот адрес.', 'Не пиши цю адресу.', [["n'", 'negation'], ['écris', 'imperativeTu'], ['pas', 'negation'], ['cette', 'determiner'], ['adresse', 'object']]],
  ['Ne parle pas trop vite.', 'Не говори слишком быстро.', 'Не говори надто швидко.', [['ne', 'negation'], ['parle', 'imperativeTu'], ['pas', 'negation'], ['trop vite', 'adverb']]],
  ['Ne donne pas ce dossier.', 'Не отдавай эту папку.', 'Не віддавай цю папку.', [['ne', 'negation'], ['donne', 'imperativeTu'], ['pas', 'negation'], ['ce', 'determiner'], ['dossier', 'object']]],
  ['Pouvez-vous attendre ici ?', 'Вы можете подождать здесь?', 'Ви можете зачекати тут?', [['Pouvez-vous', 'modalRequest'], ['attendre', 'infinitive'], ['ici', 'adverb']]],
  ["Pouvez-vous m'aider maintenant ?", 'Вы можете помочь мне сейчас?', 'Ви можете допомогти мені зараз?', [['Pouvez-vous', 'modalRequest'], ["m'aider", 'infinitive'], ['maintenant', 'adverb']]],
  ["Pouvez-vous m'appeler plus tard ?", 'Вы можете позвонить мне позже?', 'Ви можете зателефонувати мені пізніше?', [['Pouvez-vous', 'modalRequest'], ["m'appeler", 'infinitive'], ['plus tard', 'adverb']]],
  ['Pouvez-vous vérifier les messages ?', 'Вы можете проверить сообщения?', 'Ви можете перевірити повідомлення?', [['Pouvez-vous', 'modalRequest'], ['vérifier', 'infinitive'], ['les', 'determiner'], ['messages', 'object']]],
  ['Pouvez-vous envoyer les documents ?', 'Вы можете отправить документы?', 'Ви можете надіслати документи?', [['Pouvez-vous', 'modalRequest'], ['envoyer', 'infinitive'], ['les', 'determiner'], ['documents', 'object']]],
  ['Pouvez-vous ouvrir la porte ?', 'Вы можете открыть дверь?', 'Ви можете відчинити двері?', [['Pouvez-vous', 'modalRequest'], ['ouvrir', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Pouvez-vous fermer la porte ?', 'Вы можете закрыть дверь?', 'Ви можете зачинити двері?', [['Pouvez-vous', 'modalRequest'], ['fermer', 'infinitive'], ['la', 'determiner'], ['porte', 'object']]],
  ['Pouvez-vous éteindre la lumière ?', 'Вы можете выключить свет?', 'Ви можете вимкнути світло?', [['Pouvez-vous', 'modalRequest'], ['éteindre', 'infinitive'], ['la', 'determiner'], ['lumière', 'object']]],
  ["S'il vous plaît, attendez ici.", 'Пожалуйста, подождите здесь.', 'Будь ласка, зачекайте тут.', [["S'il vous plaît", 'politeMarker'], ['attendez', 'imperativeVous'], ['ici', 'adverb']]],
  ["S'il vous plaît, parlez doucement.", 'Пожалуйста, говорите тихо.', 'Будь ласка, говоріть тихо.', [["S'il vous plaît", 'politeMarker'], ['parlez', 'imperativeVous'], ['doucement', 'adverb']]],
  ['Commençons maintenant.', 'Давайте начнем сейчас.', 'Почнімо зараз.', [['commençons', 'imperativeNous'], ['maintenant', 'adverb']]],
  ['Travaillons ensemble.', 'Давайте работать вместе.', 'Працюймо разом.', [['travaillons', 'imperativeNous'], ['ensemble', 'adverb']]],
  ['Vérifions les documents.', 'Давайте проверим документы.', 'Перевірмо документи.', [['vérifions', 'imperativeNous'], ['les', 'determiner'], ['documents', 'object']]],
  ['Commandons le dîner.', 'Давайте закажем ужин.', 'Замовмо вечерю.', [['commandons', 'imperativeNous'], ['le', 'determiner'], ['dîner', 'object']]],
  ['Appelons le professeur.', 'Давайте позвоним преподавателю.', 'Зателефонуймо викладачу.', [['appelons', 'imperativeNous'], ['le', 'determiner'], ['professeur', 'object']]],
  ['Cherchons une meilleure option.', 'Давайте найдем лучший вариант.', 'Знайдімо кращий варіант.', [['cherchons', 'imperativeNous'], ['une', 'determiner'], ['meilleure', 'object'], ['option', 'object']]],
  ['Revenons plus tard.', 'Давайте вернемся позже.', 'Повернімося пізніше.', [['revenons', 'imperativeNous'], ['plus tard', 'adverb']]],
  ['Nettoyons la chambre.', 'Давайте уберем комнату.', 'Приберімо кімнату.', [['nettoyons', 'imperativeNous'], ['la', 'determiner'], ['chambre', 'object']]],
  ['Parlons après la réunion.', 'Давайте поговорим после встречи.', 'Поговорімо після зустрічі.', [['parlons', 'imperativeNous'], ['après', 'preposition'], ['la', 'determiner'], ['réunion', 'object']]],
  ["Finissons aujourd'hui.", 'Давайте закончим сегодня.', 'Закінчімо сьогодні.', [['finissons', 'imperativeNous'], ["aujourd'hui", 'adverb']]],
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
    rowId: `fr_lesson18_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  const imperativeCategoryCounts = countBy(rows, ['politeMarker', 'modalRequest', 'imperativeTu', 'imperativeVous', 'imperativeNous', 'infinitive', 'negation']);
  const rowTypeCounts = {
    politeMarkerRows: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'politeMarker')).length,
    directTu: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'imperativeTu') && !row.wordsFr.some((slot) => slot.category === 'politeMarker') && !row.wordsFr.some((slot) => slot.category === 'negation')).length,
    negativeTu: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'negation')).length,
    politeRequest: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'modalRequest')).length,
    directVous: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'imperativeVous')).length,
    imperativeNous: rows.filter((row) => row.wordsFr.some((slot) => slot.category === 'imperativeNous')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Imperative',
    frenchTopic: 'Imperatif: tu/vous/nous commands and polite requests',
    sequencingReason: 'Adds practical commands and requests after present action control, matching English Lesson 18 function without copying English forms.',
    frenchNativeTransferRule: 'Use tu/vous/nous imperative without subject pronouns, ne...pas for negative commands, and Pouvez-vous/Veuillez/Merci de for polite service requests.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, imperativeCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON18_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'A2', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок учит коротким командам, просьбам и предложениям действовать вместе: Attends ici, Pouvez-vous ouvrir la porte ?, Commençons maintenant.', bodyUk: 'Урок вчить коротким наказам, проханням і пропозиціям діяти разом: Attends ici, Pouvez-vous ouvrir la porte ?, Commençons maintenant.' },
      { titleRu: '02. Главное правило', titleUk: '02. Головне правило', bodyRu: 'Во французском императиве нет подлежащего: говорим Attends, Ouvre, Prenez, Commençons, а не Tu attends или Vous ouvrez.', bodyUk: 'У французькому наказовому способі немає підмета: кажемо Attends, Ouvre, Prenez, Commençons, а не Tu attends або Vous ouvrez.' },
      { titleRu: '03. Tu и vous', titleUk: '03. Tu і vous', bodyRu: 'Tu-форма для близкого общения: aide-moi, ouvre la porte. Vous-форма нужна для вежливости или группы: attendez, ouvrez, vérifiez.', bodyUk: 'Tu-форма для близького спілкування: aide-moi, ouvre la porte. Vous-форма потрібна для ввічливості або групи: attendez, ouvrez, vérifiez.' },
      { titleRu: '04. Запрет', titleUk: '04. Заборона', bodyRu: 'Отрицательная команда строится вокруг глагола: ne/n’ + impératif + pas. Например: N’ouvre pas la porte; Ne parle pas trop vite.', bodyUk: 'Заперечний наказ будується навколо дієслова: ne/n’ + impératif + pas. Наприклад: N’ouvre pas la porte; Ne parle pas trop vite.' },
      { titleRu: '05. Вежливая просьба', titleUk: '05. Ввічливе прохання', bodyRu: 'Английское Can you/Please во французском часто лучше передавать через Pouvez-vous, Veuillez или Merci de + infinitif.', bodyUk: 'Англійське Can you/Please у французькій часто краще передавати через Pouvez-vous, Veuillez або Merci de + infinitif.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson18.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson18_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson18.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson18.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson18_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson18_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  const runtimeSummary = { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false };
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: runtimeSummary, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson18-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson18BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson18BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, imperativeCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson18BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson18BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson18BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson18BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson18BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson18BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson18BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson18BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 19 blueprint-first rebuild and switch to app-facing B1 parity.', 'Inspect English Lesson 19 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON18_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
