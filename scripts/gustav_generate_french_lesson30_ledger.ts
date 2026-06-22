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

const LESSON_ID = 30;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_relative_pronoun_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I know a man who works here': item('Je connais un homme qui travaille ici', 'Je connais un homme ___ travaille ici', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'She knows a woman who speaks English': item('Elle connaît une femme qui parle anglais', 'Elle connaît une femme ___ parle anglais', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'We met a person who can help us': item('Nous avons rencontré une personne qui peut nous aider', 'Nous avons rencontré une personne ___ peut nous aider', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'They called a doctor who lives nearby': item("Ils ont appelé un médecin qui habite près d'ici", "Ils ont appelé un médecin ___ habite près d'ici", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'I have a friend who studies every day': item("J'ai un ami qui étudie tous les jours", "J'ai un ami ___ étudie tous les jours", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'She has a sister who works at night': item('Elle a une sœur qui travaille la nuit', 'Elle a une sœur ___ travaille la nuit', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'He is the teacher who helped me': item("C'est le professeur qui m'a aidé", "C'est le professeur ___ m'a aidé", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'This is the student who answered correctly': item("C'est l'étudiant qui a répondu correctement", "C'est l'étudiant ___ a répondu correctement", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'I saw the man who lost his phone': item("J'ai vu l'homme qui a perdu son téléphone", "J'ai vu l'homme ___ a perdu son téléphone", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'We helped the woman who forgot her keys': item('Nous avons aidé la femme qui a oublié ses clés', 'Nous avons aidé la femme ___ a oublié ses clés', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'They invited people who live near us': item('Ils ont invité des gens qui habitent près de chez nous', 'Ils ont invité des gens ___ habitent près de chez nous', 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'I like people who listen carefully': item("J'aime les gens qui écoutent attentivement", "J'aime les gens ___ écoutent attentivement", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'This is the app that helps me learn': item("C'est l'application qui m'aide à apprendre", "C'est l'application ___ m'aide à apprendre", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'This is the phone that I bought yesterday': item("C'est le téléphone que j'ai acheté hier", "C'est le téléphone ___ j'ai acheté hier", 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the book that she read': item("C'est le livre qu'elle a lu", "C'est le livre ___ elle a lu", "qu'", ['qui', 'où', 'dont'], 'relative_que_elision'),
  'These are the tickets that we found': item('Ce sont les billets que nous avons trouvés', 'Ce sont les billets ___ nous avons trouvés', 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the message that he sent me': item("C'est le message qu'il m'a envoyé", "C'est le message ___ il m'a envoyé", "qu'", ['qui', 'où', 'dont'], 'relative_que_elision'),
  'This is the problem that we solved': item("C'est le problème que nous avons résolu", "C'est le problème ___ nous avons résolu", 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the question that I asked': item("C'est la question que j'ai posée", "C'est la question ___ j'ai posée", 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the answer that she gave me': item("C'est la réponse qu'elle m'a donnée", "C'est la réponse ___ elle m'a donnée", "qu'", ['qui', 'où', 'dont'], 'relative_que_elision'),
  'This is the food which we ordered': item("C'est le repas que nous avons commandé", "C'est le repas ___ nous avons commandé", 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the plan which we chose': item("C'est le plan que nous avons choisi", "C'est le plan ___ nous avons choisi", 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
  'This is the place where we met': item("C'est l'endroit où nous nous sommes rencontrés", "C'est l'endroit ___ nous nous sommes rencontrés", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the room where I work': item("C'est la pièce où je travaille", "C'est la pièce ___ je travaille", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the house where she lives': item("C'est la maison où elle habite", "C'est la maison ___ elle habite", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the shop where I bought the phone': item("C'est le magasin où j'ai acheté le téléphone", "C'est le magasin ___ j'ai acheté le téléphone", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the hotel where they stayed': item("C'est l'hôtel où ils ont séjourné", "C'est l'hôtel ___ ils ont séjourné", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the bank where he works': item("C'est la banque où il travaille", "C'est la banque ___ il travaille", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the table where I left the keys': item("C'est la table où j'ai laissé les clés", "C'est la table ___ j'ai laissé les clés", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'This is the place where we waited': item("C'est l'endroit où nous avons attendu", "C'est l'endroit ___ nous avons attendu", 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'I know a man whose phone is lost': item('Je connais un homme dont le téléphone est perdu', 'Je connais un homme ___ le téléphone est perdu', 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'She knows a woman whose bag is here': item('Elle connaît une femme dont le sac est ici', 'Elle connaît une femme ___ le sac est ici', 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'We helped a student whose answer was wrong': item('Nous avons aidé un étudiant dont la réponse était fausse', 'Nous avons aidé un étudiant ___ la réponse était fausse', 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'They called a driver whose car was outside': item('Ils ont appelé un chauffeur dont la voiture était dehors', 'Ils ont appelé un chauffeur ___ la voiture était dehors', 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'I met a person whose name I remember': item("J'ai rencontré une personne dont je me souviens du nom", "J'ai rencontré une personne ___ je me souviens du nom", 'dont', ['qui', 'que', 'où'], 'relative_dont_de'),
  'This is the teacher whose lesson helped me': item("C'est le professeur dont le cours m'a aidé", "C'est le professeur ___ le cours m'a aidé", 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'This is the friend whose message I read': item("C'est l'ami dont j'ai lu le message", "C'est l'ami ___ j'ai lu le message", 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'This is the woman whose keys we found': item("C'est la femme dont nous avons trouvé les clés", "C'est la femme ___ nous avons trouvé les clés", 'dont', ['qui', 'que', 'où'], 'relative_dont_possession'),
  'Do you know the man who called me?': item("Est-ce que tu connais l'homme qui m'a appelé ?", "Est-ce que tu connais l'homme ___ m'a appelé ?", 'qui', ['que', 'où', 'dont'], 'relative_qui_question'),
  'Do you remember the place where we met?': item("Est-ce que tu te souviens de l'endroit où nous nous sommes rencontrés ?", "Est-ce que tu te souviens de l'endroit ___ nous nous sommes rencontrés ?", 'où', ['qui', 'que', 'dont'], 'relative_ou_question'),
  'Is this the app that helps you learn?': item("Est-ce que c'est l'application qui t'aide à apprendre ?", "Est-ce que c'est l'application ___ t'aide à apprendre ?", 'qui', ['que', 'où', 'dont'], 'relative_qui_question'),
  'Is this the phone that you lost?': item("Est-ce que c'est le téléphone que tu as perdu ?", "Est-ce que c'est le téléphone ___ tu as perdu ?", 'que', ['qui', 'où', 'dont'], 'relative_que_question'),
  'Is she the woman whose bag is here?': item("Est-ce que c'est la femme dont le sac est ici ?", "Est-ce que c'est la femme ___ le sac est ici ?", 'dont', ['qui', 'que', 'où'], 'relative_dont_question'),
  'Are these the documents that you checked?': item('Est-ce que ce sont les documents que tu as vérifiés ?', 'Est-ce que ce sont les documents ___ tu as vérifiés ?', 'que', ['qui', 'où', 'dont'], 'relative_que_question'),
  'Are they the people who helped us?': item('Est-ce que ce sont les gens qui nous ont aidés ?', 'Est-ce que ce sont les gens ___ nous ont aidés ?', 'qui', ['que', 'où', 'dont'], 'relative_qui_question'),
  'I need a person who can explain this': item("J'ai besoin d'une personne qui peut expliquer ça", "J'ai besoin d'une personne ___ peut expliquer ça", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'We need an app that works well': item("Nous avons besoin d'une application qui fonctionne bien", "Nous avons besoin d'une application ___ fonctionne bien", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'Find a place where you can study': item('Trouve un endroit où tu peux étudier', 'Trouve un endroit ___ tu peux étudier', 'où', ['qui', 'que', 'dont'], 'relative_ou_place'),
  'Ask someone who knows the answer': item("Demande à quelqu'un qui connaît la réponse", "Demande à quelqu'un ___ connaît la réponse", 'qui', ['que', 'où', 'dont'], 'relative_qui_subject'),
  'Use words that you understand': item('Utilise des mots que tu comprends', 'Utilise des mots ___ tu comprends', 'que', ['qui', 'où', 'dont'], 'relative_que_object'),
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
    '# GUSTAV French Lesson 30 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson30_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson30_relative_pronoun_generation_batch_v1',
        'lesson30_qui_que_ou_dont_mapping_review_v1',
        'lesson30_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson30_row_ledger.json');
  const outMd = path.join(outDir, 'lesson30_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 30 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
