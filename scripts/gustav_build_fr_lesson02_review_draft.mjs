import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'planning', 'fr_lesson02_next_pass_work_order_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const JSON_PATH = path.join(OUT_DIR, 'lesson02_full_review_draft.json');
const MD_PATH = path.join(OUT_DIR, 'lesson02_full_review_draft.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const sourceEvidence = [
  {
    id: 'coe_cefr_a1_global_scale',
    title: 'Council of Europe CEFR A1 global scale',
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale',
    claimCovered: 'A1 supports very basic phrases, simple interaction, and asking/answering simple questions.',
  },
  {
    id: 'tv5monde_negation',
    title: 'TV5MONDE grammar: la negation',
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-la-negation-0',
    claimCovered: 'Simple French negation uses subject + ne/n\' + conjugated verb + pas.',
  },
  {
    id: 'tv5monde_answering_negative_question',
    title: 'TV5MONDE grammar: reponse a une question',
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-reponse-une-question',
    claimCovered: 'A negative question can be answered with si/non and basic ne...pas patterns.',
  },
  {
    id: 'le_robert_etre_present',
    title: 'Le Robert conjugation: etre',
    url: 'https://dictionnaire.lerobert.com/conjugaison/etre',
    claimCovered: 'Present forms: je suis, tu es, il/elle est, nous sommes, vous etes, ils/elles sont.',
  },
  {
    id: 'lawless_est_ce_que',
    title: 'Lawless French: Est-ce que',
    url: 'https://www.lawlessfrench.com/expressions/est-ce-que/',
    claimCovered: 'Est-ce que is a standard yes/no question frame in French.',
  },
];

const distractorBanks = {
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'Moi', 'Toi'],
  'verb-etre': ['suis', 'es', 'est', 'sommes', 'etes', 'sont', 'etre'],
  negation: ['ne ... pas', "n' ... pas", 'pas', 'ne', 'non', 'si'],
  adjective: ['pret', 'prete', 'calme', 'content', 'contente', 'important', 'facile', 'bon', 'francais', 'francaise'],
  adverb: ['ici', 'la', 'ensemble', 'bien', 'un peu', 'maintenant'],
  demonstrative: ["c'est", "ce n'est pas", 'ce', 'cela', 'ca', 'voila'],
  'question-frame': ['Est-ce que', "Est-ce qu'", 'Comment', 'Ou', 'Qui', 'Quand'],
  'verb-parler': ['parle', 'parles', 'parlez', 'comprends', 'habite', 'viens'],
  'verb-comprendre': ['comprends', 'comprenez', 'comprend', 'parle', 'viens', 'habite'],
  'verb-venir': ['viens', 'vient', 'venez', 'habite', 'parle', 'suis'],
  'verb-habiter': ['habite', 'habitez', 'habitent', 'viens', 'parle', 'suis'],
  preposition: ['de', 'a', 'en', 'dans', 'avec', 'pour'],
  noun: ['etudiant', 'etudiante', 'professeur', 'ami', 'amie', 'francais'],
  possessive: ['mon', 'ton', 'son', 'ma', 'ta', 'sa'],
  city: ['Paris', 'Lyon', 'Kyiv', 'Marseille', 'Bruxelles', 'Geneve'],
  conjunction: ['mais', 'et', 'ou', 'donc', 'parce que', 'avec'],
};

const orthographyCorrections = [
  ['etes', 'êtes'],
  ['etre', 'être'],
  ['pret', 'prêt'],
  ['prete', 'prête'],
  ['francais', 'français'],
  ['francaise', 'française'],
  ['etudiant', 'étudiant'],
  ['etudiante', 'étudiante'],
  [' a ', ' à '],
  [' a Lyon', ' à Lyon'],
  ['Ou', 'Où'],
  ['Ca', 'Ça'],
  ['Geneve', 'Genève'],
  ['la', 'là'],
];

