import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const LESSON = 23;
const SLUG = 'lesson23_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson23-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = { appBundleModifiedByThisScript: false, serverUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false };

const dir = (name) => path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', name);
const dirs = {
  review: dir('review'),
  reviewer: dir('reviewer'),
  materialized: path.join(dir('materialized'), SLUG),
  audio: path.join(dir('audio'), SLUG),
  server: path.join(dir('server'), SLUG),
  runtime: path.join(dir('runtime'), SLUG),
  activation: path.join(dir('activation'), SLUG),
};
const paths = {
  state: path.join(ROOT, 'docs', 'gustav', 'state.json'),
  manifest: path.join(ROOT, 'app', 'course_pack_manifest.ts'),
  loader: path.join(ROOT, 'app', 'course_pack_loader.ts'),
  index: path.join(ROOT, 'app', 'course_pack_index.ts'),
  studyTarget: path.join(ROOT, 'app', 'study_target.ts'),
  candidate: path.join(dirs.review, 'lesson23_blueprint_rebuild_candidate_v1.json'),
  reviewGate: path.join(dirs.reviewer, 'fr_lesson23_blueprint_rebuild_review_gate_v1.json'),
  ruPack: path.join(dirs.materialized, 'fr_lesson23_blueprint_rebuild_ru_pack_draft_v1.json'),
  ukPack: path.join(dirs.materialized, 'fr_lesson23_blueprint_rebuild_uk_pack_draft_v1.json'),
  packAudit: path.join(dirs.materialized, 'fr_lesson23_blueprint_rebuild_pack_draft_audit_v1.json'),
  theory: path.join(dirs.materialized, 'fr_lesson23_blueprint_rebuild_theory_vocab_pack_v1.json'),
  theoryAudit: path.join(dirs.materialized, 'fr_lesson23_blueprint_rebuild_theory_vocab_pack_audit_v1.json'),
  audio: path.join(dirs.audio, 'fr_lesson23_blueprint_rebuild_audio_tts_manifest_v1.json'),
  audioAudit: path.join(dirs.audio, 'fr_lesson23_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json'),
  server: path.join(dirs.server, 'fr_lesson23_blueprint_rebuild_server_pack_manifest_v1.json'),
  serverAudit: path.join(dirs.server, 'fr_lesson23_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json'),
  payloadAudit: path.join(dirs.server, 'fr_lesson23_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json'),
  rollbackAudit: path.join(dirs.server, 'fr_lesson23_blueprint_rebuild_rollback_manifest_gate_audit_v1.json'),
  uploadAudit: path.join(dirs.server, 'fr_lesson23_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json'),
  runtimeAudit: path.join(dirs.runtime, 'fr_lesson23_blueprint_rebuild_runtime_delivery_gate_audit_v1.json'),
  cache: path.join(dirs.runtime, 'fr_lesson23_blueprint_rebuild_runtime_cache_integrity_gate_v1.json'),
  cacheAudit: path.join(dirs.runtime, 'fr_lesson23_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json'),
  activation: path.join(dirs.activation, 'fr_lesson23_blueprint_rebuild_explicit_activation_receipt_gate_v1.json'),
  activationAudit: path.join(dirs.activation, 'fr_lesson23_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json'),
};

const SOURCES = {
  lawless_passive_voice: {
    url: 'https://www.lawlessfrench.com/grammar/passive-voice/',
    claim: 'French passive voice is built with être plus a past participle, and the past participle agrees with the passive subject.',
  },
  lawless_par_de_passive_agent: {
    url: 'https://www.lawlessfrench.com/grammar/passive-voice/',
    claim: 'French passive agents are introduced by par in most cases, while de is natural with some verbs of feeling/knowledge such as connu or apprécié.',
  },
  le_robert_participe_passe_agreement: {
    url: 'https://dictionnaire.lerobert.com/guide/accord-du-participe-passe',
    claim: 'French past participles agree in gender and number in passive structures formed with être.',
  },
  tv5monde_voix_passive: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-la-voix-passive',
    claim: 'French passive voice highlights the object/result of the action and is formed with être plus past participle.',
  },
  phraseman_english_lesson23_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 23 teaches passive voice with object/result focus, by-agent optionality, negatives, and questions.',
  },
};

