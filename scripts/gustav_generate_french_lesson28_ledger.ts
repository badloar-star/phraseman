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

const LESSON_ID = 28;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_reflexive_emphatic_pronoun_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I hurt myself': item('Je me suis fait mal', 'Je ___ suis fait mal', 'me', ['te', 'se', 'nous'], 'reflexive_passe_compose'),
  'You hurt yourself': item("Tu t'es fait mal", "Tu ___ es fait mal", "t'", ['me', "s'", 'nous'], 'reflexive_passe_compose'),
  'He hurt himself': item("Il s'est fait mal", "Il ___ est fait mal", "s'", ['me', "t'", 'nous'], 'reflexive_passe_compose'),
  'She hurt herself': item("Elle s'est fait mal", "Elle ___ est fait mal", "s'", ['me', "t'", 'nous'], 'reflexive_passe_compose'),
  'The app closed itself': item("L'application s'est fermée toute seule", "L'application ___ est fermée toute seule", "s'", ['me', "t'", 'nous'], 'reflexive_passe_compose'),
  'We prepared ourselves': item('Nous nous sommes préparés', 'Nous ___ sommes préparés', 'nous', ['me', 'se', 'vous'], 'reflexive_passe_compose'),
  'You prepared yourselves': item('Vous vous êtes préparés', 'Vous ___ êtes préparés', 'vous', ['nous', 'se', 'me'], 'reflexive_passe_compose'),
  'They protected themselves': item('Ils se sont protégés', 'Ils ___ sont protégés', 'se', ['me', 'te', 'nous'], 'reflexive_passe_compose'),
  'I asked myself a question': item('Je me suis posé une question', 'Je me suis ___ une question', 'posé', ['poser', 'pose', 'posant'], 'reflexive_indirect_passe_compose'),
  'She told herself the truth': item("Elle s'est dit la vérité", "Elle s'est ___ la vérité", 'dit', ['dire', 'dite', 'disant'], 'reflexive_indirect_passe_compose'),
  'I did it myself': item("Je l'ai fait moi-même", "Je l'ai fait ___", 'moi-même', ['toi-même', 'lui-même', 'eux-mêmes'], 'emphatic_self'),
  'You did it yourself': item("Tu l'as fait toi-même", "Tu l'as fait ___", 'toi-même', ['moi-même', 'lui-même', 'eux-mêmes'], 'emphatic_self'),
  'He did it himself': item("Il l'a fait lui-même", "Il l'a fait ___", 'lui-même', ['moi-même', 'toi-même', 'elle-même'], 'emphatic_self'),
  'She did it herself': item("Elle l'a fait elle-même", "Elle l'a fait ___", 'elle-même', ['moi-même', 'toi-même', 'lui-même'], 'emphatic_self'),
  'We did it ourselves': item("Nous l'avons fait nous-mêmes", "Nous l'avons fait ___", 'nous-mêmes', ['moi-même', 'vous-mêmes', 'eux-mêmes'], 'emphatic_self'),
  'You did it yourselves': item("Vous l'avez fait vous-mêmes", "Vous l'avez fait ___", 'vous-mêmes', ['nous-mêmes', 'eux-mêmes', 'moi-même'], 'emphatic_self'),
  'They did it themselves': item("Ils l'ont fait eux-mêmes", "Ils l'ont fait ___", 'eux-mêmes', ['nous-mêmes', 'vous-mêmes', 'lui-même'], 'emphatic_self'),
  'I fixed it myself': item("Je l'ai réparé moi-même", "Je l'ai réparé ___", 'moi-même', ['toi-même', 'lui-même', 'eux-mêmes'], 'emphatic_self'),
  'She cooked dinner herself': item('Elle a préparé le dîner elle-même', 'Elle a préparé le dîner ___', 'elle-même', ['lui-même', 'toi-même', 'eux-mêmes'], 'emphatic_self'),
  'They cleaned the room themselves': item('Ils ont nettoyé la chambre eux-mêmes', 'Ils ont nettoyé la chambre ___', 'eux-mêmes', ['nous-mêmes', 'vous-mêmes', 'lui-même'], 'emphatic_self'),
  'Did you hurt yourself?': item("Est-ce que tu t'es fait mal ?", "Est-ce que tu ___ es fait mal ?", "t'", ['me', "s'", 'nous'], 'reflexive_question'),
  'Did he hurt himself?': item("Est-ce qu'il s'est fait mal ?", "Est-ce qu'il ___ est fait mal ?", "s'", ['me', "t'", 'nous'], 'reflexive_question'),
  'Did she teach herself?': item('Est-ce qu’elle a appris toute seule ?', 'Est-ce qu’elle a appris ___ ?', 'toute seule', ['tout seul', 'lui-même', 'eux-mêmes'], 'self_taught_natural'),
  'Did they prepare themselves?': item("Est-ce qu'ils se sont préparés ?", "Est-ce qu'ils ___ sont préparés ?", 'se', ['me', 'te', 'nous'], 'reflexive_question'),
  'Did you do it yourself?': item("Est-ce que tu l'as fait toi-même ?", "Est-ce que tu l'as fait ___ ?", 'toi-même', ['moi-même', 'lui-même', 'eux-mêmes'], 'emphatic_self_question'),
  'Did he fix it himself?': item("Est-ce qu'il l'a réparé lui-même ?", "Est-ce qu'il l'a réparé ___ ?", 'lui-même', ['moi-même', 'toi-même', 'elle-même'], 'emphatic_self_question'),
  'Did she write it herself?': item("Est-ce qu'elle l'a écrit elle-même ?", "Est-ce qu'elle l'a écrit ___ ?", 'elle-même', ['lui-même', 'toi-même', 'eux-mêmes'], 'emphatic_self_question'),
  'Did they clean the room themselves?': item("Est-ce qu'ils ont nettoyé la chambre eux-mêmes ?", "Est-ce qu'ils ont nettoyé la chambre ___ ?", 'eux-mêmes', ['nous-mêmes', 'vous-mêmes', 'lui-même'], 'emphatic_self_question'),
  'Can you control yourself?': item('Est-ce que tu peux te contrôler ?', 'Est-ce que tu peux ___ contrôler ?', 'te', ['me', 'se', 'nous'], 'reflexive_modal'),
  'Should we prepare ourselves?': item('Est-ce que nous devrions nous préparer ?', 'Est-ce que nous devrions ___ préparer ?', 'nous', ['me', 'te', 'se'], 'reflexive_modal'),
  'I did not hurt myself': item('Je ne me suis pas fait mal', 'Je ne ___ suis pas fait mal', 'me', ['te', 'se', 'nous'], 'reflexive_negative'),
  'You did not prepare yourself': item("Tu ne t'es pas préparé", "Tu ne ___ es pas préparé", "t'", ['me', "s'", 'nous'], 'reflexive_negative'),
  'He did not teach himself': item('Il n’a pas appris tout seul', 'Il n’a pas appris ___', 'tout seul', ['toute seule', 'eux-mêmes', 'nous-mêmes'], 'self_taught_negative'),
  'She did not blame herself': item("Elle ne s'est pas blâmée", "Elle ne ___ est pas blâmée", "s'", ['me', "t'", 'nous'], 'reflexive_negative'),
  'We did not protect ourselves': item('Nous ne nous sommes pas protégés', 'Nous ne ___ sommes pas protégés', 'nous', ['me', 'se', 'vous'], 'reflexive_negative'),
  'They did not do it themselves': item("Ils ne l'ont pas fait eux-mêmes", "Ils ne l'ont pas fait ___", 'eux-mêmes', ['nous-mêmes', 'vous-mêmes', 'lui-même'], 'emphatic_self_negative'),
  'I cannot force myself': item('Je ne peux pas me forcer', 'Je ne peux pas ___ forcer', 'me', ['te', 'se', 'nous'], 'reflexive_modal_negative'),
  'He cannot control himself': item('Il ne peut pas se contrôler', 'Il ne peut pas ___ contrôler', 'se', ['me', 'te', 'nous'], 'reflexive_modal_negative'),
  'She cannot forgive herself': item('Elle ne peut pas se pardonner', 'Elle ne peut pas ___ pardonner', 'se', ['me', 'te', 'nous'], 'reflexive_modal_negative'),
  'They cannot stop themselves': item("Ils ne peuvent pas s'arrêter", "Ils ne peuvent pas ___ arrêter", "s'", ['me', "t'", 'nous'], 'reflexive_modal_negative'),
  'Help yourself': item('Sers-toi', '___-toi', 'Sers', ['Servez', 'Servir', 'Servais'], 'reflexive_imperative'),
  'Be yourself': item('Sois toi-même', 'Sois ___', 'toi-même', ['moi-même', 'lui-même', 'eux-mêmes'], 'emphatic_imperative'),
  'Take care of yourself': item('Prends soin de toi', 'Prends soin de ___', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Believe in yourself': item('Crois en toi', 'Crois en ___', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Trust yourself': item('Fais-toi confiance', 'Fais-___ confiance', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Teach yourself every day': item('Apprends par toi-même tous les jours', 'Apprends par ___ tous les jours', 'toi-même', ['moi-même', 'lui-même', 'eux-mêmes'], 'self_taught_imperative'),
  'Ask yourself why': item('Demande-toi pourquoi', 'Demande-___ pourquoi', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Remind yourself to rest': item('Rappelle-toi de te reposer', 'Rappelle-___ de te reposer', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Give yourself time': item('Donne-toi du temps', 'Donne-___ du temps', 'toi', ['moi', 'lui', 'eux'], 'reflexive_imperative'),
  'Do not blame yourself': item('Ne te blâme pas', 'Ne ___ blâme pas', 'te', ['me', 'se', 'nous'], 'reflexive_negative_imperative'),
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
  if (!/[ÃƒÃÃ‘]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function renderMarkdown(ledger: Record<string, unknown>, outJson: string, repoRoot: string): string {
  const rows = Array.isArray(ledger.rows) ? ledger.rows as Array<Record<string, unknown>> : [];
  const lines = [
    '# GUSTAV French Lesson 28 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson28_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson28_reflexive_emphatic_generation_batch_v1',
        'lesson28_self_pronoun_mapping_review_v1',
        'lesson28_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson28_row_ledger.json');
  const outMd = path.join(outDir, 'lesson28_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 28 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
