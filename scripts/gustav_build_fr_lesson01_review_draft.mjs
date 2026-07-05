import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const JSON_PATH = path.join(OUT_DIR, 'lesson01_full_review_draft.json');
const MD_PATH = path.join(OUT_DIR, 'lesson01_full_review_draft.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const sourceEvidence = [
  {
    id: 'coe_cefr_a1_global_scale',
    title: 'Council of Europe CEFR A1 global scale',
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale',
    claimCovered: 'A1 supports familiar everyday expressions, very basic phrases, introductions, and simple interaction.',
  },
  {
    id: 'tv5monde_introducing_yourself',
    title: 'TV5MONDE strategy: introducing yourself or someone else',
    url: 'https://apprendre.tv5monde.com/en/aides/strategies-introducing-yourself-or-someone-else',
    claimCovered: "Beginner French introductions can use Je suis, Je m'appelle, Moi, c'est, C'est, and Il s'appelle.",
  },
  {
    id: 'tv5monde_greetings_a1',
    title: 'TV5MONDE A1 greetings',
    url: 'https://apprendre.tv5monde.com/en/exercices/premiere-classe/greetings',
    claimCovered: 'A1 French begins with greeting and introducing yourself in simple situations.',
  },
  {
    id: 'le_robert_etre_present',
    title: 'Le Robert conjugation: etre',
    url: 'https://dictionnaire.lerobert.com/en/conjugation/etre',
    claimCovered: 'Present forms: je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont.',
  },
];

const frenchOrthographyCorrections = [
  ['A bientot', '\u00c0 bient\u00f4t'],
  ['S il vous plait', "S'il vous pla\u00eet"],
  ['S il te plait', "S'il te pla\u00eet"],
  ['D accord', "D'accord"],
  ['Je m appelle', "Je m'appelle"],
  ['J habite', "J'habite"],
  ['m appelle', "m'appelle"],
  ['tu t appelles', "tu t'appelles"],
  ['t appelles', "t'appelles"],
  ['s appelle', "s'appelle"],
  ['C est', "C'est"],
  ['c est', "c'est"],
  ['Ca', '\u00c7a'],
  ['Voila', 'Voil\u00e0'],
  ['Ou', 'O\u00f9'],
  ['Enchante.', 'Enchant\u00e9.'],
  ['Enchantee.', 'Enchant\u00e9e.'],
  ['Enchante', 'Enchant\u00e9'],
  ['Enchantee', 'Enchant\u00e9e'],
  ['etudiant', '\u00e9tudiant'],
  ['etudiante', '\u00e9tudiante'],
  ['francais', 'fran\u00e7ais'],
  ['francaise', 'fran\u00e7aise'],
  ['etes', '\u00eates'],
  ['etre', '\u00eatre'],
  ['pret', 'pr\u00eat'],
  ['prete', 'pr\u00eate'],
  [' a Lyon', ' \u00e0 Lyon'],
  ['Tu es la.', 'Tu es l\u00e0.'],
  ['Elle est la.', 'Elle est l\u00e0.'],
  [' a ', ' \u00e0 '],
];

const bannedFrenchOrthographyFragments = [
  'A bientot',
  'S il',
  'm appelle',
  't appelles',
  's appelle',
  'c est',
  'C est',
  'Enchante',
  'Enchantee',
  'etudiant',
  'etudiante',
  'francais',
  'francaise',
  'etes',
  'pret',
  'prete',
  'Tu es la.',
  'Elle est la.',
];

function polishFrench(value) {
  if (value === 'J') return "J'";
  if (value === 'la') return 'l\u00e0';
  if (value === 'a') return '\u00e0';
  let out = String(value);
  for (const [from, to] of frenchOrthographyCorrections) {
    out = out.replaceAll(from, to);
  }
  return out;
}

