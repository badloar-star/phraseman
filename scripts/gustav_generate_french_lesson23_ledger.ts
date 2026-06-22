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

const LESSON_ID = 23;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_passive_and_on_mapping_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'The room is cleaned every day': item('La chambre est nettoyée tous les jours', 'La chambre est ___ tous les jours', 'nettoyée', ['nettoie', 'nettoyer', 'nettoyant'], 'passive_present_feminine'),
  'The documents are checked every morning': item('Les documents sont vérifiés chaque matin', 'Les documents sont ___ chaque matin', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_present_plural'),
  'The tickets are sold online': item('Les billets sont vendus en ligne', 'Les billets sont ___ en ligne', 'vendus', ['vendent', 'vendre', 'vendant'], 'passive_present_plural'),
  'The food is cooked here': item('La nourriture est préparée ici', 'La nourriture est ___ ici', 'préparée', ['prépare', 'préparer', 'préparant'], 'passive_present_feminine'),
  'The coffee is made in the morning': item('Le café est préparé le matin', 'Le café est ___ le matin', 'préparé', ['prépare', 'préparer', 'préparant'], 'passive_present_masculine'),
  'The door is closed at night': item('La porte est fermée la nuit', 'La porte est ___ la nuit', 'fermée', ['ferme', 'fermer', 'fermant'], 'passive_present_feminine'),
  'The windows are opened in the morning': item('Les fenêtres sont ouvertes le matin', 'Les fenêtres sont ___ le matin', 'ouvertes', ['ouvrent', 'ouvrir', 'ouvrant'], 'passive_present_plural_feminine'),
  'The messages are sent every day': item('Les messages sont envoyés tous les jours', 'Les messages sont ___ tous les jours', 'envoyés', ['envoient', 'envoyer', 'envoyant'], 'passive_present_plural'),
  'The app is used by many people': item("L'application est utilisée par beaucoup de gens", "L'application est ___ par beaucoup de gens", 'utilisée', ['utilise', 'utiliser', 'utilisant'], 'passive_present_feminine'),
  'The phones are charged here': item('Les téléphones sont chargés ici', 'Les téléphones sont ___ ici', 'chargés', ['chargent', 'charger', 'chargeant'], 'passive_present_plural'),
  'The bags are checked here': item('Les sacs sont vérifiés ici', 'Les sacs sont ___ ici', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_present_plural'),
  'The keys are kept inside': item("Les clés sont gardées à l'intérieur", "Les clés sont ___ à l'intérieur", 'gardées', ['gardent', 'garder', 'gardant'], 'passive_present_plural_feminine'),
  'The password is changed often': item('Le mot de passe est souvent changé', 'Le mot de passe est souvent ___', 'changé', ['change', 'changer', 'changeant'], 'passive_present_masculine'),
  'The questions are answered quickly': item('On répond rapidement aux questions', 'On ___ rapidement aux questions', 'répond', ['répondu', 'répondre', 'répondant'], 'on_impersonal_passive_equivalent'),
  'The answers are checked carefully': item('Les réponses sont vérifiées attentivement', 'Les réponses sont ___ attentivement', 'vérifiées', ['vérifient', 'vérifier', 'vérifiant'], 'passive_present_plural_feminine'),
  'The rules are explained clearly': item('Les règles sont expliquées clairement', 'Les règles sont ___ clairement', 'expliquées', ['expliquent', 'expliquer', 'expliquant'], 'passive_present_plural_feminine'),
  'The plan is discussed every week': item('Le plan est discuté chaque semaine', 'Le plan est ___ chaque semaine', 'discuté', ['discute', 'discuter', 'discutant'], 'passive_present_masculine'),
  'The ideas are supported here': item('Les idées sont soutenues ici', 'Les idées sont ___ ici', 'soutenues', ['soutiennent', 'soutenir', 'soutenant'], 'passive_present_plural_feminine'),
  'The problem is solved quickly': item('Le problème est résolu rapidement', 'Le problème est ___ rapidement', 'résolu', ['résout', 'résoudre', 'résolvant'], 'passive_present_masculine'),
  'The work is finished on time': item('Le travail est terminé à temps', 'Le travail est ___ à temps', 'terminé', ['termine', 'terminer', 'terminant'], 'passive_present_masculine'),
  'Is the room cleaned every day?': item('Est-ce que la chambre est nettoyée tous les jours ?', 'Est-ce que la chambre est ___ tous les jours ?', 'nettoyée', ['nettoie', 'nettoyer', 'nettoyant'], 'passive_question_feminine'),
  'Are the documents checked every morning?': item('Est-ce que les documents sont vérifiés chaque matin ?', 'Est-ce que les documents sont ___ chaque matin ?', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_question_plural'),
  'Are the tickets sold online?': item('Est-ce que les billets sont vendus en ligne ?', 'Est-ce que les billets sont ___ en ligne ?', 'vendus', ['vendent', 'vendre', 'vendant'], 'passive_question_plural'),
  'Is the food cooked here?': item('Est-ce que la nourriture est préparée ici ?', 'Est-ce que la nourriture est ___ ici ?', 'préparée', ['prépare', 'préparer', 'préparant'], 'passive_question_feminine'),
  'Is the door closed at night?': item('Est-ce que la porte est fermée la nuit ?', 'Est-ce que la porte est ___ la nuit ?', 'fermée', ['ferme', 'fermer', 'fermant'], 'passive_question_feminine'),
  'Are the messages sent every day?': item('Est-ce que les messages sont envoyés tous les jours ?', 'Est-ce que les messages sont ___ tous les jours ?', 'envoyés', ['envoient', 'envoyer', 'envoyant'], 'passive_question_plural'),
  'Is the app used by many people?': item("Est-ce que l'application est utilisée par beaucoup de gens ?", "Est-ce que l'application est ___ par beaucoup de gens ?", 'utilisée', ['utilise', 'utiliser', 'utilisant'], 'passive_question_feminine'),
  'Are the bags checked here?': item('Est-ce que les sacs sont vérifiés ici ?', 'Est-ce que les sacs sont ___ ici ?', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_question_plural'),
  'Is the password changed often?': item('Est-ce que le mot de passe est souvent changé ?', 'Est-ce que le mot de passe est souvent ___ ?', 'changé', ['change', 'changer', 'changeant'], 'passive_question_masculine'),
  'Are the rules explained clearly?': item('Est-ce que les règles sont expliquées clairement ?', 'Est-ce que les règles sont ___ clairement ?', 'expliquées', ['expliquent', 'expliquer', 'expliquant'], 'passive_question_plural_feminine'),
  'The room is not cleaned every day': item("La chambre n'est pas nettoyée tous les jours", "La chambre n'est pas ___ tous les jours", 'nettoyée', ['nettoie', 'nettoyer', 'nettoyant'], 'passive_negative_feminine'),
  'The documents are not checked here': item('Les documents ne sont pas vérifiés ici', 'Les documents ne sont pas ___ ici', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_negative_plural'),
  'The tickets are not sold online': item('Les billets ne sont pas vendus en ligne', 'Les billets ne sont pas ___ en ligne', 'vendus', ['vendent', 'vendre', 'vendant'], 'passive_negative_plural'),
  'The food is not cooked here': item("La nourriture n'est pas préparée ici", "La nourriture n'est pas ___ ici", 'préparée', ['prépare', 'préparer', 'préparant'], 'passive_negative_feminine'),
  'The door is not closed at night': item("La porte n'est pas fermée la nuit", "La porte n'est pas ___ la nuit", 'fermée', ['ferme', 'fermer', 'fermant'], 'passive_negative_feminine'),
  'The messages are not sent on weekends': item('Les messages ne sont pas envoyés le week-end', 'Les messages ne sont pas ___ le week-end', 'envoyés', ['envoient', 'envoyer', 'envoyant'], 'passive_negative_plural'),
  'The app is not used often': item("L'application n'est pas souvent utilisée", "L'application n'est pas souvent ___", 'utilisée', ['utilise', 'utiliser', 'utilisant'], 'passive_negative_feminine'),
  'The bags are not checked inside': item("Les sacs ne sont pas vérifiés à l'intérieur", "Les sacs ne sont pas ___ à l'intérieur", 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'passive_negative_plural'),
  'The password is not changed often': item("Le mot de passe n'est pas souvent changé", "Le mot de passe n'est pas souvent ___", 'changé', ['change', 'changer', 'changeant'], 'passive_negative_masculine'),
  'The rules are not explained clearly': item('Les règles ne sont pas expliquées clairement', 'Les règles ne sont pas ___ clairement', 'expliquées', ['expliquent', 'expliquer', 'expliquant'], 'passive_negative_plural_feminine'),
  'I am invited often': item('Je suis souvent invité', 'Je suis souvent ___', 'invité', ['invite', 'inviter', 'invitant'], 'personal_passive_masculine_default'),
  'You are invited too': item('Tu es aussi invité', 'Tu es aussi ___', 'invité', ['invites', 'inviter', 'invitant'], 'personal_passive_masculine_default'),
  'He is called every day': item("On l'appelle tous les jours", "On l'___ tous les jours", 'appelle', ['appelé', 'appeler', 'appelant'], 'on_impersonal_passive_equivalent'),
  'She is helped here': item("On l'aide ici", "On l'___ ici", 'aide', ['aidée', 'aider', 'aidant'], 'on_impersonal_passive_equivalent'),
  'We are asked many questions': item('On nous pose beaucoup de questions', 'On nous ___ beaucoup de questions', 'pose', ['posé', 'poser', 'posant'], 'on_impersonal_passive_equivalent'),
  'They are invited every week': item('Ils sont invités chaque semaine', 'Ils sont ___ chaque semaine', 'invités', ['invitent', 'inviter', 'invitant'], 'personal_passive_plural'),
  'This document must be signed today': item("Ce document doit être signé aujourd'hui", "Ce document doit être ___ aujourd'hui", 'signé', ['signe', 'signer', 'signant'], 'modal_passive'),
  'This problem can be solved': item('Ce problème peut être résolu', 'Ce problème peut être ___', 'résolu', ['résout', 'résoudre', 'résolvant'], 'modal_passive'),
  'The room is being cleaned now': item("La chambre est en train d'être nettoyée maintenant", "La chambre est en train d'être ___ maintenant", 'nettoyée', ['nettoie', 'nettoyer', 'nettoyant'], 'progressive_passive'),
  'The documents were checked yesterday': item('Les documents ont été vérifiés hier', 'Les documents ont été ___ hier', 'vérifiés', ['vérifient', 'vérifier', 'vérifiant'], 'past_passive'),
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
    '# GUSTAV French Lesson 23 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson23_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson23_passive_voice_generation_batch_v1',
        'lesson23_passive_on_mapping_review_v1',
        'lesson23_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson23_row_ledger.json');
  const outMd = path.join(outDir, 'lesson23_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 23 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
