import * as fs from 'node:fs';
import * as path from 'node:path';

type SourceRow = {
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  requiredEvidence: string[];
};

type SourceGraphPhrase = {
  id: string;
  sourcePrompts?: {
    ru?: string;
    uk?: string;
  };
};

type SourceGraph = {
  phrases: SourceGraphPhrase[];
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

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I am here': item('Je suis ici', 'Je ___ ici', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'You are ready': item('Tu es prêt', 'Tu ___ prêt', 'es', ['suis', 'est', 'êtes'], 'etre_present'),
  'He is busy': item('Il est occupé', 'Il ___ occupé', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'She is calm': item('Elle est calme', 'Elle ___ calme', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'We are together': item('Nous sommes ensemble', 'Nous ___ ensemble', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'They are happy': item('Ils sont heureux', 'Ils ___ heureux', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'It is important': item("C'est important", "C'___ important", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'I am okay': item('Je vais bien', 'Je ___ bien', 'vais', ['suis', 'es', 'fait'], 'idiom_aller_bien'),
  'You are right': item('Vous avez raison', 'Vous ___ raison', 'avez', ['êtes', 'sommes', 'ont'], 'idiom_avoir_raison'),
  'We are safe': item('Nous sommes en sécurité', 'Nous ___ en sécurité', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'He is sick': item('Il est malade', 'Il ___ malade', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'It is cheap': item("C'est bon marché", "C'___ bon marché", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'We are friends': item('Nous sommes amis', 'Nous ___ amis', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'She is sad': item('Elle est triste', 'Elle ___ triste', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'You are late': item('Tu es en retard', 'Tu ___ en retard', 'es', ['suis', 'est', 'êtes'], 'etre_present'),
  'I am busy': item('Je suis occupé', 'Je ___ occupé', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'We are here': item('Nous sommes ici', 'Nous ___ ici', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'They are outside': item('Ils sont dehors', 'Ils ___ dehors', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'She is tired': item('Elle est fatiguée', 'Elle ___ fatiguée', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'It is free': item("C'est gratuit", "C'___ gratuit", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'I am ready': item('Je suis prêt', 'Je ___ prêt', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'We are inside': item("Nous sommes à l'intérieur", 'Nous ___ à l’intérieur', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'He is strong': item('Il est fort', 'Il ___ fort', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'You are kind': item('Tu es gentil', 'Tu ___ gentil', 'es', ['suis', 'est', 'êtes'], 'etre_present'),
  'It is serious': item("C'est sérieux", "C'___ sérieux", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'I am tired': item('Je suis fatigué', 'Je ___ fatigué', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'We are ready': item('Nous sommes prêts', 'Nous ___ prêts', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'She is happy': item('Elle est heureuse', 'Elle ___ heureuse', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'You are fine': item('Tu vas bien', 'Tu ___ bien', 'vas', ['es', 'est', 'fait'], 'idiom_aller_bien'),
  'They are calm': item('Ils sont calmes', 'Ils ___ calmes', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'I am outside': item('Je suis dehors', 'Je ___ dehors', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'We are calm': item('Nous sommes calmes', 'Nous ___ calmes', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'He is inside': item("Il est à l'intérieur", 'Il ___ à l’intérieur', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'She is smart': item('Elle est intelligente', 'Elle ___ intelligente', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'They are ready': item('Ils sont prêts', 'Ils ___ prêts', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'I am strong': item('Je suis fort', 'Je ___ fort', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'We are late': item('Nous sommes en retard', 'Nous ___ en retard', 'sommes', ['suis', 'êtes', 'sont'], 'etre_present'),
  'It is near': item("C'est proche", "C'___ proche", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'They are tired': item('Ils sont fatigués', 'Ils ___ fatigués', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'You are safe': item('Tu es en sécurité', 'Tu ___ en sécurité', 'es', ['suis', 'est', 'êtes'], 'etre_present'),
  'I am sick': item('Je suis malade', 'Je ___ malade', 'suis', ['es', 'est', 'sommes'], 'etre_present'),
  'She is nervous': item('Elle est nerveuse', 'Elle ___ nerveuse', 'est', ['suis', 'es', 'sont'], 'etre_present'),
  'We are okay': item('Nous allons bien', 'Nous ___ bien', 'allons', ['sommes', 'êtes', 'ont'], 'idiom_aller_bien'),
  'They are hungry': item('Ils ont faim', 'Ils ___ faim', 'ont', ['sont', 'êtes', 'sommes'], 'idiom_avoir_faim'),
  'It is broken': item("C'est cassé", "C'___ cassé", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'He is angry': item('Il est en colère', 'Il ___ en colère', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'They are together': item('Ils sont ensemble', 'Ils ___ ensemble', 'sont', ['est', 'êtes', 'sommes'], 'etre_present'),
  'He is calm': item('Il est calme', 'Il ___ calme', 'est', ['es', 'sont', 'sommes'], 'etre_present'),
  'It is empty': item("C'est vide", "C'___ vide", 'est', ['es', 'sont', 'sommes'], 'c_est'),
  'She is ready': item('Elle est prête', 'Elle ___ prête', 'est', ['suis', 'es', 'sont'], 'etre_present'),
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
  if (!/[ÐÑÐІÐЄÐЇÐҐ]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function renderMarkdown(ledger: Record<string, unknown>, outJson: string, repoRoot: string): string {
  const rows = Array.isArray(ledger.rows) ? ledger.rows as Array<Record<string, unknown>> : [];
  const lines = [
    '# GUSTAV French Lesson 1 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson1_ledger.ts --run docs/gustav/runs/<runId>');
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

  const sourcePath = path.join(runDir, 'research', 'lesson1_row_ledger.json');
  const source = readJson<{ sourceFile: string; rows: SourceRow[] }>(sourcePath);
  const sourceGraph = readJson<SourceGraph>(path.join(runDir, 'source_graph', 'source_graph.json'));
  const sourceGraphById = new Map(sourceGraph.phrases.map((phrase) => [phrase.id, phrase]));
  if (source.rows.length !== 50) {
    throw new Error(`Expected 50 lesson 1 rows, found ${source.rows.length}.`);
  }

  const rows = source.rows.map((row) => {
    const translation = TRANSLATIONS[row.englishBase];
    if (!translation) throw new Error(`Missing French translation for ${row.englishBase}`);
    const graphPhrase = sourceGraphById.get(row.phraseId);
    return {
      phraseId: row.phraseId,
      englishBase: row.englishBase,
      russianMeaning: graphPhrase?.sourcePrompts?.ru ?? repairMojibake(row.russianMeaning),
      ukrainianMeaning: graphPhrase?.sourcePrompts?.uk ?? repairMojibake(row.ukrainianMeaning),
      proposedFrench: translation.proposedFrench,
      wordsFr: translation.wordsFr,
      evidenceClaimIds: [
        'lesson1_etre_present_generation_batch_v1',
        'lesson1_ru_uk_meaning_repaired_from_source_ledger_v1',
      ],
      requiredEvidence: row.requiredEvidence,
      reviewerStatus: 'needs_review',
      activationStatus: 'blocked',
    };
  });

  const ledger = {
    schemaVersion: 'gustav-french-lesson-row-ledger-v0',
    runId,
    lessonId: 1,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceFile: source.sourceFile,
    activationStatus: 'blocked_pending_source_review',
    activeAppSeedAllowed: false,
    rows,
  };

  const outDir = path.join(runDir, 'generated', 'fr', 'lessons');
  ensureDir(outDir);
  const outJson = path.join(outDir, 'lesson1_row_ledger.json');
  const outMd = path.join(outDir, 'lesson1_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 1 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
