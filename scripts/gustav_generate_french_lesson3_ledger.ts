import * as fs from 'node:fs';
import * as path from 'node:path';

type SourcePhrase = {
  id: string;
  lessonId: number;
  order?: number;
  targetText: string;
  sourcePrompts?: {
    ru?: string;
    uk?: string;
  };
  sourceRef?: {
    file?: string;
    line?: number;
  };
};

type SourceGraph = {
  phrases: SourcePhrase[];
};

type WordFr = {
  text: string;
  correct: string;
  distractors: string[];
  category: string;
};

type TranslationSpec = {
  proposedFrench: string;
  wordsFr: WordFr[];
};

const LESSON_ID = 3;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_present_tense_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I work here': item('Je travaille ici', 'Je ___ ici', 'travaille', ['travailles', 'travaillons', 'travaillent'], 'present_regular_er'),
  'You understand me': item('Tu me comprends', 'Tu me ___', 'comprends', ['comprend', 'comprenons', 'comprenez'], 'present_irregular'),
  'He lives in London': item('Il habite à Londres', 'Il ___ à Londres', 'habite', ['habites', 'habitons', 'habitent'], 'present_regular_er'),
  'We drink coffee': item('Nous buvons du café', 'Nous ___ du café', 'buvons', ['bois', 'boit', 'buvez'], 'present_irregular'),
  'She speaks English': item('Elle parle anglais', 'Elle ___ anglais', 'parle', ['parles', 'parlons', 'parlent'], 'present_regular_er'),
  'They watch the news': item('Ils regardent les informations', 'Ils ___ les informations', 'regardent', ['regarde', 'regardons', 'regardez'], 'present_regular_er'),
  'It helps people': item('Ça aide les gens', 'Ça ___ les gens', 'aide', ['aides', 'aidons', 'aident'], 'present_regular_er'),
  'You know the answer': item('Vous connaissez la réponse', 'Vous ___ la réponse', 'connaissez', ['connais', 'connaît', 'connaissons'], 'present_irregular'),
  'He eats meat': item('Il mange de la viande', 'Il ___ de la viande', 'mange', ['manges', 'mangeons', 'mangent'], 'present_regular_er'),
  'I believe you': item('Je vous crois', 'Je vous ___', 'crois', ['croit', 'croyons', 'croyez'], 'present_irregular'),
  'She loves music': item('Elle aime la musique', 'Elle ___ la musique', 'aime', ['aimes', 'aimons', 'aiment'], 'present_regular_er'),
  'We buy food': item('Nous achetons de la nourriture', 'Nous ___ de la nourriture', 'achetons', ['achète', 'achètes', 'achetez'], 'present_stem_change'),
  'It costs a dollar': item('Ça coûte un dollar', 'Ça ___ un dollar', 'coûte', ['coûtes', 'coûtons', 'coûtent'], 'present_regular_er'),
  'They live here': item('Ils habitent ici', 'Ils ___ ici', 'habitent', ['habite', 'habitons', 'habitez'], 'present_regular_er'),
  'You read books': item('Vous lisez des livres', 'Vous ___ des livres', 'lisez', ['lis', 'lit', 'lisons'], 'present_irregular'),
  'I come home late': item('Je rentre tard à la maison', 'Je ___ tard à la maison', 'rentre', ['rentres', 'rentrons', 'rentrent'], 'present_regular_er'),
  'He writes messages': item('Il écrit des messages', 'Il ___ des messages', 'écrit', ['écris', 'écrivons', 'écrivent'], 'present_irregular'),
  'We listen to music': item('Nous écoutons de la musique', 'Nous ___ de la musique', 'écoutons', ['écoute', 'écoutes', 'écoutez'], 'present_regular_er'),
  'She washes the dishes': item('Elle fait la vaisselle', 'Elle ___ la vaisselle', 'fait', ['fais', 'font', 'faisons'], 'present_irregular_idiom'),
  'They drive a car': item('Ils conduisent une voiture', 'Ils ___ une voiture', 'conduisent', ['conduit', 'conduisons', 'conduisez'], 'present_irregular'),
  'You deserve it': item('Vous le méritez', 'Vous le ___', 'méritez', ['mérite', 'méritons', 'méritent'], 'present_regular_er'),
  'He often calls': item('Il appelle souvent', 'Il ___ souvent', 'appelle', ['appelles', 'appelons', 'appellent'], 'present_stem_change'),
  'She cooks dinner': item('Elle prépare le dîner', 'Elle ___ le dîner', 'prépare', ['prépares', 'préparons', 'préparent'], 'present_regular_er'),
  'I feel pain': item('Je ressens de la douleur', 'Je ___ de la douleur', 'ressens', ['ressent', 'ressentons', 'ressentez'], 'present_irregular'),
  'We promise help': item('Nous promettons notre aide', 'Nous ___ notre aide', 'promettons', ['promets', 'promet', 'promettez'], 'present_irregular'),
  'They travel often': item('Ils voyagent souvent', 'Ils ___ souvent', 'voyagent', ['voyage', 'voyageons', 'voyagez'], 'present_regular_er'),
  'It seems strange': item('Ça semble étrange', 'Ça ___ étrange', 'semble', ['sembles', 'semblons', 'semblent'], 'present_regular_er'),
  'We value time': item('Nous valorisons le temps', 'Nous ___ le temps', 'valorisons', ['valorise', 'valorisez', 'valorisent'], 'present_regular_er'),
  'She teaches math': item('Elle enseigne les mathématiques', 'Elle ___ les mathématiques', 'enseigne', ['enseignes', 'enseignons', 'enseignent'], 'present_regular_er'),
  'You forget keys': item('Vous oubliez les clés', 'Vous ___ les clés', 'oubliez', ['oublie', 'oublions', 'oublient'], 'present_regular_er'),
  'I remember this password': item('Je me souviens de ce mot de passe', 'Je me ___ de ce mot de passe', 'souviens', ['souvient', 'souvenons', 'souvenez'], 'present_reflexive'),
  'He wears glasses': item('Il porte des lunettes', 'Il ___ des lunettes', 'porte', ['portes', 'portons', 'portent'], 'present_regular_er'),
  'We order pizza': item('Nous commandons une pizza', 'Nous ___ une pizza', 'commandons', ['commande', 'commandez', 'commandent'], 'present_regular_er'),
  'She uses the internet': item('Elle utilise Internet', 'Elle ___ Internet', 'utilise', ['utilises', 'utilisons', 'utilisent'], 'present_regular_er'),
  'They work here': item('Ils travaillent ici', 'Ils ___ ici', 'travaillent', ['travaille', 'travaillons', 'travaillez'], 'present_regular_er'),
  'You deserve rest': item('Vous méritez du repos', 'Vous ___ du repos', 'méritez', ['mérite', 'méritons', 'méritent'], 'present_regular_er'),
  'They often call': item('Ils appellent souvent', 'Ils ___ souvent', 'appellent', ['appelle', 'appelons', 'appelez'], 'present_stem_change'),
  'She teaches music': item('Elle enseigne la musique', 'Elle ___ la musique', 'enseigne', ['enseignes', 'enseignons', 'enseignent'], 'present_regular_er'),
  'We trust you': item('Nous te faisons confiance', 'Nous te ___ confiance', 'faisons', ['fais', 'faites', 'font'], 'present_irregular_idiom'),
  'It takes time': item('Ça prend du temps', 'Ça ___ du temps', 'prend', ['prends', 'prenons', 'prennent'], 'present_irregular'),
  'I understand the problem': item('Je comprends le problème', 'Je ___ le problème', 'comprends', ['comprend', 'comprenons', 'comprenez'], 'present_irregular'),
  'You look great': item("Vous avez l'air très bien", "Vous ___ l'air très bien", 'avez', ['êtes', 'avons', 'ont'], 'idiom_avoir_air'),
  'He drinks tea': item('Il boit du thé', 'Il ___ du thé', 'boit', ['bois', 'buvons', 'boivent'], 'present_irregular'),
  'She knows the address': item("Elle connaît l'adresse", "Elle ___ l'adresse", 'connaît', ['connais', 'connaissons', 'connaissez'], 'present_irregular'),
  'We wait here': item('Nous attendons ici', 'Nous ___ ici', 'attendons', ['attends', 'attend', 'attendez'], 'present_regular_re'),
  'They come on time': item("Ils arrivent à l'heure", "Ils ___ à l'heure", 'arrivent', ['arrive', 'arrivons', 'arrivez'], 'present_regular_er'),
  'It sounds good': item('Ça sonne bien', 'Ça ___ bien', 'sonne', ['sonnes', 'sonnons', 'sonnent'], 'present_regular_er'),
  'We order a taxi': item('Nous commandons un taxi', 'Nous ___ un taxi', 'commandons', ['commande', 'commandez', 'commandent'], 'present_regular_er'),
  'He remembers me': item('Il se souvient de moi', 'Il se ___ de moi', 'souvient', ['souviens', 'souvenons', 'souvenez'], 'present_reflexive'),
  'You help friends': item('Vous aidez des amis', 'Vous ___ des amis', 'aidez', ['aide', 'aidons', 'aident'], 'present_regular_er'),
};

