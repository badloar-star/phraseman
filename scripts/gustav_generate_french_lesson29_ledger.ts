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

const LESSON_ID = 29;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_used_to_imparfait_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I used to live here': item("Avant, j'habitais ici", "Avant, j'___ ici", 'habitais', ['habite', 'habiter', 'habiterai'], 'used_to_imparfait'),
  'You used to work here': item('Avant, tu travaillais ici', 'Avant, tu ___ ici', 'travaillais', ['travailles', 'travailler', 'travailleras'], 'used_to_imparfait'),
  'He used to call me every day': item("Avant, il m'appelait tous les jours", "Avant, il m'___ tous les jours", 'appelait', ['appelle', 'appeler', 'appellera'], 'used_to_imparfait'),
  'She used to study English': item("Avant, elle étudiait l'anglais", "Avant, elle ___ l'anglais", 'étudiait', ['étudie', 'étudier', 'étudiera'], 'used_to_imparfait'),
  'We used to work together': item('Avant, nous travaillions ensemble', 'Avant, nous ___ ensemble', 'travaillions', ['travaillons', 'travailler', 'travaillerons'], 'used_to_imparfait'),
  'They used to live near us': item('Avant, ils habitaient près de chez nous', 'Avant, ils ___ près de chez nous', 'habitaient', ['habitent', 'habiter', 'habiteront'], 'used_to_imparfait'),
  'I used to read books at night': item('Avant, je lisais des livres la nuit', 'Avant, je ___ des livres la nuit', 'lisais', ['lis', 'lire', 'lirai'], 'used_to_imparfait'),
  'You used to watch TV every evening': item('Avant, tu regardais la télé tous les soirs', 'Avant, tu ___ la télé tous les soirs', 'regardais', ['regardes', 'regarder', 'regarderas'], 'used_to_imparfait'),
  'He used to play music': item('Avant, il jouait de la musique', 'Avant, il ___ de la musique', 'jouait', ['joue', 'jouer', 'jouera'], 'used_to_imparfait'),
  'She used to write messages': item('Avant, elle écrivait des messages', 'Avant, elle ___ des messages', 'écrivait', ['écrit', 'écrire', 'écrira'], 'used_to_imparfait'),
  'We used to walk outside': item('Avant, nous nous promenions dehors', 'Avant, nous nous ___ dehors', 'promenions', ['promenons', 'promener', 'promènerons'], 'used_to_imparfait'),
  'They used to travel in summer': item('Avant, ils voyageaient en été', 'Avant, ils ___ en été', 'voyageaient', ['voyagent', 'voyager', 'voyageront'], 'used_to_imparfait'),
  'I used to drink coffee': item('Avant, je buvais du café', 'Avant, je ___ du café', 'buvais', ['bois', 'boire', 'boirai'], 'used_to_imparfait'),
  'She used to cook dinner': item('Avant, elle préparait le dîner', 'Avant, elle ___ le dîner', 'préparait', ['prépare', 'préparer', 'préparera'], 'used_to_imparfait'),
  'He used to drive every day': item('Avant, il conduisait tous les jours', 'Avant, il ___ tous les jours', 'conduisait', ['conduit', 'conduire', 'conduira'], 'used_to_imparfait'),
  'I used to wake up early, but now I wake up late': item('Avant, je me réveillais tôt, mais maintenant je me réveille tard', 'Avant, je me ___ tôt, mais maintenant je me réveille tard', 'réveillais', ['réveille', 'réveiller', 'réveillerai'], 'used_to_now_contrast'),
  'She used to work at night, but now she works in the morning': item('Avant, elle travaillait la nuit, mais maintenant elle travaille le matin', 'Avant, elle ___ la nuit, mais maintenant elle travaille le matin', 'travaillait', ['travaille', 'travailler', 'travaillera'], 'used_to_now_contrast'),
  'We used to live there, but now we live here': item('Avant, nous habitions là-bas, mais maintenant nous habitons ici', 'Avant, nous ___ là-bas, mais maintenant nous habitons ici', 'habitions', ['habitons', 'habiter', 'habiterons'], 'used_to_now_contrast'),
  'They used to call us, but now they send messages': item('Avant, ils nous appelaient, mais maintenant ils envoient des messages', 'Avant, ils nous ___, mais maintenant ils envoient des messages', 'appelaient', ['appellent', 'appeler', 'appelleront'], 'used_to_now_contrast'),
  'He used to spend money, but now he saves money': item("Avant, il dépensait de l'argent, mais maintenant il économise", "Avant, il ___ de l'argent, mais maintenant il économise", 'dépensait', ['dépense', 'dépenser', 'dépensera'], 'used_to_now_contrast'),
  'I used to forget keys, but now I check my bag': item("Avant, j'oubliais mes clés, mais maintenant je vérifie mon sac", "Avant, j'___ mes clés, mais maintenant je vérifie mon sac", 'oubliais', ['oublie', 'oublier', 'oublierai'], 'used_to_now_contrast'),
  'She used to hate waiting, but now she is patient': item('Avant, elle détestait attendre, mais maintenant elle est patiente', 'Avant, elle ___ attendre, mais maintenant elle est patiente', 'détestait', ['déteste', 'détester', 'détestera'], 'used_to_now_contrast'),
  'We used to order food, but now we cook at home': item('Avant, nous commandions à manger, mais maintenant nous cuisinons à la maison', 'Avant, nous ___ à manger, mais maintenant nous cuisinons à la maison', 'commandions', ['commandons', 'commander', 'commanderons'], 'used_to_now_contrast'),
  'They used to be late, but now they come on time': item("Avant, ils étaient en retard, mais maintenant ils arrivent à l'heure", "Avant, ils ___ en retard, mais maintenant ils arrivent à l'heure", 'étaient', ['sont', 'être', 'seront'], 'used_to_now_contrast'),
  'You used to need help, but now you do it yourself': item("Avant, tu avais besoin d'aide, mais maintenant tu le fais toi-même", "Avant, tu ___ d'aide, mais maintenant tu le fais toi-même", 'avais besoin', ['as besoin', 'avoir besoin', 'auras besoin'], 'used_to_now_contrast'),
  'I did not use to drink coffee': item('Avant, je ne buvais pas de café', 'Avant, je ne ___ pas de café', 'buvais', ['bois', 'boire', 'boirai'], 'used_to_negative_imparfait'),
  'You did not use to work here': item('Avant, tu ne travaillais pas ici', 'Avant, tu ne ___ pas ici', 'travaillais', ['travailles', 'travailler', 'travailleras'], 'used_to_negative_imparfait'),
  'He did not use to call me': item("Avant, il ne m'appelait pas", "Avant, il ne m'___ pas", 'appelait', ['appelle', 'appeler', 'appellera'], 'used_to_negative_imparfait'),
  'She did not use to study every day': item("Avant, elle n'étudiait pas tous les jours", "Avant, elle n'___ pas tous les jours", 'étudiait', ['étudie', 'étudier', 'étudiera'], 'used_to_negative_imparfait'),
  'We did not use to travel often': item('Avant, nous ne voyagions pas souvent', 'Avant, nous ne ___ pas souvent', 'voyagions', ['voyageons', 'voyager', 'voyagerons'], 'used_to_negative_imparfait'),
  'They did not use to help us': item('Avant, ils ne nous aidaient pas', 'Avant, ils ne nous ___ pas', 'aidaient', ['aident', 'aider', 'aideront'], 'used_to_negative_imparfait'),
  'I did not use to understand English': item("Avant, je ne comprenais pas l'anglais", "Avant, je ne ___ pas l'anglais", 'comprenais', ['comprends', 'comprendre', 'comprendrai'], 'used_to_negative_imparfait'),
  'He did not use to wake up early': item('Avant, il ne se réveillait pas tôt', 'Avant, il ne se ___ pas tôt', 'réveillait', ['réveille', 'réveiller', 'réveillera'], 'used_to_negative_imparfait'),
  'She did not use to drive at night': item('Avant, elle ne conduisait pas la nuit', 'Avant, elle ne ___ pas la nuit', 'conduisait', ['conduit', 'conduire', 'conduira'], 'used_to_negative_imparfait'),
  'We did not use to spend much money': item("Avant, nous ne dépensions pas beaucoup d'argent", "Avant, nous ne ___ pas beaucoup d'argent", 'dépensions', ['dépensons', 'dépenser', 'dépenserons'], 'used_to_negative_imparfait'),
  'Did you use to live here?': item('Est-ce que tu habitais ici avant ?', 'Est-ce que tu ___ ici avant ?', 'habitais', ['habites', 'habiter', 'habiteras'], 'used_to_question_imparfait'),
  'Did she use to call you?': item("Est-ce qu'elle t'appelait avant ?", "Est-ce qu'elle t'___ avant ?", 'appelait', ['appelle', 'appeler', 'appellera'], 'used_to_question_imparfait'),
  'Did they use to work together?': item("Est-ce qu'ils travaillaient ensemble avant ?", "Est-ce qu'ils ___ ensemble avant ?", 'travaillaient', ['travaillent', 'travailler', 'travailleront'], 'used_to_question_imparfait'),
  'Did he use to study English?': item("Est-ce qu'il étudiait l'anglais avant ?", "Est-ce qu'il ___ l'anglais avant ?", 'étudiait', ['étudie', 'étudier', 'étudiera'], 'used_to_question_imparfait'),
  'Did you use to wake up early?': item('Est-ce que tu te réveillais tôt avant ?', 'Est-ce que tu te ___ tôt avant ?', 'réveillais', ['réveilles', 'réveiller', 'réveilleras'], 'used_to_question_imparfait'),
  'Did we use to meet on Fridays?': item('Est-ce qu’on se voyait le vendredi avant ?', 'Est-ce qu’on se ___ le vendredi avant ?', 'voyait', ['voit', 'voir', 'verra'], 'used_to_question_imparfait'),
  'Did they use to travel in summer?': item("Est-ce qu'ils voyageaient en été avant ?", "Est-ce qu'ils ___ en été avant ?", 'voyageaient', ['voyagent', 'voyager', 'voyageront'], 'used_to_question_imparfait'),
  'Did she use to read books at night?': item("Est-ce qu'elle lisait des livres la nuit avant ?", "Est-ce qu'elle ___ des livres la nuit avant ?", 'lisait', ['lit', 'lire', 'lira'], 'used_to_question_imparfait'),
  'Did he use to forget his phone?': item("Est-ce qu'il oubliait son téléphone avant ?", "Est-ce qu'il ___ son téléphone avant ?", 'oubliait', ['oublie', 'oublier', 'oubliera'], 'used_to_question_imparfait'),
  'Did you use to spend money fast?': item('Est-ce que tu dépensais vite ton argent avant ?', 'Est-ce que tu ___ vite ton argent avant ?', 'dépensais', ['dépenses', 'dépenser', 'dépenseras'], 'used_to_question_imparfait'),
  'I used to be shy': item("Avant, j'étais timide", "Avant, j'___ timide", 'étais', ['suis', 'être', 'serai'], 'used_to_state_imparfait'),
  'She used to be afraid of mistakes': item('Avant, elle avait peur des erreurs', 'Avant, elle ___ peur des erreurs', 'avait', ['a', 'avoir', 'aura'], 'used_to_state_imparfait'),
  'Now I speak more confidently': item("Maintenant, je parle avec plus d'assurance", 'Maintenant, je ___ avec plus d’assurance', 'parle', ['parlais', 'parler', 'parlerai'], 'now_present_contrast'),
  'She now learns from mistakes': item('Maintenant, elle apprend de ses erreurs', 'Maintenant, elle ___ de ses erreurs', 'apprend', ['apprenait', 'apprendre', 'apprendra'], 'now_present_contrast'),
  'We used to learn slowly, but now we learn faster': item('Avant, nous apprenions lentement, mais maintenant nous apprenons plus vite', 'Avant, nous ___ lentement, mais maintenant nous apprenons plus vite', 'apprenions', ['apprenons', 'apprendre', 'apprendrons'], 'used_to_now_contrast'),
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
    '# GUSTAV French Lesson 29 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson29_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson29_used_to_generation_batch_v1',
        'lesson29_imparfait_present_contrast_review_v1',
        'lesson29_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson29_row_ledger.json');
  const outMd = path.join(outDir, 'lesson29_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 29 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