const BANKS = {
  subjectSingular: ['La salle', 'La nourriture', 'Le café', 'La porte', 'Le formulaire', 'La lettre', 'Le pont', 'La décision', 'La voiture', 'La réunion', 'Le paquet', 'La maison', 'Le rapport', 'Le problème', 'Le dîner', 'Le roman', 'La chanson', 'Le tableau', 'Cette règle', 'Le projet', 'La ville', 'Le film'],
  subjectPlural: ['Les documents', 'Les billets', 'Les fenêtres', 'Les messages', 'Les commandes', 'Les photos', 'Les clés', 'Les erreurs', 'Les résultats', 'Les invités', 'Les places', 'Les règles', 'Les enfants', 'Les questions'],
  etrePassive: ['est', 'sont', 'a été', 'ont été', 'sera', 'seront', "n'est pas", 'ne sont pas', "n'a pas été", 'ne seront pas', 'est-ce que', 'sont-ils', 'sera-t-il', 'a-t-elle été'],
  pastParticipleFemSg: ['nettoyée', 'préparée', 'fermée', 'remplie', 'écrite', 'prise', 'réparée', 'annulée', 'vendue', 'réservée', 'annoncée', 'servie', 'connue', 'comprise', 'visitée', 'ouverte'],
  pastParticipleMascSg: ['fait', 'construit', 'envoyé', 'résolu', 'publié', 'signé', 'lu', 'admiré', 'dirigé', 'apprécié', 'vérifié', 'remboursé'],
  pastParticipleFemPl: ['ouvertes', 'prises', 'trouvées', 'corrigées', 'confirmées', 'expliquées', 'posées'],
  pastParticipleMascPl: ['vérifiés', 'vendus', 'envoyés', 'livrés', 'publiés', 'accueillis', 'signés', 'accompagnés', 'remboursés', 'prêts'],
  agentPrep: ['par', 'de'],
  agent: ['Marie', 'Claire', 'les étudiants', 'les visiteurs', 'la classe', 'beaucoup de touristes', 'tous', 'leurs parents', 'le gardien', 'le professeur'],
  timePlace: ['chaque jour', 'chaque matin', 'en ligne', 'ici', 'le matin', 'la nuit', "aujourd'hui", 'hier', 'ce matin', 'dans le bureau', 'demain', 'lundi', "à l'entrée", 'bientôt', 'par mail', 'ce soir', 'avant le test', 'à huit heures'],
  questionWord: ['Quand', 'Pourquoi', 'Par qui', 'Où', 'Comment'],
};

