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

const LESSON_ID = 2;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_negation_question_etre_avoir_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I am not hungry': item("Je n'ai pas faim", "Je n'___ pas faim", 'ai', ['suis', 'es', 'est'], 'idiom_avoir_faim_negation'),
  'Are you sure?': item('Tu es sûr ?', 'Tu ___ sûr ?', 'es', ['suis', 'est', 'êtes'], 'etre_question'),
  'He is not here': item("Il n'est pas ici", "Il n'___ pas ici", 'est', ['es', 'sont', 'sommes'], 'etre_negation'),
  'Is it expensive?': item("Est-ce que c'est cher ?", "Est-ce que c'___ cher ?", 'est', ['es', 'sont', 'sommes'], 'c_est_question'),
  'We are not ready': item('Nous ne sommes pas prêts', 'Nous ne ___ pas prêts', 'sommes', ['suis', 'êtes', 'sont'], 'etre_negation'),
  'They are not happy': item('Ils ne sont pas heureux', 'Ils ne ___ pas heureux', 'sont', ['est', 'êtes', 'sommes'], 'etre_negation'),
  'Is she ready?': item("Est-ce qu'elle est prête ?", "Est-ce qu'elle ___ prête ?", 'est', ['suis', 'es', 'sont'], 'etre_question'),
  'It is not scary': item("Ce n'est pas effrayant", "Ce n'___ pas effrayant", 'est', ['es', 'sont', 'sommes'], 'c_est_negation'),
  'Are you busy?': item('Tu es occupé ?', 'Tu ___ occupé ?', 'es', ['suis', 'est', 'êtes'], 'etre_question'),
  'I am not tired': item('Je ne suis pas fatigué', 'Je ne ___ pas fatigué', 'suis', ['es', 'est', 'sommes'], 'etre_negation'),
  'We are not nervous': item('Nous ne sommes pas nerveux', 'Nous ne ___ pas nerveux', 'sommes', ['suis', 'êtes', 'sont'], 'etre_negation'),
  'Is he angry?': item("Est-ce qu'il est en colère ?", "Est-ce qu'il ___ en colère ?", 'est', ['es', 'sont', 'sommes'], 'etre_question'),
  'He is not busy': item("Il n'est pas occupé", "Il n'___ pas occupé", 'est', ['es', 'sont', 'sommes'], 'etre_negation'),
  'She is not sad': item("Elle n'est pas triste", "Elle n'___ pas triste", 'est', ['suis', 'es', 'sont'], 'etre_negation'),
  'Is it open?': item("Est-ce que c'est ouvert ?", "Est-ce que c'___ ouvert ?", 'est', ['es', 'sont', 'sommes'], 'c_est_question'),
  'You are not ready': item("Tu n'es pas prêt", "Tu n'___ pas prêt", 'es', ['suis', 'est', 'êtes'], 'etre_negation'),
  'Is it free?': item("Est-ce que c'est gratuit ?", "Est-ce que c'___ gratuit ?", 'est', ['es', 'sont', 'sommes'], 'c_est_question'),
  'They are not calm': item('Ils ne sont pas calmes', 'Ils ne ___ pas calmes', 'sont', ['est', 'êtes', 'sommes'], 'etre_negation'),
  'Am I right?': item("Est-ce que j'ai raison ?", "Est-ce que j'___ raison ?", 'ai', ['suis', 'es', 'est'], 'idiom_avoir_raison_question'),
  'She is not ready': item("Elle n'est pas prête", "Elle n'___ pas prête", 'est', ['suis', 'es', 'sont'], 'etre_negation'),
  'It is not funny': item("Ce n'est pas drôle", "Ce n'___ pas drôle", 'est', ['es', 'sont', 'sommes'], 'c_est_negation'),
  'Are you okay?': item('Tu vas bien ?', 'Tu ___ bien ?', 'vas', ['es', 'est', 'fait'], 'idiom_aller_bien_question'),
  'He is not hungry': item("Il n'a pas faim", "Il n'___ pas faim", 'a', ['est', 'es', 'ont'], 'idiom_avoir_faim_negation'),
  'Is she outside?': item("Est-ce qu'elle est dehors ?", "Est-ce qu'elle ___ dehors ?", 'est', ['suis', 'es', 'sont'], 'etre_question'),
  'We are not late': item('Nous ne sommes pas en retard', 'Nous ne ___ pas en retard', 'sommes', ['suis', 'êtes', 'sont'], 'etre_negation'),
  'I am not afraid': item("Je n'ai pas peur", "Je n'___ pas peur", 'ai', ['suis', 'es', 'est'], 'idiom_avoir_peur_negation'),
  'Are they here?': item("Est-ce qu'ils sont ici ?", "Est-ce qu'ils ___ ici ?", 'sont', ['est', 'êtes', 'sommes'], 'etre_question'),
  'She is not angry': item("Elle n'est pas en colère", "Elle n'___ pas en colère", 'est', ['suis', 'es', 'sont'], 'etre_negation'),
  'Is it far?': item("Est-ce que c'est loin ?", "Est-ce que c'___ loin ?", 'est', ['es', 'sont', 'sommes'], 'c_est_question'),
  'We are not angry': item('Nous ne sommes pas en colère', 'Nous ne ___ pas en colère', 'sommes', ['suis', 'êtes', 'sont'], 'etre_negation'),
  'Are you wrong?': item('Tu as tort ?', 'Tu ___ tort ?', 'as', ['es', 'a', 'êtes'], 'idiom_avoir_tort_question'),
  'Is he ready?': item("Est-ce qu'il est prêt ?", "Est-ce qu'il ___ prêt ?", 'est', ['es', 'sont', 'sommes'], 'etre_question'),
  'I am not okay': item('Je ne vais pas bien', 'Je ne ___ pas bien', 'vais', ['suis', 'es', 'fait'], 'idiom_aller_bien_negation'),
  'Is it true?': item("Est-ce que c'est vrai ?", "Est-ce que c'___ vrai ?", 'est', ['es', 'sont', 'sommes'], 'c_est_question'),
  'We are not safe': item('Nous ne sommes pas en sécurité', 'Nous ne ___ pas en sécurité', 'sommes', ['suis', 'êtes', 'sont'], 'etre_negation'),
  'They are not ready': item('Ils ne sont pas prêts', 'Ils ne ___ pas prêts', 'sont', ['est', 'êtes', 'sommes'], 'etre_negation'),
  'It is not important': item("Ce n'est pas important", "Ce n'___ pas important", 'est', ['es', 'sont', 'sommes'], 'c_est_negation'),
  'Are you ready?': item('Tu es prêt ?', 'Tu ___ prêt ?', 'es', ['suis', 'est', 'êtes'], 'etre_question'),
  'She is not sick': item("Elle n'est pas malade", "Elle n'___ pas malade", 'est', ['suis', 'es', 'sont'], 'etre_negation'),
  'I am not outside': item('Je ne suis pas dehors', 'Je ne ___ pas dehors', 'suis', ['es', 'est', 'sommes'], 'etre_negation'),
  'We are not wrong': item("Nous n'avons pas tort", "Nous n'___ pas tort", 'avons', ['sommes', 'avez', 'ont'], 'idiom_avoir_tort_negation'),
  'Is he inside?': item("Est-ce qu'il est à l'intérieur ?", "Est-ce qu'il ___ à l'intérieur ?", 'est', ['es', 'sont', 'sommes'], 'etre_question'),
  'It is not dangerous': item("Ce n'est pas dangereux", "Ce n'___ pas dangereux", 'est', ['es', 'sont', 'sommes'], 'c_est_negation'),
  'Are you inside?': item("Tu es à l'intérieur ?", "Tu ___ à l'intérieur ?", 'es', ['suis', 'est', 'êtes'], 'etre_question'),
  'I am not angry': item('Je ne suis pas en colère', 'Je ne ___ pas en colère', 'suis', ['es', 'est', 'sommes'], 'etre_negation'),
  'She is not outside': item("Elle n'est pas dehors", "Elle n'___ pas dehors", 'est', ['suis', 'es', 'sont'], 'etre_negation'),
  'Are we ready?': item('Est-ce que nous sommes prêts ?', 'Est-ce que nous ___ prêts ?', 'sommes', ['suis', 'êtes', 'sont'], 'etre_question'),
  'It is not serious': item("Ce n'est pas sérieux", "Ce n'___ pas sérieux", 'est', ['es', 'sont', 'sommes'], 'c_est_negation'),
  'They are not together': item('Ils ne sont pas ensemble', 'Ils ne ___ pas ensemble', 'sont', ['est', 'êtes', 'sommes'], 'etre_negation'),
  'You are not right': item("Tu n'as pas raison", "Tu n'___ pas raison", 'as', ['es', 'a', 'êtes'], 'idiom_avoir_raison_negation'),
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
    '# GUSTAV French Lesson 2 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson2_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson2_negation_question_generation_batch_v1',
        'lesson2_etre_avoir_idiom_mapping_review_v1',
        'lesson2_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson2_row_ledger.json');
  const outMd = path.join(outDir, 'lesson2_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 2 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
