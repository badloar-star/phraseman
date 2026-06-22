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

const LESSON_ID = 26;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_si_clause_future_imperative_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'If you help me, I will finish faster': item("Si tu m'aides, je finirai plus vite", "Si tu m'aides, je ___ plus vite", 'finirai', ['finis', 'finir', 'finissais'], 'si_present_future'),
  'If she calls me, I will answer': item("Si elle m'appelle, je répondrai", "Si elle m'appelle, je ___", 'répondrai', ['réponds', 'répondre', 'répondais'], 'si_present_future'),
  'If we start now, we will finish today': item("Si nous commençons maintenant, nous finirons aujourd'hui", "Si nous commençons maintenant, nous ___ aujourd'hui", 'finirons', ['finissons', 'finir', 'finissions'], 'si_present_future'),
  'If they come today, we will talk': item("S'ils viennent aujourd'hui, nous parlerons", "S'ils viennent aujourd'hui, nous ___", 'parlerons', ['parlons', 'parler', 'parlions'], 'si_present_future'),
  'If he finds the keys, he will call us': item("S'il trouve les clés, il nous appellera", "S'il trouve les clés, il nous ___", 'appellera', ['appelle', 'appeler', 'appelait'], 'si_present_future'),
  'If you bring documents, I will check them': item('Si tu apportes les documents, je les vérifierai', 'Si tu apportes les documents, je les ___', 'vérifierai', ['vérifie', 'vérifier', 'vérifiais'], 'si_present_future'),
  'If she has time, she will help us': item('Si elle a le temps, elle nous aidera', 'Si elle a le temps, elle nous ___', 'aidera', ['aide', 'aider', 'aidait'], 'si_present_future'),
  'If it rains, we will stay home': item("S'il pleut, nous resterons à la maison", "S'il pleut, nous ___ à la maison", 'resterons', ['restons', 'rester', 'restions'], 'si_present_future'),
  'If you wait here, I will come back': item("Si tu attends ici, je reviendrai", "Si tu attends ici, je ___", 'reviendrai', ['reviens', 'revenir', 'revenais'], 'si_present_future'),
  'If we buy tickets today, we will save money': item("Si nous achetons les billets aujourd'hui, nous économiserons de l'argent", "Si nous achetons les billets aujourd'hui, nous ___ de l'argent", 'économiserons', ['économisons', 'économiser', 'économisions'], 'si_present_future'),
  'If he sends the message, I will read it': item("S'il envoie le message, je le lirai", "S'il envoie le message, je le ___", 'lirai', ['lis', 'lire', 'lisais'], 'si_present_future'),
  'If you open the app, it will work': item("Si tu ouvres l'application, elle fonctionnera", "Si tu ouvres l'application, elle ___", 'fonctionnera', ['fonctionne', 'fonctionner', 'fonctionnait'], 'si_present_future'),
  'If she studies every day, her English will improve': item("Si elle étudie tous les jours, son anglais s'améliorera", "Si elle étudie tous les jours, son anglais ___", "s'améliorera", ["s'améliore", "s'améliorer", "s'améliorait"], 'si_present_future'),
  'If they ask for help, we will help them': item("S'ils demandent de l'aide, nous les aiderons", "S'ils demandent de l'aide, nous les ___", 'aiderons', ['aidons', 'aider', 'aidions'], 'si_present_future'),
  'If I see him, I will tell him': item('Si je le vois, je lui dirai', 'Si je le vois, je lui ___', 'dirai', ['dis', 'dire', 'disais'], 'si_present_future'),
  'If you do not call me, I will wait': item("Si tu ne m'appelles pas, j'attendrai", "Si tu ne m'appelles pas, j'___", 'attendrai', ['attends', 'attendre', 'attendais'], 'si_negative_future'),
  'If she does not come, we will start without her': item('Si elle ne vient pas, nous commencerons sans elle', 'Si elle ne vient pas, nous ___ sans elle', 'commencerons', ['commençons', 'commencer', 'commencions'], 'si_negative_future'),
  'If they do not help us, we will do it ourselves': item("S'ils ne nous aident pas, nous le ferons nous-mêmes", "S'ils ne nous aident pas, nous le ___ nous-mêmes", 'ferons', ['faisons', 'faire', 'faisions'], 'si_negative_future'),
  'If he does not find the keys, he will stay here': item("S'il ne trouve pas les clés, il restera ici", "S'il ne trouve pas les clés, il ___ ici", 'restera', ['reste', 'rester', 'restait'], 'si_negative_future'),
  'If you do not check messages, you will miss the news': item('Si tu ne vérifies pas les messages, tu manqueras les nouvelles', 'Si tu ne vérifies pas les messages, tu ___ les nouvelles', 'manqueras', ['manques', 'manquer', 'manquais'], 'si_negative_future'),
  'If we do not leave now, we will be late': item('Si nous ne partons pas maintenant, nous serons en retard', 'Si nous ne partons pas maintenant, nous ___ en retard', 'serons', ['sommes', 'être', 'étions'], 'si_negative_future'),
  'If you do not save it, you will lose it': item("Si tu ne l'enregistres pas, tu le perdras", "Si tu ne l'enregistres pas, tu le ___", 'perdras', ['perds', 'perdre', 'perdais'], 'si_negative_future'),
  'If she does not sleep, she will feel tired': item('Si elle ne dort pas, elle se sentira fatiguée', 'Si elle ne dort pas, elle se ___ fatiguée', 'sentira', ['sent', 'sentir', 'sentait'], 'si_negative_future'),
  'If they do not pay today, they will have problems': item("S'ils ne paient pas aujourd'hui, ils auront des problèmes", "S'ils ne paient pas aujourd'hui, ils ___ des problèmes", 'auront', ['ont', 'avoir', 'avaient'], 'si_negative_future'),
  'If it does not work, I will check it': item('Si ça ne marche pas, je le vérifierai', 'Si ça ne marche pas, je le ___', 'vérifierai', ['vérifie', 'vérifier', 'vérifiais'], 'si_negative_future'),
  'Will you help me if I ask?': item('Est-ce que tu m’aideras si je te le demande ?', 'Est-ce que tu m’___ si je te le demande ?', 'aideras', ['aides', 'aider', 'aidais'], 'future_si_question'),
  'Will she call me if she has time?': item("Est-ce qu'elle m'appellera si elle a le temps ?", "Est-ce qu'elle m'___ si elle a le temps ?", 'appellera', ['appelle', 'appeler', 'appelait'], 'future_si_question'),
  'Will they come if we invite them?': item("Est-ce qu'ils viendront si nous les invitons ?", "Est-ce qu'ils ___ si nous les invitons ?", 'viendront', ['viennent', 'venir', 'venaient'], 'future_si_question'),
  'Will it work if I restart the app?': item("Est-ce que ça marchera si je redémarre l'application ?", "Est-ce que ça ___ si je redémarre l'application ?", 'marchera', ['marche', 'marcher', 'marchait'], 'future_si_question'),
  'Will you wait if I am late?': item('Est-ce que tu attendras si je suis en retard ?', 'Est-ce que tu ___ si je suis en retard ?', 'attendras', ['attends', 'attendre', 'attendais'], 'future_si_question'),
  'What will you do if it rains?': item("Qu'est-ce que tu feras s'il pleut ?", "Qu'est-ce que tu ___ s'il pleut ?", 'feras', ['fais', 'faire', 'faisais'], 'future_si_wh_question'),
  'Where will we go if they come?': item("Où est-ce que nous irons s'ils viennent ?", "Où est-ce que nous ___ s'ils viennent ?", 'irons', ['allons', 'aller', 'allions'], 'future_si_wh_question'),
  'Who will help us if he leaves?': item("Qui nous aidera s'il part ?", "Qui nous ___ s'il part ?", 'aidera', ['aide', 'aider', 'aidait'], 'future_si_wh_question'),
  'What will happen if we start now?': item('Que se passera-t-il si nous commençons maintenant ?', 'Que se ___-t-il si nous commençons maintenant ?', 'passera', ['passe', 'passer', 'passait'], 'future_si_wh_question'),
  'How will you feel if you lose your phone?': item('Comment te sentiras-tu si tu perds ton téléphone ?', 'Comment te ___-tu si tu perds ton téléphone ?', 'sentiras', ['sens', 'sentir', 'sentais'], 'future_si_wh_question'),
  'If you heat water, it gets hot': item("Si tu chauffes l'eau, elle devient chaude", "Si tu chauffes l'eau, elle ___ chaude", 'devient', ['deviendra', 'devenir', 'devenait'], 'zero_conditional_present'),
  'If people do not sleep, they feel tired': item('Si les gens ne dorment pas, ils se sentent fatigués', 'Si les gens ne dorment pas, ils ___ fatigués', 'se sentent', ['se sentiront', 'se sentir', 'se sentaient'], 'zero_conditional_present'),
  'If you study every day, you learn faster': item('Si tu étudies tous les jours, tu apprends plus vite', 'Si tu étudies tous les jours, tu ___ plus vite', 'apprends', ['apprendras', 'apprendre', 'apprenais'], 'zero_conditional_present'),
  'If you spend money, you have less money': item("Si tu dépenses de l'argent, tu as moins d'argent", "Si tu dépenses de l'argent, tu ___ moins d'argent", 'as', ['auras', 'avoir', 'avais'], 'zero_conditional_present'),
  'If you help people, they remember it': item("Si tu aides les gens, ils s'en souviennent", "Si tu aides les gens, ils s'en ___", 'souviennent', ['souviendront', 'souvenir', 'souvenaient'], 'zero_conditional_present'),
  'If you open the door, light comes in': item('Si tu ouvres la porte, la lumière entre', 'Si tu ouvres la porte, la lumière ___', 'entre', ['entrera', 'entrer', 'entrait'], 'zero_conditional_present'),
  'If you press this button, the app starts': item("Si tu appuies sur ce bouton, l'application démarre", "Si tu appuies sur ce bouton, l'application ___", 'démarre', ['démarrera', 'démarrer', 'démarrait'], 'zero_conditional_present'),
  'If you need help, call me': item("Si tu as besoin d'aide, appelle-moi", "Si tu as besoin d'aide, ___", 'appelle-moi', ['appelleras-moi', 'appeler-moi', 'appelais-moi'], 'si_imperative'),
  'If you are tired, rest': item('Si tu es fatigué, repose-toi', 'Si tu es fatigué, ___', 'repose-toi', ['reposeras-toi', 'reposer-toi', 'reposais-toi'], 'si_imperative'),
  'If you find my bag, tell me': item('Si tu trouves mon sac, dis-le-moi', 'Si tu trouves mon sac, ___', 'dis-le-moi', ['diras-le-moi', 'dire-le-moi', 'disais-le-moi'], 'si_imperative'),
  'If you see a mistake, fix it': item('Si tu vois une erreur, corrige-la', 'Si tu vois une erreur, ___', 'corrige-la', ['corrigeras-la', 'corriger-la', 'corrigeais-la'], 'si_imperative'),
  'If you have questions, ask me': item('Si tu as des questions, pose-les-moi', 'Si tu as des questions, ___', 'pose-les-moi', ['poseras-les-moi', 'poser-les-moi', 'posais-les-moi'], 'si_imperative'),
  'If you finish early, call her': item('Si tu finis tôt, appelle-la', 'Si tu finis tôt, ___', 'appelle-la', ['appelleras-la', 'appeler-la', 'appelais-la'], 'si_imperative'),
  'If they arrive late, wait for them': item("S'ils arrivent en retard, attends-les", "S'ils arrivent en retard, ___", 'attends-les', ['attendras-les', 'attendre-les', 'attendais-les'], 'si_imperative'),
  'If it is important, send it today': item("Si c'est important, envoie-le aujourd'hui", "Si c'est important, ___ aujourd'hui", 'envoie-le', ['enverras-le', 'envoyer-le', 'envoyais-le'], 'si_imperative'),
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
    '# GUSTAV French Lesson 26 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson26_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson26_si_clause_generation_batch_v1',
        'lesson26_future_zero_imperative_mapping_review_v1',
        'lesson26_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson26_row_ledger.json');
  const outMd = path.join(outDir, 'lesson26_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 26 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
