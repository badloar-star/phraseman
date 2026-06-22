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

const LESSON_ID = 7;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_avoir_possession_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I have insurance': item("J'ai une assurance", "J'___ une assurance", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  "He has a driver's license": item('Il a un permis de conduire', 'Il ___ un permis de conduire', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'We have free time': item('Nous avons du temps libre', 'Nous ___ du temps libre', 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'She has an allergy': item('Elle a une allergie', 'Elle ___ une allergie', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'Do they have a reservation?': item('Est-ce qu’ils ont une réservation ?', 'Est-ce qu’ils ___ une réservation ?', 'ont', ['a', 'avons', 'avez'], 'avoir_question'),
  'I have a lighter': item("J'ai un briquet", "J'___ un briquet", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'He has a pass': item('Il a un laissez-passer', 'Il ___ un laissez-passer', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'I have cash': item("J'ai de l'argent liquide", "J'___ de l'argent liquide", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'Does she have a tablet?': item('Est-ce qu’elle a une tablette ?', 'Est-ce qu’elle ___ une tablette ?', 'a', ['ai', 'as', 'ont'], 'avoir_question'),
  'We have change': item('Nous avons de la monnaie', 'Nous ___ de la monnaie', 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'They do not have chargers': item("Ils n'ont pas de chargeurs", "Ils n'___ pas de chargeurs", 'ont', ['a', 'avons', 'avez'], 'avoir_negation'),
  'Do I have a passport?': item("Est-ce que j'ai un passeport ?", "Est-ce que j'___ un passeport ?", 'ai', ['as', 'a', 'avons'], 'avoir_question'),
  'She has the menu': item('Elle a le menu', 'Elle ___ le menu', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'Does he have a device?': item('Est-ce qu’il a un appareil ?', 'Est-ce qu’il ___ un appareil ?', 'a', ['ai', 'as', 'ont'], 'avoir_question'),
  'They have a discount': item('Ils ont une réduction', 'Ils ___ une réduction', 'ont', ['a', 'avons', 'avez'], 'avoir_possession'),
  'I have a city map': item("J'ai un plan de la ville", "J'___ un plan de la ville", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'Does she have an umbrella?': item('Est-ce qu’elle a un parapluie ?', 'Est-ce qu’elle ___ un parapluie ?', 'a', ['ai', 'as', 'ont'], 'avoir_question'),
  'We have Wi-Fi': item('Nous avons le Wi-Fi', 'Nous ___ le Wi-Fi', 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'He has a headache': item('Il a mal à la tête', 'Il ___ mal à la tête', 'a', ['ai', 'as', 'ont'], 'avoir_sensation'),
  'Do they have hotel bookings?': item('Est-ce qu’ils ont des réservations d’hôtel ?', 'Est-ce qu’ils ___ des réservations d’hôtel ?', 'ont', ['a', 'avons', 'avez'], 'avoir_question'),
  'I have a spare key': item("J'ai une clé de rechange", "J'___ une clé de rechange", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'She has an appetite': item('Elle a de l’appétit', 'Elle ___ de l’appétit', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'Does he have an international passport?': item('Est-ce qu’il a un passeport international ?', 'Est-ce qu’il ___ un passeport international ?', 'a', ['ai', 'as', 'ont'], 'avoir_question'),
  'They do not have a question': item("Ils n'ont pas de question", "Ils n'___ pas de question", 'ont', ['a', 'avons', 'avez'], 'avoir_negation'),
  'I have a phone charger': item("J'ai un chargeur de téléphone", "J'___ un chargeur de téléphone", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'She has my address': item('Elle a mon adresse', 'Elle ___ mon adresse', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'He does not have a pen': item("Il n'a pas de stylo", "Il n'___ pas de stylo", 'a', ['ai', 'as', 'ont'], 'avoir_negation'),
  'We have a lunch break': item('Nous avons une pause déjeuner', 'Nous ___ une pause déjeuner', 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'Do they have return tickets?': item('Est-ce qu’ils ont des billets retour ?', 'Est-ce qu’ils ___ des billets retour ?', 'ont', ['a', 'avons', 'avez'], 'avoir_question'),
  'I have a nut allergy': item("J'ai une allergie aux noix", "J'___ une allergie aux noix", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'She has a ticket confirmation': item('Elle a une confirmation de billet', 'Elle ___ une confirmation de billet', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'Does he have a power bank?': item('Est-ce qu’il a une batterie externe ?', 'Est-ce qu’il ___ une batterie externe ?', 'a', ['ai', 'as', 'ont'], 'avoir_question'),
  'They do not have documents': item("Ils n'ont pas de documents", "Ils n'___ pas de documents", 'ont', ['a', 'avons', 'avez'], 'avoir_negation'),
  'I do not have this issue': item("Je n'ai pas ce problème", "Je n'___ pas ce problème", 'ai', ['as', 'a', 'avons'], 'avoir_negation'),
  'She has a suitcase': item('Elle a une valise', 'Elle ___ une valise', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'He has a bicycle': item('Il a un vélo', 'Il ___ un vélo', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'We have cash with us': item("Nous avons de l'argent liquide sur nous", "Nous ___ de l'argent liquide sur nous", 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'They have the reservation number': item('Ils ont le numéro de réservation', 'Ils ___ le numéro de réservation', 'ont', ['a', 'avons', 'avez'], 'avoir_possession'),
  'I do not have a lighter': item("Je n'ai pas de briquet", "Je n'___ pas de briquet", 'ai', ['as', 'a', 'avons'], 'avoir_negation'),
  'She has a dog': item('Elle a un chien', 'Elle ___ un chien', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'He has a backpack': item('Il a un sac à dos', 'Il ___ un sac à dos', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'We do not have time for lunch': item("Nous n'avons pas le temps de déjeuner", "Nous n'___ pas le temps de déjeuner", 'avons', ['ai', 'avez', 'ont'], 'avoir_negation'),
  'Do they have a plan?': item('Est-ce qu’ils ont un plan ?', 'Est-ce qu’ils ___ un plan ?', 'ont', ['a', 'avons', 'avez'], 'avoir_question'),
  'I have a question about the policy': item("J'ai une question sur le règlement", "J'___ une question sur le règlement", 'ai', ['as', 'a', 'avons'], 'avoir_possession'),
  'She has a discount with us': item('Elle a une réduction chez nous', 'Elle ___ une réduction chez nous', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
  'He does not have his passport': item("Il n'a pas son passeport", "Il n'___ pas son passeport", 'a', ['ai', 'as', 'ont'], 'avoir_negation'),
  'We have all the documents needed': item('Nous avons tous les documents nécessaires', 'Nous ___ tous les documents nécessaires', 'avons', ['ai', 'avez', 'ont'], 'avoir_possession'),
  'They have a city guide and a map': item('Ils ont un guide de la ville et un plan', 'Ils ___ un guide de la ville et un plan', 'ont', ['a', 'avons', 'avez'], 'avoir_possession'),
  'I do not have time for coffee': item("Je n'ai pas le temps de prendre un café", "Je n'___ pas le temps de prendre un café", 'ai', ['as', 'a', 'avons'], 'avoir_negation'),
  'She has good news': item('Elle a de bonnes nouvelles', 'Elle ___ de bonnes nouvelles', 'a', ['ai', 'as', 'ont'], 'avoir_possession'),
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
    '# GUSTAV French Lesson 7 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson7_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson7_avoir_generation_batch_v1',
        'lesson7_possession_negation_question_mapping_review_v1',
        'lesson7_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson7_row_ledger.json');
  const outMd = path.join(outDir, 'lesson7_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 7 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
