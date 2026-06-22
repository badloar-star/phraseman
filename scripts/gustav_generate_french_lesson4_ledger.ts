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

const LESSON_ID = 4;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_present_negation_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I do not drink milk': item('Je ne bois pas de lait', 'Je ne ___ pas de lait', 'bois', ['boit', 'buvons', 'buvez'], 'present_negation'),
  'You do not listen': item("Tu n'écoutes pas", "Tu n'___ pas", 'écoutes', ['écoute', 'écoutons', 'écoutez'], 'present_negation'),
  'He does not smoke': item('Il ne fume pas', 'Il ne ___ pas', 'fume', ['fumes', 'fumons', 'fument'], 'present_negation'),
  'She does not eat sugar': item('Elle ne mange pas de sucre', 'Elle ne ___ pas de sucre', 'mange', ['manges', 'mangeons', 'mangent'], 'present_negation'),
  'We do not understand': item('Nous ne comprenons pas', 'Nous ne ___ pas', 'comprenons', ['comprends', 'comprend', 'comprenez'], 'present_negation'),
  'They do not live here': item("Ils n'habitent pas ici", "Ils n'___ pas ici", 'habitent', ['habite', 'habitons', 'habitez'], 'present_negation'),
  'It does not work': item('Ça ne marche pas', 'Ça ne ___ pas', 'marche', ['marches', 'marchons', 'marchent'], 'present_negation'),
  'You do not know the address': item("Vous ne connaissez pas l'adresse", "Vous ne ___ pas l'adresse", 'connaissez', ['connais', 'connaît', 'connaissons'], 'present_negation'),
  'He does not eat meat': item('Il ne mange pas de viande', 'Il ne ___ pas de viande', 'mange', ['manges', 'mangeons', 'mangent'], 'present_negation'),
  'I do not remember the number': item('Je ne me souviens pas du numéro', 'Je ne me ___ pas du numéro', 'souviens', ['souvient', 'souvenons', 'souvenez'], 'present_reflexive_negation'),
  'We do not buy it': item("Nous ne l'achetons pas", "Nous ne l'___ pas", 'achetons', ['achète', 'achètes', 'achetez'], 'present_negation'),
  'She does not drink coffee': item('Elle ne boit pas de café', 'Elle ne ___ pas de café', 'boit', ['bois', 'buvons', 'boivent'], 'present_negation'),
  'You do not use a password': item("Vous n'utilisez pas de mot de passe", "Vous n'___ pas de mot de passe", 'utilisez', ['utilise', 'utilisons', 'utilisent'], 'present_negation'),
  'He does not see the problem': item('Il ne voit pas le problème', 'Il ne ___ pas le problème', 'voit', ['vois', 'voyons', 'voyez'], 'present_negation'),
  'They do not wear masks': item('Ils ne portent pas de masques', 'Ils ne ___ pas de masques', 'portent', ['porte', 'portons', 'portez'], 'present_negation'),
  'I do not eat spicy food': item('Je ne mange pas épicé', 'Je ne ___ pas épicé', 'mange', ['manges', 'mangeons', 'mangent'], 'present_negation'),
  'We do not pay cash': item('Nous ne payons pas en espèces', 'Nous ne ___ pas en espèces', 'payons', ['paie', 'payez', 'paient'], 'present_negation'),
  'She does not like risk': item("Elle n'aime pas le risque", "Elle n'___ pas le risque", 'aime', ['aimes', 'aimons', 'aiment'], 'present_negation'),
  'They do not sell tickets': item('Ils ne vendent pas de billets', 'Ils ne ___ pas de billets', 'vendent', ['vends', 'vendons', 'vendez'], 'present_negation'),
  'You do not understand rules': item('Vous ne comprenez pas les règles', 'Vous ne ___ pas les règles', 'comprenez', ['comprends', 'comprend', 'comprenons'], 'present_negation'),
  'He does not drive a bus': item('Il ne conduit pas de bus', 'Il ne ___ pas de bus', 'conduit', ['conduis', 'conduisons', 'conduisez'], 'present_negation'),
  'We do not lose hope': item('Nous ne perdons pas espoir', 'Nous ne ___ pas espoir', 'perdons', ['perds', 'perd', 'perdez'], 'present_negation'),
  'She does not change her opinion': item("Elle ne change pas d'avis", "Elle ne ___ pas d'avis", 'change', ['changes', 'changeons', 'changent'], 'present_negation'),
  'I do not feel fear': item('Je ne ressens pas de peur', 'Je ne ___ pas de peur', 'ressens', ['ressent', 'ressentons', 'ressentez'], 'present_negation'),
  'They do not spend money': item("Ils ne dépensent pas d'argent", "Ils ne ___ pas d'argent", 'dépensent', ['dépense', 'dépensons', 'dépensez'], 'present_negation'),
  'You do not listen to advice': item("Vous n'écoutez pas les conseils", "Vous n'___ pas les conseils", 'écoutez', ['écoute', 'écoutons', 'écoutent'], 'present_negation'),
  'He does not forget details': item("Il n'oublie pas les détails", "Il n'___ pas les détails", 'oublie', ['oublies', 'oublions', 'oublient'], 'present_negation'),
  'We do not believe ads': item('Nous ne croyons pas les publicités', 'Nous ne ___ pas les publicités', 'croyons', ['crois', 'croit', 'croyez'], 'present_negation'),
  'She does not cook breakfast': item('Elle ne prépare pas le petit déjeuner', 'Elle ne ___ pas le petit déjeuner', 'prépare', ['prépares', 'préparons', 'préparent'], 'present_negation'),
  'I do not break the law': item("Je n'enfreins pas la loi", "Je n'___ pas la loi", 'enfreins', ['enfreint', 'enfreignons', 'enfreignez'], 'present_negation'),
  'They do not trust strangers': item('Ils ne font pas confiance aux inconnus', 'Ils ne ___ pas confiance aux inconnus', 'font', ['fait', 'faisons', 'faites'], 'present_idiom_negation'),
  'We do not waste time': item('Nous ne perdons pas de temps', 'Nous ne ___ pas de temps', 'perdons', ['perds', 'perd', 'perdez'], 'present_negation'),
  'She does not read the news': item('Elle ne lit pas les informations', 'Elle ne ___ pas les informations', 'lit', ['lis', 'lisons', 'lisez'], 'present_negation'),
  'You do not wear a tie': item('Vous ne portez pas de cravate', 'Vous ne ___ pas de cravate', 'portez', ['porte', 'portons', 'portent'], 'present_negation'),
  'He does not take money': item("Il ne prend pas d'argent", "Il ne ___ pas d'argent", 'prend', ['prends', 'prenons', 'prennent'], 'present_negation'),
  'We do not share secrets': item('Nous ne partageons pas de secrets', 'Nous ne ___ pas de secrets', 'partageons', ['partage', 'partagez', 'partagent'], 'present_negation'),
  'She does not close the window': item('Elle ne ferme pas la fenêtre', 'Elle ne ___ pas la fenêtre', 'ferme', ['fermes', 'fermons', 'ferment'], 'present_negation'),
  'They do not drink wine': item('Ils ne boivent pas de vin', 'Ils ne ___ pas de vin', 'boivent', ['bois', 'boit', 'buvons'], 'present_negation'),
  'You do not pay a fine': item("Vous ne payez pas d'amende", "Vous ne ___ pas d'amende", 'payez', ['paie', 'payons', 'paient'], 'present_negation'),
  'He does not ask for help': item("Il ne demande pas d'aide", "Il ne ___ pas d'aide", 'demande', ['demandes', 'demandons', 'demandent'], 'present_negation'),
  'I do not carry cash': item("Je n'ai pas d'espèces sur moi", "Je n'___ pas d'espèces sur moi", 'ai', ['suis', 'as', 'avons'], 'avoir_idiom_negation'),
  'She does not send messages': item("Elle n'envoie pas de messages", "Elle n'___ pas de messages", 'envoie', ['envoies', 'envoyons', 'envoient'], 'present_negation'),
  'We do not watch TV': item('Nous ne regardons pas la télé', 'Nous ne ___ pas la télé', 'regardons', ['regarde', 'regardez', 'regardent'], 'present_negation'),
  'They do not use a map': item("Ils n'utilisent pas de carte", "Ils n'___ pas de carte", 'utilisent', ['utilise', 'utilisons', 'utilisez'], 'present_negation'),
  'You do not check the list': item('Vous ne vérifiez pas la liste', 'Vous ne ___ pas la liste', 'vérifiez', ['vérifie', 'vérifions', 'vérifient'], 'present_negation'),
  'I do not need help': item("Je n'ai pas besoin d'aide", "Je n'___ pas besoin d'aide", 'ai', ['suis', 'as', 'avons'], 'avoir_besoin_negation'),
  'He does not own a car': item("Il n'a pas de voiture", "Il n'___ pas de voiture", 'a', ['est', 'as', 'ont'], 'avoir_possession_negation'),
  'We do not skip breakfast': item('Nous ne sautons pas le petit déjeuner', 'Nous ne ___ pas le petit déjeuner', 'sautons', ['saute', 'sautez', 'sautent'], 'present_negation'),
  'She does not drink alcohol': item("Elle ne boit pas d'alcool", "Elle ne ___ pas d'alcool", 'boit', ['bois', 'buvons', 'boivent'], 'present_negation'),
  'They do not lose keys': item('Ils ne perdent pas les clés', 'Ils ne ___ pas les clés', 'perdent', ['perds', 'perdons', 'perdez'], 'present_negation'),
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
    '# GUSTAV French Lesson 4 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson4_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson4_present_negation_generation_batch_v1',
        'lesson4_negative_partitive_and_idiom_review_v1',
        'lesson4_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson4_row_ledger.json');
  const outMd = path.join(outDir, 'lesson4_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 4 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
