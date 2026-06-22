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

const LESSON_ID = 5;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_present_question_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'Do you drink coffee?': item('Est-ce que tu bois du café ?', 'Est-ce que tu ___ du café ?', 'bois', ['boit', 'buvons', 'buvez'], 'present_question'),
  'Does he live here?': item("Est-ce qu'il habite ici ?", "Est-ce qu'il ___ ici ?", 'habite', ['habites', 'habitons', 'habitent'], 'present_question'),
  'Do we work tomorrow?': item('Est-ce que nous travaillons demain ?', 'Est-ce que nous ___ demain ?', 'travaillons', ['travaille', 'travaillez', 'travaillent'], 'present_question'),
  'Does she understand English?': item("Est-ce qu'elle comprend l'anglais ?", "Est-ce qu'elle ___ l'anglais ?", 'comprend', ['comprends', 'comprenons', 'comprenez'], 'present_question'),
  'Do they know the password?': item("Est-ce qu'ils connaissent le mot de passe ?", "Est-ce qu'ils ___ le mot de passe ?", 'connaissent', ['connais', 'connaît', 'connaissons'], 'present_question'),
  'Do I write correctly?': item("Est-ce que j'écris correctement ?", "Est-ce que j'___ correctement ?", 'écris', ['écrit', 'écrivons', 'écrivez'], 'present_question'),
  'Does it cost much?': item('Est-ce que ça coûte cher ?', 'Est-ce que ça ___ cher ?', 'coûte', ['coûtes', 'coûtons', 'coûtent'], 'present_question'),
  'Do you travel often?': item('Est-ce que vous voyagez souvent ?', 'Est-ce que vous ___ souvent ?', 'voyagez', ['voyage', 'voyageons', 'voyagent'], 'present_question'),
  'Does he drink tea?': item("Est-ce qu'il boit du thé ?", "Est-ce qu'il ___ du thé ?", 'boit', ['bois', 'buvons', 'boivent'], 'present_question'),
  'Do we use this code?': item('Est-ce que nous utilisons ce code ?', 'Est-ce que nous ___ ce code ?', 'utilisons', ['utilise', 'utilisez', 'utilisent'], 'present_question'),
  'Does she wear a mask?': item("Est-ce qu'elle porte un masque ?", "Est-ce qu'elle ___ un masque ?", 'porte', ['portes', 'portons', 'portent'], 'present_question'),
  'Do they sell tickets?': item("Est-ce qu'ils vendent des billets ?", "Est-ce qu'ils ___ des billets ?", 'vendent', ['vends', 'vendons', 'vendez'], 'present_question'),
  'Do I look tired?': item("Est-ce que j'ai l'air fatigué ?", "Est-ce que j'___ l'air fatigué ?", 'ai', ['suis', 'as', 'avons'], 'avoir_air_question'),
  'Do you remember the address?': item("Est-ce que tu te souviens de l'adresse ?", "Est-ce que tu te ___ de l'adresse ?", 'souviens', ['souvient', 'souvenons', 'souvenez'], 'reflexive_question'),
  'Does he buy food?': item("Est-ce qu'il achète de la nourriture ?", "Est-ce qu'il ___ de la nourriture ?", 'achète', ['achètes', 'achetons', 'achetez'], 'present_question'),
  'Do we pay cash?': item('Est-ce que nous payons en espèces ?', 'Est-ce que nous ___ en espèces ?', 'payons', ['paie', 'payez', 'paient'], 'present_question'),
  'Do they smoke here?': item("Est-ce qu'ils fument ici ?", "Est-ce qu'ils ___ ici ?", 'fument', ['fume', 'fumons', 'fumez'], 'present_question'),
  'Does she eat meat?': item("Est-ce qu'elle mange de la viande ?", "Est-ce qu'elle ___ de la viande ?", 'mange', ['manges', 'mangeons', 'mangent'], 'present_question'),
  'Do you hear a noise?': item('Est-ce que vous entendez un bruit ?', 'Est-ce que vous ___ un bruit ?', 'entendez', ['entends', 'entend', 'entendons'], 'present_question'),
  'Does he call often?': item("Est-ce qu'il appelle souvent ?", "Est-ce qu'il ___ souvent ?", 'appelle', ['appelles', 'appelons', 'appellent'], 'present_question'),
  'Do I sing well?': item('Est-ce que je chante bien ?', 'Est-ce que je ___ bien ?', 'chante', ['chantes', 'chantons', 'chantent'], 'present_question'),
  'Do we order pizza?': item('Est-ce que nous commandons une pizza ?', 'Est-ce que nous ___ une pizza ?', 'commandons', ['commande', 'commandez', 'commandent'], 'present_question'),
  'Does she believe in luck?': item("Est-ce qu'elle croit à la chance ?", "Est-ce qu'elle ___ à la chance ?", 'croit', ['crois', 'croyons', 'croyez'], 'present_question'),
  'Do they speak English?': item("Est-ce qu'ils parlent anglais ?", "Est-ce qu'ils ___ anglais ?", 'parlent', ['parle', 'parlons', 'parlez'], 'present_question'),
  'Do you understand the risk?': item('Est-ce que vous comprenez le risque ?', 'Est-ce que vous ___ le risque ?', 'comprenez', ['comprends', 'comprend', 'comprenons'], 'present_question'),
  'Does he drive a car?': item("Est-ce qu'il conduit une voiture ?", "Est-ce qu'il ___ une voiture ?", 'conduit', ['conduis', 'conduisons', 'conduisez'], 'present_question'),
  'Do we lose money?': item("Est-ce que nous perdons de l'argent ?", "Est-ce que nous ___ de l'argent ?", 'perdons', ['perds', 'perd', 'perdez'], 'present_question'),
  'Does she read books?': item("Est-ce qu'elle lit des livres ?", "Est-ce qu'elle ___ des livres ?", 'lit', ['lis', 'lisons', 'lisez'], 'present_question'),
  'Do they help people?': item("Est-ce qu'ils aident les gens ?", "Est-ce qu'ils ___ les gens ?", 'aident', ['aide', 'aidons', 'aidez'], 'present_question'),
  'Do you feel cold?': item('Est-ce que tu as froid ?', 'Est-ce que tu ___ froid ?', 'as', ['es', 'a', 'avez'], 'avoir_froid_question'),
  'Do you change the password often?': item('Est-ce que vous changez souvent le mot de passe ?', 'Est-ce que vous ___ souvent le mot de passe ?', 'changez', ['change', 'changeons', 'changent'], 'present_question'),
  'Does he know the price?': item("Est-ce qu'il connaît le prix ?", "Est-ce qu'il ___ le prix ?", 'connaît', ['connais', 'connaissons', 'connaissez'], 'present_question'),
  'Do we book a table?': item('Est-ce que nous réservons une table ?', 'Est-ce que nous ___ une table ?', 'réservons', ['réserve', 'réservez', 'réservent'], 'present_question'),
  'Does she need a doctor?': item("Est-ce qu'elle a besoin d'un médecin ?", "Est-ce qu'elle ___ besoin d'un médecin ?", 'a', ['est', 'as', 'ont'], 'avoir_besoin_question'),
  'Do they accept credit cards?': item("Est-ce qu'ils acceptent les cartes de crédit ?", "Est-ce qu'ils ___ les cartes de crédit ?", 'acceptent', ['accepte', 'acceptons', 'acceptez'], 'present_question'),
  'Do we go inside?': item('Est-ce que nous entrons ?', 'Est-ce que nous ___ ?', 'entrons', ['entre', 'entrez', 'entrent'], 'present_question'),
  'Does she feel pain?': item("Est-ce qu'elle ressent de la douleur ?", "Est-ce qu'elle ___ de la douleur ?", 'ressent', ['ressens', 'ressentons', 'ressentez'], 'present_question'),
  'Do they know the answer?': item("Est-ce qu'ils connaissent la réponse ?", "Est-ce qu'ils ___ la réponse ?", 'connaissent', ['connais', 'connaît', 'connaissons'], 'present_question'),
  'Do I look good?': item("Est-ce que j'ai l'air bien ?", "Est-ce que j'___ l'air bien ?", 'ai', ['suis', 'as', 'avons'], 'avoir_air_question'),
  'Do you wear glasses?': item('Est-ce que tu portes des lunettes ?', 'Est-ce que tu ___ des lunettes ?', 'portes', ['porte', 'portons', 'portent'], 'present_question'),
  'Do you understand the rules?': item('Est-ce que vous comprenez les règles ?', 'Est-ce que vous ___ les règles ?', 'comprenez', ['comprends', 'comprend', 'comprenons'], 'present_question'),
  'Does he often forget keys?': item("Est-ce qu'il oublie souvent ses clés ?", "Est-ce qu'il ___ souvent ses clés ?", 'oublie', ['oublies', 'oublions', 'oublient'], 'present_question'),
  'Do we pay taxes?': item('Est-ce que nous payons des impôts ?', 'Est-ce que nous ___ des impôts ?', 'payons', ['paie', 'payez', 'paient'], 'present_question'),
  'Does she look for a job?': item("Est-ce qu'elle cherche un emploi ?", "Est-ce qu'elle ___ un emploi ?", 'cherche', ['cherches', 'cherchons', 'cherchent'], 'present_question'),
  'Do they sell vegetables?': item("Est-ce qu'ils vendent des légumes ?", "Est-ce qu'ils ___ des légumes ?", 'vendent', ['vends', 'vendons', 'vendez'], 'present_question'),
  'Do I sleep enough?': item('Est-ce que je dors assez ?', 'Est-ce que je ___ assez ?', 'dors', ['dort', 'dormons', 'dormez'], 'present_question'),
  'Do we book a room?': item('Est-ce que nous réservons une chambre ?', 'Est-ce que nous ___ une chambre ?', 'réservons', ['réserve', 'réservez', 'réservent'], 'present_question'),
  'Does he find mistakes?': item("Est-ce qu'il trouve des erreurs ?", "Est-ce qu'il ___ des erreurs ?", 'trouve', ['trouves', 'trouvons', 'trouvent'], 'present_question'),
  'Does she often cook dinner?': item("Est-ce qu'elle prépare souvent le dîner ?", "Est-ce qu'elle ___ souvent le dîner ?", 'prépare', ['prépares', 'préparons', 'préparent'], 'present_question'),
  'Do they hear us?': item("Est-ce qu'ils nous entendent ?", "Est-ce qu'ils nous ___ ?", 'entendent', ['entends', 'entendons', 'entendez'], 'present_question'),
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
    '# GUSTAV French Lesson 5 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson5_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson5_present_question_generation_batch_v1',
        'lesson5_est_ce_que_question_mapping_review_v1',
        'lesson5_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson5_row_ledger.json');
  const outMd = path.join(outDir, 'lesson5_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 5 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