const bannedFrenchFragments = [
  'etes',
  'etre',
  'pret',
  'prete',
  'francais',
  'francaise',
  'etudiant',
  'etudiante',
  ' a Lyon',
  'Tu es la',
  'Elle est la',
  'Ils sont la',
  'Elles sont la',
];

const rows = [
  ['Je ne suis pas prêt.', 'Я не готов.', 'Я не готовий.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['prêt', 'adjective']]],
  ['Je ne suis pas prête.', 'Я не готова.', 'Я не готова.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['prête', 'adjective']]],
  ["Tu n'es pas ici.", 'Ты не здесь.', 'Ти не тут.', [['Tu', 'pronoun'], ["n' ... pas", 'negation'], ['es', 'verb-etre'], ['ici', 'adverb']]],
  ["Il n'est pas là.", 'Он не здесь.', 'Він не тут.', [['Il', 'pronoun'], ["n' ... pas", 'negation'], ['est', 'verb-etre'], ['là', 'adverb']]],
  ["Elle n'est pas là.", 'Она не здесь.', 'Вона не тут.', [['Elle', 'pronoun'], ["n' ... pas", 'negation'], ['est', 'verb-etre'], ['là', 'adverb']]],
  ['Nous ne sommes pas prêts.', 'Мы не готовы.', 'Ми не готові.', [['Nous', 'pronoun'], ['ne ... pas', 'negation'], ['sommes', 'verb-etre'], ['prêts', 'adjective']]],
  ["Vous n'êtes pas prêt.", 'Вы не готовы.', 'Ви не готові.', [['Vous', 'pronoun'], ["n' ... pas", 'negation'], ['êtes', 'verb-etre'], ['prêt', 'adjective']]],
  ['Ils ne sont pas ici.', 'Они не здесь.', 'Вони не тут.', [['Ils', 'pronoun'], ['ne ... pas', 'negation'], ['sont', 'verb-etre'], ['ici', 'adverb']]],
  ['Elles ne sont pas contentes.', 'Они не довольны.', 'Вони не задоволені.', [['Elles', 'pronoun'], ['ne ... pas', 'negation'], ['sont', 'verb-etre'], ['contentes', 'adjective']]],
  ["Ce n'est pas important.", 'Это не важно.', 'Це не важливо.', [["Ce n'est pas", 'demonstrative'], ['important', 'adjective']]],
  ["Ce n'est pas facile.", 'Это не легко.', 'Це не легко.', [["Ce n'est pas", 'demonstrative'], ['facile', 'adjective']]],
  ["Ce n'est pas bon.", 'Это нехорошо.', 'Це недобре.', [["Ce n'est pas", 'demonstrative'], ['bon', 'adjective']]],
  ['Je ne suis pas étudiant.', 'Я не студент.', 'Я не студент.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['étudiant', 'noun']]],
  ['Je ne suis pas étudiante.', 'Я не студентка.', 'Я не студентка.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['étudiante', 'noun']]],
  ['Je ne parle pas français.', 'Я не говорю по-французски.', 'Я не говорю французькою.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['parle', 'verb-parler'], ['français', 'noun']]],
  ['Je ne comprends pas.', 'Я не понимаю.', 'Я не розумію.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['comprends', 'verb-comprendre']]],
  ['Je ne viens pas de Paris.', 'Я не из Парижа.', 'Я не з Парижа.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['viens', 'verb-venir'], ['de', 'preposition'], ['Paris', 'city']]],
  ["Je n'habite pas à Lyon.", 'Я не живу в Лионе.', 'Я не живу в Ліоні.', [['Je', 'pronoun'], ["n' ... pas", 'negation'], ['habite', 'verb-habiter'], ['à', 'preposition'], ['Lyon', 'city']]],
  ['Je ne suis pas de Kyiv.', 'Я не из Киева.', 'Я не з Києва.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['de', 'preposition'], ['Kyiv', 'city']]],
  ['Je ne suis pas français.', 'Я не француз.', 'Я не француз.', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['français', 'adjective']]],
  ['Est-ce que tu es prêt ?', 'Ты готов?', 'Ти готовий?', [['Est-ce que', 'question-frame'], ['tu', 'pronoun'], ['es', 'verb-etre'], ['prêt', 'adjective']]],
  ['Est-ce que vous êtes prêt ?', 'Вы готовы?', 'Ви готові?', [['Est-ce que', 'question-frame'], ['vous', 'pronoun'], ['êtes', 'verb-etre'], ['prêt', 'adjective']]],
  ["Est-ce qu'il est ici ?", 'Он здесь?', 'Він тут?', [["Est-ce qu'", 'question-frame'], ['il', 'pronoun'], ['est', 'verb-etre'], ['ici', 'adverb']]],
  ["Est-ce qu'elle est là ?", 'Она здесь?', 'Вона тут?', [["Est-ce qu'", 'question-frame'], ['elle', 'pronoun'], ['est', 'verb-etre'], ['là', 'adverb']]],
  ['Est-ce que nous sommes ensemble ?', 'Мы вместе?', 'Ми разом?', [['Est-ce que', 'question-frame'], ['nous', 'pronoun'], ['sommes', 'verb-etre'], ['ensemble', 'adverb']]],
  ["Est-ce qu'ils sont ici ?", 'Они здесь?', 'Вони тут?', [["Est-ce qu'", 'question-frame'], ['ils', 'pronoun'], ['sont', 'verb-etre'], ['ici', 'adverb']]],
  ["Est-ce qu'elles sont contentes ?", 'Они довольны?', 'Вони задоволені?', [["Est-ce qu'", 'question-frame'], ['elles', 'pronoun'], ['sont', 'verb-etre'], ['contentes', 'adjective']]],
  ["Est-ce que c'est important ?", 'Это важно?', 'Це важливо?', [['Est-ce que', 'question-frame'], ["c'est", 'demonstrative'], ['important', 'adjective']]],
  ["Est-ce que c'est facile ?", 'Это легко?', 'Це легко?', [['Est-ce que', 'question-frame'], ["c'est", 'demonstrative'], ['facile', 'adjective']]],
  ["Est-ce que c'est bon ?", 'Это хорошо?', 'Це добре?', [['Est-ce que', 'question-frame'], ["c'est", 'demonstrative'], ['bon', 'adjective']]],
  ['Tu es prêt ?', 'Ты готов?', 'Ти готовий?', [['Tu', 'pronoun'], ['es', 'verb-etre'], ['prêt', 'adjective']]],
  ['Vous êtes prêts ?', 'Вы готовы?', 'Ви готові?', [['Vous', 'pronoun'], ['êtes', 'verb-etre'], ['prêts', 'adjective']]],
  ['Il est calme ?', 'Он спокоен?', 'Він спокійний?', [['Il', 'pronoun'], ['est', 'verb-etre'], ['calme', 'adjective']]],
  ['Elle est calme ?', 'Она спокойна?', 'Вона спокійна?', [['Elle', 'pronoun'], ['est', 'verb-etre'], ['calme', 'adjective']]],
  ['Nous sommes ensemble ?', 'Мы вместе?', 'Ми разом?', [['Nous', 'pronoun'], ['sommes', 'verb-etre'], ['ensemble', 'adverb']]],
  ['Ils sont là ?', 'Они здесь?', 'Вони тут?', [['Ils', 'pronoun'], ['sont', 'verb-etre'], ['là', 'adverb']]],
  ['Elles sont là ?', 'Они здесь?', 'Вони тут?', [['Elles', 'pronoun'], ['sont', 'verb-etre'], ['là', 'adverb']]],
  ['Est-ce que tu parles français ?', 'Ты говоришь по-французски?', 'Ти говориш французькою?', [['Est-ce que', 'question-frame'], ['tu', 'pronoun'], ['parles', 'verb-parler'], ['français', 'noun']]],
  ['Est-ce que tu comprends ?', 'Ты понимаешь?', 'Ти розумієш?', [['Est-ce que', 'question-frame'], ['tu', 'pronoun'], ['comprends', 'verb-comprendre']]],
  ['Est-ce que vous comprenez ?', 'Вы понимаете?', 'Ви розумієте?', [['Est-ce que', 'question-frame'], ['vous', 'pronoun'], ['comprenez', 'verb-comprendre']]],
  ['Est-ce que tu viens de Paris ?', 'Ты из Парижа?', 'Ти з Парижа?', [['Est-ce que', 'question-frame'], ['tu', 'pronoun'], ['viens', 'verb-venir'], ['de', 'preposition'], ['Paris', 'city']]],
  ['Est-ce que vous habitez à Lyon ?', 'Вы живете в Лионе?', 'Ви живете в Ліоні?', [['Est-ce que', 'question-frame'], ['vous', 'pronoun'], ['habitez', 'verb-habiter'], ['à', 'preposition'], ['Lyon', 'city']]],
  ['Je suis prêt, mais toi ?', 'Я готов, а ты?', 'Я готовий, а ти?', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['prêt', 'adjective'], ['mais', 'conjunction'], ['toi', 'pronoun']]],
  ['Je ne suis pas prêt, et toi ?', 'Я не готов, а ты?', 'Я не готовий, а ти?', [['Je', 'pronoun'], ['ne ... pas', 'negation'], ['suis', 'verb-etre'], ['prêt', 'adjective'], ['et', 'conjunction'], ['toi', 'pronoun']]],
  ["Tu n'es pas étudiant ?", 'Ты не студент?', 'Ти не студент?', [['Tu', 'pronoun'], ["n' ... pas", 'negation'], ['es', 'verb-etre'], ['étudiant', 'noun']]],
  ["Vous n'êtes pas français ?", 'Вы не француз?', 'Ви не француз?', [['Vous', 'pronoun'], ["n' ... pas", 'negation'], ['êtes', 'verb-etre'], ['français', 'adjective']]],
  ["Il n'est pas professeur.", 'Он не преподаватель.', 'Він не викладач.', [['Il', 'pronoun'], ["n' ... pas", 'negation'], ['est', 'verb-etre'], ['professeur', 'noun']]],
  ["Elle n'est pas étudiante.", 'Она не студентка.', 'Вона не студентка.', [['Elle', 'pronoun'], ["n' ... pas", 'negation'], ['est', 'verb-etre'], ['étudiante', 'noun']]],
  ["Ce n'est pas mon ami.", 'Это не мой друг.', 'Це не мій друг.', [["Ce n'est pas", 'demonstrative'], ['mon', 'possessive'], ['ami', 'noun']]],
  ["Est-ce que c'est ton ami ?", 'Это твой друг?', 'Це твій друг?', [['Est-ce que', 'question-frame'], ["c'est", 'demonstrative'], ['ton', 'possessive'], ['ami', 'noun']]],
];

function polishFrench(value) {
  if (value === 'la') return 'là';
  if (value === 'a') return 'à';
  let out = String(value);
  for (const [from, to] of orthographyCorrections) out = out.replaceAll(from, to);
  return out;
}

function normalize(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value));
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(String(value));
}

function distractorsFor(correct, category) {
  const bank = [...(distractorBanks[category] ?? []), 'ici', 'là', 'bien', 'calme', 'simple', 'facile'];
  const out = [];
  const seen = new Set();
  for (const candidate of bank) {
    const polished = polishFrench(candidate);
    if (normalize(polished) === normalize(correct)) continue;
    if (seen.has(normalize(polished))) continue;
    seen.add(normalize(polished));
    out.push(polished);
    if (out.length === 5) return out;
  }
  throw new Error(`Not enough distractors for ${correct} / ${category}`);
}

function buildRows() {
  return rows.map(([french, russian, ukrainian, words], index) => ({
    phraseId: `fr_lesson2_phrase_${String(index + 1).padStart(3, '0')}`,
    lessonId: 2,
    rowNumber: index + 1,
    french: polishFrench(french),
    russian,
    ukrainian,
    wordsFr: words.map(([text, category]) => {
      const polished = polishFrench(text);
      return {
        text: polished,
        correct: polished,
        category,
        distractors: distractorsFor(polished, category),
      };
    }),
    sourceEvidenceIds: sourceEvidence.map((source) => source.id),
  }));
}

function validateDraft(draft) {
  const errors = [];
  if (draft.rows.length !== 50) errors.push(`expected 50 rows, got ${draft.rows.length}`);
  const phraseSet = new Set();
  for (const row of draft.rows) {
    if (row.lessonId !== 2) errors.push(`${row.phraseId}: wrong lessonId`);
    if (phraseSet.has(normalize(row.french))) errors.push(`${row.phraseId}: duplicate French phrase`);
    phraseSet.add(normalize(row.french));
    if (hasCyrillic(row.french)) errors.push(`${row.phraseId}: Cyrillic in French phrase`);
    if (hasMojibake(row.french) || hasMojibake(row.russian) || hasMojibake(row.ukrainian)) errors.push(`${row.phraseId}: mojibake in localized text`);
    for (const fragment of bannedFrenchFragments) {
      if (row.french.includes(fragment)) errors.push(`${row.phraseId}: unpolished French fragment "${fragment}"`);
    }
    if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 2) errors.push(`${row.phraseId}: wordsFr too small`);
    for (const word of row.wordsFr) {
      if (hasCyrillic(word.text) || hasCyrillic(word.correct)) errors.push(`${row.phraseId}: Cyrillic in wordsFr`);
      if (hasMojibake(word.text) || hasMojibake(word.correct) || word.distractors.some(hasMojibake)) errors.push(`${row.phraseId}:${word.text}: mojibake in wordsFr`);
      if (!Array.isArray(word.distractors) || word.distractors.length !== 5) errors.push(`${row.phraseId}:${word.text}: distractor count`);
      if (new Set(word.distractors.map(normalize)).size !== word.distractors.length) errors.push(`${row.phraseId}:${word.text}: duplicate distractor`);
      if (word.distractors.some((item) => normalize(item) === normalize(word.correct))) errors.push(`${row.phraseId}:${word.text}: correct in distractors`);
      if (word.distractors.some(hasCyrillic)) errors.push(`${row.phraseId}:${word.text}: Cyrillic in distractors`);
    }
  }
  const negationRows = draft.rows.filter((row) => /\bne\b|n'|n’|Ce n'est pas/.test(row.french)).length;
  const questionRows = draft.rows.filter((row) => row.french.includes('?') || row.french.includes('Est-ce')).length;
  if (negationRows < 24) errors.push(`expected at least 24 negation rows, got ${negationRows}`);
  if (questionRows < 24) errors.push(`expected at least 24 question rows, got ${questionRows}`);
  return errors;
}

function buildMarkdown(draft) {
  const lines = [
    '# French Lesson 2 Full Review Draft',
    '',
    `Status: ${draft.status}`,
    `Activation approved: ${draft.activationApproved}`,
    `Ready for apply: ${draft.readyForApply}`,
    '',
    '## Lesson Logic',
    '',
    '- App level: A1, lesson 2 of 32.',
    '- English blueprint studied: To be negation and questions, 50 rows, 181 English word slots, same-slot distractors.',
    '- French-native rebuild: ne ... pas, n\' ... pas, Est-ce que / Est-ce qu\', intonation questions, stable tu/vous, and reused Lesson 1 vocabulary.',
    '- This is a review draft only. It is not app bundle content, not uploaded, and not activation-approved.',
    '',
    '## Source Evidence',
    '',
  ];
  for (const source of draft.sourceEvidence) lines.push(`- ${source.id}: ${source.title} - ${source.url}`);
  lines.push('', '## Phrase Rows', '');
  for (const row of draft.rows) {
    lines.push(`### ${String(row.rowNumber).padStart(2, '0')}. ${row.french}`);
    lines.push(`- RU: ${row.russian}`);
    lines.push(`- UK: ${row.ukrainian}`);
    lines.push('');
    lines.push('| wordsFr text | category | distractors |');
    lines.push('| --- | --- | --- |');
    for (const word of row.wordsFr) lines.push(`| ${word.text} | ${word.category} | ${word.distractors.join(', ')} |`);
    lines.push('');
  }
  lines.push('## Safety', '');
  lines.push('- productionAppFilesModifiedByThisScript: false');
  lines.push('- firebaseOrServerUploadStarted: false');
  lines.push('- runtimeDownloadsEnabled: false');
  lines.push('- productionApplyApproved: false');
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
  const blockers = [];
  if (workOrder.status !== 'READY_FOR_LESSON02_REVIEW_DRAFT') blockers.push('lesson02 work order is not ready');

  const draft = {
    schemaVersion: 'gustav-fr-lesson02-full-review-draft-v1',
    generatedAt,
    status: 'REVIEW_DRAFT_HOLD',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    activationApproved: false,
    readyForApply: false,
    sourceEvidence,
    blueprintBasis: {
      englishLessonId: 2,
      englishTopic: workOrder.englishBlueprint.englishTopic,
      englishRowsInspected: workOrder.englishBlueprint.phraseRows,
      englishWordSlotsInspected: workOrder.englishBlueprint.wordsEnSlots,
      frenchNativeScope: ['ne ... pas', "n' ... pas", 'Est-ce que', 'intonation questions', 'tu/vous stability'],
    },
    rows: buildRows(),
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  const errors = [...blockers, ...validateDraft(draft)];
  draft.validation = {
    status: errors.length === 0 ? 'PASS' : 'BLOCK',
    errors,
    rowCount: draft.rows.length,
    wordsFrSlots: draft.rows.reduce((sum, row) => sum + row.wordsFr.length, 0),
    negationRows: draft.rows.filter((row) => /\bne\b|n'|n’|Ce n'est pas/.test(row.french)).length,
    questionRows: draft.rows.filter((row) => row.french.includes('?') || row.french.includes('Est-ce')).length,
  };
  if (errors.length > 0) draft.status = 'BLOCK';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_PATH, buildMarkdown(draft), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson02FullReviewDraft = path.relative(ROOT, MD_PATH).replace(/\\/g, '/');
    state.lesson02FullReviewDraftJson = path.relative(ROOT, JSON_PATH).replace(/\\/g, '/');
    state.lesson02FullReviewDraftStatus = draft.status;
    state.lesson02FullReviewDraftSummary = {
      schemaVersion: draft.schemaVersion,
      rowCount: draft.validation.rowCount,
      wordsFrSlots: draft.validation.wordsFrSlots,
      negationRows: draft.validation.negationRows,
      questionRows: draft.validation.questionRows,
      validation: draft.validation.status,
      activationApproved: draft.activationApproved,
      readyForApply: draft.readyForApply,
    };
    state.nextPassPlan = [
      'Create Lesson 2 LLM official-source review packet.',
      'Create Lesson 2 LLM-style decisions only after source review.',
      'Run Lesson 2 decision gate.',
      'Materialize Lesson 2 RU/UK pack candidates only after 50 accepted decisions.',
      'Add Lesson 2 theory/audio/integrity gates mirroring Lesson 1.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${draft.status} ${path.relative(ROOT, MD_PATH).replace(/\\/g, '/')} rows=${draft.rows.length} wordsFr=${draft.validation.wordsFrSlots} neg=${draft.validation.negationRows} q=${draft.validation.questionRows} validation=${draft.validation.status}`);
  if (errors.length > 0) process.exitCode = 1;
}

main();
