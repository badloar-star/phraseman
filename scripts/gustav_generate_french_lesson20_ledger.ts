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

const LESSON_ID = 20;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_articles_location_review_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I have a phone.': item("J'ai un téléphone.", "J'ai ___ téléphone.", 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The phone is on the table.': item('Le téléphone est sur la table.', 'Le téléphone est ___ la table.', 'sur', ['sous', 'dans', 'près de'], 'location_preposition'),
  'She has a bag.': item('Elle a un sac.', 'Elle a ___ sac.', 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The bag is under the chair.': item('Le sac est sous la chaise.', 'Le sac est ___ la chaise.', 'sous', ['sur', 'dans', 'près de'], 'location_preposition'),
  'He has a key.': item('Il a une clé.', 'Il a ___ clé.', 'une', ['un', 'le', 'des'], 'articles_indefinite'),
  'The key is in the bag.': item('La clé est dans le sac.', 'La clé est ___ le sac.', 'dans', ['sur', 'sous', 'près de'], 'location_preposition'),
  'We bought a ticket.': item('Nous avons acheté un billet.', 'Nous avons acheté ___ billet.', 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The ticket is in my wallet.': item('Le billet est dans mon portefeuille.', 'Le billet est ___ mon portefeuille.', 'dans', ['sur', 'sous', 'près de'], 'location_preposition'),
  'They found a charger.': item('Ils ont trouvé un chargeur.', 'Ils ont trouvé ___ chargeur.', 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The charger is near the phone.': item('Le chargeur est près du téléphone.', 'Le chargeur est ___ téléphone.', 'près du', ['sur le', 'sous le', 'dans le'], 'location_preposition_contract'),
  'I need a passport.': item("J'ai besoin d'un passeport.", "J'ai besoin d'___ passeport.", 'un', ['une', 'le', 'des'], 'avoir_besoin_de'),
  'The passport is in the bag.': item('Le passeport est dans le sac.', 'Le passeport est ___ le sac.', 'dans', ['sur', 'sous', 'près de'], 'location_preposition'),
  'She wrote an email.': item('Elle a écrit un e-mail.', 'Elle a écrit ___ e-mail.', 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The email is important.': item("L'e-mail est important.", "___ e-mail est important.", "L'", ['Le', 'La', 'Un'], 'articles_definite_elision'),
  'He has an idea.': item('Il a une idée.', 'Il a ___ idée.', 'une', ['un', 'le', 'des'], 'articles_indefinite'),
  'The idea is good.': item("L'idée est bonne.", "___ idée est bonne.", "L'", ['Le', 'La', 'Une'], 'articles_definite_elision'),
  'We use an app.': item('Nous utilisons une application.', 'Nous utilisons ___ application.', 'une', ['un', 'le', 'des'], 'articles_indefinite'),
  'The app works well.': item("L'application fonctionne bien.", "___ application fonctionne bien.", "L'", ['Le', 'La', 'Une'], 'articles_definite_elision'),
  'I brought an umbrella.': item("J'ai apporté un parapluie.", "J'ai apporté ___ parapluie.", 'un', ['une', 'le', 'des'], 'articles_indefinite'),
  'The umbrella is near the door.': item('Le parapluie est près de la porte.', 'Le parapluie est ___ la porte.', 'près de', ['sur', 'sous', 'dans'], 'location_preposition'),
  'I drink coffee.': item('Je bois du café.', 'Je bois ___ café.', 'du', ['de la', 'des', 'le'], 'partitive_article'),
  'She drinks water.': item("Elle boit de l'eau.", "Elle boit ___ eau.", "de l'", ['du', 'de la', 'des'], 'partitive_article_elision'),
  'We need money.': item("Nous avons besoin d'argent.", "Nous avons besoin d'___", 'argent', ['l’argent', 'un argent', 'des argents'], 'avoir_besoin_de'),
  'They buy food.': item('Ils achètent de la nourriture.', 'Ils achètent ___ nourriture.', 'de la', ['du', 'des', 'la'], 'partitive_article'),
  'He reads books.': item('Il lit des livres.', 'Il lit ___ livres.', 'des', ['du', 'de la', 'les'], 'plural_article'),
  'She sends messages.': item('Elle envoie des messages.', 'Elle envoie ___ messages.', 'des', ['du', 'de la', 'les'], 'plural_article'),
  'We check documents.': item('Nous vérifions les documents.', 'Nous vérifions ___ documents.', 'les', ['des', 'du', 'de la'], 'definite_plural'),
  'They sell tickets.': item('Ils vendent des billets.', 'Ils vendent ___ billets.', 'des', ['du', 'de la', 'les'], 'plural_article'),
  'I do not drink coffee.': item('Je ne bois pas de café.', 'Je ne bois pas ___ café.', 'de', ['du', 'de la', 'des'], 'negative_partitive'),
  'We do not have money.': item("Nous n'avons pas d'argent.", "Nous n'avons pas ___ argent.", "d'", ['de la', 'du', 'des'], 'negative_partitive_elision'),
  'Do you have a phone?': item('Est-ce que tu as un téléphone ?', 'Est-ce que tu as ___ téléphone ?', 'un', ['une', 'le', 'des'], 'articles_question'),
  'Is the phone on the table?': item('Est-ce que le téléphone est sur la table ?', 'Est-ce que le téléphone est ___ la table ?', 'sur', ['sous', 'dans', 'près de'], 'location_question'),
  'Does she have a bag?': item('Est-ce qu’elle a un sac ?', 'Est-ce qu’elle a ___ sac ?', 'un', ['une', 'le', 'des'], 'articles_question'),
  'Is the bag under the chair?': item('Est-ce que le sac est sous la chaise ?', 'Est-ce que le sac est ___ la chaise ?', 'sous', ['sur', 'dans', 'près de'], 'location_question'),
  'Do they have tickets?': item('Est-ce qu’ils ont des billets ?', 'Est-ce qu’ils ont ___ billets ?', 'des', ['du', 'de la', 'les'], 'plural_question'),
  'Are the tickets in the bag?': item('Est-ce que les billets sont dans le sac ?', 'Est-ce que les billets sont ___ le sac ?', 'dans', ['sur', 'sous', 'près de'], 'location_question'),
  'There is a key on the desk.': item('Il y a une clé sur le bureau.', 'Il y a une clé ___ le bureau.', 'sur', ['sous', 'dans', 'près de'], 'il_y_a_location'),
  'The key is small.': item('La clé est petite.', 'La clé est ___.', 'petite', ['petit', 'petits', 'petites'], 'adjective_agreement'),
  'There is an email in my inbox.': item('Il y a un e-mail dans ma boîte de réception.', 'Il y a un e-mail ___ ma boîte de réception.', 'dans', ['sur', 'sous', 'près de'], 'il_y_a_location'),
  'The email is from her.': item("L'e-mail vient d'elle.", "L'e-mail vient ___ elle.", "d'", ['de', 'du', 'des'], 'preposition_de_elision'),
  'There are books on the table.': item('Il y a des livres sur la table.', 'Il y a des livres ___ la table.', 'sur', ['sous', 'dans', 'près de'], 'il_y_a_location'),
  'The books are old.': item('Les livres sont vieux.', 'Les livres sont ___.', 'vieux', ['vieil', 'vieille', 'vieilles'], 'adjective_plural'),
  'There is coffee in the cup.': item('Il y a du café dans la tasse.', 'Il y a du café ___ la tasse.', 'dans', ['sur', 'sous', 'près de'], 'il_y_a_location'),
  'The cup is on the desk.': item('La tasse est sur le bureau.', 'La tasse est ___ le bureau.', 'sur', ['sous', 'dans', 'près de'], 'location_preposition'),
  'I saw a man near the hotel.': item("J'ai vu un homme près de l'hôtel.", "J'ai vu un homme ___ l'hôtel.", 'près de', ['sur', 'sous', 'dans'], 'location_preposition'),
  'The man was tired.': item("L'homme était fatigué.", "L'homme était ___.", 'fatigué', ['fatiguée', 'fatigués', 'fatiguer'], 'past_state_adjective'),
  'She found a wallet outside the shop.': item('Elle a trouvé un portefeuille devant le magasin.', 'Elle a trouvé un portefeuille ___ le magasin.', 'devant', ['dans', 'sous', 'entre'], 'location_preposition'),
  'The wallet was empty.': item('Le portefeuille était vide.', 'Le portefeuille était ___.', 'vide', ['vides', 'vider', 'vidée'], 'past_state_adjective'),
  'We chose an option.': item('Nous avons choisi une option.', 'Nous avons choisi ___ option.', 'une', ['un', 'le', 'des'], 'articles_indefinite'),
  'The option was better.': item("L'option était meilleure.", "L'option était ___.", 'meilleure', ['meilleur', 'mieux', 'meilleurs'], 'comparative_adjective_meilleur'),
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
    '# GUSTAV French Lesson 20 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson20_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson20_articles_location_generation_batch_v1',
        'lesson20_article_location_state_mapping_review_v1',
        'lesson20_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson20_row_ledger.json');
  const outMd = path.join(outDir, 'lesson20_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 20 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
