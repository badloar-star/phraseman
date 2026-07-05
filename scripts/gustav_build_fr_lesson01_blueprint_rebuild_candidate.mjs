import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const JSON_PATH = path.join(OUT_DIR, 'lesson01_blueprint_rebuild_candidate_v1.json');
const MD_PATH = path.join(OUT_DIR, 'lesson01_blueprint_rebuild_candidate_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SOURCE_PATHS = {
  englishBlueprint: 'docs/gustav/generated/fr/english_blueprint/english_lesson_surgical_blueprint_v1.json',
  quarantineGate: 'docs/gustav/generated/fr/core_lessons_32/fr_legacy_seed_quarantine_gate_v1.json',
  trustedSources: 'docs/gustav/trusted_sources/fr_trusted_sources.json',
};

const TRUSTED_EVIDENCE = [
  {
    id: 'le_robert_etre_present',
    sourceId: 'le_robert_conjugation',
    url: 'https://dictionnaire.lerobert.com/conjugaison/etre',
    claim: 'Present indicative of être: je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont.',
  },
  {
    id: 'tv5monde_etre_present_a1',
    sourceId: 'tv5monde_grammar',
    url: 'https://apprendre.tv5monde.com/fr/aides/grammaire-le-verbe-etre-et-le-verbe-sappeler-au-present-0',
    claim: 'Beginner French grammar uses être in the present for simple identity and presentation patterns.',
  },
  {
    id: 'coe_cefr_a1_short_simple_phrases',
    sourceId: 'coe_cefr_companion_2020',
    url: 'https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions',
    claim: 'A1 production is based on short, simple phrases about immediate concrete situations.',
  },
  {
    id: 'phraseman_english_lesson1_blueprint',
    sourceId: 'phraseman_internal_english_blueprint',
    url: SOURCE_PATHS.englishBlueprint,
    claim: 'English lesson 1 product shape is 50 affirmative rows with subject/pronoun + to-be + complement and per-word distractors.',
  },
];

const VERB_DISTRACTORS = {
  suis: ['es', 'est', 'sommes', 'êtes', 'sont'],
  es: ['suis', 'est', 'sommes', 'êtes', 'sont'],
  est: ['suis', 'es', 'sommes', 'êtes', 'sont'],
  sommes: ['suis', 'es', 'est', 'êtes', 'sont'],
  etes: ['es', 'est', 'sommes', 'sont', 'suis'],
  sont: ['est', 'sommes', 'êtes', 'suis', 'es'],
};

const SUBJECT_DISTRACTORS = {
  Je: ['Tu', 'Il', 'Elle', 'Nous', 'Vous'],
  Tu: ['Je', 'Il', 'Elle', 'Nous', 'Vous'],
  Il: ['Elle', 'Ils', 'Je', 'Tu', 'Nous'],
  Elle: ['Il', 'Elles', 'Je', 'Tu', 'Vous'],
  Nous: ['Vous', 'Ils', 'Elles', 'Je', 'Tu'],
  Vous: ['Tu', 'Nous', 'Ils', 'Elles', 'Je'],
  Ils: ['Il', 'Elles', 'Nous', 'Vous', 'Tu'],
  Elles: ['Elle', 'Ils', 'Nous', 'Vous', 'Tu'],
  "C'": ['Ce', 'Ça', 'Il', 'Elle', 'Ils'],
};

