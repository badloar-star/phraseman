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

const LESSON_ID = 27;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_reported_speech_tense_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'He said that he was tired': item("Il a dit qu'il était fatigué", "Il a dit qu'il ___ fatigué", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'She said that she was busy': item("Elle a dit qu'elle était occupée", "Elle a dit qu'elle ___ occupée", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'They said that they were ready': item("Ils ont dit qu'ils étaient prêts", "Ils ont dit qu'ils ___ prêts", 'étaient', ['sont', 'être', 'seront'], 'reported_imparfait'),
  'We said that we were at home': item('Nous avons dit que nous étions à la maison', 'Nous avons dit que nous ___ à la maison', 'étions', ['sommes', 'être', 'serons'], 'reported_imparfait'),
  'I said that I needed help': item("J'ai dit que j'avais besoin d'aide", "J'ai dit que j'___ d'aide", 'avais besoin', ['ai besoin', 'avoir besoin', 'aurai besoin'], 'reported_imparfait_need'),
  'You said that you wanted coffee': item('Tu as dit que tu voulais du café', 'Tu as dit que tu ___ du café', 'voulais', ['veux', 'vouloir', 'voudras'], 'reported_imparfait'),
  'He said that he knew the answer': item("Il a dit qu'il connaissait la réponse", "Il a dit qu'il ___ la réponse", 'connaissait', ['connaît', 'connaître', 'connaîtra'], 'reported_imparfait'),
  'She said that she remembered me': item("Elle a dit qu'elle se souvenait de moi", "Elle a dit qu'elle se ___ de moi", 'souvenait', ['souvient', 'souvenir', 'souviendra'], 'reported_imparfait'),
  'They said that they had time': item("Ils ont dit qu'ils avaient le temps", "Ils ont dit qu'ils ___ le temps", 'avaient', ['ont', 'avoir', 'auront'], 'reported_imparfait'),
  'We said that we had questions': item('Nous avons dit que nous avions des questions', 'Nous avons dit que nous ___ des questions', 'avions', ['avons', 'avoir', 'aurons'], 'reported_imparfait'),
  'He told me that he was okay': item("Il m'a dit qu'il allait bien", "Il m'a dit qu'il ___ bien", 'allait', ['va', 'aller', 'ira'], 'reported_imparfait_idiom'),
  'She told us that she was ready': item("Elle nous a dit qu'elle était prête", "Elle nous a dit qu'elle ___ prête", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'He said that he would call me': item("Il a dit qu'il m'appellerait", "Il a dit qu'il m'___", 'appellerait', ['appelle', 'appeler', 'appellera'], 'reported_conditionnel'),
  'She said that she would help us': item("Elle a dit qu'elle nous aiderait", "Elle a dit qu'elle nous ___", 'aiderait', ['aide', 'aider', 'aidera'], 'reported_conditionnel'),
  'They said that they would come later': item("Ils ont dit qu'ils viendraient plus tard", "Ils ont dit qu'ils ___ plus tard", 'viendraient', ['viennent', 'venir', 'viendront'], 'reported_conditionnel'),
  'We said that we would finish today': item("Nous avons dit que nous finirions aujourd'hui", "Nous avons dit que nous ___ aujourd'hui", 'finirions', ['finissons', 'finir', 'finirons'], 'reported_conditionnel'),
  'I said that I would send the message': item("J'ai dit que j'enverrais le message", "J'ai dit que j'___ le message", 'enverrais', ['envoie', 'envoyer', 'enverrai'], 'reported_conditionnel'),
  'You said that you would check the documents': item('Tu as dit que tu vérifierais les documents', 'Tu as dit que tu ___ les documents', 'vérifierais', ['vérifies', 'vérifier', 'vérifieras'], 'reported_conditionnel'),
  'He said that he would bring the keys': item("Il a dit qu'il apporterait les clés", "Il a dit qu'il ___ les clés", 'apporterait', ['apporte', 'apporter', 'apportera'], 'reported_conditionnel'),
  'She said that she would open the door': item("Elle a dit qu'elle ouvrirait la porte", "Elle a dit qu'elle ___ la porte", 'ouvrirait', ['ouvre', 'ouvrir', 'ouvrira'], 'reported_conditionnel'),
  'They said that they would wait outside': item("Ils ont dit qu'ils attendraient dehors", "Ils ont dit qu'ils ___ dehors", 'attendraient', ['attendent', 'attendre', 'attendront'], 'reported_conditionnel'),
  'We said that we would start soon': item('Nous avons dit que nous commencerions bientôt', 'Nous avons dit que nous ___ bientôt', 'commencerions', ['commençons', 'commencer', 'commencerons'], 'reported_conditionnel'),
  'He said that he could help': item("Il a dit qu'il pouvait aider", "Il a dit qu'il ___ aider", 'pouvait', ['peut', 'pouvoir', 'pourra'], 'reported_pouvoir_imparfait'),
  'She said that she could call him': item("Elle a dit qu'elle pouvait l'appeler", "Elle a dit qu'elle ___ l'appeler", 'pouvait', ['peut', 'pouvoir', 'pourra'], 'reported_pouvoir_imparfait'),
  'They said that they could find it': item("Ils ont dit qu'ils pouvaient le trouver", "Ils ont dit qu'ils ___ le trouver", 'pouvaient', ['peuvent', 'pouvoir', 'pourront'], 'reported_pouvoir_imparfait'),
  'We said that we could work today': item("Nous avons dit que nous pouvions travailler aujourd'hui", "Nous avons dit que nous ___ travailler aujourd'hui", 'pouvions', ['pouvons', 'pouvoir', 'pourrons'], 'reported_pouvoir_imparfait'),
  'I said that I could not wait': item("J'ai dit que je ne pouvais pas attendre", "J'ai dit que je ne ___ pas attendre", 'pouvais', ['peux', 'pouvoir', 'pourrai'], 'reported_pouvoir_negative'),
  'You said that you could not hear me': item("Tu as dit que tu ne pouvais pas m'entendre", "Tu as dit que tu ne ___ pas m'entendre", 'pouvais', ['peux', 'pouvoir', 'pourras'], 'reported_pouvoir_negative'),
  'He said that he could not find the phone': item("Il a dit qu'il ne pouvait pas trouver le téléphone", "Il a dit qu'il ne ___ pas trouver le téléphone", 'pouvait', ['peut', 'pouvoir', 'pourra'], 'reported_pouvoir_negative'),
  'She said that she could not open the app': item("Elle a dit qu'elle ne pouvait pas ouvrir l'application", "Elle a dit qu'elle ne ___ pas ouvrir l'application", 'pouvait', ['peut', 'pouvoir', 'pourra'], 'reported_pouvoir_negative'),
  'He said that he did not know': item("Il a dit qu'il ne savait pas", "Il a dit qu'il ne ___ pas", 'savait', ['sait', 'savoir', 'saura'], 'reported_negative_imparfait'),
  'She said that she did not remember': item("Elle a dit qu'elle ne se souvenait pas", "Elle a dit qu'elle ne se ___ pas", 'souvenait', ['souvient', 'souvenir', 'souviendra'], 'reported_negative_imparfait'),
  'They said that they did not have money': item("Ils ont dit qu'ils n'avaient pas d'argent", "Ils ont dit qu'ils n'___ pas d'argent", 'avaient', ['ont', 'avoir', 'auront'], 'reported_negative_imparfait'),
  'We said that we did not need help': item("Nous avons dit que nous n'avions pas besoin d'aide", "Nous avons dit que nous n'___ pas besoin d'aide", 'avions', ['avons', 'avoir', 'aurons'], 'reported_negative_imparfait'),
  'I said that I did not understand': item("J'ai dit que je ne comprenais pas", "J'ai dit que je ne ___ pas", 'comprenais', ['comprends', 'comprendre', 'comprendrai'], 'reported_negative_imparfait'),
  'You said that you did not see it': item("Tu as dit que tu ne l'avais pas vu", "Tu as dit que tu ne l'___ pas vu", 'avais', ['as', 'avoir', 'auras'], 'reported_plus_que_parfait_negative'),
  'He said that he did not want coffee': item("Il a dit qu'il ne voulait pas de café", "Il a dit qu'il ne ___ pas de café", 'voulait', ['veut', 'vouloir', 'voudra'], 'reported_negative_imparfait'),
  'She said that she did not like waiting': item("Elle a dit qu'elle n'aimait pas attendre", "Elle a dit qu'elle n'___ pas attendre", 'aimait', ['aime', 'aimer', 'aimera'], 'reported_negative_imparfait'),
  'He said that he had finished': item("Il a dit qu'il avait fini", "Il a dit qu'il ___ fini", 'avait', ['a', 'avoir', 'aura'], 'reported_plus_que_parfait'),
  'She said that she had called me': item("Elle a dit qu'elle m'avait appelé", "Elle a dit qu'elle m'___ appelé", 'avait', ['a', 'avoir', 'aura'], 'reported_plus_que_parfait'),
  'They said that they had sent documents': item("Ils ont dit qu'ils avaient envoyé les documents", "Ils ont dit qu'ils ___ envoyé les documents", 'avaient', ['ont', 'avoir', 'auront'], 'reported_plus_que_parfait'),
  'We said that we had found the keys': item('Nous avons dit que nous avions trouvé les clés', 'Nous avons dit que nous ___ trouvé les clés', 'avions', ['avons', 'avoir', 'aurons'], 'reported_plus_que_parfait'),
  'I said that I had lost my phone': item("J'ai dit que j'avais perdu mon téléphone", "J'ai dit que j'___ perdu mon téléphone", 'avais', ['ai', 'avoir', 'aurai'], 'reported_plus_que_parfait'),
  'You said that you had checked it': item("Tu as dit que tu l'avais vérifié", "Tu as dit que tu l'___ vérifié", 'avais', ['as', 'avoir', 'auras'], 'reported_plus_que_parfait'),
  'She said that she had already paid': item("Elle a dit qu'elle avait déjà payé", "Elle a dit qu'elle ___ déjà payé", 'avait', ['a', 'avoir', 'aura'], 'reported_plus_que_parfait'),
  'He explained that he was late': item("Il a expliqué qu'il était en retard", "Il a expliqué qu'il ___ en retard", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'She promised that she would call later': item("Elle a promis qu'elle appellerait plus tard", "Elle a promis qu'elle ___ plus tard", 'appellerait', ['appelle', 'appeler', 'appellera'], 'reported_conditionnel'),
  'They warned us that it was dangerous': item("Ils nous ont prévenus que c'était dangereux", "Ils nous ont prévenus que c'___ dangereux", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'We admitted that we had made a mistake': item('Nous avons admis que nous avions fait une erreur', 'Nous avons admis que nous ___ fait une erreur', 'avions', ['avons', 'avoir', 'aurons'], 'reported_plus_que_parfait'),
  'He replied that everything was okay': item('Il a répondu que tout allait bien', 'Il a répondu que tout ___ bien', 'allait', ['va', 'aller', 'ira'], 'reported_imparfait_idiom'),
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
    '# GUSTAV French Lesson 27 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson27_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson27_reported_speech_generation_batch_v1',
        'lesson27_tense_mapping_review_v1',
        'lesson27_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson27_row_ledger.json');
  const outMd = path.join(outDir, 'lesson27_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 27 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