const distractorBanks = {
  greeting: ['Salut', 'Bonsoir', 'Au revoir', 'Bienvenue', 'Coucou', 'Bonjour'],
  politeness: ['Merci', 'Pardon', 'Excusez-moi', 'D accord', 'Oui', 'Non', 'S il vous plait'],
  pronoun: ['Je', 'Tu', 'Il', 'Elle', 'Nous', 'Vous', 'Ils', 'Elles', 'Moi', 'Toi'],
  'verb-etre': ['suis', 'es', 'est', 'sommes', 'etes', 'sont', 'etre'],
  'verb-sappeler': ['m appelle', 't appelles', 's appelle', 'appelez-vous', 'appelle', 'suis'],
  'verb-venir': ['viens', 'vient', 'venez', 'habite', 'parle', 'suis'],
  'verb-parler': ['parle', 'parles', 'parlez', 'comprends', 'habite', 'suis'],
  adjective: ['pret', 'prete', 'calme', 'content', 'contente', 'important', 'facile', 'francais', 'francaise'],
  noun: ['etudiant', 'etudiante', 'ami', 'amie', 'professeur', 'francais'],
  city: ['Paris', 'Lyon', 'Kyiv', 'Marseille', 'Bruxelles', 'Geneve'],
  name: ['Marie', 'Paul', 'Lina', 'Alex', 'Nadia', 'Thomas'],
  'question-word': ['Comment', 'Ou', 'Qui', 'Quand', 'Pourquoi', 'Quoi'],
  demonstrative: ['C est', 'Ca', 'Ce', 'Voici', 'Voila', 'Il est', 'Elle est'],
  preposition: ['de', 'a', 'en', 'dans', 'avec', 'pour'],
  adverb: ['ici', 'la', 'ensemble', 'bien', 'un peu', 'maintenant'],
  article: ['un', 'une', 'le', 'la', 'les', 'des'],
};

const extraDistractors = ['ici', 'la', 'bien', 'calme', 'simple', 'facile', 'merci', 'bonjour'];

