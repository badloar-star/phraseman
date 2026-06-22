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

const LESSON_ID = 15;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_possessive_adjective_pronoun_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'This phone is mine': item('Ce téléphone est le mien', 'Ce téléphone est le ___', 'mien', ['mienne', 'tien', 'leur'], 'possessive_pronoun_masc_sg'),
  'This bag is yours': item('Ce sac est le tien', 'Ce sac est le ___', 'tien', ['mien', 'tienne', 'leur'], 'possessive_pronoun_masc_sg'),
  'This key is his': item('Cette clé est la sienne', 'Cette clé est la ___', 'sienne', ['sien', 'tienne', 'leur'], 'possessive_pronoun_fem_sg'),
  'This ticket is hers': item('Ce billet est le sien', 'Ce billet est le ___', 'sien', ['sienne', 'tien', 'leur'], 'possessive_pronoun_masc_sg'),
  'This room is ours': item('Cette chambre est la nôtre', 'Cette chambre est la ___', 'nôtre', ['notre', 'vôtre', 'leur'], 'possessive_pronoun_sg'),
  'This car is theirs': item('Cette voiture est la leur', 'Cette voiture est la ___', 'leur', ['leurs', 'nôtre', 'vôtre'], 'possessive_pronoun_sg'),
  'Is this phone mine?': item('Est-ce que ce téléphone est le mien ?', 'Est-ce que ce téléphone est le ___ ?', 'mien', ['mienne', 'tien', 'leur'], 'possessive_pronoun_question'),
  'Is this bag yours?': item('Est-ce que ce sac est le tien ?', 'Est-ce que ce sac est le ___ ?', 'tien', ['mien', 'tienne', 'leur'], 'possessive_pronoun_question'),
  'Is this key his?': item('Est-ce que cette clé est la sienne ?', 'Est-ce que cette clé est la ___ ?', 'sienne', ['sien', 'tienne', 'leur'], 'possessive_pronoun_question'),
  'Is this ticket hers?': item('Est-ce que ce billet est le sien ?', 'Est-ce que ce billet est le ___ ?', 'sien', ['sienne', 'tien', 'leur'], 'possessive_pronoun_question'),
  'Is this room ours?': item('Est-ce que cette chambre est la nôtre ?', 'Est-ce que cette chambre est la ___ ?', 'nôtre', ['notre', 'vôtre', 'leur'], 'possessive_pronoun_question'),
  'Is this car theirs?': item('Est-ce que cette voiture est la leur ?', 'Est-ce que cette voiture est la ___ ?', 'leur', ['leurs', 'nôtre', 'vôtre'], 'possessive_pronoun_question'),
  'This is my phone': item("C'est mon téléphone", "C'est ___ téléphone", 'mon', ['ma', 'mes', 'le mien'], 'possessive_adjective'),
  'This is your bag': item("C'est ton sac", "C'est ___ sac", 'ton', ['ta', 'tes', 'le tien'], 'possessive_adjective'),
  'This is his key': item("C'est sa clé", "C'est ___ clé", 'sa', ['son', 'ses', 'la sienne'], 'possessive_adjective'),
  'This is her ticket': item("C'est son billet", "C'est ___ billet", 'son', ['sa', 'ses', 'le sien'], 'possessive_adjective'),
  'This is our room': item("C'est notre chambre", "C'est ___ chambre", 'notre', ['nôtre', 'nos', 'la nôtre'], 'possessive_adjective'),
  'This is their car': item("C'est leur voiture", "C'est ___ voiture", 'leur', ['leurs', 'la leur', 'notre'], 'possessive_adjective'),
  'My phone is here': item('Mon téléphone est ici', '___ téléphone est ici', 'Mon', ['Ma', 'Mes', 'Le mien'], 'possessive_adjective'),
  'Your bag is here': item('Ton sac est ici', '___ sac est ici', 'Ton', ['Ta', 'Tes', 'Le tien'], 'possessive_adjective'),
  'His key is here': item('Sa clé est ici', '___ clé est ici', 'Sa', ['Son', 'Ses', 'La sienne'], 'possessive_adjective'),
  'Her ticket is here': item('Son billet est ici', '___ billet est ici', 'Son', ['Sa', 'Ses', 'Le sien'], 'possessive_adjective'),
  'Our room is ready': item('Notre chambre est prête', '___ chambre est prête', 'Notre', ['Nôtre', 'Nos', 'La nôtre'], 'possessive_adjective'),
  'Their car is outside': item('Leur voiture est dehors', '___ voiture est dehors', 'Leur', ['Leurs', 'La leur', 'Notre'], 'possessive_adjective'),
  'This charger is mine': item('Ce chargeur est le mien', 'Ce chargeur est le ___', 'mien', ['mienne', 'tien', 'leur'], 'possessive_pronoun_masc_sg'),
  'This passport is yours': item('Ce passeport est le tien', 'Ce passeport est le ___', 'tien', ['tienne', 'mien', 'leur'], 'possessive_pronoun_masc_sg'),
  'These documents are his': item('Ces documents sont les siens', 'Ces documents sont les ___', 'siens', ['siennes', 'tiennes', 'leurs'], 'possessive_pronoun_pl'),
  'These messages are hers': item('Ces messages sont les siens', 'Ces messages sont les ___', 'siens', ['siennes', 'tiens', 'leurs'], 'possessive_pronoun_pl'),
  'These books are ours': item('Ces livres sont les nôtres', 'Ces livres sont les ___', 'nôtres', ['notres', 'vôtres', 'leurs'], 'possessive_pronoun_pl'),
  'These tickets are theirs': item('Ces billets sont les leurs', 'Ces billets sont les ___', 'leurs', ['leur', 'nôtres', 'vôtres'], 'possessive_pronoun_pl'),
  'Are these documents mine?': item('Est-ce que ces documents sont les miens ?', 'Est-ce que ces documents sont les ___ ?', 'miens', ['miennes', 'tiens', 'leurs'], 'possessive_pronoun_question_pl'),
  'Are these messages yours?': item('Est-ce que ces messages sont les tiens ?', 'Est-ce que ces messages sont les ___ ?', 'tiens', ['tiennes', 'miens', 'leurs'], 'possessive_pronoun_question_pl'),
  'Are these books his?': item('Est-ce que ces livres sont les siens ?', 'Est-ce que ces livres sont les ___ ?', 'siens', ['siennes', 'tiens', 'leurs'], 'possessive_pronoun_question_pl'),
  'Are these tickets hers?': item('Est-ce que ces billets sont les siens ?', 'Est-ce que ces billets sont les ___ ?', 'siens', ['siennes', 'tiens', 'leurs'], 'possessive_pronoun_question_pl'),
  'Are these bags ours?': item('Est-ce que ces sacs sont les nôtres ?', 'Est-ce que ces sacs sont les ___ ?', 'nôtres', ['notres', 'vôtres', 'leurs'], 'possessive_pronoun_question_pl'),
  'Are these keys theirs?': item('Est-ce que ces clés sont les leurs ?', 'Est-ce que ces clés sont les ___ ?', 'leurs', ['leur', 'nôtres', 'vôtres'], 'possessive_pronoun_question_pl'),
  'This is not my phone': item("Ce n'est pas mon téléphone", "Ce n'est pas ___ téléphone", 'mon', ['ma', 'mes', 'le mien'], 'possessive_adjective_negative'),
  'This is not your bag': item("Ce n'est pas ton sac", "Ce n'est pas ___ sac", 'ton', ['ta', 'tes', 'le tien'], 'possessive_adjective_negative'),
  'This is not his key': item("Ce n'est pas sa clé", "Ce n'est pas ___ clé", 'sa', ['son', 'ses', 'la sienne'], 'possessive_adjective_negative'),
  'This is not her ticket': item("Ce n'est pas son billet", "Ce n'est pas ___ billet", 'son', ['sa', 'ses', 'le sien'], 'possessive_adjective_negative'),
  'This is not our room': item("Ce n'est pas notre chambre", "Ce n'est pas ___ chambre", 'notre', ['nôtre', 'nos', 'la nôtre'], 'possessive_adjective_negative'),
  'This is not their car': item("Ce n'est pas leur voiture", "Ce n'est pas ___ voiture", 'leur', ['leurs', 'la leur', 'notre'], 'possessive_adjective_negative'),
  'This phone is not mine': item("Ce téléphone n'est pas le mien", "Ce téléphone n'est pas le ___", 'mien', ['mienne', 'tien', 'leur'], 'possessive_pronoun_negative'),
  'This bag is not yours': item("Ce sac n'est pas le tien", "Ce sac n'est pas le ___", 'tien', ['tienne', 'mien', 'leur'], 'possessive_pronoun_negative'),
  'This key is not his': item("Cette clé n'est pas la sienne", "Cette clé n'est pas la ___", 'sienne', ['sien', 'tienne', 'leur'], 'possessive_pronoun_negative'),
  'This ticket is not hers': item("Ce billet n'est pas le sien", "Ce billet n'est pas le ___", 'sien', ['sienne', 'tien', 'leur'], 'possessive_pronoun_negative'),
  'This room is not ours': item("Cette chambre n'est pas la nôtre", "Cette chambre n'est pas la ___", 'nôtre', ['notre', 'vôtre', 'leur'], 'possessive_pronoun_negative'),
  'This car is not theirs': item("Cette voiture n'est pas la leur", "Cette voiture n'est pas la ___", 'leur', ['leurs', 'nôtre', 'vôtre'], 'possessive_pronoun_negative'),
  'This answer is mine': item('Cette réponse est la mienne', 'Cette réponse est la ___', 'mienne', ['mien', 'tienne', 'leur'], 'possessive_pronoun_fem_sg'),
  'This question is yours': item('Cette question est la tienne', 'Cette question est la ___', 'tienne', ['tien', 'mienne', 'leur'], 'possessive_pronoun_fem_sg'),
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
    '# GUSTAV French Lesson 15 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson15_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson15_possessive_generation_batch_v1',
        'lesson15_possessive_adjective_pronoun_mapping_review_v1',
        'lesson15_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson15_row_ledger.json');
  const outMd = path.join(outDir, 'lesson15_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 15 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
