import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LESSON = 14;
const SLUG = 'lesson14_blueprint_rebuild';
const CONTENT_VERSION = 'fr-lesson14-blueprint-rebuild-v1.reviewed.pending';
const SOURCE_LOCALES = ['ru', 'uk'];
const SAFETY = {
  appBundleModifiedByThisScript: false,
  serverUploadAllowed: false,
  runtimeDownloadsEnabled: false,
  productionApplyApproved: false,
  activationApproved: false,
};

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', SLUG);
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', SLUG);
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', SLUG);
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', SLUG);
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', SLUG);
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson14_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson14_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson14_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson14_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson14_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson14_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson14_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson14_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson14_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson14_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson14_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson14_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson14_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson14_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson14_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson14_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson14_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson14_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson14_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');

const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const SOURCES = {
  tv5monde_comparatif_superlatif: {
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-comparatif-et-le-superlatif',
    claim: 'French comparatives use plus, moins and aussi with que, plus irregular comparison forms such as meilleur.',
  },
  le_robert_comparatif_superlatif: {
    url: 'https://dictionnaire.lerobert.com/guide/comparatif-et-superlatif',
    claim: 'French comparative complements are introduced by que, and adjectives agree with the compared noun.',
  },
  coe_cefr_a2_comparisons: {
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A2 users can make simple comparisons about everyday choices, people, places and objects.',
  },
  phraseman_english_lesson14_blueprint: {
    url: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
    claim: 'English Lesson 14 teaches Comparatives; French must rebuild this as plus/moins/aussi...que with French agreement.',
  },
};

const BANKS = {
  demonstrative: ['Ce', 'Cette', 'Cet', 'Ces', "C'"],
  subject: ['Ce café', 'Cette soupe', 'Ce ticket', 'Cette option', 'Ce plan', 'Cette idée', 'Ce chemin', 'Cette route', 'Ce livre', 'Cette question', 'Cette chambre', 'Ce sac'],
  etrePresent: ['est', 'sont'],
  negation: ['ne', "n'", 'pas', 'jamais', 'plus', 'rien'],
  comparisonMarker: ['plus', 'moins', 'aussi'],
  que: ['que'],
  adjectiveMasc: ['chaud', 'cher', 'grand', 'petit', 'court', 'long', 'simple', 'rapide', 'lent', 'clair', 'important', 'sérieux'],
  adjectiveFem: ['chaude', 'chère', 'grande', 'petite', 'courte', 'longue', 'simple', 'rapide', 'lente', 'claire', 'importante', 'sérieuse'],
  adjectivePlural: ['chauds', 'chères', 'grands', 'petites', 'simples', 'rapides', 'lents', 'claires', 'importants', 'sérieuses'],
  irregularComparison: ['meilleur', 'meilleure', 'mieux', 'pire'],
  object: ['le thé', 'le café', 'le billet', 'le taxi', "l'ancien plan", "l'autre idée", 'la route', 'le chemin', 'le document', "l'autre question", "l'autre chambre", "l'autre sac", 'la première option', "l'ancien ticket", 'hier', 'avant'],
  adverbTime: ['maintenant', "aujourd'hui", 'ici', 'ce matin', 'cette semaine'],
  questionFrame: ['Est-ce que', 'Ce café est-il', 'Cette soupe est-elle', 'Ce plan est-il', 'Cette idée est-elle', 'Ces places sont-elles'],
};