const COMPLEMENT_DISTRACTORS = {
  ici: ['là', 'dehors', 'dedans', 'loin', 'proche'],
  la: ['ici', 'dehors', 'dedans', 'loin', 'proche'],
  pret: ['prête', 'prêts', 'prêtes', 'près', 'occupé'],
  prete: ['prêt', 'prêts', 'prêtes', 'près', 'occupée'],
  prets: ['prêt', 'prête', 'prêtes', 'près', 'occupés'],
  pretes: ['prêt', 'prête', 'prêts', 'près', 'occupées'],
  ensemble: ['seul', 'seuls', 'seules', 'ici', 'dehors'],
  contents: ['content', 'contente', 'contentes', 'calmes', 'tristes'],
  contentes: ['content', 'contente', 'contents', 'calmes', 'tristes'],
  important: ['importante', 'importants', 'importantes', 'urgent', 'sérieux'],
  calme: ['calmes', 'content', 'triste', 'occupé', 'prêt'],
  calmes: ['calme', 'contents', 'tristes', 'occupés', 'prêts'],
  occupe: ['occupée', 'occupés', 'occupées', 'prêt', 'fatigué'],
  occupee: ['occupé', 'occupés', 'occupées', 'prête', 'fatiguée'],
  en: ['à', 'de', 'dans', 'sur', 'pour'],
  a: ['en', 'de', 'dans', 'sur', 'pour'],
  linterieur: ['dehors', 'ici', 'là', 'proche', 'loin'],
  securite: ['retard', 'forme', 'danger', 'paix', 'place'],
  dehors: ['dedans', 'ici', 'là', 'loin', 'proche'],
  dedans: ['dehors', 'ici', 'là', 'loin', 'proche'],
  retard: ['avance', 'sécurité', 'forme', 'route', 'classe'],
  gratuit: ['gratuite', 'gratuits', 'gratuites', 'cher', 'possible'],
  cher: ['chère', 'chers', 'chères', 'gratuit', 'vide'],
  vide: ['vides', 'plein', 'pleine', 'cassé', 'possible'],
  casse: ['cassée', 'cassés', 'cassées', 'vide', 'sérieux'],
  serieux: ['sérieuses', 'sérieuse', 'important', 'possible', 'gratuit'],
  proche: ['loin', 'ici', 'là', 'dehors', 'dedans'],
  facile: ['faciles', 'difficile', 'possible', 'simple', 'sérieux'],
  malade: ['malades', 'fatigué', 'fatiguée', 'occupé', 'calme'],
  fatigue: ['fatiguée', 'fatigués', 'fatiguées', 'occupé', 'malade'],
  fatiguee: ['fatigué', 'fatigués', 'fatiguées', 'occupée', 'malade'],
  amis: ['ami', 'amie', 'amies', 'ensemble', 'prêts'],
  amies: ['ami', 'amie', 'amis', 'ensemble', 'prêtes'],
  forts: ['fort', 'forte', 'fortes', 'calmes', 'prêts'],
  fortes: ['fort', 'forte', 'forts', 'calmes', 'prêtes'],
  triste: ['tristes', 'calme', 'content', 'prêt', 'malade'],
  heureux: ['heureuse', 'heureuses', 'contents', 'prêts', 'calmes'],
  heureuses: ['heureux', 'heureuse', 'contents', 'contentes', 'calmes'],
  nerveux: ['nerveuse', 'nerveuses', 'sérieux', 'calme', 'malade'],
  nerveuse: ['nerveux', 'nerveuses', 'sérieuse', 'calme', 'malade'],
  gentil: ['gentille', 'gentils', 'gentilles', 'calme', 'prêt'],
  gentille: ['gentil', 'gentils', 'gentilles', 'calme', 'prête'],
  possible: ['possibles', 'important', 'sérieux', 'gratuit', 'vide'],
};

const DISPLAY_TOKEN = {
  la: 'là',
  pret: 'prêt',
  prete: 'prête',
  prets: 'prêts',
  pretes: 'prêtes',
  etes: 'êtes',
  occupe: 'occupé',
  occupee: 'occupée',
  fatigue: 'fatigué',
  fatiguee: 'fatiguée',
  securite: 'sécurité',
  casse: 'cassé',
  serieux: 'sérieux',
};

