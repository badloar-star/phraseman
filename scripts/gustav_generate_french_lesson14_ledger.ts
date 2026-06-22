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

const LESSON_ID = 14;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_comparative_superlative_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'This is cheaper': item("C'est moins cher", "C'est ___ cher", 'moins', ['plus', 'le plus', 'mieux'], 'comparative_moins'),
  'This is more expensive': item("C'est plus cher", "C'est ___ cher", 'plus', ['moins', 'le moins', 'mieux'], 'comparative_plus'),
  'It is better now': item("C'est mieux maintenant", "C'est ___ maintenant", 'mieux', ['meilleur', 'plus', 'moins'], 'comparative_adverb_mieux'),
  'It is worse now': item("C'est pire maintenant", "C'est ___ maintenant", 'pire', ['mieux', 'meilleur', 'plus'], 'comparative_irregular_pire'),
  'She looks happier today': item("Elle a l'air plus heureuse aujourd'hui", "Elle a l'air ___ heureuse aujourd'hui", 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'He looks more serious today': item("Il a l'air plus sérieux aujourd'hui", "Il a l'air ___ sérieux aujourd'hui", 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This plan is better': item('Ce plan est meilleur', 'Ce plan est ___', 'meilleur', ['mieux', 'plus', 'moins'], 'comparative_adjective_meilleur'),
  'This plan is worse': item('Ce plan est pire', 'Ce plan est ___', 'pire', ['mieux', 'meilleur', 'plus'], 'comparative_irregular_pire'),
  'This option is cheaper': item('Cette option est moins chère', 'Cette option est ___ chère', 'moins', ['plus', 'la plus', 'mieux'], 'comparative_moins'),
  'This option is more expensive': item('Cette option est plus chère', 'Cette option est ___ chère', 'plus', ['moins', 'la moins', 'mieux'], 'comparative_plus'),
  'This way is faster': item('Cette façon est plus rapide', 'Cette façon est ___ rapide', 'plus', ['moins', 'la plus', 'mieux'], 'comparative_plus'),
  'That way is slower': item('Cette façon-là est plus lente', 'Cette façon-là est ___ lente', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This question is easier': item('Cette question est plus facile', 'Cette question est ___ facile', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'That question is harder': item('Cette question-là est plus difficile', 'Cette question-là est ___ difficile', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This job is more interesting': item('Ce travail est plus intéressant', 'Ce travail est ___ intéressant', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This work is more important': item('Ce travail est plus important', 'Ce travail est ___ important', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This place is safer': item('Cet endroit est plus sûr', 'Cet endroit est ___ sûr', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'That place is more dangerous': item('Cet endroit-là est plus dangereux', 'Cet endroit-là est ___ dangereux', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This room is colder': item('Cette pièce est plus froide', 'Cette pièce est ___ froide', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'That room is warmer': item('Cette pièce-là est plus chaude', 'Cette pièce-là est ___ chaude', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This bag is lighter': item('Ce sac est plus léger', 'Ce sac est ___ léger', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'That bag is heavier': item('Ce sac-là est plus lourd', 'Ce sac-là est ___ lourd', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This phone is newer': item('Ce téléphone est plus récent', 'Ce téléphone est ___ récent', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'That phone is older': item('Ce téléphone-là est plus ancien', 'Ce téléphone-là est ___ ancien', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_plus'),
  'This app is easier': item('Cette application est plus facile', 'Cette application est ___ facile', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'That app is harder': item('Cette application-là est plus difficile', 'Cette application-là est ___ difficile', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This lesson is shorter': item('Cette leçon est plus courte', 'Cette leçon est ___ courte', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'That lesson is longer': item('Cette leçon-là est plus longue', 'Cette leçon-là est ___ longue', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This answer is clearer': item('Cette réponse est plus claire', 'Cette réponse est ___ claire', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'That answer is more confusing': item('Cette réponse-là est plus confuse', 'Cette réponse-là est ___ confuse', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_plus'),
  'This is the best option': item("C'est la meilleure option", "C'est la ___ option", 'meilleure', ['mieux', 'plus', 'pire'], 'superlative_meilleur'),
  'This is the worst option': item("C'est la pire option", "C'est la ___ option", 'pire', ['meilleure', 'mieux', 'plus'], 'superlative_pire'),
  'This is the cheapest ticket': item("C'est le billet le moins cher", "C'est le billet le ___ cher", 'moins', ['plus', 'mieux', 'meilleur'], 'superlative_moins'),
  'This is the most expensive ticket': item("C'est le billet le plus cher", "C'est le billet le ___ cher", 'plus', ['moins', 'mieux', 'meilleur'], 'superlative_plus'),
  'This is the fastest way': item("C'est la façon la plus rapide", "C'est la façon la ___ rapide", 'plus', ['moins', 'mieux', 'meilleure'], 'superlative_plus'),
  'This is the slowest way': item("C'est la façon la plus lente", "C'est la façon la ___ lente", 'plus', ['moins', 'mieux', 'meilleure'], 'superlative_plus'),
  'This is the easiest question': item("C'est la question la plus facile", "C'est la question la ___ facile", 'plus', ['moins', 'mieux', 'meilleure'], 'superlative_plus'),
  'This is the hardest question': item("C'est la question la plus difficile", "C'est la question la ___ difficile", 'plus', ['moins', 'mieux', 'meilleure'], 'superlative_plus'),
  'This is the safest place': item("C'est l'endroit le plus sûr", "C'est l'endroit le ___ sûr", 'plus', ['moins', 'mieux', 'meilleur'], 'superlative_plus'),
  'This is the most dangerous place': item("C'est l'endroit le plus dangereux", "C'est l'endroit le ___ dangereux", 'plus', ['moins', 'mieux', 'meilleur'], 'superlative_plus'),
  'I feel much better today': item("Je me sens beaucoup mieux aujourd'hui", 'Je me sens beaucoup ___ aujourd’hui', 'mieux', ['meilleur', 'plus', 'moins'], 'comparative_adverb_mieux'),
  'He feels worse today': item("Il se sent moins bien aujourd'hui", 'Il se sent ___ bien aujourd’hui', 'moins', ['plus', 'mieux', 'meilleur'], 'comparative_moins'),
  'She works faster now': item('Elle travaille plus vite maintenant', 'Elle travaille ___ vite maintenant', 'plus', ['moins', 'mieux', 'la plus'], 'comparative_adverb_plus'),
  'They work more slowly now': item('Ils travaillent plus lentement maintenant', 'Ils travaillent ___ lentement maintenant', 'plus', ['moins', 'mieux', 'le plus'], 'comparative_adverb_plus'),
  'We need a better plan': item("Nous avons besoin d'un meilleur plan", "Nous avons besoin d'un ___ plan", 'meilleur', ['mieux', 'plus', 'moins'], 'comparative_adjective_meilleur'),
  'You need an easier question': item("Tu as besoin d'une question plus facile", "Tu as besoin d'une question ___ facile", 'plus', ['moins', 'mieux', 'meilleure'], 'comparative_plus'),
  'They chose the best option': item('Ils ont choisi la meilleure option', 'Ils ont choisi la ___ option', 'meilleure', ['mieux', 'plus', 'pire'], 'superlative_meilleur'),
  'We found the cheapest tickets': item('Nous avons trouvé les billets les moins chers', 'Nous avons trouvé les billets les ___ chers', 'moins', ['plus', 'mieux', 'meilleurs'], 'superlative_moins'),
  'She bought a newer phone': item('Elle a acheté un téléphone plus récent', 'Elle a acheté un téléphone ___ récent', 'plus', ['moins', 'mieux', 'meilleur'], 'comparative_plus'),
  'He got a better job': item('Il a obtenu un meilleur travail', 'Il a obtenu un ___ travail', 'meilleur', ['mieux', 'plus', 'moins'], 'comparative_adjective_meilleur'),
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
    '# GUSTAV French Lesson 14 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson14_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson14_comparative_superlative_generation_batch_v1',
        'lesson14_mieux_meilleur_plus_moins_mapping_review_v1',
        'lesson14_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson14_row_ledger.json');
  const outMd = path.join(outDir, 'lesson14_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 14 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
