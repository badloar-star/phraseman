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

const LESSON_ID = 17;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_present_progressive_natural_present_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I am working now': item('Je travaille maintenant', 'Je ___ maintenant', 'travaille', ['travailles', 'travaillons', 'travaillent'], 'present_progressive_natural_present'),
  'You are reading now': item('Tu lis maintenant', 'Tu ___ maintenant', 'lis', ['lit', 'lisons', 'lisez'], 'present_progressive_natural_present'),
  'He is cooking dinner': item('Il prépare le dîner', 'Il ___ le dîner', 'prépare', ['prépares', 'préparons', 'préparent'], 'present_progressive_natural_present'),
  'She is writing messages': item('Elle écrit des messages', 'Elle ___ des messages', 'écrit', ['écris', 'écrivons', 'écrivent'], 'present_progressive_natural_present'),
  'We are waiting here': item('Nous attendons ici', 'Nous ___ ici', 'attendons', ['attends', 'attend', 'attendez'], 'present_progressive_natural_present'),
  'They are watching TV': item('Ils regardent la télé', 'Ils ___ la télé', 'regardent', ['regarde', 'regardons', 'regardez'], 'present_progressive_natural_present'),
  'It is working well': item('Ça marche bien', 'Ça ___ bien', 'marche', ['marches', 'marchons', 'marchent'], 'present_progressive_natural_present'),
  'I am listening to music': item("J'écoute de la musique", "J'___ de la musique", 'écoute', ['écoutes', 'écoutons', 'écoutent'], 'present_progressive_natural_present'),
  'You are drinking coffee': item('Tu bois du café', 'Tu ___ du café', 'bois', ['boit', 'buvons', 'buvez'], 'present_progressive_natural_present'),
  'She is speaking English': item('Elle parle anglais', 'Elle ___ anglais', 'parle', ['parles', 'parlons', 'parlent'], 'present_progressive_natural_present'),
  'He is driving now': item('Il conduit maintenant', 'Il ___ maintenant', 'conduit', ['conduis', 'conduisons', 'conduisent'], 'present_progressive_natural_present'),
  'We are checking documents': item('Nous vérifions les documents', 'Nous ___ les documents', 'vérifions', ['vérifie', 'vérifiez', 'vérifient'], 'present_progressive_natural_present'),
  'They are sending messages': item('Ils envoient des messages', 'Ils ___ des messages', 'envoient', ['envoie', 'envoyons', 'envoyez'], 'present_progressive_natural_present'),
  'I am looking for keys': item('Je cherche les clés', 'Je ___ les clés', 'cherche', ['cherches', 'cherchons', 'cherchent'], 'present_progressive_natural_present'),
  'She is cleaning her room': item('Elle range sa chambre', 'Elle ___ sa chambre', 'range', ['ranges', 'rangeons', 'rangent'], 'present_progressive_natural_present'),
  'He is fixing a problem': item('Il règle un problème', 'Il ___ un problème', 'règle', ['règles', 'réglons', 'règlent'], 'present_progressive_natural_present'),
  'We are ordering food': item('Nous commandons à manger', 'Nous ___ à manger', 'commandons', ['commande', 'commandez', 'commandent'], 'present_progressive_natural_present'),
  'They are buying tickets': item('Ils achètent des billets', 'Ils ___ des billets', 'achètent', ['achète', 'achetons', 'achetez'], 'present_progressive_natural_present'),
  'I am calling you': item('Je te téléphone', 'Je te ___', 'téléphone', ['téléphones', 'téléphonons', 'téléphonent'], 'present_progressive_natural_present'),
  'You are helping me': item("Tu m'aides", "Tu m'___", 'aides', ['aide', 'aidons', 'aident'], 'present_progressive_natural_present'),
  'I am not working now': item('Je ne travaille pas maintenant', 'Je ne ___ pas maintenant', 'travaille', ['travailles', 'travaillons', 'travaillent'], 'present_progressive_negative'),
  'You are not listening': item("Tu n'écoutes pas", "Tu n'___ pas", 'écoutes', ['écoute', 'écoutons', 'écoutent'], 'present_progressive_negative'),
  'He is not sleeping': item('Il ne dort pas', 'Il ne ___ pas', 'dort', ['dors', 'dormons', 'dorment'], 'present_progressive_negative'),
  'She is not reading messages': item('Elle ne lit pas les messages', 'Elle ne ___ pas les messages', 'lit', ['lis', 'lisons', 'lisez'], 'present_progressive_negative'),
  'We are not waiting outside': item('Nous n’attendons pas dehors', 'Nous n’___ pas dehors', 'attendons', ['attends', 'attend', 'attendez'], 'present_progressive_negative'),
  'They are not watching TV': item('Ils ne regardent pas la télé', 'Ils ne ___ pas la télé', 'regardent', ['regarde', 'regardons', 'regardez'], 'present_progressive_negative'),
  'It is not working now': item('Ça ne marche pas maintenant', 'Ça ne ___ pas maintenant', 'marche', ['marches', 'marchons', 'marchent'], 'present_progressive_negative'),
  'I am not looking for problems': item('Je ne cherche pas les problèmes', 'Je ne ___ pas les problèmes', 'cherche', ['cherches', 'cherchons', 'cherchent'], 'present_progressive_negative'),
  'He is not driving today': item('Il ne conduit pas aujourd’hui', 'Il ne ___ pas aujourd’hui', 'conduit', ['conduis', 'conduisons', 'conduisent'], 'present_progressive_negative'),
  'She is not calling him': item('Elle ne lui téléphone pas', 'Elle ne lui ___ pas', 'téléphone', ['téléphones', 'téléphonons', 'téléphonent'], 'present_progressive_negative'),
  'Am I speaking too fast?': item('Est-ce que je parle trop vite ?', 'Est-ce que je ___ trop vite ?', 'parle', ['parles', 'parlons', 'parlent'], 'present_progressive_question'),
  'Are you working now?': item('Est-ce que tu travailles maintenant ?', 'Est-ce que tu ___ maintenant ?', 'travailles', ['travaille', 'travaillons', 'travaillent'], 'present_progressive_question'),
  'Is he cooking dinner?': item('Est-ce qu’il prépare le dîner ?', 'Est-ce qu’il ___ le dîner ?', 'prépare', ['prépares', 'préparons', 'préparent'], 'present_progressive_question'),
  'Is she writing messages?': item('Est-ce qu’elle écrit des messages ?', 'Est-ce qu’elle ___ des messages ?', 'écrit', ['écris', 'écrivons', 'écrivent'], 'present_progressive_question'),
  'Are we waiting here?': item('Est-ce que nous attendons ici ?', 'Est-ce que nous ___ ici ?', 'attendons', ['attends', 'attend', 'attendez'], 'present_progressive_question'),
  'Are they watching TV?': item('Est-ce qu’ils regardent la télé ?', 'Est-ce qu’ils ___ la télé ?', 'regardent', ['regarde', 'regardons', 'regardez'], 'present_progressive_question'),
  'Is it working now?': item('Est-ce que ça marche maintenant ?', 'Est-ce que ça ___ maintenant ?', 'marche', ['marches', 'marchons', 'marchent'], 'present_progressive_question'),
  'Are you listening to me?': item('Est-ce que tu m’écoutes ?', 'Est-ce que tu m’___ ?', 'écoutes', ['écoute', 'écoutons', 'écoutent'], 'present_progressive_question'),
  'Is he looking for keys?': item('Est-ce qu’il cherche les clés ?', 'Est-ce qu’il ___ les clés ?', 'cherche', ['cherches', 'cherchons', 'cherchent'], 'present_progressive_question'),
  'Are they sending documents?': item('Est-ce qu’ils envoient les documents ?', 'Est-ce qu’ils ___ les documents ?', 'envoient', ['envoie', 'envoyons', 'envoyez'], 'present_progressive_question'),
  'What are you doing now?': item('Qu’est-ce que tu fais maintenant ?', 'Qu’est-ce que tu ___ maintenant ?', 'fais', ['fait', 'faisons', 'faites'], 'present_progressive_wh_question'),
  'Where are they going?': item('Où est-ce qu’ils vont ?', 'Où est-ce qu’ils ___ ?', 'vont', ['va', 'allons', 'allez'], 'present_progressive_wh_question'),
  'Why is she crying?': item('Pourquoi est-ce qu’elle pleure ?', 'Pourquoi est-ce qu’elle ___ ?', 'pleure', ['pleures', 'pleurons', 'pleurent'], 'present_progressive_wh_question'),
  'Who are you calling?': item('À qui est-ce que tu téléphones ?', 'À qui est-ce que tu ___ ?', 'téléphones', ['téléphone', 'téléphonons', 'téléphonent'], 'present_progressive_wh_question'),
  'What is he reading?': item('Qu’est-ce qu’il lit ?', 'Qu’est-ce qu’il ___ ?', 'lit', ['lis', 'lisons', 'lisez'], 'present_progressive_wh_question'),
  'Why are we waiting?': item('Pourquoi est-ce que nous attendons ?', 'Pourquoi est-ce que nous ___ ?', 'attendons', ['attends', 'attend', 'attendez'], 'present_progressive_wh_question'),
  'I am turning off my phone': item('J’éteins mon téléphone', 'J’___ mon téléphone', 'éteins', ['allume', 'mets', 'cherche'], 'present_progressive_phrasal_meaning'),
  'She is putting on her jacket': item('Elle met sa veste', 'Elle ___ sa veste', 'met', ['mets', 'enlève', 'allume'], 'present_progressive_phrasal_meaning'),
  'They are cleaning up their room': item('Ils rangent leur chambre', 'Ils ___ leur chambre', 'rangent', ['jettent', 'cherchent', 'rendent'], 'present_progressive_phrasal_meaning'),
  'We are going back now': item('Nous rentrons maintenant', 'Nous ___ maintenant', 'rentrons', ['sortons', 'rendons', 'cherchons'], 'present_progressive_phrasal_meaning'),
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
    '# GUSTAV French Lesson 17 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson17_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson17_present_progressive_generation_batch_v1',
        'lesson17_natural_french_present_mapping_review_v1',
        'lesson17_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson17_row_ledger.json');
  const outMd = path.join(outDir, 'lesson17_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 17 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