const ROWS = [
  ['Je suis ici.', 'Я здесь.', 'Я тут.', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['ici', 'place_adverb']]],
  ['Tu es la.', 'Ты здесь / ты там.', 'Ти тут / ти там.', [['Tu', 'subject_pronoun'], ['es', 'etre_present'], ['la', 'place_adverb']]],
  ['Il est pret.', 'Он готов.', 'Він готовий.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['pret', 'adjective_masc_sg']]],
  ['Elle est prete.', 'Она готова.', 'Вона готова.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['prete', 'adjective_fem_sg']]],
  ['Nous sommes ensemble.', 'Мы вместе.', 'Ми разом.', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['ensemble', 'relation_adverb']]],
  ['Ils sont contents.', 'Они довольны / рады.', 'Вони задоволені / раді.', [['Ils', 'subject_pronoun'], ['sont', 'etre_present'], ['contents', 'adjective_masc_pl']]],
  ['Elles sont contentes.', 'Они довольны / рады. (жен.)', 'Вони задоволені / раді. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['contentes', 'adjective_fem_pl']]],
  ["C'est important.", 'Это важно.', 'Це важливо.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['important', 'invariable_predicative']]],
  ['Je suis calme.', 'Я спокоен / спокойна.', 'Я спокійний / спокійна.', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['calme', 'adjective_invariable_sg']]],
  ['Tu es calme.', 'Ты спокоен / спокойна.', 'Ти спокійний / спокійна.', [['Tu', 'subject_pronoun'], ['es', 'etre_present'], ['calme', 'adjective_invariable_sg']]],
  ['Il est occupe.', 'Он занят.', 'Він зайнятий.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['occupe', 'adjective_masc_sg']]],
  ['Elle est occupee.', 'Она занята.', 'Вона зайнята.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['occupee', 'adjective_fem_sg']]],
  ['Nous sommes prets.', 'Мы готовы. (муж./смеш.)', 'Ми готові. (чол./зміш.)', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['prets', 'adjective_masc_pl']]],
  ['Vous etes prets.', 'Вы готовы. (муж./смеш.)', 'Ви готові. (чол./зміш.)', [['Vous', 'subject_pronoun'], ['etes', 'etre_present'], ['prets', 'adjective_masc_pl']]],
  ['Elles sont pretes.', 'Они готовы. (жен.)', 'Вони готові. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['pretes', 'adjective_fem_pl']]],
  ['Je suis fatigue.', 'Я устал. (говорит мужчина)', 'Я втомився. (говорить чоловік)', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['fatigue', 'adjective_masc_sg']]],
  ['Je suis fatiguee.', 'Я устала. (говорит женщина)', 'Я втомилася. (говорить жінка)', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['fatiguee', 'adjective_fem_sg']]],
  ['Nous sommes en securite.', 'Мы в безопасности.', 'Ми в безпеці.', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['en', 'fixed_expression_preposition'], ['securite', 'fixed_expression_noun']]],
  ['Ils sont dehors.', 'Они снаружи / на улице.', 'Вони зовні / надворі.', [['Ils', 'subject_pronoun'], ['sont', 'etre_present'], ['dehors', 'place_adverb']]],
  ['Elles sont dehors.', 'Они снаружи / на улице. (жен.)', 'Вони зовні / надворі. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['dehors', 'place_adverb']]],
  ["Je suis à l'intérieur.", 'Я внутри.', 'Я всередині.', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['à', 'place_preposition'], ["l'intérieur", 'place_noun']]],
  ['Tu es en retard.', 'Ты опаздываешь.', 'Ти запізнюєшся.', [['Tu', 'subject_pronoun'], ['es', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Il est en retard.', 'Он опаздывает.', 'Він запізнюється.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Elle est en retard.', 'Она опаздывает.', 'Вона запізнюється.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Nous sommes en retard.', 'Мы опаздываем.', 'Ми запізнюємося.', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ['Vous etes en retard.', 'Вы опаздываете.', 'Ви запізнюєтеся.', [['Vous', 'subject_pronoun'], ['etes', 'etre_present'], ['en', 'fixed_expression_preposition'], ['retard', 'fixed_expression_noun']]],
  ["C'est gratuit.", 'Это бесплатно.', 'Це безкоштовно.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['gratuit', 'invariable_predicative']]],
  ["C'est cher.", 'Это дорого.', 'Це дорого.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['cher', 'invariable_predicative']]],
  ["C'est vide.", 'Это пусто.', 'Це порожньо.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['vide', 'invariable_predicative']]],
  ["C'est casse.", 'Это сломано.', 'Це зламано.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['casse', 'invariable_predicative']]],
  ["C'est serieux.", 'Это серьезно.', 'Це серйозно.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['serieux', 'invariable_predicative']]],
  ["C'est facile.", 'Это легко.', 'Це легко.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['facile', 'invariable_predicative']]],
  ['Il est malade.', 'Он болен.', 'Він хворий.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['malade', 'adjective_invariable_sg']]],
  ['Elle est malade.', 'Она больна.', 'Вона хвора.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['malade', 'adjective_invariable_sg']]],
  ['Nous sommes amis.', 'Мы друзья. (муж./смеш.)', 'Ми друзі. (чол./зміш.)', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['amis', 'noun_masc_pl']]],
  ['Elles sont amies.', 'Они подруги. (жен.)', 'Вони подруги. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['amies', 'noun_fem_pl']]],
  ['Ils sont forts.', 'Они сильные. (муж./смеш.)', 'Вони сильні. (чол./зміш.)', [['Ils', 'subject_pronoun'], ['sont', 'etre_present'], ['forts', 'adjective_masc_pl']]],
  ['Elles sont fortes.', 'Они сильные. (жен.)', 'Вони сильні. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['fortes', 'adjective_fem_pl']]],
  ['Il est triste.', 'Он грустный.', 'Він сумний.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['triste', 'adjective_invariable_sg']]],
  ['Elle est triste.', 'Она грустная.', 'Вона сумна.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['triste', 'adjective_invariable_sg']]],
  ['Nous sommes heureux.', 'Мы счастливы. (муж./смеш.)', 'Ми щасливі. (чол./зміш.)', [['Nous', 'subject_pronoun'], ['sommes', 'etre_present'], ['heureux', 'adjective_masc_pl']]],
  ['Elles sont heureuses.', 'Они счастливы. (жен.)', 'Вони щасливі. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['heureuses', 'adjective_fem_pl']]],
  ['Je suis nerveux.', 'Я нервничаю / я нервный. (муж.)', 'Я нервую / я нервовий. (чол.)', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['nerveux', 'adjective_masc_sg']]],
  ['Je suis nerveuse.', 'Я нервничаю / я нервная. (жен.)', 'Я нервую / я нервова. (жін.)', [['Je', 'subject_pronoun'], ['suis', 'etre_present'], ['nerveuse', 'adjective_fem_sg']]],
  ['Il est gentil.', 'Он добрый.', 'Він добрий.', [['Il', 'subject_pronoun'], ['est', 'etre_present'], ['gentil', 'adjective_masc_sg']]],
  ['Elle est gentille.', 'Она добрая.', 'Вона добра.', [['Elle', 'subject_pronoun'], ['est', 'etre_present'], ['gentille', 'adjective_fem_sg']]],
  ['Vous etes ensemble.', 'Вы вместе.', 'Ви разом.', [['Vous', 'subject_pronoun'], ['etes', 'etre_present'], ['ensemble', 'relation_adverb']]],
  ['Ils sont calmes.', 'Они спокойны. (муж./смеш.)', 'Вони спокійні. (чол./зміш.)', [['Ils', 'subject_pronoun'], ['sont', 'etre_present'], ['calmes', 'adjective_plural']]],
  ['Elles sont calmes.', 'Они спокойны. (жен.)', 'Вони спокійні. (жін.)', [['Elles', 'subject_pronoun'], ['sont', 'etre_present'], ['calmes', 'adjective_plural']]],
  ["C'est possible.", 'Это возможно.', 'Це можливо.', [["C'", 'demonstrative_elision'], ['est', 'etre_present'], ['possible', 'invariable_predicative']]],
];

function stripAccentKey(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/'/g, '')
    .toLowerCase();
}

function displayToken(value) {
  return DISPLAY_TOKEN[stripAccentKey(value)] ?? value;
}

function displayPhrase(value) {
  return String(value)
    .replace(/\betes\b/g, 'êtes')
    .replace(/\bla\b/g, 'là')
    .replace(/\bpret\b/g, 'prêt')
    .replace(/\bprete\b/g, 'prête')
    .replace(/\bprets\b/g, 'prêts')
    .replace(/\bpretes\b/g, 'prêtes')
    .replace(/\boccupe\b/g, 'occupé')
    .replace(/\boccupee\b/g, 'occupée')
    .replace(/\bfatigue\b/g, 'fatigué')
    .replace(/\bfatiguee\b/g, 'fatiguée')
    .replace(/\bsecurite\b/g, 'sécurité')
    .replace(/\bcasse\b/g, 'cassé')
    .replace(/\bserieux\b/g, 'sérieux');
}

function distractorsFor(text, category) {
  const raw = category === 'subject_pronoun' || category === 'demonstrative_elision'
    ? SUBJECT_DISTRACTORS[text] ?? []
    : category === 'etre_present'
      ? VERB_DISTRACTORS[stripAccentKey(text)] ?? []
      : COMPLEMENT_DISTRACTORS[stripAccentKey(text)] ?? ['ici', 'là', 'calme', 'prêt', 'possible'];
  return raw.map(displayToken);
}

function buildRows() {
  return ROWS.map(([fr, ru, uk, wordPairs], index) => ({
    id: `fr_lesson01_blueprint_rebuild_${String(index + 1).padStart(2, '0')}`,
    lessonId: 1,
    order: index + 1,
    phraseFr: displayPhrase(fr),
    meaningRu: ru,
    meaningUk: uk,
    wordsFr: wordPairs.map(([text, category]) => ({
      text: displayToken(text),
      correct: displayToken(text),
      category,
      distractors: distractorsFor(text, category),
    })),
    sourceEvidenceIds: TRUSTED_EVIDENCE.map((source) => source.id),
    productionStatus: 'REVIEW_CANDIDATE_NOT_APPROVED',
  }));
}

function validate(rows) {
  const blockers = [];
  if (rows.length !== 50) blockers.push('ROW_COUNT_NOT_50');
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) blockers.push('DUPLICATE_ROW_IDS');
  const phrases = new Set(rows.map((row) => row.phraseFr));
  if (phrases.size !== rows.length) blockers.push('DUPLICATE_FRENCH_PHRASES');

  let wordSlots = 0;
  let distractorSlots = 0;
  const accentLeakPattern = /\b(etes|pret|prete|prets|pretes|occupe|occupee|fatigue|fatiguee|securite|casse|serieux)\b/u;
  for (const row of rows) {
    if (!row.phraseFr || !row.meaningRu || !row.meaningUk) blockers.push(`ROW_${row.order}_MISSING_TEXT`);
    if (accentLeakPattern.test(row.phraseFr)) blockers.push(`ROW_${row.order}_FRENCH_ACCENT_LEAK`);
    if (!Array.isArray(row.wordsFr) || row.wordsFr.length < 3) blockers.push(`ROW_${row.order}_WORDS_FR_TOO_SHORT`);
    wordSlots += row.wordsFr.length;
    for (const word of row.wordsFr) {
      if (accentLeakPattern.test(word.correct)) blockers.push(`ROW_${row.order}_${word.text}_WORD_ACCENT_LEAK`);
      if (!Array.isArray(word.distractors) || word.distractors.length !== 5) blockers.push(`ROW_${row.order}_${word.text}_DISTRACTOR_COUNT_NOT_5`);
      if (word.distractors.includes(word.correct)) blockers.push(`ROW_${row.order}_${word.text}_DISTRACTOR_CONTAINS_CORRECT`);
      if (new Set(word.distractors).size !== word.distractors.length) blockers.push(`ROW_${row.order}_${word.text}_DUPLICATE_DISTRACTORS`);
      if (word.distractors.some((distractor) => accentLeakPattern.test(distractor))) blockers.push(`ROW_${row.order}_${word.text}_DISTRACTOR_ACCENT_LEAK`);
      distractorSlots += word.distractors.length;
    }
  }
  return { blockers, wordSlots, distractorSlots };
}

function markdownFor(candidate) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Candidate',
    '',
    `Status: ${candidate.status}`,
    `Rows: ${candidate.summary.rows}`,
    `wordsFr slots: ${candidate.summary.wordsFrSlots}`,
    '',
    '## Why This Replaces The Old Draft',
    '',
    '- Old Lesson 1 artifacts are quarantined as legacy seed evidence.',
    '- This file is rebuilt from the English product blueprint, but the French phrases are native French A1 content.',
    '- Production/app/server/audio activation is still closed.',
    '',
    '## Sources',
    '',
    ...candidate.trustedEvidence.map((source) => `- ${source.id}: ${source.claim} (${source.url})`),
    '',
    '## Theory Shape',
    '',
    ...candidate.theory.sections.flatMap((section) => [
      `### ${section.num}. ${section.titleRu} / ${section.titleUk}`,
      section.ru,
      '',
      section.uk,
      '',
    ]),
    '## 50 Rows',
    '',
    '| # | French | RU | UK | wordsFr + distractors |',
    '|---:|---|---|---|---|',
    ...candidate.rows.map((row) => {
      const words = row.wordsFr
        .map((word) => `${word.correct} {${word.category}} [${word.distractors.join(', ')}]`)
        .join('<br>');
      return `| ${row.order} | ${row.phraseFr} | ${row.meaningRu} | ${row.meaningUk} | ${words} |`;
    }),
    '',
    '## Production Blockers',
    '',
    ...candidate.productionBlockers.map((blocker) => `- ${blocker}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = buildRows();
  const validation = validate(rows);
  const candidate = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-candidate-v1',
    generatedAt: new Date().toISOString(),
    status: validation.blockers.length > 0 ? 'BLOCK' : 'HOLD_REVIEW_CANDIDATE_READY_FOR_USER_CHECK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    lessonId: 1,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    activationApproved: false,
    readyForApply: false,
    title: {
      fr: 'Être au présent: phrases affirmatives courtes',
      ru: 'Французский A1: être в коротких утверждениях',
      uk: 'Французька A1: être в коротких твердженнях',
    },
    blueprintBasis: {
      englishLessonIntent: 'subject/pronoun + to-be + simple state/place/quality',
      copiedFromEnglish: ['50-row product count', 'per-word slot structure', 'five distractors per slot', 'short affirmative progression'],
      notCopiedFromEnglish: ['English lexical list', 'English spelling distractors', 'English-only phrases such as you are right / hungry where French uses avoir'],
      frenchNativeDecisions: [
        'Use être present forms as the core grammar spine.',
        'Use C est for neutral it/this is statements.',
        'Use gender/number adjective agreement where French requires it.',
        'Use fixed expressions en retard and en sécurité because they are natural French A1 patterns.',
      ],
    },
    trustedEvidence: TRUSTED_EVIDENCE,
    rows,
    theory: {
      titleRu: 'Être: короткие утверждения',
      titleUk: 'Être: короткі твердження',
      sections: [
        {
          num: '01',
          titleRu: 'Что тренирует урок',
          titleUk: 'Що тренує урок',
          ru: 'Урок ставит французский каркас: кто/что + форма être + место, состояние или качество. Это аналог английского первого урока по функции, но не механический перевод.',
          uk: 'Урок ставить французький каркас: хто/що + форма être + місце, стан або якість. Це аналог першого англійського уроку за функцією, але не механічний переклад.',
        },
        {
          num: '02',
          titleRu: 'Главная формула',
          titleUk: 'Головна формула',
          ru: 'Je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont. После формы être идет короткий французский смысл: ici, prêt/prête, calme, en retard, en sécurité.',
          uk: 'Je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont. Після форми être йде короткий французький зміст: ici, prêt/prête, calme, en retard, en sécurité.',
        },
        {
          num: '03',
          titleRu: 'Почему есть C est',
          titleUk: 'Чому є C est',
          ru: "В английском blueprint есть It is. Во французском для нейтрального \"это...\" в таких коротких фразах естественно C’est/C'est: C’est important, C’est gratuit, C’est possible.",
          uk: "В англійському blueprint є It is. У французькій для нейтрального \"це...\" в таких коротких фразах природно C’est/C'est: C’est important, C’est gratuit, C’est possible.",
        },
        {
          num: '04',
          titleRu: 'Согласование',
          titleUk: 'Узгодження',
          ru: 'Французские прилагательные часто меняются по роду и числу: prêt/prête/prêts/prêtes, content/contente/contents/contentes, fort/forte/forts/fortes. Поэтому дистракторы проверяют не похожее слово, а правильную форму.',
          uk: 'Французькі прикметники часто змінюються за родом і числом: prêt/prête/prêts/prêtes, content/contente/contents/contentes, fort/forte/forts/fortes. Тому дистрактори перевіряють не схоже слово, а правильну форму.',
        },
        {
          num: '05',
          titleRu: 'Что пока не включено',
          titleUk: 'Що поки не включено',
          ru: 'Фразы типа "я голоден" и "ты прав" во французском обычно используют avoir: j’ai faim, tu as raison. Они не засунуты в урок être, а должны уйти в будущий урок avoir.',
          uk: 'Фрази типу "я голодний" і "ти маєш рацію" у французькій зазвичай використовують avoir: j’ai faim, tu as raison. Вони не засунуті в урок être, а мають піти в майбутній урок avoir.',
        },
      ],
    },
    summary: {
      rows: rows.length,
      wordsFrSlots: validation.wordSlots,
      distractorSlots: validation.distractorSlots,
      distractorsPerSlot: 5,
      validationBlockers: validation.blockers.length,
      activationApproved: false,
      readyForApply: false,
      readyForAudio: false,
      readyForServerUpload: false,
      readyForRuntimeDelivery: false,
    },
    blockers: validation.blockers,
    productionBlockers: [
      'USER_REVIEW_NOT_DONE',
      'LLM_TRUSTED_SOURCE_REVIEW_NOT_DONE_FOR_THIS_REBUILD',
      'AUDIO_NOT_GENERATED',
      'SERVER_PACK_NOT_BUILT',
      'RUNTIME_DELIVERY_NOT_TESTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: {
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      firebaseUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_PATH, markdownFor(candidate), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    state.lesson01BlueprintRebuildCandidate = path.relative(ROOT, JSON_PATH).replace(/\\/g, '/');
    state.lesson01BlueprintRebuildCandidateMd = path.relative(ROOT, MD_PATH).replace(/\\/g, '/');
    state.lesson01BlueprintRebuildCandidateStatus = candidate.status;
    state.lesson01BlueprintRebuildCandidateSummary = candidate.summary;
    state.nextPassPlan = [
      'Run LLM trusted-source review for Lesson 1 blueprint rebuild candidate.',
      'Patch Lesson 1 rows if review finds any unnatural phrase, bad distractor, or weak source evidence.',
      'Only after Lesson 1 passes, use the same blueprint-first method for Lesson 2.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${candidate.status} rows=${candidate.summary.rows} words=${candidate.summary.wordsFrSlots} md=${path.relative(ROOT, MD_PATH).replace(/\\/g, '/')}`);
  if (validation.blockers.length > 0) process.exitCode = 1;
}

main();
