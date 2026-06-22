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

const LESSON_ID = 9;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_il_y_a_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'There is a problem': item('Il y a un problème', 'Il y ___ un problème', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are problems': item('Il y a des problèmes', 'Il y ___ des problèmes', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there a question?': item('Est-ce qu’il y a une question ?', 'Est-ce qu’il y ___ une question ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'Are there questions?': item('Est-ce qu’il y a des questions ?', 'Est-ce qu’il y ___ des questions ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There is no problem': item("Il n'y a pas de problème", "Il n'y ___ pas de problème", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There are no problems': item("Il n'y a pas de problèmes", "Il n'y ___ pas de problèmes", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is a phone': item('Il y a un téléphone', 'Il y ___ un téléphone', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are phones': item('Il y a des téléphones', 'Il y ___ des téléphones', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there a key?': item('Est-ce qu’il y a une clé ?', 'Est-ce qu’il y ___ une clé ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'Are there keys?': item('Est-ce qu’il y a des clés ?', 'Est-ce qu’il y ___ des clés ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There is no key': item("Il n'y a pas de clé", "Il n'y ___ pas de clé", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There are no keys': item("Il n'y a pas de clés", "Il n'y ___ pas de clés", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is a ticket': item('Il y a un billet', 'Il y ___ un billet', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are tickets': item('Il y a des billets', 'Il y ___ des billets', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there Wi-Fi?': item('Est-ce qu’il y a du Wi-Fi ?', 'Est-ce qu’il y ___ du Wi-Fi ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There is no Wi-Fi': item("Il n'y a pas de Wi-Fi", "Il n'y ___ pas de Wi-Fi", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is money': item("Il y a de l'argent", "Il y ___ de l'argent", 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There is no money': item("Il n'y a pas d'argent", "Il n'y ___ pas d'argent", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is cash': item('Il y a des espèces', 'Il y ___ des espèces', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There is no cash': item("Il n'y a pas d'espèces", "Il n'y ___ pas d'espèces", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is a bag': item('Il y a un sac', 'Il y ___ un sac', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are bags': item('Il y a des sacs', 'Il y ___ des sacs', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there a charger?': item('Est-ce qu’il y a un chargeur ?', 'Est-ce qu’il y ___ un chargeur ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There is no charger': item("Il n'y a pas de chargeur", "Il n'y ___ pas de chargeur", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is an idea': item('Il y a une idée', 'Il y ___ une idée', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Are there ideas?': item('Est-ce qu’il y a des idées ?', 'Est-ce qu’il y ___ des idées ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There are no ideas': item("Il n'y a pas d'idées", "Il n'y ___ pas d'idées", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is a plan': item('Il y a un plan', 'Il y ___ un plan', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are plans': item('Il y a des plans', 'Il y ___ des plans', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there a plan?': item('Est-ce qu’il y a un plan ?', 'Est-ce qu’il y ___ un plan ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There are some messages': item('Il y a quelques messages', 'Il y ___ quelques messages', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are many messages': item('Il y a beaucoup de messages', 'Il y ___ beaucoup de messages', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are no messages': item("Il n'y a pas de messages", "Il n'y ___ pas de messages", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is food': item('Il y a de la nourriture', 'Il y ___ de la nourriture', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There is no food': item("Il n'y a pas de nourriture", "Il n'y ___ pas de nourriture", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is coffee': item('Il y a du café', 'Il y ___ du café', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There is no coffee': item("Il n'y a pas de café", "Il n'y ___ pas de café", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There are documents': item('Il y a des documents', 'Il y ___ des documents', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Are there documents?': item('Est-ce qu’il y a des documents ?', 'Est-ce qu’il y ___ des documents ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There are no documents': item("Il n'y a pas de documents", "Il n'y ___ pas de documents", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There are mistakes': item('Il y a des erreurs', 'Il y ___ des erreurs', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Are there mistakes?': item('Est-ce qu’il y a des erreurs ?', 'Est-ce qu’il y ___ des erreurs ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There are no mistakes': item("Il n'y a pas d'erreurs", "Il n'y ___ pas d'erreurs", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There is time': item('Il y a du temps', 'Il y ___ du temps', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Is there much time?': item('Est-ce qu’il y a beaucoup de temps ?', 'Est-ce qu’il y ___ beaucoup de temps ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There is no time': item("Il n'y a pas de temps", "Il n'y ___ pas de temps", 'a', ['est', 'ont', 'sont'], 'il_y_a_negative'),
  'There are people': item('Il y a des gens', 'Il y ___ des gens', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'Are there many people?': item('Est-ce qu’il y a beaucoup de gens ?', 'Est-ce qu’il y ___ beaucoup de gens ?', 'a', ['est', 'ont', 'sont'], 'il_y_a_question'),
  'There are many people': item('Il y a beaucoup de gens', 'Il y ___ beaucoup de gens', 'a', ['est', 'ont', 'sont'], 'il_y_a_statement'),
  'There are no people': item("Il n'y a personne", "Il n'y a ___", 'personne', ['gens', 'beaucoup', 'questions'], 'il_y_a_negative_personne'),
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
    '# GUSTAV French Lesson 9 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson9_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson9_il_y_a_generation_batch_v1',
        'lesson9_statement_question_negative_mapping_review_v1',
        'lesson9_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson9_row_ledger.json');
  const outMd = path.join(outDir, 'lesson9_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 9 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