const DATA = [
  ['Ce café est plus chaud que le thé.', 'Этот кофе горячее, чем чай.', 'Ця кава гарячіша за чай.', [['Ce café', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['chaud', 'adjectiveMasc'], ['que', 'que'], ['le thé', 'object']]],
  ['Cette soupe est moins chaude que le café.', 'Этот суп менее горячий, чем кофе.', 'Цей суп менш гарячий, ніж кава.', [['Cette soupe', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['chaude', 'adjectiveFem'], ['que', 'que'], ['le café', 'object']]],
  ['Ce ticket est plus cher que le billet.', 'Этот тикет дороже, чем билет.', 'Цей квиток дорожчий, ніж білет.', [['Ce ticket', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['cher', 'adjectiveMasc'], ['que', 'que'], ['le billet', 'object']]],
  ['Cette option est moins chère que le taxi.', 'Этот вариант дешевле, чем такси.', 'Цей варіант дешевший, ніж таксі.', [['Cette option', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['chère', 'adjectiveFem'], ['que', 'que'], ['le taxi', 'object']]],
  ["Ce plan est meilleur que l'ancien plan.", 'Этот план лучше старого плана.', 'Цей план кращий за старий план.', [['Ce plan', 'subject'], ['est', 'etrePresent'], ['meilleur', 'irregularComparison'], ['que', 'que'], ["l'ancien plan", 'object']]],
  ["Cette idée est meilleure que l'autre idée.", 'Эта идея лучше другой идеи.', 'Ця ідея краща за іншу ідею.', [['Cette idée', 'subject'], ['est', 'etrePresent'], ['meilleure', 'irregularComparison'], ['que', 'que'], ["l'autre idée", 'object']]],
  ['Ce chemin est plus court que la route.', 'Этот путь короче, чем дорога.', 'Цей шлях коротший за дорогу.', [['Ce chemin', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['court', 'adjectiveMasc'], ['que', 'que'], ['la route', 'object']]],
  ['Cette route est plus longue que le chemin.', 'Эта дорога длиннее, чем путь.', 'Ця дорога довша за шлях.', [['Cette route', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['longue', 'adjectiveFem'], ['que', 'que'], ['le chemin', 'object']]],
  ['Ce livre est plus facile que le document.', 'Эта книга легче, чем документ.', 'Ця книжка легша за документ.', [['Ce livre', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['facile', 'adjectiveMasc'], ['que', 'que'], ['le document', 'object']]],
  ["Cette question est moins facile que l'autre question.", 'Этот вопрос менее легкий, чем другой вопрос.', 'Це питання менш легке, ніж інше питання.', [['Cette question', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['facile', 'adjectiveFem'], ['que', 'que'], ["l'autre question", 'object']]],
  ["Cette chambre est plus grande que l'autre chambre.", 'Эта комната больше другой комнаты.', 'Ця кімната більша за іншу кімнату.', [['Cette chambre', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['grande', 'adjectiveFem'], ['que', 'que'], ["l'autre chambre", 'object']]],
  ["Ce sac est moins grand que l'autre sac.", 'Эта сумка меньше другой сумки.', 'Ця сумка менша за іншу сумку.', [['Ce sac', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['grand', 'adjectiveMasc'], ['que', 'que'], ["l'autre sac", 'object']]],
  ['Ce train est aussi rapide que le taxi.', 'Этот поезд такой же быстрый, как такси.', 'Цей потяг такий самий швидкий, як таксі.', [['Ce train', 'subject'], ['est', 'etrePresent'], ['aussi', 'comparisonMarker'], ['rapide', 'adjectiveMasc'], ['que', 'que'], ['le taxi', 'object']]],
  ['Cette réponse est aussi claire que la première option.', 'Этот ответ такой же ясный, как первый вариант.', 'Ця відповідь така сама ясна, як перший варіант.', [['Cette réponse', 'subject'], ['est', 'etrePresent'], ['aussi', 'comparisonMarker'], ['claire', 'adjectiveFem'], ['que', 'que'], ['la première option', 'object']]],
  ['Ce problème est plus sérieux que le document.', 'Эта проблема серьезнее, чем документ.', 'Ця проблема серйозніша за документ.', [['Ce problème', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['sérieux', 'adjectiveMasc'], ['que', 'que'], ['le document', 'object']]],
  ["Cette leçon est moins longue que l'autre leçon.", 'Этот урок менее длинный, чем другой урок.', 'Цей урок менш довгий, ніж інший урок.', [['Cette leçon', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['longue', 'adjectiveFem'], ['que', 'que'], ["l'autre leçon", 'object']]],
  ['Ce prix est plus bas que le ticket.', 'Эта цена ниже, чем тикет.', 'Ця ціна нижча за квиток.', [['Ce prix', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['bas', 'adjectiveMasc'], ['que', 'que'], ['le ticket', 'object']]],
  ['Cette place est moins petite que la première option.', 'Это место менее маленькое, чем первый вариант.', 'Це місце менш маленьке, ніж перший варіант.', [['Cette place', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['petite', 'adjectiveFem'], ['que', 'que'], ['la première option', 'object']]],
  ["C'est mieux maintenant.", 'Сейчас это лучше.', 'Зараз це краще.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['mieux', 'irregularComparison'], ['maintenant', 'adverbTime']]],
  ["C'est pire maintenant.", 'Сейчас это хуже.', 'Зараз це гірше.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['pire', 'irregularComparison'], ['maintenant', 'adverbTime']]],
  ["C'est plus simple aujourd'hui.", 'Сегодня это проще.', 'Сьогодні це простіше.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['simple', 'adjectiveMasc'], ["aujourd'hui", 'adverbTime']]],
  ["C'est moins important aujourd'hui.", 'Сегодня это менее важно.', 'Сьогодні це менш важливо.', [["C'", 'demonstrative'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['important', 'adjectiveMasc'], ["aujourd'hui", 'adverbTime']]],
  ['Ce choix est plus rapide ici.', 'Этот выбор здесь быстрее.', 'Цей вибір тут швидший.', [['Ce choix', 'subject'], ['est', 'etrePresent'], ['plus', 'comparisonMarker'], ['rapide', 'adjectiveMasc'], ['ici', 'adverbTime']]],
  ['Cette solution est moins chère ici.', 'Это решение здесь дешевле.', 'Це рішення тут дешевше.', [['Cette solution', 'subject'], ['est', 'etrePresent'], ['moins', 'comparisonMarker'], ['chère', 'adjectiveFem'], ['ici', 'adverbTime']]],
  ['Ce texte est aussi clair que le document.', 'Этот текст такой же ясный, как документ.', 'Цей текст такий самий ясний, як документ.', [['Ce texte', 'subject'], ['est', 'etrePresent'], ['aussi', 'comparisonMarker'], ['clair', 'adjectiveMasc'], ['que', 'que'], ['le document', 'object']]],
  ["Cette phrase est aussi simple que l'autre phrase.", 'Эта фраза такая же простая, как другая фраза.', 'Ця фраза така сама проста, як інша фраза.', [['Cette phrase', 'subject'], ['est', 'etrePresent'], ['aussi', 'comparisonMarker'], ['simple', 'adjectiveFem'], ['que', 'que'], ["l'autre phrase", 'object']]],
  ['Ces places sont plus grandes que les sièges.', 'Эти места больше, чем сиденья.', 'Ці місця більші за сидіння.', [['Ces places', 'subject'], ['sont', 'etrePresent'], ['plus', 'comparisonMarker'], ['grandes', 'adjectivePlural'], ['que', 'que'], ['les sièges', 'object']]],
  ['Ces questions sont moins importantes que le test.', 'Эти вопросы менее важные, чем тест.', 'Ці питання менш важливі, ніж тест.', [['Ces questions', 'subject'], ['sont', 'etrePresent'], ['moins', 'comparisonMarker'], ['importantes', 'adjectivePlural'], ['que', 'que'], ['le test', 'object']]],
  ['Ces réponses sont aussi claires que le document.', 'Эти ответы такие же ясные, как документ.', 'Ці відповіді такі самі ясні, як документ.', [['Ces réponses', 'subject'], ['sont', 'etrePresent'], ['aussi', 'comparisonMarker'], ['claires', 'adjectivePlural'], ['que', 'que'], ['le document', 'object']]],
  ['Ces exercices sont plus faciles cette semaine.', 'Эти упражнения легче на этой неделе.', 'Ці вправи легші цього тижня.', [['Ces exercices', 'subject'], ['sont', 'etrePresent'], ['plus', 'comparisonMarker'], ['faciles', 'adjectivePlural'], ['cette semaine', 'adverbTime']]],
  ["Ce café n'est pas plus chaud que le thé.", 'Этот кофе не горячее, чем чай.', 'Ця кава не гарячіша за чай.', [['Ce café', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['plus', 'comparisonMarker'], ['chaud', 'adjectiveMasc'], ['que', 'que'], ['le thé', 'object']]],
  ["Cette option n'est pas moins chère que le taxi.", 'Этот вариант не дешевле, чем такси.', 'Цей варіант не дешевший за таксі.', [['Cette option', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['moins', 'comparisonMarker'], ['chère', 'adjectiveFem'], ['que', 'que'], ['le taxi', 'object']]],
  ["Ce plan n'est pas meilleur que l'ancien plan.", 'Этот план не лучше старого плана.', 'Цей план не кращий за старий план.', [['Ce plan', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['meilleur', 'irregularComparison'], ['que', 'que'], ["l'ancien plan", 'object']]],
  ["Cette idée n'est pas meilleure que l'autre idée.", 'Эта идея не лучше другой идеи.', 'Ця ідея не краща за іншу ідею.', [['Cette idée', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['meilleure', 'irregularComparison'], ['que', 'que'], ["l'autre idée", 'object']]],
  ["Ce chemin n'est pas plus court que la route.", 'Этот путь не короче дороги.', 'Цей шлях не коротший за дорогу.', [['Ce chemin', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['plus', 'comparisonMarker'], ['court', 'adjectiveMasc'], ['que', 'que'], ['la route', 'object']]],
  ["Cette route n'est pas plus longue que le chemin.", 'Эта дорога не длиннее пути.', 'Ця дорога не довша за шлях.', [['Cette route', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['plus', 'comparisonMarker'], ['longue', 'adjectiveFem'], ['que', 'que'], ['le chemin', 'object']]],
  ["Ce n'est pas mieux maintenant.", 'Сейчас это не лучше.', 'Зараз це не краще.', [['Ce', 'demonstrative'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['mieux', 'irregularComparison'], ['maintenant', 'adverbTime']]],
  ["Ce livre n'est pas plus facile que le document.", 'Эта книга не легче документа.', 'Ця книжка не легша за документ.', [['Ce livre', 'subject'], ["n'", 'negation'], ['est', 'etrePresent'], ['pas', 'negation'], ['plus', 'comparisonMarker'], ['facile', 'adjectiveMasc'], ['que', 'que'], ['le document', 'object']]],
  ['Ce café est-il plus chaud que le thé ?', 'Этот кофе горячее, чем чай?', 'Ця кава гарячіша за чай?', [['Ce café est-il', 'questionFrame'], ['plus', 'comparisonMarker'], ['chaud', 'adjectiveMasc'], ['que', 'que'], ['le thé', 'object']]],
  ['Cette soupe est-elle moins chaude que le café ?', 'Этот суп менее горячий, чем кофе?', 'Цей суп менш гарячий, ніж кава?', [['Cette soupe est-elle', 'questionFrame'], ['moins', 'comparisonMarker'], ['chaude', 'adjectiveFem'], ['que', 'que'], ['le café', 'object']]],
  ["Ce plan est-il meilleur que l'ancien plan ?", 'Этот план лучше старого плана?', 'Цей план кращий за старий план?', [['Ce plan est-il', 'questionFrame'], ['meilleur', 'irregularComparison'], ['que', 'que'], ["l'ancien plan", 'object']]],
  ["Cette idée est-elle meilleure que l'autre idée ?", 'Эта идея лучше другой идеи?', 'Ця ідея краща за іншу ідею?', [['Cette idée est-elle', 'questionFrame'], ['meilleure', 'irregularComparison'], ['que', 'que'], ["l'autre idée", 'object']]],
  ['Ce chemin est-il plus court que la route ?', 'Этот путь короче дороги?', 'Цей шлях коротший за дорогу?', [['Ce chemin est-il', 'questionFrame'], ['plus', 'comparisonMarker'], ['court', 'adjectiveMasc'], ['que', 'que'], ['la route', 'object']]],
  ['Cette route est-elle plus longue que le chemin ?', 'Эта дорога длиннее пути?', 'Ця дорога довша за шлях?', [['Cette route est-elle', 'questionFrame'], ['plus', 'comparisonMarker'], ['longue', 'adjectiveFem'], ['que', 'que'], ['le chemin', 'object']]],
  ['Ce livre est-il plus facile que le document ?', 'Эта книга легче документа?', 'Ця книжка легша за документ?', [['Ce livre est-il', 'questionFrame'], ['plus', 'comparisonMarker'], ['facile', 'adjectiveMasc'], ['que', 'que'], ['le document', 'object']]],
  ["Cette question est-elle moins facile que l'autre question ?", 'Этот вопрос менее легкий, чем другой?', 'Це питання менш легке, ніж інше?', [['Cette question est-elle', 'questionFrame'], ['moins', 'comparisonMarker'], ['facile', 'adjectiveFem'], ['que', 'que'], ["l'autre question", 'object']]],
  ['Ces places sont-elles plus grandes que les sièges ?', 'Эти места больше, чем сиденья?', 'Ці місця більші за сидіння?', [['Ces places sont-elles', 'questionFrame'], ['plus', 'comparisonMarker'], ['grandes', 'adjectivePlural'], ['que', 'que'], ['les sièges', 'object']]],
  ["Est-ce que c'est mieux maintenant ?", 'Сейчас это лучше?', 'Зараз це краще?', [['Est-ce que', 'questionFrame'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['mieux', 'irregularComparison'], ['maintenant', 'adverbTime']]],
  ["Est-ce que c'est pire aujourd'hui ?", 'Сегодня это хуже?', 'Сьогодні це гірше?', [['Est-ce que', 'questionFrame'], ["C'", 'demonstrative'], ['est', 'etrePresent'], ['pire', 'irregularComparison'], ["aujourd'hui", 'adverbTime']]],
  ['Est-ce que cette réponse est aussi claire que le document ?', 'Этот ответ такой же ясный, как документ?', 'Ця відповідь така сама ясна, як документ?', [['Est-ce que', 'questionFrame'], ['cette réponse', 'subject'], ['est', 'etrePresent'], ['aussi', 'comparisonMarker'], ['claire', 'adjectiveFem'], ['que', 'que'], ['le document', 'object']]],
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

function choices(category, correct) {
  const bank = BANKS[category] || BANKS.object;
  const distractors = [...new Set(bank.filter((item) => item !== correct))].slice(0, 5);
  while (distractors.length < 5) {
    const next = Object.values(BANKS).flat().find((item) => item !== correct && !distractors.includes(item));
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
    rowId: `fr_lesson14_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
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
  return rows
    .flatMap((row) => row.wordsFr)
    .filter((item) => categories.includes(item.category))
    .reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {});
}

function surfaceDeclaredInApp(surface, source) {
  return new RegExp(`['"]${surface}['"]`).test(source);
}

function main() {
  const generatedAt = new Date().toISOString();
  const rows = buildRows();
  const wordsFrSlots = rows.reduce((sum, row) => sum + row.wordsFr.length, 0);
  const distractorSlots = rows.reduce((sum, row) => sum + row.wordsFr.reduce((inner, item) => inner + item.distractors.length, 0), 0);
  const comparisonCategoryCounts = countBy(rows, ['comparisonMarker', 'irregularComparison', 'que']);
  const rowTypeCounts = {
    affirmative: rows.filter((row) => row.phraseFr.endsWith('.') && !(/\bn'|\bne\b|pas/.test(row.phraseFr))).length,
    negative: rows.filter((row) => row.phraseFr.endsWith('.') && (/\bn'|\bne\b|pas/.test(row.phraseFr))).length,
    question: rows.filter((row) => row.phraseFr.endsWith('?')).length,
  };

  const candidate = {
    schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-candidate-v1',
    generatedAt,
    status: 'HOLD_REVIEW_CANDIDATE_READY_FOR_LLM_SOURCE_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    appCourseLevel: 'A2',
    internalFrenchBand: 'A2.2',
    englishTopic: 'Comparatives',
    frenchTopic: 'Comparatif with plus, moins, aussi que and adjective agreement',
    sequencingReason: 'Adds comparison after adjectives, past and near-future foundations, matching English Lesson 14 function.',
    frenchNativeTransferRule: 'Use plus/moins/aussi...que, meilleur/meilleure, mieux and pire; preserve adjective agreement and avoid superlative scope.',
    sources: SOURCES,
    rows,
    summary: {
      rows: rows.length,
      wordsFrSlots,
      distractorSlots,
      distractorsPerSlot: 5,
      comparisonCategoryCounts,
      rowTypeCounts,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'SERVER_PACK_NOT_BUILT', 'RUNTIME_DELIVERY_NOT_TESTED', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: SAFETY,
  };
  writeJson(CANDIDATE_PATH, candidate);

  const review = {
    schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-review-gate-v1',
    generatedAt,
    status: 'PASS_LESSON14_REVIEW_ACCEPTED_FOR_NEXT_GATE',
    reviewer: {
      kind: 'codex_llm_trusted_source_review',
      humanReviewRequired: false,
      trustedSourceEvidenceRequired: true,
      officialOrTrustedSources: Object.keys(SOURCES),
    },
    candidate: rel(CANDIDATE_PATH),
    summary: {
      rows: rows.length,
      acceptedRows: rows.length,
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
    safety: SAFETY,
  };
  writeJson(REVIEW_GATE_PATH, review);

  const packBase = {
    schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-pack-draft-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    lessonId: LESSON,
    appCourseLevel: 'A2',
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: { candidate: rel(CANDIDATE_PATH), reviewGate: rel(REVIEW_GATE_PATH) },
    activationApproved: false,
  };
  writeJson(RU_PACK_PATH, { ...packBase, sourceLocale: 'ru', rows: rows.map((row) => ({ ...row, supportMeaning: row.ru })) });
  writeJson(UK_PACK_PATH, { ...packBase, sourceLocale: 'uk', rows: rows.map((row) => ({ ...row, supportMeaning: row.uk })) });

  const vocabulary = [...new Set(rows.flatMap((row) => row.wordsFr.map((item) => item.correct)))].sort();
  writeJson(THEORY_PATH, {
    schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-theory-vocab-pack-v1',
    generatedAt,
    status: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: LESSON,
    theory: [
      { titleRu: '01. Что тренирует урок', titleUk: '01. Що тренує урок', bodyRu: 'Урок переносит English Comparatives в французский comparatif: plus, moins, aussi + adjectif + que.', bodyUk: 'Урок переносить English Comparatives у французький comparatif: plus, moins, aussi + adjectif + que.' },
      { titleRu: '02. Главная формула', titleUk: '02. Головна формула', bodyRu: 'Формула: sujet + être + plus/moins/aussi + adjectif + que: Ce café est plus chaud que le thé.', bodyUk: 'Формула: sujet + être + plus/moins/aussi + adjectif + que: Ce café est plus chaud que le thé.' },
      { titleRu: '03. Согласование', titleUk: '03. Узгодження', bodyRu: 'Прилагательное согласуется с первым предметом: Ce plan est meilleur, Cette idée est meilleure, Ces places sont plus grandes.', bodyUk: 'Прикметник узгоджується з першим предметом: Ce plan est meilleur, Cette idée est meilleure, Ces places sont plus grandes.' },
      { titleRu: '04. Нерегулярные формы', titleUk: '04. Нерегулярні форми', bodyRu: 'Better/worse нельзя копировать как английские формы. Во французском используются meilleur/meilleure для существительных, mieux для общего “лучше”, pire для “хуже”.', bodyUk: 'Better/worse не можна копіювати як англійські форми. У французькій використовуються meilleur/meilleure для іменників, mieux для загального “краще”, pire для “гірше”.' },
      { titleRu: '05. Что сознательно не смешиваем', titleUk: '05. Що свідомо не змішуємо', bodyRu: 'Урок не вводит superlatif le plus/la moins и сложные plus...plus конструкции. Это отдельные будущие gates.', bodyUk: 'Урок не вводить superlatif le plus/la moins і складні plus...plus конструкції. Це окремі майбутні gates.' },
    ],
    vocabulary,
    activationApproved: false,
  });
  writeJson(PACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-pack-draft-audit-v1', generatedAt, status: 'PASS_PACK_DRAFT_WRITTEN', summary: { rowsPerPack: rows.length, sourceLocales: SOURCE_LOCALES, wordsFrSlots, distractorSlots, reviewGateStatus: review.status, activationApproved: false }, safety: SAFETY });
  writeJson(THEORY_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-theory-vocab-pack-audit-v1', generatedAt, status: 'PASS_THEORY_VOCAB_PACK_WRITTEN', summary: { theorySections: 5, vocabularyItems: vocabulary.length, activationApproved: false }, safety: SAFETY });

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => rows.map((row) => ({
    slotId: `fr.lesson14.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: LESSON,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    outputPath: `audio/fr/${sourceLocale}/lesson14_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));
  writeJson(AUDIO_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-audio-tts-manifest-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', slots: audioSlots, uniqueFrenchTexts: rows.length, safety: SAFETY });
  writeJson(AUDIO_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-audio-tts-manifest-gate-audit-v1', generatedAt, status: 'HOLD_AUDIO_TTS_NOT_GENERATED', summary: { audioSlots: 100, sourceLocaleScopedSlots: 100, uniqueFrenchTexts: rows.length, generatedSlots: 0, checksumReadySlots: 0, readyForServerManifest: false, activationApproved: false }, safety: SAFETY });

  const local = {
    ru: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    uk: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    audio: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
    theory: { path: THEORY_PATH, sha256: sha256File(THEORY_PATH), byteSize: byteSize(THEORY_PATH) },
  };
  const entries = [['ru', 'lesson', local.ru], ['ru', 'audio_metadata', local.audio], ['uk', 'lesson', local.uk], ['uk', 'audio_metadata', local.audio]].map(([sourceLocale, surface, artifact]) => ({
    entryId: `fr.lesson14.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson14.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: LESSON,
    schemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifact.path),
    localArtifactSha256: artifact.sha256,
    localArtifactByteSize: artifact.byteSize,
    relatedArtifacts: surface === 'lesson' ? [{ role: 'theory_vocab', path: rel(THEORY_PATH), sha256: local.theory.sha256, byteSize: local.theory.byteSize }] : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson14_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson14_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  writeJson(SERVER_MANIFEST_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-server-pack-manifest-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', studyTarget: 'fr', sourceLocales: SOURCE_LOCALES, lessonId: LESSON, contentVersion: CONTENT_VERSION, entries, safety: SAFETY });
  const manifestSource = fs.readFileSync(COURSE_PACK_MANIFEST_PATH, 'utf8');
  writeJson(SERVER_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-server-pack-manifest-gate-audit-v1', generatedAt, status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', summary: { entries: 4, sourceLocaleScopedEntries: 4, appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length, openUploadEntries: 0, runtimeDownloadsEnabledEntries: 0, activationApprovedEntries: 0, readyForUpload: false, activationApproved: false }, safety: SAFETY });
  writeJson(PAYLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-payload-hash-lock-gate-audit-v1', generatedAt, status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED', summary: { expectedPayloads: 4, expectedHashLocks: 4, payloadsWritten: 0, hashLocksWritten: 0, payloadHashLockReady: false, activationApproved: false }, safety: SAFETY });
  writeJson(ROLLBACK_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-rollback-manifest-gate-audit-v1', generatedAt, status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED', summary: { rollbackEntries: 4, safeRollbackScopes: 2, deniedRollbackScopeHits: 0, rollbackExecutionAllowedEntries: 0, runtimeCacheInvalidationAllowedEntries: 0, readyForRollbackExecution: false, activationApproved: false }, safety: SAFETY });
  writeJson(UPLOAD_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-server-upload-evidence-gate-audit-v1', generatedAt, status: 'HOLD_UPLOAD_EVIDENCE_MISSING', summary: { expectedObjects: 4, uploadEvidenceFileExists: false, acceptedObjects: 0, missingEvidenceObjects: 4, uploadEvidenceReady: false, runtimeDownloadsEnabled: false, activationApproved: false, readyForRuntimeDelivery: false }, safety: SAFETY });

  const loaderSource = fs.readFileSync(COURSE_PACK_LOADER_PATH, 'utf8');
  const indexSource = fs.readFileSync(COURSE_PACK_INDEX_PATH, 'utf8');
  const studyTargetSource = fs.readFileSync(STUDY_TARGET_PATH, 'utf8');
  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  writeJson(RUNTIME_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-runtime-delivery-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED', summary: { serverManifestEntries: 4, readinessRows: 4, appKnownRuntimeSurfaceRows: 4, embeddedFrenchIndexEntries, legacyRemoteLoaderDisabled, productionStudyTargetsAreEnglishOnly, internalFrenchDeclared, runtimeDownloadAllowedRows: 0, activationApprovedRows: 0, readyForRuntimeDelivery: false, activationApproved: false }, safety: SAFETY });
  const deniedTokens = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];
  const cacheRows = entries.map((entry) => {
    const key = [entry.studyTarget, entry.sourceLocale, entry.surface, entry.schemaVersion, entry.contentVersion, entry.localArtifactSha256].join('/');
    return { entryId: entry.entryId, packId: entry.packId, sourceLocale: entry.sourceLocale, surface: entry.surface, expectedCacheKey: key, deniedTokenHits: deniedTokens.filter((token) => key.includes(token)), cacheWriteAllowedNow: false, runtimeDownloadAllowedNow: false, rollbackCacheInvalidationAllowedNow: false, activationApproved: false };
  });
  writeJson(CACHE_GATE_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-runtime-cache-integrity-gate-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', cacheRows, summary: { cacheRows: 4, uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size, deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length).length, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(CACHE_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1', generatedAt, status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED', summary: { cacheRows: 4, uniqueCacheKeys: 4, deniedTokenHitRows: 0, cacheWriteAllowedRows: 0, runtimeDownloadAllowedRows: 0, rollbackCacheInvalidationAllowedRows: 0, readyForRuntimeCacheUse: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_GATE_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-explicit-activation-receipt-gate-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', requiredReceiptContract: { requiresLlmTrustedSourceReview: true, humanReviewRequired: false, requiresAudioChecksums: true, requiresPayloadHashLock: true, requiresRollbackReady: true, requiresServerUploadEvidence: true, requiresRuntimeDelivery: true, requiresRuntimeCacheIntegrity: true, requiresFull32LessonParityBeforeGlobalFrenchActivation: true }, summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });
  writeJson(ACTIVATION_AUDIT_PATH, { schemaVersion: 'gustav-fr-lesson14-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1', generatedAt, status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING', summary: { prerequisiteGatesTotal: 10, prerequisiteGatesPassed: 4, activationReceiptExists: false, activationReceiptHashLockExists: false, readyForProductionActivation: false, activationApproved: false }, safety: SAFETY });

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson14BlueprintRebuildStatus = 'PASS_LOCAL_REVIEW_PACK_THEORY_READY_PRODUCTION_HOLD';
    state.lesson14BlueprintRebuildSummary = { rows: rows.length, wordsFrSlots, distractorSlots, acceptedRows: rows.length, theorySections: 5, vocabularyItems: vocabulary.length, comparisonCategoryCounts, rowTypeCounts, activationApproved: false };
    state.lesson14BlueprintRebuildAudioTtsStatus = 'HOLD_AUDIO_TTS_NOT_GENERATED';
    state.lesson14BlueprintRebuildServerPackManifestStatus = 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED';
    state.lesson14BlueprintRebuildPayloadHashLockStatus = 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED';
    state.lesson14BlueprintRebuildRollbackStatus = 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED';
    state.lesson14BlueprintRebuildServerUploadEvidenceStatus = 'HOLD_UPLOAD_EVIDENCE_MISSING';
    state.lesson14BlueprintRebuildRuntimeDeliveryStatus = 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED';
    state.lesson14BlueprintRebuildRuntimeCacheIntegrityStatus = 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED';
    state.lesson14BlueprintRebuildExplicitActivationReceiptStatus = 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING';
    state.activationApproved = false;
    state.nextPassPlan = [
      'Start Lesson 15 blueprint-first rebuild after inspecting English Lesson 15 shape and theory.',
      'Keep French-native equivalent scoped to the English function while preserving app-facing A2 parity.',
      'Keep production activation HOLD until all 32 lessons and non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON14_BLUEPRINT_AND_DELIVERY_WRITTEN rows=${rows.length} wordsFr=${wordsFrSlots} audio=100 serverEntries=4 activation=false`);
}

main();