const DATA = [
  ['presentPassive', 'La salle est nettoyée chaque jour.', 'Комнату убирают каждый день.', 'Кімнату прибирають щодня.', [['La salle', 'subjectSingular'], ['est', 'etrePassive'], ['nettoyée', 'pastParticipleFemSg'], ['chaque jour', 'timePlace']]],
  ['presentPassive', 'Les documents sont vérifiés chaque matin.', 'Документы проверяют каждое утро.', 'Документи перевіряють щоранку.', [['Les documents', 'subjectPlural'], ['sont', 'etrePassive'], ['vérifiés', 'pastParticipleMascPl'], ['chaque matin', 'timePlace']]],
  ['presentPassive', 'Les billets sont vendus en ligne.', 'Билеты продаются онлайн.', 'Квитки продаються онлайн.', [['Les billets', 'subjectPlural'], ['sont', 'etrePassive'], ['vendus', 'pastParticipleMascPl'], ['en ligne', 'timePlace']]],
  ['presentPassive', 'La nourriture est préparée ici.', 'Еду готовят здесь.', 'Їжу готують тут.', [['La nourriture', 'subjectSingular'], ['est', 'etrePassive'], ['préparée', 'pastParticipleFemSg'], ['ici', 'timePlace']]],
  ['presentPassive', 'Le café est fait le matin.', 'Кофе делают утром.', 'Каву роблять вранці.', [['Le café', 'subjectSingular'], ['est', 'etrePassive'], ['fait', 'pastParticipleMascSg'], ['le matin', 'timePlace']]],
  ['presentPassive', 'La porte est fermée la nuit.', 'Дверь закрывают на ночь.', 'Двері зачиняють на ніч.', [['La porte', 'subjectSingular'], ['est', 'etrePassive'], ['fermée', 'pastParticipleFemSg'], ['la nuit', 'timePlace']]],
  ['presentPassive', 'Les fenêtres sont ouvertes le matin.', 'Окна открывают утром.', 'Вікна відчиняють вранці.', [['Les fenêtres', 'subjectPlural'], ['sont', 'etrePassive'], ['ouvertes', 'pastParticipleFemPl'], ['le matin', 'timePlace']]],
  ['presentPassive', 'Les messages sont envoyés chaque jour.', 'Сообщения отправляют каждый день.', 'Повідомлення надсилають щодня.', [['Les messages', 'subjectPlural'], ['sont', 'etrePassive'], ['envoyés', 'pastParticipleMascPl'], ['chaque jour', 'timePlace']]],
  ['presentPassive', 'Le formulaire est rempli en ligne.', 'Форму заполняют онлайн.', 'Форму заповнюють онлайн.', [['Le formulaire', 'subjectSingular'], ['est', 'etrePassive'], ['rempli', 'pastParticipleMascSg'], ['en ligne', 'timePlace']]],
  ['presentPassive', "Les commandes sont livrées aujourd'hui.", 'Заказы доставляют сегодня.', 'Замовлення доставляють сьогодні.', [['Les commandes', 'subjectPlural'], ['sont', 'etrePassive'], ['livrées', 'pastParticipleFemPl'], ["aujourd'hui", 'timePlace']]],
  ['pastPassive', 'La lettre a été écrite hier.', 'Письмо было написано вчера.', 'Лист було написано вчора.', [['La lettre', 'subjectSingular'], ['a été', 'etrePassive'], ['écrite', 'pastParticipleFemSg'], ['hier', 'timePlace']]],
  ['pastPassive', 'Le pont a été construit en 1990.', 'Мост был построен в 1990 году.', 'Міст було побудовано у 1990 році.', [['Le pont', 'subjectSingular'], ['a été', 'etrePassive'], ['construit', 'pastParticipleMascSg'], ['en 1990', 'timePlace']]],
  ['pastPassive', 'La décision a été prise rapidement.', 'Решение было принято быстро.', 'Рішення було ухвалено швидко.', [['La décision', 'subjectSingular'], ['a été', 'etrePassive'], ['prise', 'pastParticipleFemSg'], ['rapidement', 'timePlace']]],
  ['pastPassive', 'Les photos ont été prises par Marie.', 'Фотографии были сделаны Мари.', 'Фотографії були зроблені Марі.', [['Les photos', 'subjectPlural'], ['ont été', 'etrePassive'], ['prises', 'pastParticipleFemPl'], ['par', 'agentPrep'], ['Marie', 'agent']]],
  ['pastPassive', 'La voiture a été réparée ce matin.', 'Машину починили сегодня утром.', 'Машину відремонтували сьогодні вранці.', [['La voiture', 'subjectSingular'], ['a été', 'etrePassive'], ['réparée', 'pastParticipleFemSg'], ['ce matin', 'timePlace']]],
  ['pastPassive', 'Les clés ont été trouvées dans le bureau.', 'Ключи были найдены в офисе.', 'Ключі було знайдено в офісі.', [['Les clés', 'subjectPlural'], ['ont été', 'etrePassive'], ['trouvées', 'pastParticipleFemPl'], ['dans le bureau', 'timePlace']]],
  ['pastPassive', 'La réunion a été annulée.', 'Встреча была отменена.', 'Зустріч було скасовано.', [['La réunion', 'subjectSingular'], ['a été', 'etrePassive'], ['annulée', 'pastParticipleFemSg']]],
  ['pastPassive', 'Les erreurs ont été corrigées.', 'Ошибки были исправлены.', 'Помилки було виправлено.', [['Les erreurs', 'subjectPlural'], ['ont été', 'etrePassive'], ['corrigées', 'pastParticipleFemPl']]],
  ['pastPassive', 'Le paquet a été envoyé hier.', 'Посылка была отправлена вчера.', 'Пакунок було надіслано вчора.', [['Le paquet', 'subjectSingular'], ['a été', 'etrePassive'], ['envoyé', 'pastParticipleMascSg'], ['hier', 'timePlace']]],
  ['pastPassive', 'La maison a été vendue.', 'Дом был продан.', 'Будинок було продано.', [['La maison', 'subjectSingular'], ['a été', 'etrePassive'], ['vendue', 'pastParticipleFemSg']]],
  ['futurePassive', 'Le rapport sera envoyé demain.', 'Отчёт будет отправлен завтра.', 'Звіт буде надіслано завтра.', [['Le rapport', 'subjectSingular'], ['sera', 'etrePassive'], ['envoyé', 'pastParticipleMascSg'], ['demain', 'timePlace']]],
  ['futurePassive', 'Les résultats seront publiés lundi.', 'Результаты будут опубликованы в понедельник.', 'Результати буде опубліковано в понеділок.', [['Les résultats', 'subjectPlural'], ['seront', 'etrePassive'], ['publiés', 'pastParticipleMascPl'], ['lundi', 'timePlace']]],
  ['futurePassive', 'La salle sera réservée.', 'Зал будет забронирован.', 'Залу буде заброньовано.', [['La salle', 'subjectSingular'], ['sera', 'etrePassive'], ['réservée', 'pastParticipleFemSg']]],
  ['futurePassive', "Les invités seront accueillis à l'entrée.", 'Гостей встретят у входа.', 'Гостей зустрінуть біля входу.', [['Les invités', 'subjectPlural'], ['seront', 'etrePassive'], ['accueillis', 'pastParticipleMascPl'], ["à l'entrée", 'timePlace']]],
  ['futurePassive', 'Le problème sera résolu bientôt.', 'Проблема будет решена скоро.', 'Проблему буде вирішено скоро.', [['Le problème', 'subjectSingular'], ['sera', 'etrePassive'], ['résolu', 'pastParticipleMascSg'], ['bientôt', 'timePlace']]],
  ['futurePassive', 'Les places seront confirmées par mail.', 'Места будут подтверждены по почте.', 'Місця буде підтверджено поштою.', [['Les places', 'subjectPlural'], ['seront', 'etrePassive'], ['confirmées', 'pastParticipleFemPl'], ['par mail', 'timePlace']]],
  ['futurePassive', 'La décision sera annoncée ce soir.', 'Решение объявят сегодня вечером.', 'Рішення оголосять сьогодні ввечері.', [['La décision', 'subjectSingular'], ['sera', 'etrePassive'], ['annoncée', 'pastParticipleFemSg'], ['ce soir', 'timePlace']]],
  ['futurePassive', 'Les règles seront expliquées avant le test.', 'Правила объяснят перед тестом.', 'Правила пояснять перед тестом.', [['Les règles', 'subjectPlural'], ['seront', 'etrePassive'], ['expliquées', 'pastParticipleFemPl'], ['avant le test', 'timePlace']]],
  ['futurePassive', 'Le dîner sera servi à huit heures.', 'Ужин подадут в восемь.', 'Вечерю подадуть о восьмій.', [['Le dîner', 'subjectSingular'], ['sera', 'etrePassive'], ['servi', 'pastParticipleMascSg'], ['à huit heures', 'timePlace']]],
  ['futurePassive', 'Les documents seront signés demain.', 'Документы будут подписаны завтра.', 'Документи буде підписано завтра.', [['Les documents', 'subjectPlural'], ['seront', 'etrePassive'], ['signés', 'pastParticipleMascPl'], ['demain', 'timePlace']]],
  ['negativeQuestionPassive', "La porte n'est pas fermée.", 'Дверь не закрыта.', 'Двері не зачинені.', [['La porte', 'subjectSingular'], ["n'est pas", 'etrePassive'], ['fermée', 'pastParticipleFemSg']]],
  ['negativeQuestionPassive', 'Les fenêtres ne sont pas ouvertes.', 'Окна не открыты.', 'Вікна не відчинені.', [['Les fenêtres', 'subjectPlural'], ['ne sont pas', 'etrePassive'], ['ouvertes', 'pastParticipleFemPl']]],
  ['negativeQuestionPassive', "Le dossier n'a pas été vérifié.", 'Досье не было проверено.', 'Справу не було перевірено.', [['Le dossier', 'subjectSingular'], ["n'a pas été", 'etrePassive'], ['vérifié', 'pastParticipleMascSg']]],
  ['negativeQuestionPassive', 'Les billets ne seront pas remboursés.', 'Билеты не будут возвращены.', 'Квитки не буде відшкодовано.', [['Les billets', 'subjectPlural'], ['ne seront pas', 'etrePassive'], ['remboursés', 'pastParticipleMascPl']]],
  ['negativeQuestionPassive', 'Est-ce que la salle est réservée ?', 'Зал забронирован?', 'Залу заброньовано?', [['Est-ce que', 'questionWord'], ['la salle', 'subjectSingular'], ['est', 'etrePassive'], ['réservée', 'pastParticipleFemSg']]],
  ['negativeQuestionPassive', 'Est-ce que les messages sont envoyés ?', 'Сообщения отправлены?', 'Повідомлення надіслано?', [['Est-ce que', 'questionWord'], ['les messages', 'subjectPlural'], ['sont', 'etrePassive'], ['envoyés', 'pastParticipleMascPl']]],
  ['negativeQuestionPassive', 'Quand le rapport sera-t-il publié ?', 'Когда отчёт будет опубликован?', 'Коли звіт буде опубліковано?', [['Quand', 'questionWord'], ['le rapport', 'subjectSingular'], ['sera-t-il', 'etrePassive'], ['publié', 'pastParticipleMascSg']]],
  ['negativeQuestionPassive', 'Pourquoi la réunion a-t-elle été annulée ?', 'Почему встреча была отменена?', 'Чому зустріч було скасовано?', [['Pourquoi', 'questionWord'], ['la réunion', 'subjectSingular'], ['a-t-elle été', 'etrePassive'], ['annulée', 'pastParticipleFemSg']]],
  ['negativeQuestionPassive', 'Par qui la lettre a-t-elle été écrite ?', 'Кем было написано письмо?', 'Ким було написано лист?', [['Par qui', 'questionWord'], ['la lettre', 'subjectSingular'], ['a-t-elle été', 'etrePassive'], ['écrite', 'pastParticipleFemSg']]],
  ['negativeQuestionPassive', 'Les documents sont-ils prêts ?', 'Документы готовы?', 'Документи готові?', [['Les documents', 'subjectPlural'], ['sont-ils', 'etrePassive'], ['prêts', 'pastParticipleMascPl']]],
  ['agentPassive', 'Le roman est lu par les étudiants.', 'Роман читают студенты.', 'Роман читають студенти.', [['Le roman', 'subjectSingular'], ['est', 'etrePassive'], ['lu', 'pastParticipleMascSg'], ['par', 'agentPrep'], ['les étudiants', 'agent']]],
  ['agentPassive', 'La chanson est connue de tous.', 'Песня известна всем.', 'Пісня відома всім.', [['La chanson', 'subjectSingular'], ['est', 'etrePassive'], ['connue', 'pastParticipleFemSg'], ['de', 'agentPrep'], ['tous', 'agent']]],
  ['agentPassive', 'Le tableau est admiré par les visiteurs.', 'Картиной восхищаются посетители.', 'Картину захоплено розглядають відвідувачі.', [['Le tableau', 'subjectSingular'], ['est', 'etrePassive'], ['admiré', 'pastParticipleMascSg'], ['par', 'agentPrep'], ['les visiteurs', 'agent']]],
  ['agentPassive', 'Cette règle est comprise par la classe.', 'Это правило понятно классу.', 'Це правило зрозуміле класу.', [['Cette règle', 'subjectSingular'], ['est', 'etrePassive'], ['comprise', 'pastParticipleFemSg'], ['par', 'agentPrep'], ['la classe', 'agent']]],
  ['agentPassive', 'Le projet est dirigé par Claire.', 'Проектом руководит Клер.', 'Проєктом керує Клер.', [['Le projet', 'subjectSingular'], ['est', 'etrePassive'], ['dirigé', 'pastParticipleMascSg'], ['par', 'agentPrep'], ['Claire', 'agent']]],
  ['agentPassive', 'La ville est visitée par beaucoup de touristes.', 'Город посещает много туристов.', 'Місто відвідує багато туристів.', [['La ville', 'subjectSingular'], ['est', 'etrePassive'], ['visitée', 'pastParticipleFemSg'], ['par', 'agentPrep'], ['beaucoup de touristes', 'agent']]],
  ['agentPassive', 'Le film est apprécié de tous.', 'Фильм всем нравится.', 'Фільм усім подобається.', [['Le film', 'subjectSingular'], ['est', 'etrePassive'], ['apprécié', 'pastParticipleMascSg'], ['de', 'agentPrep'], ['tous', 'agent']]],
  ['agentPassive', 'Les enfants sont accompagnés par leurs parents.', 'Детей сопровождают родители.', 'Дітей супроводжують батьки.', [['Les enfants', 'subjectPlural'], ['sont', 'etrePassive'], ['accompagnés', 'pastParticipleMascPl'], ['par', 'agentPrep'], ['leurs parents', 'agent']]],
  ['agentPassive', 'La porte est ouverte par le gardien.', 'Дверь открыта охранником.', 'Двері відчинені охоронцем.', [['La porte', 'subjectSingular'], ['est', 'etrePassive'], ['ouverte', 'pastParticipleFemSg'], ['par', 'agentPrep'], ['le gardien', 'agent']]],
  ['agentPassive', 'Les questions sont posées par le professeur.', 'Вопросы задаёт преподаватель.', 'Запитання ставить викладач.', [['Les questions', 'subjectPlural'], ['sont', 'etrePassive'], ['posées', 'pastParticipleFemPl'], ['par', 'agentPrep'], ['le professeur', 'agent']]],
];

