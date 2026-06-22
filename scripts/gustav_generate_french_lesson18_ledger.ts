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

const LESSON_ID = 18;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_imperative_request_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'Please wait here': item("Attends ici, s'il te plaît", '___ ici, s’il te plaît', 'Attends', ['Attend', 'Attendez', 'Attendons'], 'imperative_polite_tu'),
  'Please help me': item("Aide-moi, s'il te plaît", '___, s’il te plaît', 'Aide-moi', ['Aides-moi', 'Aidez-moi', 'Aidons-moi'], 'imperative_polite_tu'),
  'Please call me later': item("Appelle-moi plus tard, s'il te plaît", '___ plus tard, s’il te plaît', 'Appelle-moi', ['Appelles-moi', 'Appelez-moi', 'Appelons-moi'], 'imperative_polite_tu'),
  'Please check messages': item("Vérifie les messages, s'il te plaît", '___ les messages, s’il te plaît', 'Vérifie', ['Vérifies', 'Vérifiez', 'Vérifions'], 'imperative_polite_tu'),
  'Please send documents': item("Envoie les documents, s'il te plaît", '___ les documents, s’il te plaît', 'Envoie', ['Envoies', 'Envoyez', 'Envoyons'], 'imperative_polite_tu'),
  'Please open the app': item("Ouvre l'application, s'il te plaît", '___ l’application, s’il te plaît', 'Ouvre', ['Ouvres', 'Ouvrez', 'Ouvrons'], 'imperative_polite_tu'),
  'Please close the app': item("Ferme l'application, s'il te plaît", '___ l’application, s’il te plaît', 'Ferme', ['Fermes', 'Fermez', 'Fermons'], 'imperative_polite_tu'),
  'Please turn on your phone': item("Allume ton téléphone, s'il te plaît", '___ ton téléphone, s’il te plaît', 'Allume', ['Allumes', 'Allumez', 'Allumons'], 'imperative_polite_tu'),
  'Please turn off your phone': item("Éteins ton téléphone, s'il te plaît", '___ ton téléphone, s’il te plaît', 'Éteins', ['Éteint', 'Éteignez', 'Éteignons'], 'imperative_polite_tu'),
  'Please give it back': item("Rends-le, s'il te plaît", '___, s’il te plaît', 'Rends-le', ['Rend-le', 'Rendez-le', 'Rendons-le'], 'imperative_polite_tu'),
  'Wait here': item('Attends ici', '___ ici', 'Attends', ['Attend', 'Attendez', 'Attendons'], 'imperative_affirmative_tu'),
  'Start now': item('Commence maintenant', '___ maintenant', 'Commence', ['Commences', 'Commencez', 'Commençons'], 'imperative_affirmative_tu'),
  'Listen to me': item('Écoute-moi', '___', 'Écoute-moi', ['Écoutes-moi', 'Écoutez-moi', 'Écoutons-moi'], 'imperative_affirmative_tu'),
  'Look at me': item('Regarde-moi', '___', 'Regarde-moi', ['Regardes-moi', 'Regardez-moi', 'Regardons-moi'], 'imperative_affirmative_tu'),
  'Call her now': item('Appelle-la maintenant', '___ maintenant', 'Appelle-la', ['Appelles-la', 'Appelez-la', 'Appelons-la'], 'imperative_affirmative_tu'),
  'Help us today': item('Aide-nous aujourd’hui', '___ aujourd’hui', 'Aide-nous', ['Aides-nous', 'Aidez-nous', 'Aidons-nous'], 'imperative_affirmative_tu'),
  'Bring documents': item('Apporte les documents', '___ les documents', 'Apporte', ['Apportes', 'Apportez', 'Apportons'], 'imperative_affirmative_tu'),
  'Take cash': item('Prends des espèces', '___ des espèces', 'Prends', ['Prend', 'Prenez', 'Prenons'], 'imperative_affirmative_tu'),
  'Check your phone': item('Vérifie ton téléphone', '___ ton téléphone', 'Vérifie', ['Vérifies', 'Vérifiez', 'Vérifions'], 'imperative_affirmative_tu'),
  'Clean your room': item('Range ta chambre', '___ ta chambre', 'Range', ['Ranges', 'Rangez', 'Rangeons'], 'imperative_affirmative_tu'),
  'Do not wait outside': item("N'attends pas dehors", "N'___ pas dehors", 'attends', ['attend', 'attendez', 'attendons'], 'imperative_negative_tu'),
  'Do not call him': item('Ne lui téléphone pas', 'Ne lui ___ pas', 'téléphone', ['téléphones', 'téléphonez', 'téléphonons'], 'imperative_negative_tu'),
  'Do not send messages': item("N'envoie pas de messages", "N'___ pas de messages", 'envoie', ['envoies', 'envoyez', 'envoyons'], 'imperative_negative_tu'),
  'Do not open it': item('Ne l’ouvre pas', 'Ne l’___ pas', 'ouvre', ['ouvres', 'ouvrez', 'ouvrons'], 'imperative_negative_tu'),
  'Do not close it': item('Ne le ferme pas', 'Ne le ___ pas', 'ferme', ['fermes', 'fermez', 'fermons'], 'imperative_negative_tu'),
  'Do not forget your key': item('N’oublie pas ta clé', 'N’___ pas ta clé', 'oublie', ['oublies', 'oubliez', 'oublions'], 'imperative_negative_tu'),
  'Do not lose your ticket': item('Ne perds pas ton billet', 'Ne ___ pas ton billet', 'perds', ['perd', 'perdez', 'perdons'], 'imperative_negative_tu'),
  'Do not use my phone': item("N'utilise pas mon téléphone", "N'___ pas mon téléphone", 'utilise', ['utilises', 'utilisez', 'utilisons'], 'imperative_negative_tu'),
  'Do not share passwords': item('Ne partage pas les mots de passe', 'Ne ___ pas les mots de passe', 'partage', ['partages', 'partagez', 'partageons'], 'imperative_negative_tu'),
  'Do not waste time': item('Ne perds pas de temps', 'Ne ___ pas de temps', 'perds', ['perd', 'perdez', 'perdons'], 'imperative_negative_tu'),
  'Can you help me?': item("Est-ce que tu peux m'aider ?", "Est-ce que tu peux m’___ ?", 'aider', ['aides', 'aidé', 'aidez'], 'request_pouvoir'),
  'Can you call me later?': item("Est-ce que tu peux m'appeler plus tard ?", "Est-ce que tu peux m’___ plus tard ?", 'appeler', ['appelles', 'appelé', 'appelez'], 'request_pouvoir'),
  'Can you send documents?': item('Est-ce que tu peux envoyer les documents ?', 'Est-ce que tu peux ___ les documents ?', 'envoyer', ['envoies', 'envoyé', 'envoyez'], 'request_pouvoir'),
  'Can you check my phone?': item('Est-ce que tu peux vérifier mon téléphone ?', 'Est-ce que tu peux ___ mon téléphone ?', 'vérifier', ['vérifies', 'vérifié', 'vérifiez'], 'request_pouvoir'),
  'Can you bring a charger?': item('Est-ce que tu peux apporter un chargeur ?', 'Est-ce que tu peux ___ un chargeur ?', 'apporter', ['apportes', 'apporté', 'apportez'], 'request_pouvoir'),
  'Can you give it back?': item('Est-ce que tu peux le rendre ?', 'Est-ce que tu peux le ___ ?', 'rendre', ['rends', 'rendu', 'rendez'], 'request_pouvoir'),
  'Can you turn off the lights?': item('Est-ce que tu peux éteindre les lumières ?', 'Est-ce que tu peux ___ les lumières ?', 'éteindre', ['éteins', 'éteint', 'éteignez'], 'request_pouvoir'),
  'Can you open the door?': item('Est-ce que tu peux ouvrir la porte ?', 'Est-ce que tu peux ___ la porte ?', 'ouvrir', ['ouvres', 'ouvert', 'ouvrez'], 'request_pouvoir'),
  'Can you close the door?': item('Est-ce que tu peux fermer la porte ?', 'Est-ce que tu peux ___ la porte ?', 'fermer', ['fermes', 'fermé', 'fermez'], 'request_pouvoir'),
  'Can you wait here?': item('Est-ce que tu peux attendre ici ?', 'Est-ce que tu peux ___ ici ?', 'attendre', ['attends', 'attendu', 'attendez'], 'request_pouvoir'),
  'Let us start now': item('Commençons maintenant', '___ maintenant', 'Commençons', ['Commence', 'Commencez', 'Commençons-nous'], 'hortative_nous'),
  'Let us work together': item('Travaillons ensemble', '___ ensemble', 'Travaillons', ['Travaille', 'Travaillez', 'Travaillons-nous'], 'hortative_nous'),
  'Let us check documents': item('Vérifions les documents', '___ les documents', 'Vérifions', ['Vérifie', 'Vérifiez', 'Vérifions-nous'], 'hortative_nous'),
  'Let us order food': item('Commandons à manger', '___ à manger', 'Commandons', ['Commande', 'Commandez', 'Commandons-nous'], 'hortative_nous'),
  'Let us call them': item('Appelons-les', '___', 'Appelons-les', ['Appelle-les', 'Appelez-les', 'Appelons-nous'], 'hortative_nous'),
  'Let us find a better option': item('Trouvons une meilleure option', '___ une meilleure option', 'Trouvons', ['Trouve', 'Trouvez', 'Trouvons-nous'], 'hortative_nous'),
  'Let us go back': item('Rentrons', '___', 'Rentrons', ['Rentre', 'Rentrez', 'Rentrons-nous'], 'hortative_nous'),
  'Let us clean up the room': item('Rangeons la pièce', '___ la pièce', 'Rangeons', ['Range', 'Rangez', 'Rangeons-nous'], 'hortative_nous'),
  'Let us talk later': item('Parlons plus tard', '___ plus tard', 'Parlons', ['Parle', 'Parlez', 'Parlons-nous'], 'hortative_nous'),
  'Let us finish today': item('Finissons aujourd’hui', '___ aujourd’hui', 'Finissons', ['Finis', 'Finissez', 'Finissons-nous'], 'hortative_nous'),
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
    '# GUSTAV French Lesson 18 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson18_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson18_imperative_request_generation_batch_v1',
        'lesson18_polite_negative_hortative_mapping_review_v1',
        'lesson18_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson18_row_ledger.json');
  const outMd = path.join(outDir, 'lesson18_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 18 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
