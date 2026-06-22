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

const LESSON_ID = 24;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_recent_past_deja_jamais_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I have just finished work': item('Je viens de finir le travail', 'Je viens de ___ le travail', 'finir', ['fini', 'finis', 'finissant'], 'venir_de_recent_past'),
  'She has just called me': item("Elle vient de m'appeler", "Elle vient de m'___", 'appeler', ['appelé', 'appelle', 'appelant'], 'venir_de_recent_past'),
  'We have just found the keys': item('Nous venons de trouver les clés', 'Nous venons de ___ les clés', 'trouver', ['trouvé', 'trouvons', 'trouvant'], 'venir_de_recent_past'),
  'They have just sent documents': item("Ils viennent d'envoyer les documents", "Ils viennent d'___ les documents", 'envoyer', ['envoyé', 'envoient', 'envoyant'], 'venir_de_recent_past'),
  'He has just opened the door': item("Il vient d'ouvrir la porte", "Il vient d'___ la porte", 'ouvrir', ['ouvert', 'ouvre', 'ouvrant'], 'venir_de_recent_past'),
  'I have just checked messages': item('Je viens de vérifier les messages', 'Je viens de ___ les messages', 'vérifier', ['vérifié', 'vérifie', 'vérifiant'], 'venir_de_recent_past'),
  'You have just helped me': item("Tu viens de m'aider", "Tu viens de m'___", 'aider', ['aidé', 'aides', 'aidant'], 'venir_de_recent_past'),
  'She has just cooked dinner': item('Elle vient de préparer le dîner', 'Elle vient de ___ le dîner', 'préparer', ['préparé', 'prépare', 'préparant'], 'venir_de_recent_past'),
  'We have just cleaned the room': item('Nous venons de nettoyer la chambre', 'Nous venons de ___ la chambre', 'nettoyer', ['nettoyé', 'nettoyons', 'nettoyant'], 'venir_de_recent_past'),
  'They have just arrived': item("Ils viennent d'arriver", "Ils viennent d'___", 'arriver', ['arrivés', 'arrivent', 'arrivant'], 'venir_de_recent_past'),
  'I have already paid': item("J'ai déjà payé", "J'ai déjà ___", 'payé', ['payer', 'paie', 'payant'], 'deja_passe_compose'),
  'You have already checked it': item("Tu l'as déjà vérifié", "Tu l'as déjà ___", 'vérifié', ['vérifier', 'vérifies', 'vérifiant'], 'deja_passe_compose'),
  'He has already sent the email': item("Il a déjà envoyé l'e-mail", "Il a déjà ___ l'e-mail", 'envoyé', ['envoyer', 'envoie', 'envoyant'], 'deja_passe_compose'),
  'She has already bought tickets': item('Elle a déjà acheté les billets', 'Elle a déjà ___ les billets', 'acheté', ['acheter', 'achète', 'achetant'], 'deja_passe_compose'),
  'We have already finished': item('Nous avons déjà fini', 'Nous avons déjà ___', 'fini', ['finir', 'finissons', 'finissant'], 'deja_passe_compose'),
  'They have already seen it': item("Ils l'ont déjà vu", "Ils l'ont déjà ___", 'vu', ['voir', 'voient', 'voyant'], 'deja_passe_compose'),
  'I have already chosen an option': item("J'ai déjà choisi une option", "J'ai déjà ___ une option", 'choisi', ['choisir', 'choisis', 'choisissant'], 'deja_passe_compose'),
  'She has already read the message': item('Elle a déjà lu le message', 'Elle a déjà ___ le message', 'lu', ['lire', 'lit', 'lisant'], 'deja_passe_compose'),
  'We have already discussed the problem': item('Nous avons déjà discuté du problème', 'Nous avons déjà ___ du problème', 'discuté', ['discuter', 'discutons', 'discutant'], 'deja_passe_compose'),
  'He has already changed the password': item('Il a déjà changé le mot de passe', 'Il a déjà ___ le mot de passe', 'changé', ['changer', 'change', 'changeant'], 'deja_passe_compose'),
  'I have not finished yet': item("Je n'ai pas encore fini", "Je n'ai pas encore ___", 'fini', ['finir', 'finis', 'finissant'], 'pas_encore_passe_compose'),
  'She has not called yet': item("Elle n'a pas encore appelé", "Elle n'a pas encore ___", 'appelé', ['appeler', 'appelle', 'appelant'], 'pas_encore_passe_compose'),
  'We have not found the keys yet': item("Nous n'avons pas encore trouvé les clés", "Nous n'avons pas encore ___ les clés", 'trouvé', ['trouver', 'trouvons', 'trouvant'], 'pas_encore_passe_compose'),
  'They have not sent documents yet': item("Ils n'ont pas encore envoyé les documents", "Ils n'ont pas encore ___ les documents", 'envoyé', ['envoyer', 'envoient', 'envoyant'], 'pas_encore_passe_compose'),
  'He has not opened the door yet': item("Il n'a pas encore ouvert la porte", "Il n'a pas encore ___ la porte", 'ouvert', ['ouvrir', 'ouvre', 'ouvrant'], 'pas_encore_passe_compose'),
  'I have not checked messages yet': item("Je n'ai pas encore vérifié les messages", "Je n'ai pas encore ___ les messages", 'vérifié', ['vérifier', 'vérifie', 'vérifiant'], 'pas_encore_passe_compose'),
  'You have not answered yet': item("Tu n'as pas encore répondu", "Tu n'as pas encore ___", 'répondu', ['répondre', 'réponds', 'répondant'], 'pas_encore_passe_compose'),
  'She has not cooked dinner yet': item("Elle n'a pas encore préparé le dîner", "Elle n'a pas encore ___ le dîner", 'préparé', ['préparer', 'prépare', 'préparant'], 'pas_encore_passe_compose'),
  'We have not cleaned the room yet': item("Nous n'avons pas encore nettoyé la chambre", "Nous n'avons pas encore ___ la chambre", 'nettoyé', ['nettoyer', 'nettoyons', 'nettoyant'], 'pas_encore_passe_compose'),
  'They have not arrived yet': item('Ils ne sont pas encore arrivés', 'Ils ne sont pas encore ___', 'arrivés', ['arriver', 'arrivent', 'arrivant'], 'pas_encore_etre_passe_compose'),
  'Have you finished yet?': item('Est-ce que tu as déjà fini ?', 'Est-ce que tu as déjà ___ ?', 'fini', ['finir', 'finis', 'finissant'], 'deja_question_passe_compose'),
  'Has she called yet?': item('Est-ce qu’elle a déjà appelé ?', 'Est-ce qu’elle a déjà ___ ?', 'appelé', ['appeler', 'appelle', 'appelant'], 'deja_question_passe_compose'),
  'Have they sent documents yet?': item('Est-ce qu’ils ont déjà envoyé les documents ?', 'Est-ce qu’ils ont déjà ___ les documents ?', 'envoyé', ['envoyer', 'envoient', 'envoyant'], 'deja_question_passe_compose'),
  'Has he opened the door yet?': item('Est-ce qu’il a déjà ouvert la porte ?', 'Est-ce qu’il a déjà ___ la porte ?', 'ouvert', ['ouvrir', 'ouvre', 'ouvrant'], 'deja_question_passe_compose'),
  'Have you checked messages yet?': item('Est-ce que tu as déjà vérifié les messages ?', 'Est-ce que tu as déjà ___ les messages ?', 'vérifié', ['vérifier', 'vérifies', 'vérifiant'], 'deja_question_passe_compose'),
  'Have you ever seen this?': item('Est-ce que tu as déjà vu ça ?', 'Est-ce que tu as déjà ___ ça ?', 'vu', ['voir', 'vois', 'voyant'], 'deja_experience_question'),
  'Has she ever helped you?': item("Est-ce qu’elle t'a déjà aidé ?", "Est-ce qu’elle t'a déjà ___ ?", 'aidé', ['aider', 'aide', 'aidant'], 'deja_experience_question'),
  'Have we ever met before?': item("Est-ce qu'on s'est déjà rencontrés ?", "Est-ce qu'on s'est déjà ___ ?", 'rencontrés', ['rencontrer', 'rencontre', 'rencontrant'], 'deja_reflexive_experience_question'),
  'Have they ever visited us?': item('Est-ce qu’ils nous ont déjà rendu visite ?', 'Est-ce qu’ils nous ont déjà ___ visite ?', 'rendu', ['rendre', 'rendent', 'rendant'], 'deja_expression_question'),
  'Have you ever lost your phone?': item('Est-ce que tu as déjà perdu ton téléphone ?', 'Est-ce que tu as déjà ___ ton téléphone ?', 'perdu', ['perdre', 'perds', 'perdant'], 'deja_experience_question'),
  'I have never seen this': item("Je n'ai jamais vu ça", "Je n'ai jamais ___ ça", 'vu', ['voir', 'vois', 'voyant'], 'jamais_passe_compose'),
  'She has never called me': item("Elle ne m'a jamais appelé", "Elle ne m'a jamais ___", 'appelé', ['appeler', 'appelle', 'appelant'], 'jamais_passe_compose'),
  'We have never met them': item('Nous ne les avons jamais rencontrés', 'Nous ne les avons jamais ___', 'rencontrés', ['rencontrer', 'rencontrons', 'rencontrant'], 'jamais_passe_compose'),
  'They have never helped us': item('Ils ne nous ont jamais aidés', 'Ils ne nous ont jamais ___', 'aidés', ['aider', 'aident', 'aidant'], 'jamais_passe_compose'),
  'He has never used this app': item("Il n'a jamais utilisé cette application", "Il n'a jamais ___ cette application", 'utilisé', ['utiliser', 'utilise', 'utilisant'], 'jamais_passe_compose'),
  'I have been there': item("J'y suis allé", "J'y suis ___", 'allé', ['aller', 'vais', 'allant'], 'etre_passe_compose_place'),
  'She has been here before': item('Elle est déjà venue ici avant', 'Elle est déjà ___ ici avant', 'venue', ['venir', 'vient', 'venant'], 'etre_passe_compose_place'),
  'We have done it': item("Nous l'avons fait", "Nous l'avons ___", 'fait', ['faire', 'faisons', 'faisant'], 'passe_compose_irregular'),
  'They have made mistakes': item('Ils ont fait des erreurs', 'Ils ont ___ des erreurs', 'fait', ['faire', 'font', 'faisant'], 'passe_compose_irregular'),
  'It has changed': item('Ça a changé', 'Ça a ___', 'changé', ['changer', 'change', 'changeant'], 'passe_compose_result'),
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
    '# GUSTAV French Lesson 24 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson24_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson24_recent_past_deja_jamais_generation_batch_v1',
        'lesson24_passe_compose_pattern_review_v1',
        'lesson24_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson24_row_ledger.json');
  const outMd = path.join(outDir, 'lesson24_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 24 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