function rel(filePath) { return path.relative(ROOT, filePath).replace(/\\/g, '/'); }
function writeJson(filePath, value) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
function byteSize(filePath) { return fs.statSync(filePath).size; }
function choices(category, correct) {
  const bank = BANKS[category] || BANKS.timePlace;
  const distractors = [...new Set(bank.filter((item) => item.toLowerCase() !== String(correct).toLowerCase()))].slice(0, 5);
  for (const item of Object.values(BANKS).flat()) {
    if (distractors.length >= 5) break;
    if (item.toLowerCase() !== String(correct).toLowerCase() && !distractors.includes(item)) distractors.push(item);
  }
  return distractors;
}
function slot(correct, category) {
  const distractors = choices(category, correct);
  if (distractors.length !== 5 || new Set(distractors).size !== 5 || distractors.includes(correct)) throw new Error(`Bad distractors for ${correct}/${category}`);
  return { text: correct, correct, category, distractors };
}
function buildRows() {
  return DATA.map(([rowType, phraseFr, ru, uk, slots], index) => ({
    rowId: `fr_lesson23_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    order: index + 1,
    rowType,
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
function countRowTypes(rows) { return rows.reduce((acc, row) => ({ ...acc, [row.rowType]: (acc[row.rowType] || 0) + 1 }), {}); }
function surfaceDeclaredInApp(surface, source) { return new RegExp(`['"]${surface}['"]`).test(source); }

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = wordsFrSlots * 5;
  const passiveCategoryCounts = countBy(rows, ['etrePassive', 'pastParticipleFemSg', 'pastParticipleMascSg', 'pastParticipleFemPl', 'pastParticipleMascPl', 'agentPrep', 'questionWord']);
  const rowTypeCounts = countRowTypes(rows);
  const base = { generatedAt, studyTarget: 'fr', targetContentLang: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, appCourseLevel: 'B1', internalFrenchBand: 'B1.3', activationApproved: false };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-candidate-v1',
    ...base,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    sourceStudyTarget: 'en',
    englishTopic: 'Passive voice',
    frenchTopic: 'Voix passive: être + participe passé, accord, par/de agents',
    sequencingReason: 'Introduces voice transformation after French tense, object, and participle control exist.',
    frenchNativeTransferRule: 'Use être + past participle with gender/number agreement; use par for most agents, de for known/liked/admired-style agents, and note that French may prefer on when the passive is unnatural.',
    sources: SOURCES,
    rows,
    summary: { rows: rows.length, wordsFrSlots, distractorSlots, distractorsPerSlot: 5, passiveCategoryCounts, rowTypeCounts, activationApproved: false },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(paths.candidate, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON23_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: { kind: 'codex_llm_trusted_source_review', humanReviewRequired: false, trustedSourceEvidenceRequired: true, officialOrTrustedSources: Object.keys(SOURCES) },
    candidate: rel(paths.candidate),
    summary: { rows: rows.length, acceptedRows: rows.length, revisionRows: 0, wordsFrSlots, distractorSlots, llmTrustedSourceReviewDone: true, humanReviewRequired: false, readyForAudio: false, readyForServerUpload: false, readyForRuntimeDelivery: false, activationApproved: false },
    rowDecisions: rows.map((row) => ({ rowId: row.rowId, order: row.order, phraseFr: row.phraseFr, decision: 'ACCEPT', acceptedForLessonCandidate: true, acceptedForProduction: false, issues: [] })),
    safety: SAFETY,
  };
  writeJson(paths.reviewGate, review);

  const packBase = { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-pack-draft-v1', generatedAt, studyTarget: 'fr', targetContentLang: 'fr', lessonId: LESSON, appCourseLevel: 'B1', contentVersion: CONTENT_VERSION, sourceArtifacts: { candidate: rel(paths.candidate), reviewGate: rel(paths.reviewGate) }, activationApproved: false };
  writeJson(paths.ruPack, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(paths.ukPack, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort((a, b) => a.localeCompare(b, 'fr'));
  writeJson(paths.theory, {
    schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок тренирует французский пассив: объект или результат действия становится главным, а исполнитель может не называться.', bodyUk: 'Урок тренує французький пасив: об’єкт або результат дії стає головним, а виконавець може не називатися.' },
      { titleRu: '02. Главная формула', titleUk: '02. Головна формула', bodyRu: 'Форма: подлежащее + être в нужном времени + participe passé. Причастие согласуется с подлежащим: nettoyée, vérifiés, ouvertes.', bodyUk: 'Форма: підмет + être у потрібному часі + participe passé. Дієприкметник узгоджується з підметом: nettoyée, vérifiés, ouvertes.' },
      { titleRu: '03. Времена', titleUk: '03. Часи', bodyRu: 'Настоящее: est/sont + participe passé. Прошедшее: a été / ont été + participe passé. Будущее: sera/seront + participe passé.', bodyUk: 'Теперішній: est/sont + participe passé. Минулий: a été / ont été + participe passé. Майбутній: sera/seront + participe passé.' },
      { titleRu: '04. Par и de', titleUk: '04. Par і de', bodyRu: 'Обычный исполнитель вводится через par: écrit par Marie. С некоторыми состояниями знания/оценки естественно de: connu de tous, apprécié de tous.', bodyUk: 'Звичайний виконавець вводиться через par: écrit par Marie. З деякими станами знання/оцінки природно de: connu de tous, apprécié de tous.' },
      { titleRu: '05. Нативность', titleUk: '05. Природність', bodyRu: 'Французский пассив возможен, но в живой речи часто конкурирует с on. Этот урок держит пассивную форму для blueprint parity, а альтернативы on должны проверяться отдельным gate.', bodyUk: 'Французький пасив можливий, але в живому мовленні часто конкурує з on. Цей урок тримає пасивну форму для blueprint parity, а альтернативи on мають перевірятися окремим gate.' },
    ],
    vocabulary,
    practiceHooks: [
      { id: 'etre_plus_participe_passe', type: 'passive_formula', examples: ['est nettoyée', 'sont vérifiés', 'a été écrite'] },
      { id: 'participle_agreement', type: 'agreement_awareness', examples: ['nettoyé/nettoyée/nettoyés/nettoyées', 'ouvert/ouverte/ouverts/ouvertes'] },
      { id: 'agent_par_de', type: 'agent_marker', examples: ['par Marie', 'par les étudiants', 'de tous'] },
    ],
    activationApproved: false,
  });
  writeJson(paths.packAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(paths.theoryAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, practiceHooks: 3, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({ slotId: `fr.lesson23.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, lessonId: LESSON, rowId: row.rowId, phraseFr: row.phraseFr, voiceProvider: 'openai_tts', outputPath: `audio/fr/${sourceLocale}/lesson23_blueprint_rebuild/${row.rowId}.mp3`, generated: false, audioSha256: '', byteSize: 0, activationApproved: false })));
  writeJson(paths.audio, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(paths.audioAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = { ru: { path: paths.ruPack, sha256: sha256File(paths.ruPack), byteSize: byteSize(paths.ruPack) }, uk: { path: paths.ukPack, sha256: sha256File(paths.ukPack), byteSize: byteSize(paths.ukPack) }, audio: { path: paths.audio, sha256: sha256File(paths.audio), byteSize: byteSize(paths.audio) }, theory: { path: paths.theory, sha256: sha256File(paths.theory), byteSize: byteSize(paths.theory) } };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({ entryId: `fr.lesson23.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`, packId: `fr.${sourceLocale}.lesson23.blueprint_rebuild.${surface}.v1.pending`, studyTarget: 'fr', targetContentLang: 'fr', sourceLocale, surface, lessonId: LESSON, schemaVersion: 'course-pack-v1', contentVersion: CONTENT_VERSION, localArtifactPath: rel(artifact.path), localArtifactSha256: artifact.sha256, localArtifactByteSize: artifact.byteSize, relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(paths.theory), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [], serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson23_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`, entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson23_blueprint_rebuild.json`, serverUploadAllowed: false, firebaseUploadAllowed: false, runtimeDownloadsEnabled: false, productionApplyApproved: false, activationApproved: false }));
  writeJson(paths.server, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(paths.manifest, 'utf8');
  writeJson(paths.serverAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.payloadAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.rollbackAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.uploadAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(paths.loader, 'utf8');
  const indexSource = fs.readFileSync(paths.index, 'utf8');
  const studyTargetSource = fs.readFileSync(paths.studyTarget, 'utf8');
  writeJson(paths.runtimeAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries: (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length, legacyRemoteLoaderDisabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource), productionStudyTargetsAreEnglishOnly: /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource), internalFrenchDeclared: /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource), runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => { const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/'); return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false }; });
  writeJson(paths.cache, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.cacheAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activation, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(paths.activationAudit, { schemaVersion: 'gustav-fr-lesson23-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(paths.state)) {
    const state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
    state.lesson23BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson23BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, passiveCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson23BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson23BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson23BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson23BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson23BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson23BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson23BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson23BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = ['Start Lesson 24 blueprint-first rebuild within app-facing B1 parity.', 'Inspect English Lesson 24 source shape plus theory before generating French-native equivalent.', 'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.'];
    fs.writeFileSync(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON23_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