const rows = [
  ['Bonjour.', 'Здравствуйте.', 'Вітаю.', [['Bonjour', 'greeting']]],
  ['Salut.', 'Привет.', 'Привіт.', [['Salut', 'greeting']]],
  ['Bonsoir.', 'Добрый вечер.', 'Добрий вечір.', [['Bonsoir', 'greeting']]],
  ['Au revoir.', 'До свидания.', 'До побачення.', [['Au revoir', 'greeting']]],
  ['A bientot.', 'До скорого.', 'До скорого.', [['A bientot', 'greeting']]],
  ['Merci.', 'Спасибо.', 'Дякую.', [['Merci', 'politeness']]],
  ['Merci beaucoup.', 'Большое спасибо.', 'Дуже дякую.', [['Merci', 'politeness'], ['beaucoup', 'adverb']]],
  ['S il vous plait.', 'Пожалуйста.', 'Будь ласка.', [['S il vous plait', 'politeness']]],
  ['S il te plait.', 'Пожалуйста.', 'Будь ласка.', [['S il te plait', 'politeness']]],
  ['Pardon.', 'Извините.', 'Перепрошую.', [['Pardon', 'politeness']]],
  ['Excusez-moi.', 'Извините меня.', 'Вибачте мені.', [['Excusez-moi', 'politeness']]],
  ['Oui.', 'Да.', 'Так.', [['Oui', 'politeness']]],
  ['Non.', 'Нет.', 'Ні.', [['Non', 'politeness']]],
  ['D accord.', 'Хорошо.', 'Добре.', [['D accord', 'politeness']]],
  ['Je m appelle Marie.', 'Меня зовут Мари.', 'Мене звати Марі.', [['Je', 'pronoun'], ['m appelle', 'verb-sappeler'], ['Marie', 'name']]],
  ['Je suis Paul.', 'Я Поль.', 'Я Поль.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['Paul', 'name']]],
  ['Moi, c est Lina.', 'Я Лина.', 'Я Ліна.', [['Moi', 'pronoun'], ['c est', 'demonstrative'], ['Lina', 'name']]],
  ['Et toi ?', 'А ты?', 'А ти?', [['Et toi', 'pronoun']]],
  ['Et vous ?', 'А вы?', 'А ви?', [['Et vous', 'pronoun']]],
  ['Comment tu t appelles ?', 'Как тебя зовут?', 'Як тебе звати?', [['Comment', 'question-word'], ['tu', 'pronoun'], ['t appelles', 'verb-sappeler']]],
  ['Comment vous appelez-vous ?', 'Как вас зовут?', 'Як вас звати?', [['Comment', 'question-word'], ['vous', 'pronoun'], ['appelez-vous', 'verb-sappeler']]],
  ['Enchante.', 'Очень приятно.', 'Дуже приємно.', [['Enchante', 'politeness']]],
  ['Enchantee.', 'Очень приятно.', 'Дуже приємно.', [['Enchantee', 'politeness']]],
  ['Je suis etudiant.', 'Я студент.', 'Я студент.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['etudiant', 'noun']]],
  ['Je suis etudiante.', 'Я студентка.', 'Я студентка.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['etudiante', 'noun']]],
  ['Je suis francais.', 'Я француз.', 'Я француз.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['francais', 'adjective']]],
  ['Je suis francaise.', 'Я француженка.', 'Я француженка.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['francaise', 'adjective']]],
  ['Je suis ukrainien.', 'Я украинец.', 'Я українець.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['ukrainien', 'adjective']]],
  ['Je suis ukrainienne.', 'Я украинка.', 'Я українка.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['ukrainienne', 'adjective']]],
  ['Je suis de Kyiv.', 'Я из Киева.', 'Я з Києва.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['de', 'preposition'], ['Kyiv', 'city']]],
  ['Je viens de Paris.', 'Я из Парижа.', 'Я з Парижа.', [['Je', 'pronoun'], ['viens', 'verb-venir'], ['de', 'preposition'], ['Paris', 'city']]],
  ['J habite a Lyon.', 'Я живу в Лионе.', 'Я живу в Ліоні.', [['J', 'pronoun'], ['habite', 'verb-venir'], ['a', 'preposition'], ['Lyon', 'city']]],
  ['Je parle francais.', 'Я говорю по-французски.', 'Я говорю французькою.', [['Je', 'pronoun'], ['parle', 'verb-parler'], ['francais', 'noun']]],
  ['Je parle un peu francais.', 'Я немного говорю по-французски.', 'Я трохи говорю французькою.', [['Je', 'pronoun'], ['parle', 'verb-parler'], ['un peu', 'adverb'], ['francais', 'noun']]],
  ['Je comprends.', 'Я понимаю.', 'Я розумію.', [['Je', 'pronoun'], ['comprends', 'verb-parler']]],
  ['Je suis ici.', 'Я здесь.', 'Я тут.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['ici', 'adverb']]],
  ['Tu es la.', 'Ты здесь.', 'Ти тут.', [['Tu', 'pronoun'], ['es', 'verb-etre'], ['la', 'adverb']]],
  ['Il est ici.', 'Он здесь.', 'Він тут.', [['Il', 'pronoun'], ['est', 'verb-etre'], ['ici', 'adverb']]],
  ['Elle est la.', 'Она здесь.', 'Вона тут.', [['Elle', 'pronoun'], ['est', 'verb-etre'], ['la', 'adverb']]],
  ['Nous sommes ensemble.', 'Мы вместе.', 'Ми разом.', [['Nous', 'pronoun'], ['sommes', 'verb-etre'], ['ensemble', 'adverb']]],
  ['Vous etes pret.', 'Вы готовы.', 'Ви готові.', [['Vous', 'pronoun'], ['etes', 'verb-etre'], ['pret', 'adjective']]],
  ['Il est calme.', 'Он спокоен.', 'Він спокійний.', [['Il', 'pronoun'], ['est', 'verb-etre'], ['calme', 'adjective']]],
  ['Elle est calme.', 'Она спокойна.', 'Вона спокійна.', [['Elle', 'pronoun'], ['est', 'verb-etre'], ['calme', 'adjective']]],
  ['Nous sommes contents.', 'Мы довольны.', 'Ми задоволені.', [['Nous', 'pronoun'], ['sommes', 'verb-etre'], ['contents', 'adjective']]],
  ['Elles sont contentes.', 'Они довольны.', 'Вони задоволені.', [['Elles', 'pronoun'], ['sont', 'verb-etre'], ['contentes', 'adjective']]],
  ['Ils sont ici.', 'Они здесь.', 'Вони тут.', [['Ils', 'pronoun'], ['sont', 'verb-etre'], ['ici', 'adverb']]],
  ['C est important.', 'Это важно.', 'Це важливо.', [['C est', 'demonstrative'], ['important', 'adjective']]],
  ['C est facile.', 'Это легко.', 'Це легко.', [['C est', 'demonstrative'], ['facile', 'adjective']]],
  ['C est bon.', 'Это хорошо.', 'Це добре.', [['C est', 'demonstrative'], ['bon', 'adjective']]],
  ['Je suis pret.', 'Я готов.', 'Я готовий.', [['Je', 'pronoun'], ['suis', 'verb-etre'], ['pret', 'adjective']]],
];

function normalize(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function hasCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(value);
}

function hasMojibake(value) {
  return /[�ÃÐÑÒ]/u.test(value);
}

function distractorsFor(correct, category) {
  const bank = [...(distractorBanks[category] ?? []), ...extraDistractors];
  const seen = new Set();
  const out = [];
  for (const candidate of bank) {
    const polishedCandidate = polishFrench(candidate);
    if (normalize(polishedCandidate) === normalize(correct)) continue;
    if (seen.has(normalize(polishedCandidate))) continue;
    seen.add(normalize(polishedCandidate));
    out.push(polishedCandidate);
    if (out.length === 5) return out;
  }
  throw new Error(`Not enough distractors for ${correct} / ${category}`);
}

function buildRows() {
  return rows.map(([french, russian, ukrainian, words], index) => ({
    phraseId: `fr_lesson1_phrase_${String(index + 1).padStart(3, '0')}`,
    lessonId: 1,
    rowNumber: index + 1,
    french: polishFrench(french),
    russian,
    ukrainian,
    wordsFr: words.map(([text, category]) => {
      const polishedText = polishFrench(text);
      return {
        text: polishedText,
        correct: polishedText,
        category,
        distractors: distractorsFor(polishedText, category),
      };
    }),
    sourceEvidenceIds: ['coe_cefr_a1_global_scale', 'tv5monde_introducing_yourself', 'tv5monde_greetings_a1', 'le_robert_etre_present'],
  }));
}

function validateDraft(draft) {
  const errors = [];
  if (draft.rows.length !== 50) errors.push(`expected 50 rows, got ${draft.rows.length}`);
  for (const row of draft.rows) {
    if (row.lessonId !== 1) errors.push(`${row.phraseId}: wrong lessonId`);
    if (hasMojibake(row.french) || hasMojibake(row.russian) || hasMojibake(row.ukrainian)) errors.push(`${row.phraseId}: mojibake in localized text`);
    if (hasCyrillic(row.french)) errors.push(`${row.phraseId}: cyrillic in french phrase`);
    for (const fragment of bannedFrenchOrthographyFragments) {
      if (row.french.includes(fragment)) errors.push(`${row.phraseId}: unpolished French orthography fragment "${fragment}"`);
    }
    if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 1) errors.push(`${row.phraseId}: wordsFr missing`);
    for (const word of row.wordsFr) {
      if (hasMojibake(word.text) || hasMojibake(word.correct) || word.distractors.some(hasMojibake)) errors.push(`${row.phraseId}:${word.text}: mojibake in wordsFr`);
      if (hasCyrillic(word.text) || hasCyrillic(word.correct)) errors.push(`${row.phraseId}: cyrillic in wordsFr`);
      for (const fragment of bannedFrenchOrthographyFragments) {
        if (word.text.includes(fragment) || word.correct.includes(fragment) || word.distractors.some((item) => item.includes(fragment))) {
          errors.push(`${row.phraseId}:${word.text}: unpolished French orthography fragment "${fragment}"`);
        }
      }
      if (!Array.isArray(word.distractors) || word.distractors.length !== 5) errors.push(`${row.phraseId}:${word.text}: distractor count`);
      if (new Set(word.distractors.map(normalize)).size !== word.distractors.length) errors.push(`${row.phraseId}:${word.text}: duplicate distractor`);
      if (word.distractors.some((item) => normalize(item) === normalize(word.correct))) errors.push(`${row.phraseId}:${word.text}: correct in distractors`);
      if (word.distractors.some(hasCyrillic)) errors.push(`${row.phraseId}:${word.text}: cyrillic in distractors`);
    }
  }
  return errors;
}

function buildMarkdown(draft) {
  const lines = [];
  lines.push('# French Lesson 1 Full Review Draft');
  lines.push('');
  lines.push(`Status: ${draft.status}`);
  lines.push(`Activation approved: ${draft.activationApproved}`);
  lines.push(`Ready for apply: ${draft.readyForApply}`);
  lines.push('');
  lines.push('## Lesson Logic');
  lines.push('');
  lines.push('- App level: A1, lesson 1 of 32.');
  lines.push('- English blueprint studied: small subject + be/state/place/quality phrases, 50 rows, slot-level distractors.');
  lines.push('- French-native rebuild: greetings, politeness, self-introduction, tu/vous, je/tu/il/elle/nous/vous/ils/elles, and first être forms.');
  lines.push('- This is a review draft only. It is not app bundle content, not uploaded, and not activation-approved.');
  lines.push('');
  lines.push('## Source Evidence');
  lines.push('');
  for (const source of draft.sourceEvidence) {
    lines.push(`- ${source.id}: ${source.title} - ${source.url}`);
  }
  lines.push('');
  lines.push('## Theory Draft');
  lines.push('');
  lines.push('### Objective');
  lines.push('Learner can greet someone, give a name, say where they are from, and build tiny French identity/state phrases.');
  lines.push('');
  lines.push('### Core Forms');
  lines.push('');
  lines.push('- Je suis ...');
  lines.push('- Tu es ...');
  lines.push('- Il / Elle est ...');
  lines.push('- Nous sommes ...');
  lines.push('- Vous êtes ...');
  lines.push('- Ils / Elles sont ...');
  lines.push("- Je m'appelle ... / Moi, c'est ...");
  lines.push('');
  lines.push('### Common Mistakes To Guard');
  lines.push('');
  lines.push('- Do not mix tu and vous in the same micro-dialogue.');
  lines.push('- Do not use English word order or English to be forms inside French slots.');
  lines.push('- Do not ignore gender where the adjective/noun is gendered: étudiant/étudiante, français/française.');
  lines.push('');
  lines.push('## Vocabulary Summary');
  lines.push('');
  lines.push('| Category | Purpose |');
  lines.push('| --- | --- |');
  lines.push('| greeting / politeness | first survival phrases |');
  lines.push('| pronoun | je, tu, il, elle, nous, vous, ils, elles |');
  lines.push('| verb-être | suis, es, est, sommes, êtes, sont |');
  lines.push('| verb-sappeler | name/introduction frames |');
  lines.push('| adjective/noun | identity, nationality, readiness, simple states |');
  lines.push('| preposition/city | de/à + origin/location starter chunks |');
  lines.push('');
  lines.push('## Phrase Rows');
  lines.push('');
  for (const row of draft.rows) {
    lines.push(`### ${String(row.rowNumber).padStart(2, '0')}. ${row.french}`);
    lines.push(`- RU: ${row.russian}`);
    lines.push(`- UK: ${row.ukrainian}`);
    lines.push('');
    lines.push('| wordsFr text | category | distractors |');
    lines.push('| --- | --- | --- |');
    for (const word of row.wordsFr) {
      lines.push(`| ${word.text} | ${word.category} | ${word.distractors.join(', ')} |`);
    }
    lines.push('');
  }
  lines.push('## Safety');
  lines.push('');
  lines.push('- productionAppFilesModifiedByThisScript: false');
  lines.push('- firebaseOrServerUploadStarted: false');
  lines.push('- runtimeDownloadsEnabled: false');
  lines.push('- productionApplyApproved: false');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const draft = {
    schemaVersion: 'gustav-fr-lesson01-full-review-draft-v2',
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_DRAFT_HOLD',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    activationApproved: false,
    readyForApply: false,
    sourceEvidence,
    blueprintBasis: {
      englishLessonId: 1,
      englishTopic: 'Pronouns and to be affirmative',
      englishRowsInspected: 50,
      englishWordSlotsInspected: 150,
      frenchNativeScope: ['greetings', 'politeness', 'self-introduction', 'tu/vous', 'être present basics'],
      orthographyPolicy: 'French output must preserve required apostrophes, accents, cedilla, and à/de distinctions in review artifacts.',
    },
    rows: buildRows(),
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  const errors = validateDraft(draft);
  draft.validation = {
    status: errors.length === 0 ? 'PASS' : 'BLOCK',
    errors,
    rowCount: draft.rows.length,
    wordsFrSlots: draft.rows.reduce((sum, row) => sum + row.wordsFr.length, 0),
  };
  if (errors.length > 0) draft.status = 'BLOCK';
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_PATH, buildMarkdown(draft), 'utf8');
  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson01FullReviewDraft = path.relative(ROOT, MD_PATH).replace(/\\/g, '/');
    state.lesson01FullReviewDraftJson = path.relative(ROOT, JSON_PATH).replace(/\\/g, '/');
    state.lesson01FullReviewDraftStatus = draft.status;
    state.lesson01FullReviewDraftSummary = {
      schemaVersion: draft.schemaVersion,
      rowCount: draft.validation.rowCount,
      wordsFrSlots: draft.validation.wordsFrSlots,
      validation: draft.validation.status,
      orthographyPolicy: draft.blueprintBasis.orthographyPolicy,
      activationApproved: draft.activationApproved,
      readyForApply: draft.readyForApply,
      sourceEvidenceIds: sourceEvidence.map((source) => source.id),
    };
    state.nextPassPlan = [
      'Run source-backed LLM review for all 50 lesson 1 rows, theory, distractors, and RU/UK meanings.',
      'Create materialization contract for lesson 1 after review accepts every row.',
      'Create lesson 1 audio/TTS manifest only after row review passes.',
      'Start lesson 2 surgical review draft from English blueprint plus French-native sequence.',
      'Continue P0 rebuild audit for lessons 19-32 before any activation claim.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }
  console.log(`${draft.status} ${path.relative(ROOT, MD_PATH).replace(/\\/g, '/')} rows=${draft.rows.length} wordsFr=${draft.validation.wordsFrSlots} validation=${draft.validation.status}`);
  if (errors.length > 0) process.exitCode = 1;
}

main();