function item(proposedFrench: string, text: string, correct: string, distractors: string[], category: string): TranslationSpec {
  return {
    proposedFrench,
    wordsFr: [{ text, correct, distractors, category }],
  };
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function repairMojibake(value: string): string {
  if (!/[ÃÐÑ]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function renderMarkdown(ledger: Record<string, unknown>, outJson: string, repoRoot: string): string {
  const rows = Array.isArray(ledger.rows) ? ledger.rows as Array<Record<string, unknown>> : [];
  const lines = [
    '# GUSTAV French Lesson 3 Generated Ledger',
    '',
    `Output: \`${artifactPath(repoRoot, outJson)}\``,
    '',
    `Rows: ${rows.length}`,
    '',
    'Activation status: `blocked_pending_source_review`',
    '',
    'Active app seed allowed: `false`',
    '',
    '## Sample',
    '',
  ];
  for (const row of rows.slice(0, 10)) {
    lines.push(`- \`${String(row.phraseId)}\`: ${String(row.englishBase)} -> ${String(row.proposedFrench)}`);
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This file is generated inside the Gustav run container only.',
    '- It does not modify production app files.',
    '- Every row remains blocked for app activation until generated-content audit and apply approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson3_ledger.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const readiness = readJson<Record<string, unknown>>(path.join(runDir, 'audits', 'gustav_readiness_gate.json'));
  const readinessState = readiness.readiness as Record<string, unknown> | undefined;
  if (!readinessState || readinessState.canStartFrenchGeneration !== true) {
    throw new Error('Readiness gate does not allow French generation.');
  }

  const graphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const graph = readJson<SourceGraph>(graphPath);
  const lessonRows = graph.phrases
    .filter((phrase) => phrase.lessonId === LESSON_ID)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (lessonRows.length !== 50) {
    throw new Error(`Expected 50 lesson ${LESSON_ID} rows, found ${lessonRows.length}.`);
  }

  const lessonTexts = new Set(lessonRows.map((row) => row.targetText));
  const unusedTranslations = Object.keys(TRANSLATIONS).filter((text) => !lessonTexts.has(text));
  if (unusedTranslations.length > 0) {
    throw new Error(`Translation table has unused rows: ${unusedTranslations.join(', ')}`);
  }

  const rows = lessonRows.map((phrase) => {
    const translation = TRANSLATIONS[phrase.targetText];
    if (!translation) throw new Error(`Missing French translation for ${phrase.targetText}`);
    const russianMeaning = phrase.sourcePrompts?.ru;
    const ukrainianMeaning = phrase.sourcePrompts?.uk;
    if (!russianMeaning || !ukrainianMeaning) {
      throw new Error(`Missing RU/UK meaning for ${phrase.id}`);
    }
    return {
      phraseId: phrase.id,
      englishBase: phrase.targetText,
      russianMeaning: repairMojibake(russianMeaning),
      ukrainianMeaning: repairMojibake(ukrainianMeaning),
      proposedFrench: translation.proposedFrench,
      wordsFr: translation.wordsFr,
      evidenceClaimIds: [
        'lesson3_present_tense_generation_batch_v1',
        'lesson3_french_idiom_mapping_review_v1',
        'lesson3_source_graph_ru_uk_meaning_v1',
      ],
      requiredEvidence: REQUIRED_EVIDENCE,
      reviewerStatus: 'needs_review',
      activationStatus: 'blocked',
    };
  });

  const ledger = {
    schemaVersion: 'gustav-french-lesson-row-ledger-v0',
    runId,
    lessonId: LESSON_ID,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceFile: lessonRows[0]?.sourceRef?.file ?? artifactPath(repoRoot, graphPath),
    activationStatus: 'blocked_pending_source_review',
    activeAppSeedAllowed: false,
    rows,
  };

  const outDir = path.join(runDir, 'generated', 'fr', 'lessons');
  ensureDir(outDir);
  const outJson = path.join(outDir, 'lesson3_row_ledger.json');
  const outMd = path.join(outDir, 'lesson3_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 3 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
