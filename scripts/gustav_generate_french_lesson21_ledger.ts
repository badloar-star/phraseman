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

const LESSON_ID = 21;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_indefinite_negative_pronoun_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'Someone called me': item("Quelqu'un m'a appelé", "___ m'a appelé", "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'Somebody knocked on the door': item("Quelqu'un a frappé à la porte", '___ a frappé à la porte', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'No one knows it': item('Personne ne le sait', '___ ne le sait', 'Personne', ["Quelqu'un", 'Tout', 'Quelque chose'], 'negative_person_pronoun'),
  'Nobody came yesterday': item("Personne n'est venu hier", "___ n'est venu hier", 'Personne', ["Quelqu'un", 'Tout', 'Rien'], 'negative_person_pronoun'),
  'Everyone is ready': item('Tout le monde est prêt', '___ est prêt', 'Tout le monde', ['Personne', "Quelqu'un", 'Rien'], 'everyone_tout_le_monde'),
  'Everybody understands me': item('Tout le monde me comprend', '___ me comprend', 'Tout le monde', ['Personne', "Quelqu'un", 'Rien'], 'everyone_tout_le_monde'),
  'Something happened': item("Quelque chose s'est passé", "___ s'est passé", 'Quelque chose', ['Rien', 'Personne', 'Tout le monde'], 'indefinite_thing_positive'),
  'Nothing happened': item("Rien ne s'est passé", "___ ne s'est passé", 'Rien', ['Quelque chose', 'Personne', 'Tout'], 'negative_thing_pronoun'),
  'Everything is okay': item('Tout va bien', '___ va bien', 'Tout', ['Rien', 'Personne', "Quelqu'un"], 'everything_tout'),
  'Did anyone call you?': item("Est-ce que quelqu'un t'a appelé ?", "Est-ce que ___ t'a appelé ?", "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Did anybody see him?': item("Est-ce que quelqu'un l'a vu ?", "Est-ce que ___ l'a vu ?", "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Did you hear anything?': item('Est-ce que tu as entendu quelque chose ?', 'Est-ce que tu as entendu ___ ?', 'quelque chose', ['rien', 'personne', 'tout'], 'indefinite_thing_question'),
  'I found something': item("J'ai trouvé quelque chose", "J'ai trouvé ___", 'quelque chose', ['rien', 'personne', 'tout'], 'indefinite_thing_positive'),
  'I found nothing': item("Je n'ai rien trouvé", "Je n'ai ___ trouvé", 'rien', ['quelque chose', 'personne', 'tout'], 'negative_thing_pronoun'),
  'We saw someone outside': item("Nous avons vu quelqu'un dehors", 'Nous avons vu ___ dehors', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_positive'),
  'We saw nobody outside': item("Nous n'avons vu personne dehors", "Nous n'avons vu ___ dehors", 'personne', ["quelqu'un", 'rien', 'tout'], 'negative_person_pronoun'),
  'Someone left a message': item("Quelqu'un a laissé un message", '___ a laissé un message', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'Nobody left a message': item("Personne n'a laissé de message", "___ n'a laissé de message", 'Personne', ["Quelqu'un", 'Rien', 'Tout'], 'negative_person_pronoun'),
  'Everyone needs help': item("Tout le monde a besoin d'aide", "___ a besoin d'aide", 'Tout le monde', ['Personne', "Quelqu'un", 'Rien'], 'everyone_tout_le_monde'),
  'No one needs help': item("Personne n'a besoin d'aide", "___ n'a besoin d'aide", 'Personne', ["Quelqu'un", 'Tout le monde', 'Rien'], 'negative_person_pronoun'),
  'Something is wrong': item('Quelque chose ne va pas', '___ ne va pas', 'Quelque chose', ['Rien', 'Personne', 'Tout'], 'indefinite_thing_positive'),
  'Nothing is wrong': item('Rien ne va mal', '___ ne va mal', 'Rien', ['Quelque chose', 'Personne', 'Tout'], 'negative_thing_pronoun'),
  'Everything is clear': item('Tout est clair', '___ est clair', 'Tout', ['Rien', 'Personne', "Quelqu'un"], 'everything_tout'),
  'Is everything clear?': item('Est-ce que tout est clair ?', 'Est-ce que ___ est clair ?', 'tout', ['rien', 'personne', "quelqu'un"], 'everything_question'),
  'Is anyone here?': item("Est-ce qu'il y a quelqu'un ici ?", "Est-ce qu'il y a ___ ici ?", "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Nobody is here': item("Il n'y a personne ici", "Il n'y a ___ ici", 'personne', ["quelqu'un", 'rien', 'tout'], 'negative_person_existence'),
  'Someone is outside': item("Il y a quelqu'un dehors", 'Il y a ___ dehors', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_existence'),
  'No one is outside': item("Il n'y a personne dehors", "Il n'y a ___ dehors", 'personne', ["quelqu'un", 'rien', 'tout'], 'negative_person_existence'),
  'Did someone take my phone?': item("Est-ce que quelqu'un a pris mon téléphone ?", 'Est-ce que ___ a pris mon téléphone ?', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Nobody took your phone': item("Personne n'a pris ton téléphone", "___ n'a pris ton téléphone", 'Personne', ["Quelqu'un", 'Rien', 'Tout'], 'negative_person_pronoun'),
  'Did anyone find my keys?': item("Est-ce que quelqu'un a trouvé mes clés ?", 'Est-ce que ___ a trouvé mes clés ?', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Someone found your keys': item("Quelqu'un a trouvé tes clés", '___ a trouvé tes clés', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'I need something simple': item("J'ai besoin de quelque chose de simple", "J'ai besoin de ___ de simple", 'quelque chose', ['rien', 'personne', 'tout'], 'indefinite_thing_positive'),
  'I do not need anything': item("Je n'ai besoin de rien", "Je n'ai besoin de ___", 'rien', ['quelque chose', 'personne', 'tout'], 'negative_thing_pronoun'),
  'She wants something better': item('Elle veut quelque chose de mieux', 'Elle veut ___ de mieux', 'quelque chose', ['rien', 'personne', 'tout'], 'indefinite_thing_positive'),
  'He does not want anything': item('Il ne veut rien', 'Il ne veut ___', 'rien', ['quelque chose', 'personne', 'tout'], 'negative_thing_pronoun'),
  'Everyone helped us': item('Tout le monde nous a aidés', '___ nous a aidés', 'Tout le monde', ['Personne', "Quelqu'un", 'Rien'], 'everyone_tout_le_monde'),
  'Nobody helped them': item('Personne ne les a aidés', '___ ne les a aidés', 'Personne', ["Quelqu'un", 'Tout le monde', 'Rien'], 'negative_person_pronoun'),
  'Somebody told me a story': item("Quelqu'un m'a raconté une histoire", "___ m'a raconté une histoire", "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'No one told me anything': item("Personne ne m'a rien dit", "___ ne m'a rien dit", 'Personne', ["Quelqu'un", 'Tout le monde', 'Quelque chose'], 'negative_person_thing'),
  'Did anybody bring documents?': item("Est-ce que quelqu'un a apporté les documents ?", 'Est-ce que ___ a apporté les documents ?', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Somebody brought documents': item("Quelqu'un a apporté les documents", '___ a apporté les documents', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'Nobody brought documents': item("Personne n'a apporté les documents", "___ n'a apporté les documents", 'Personne', ["Quelqu'un", 'Rien', 'Tout'], 'negative_person_pronoun'),
  'Everything changed yesterday': item('Tout a changé hier', '___ a changé hier', 'Tout', ['Rien', 'Personne', "Quelqu'un"], 'everything_tout'),
  'Nothing changed yesterday': item("Rien n'a changé hier", "___ n'a changé hier", 'Rien', ['Tout', 'Personne', "Quelqu'un"], 'negative_thing_pronoun'),
  'Someone forgot a ticket': item("Quelqu'un a oublié un billet", '___ a oublié un billet', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'Nobody forgot tickets': item("Personne n'a oublié les billets", "___ n'a oublié les billets", 'Personne', ["Quelqu'un", 'Rien', 'Tout'], 'negative_person_pronoun'),
  'Did anyone see my bag?': item("Est-ce que quelqu'un a vu mon sac ?", 'Est-ce que ___ a vu mon sac ?', "quelqu'un", ['personne', 'rien', 'tout'], 'indefinite_person_question'),
  'Someone saw your bag': item("Quelqu'un a vu ton sac", '___ a vu ton sac', "Quelqu'un", ['Personne', 'Rien', 'Tout'], 'indefinite_person_positive'),
  'Nobody saw my bag': item("Personne n'a vu mon sac", "___ n'a vu mon sac", 'Personne', ["Quelqu'un", 'Rien', 'Tout'], 'negative_person_pronoun'),
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
    '# GUSTAV French Lesson 21 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson21_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson21_indefinite_pronoun_generation_batch_v1',
        'lesson21_personne_rien_tout_mapping_review_v1',
        'lesson21_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson21_row_ledger.json');
  const outMd = path.join(outDir, 'lesson21_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 21 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
