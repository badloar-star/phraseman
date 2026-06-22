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

const LESSON_ID = 11;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_past_tense_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I worked yesterday': item("J'ai travaillé hier", "J'___ travaillé hier", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You helped me yesterday': item("Tu m'as aidé hier", 'Tu m’___ aidé hier', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He called her yesterday': item('Il lui a téléphoné hier', 'Il lui ___ téléphoné hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She cooked dinner yesterday': item('Elle a préparé le dîner hier', 'Elle ___ préparé le dîner hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We watched TV yesterday': item('Nous avons regardé la télé hier', 'Nous ___ regardé la télé hier', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They played music yesterday': item('Ils ont joué de la musique hier', 'Ils ___ joué de la musique hier', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I washed the dishes this morning': item("J'ai fait la vaisselle ce matin", "J'___ fait la vaisselle ce matin", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You opened apps this morning': item('Tu as ouvert les applications ce matin', 'Tu ___ ouvert les applications ce matin', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He checked messages this morning': item('Il a vérifié les messages ce matin', 'Il ___ vérifié les messages ce matin', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She washed clothes this morning': item('Elle a lavé des vêtements ce matin', 'Elle ___ lavé des vêtements ce matin', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We finished work at five': item('Nous avons fini le travail à cinq heures', 'Nous ___ fini le travail à cinq heures', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They started work at nine': item('Ils ont commencé le travail à neuf heures', 'Ils ___ commencé le travail à neuf heures', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I waited outside': item("J'ai attendu dehors", "J'___ attendu dehors", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You listened to music': item('Tu as écouté de la musique', 'Tu ___ écouté de la musique', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He asked for help': item("Il a demandé de l'aide", "Il ___ demandé de l'aide", 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She answered questions': item('Elle a répondu aux questions', 'Elle ___ répondu aux questions', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We ordered food': item('Nous avons commandé à manger', 'Nous ___ commandé à manger', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They visited friends': item('Ils ont rendu visite à des amis', 'Ils ___ rendu visite à des amis', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I needed time': item("J'avais besoin de temps", "J'___ besoin de temps", 'avais', ['ai', 'as', 'avons'], 'past_state_imparfait'),
  'You wanted help': item("Tu voulais de l'aide", 'Tu ___ de l’aide', 'voulais', ['veux', 'as voulu', 'voulons'], 'past_state_imparfait'),
  'He used cash yesterday': item('Il a utilisé des espèces hier', 'Il ___ utilisé des espèces hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She closed apps yesterday': item('Elle a fermé les applications hier', 'Elle ___ fermé les applications hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We checked documents yesterday': item('Nous avons vérifié les documents hier', 'Nous ___ vérifié les documents hier', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They packed bags yesterday': item('Ils ont fait leurs bagages hier', 'Ils ___ fait leurs bagages hier', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I booked tickets last week': item("J'ai réservé des billets la semaine dernière", "J'___ réservé des billets la semaine dernière", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You rented a car last week': item('Tu as loué une voiture la semaine dernière', 'Tu ___ loué une voiture la semaine dernière', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He printed documents last week': item('Il a imprimé les documents la semaine dernière', 'Il ___ imprimé les documents la semaine dernière', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She charged a phone last week': item('Elle a chargé son téléphone la semaine dernière', 'Elle ___ chargé son téléphone la semaine dernière', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We moved tables last week': item('Nous avons déplacé les tables la semaine dernière', 'Nous ___ déplacé les tables la semaine dernière', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They painted walls last week': item('Ils ont peint les murs la semaine dernière', 'Ils ___ peint les murs la semaine dernière', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I missed a call this morning': item("J'ai manqué un appel ce matin", "J'___ manqué un appel ce matin", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You saved money last month': item("Tu as économisé de l'argent le mois dernier", "Tu ___ économisé de l'argent le mois dernier", 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He changed plans yesterday': item('Il a changé les plans hier', 'Il ___ changé les plans hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'She prepared lunch yesterday': item('Elle a préparé le déjeuner hier', 'Elle ___ préparé le déjeuner hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We canceled plans yesterday': item('Nous avons annulé les plans hier', 'Nous ___ annulé les plans hier', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They returned tickets yesterday': item('Ils ont rendu les billets hier', 'Ils ___ rendu les billets hier', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I fixed a problem two hours ago': item("J'ai réglé un problème il y a deux heures", "J'___ réglé un problème il y a deux heures", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'You deleted messages two hours ago': item('Tu as supprimé des messages il y a deux heures', 'Tu ___ supprimé des messages il y a deux heures', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
  'He parked outside two hours ago': item("Il s'est garé dehors il y a deux heures", "Il s'___ garé dehors il y a deux heures", 'est', ['a', 'as', 'sont'], 'passe_compose_etre_reflexive'),
  'She mailed documents two hours ago': item('Elle a envoyé les documents par courrier il y a deux heures', 'Elle ___ envoyé les documents par courrier il y a deux heures', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We discussed problems on Monday': item('Nous avons discuté des problèmes lundi', 'Nous ___ discuté des problèmes lundi', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They delivered food on Friday': item('Ils ont livré de la nourriture vendredi', 'Ils ___ livré de la nourriture vendredi', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I locked the door at night': item("J'ai fermé la porte à clé la nuit", "J'___ fermé la porte à clé la nuit", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'She called my friend yesterday': item('Elle a appelé mon ami hier', 'Elle ___ appelé mon ami hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'He helped her sister yesterday': item('Il a aidé sa sœur hier', 'Il ___ aidé sa sœur hier', 'a', ['ai', 'as', 'ont'], 'passe_compose_avoir'),
  'We visited our friends last month': item('Nous avons rendu visite à nos amis le mois dernier', 'Nous ___ rendu visite à nos amis le mois dernier', 'avons', ['ai', 'avez', 'ont'], 'passe_compose_avoir'),
  'They cleaned their room last Sunday': item('Ils ont nettoyé leur chambre dimanche dernier', 'Ils ___ nettoyé leur chambre dimanche dernier', 'ont', ['a', 'avons', 'avez'], 'passe_compose_avoir'),
  'I returned a book last Tuesday': item("J'ai rendu un livre mardi dernier", "J'___ rendu un livre mardi dernier", 'ai', ['as', 'a', 'avons'], 'passe_compose_avoir'),
  'She brushed her hair this morning': item("Elle s'est brossé les cheveux ce matin", "Elle s'___ brossé les cheveux ce matin", 'est', ['a', 'as', 'sont'], 'passe_compose_etre_reflexive'),
  'You answered an email yesterday': item('Tu as répondu à un e-mail hier', 'Tu ___ répondu à un e-mail hier', 'as', ['ai', 'a', 'avons'], 'passe_compose_avoir'),
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
    '# GUSTAV French Lesson 11 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson11_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson11_past_generation_batch_v1',
        'lesson11_passe_compose_imparfait_mapping_review_v1',
        'lesson11_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson11_row_ledger.json');
  const outMd = path.join(outDir, 'lesson11_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 11 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
