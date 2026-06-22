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

const LESSON_ID = 13;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_future_proche_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I will call you tomorrow': item("Je vais t'appeler demain", 'Je ___ t’appeler demain', 'vais', ['vas', 'va', 'allons'], 'future_proche_aller'),
  'She will help us next week': item('Elle va nous aider la semaine prochaine', 'Elle ___ nous aider la semaine prochaine', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'We will meet soon': item('Nous allons nous rencontrer bientôt', 'Nous ___ nous rencontrer bientôt', 'allons', ['vais', 'allez', 'vont'], 'future_proche_aller'),
  'They will buy food tomorrow': item('Ils vont acheter de la nourriture demain', 'Ils ___ acheter de la nourriture demain', 'vont', ['va', 'allons', 'allez'], 'future_proche_aller'),
  'You will bring documents later': item('Tu vas apporter les documents plus tard', 'Tu ___ apporter les documents plus tard', 'vas', ['vais', 'va', 'vont'], 'future_proche_aller'),
  'He will send messages in ten minutes': item('Il va envoyer des messages dans dix minutes', 'Il ___ envoyer des messages dans dix minutes', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'We will cook soup soon': item('Nous allons préparer de la soupe bientôt', 'Nous ___ préparer de la soupe bientôt', 'allons', ['vais', 'allez', 'vont'], 'future_proche_aller'),
  'She will wear glasses tomorrow': item('Elle va mettre des lunettes demain', 'Elle ___ mettre des lunettes demain', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'They will understand it soon': item('Ils vont le comprendre bientôt', 'Ils ___ le comprendre bientôt', 'vont', ['va', 'allons', 'allez'], 'future_proche_aller'),
  'You will read books next week': item('Tu vas lire des livres la semaine prochaine', 'Tu ___ lire des livres la semaine prochaine', 'vas', ['vais', 'va', 'vont'], 'future_proche_aller'),
  'She will write messages tonight': item('Elle va écrire des messages ce soir', 'Elle ___ écrire des messages ce soir', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'We will see them soon': item('Nous allons les voir bientôt', 'Nous ___ les voir bientôt', 'allons', ['vais', 'allez', 'vont'], 'future_proche_aller'),
  'They will sell tickets next month': item('Ils vont vendre des billets le mois prochain', 'Ils ___ vendre des billets le mois prochain', 'vont', ['va', 'allons', 'allez'], 'future_proche_aller'),
  'I will take cash tomorrow': item('Je vais prendre des espèces demain', 'Je ___ prendre des espèces demain', 'vais', ['vas', 'va', 'allons'], 'future_proche_aller'),
  'He will drink coffee in the morning': item('Il va boire du café le matin', 'Il ___ boire du café le matin', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'We will find keys soon': item('Nous allons trouver les clés bientôt', 'Nous ___ trouver les clés bientôt', 'allons', ['vais', 'allez', 'vont'], 'future_proche_aller'),
  'They will get documents in two days': item('Ils vont recevoir les documents dans deux jours', 'Ils ___ recevoir les documents dans deux jours', 'vont', ['va', 'allons', 'allez'], 'future_proche_aller'),
  'She will choose a plan tomorrow': item('Elle va choisir un plan demain', 'Elle ___ choisir un plan demain', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'I will pay rent next month': item('Je vais payer le loyer le mois prochain', 'Je ___ payer le loyer le mois prochain', 'vais', ['vas', 'va', 'allons'], 'future_proche_aller'),
  'You will answer questions later': item('Tu vas répondre aux questions plus tard', 'Tu ___ répondre aux questions plus tard', 'vas', ['vais', 'va', 'vont'], 'future_proche_aller'),
  'I will not wait': item('Je ne vais pas attendre', 'Je ne ___ pas attendre', 'vais', ['vas', 'va', 'allons'], 'future_proche_negative'),
  'She will not call him tonight': item('Elle ne va pas l’appeler ce soir', 'Elle ne ___ pas l’appeler ce soir', 'va', ['vais', 'vas', 'vont'], 'future_proche_negative'),
  'We will not work tomorrow': item('Nous n’allons pas travailler demain', 'Nous n’___ pas travailler demain', 'allons', ['vais', 'allez', 'vont'], 'future_proche_negative'),
  'They will not come today': item('Ils ne vont pas venir aujourd’hui', 'Ils ne ___ pas venir aujourd’hui', 'vont', ['va', 'allons', 'allez'], 'future_proche_negative'),
  'He will not help them next week': item('Il ne va pas les aider la semaine prochaine', 'Il ne ___ pas les aider la semaine prochaine', 'va', ['vais', 'vas', 'vont'], 'future_proche_negative'),
  'You will not lose money': item('Tu ne vas pas perdre d’argent', 'Tu ne ___ pas perdre d’argent', 'vas', ['vais', 'va', 'vont'], 'future_proche_negative'),
  'She will not read messages tonight': item('Elle ne va pas lire les messages ce soir', 'Elle ne ___ pas lire les messages ce soir', 'va', ['vais', 'vas', 'vont'], 'future_proche_negative'),
  'We will not buy tickets today': item('Nous n’allons pas acheter de billets aujourd’hui', 'Nous n’___ pas acheter de billets aujourd’hui', 'allons', ['vais', 'allez', 'vont'], 'future_proche_negative'),
  'They will not start now': item('Ils ne vont pas commencer maintenant', 'Ils ne ___ pas commencer maintenant', 'vont', ['va', 'allons', 'allez'], 'future_proche_negative'),
  'I will not forget it': item('Je ne vais pas l’oublier', 'Je ne ___ pas l’oublier', 'vais', ['vas', 'va', 'allons'], 'future_proche_negative'),
  'Will you call me tomorrow?': item('Est-ce que tu vas m’appeler demain ?', 'Est-ce que tu ___ m’appeler demain ?', 'vas', ['vais', 'va', 'vont'], 'future_proche_question'),
  'Will he help us?': item('Est-ce qu’il va nous aider ?', 'Est-ce qu’il ___ nous aider ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_question'),
  'Will she come today?': item('Est-ce qu’elle va venir aujourd’hui ?', 'Est-ce qu’elle ___ venir aujourd’hui ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_question'),
  'Will they work tomorrow?': item('Est-ce qu’ils vont travailler demain ?', 'Est-ce qu’ils ___ travailler demain ?', 'vont', ['va', 'allons', 'allez'], 'future_proche_question'),
  'Will we meet soon?': item('Est-ce que nous allons nous rencontrer bientôt ?', 'Est-ce que nous ___ nous rencontrer bientôt ?', 'allons', ['vais', 'allez', 'vont'], 'future_proche_question'),
  'Will you bring a charger?': item('Est-ce que tu vas apporter un chargeur ?', 'Est-ce que tu ___ apporter un chargeur ?', 'vas', ['vais', 'va', 'vont'], 'future_proche_question'),
  'Will he send documents?': item('Est-ce qu’il va envoyer les documents ?', 'Est-ce qu’il ___ envoyer les documents ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_question'),
  'Will she cook dinner?': item('Est-ce qu’elle va préparer le dîner ?', 'Est-ce qu’elle ___ préparer le dîner ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_question'),
  'Will they understand us?': item('Est-ce qu’ils vont nous comprendre ?', 'Est-ce qu’ils ___ nous comprendre ?', 'vont', ['va', 'allons', 'allez'], 'future_proche_question'),
  'Will I need cash?': item('Est-ce que je vais avoir besoin d’espèces ?', 'Est-ce que je ___ avoir besoin d’espèces ?', 'vais', ['vas', 'va', 'allons'], 'future_proche_question'),
  'What will you do tomorrow?': item('Qu’est-ce que tu vas faire demain ?', 'Qu’est-ce que tu ___ faire demain ?', 'vas', ['vais', 'va', 'vont'], 'future_proche_wh_question'),
  'When will she call?': item('Quand est-ce qu’elle va appeler ?', 'Quand est-ce qu’elle ___ appeler ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_wh_question'),
  'Where will we meet?': item('Où est-ce que nous allons nous rencontrer ?', 'Où est-ce que nous ___ nous rencontrer ?', 'allons', ['vais', 'allez', 'vont'], 'future_proche_wh_question'),
  'Why will they wait?': item('Pourquoi est-ce qu’ils vont attendre ?', 'Pourquoi est-ce qu’ils ___ attendre ?', 'vont', ['va', 'allons', 'allez'], 'future_proche_wh_question'),
  'How much will it cost?': item('Combien ça va coûter ?', 'Combien ça ___ coûter ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_wh_question'),
  'Who will help them?': item('Qui va les aider ?', 'Qui ___ les aider ?', 'va', ['vais', 'vas', 'vont'], 'future_proche_wh_question'),
  'I will feel better tomorrow': item('Je vais me sentir mieux demain', 'Je ___ me sentir mieux demain', 'vais', ['vas', 'va', 'allons'], 'future_proche_aller'),
  'We will leave early tomorrow': item('Nous allons partir tôt demain', 'Nous ___ partir tôt demain', 'allons', ['vais', 'allez', 'vont'], 'future_proche_aller'),
  'She will sing later today': item('Elle va chanter plus tard aujourd’hui', 'Elle ___ chanter plus tard aujourd’hui', 'va', ['vais', 'vas', 'vont'], 'future_proche_aller'),
  'They will close soon': item('Ils vont fermer bientôt', 'Ils ___ fermer bientôt', 'vont', ['va', 'allons', 'allez'], 'future_proche_aller'),
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
    '# GUSTAV French Lesson 13 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson13_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson13_future_proche_generation_batch_v1',
        'lesson13_aller_infinitive_mapping_review_v1',
        'lesson13_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson13_row_ledger.json');
  const outMd = path.join(outDir, 'lesson13_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 13 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
