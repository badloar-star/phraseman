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

const LESSON_ID = 12;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_irregular_past_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I bought bread yesterday': item("J'ai acheté du pain hier", "J'ai ___ du pain hier", 'acheté', ['achète', 'achetais', 'acheter'], 'passe_compose_irregular_meaning'),
  'She drank coffee this morning': item('Elle a bu du café ce matin', 'Elle a ___ du café ce matin', 'bu', ['boit', 'buvait', 'boire'], 'passe_compose_irregular_participle'),
  'We found keys this morning': item('Nous avons trouvé des clés ce matin', 'Nous avons ___ des clés ce matin', 'trouvé', ['trouvons', 'trouvions', 'trouver'], 'passe_compose_avoir'),
  'They sold tickets last week': item('Ils ont vendu des billets la semaine dernière', 'Ils ont ___ des billets la semaine dernière', 'vendu', ['vendent', 'vendaient', 'vendre'], 'passe_compose_irregular_participle'),
  'You sent messages yesterday': item('Tu as envoyé des messages hier', 'Tu as ___ des messages hier', 'envoyé', ['envoies', 'envoyais', 'envoyer'], 'passe_compose_avoir'),
  'They came late yesterday': item('Ils sont arrivés tard hier', 'Ils sont ___ tard hier', 'arrivés', ['arrivent', 'arrivaient', 'arriver'], 'passe_compose_etre'),
  'You saw him yesterday': item("Tu l'as vu hier", "Tu l'as ___ hier", 'vu', ['vois', 'voyais', 'voir'], 'passe_compose_irregular_participle'),
  'We built a plan last week': item('Nous avons construit un plan la semaine dernière', 'Nous avons ___ un plan la semaine dernière', 'construit', ['construisons', 'construisions', 'construire'], 'passe_compose_irregular_participle'),
  'I wrote messages this morning': item("J'ai écrit des messages ce matin", "J'ai ___ des messages ce matin", 'écrit', ['écris', 'écrivais', 'écrire'], 'passe_compose_irregular_participle'),
  'She brought food two hours ago': item('Elle a apporté de la nourriture il y a deux heures', 'Elle a ___ de la nourriture il y a deux heures', 'apporté', ['apporte', 'apportait', 'apporter'], 'passe_compose_avoir'),
  'He bought headphones yesterday': item('Il a acheté des écouteurs hier', 'Il a ___ des écouteurs hier', 'acheté', ['achète', 'achetait', 'acheter'], 'passe_compose_avoir'),
  'We went home last night': item('Nous sommes rentrés à la maison hier soir', 'Nous sommes ___ à la maison hier soir', 'rentrés', ['rentrons', 'rentrions', 'rentrer'], 'passe_compose_etre'),
  'I put it here': item("Je l'ai mis ici", "Je l'ai ___ ici", 'mis', ['mets', 'mettais', 'mettre'], 'passe_compose_irregular_participle'),
  'They gave me advice last month': item("Ils m'ont donné un conseil le mois dernier", "Ils m'ont ___ un conseil le mois dernier", 'donné', ['donnent', 'donnaient', 'donner'], 'passe_compose_avoir'),
  'You drank juice this morning': item('Tu as bu du jus ce matin', 'Tu as ___ du jus ce matin', 'bu', ['bois', 'buvais', 'boire'], 'passe_compose_irregular_participle'),
  'He ate breakfast at eight': item('Il a pris le petit déjeuner à huit heures', 'Il a ___ le petit déjeuner à huit heures', 'pris', ['prend', 'prenait', 'prendre'], 'passe_compose_irregular_participle'),
  'She took cash yesterday': item('Elle a pris des espèces hier', 'Elle a ___ des espèces hier', 'pris', ['prend', 'prenait', 'prendre'], 'passe_compose_irregular_participle'),
  'We made dinner yesterday': item('Nous avons préparé le dîner hier', 'Nous avons ___ le dîner hier', 'préparé', ['préparons', 'préparions', 'préparer'], 'passe_compose_avoir'),
  'They heard us at night': item('Ils nous ont entendus la nuit', 'Ils nous ont ___ la nuit', 'entendus', ['entendent', 'entendaient', 'entendre'], 'passe_compose_irregular_participle'),
  'I got tickets last week': item("J'ai obtenu des billets la semaine dernière", "J'ai ___ des billets la semaine dernière", 'obtenu', ['obtiens', 'obtenais', 'obtenir'], 'passe_compose_irregular_participle'),
  'You lost money yesterday': item("Tu as perdu de l'argent hier", "Tu as ___ de l'argent hier", 'perdu', ['perds', 'perdais', 'perdre'], 'passe_compose_irregular_participle'),
  'He left early this morning': item('Il est parti tôt ce matin', 'Il est ___ tôt ce matin', 'parti', ['part', 'partait', 'partir'], 'passe_compose_etre'),
  'She felt tired yesterday': item("Elle s'est sentie fatiguée hier", "Elle s'est ___ fatiguée hier", 'sentie', ['sent', 'sentait', 'sentir'], 'passe_compose_reflexive'),
  'We met friends on Friday': item('Nous avons rencontré des amis vendredi', 'Nous avons ___ des amis vendredi', 'rencontré', ['rencontrons', 'rencontrions', 'rencontrer'], 'passe_compose_avoir'),
  'They read books last month': item('Ils ont lu des livres le mois dernier', 'Ils ont ___ des livres le mois dernier', 'lu', ['lisent', 'lisaient', 'lire'], 'passe_compose_irregular_participle'),
  'I spoke English yesterday': item("J'ai parlé anglais hier", "J'ai ___ anglais hier", 'parlé', ['parle', 'parlais', 'parler'], 'passe_compose_avoir'),
  'You knew him before': item('Tu le connaissais avant', 'Tu le ___ avant', 'connaissais', ['connais', 'as connu', 'connaître'], 'past_state_imparfait'),
  'He thought about it yesterday': item('Il y a pensé hier', 'Il y a ___ hier', 'pensé', ['pense', 'pensait', 'penser'], 'passe_compose_avoir'),
  'She said yes': item('Elle a dit oui', 'Elle a ___ oui', 'dit', ['dites', 'disait', 'dire'], 'passe_compose_irregular_participle'),
  'We paid cash yesterday': item('Nous avons payé en espèces hier', 'Nous avons ___ en espèces hier', 'payé', ['payons', 'payions', 'payer'], 'passe_compose_avoir'),
  'They ran outside this morning': item('Ils ont couru dehors ce matin', 'Ils ont ___ dehors ce matin', 'couru', ['courent', 'couraient', 'courir'], 'passe_compose_irregular_participle'),
  'I slept well last night': item("J'ai bien dormi hier soir", "J'ai bien ___ hier soir", 'dormi', ['dors', 'dormais', 'dormir'], 'passe_compose_irregular_participle'),
  'You sat here yesterday': item('Tu étais assis ici hier', 'Tu ___ assis ici hier', 'étais', ['es', 'as été', 'êtes'], 'past_state_imparfait'),
  'He stood outside': item('Il était debout dehors', 'Il ___ debout dehors', 'était', ['est', 'a été', 'étais'], 'past_state_imparfait'),
  'She wore glasses yesterday': item('Elle portait des lunettes hier', 'Elle ___ des lunettes hier', 'portait', ['porte', 'a porté', 'porter'], 'past_state_imparfait'),
  'We drove cars last week': item('Nous avons conduit des voitures la semaine dernière', 'Nous avons ___ des voitures la semaine dernière', 'conduit', ['conduisons', 'conduisions', 'conduire'], 'passe_compose_irregular_participle'),
  'They did it yesterday': item("Ils l'ont fait hier", "Ils l'ont ___ hier", 'fait', ['font', 'faisaient', 'faire'], 'passe_compose_irregular_participle'),
  'I had time yesterday': item("J'avais du temps hier", "J'___ du temps hier", 'avais', ['ai', 'as', 'avons'], 'past_state_imparfait'),
  'You had a question yesterday': item('Tu avais une question hier', 'Tu ___ une question hier', 'avais', ['as', 'a', 'avons'], 'past_state_imparfait'),
  'She had a problem last week': item('Elle avait un problème la semaine dernière', 'Elle ___ un problème la semaine dernière', 'avait', ['a', 'avais', 'avaient'], 'past_state_imparfait'),
  'He gave her a key': item('Il lui a donné une clé', 'Il lui a ___ une clé', 'donné', ['donne', 'donnait', 'donner'], 'passe_compose_avoir'),
  'She told me a story': item("Elle m'a raconté une histoire", "Elle m'a ___ une histoire", 'raconté', ['raconte', 'racontait', 'raconter'], 'passe_compose_avoir'),
  'We saw them yesterday': item('Nous les avons vus hier', 'Nous les avons ___ hier', 'vus', ['voyons', 'voyions', 'voir'], 'passe_compose_irregular_participle'),
  'They found it this morning': item("Ils l'ont trouvé ce matin", "Ils l'ont ___ ce matin", 'trouvé', ['trouvent', 'trouvaient', 'trouver'], 'passe_compose_avoir'),
  'I brought a charger': item("J'ai apporté un chargeur", "J'ai ___ un chargeur", 'apporté', ['apporte', 'apportais', 'apporter'], 'passe_compose_avoir'),
  'You forgot a key yesterday': item('Tu as oublié une clé hier', 'Tu as ___ une clé hier', 'oublié', ['oublies', 'oubliais', 'oublier'], 'passe_compose_avoir'),
  'He chose a plan last week': item('Il a choisi un plan la semaine dernière', 'Il a ___ un plan la semaine dernière', 'choisi', ['choisit', 'choisissait', 'choisir'], 'passe_compose_avoir'),
  'She left documents at home': item('Elle a laissé les documents à la maison', 'Elle a ___ les documents à la maison', 'laissé', ['laisse', 'laissait', 'laisser'], 'passe_compose_avoir'),
  'We got good news yesterday': item('Nous avons reçu de bonnes nouvelles hier', 'Nous avons ___ de bonnes nouvelles hier', 'reçu', ['recevons', 'recevions', 'recevoir'], 'passe_compose_irregular_participle'),
  'They made mistakes yesterday': item('Ils ont fait des erreurs hier', 'Ils ont ___ des erreurs hier', 'fait', ['font', 'faisaient', 'faire'], 'passe_compose_irregular_participle'),
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
    '# GUSTAV French Lesson 12 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson12_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson12_irregular_past_generation_batch_v1',
        'lesson12_passe_compose_etre_imparfait_mapping_review_v1',
        'lesson12_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson12_row_ledger.json');
  const outMd = path.join(outDir, 'lesson12_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 12 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
