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

const LESSON_ID = 6;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_wh_question_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'Where do you live?': q('Où est-ce que tu habites ?', '___ est-ce que tu habites ?', 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'What does he eat?': q("Qu'est-ce qu'il mange ?", "___ il mange ?", "Qu'est-ce qu'", "Où est-ce qu'", "Quand est-ce qu'", "Pourquoi est-ce qu'", 'question_word_what'),
  'When do we start?': q('Quand est-ce que nous commençons ?', '___ est-ce que nous commençons ?', 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'Why does she cry?': q("Pourquoi est-ce qu'elle pleure ?", "___ est-ce qu'elle pleure ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'How do they work?': q("Comment est-ce qu'ils travaillent ?", "___ est-ce qu'ils travaillent ?", 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'How much does it cost?': q('Combien ça coûte ?', '___ ça coûte ?', 'Combien', ['Comment', 'Quand', 'Pourquoi'], 'question_word_how_much'),
  'What do you drink?': q("Qu'est-ce que tu bois ?", '___ tu bois ?', "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where do they buy tickets?': q("Où est-ce qu'ils achètent des billets ?", "___ est-ce qu'ils achètent des billets ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'When does she call?': q("Quand est-ce qu'elle appelle ?", "___ est-ce qu'elle appelle ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'Why do we wait?': q('Pourquoi est-ce que nous attendons ?', '___ est-ce que nous attendons ?', 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'How do you get home?': q('Comment est-ce que tu rentres chez toi ?', '___ est-ce que tu rentres chez toi ?', 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Where does he go?': q("Où est-ce qu'il va ?", "___ est-ce qu'il va ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'What do we read?': q("Qu'est-ce que nous lisons ?", '___ nous lisons ?', "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'When does she usually come?': q("Quand est-ce qu'elle vient d'habitude ?", "___ est-ce qu'elle vient d'habitude ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'Why do they close the door?': q("Pourquoi est-ce qu'ils ferment la porte ?", "___ est-ce qu'ils ferment la porte ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'What do you usually buy?': q("Qu'est-ce que tu achètes d'habitude ?", "___ tu achètes d'habitude ?", "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where does he work?': q("Où est-ce qu'il travaille ?", "___ est-ce qu'il travaille ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'Why do we pay now?': q('Pourquoi est-ce que nous payons maintenant ?', '___ est-ce que nous payons maintenant ?', 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'How does she open the window?': q("Comment est-ce qu'elle ouvre la fenêtre ?", "___ est-ce qu'elle ouvre la fenêtre ?", 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'When do they come home?': q("Quand est-ce qu'ils rentrent à la maison ?", "___ est-ce qu'ils rentrent à la maison ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'What do I sign?': q("Qu'est-ce que je signe ?", '___ je signe ?', "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where do we send the report?': q('Où est-ce que nous envoyons le rapport ?', '___ est-ce que nous envoyons le rapport ?', 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'How does he do it?': q("Comment est-ce qu'il le fait ?", "___ est-ce qu'il le fait ?", 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Why does she want to leave?': q("Pourquoi est-ce qu'elle veut partir ?", "___ est-ce qu'elle veut partir ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When do they finish work?': q("Quand est-ce qu'ils finissent le travail ?", "___ est-ce qu'ils finissent le travail ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'What do you see?': q("Qu'est-ce que tu vois ?", '___ tu vois ?', "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where does he keep keys?': q("Où est-ce qu'il garde les clés ?", "___ est-ce qu'il garde les clés ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'How do we find the exit?': q('Comment est-ce que nous trouvons la sortie ?', '___ est-ce que nous trouvons la sortie ?', 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Why does she carry this bag?': q("Pourquoi est-ce qu'elle porte ce sac ?", "___ est-ce qu'elle porte ce sac ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When do they open the shop?': q("Quand est-ce qu'ils ouvrent le magasin ?", "___ est-ce qu'ils ouvrent le magasin ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'Where do we meet guests?': q('Où est-ce que nous accueillons les invités ?', '___ est-ce que nous accueillons les invités ?', 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'What does she usually cook?': q("Qu'est-ce qu'elle cuisine d'habitude ?", "___ elle cuisine d'habitude ?", "Qu'est-ce qu'", "Où est-ce qu'", "Quand est-ce qu'", "Pourquoi est-ce qu'", 'question_word_what'),
  'Why do they ask for help?': q("Pourquoi est-ce qu'ils demandent de l'aide ?", "___ est-ce qu'ils demandent de l'aide ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When does he check his mail?': q("Quand est-ce qu'il vérifie son courrier ?", "___ est-ce qu'il vérifie son courrier ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'How do you find it?': q('Comment est-ce que tu le trouves ?', '___ est-ce que tu le trouves ?', 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'What do you usually wear?': q("Qu'est-ce que tu portes d'habitude ?", "___ tu portes d'habitude ?", "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where does he buy groceries?': q("Où est-ce qu'il achète des provisions ?", "___ est-ce qu'il achète des provisions ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'How do we book it?': q('Comment est-ce que nous le réservons ?', '___ est-ce que nous le réservons ?', 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Why does she speak slowly?': q("Pourquoi est-ce qu'elle parle lentement ?", "___ est-ce qu'elle parle lentement ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When do they start the meeting?': q("Quand est-ce qu'ils commencent la réunion ?", "___ est-ce qu'ils commencent la réunion ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'What do you usually watch?': q("Qu'est-ce que tu regardes d'habitude ?", "___ tu regardes d'habitude ?", "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where do we put luggage?': q('Où est-ce que nous mettons les bagages ?', '___ est-ce que nous mettons les bagages ?', 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'How does he find the way?': q("Comment est-ce qu'il trouve le chemin ?", "___ est-ce qu'il trouve le chemin ?", 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Why does she close the window?': q("Pourquoi est-ce qu'elle ferme la fenêtre ?", "___ est-ce qu'elle ferme la fenêtre ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When do they eat dinner?': q("Quand est-ce qu'ils dînent ?", "___ est-ce qu'ils dînent ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
  'What do you usually order?': q("Qu'est-ce que tu commandes d'habitude ?", "___ tu commandes d'habitude ?", "Qu'est-ce que", 'Où est-ce que', 'Quand est-ce que', 'Pourquoi est-ce que', 'question_word_what'),
  'Where does she put the bag?': q("Où est-ce qu'elle met le sac ?", "___ est-ce qu'elle met le sac ?", 'Où', ['Quand', 'Pourquoi', 'Comment'], 'question_word_where'),
  'How do we check the bill?': q("Comment est-ce que nous vérifions l'addition ?", "___ est-ce que nous vérifions l'addition ?", 'Comment', ['Où', 'Quand', 'Pourquoi'], 'question_word_how'),
  'Why does she always help?': q("Pourquoi est-ce qu'elle aide toujours ?", "___ est-ce qu'elle aide toujours ?", 'Pourquoi', ['Où', 'Quand', 'Comment'], 'question_word_why'),
  'When do they close the café?': q("Quand est-ce qu'ils ferment le café ?", "___ est-ce qu'ils ferment le café ?", 'Quand', ['Où', 'Pourquoi', 'Comment'], 'question_word_when'),
};

function q(
  proposedFrench: string,
  text: string,
  correct: string,
  distractor1: string | string[],
  distractor2: string,
  distractor3: string,
  category: string,
): TranslationSpec;
function q(proposedFrench: string, text: string, correct: string, distractors: string[], category: string): TranslationSpec;
function q(
  proposedFrench: string,
  text: string,
  correct: string,
  distractorsOrOne: string | string[],
  maybeTwo?: string,
  maybeThree?: string,
  maybeCategory?: string,
): TranslationSpec {
  const distractors = Array.isArray(distractorsOrOne)
    ? distractorsOrOne
    : [distractorsOrOne, String(maybeTwo), String(maybeThree)];
  const category = Array.isArray(distractorsOrOne) ? String(maybeTwo) : String(maybeCategory);
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
    '# GUSTAV French Lesson 6 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson6_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson6_wh_question_generation_batch_v1',
        'lesson6_question_word_mapping_review_v1',
        'lesson6_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson6_row_ledger.json');
  const outMd = path.join(outDir, 'lesson6_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 6 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
