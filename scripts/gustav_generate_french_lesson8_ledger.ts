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

const LESSON_ID = 8;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_time_expression_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I work on Monday': item('Je travaille lundi', 'Je travaille ___', 'lundi', ['en lundi', 'à lundi', 'le matin'], 'time_day_specific'),
  "She leaves at eight o'clock": item('Elle part à huit heures', 'Elle part ___ huit heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We rest in July': item('Nous nous reposons en juillet', 'Nous nous reposons ___ juillet', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'He pays on the weekend': item('Il paie le week-end', 'Il paie ___ week-end', 'le', ['à', 'en', 'dans'], 'time_weekend'),
  'They call in the morning': item('Ils appellent le matin', 'Ils appellent ___ matin', 'le', ['à', 'en', 'sur'], 'time_part_of_day'),
  'He has a meeting at noon': item('Il a une réunion à midi', 'Il a une réunion ___ midi', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'You pay cash on Friday': item('Vous payez en espèces vendredi', 'Vous payez en espèces ___', 'vendredi', ['en vendredi', 'à vendredi', 'le soir'], 'time_day_specific'),
  'The shop closes at midnight': item('Le magasin ferme à minuit', 'Le magasin ferme ___ minuit', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We travel in winter': item('Nous voyageons en hiver', 'Nous voyageons ___ hiver', 'en', ['à', 'le', 'sur'], 'time_season_en'),
  'They walk in the evening': item('Ils se promènent le soir', 'Ils se promènent ___ soir', 'le', ['à', 'en', 'sur'], 'time_part_of_day'),
  'I start work at nine': item('Je commence le travail à neuf heures', 'Je commence le travail ___ neuf heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'The train arrives at seven PM': item('Le train arrive à dix-neuf heures', 'Le train arrive ___ dix-neuf heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We do sport on Tuesdays': item('Nous faisons du sport le mardi', 'Nous faisons du sport ___ mardi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'She checks mail at night': item('Elle vérifie son courrier la nuit', 'Elle vérifie son courrier ___ nuit', 'la', ['à', 'en', 'le'], 'time_part_of_day'),
  'They relax in August': item('Ils se reposent en août', 'Ils se reposent ___ août', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'I book a hotel in June': item('Je réserve un hôtel en juin', 'Je réserve un hôtel ___ juin', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'We meet at nine thirty': item('Nous nous retrouvons à neuf heures trente', 'Nous nous retrouvons ___ neuf heures trente', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'She works on Thursdays': item('Elle travaille le jeudi', 'Elle travaille ___ jeudi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'They order food in the evening': item('Ils commandent à manger le soir', 'Ils commandent à manger ___ soir', 'le', ['à', 'en', 'sur'], 'time_part_of_day'),
  'He has a vacation in spring': item('Il a des vacances au printemps', 'Il a des vacances ___ printemps', 'au', ['en', 'à', 'le'], 'time_season_au'),
  'I come home at midnight': item('Je rentre à la maison à minuit', 'Je rentre à la maison ___ minuit', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'The train departs at ten fifteen': item('Le train part à dix heures quinze', 'Le train part ___ dix heures quinze', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We walk in the park on Sundays': item('Nous nous promenons dans le parc le dimanche', 'Nous nous promenons dans le parc ___ dimanche', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'She has breakfast in the morning': item('Elle prend le petit déjeuner le matin', 'Elle prend le petit déjeuner ___ matin', 'le', ['à', 'en', 'sur'], 'time_part_of_day'),
  'They shop on Saturday': item('Ils font les courses samedi', 'Ils font les courses ___', 'samedi', ['en samedi', 'à samedi', 'le matin'], 'time_day_specific'),
  'We have class on Tuesdays': item('Nous avons cours le mardi', 'Nous avons cours ___ mardi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'We have lunch at one PM': item("Nous déjeunons à treize heures", 'Nous déjeunons ___ treize heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'She visits the gym on Wednesdays': item('Elle va à la salle de sport le mercredi', 'Elle va à la salle de sport ___ mercredi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'They have dinner at eight': item('Ils dînent à huit heures', 'Ils dînent ___ huit heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'He has a day off on Saturday': item('Il a un jour de congé samedi', 'Il a un jour de congé ___', 'samedi', ['en samedi', 'à samedi', 'le soir'], 'time_day_specific'),
  "He takes a shower at eight o'clock": item('Il prend une douche à huit heures', 'Il prend une douche ___ huit heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We pay rent in January': item('Nous payons le loyer en janvier', 'Nous payons le loyer ___ janvier', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'She finishes work at five PM': item('Elle finit le travail à dix-sept heures', 'Elle finit le travail ___ dix-sept heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'They meet on weekends': item('Ils se rencontrent le week-end', 'Ils se rencontrent ___ week-end', 'le', ['à', 'en', 'sur'], 'time_weekend'),
  'He has a birthday in October': item('Il a son anniversaire en octobre', 'Il a son anniversaire ___ octobre', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'I listen to music at six': item("J'écoute de la musique à six heures", "J'écoute de la musique ___ six heures", 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'Does she have time on Friday?': item('Est-ce qu’elle a du temps vendredi ?', 'Est-ce qu’elle a du temps ___ ?', 'vendredi', ['en vendredi', 'à vendredi', 'le matin'], 'time_day_specific'),
  'She runs in the park in summer': item('Elle court dans le parc en été', 'Elle court dans le parc ___ été', 'en', ['à', 'le', 'sur'], 'time_season_en'),
  'We travel in May': item('Nous voyageons en mai', 'Nous voyageons ___ mai', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'He checks documents at night': item('Il vérifie les documents la nuit', 'Il vérifie les documents ___ nuit', 'la', ['à', 'en', 'le'], 'time_part_of_day'),
  'I buy tickets in March': item("J'achète des billets en mars", "J'achète des billets ___ mars", 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'She calls her mother on Mondays': item('Elle appelle sa mère le lundi', 'Elle appelle sa mère ___ lundi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'We drink tea in the afternoon': item("Nous buvons du thé l'après-midi", "Nous buvons du thé ___ après-midi", "l'", ['à', 'en', 'le'], 'time_part_of_day'),
  'Does he have work in September?': item('Est-ce qu’il a du travail en septembre ?', 'Est-ce qu’il a du travail ___ septembre ?', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'They arrive on Thursday': item('Ils arrivent jeudi', 'Ils arrivent ___', 'jeudi', ['en jeudi', 'à jeudi', 'le matin'], 'time_day_specific'),
  'I wake up at seven': item('Je me réveille à sept heures', 'Je me réveille ___ sept heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'The bus arrives at two PM': item('Le bus arrive à quatorze heures', 'Le bus arrive ___ quatorze heures', 'à', ['en', 'le', 'dans'], 'time_clock_at'),
  'We order pizza on Saturdays': item('Nous commandons une pizza le samedi', 'Nous commandons une pizza ___ samedi', 'le', ['à', 'en', 'sur'], 'time_day_habitual'),
  'She has a meeting in December': item('Elle a une réunion en décembre', 'Elle a une réunion ___ décembre', 'en', ['à', 'le', 'sur'], 'time_month_en'),
  'They read books in January': item('Ils lisent des livres en janvier', 'Ils lisent des livres ___ janvier', 'en', ['à', 'le', 'sur'], 'time_month_en'),
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
    '# GUSTAV French Lesson 8 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson8_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson8_time_expression_generation_batch_v1',
        'lesson8_day_month_clock_mapping_review_v1',
        'lesson8_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson8_row_ledger.json');
  const outMd = path.join(outDir, 'lesson8_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 8 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
