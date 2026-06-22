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

const LESSON_ID = 32;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_integrated_grammar_review_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I am used to working at night.': item('Je suis habitué à travailler la nuit.', 'Je suis ___ à travailler la nuit.', 'habitué', ['habitue', 'habituer', 'habituais'], 'be_used_to'),
  'She is used to waking up early.': item('Elle est habituée à se lever tôt.', 'Elle est ___ à se lever tôt.', 'habituée', ['habitue', 'habituer', 'habituait'], 'be_used_to'),
  'We are used to speaking English every day.': item('Nous sommes habitués à parler anglais tous les jours.', 'Nous sommes ___ à parler anglais tous les jours.', 'habitués', ['habituons', 'habituer', 'habituions'], 'be_used_to'),
  'They are used to waiting here.': item('Ils sont habitués à attendre ici.', 'Ils sont ___ à attendre ici.', 'habitués', ['habituent', 'habituer', 'habituaient'], 'be_used_to'),
  'He is not used to driving in the city.': item("Il n'est pas habitué à conduire en ville.", "Il n'est pas ___ à conduire en ville.", 'habitué', ['habitue', 'habituer', 'habituait'], 'be_used_to_negative'),
  'I am not used to working so late.': item('Je ne suis pas habitué à travailler si tard.', 'Je ne suis pas ___ à travailler si tard.', 'habitué', ['habitue', 'habituer', 'habituais'], 'be_used_to_negative'),
  'Are you used to studying every day?': item('Est-ce que tu es habitué à étudier tous les jours ?', 'Est-ce que tu es ___ à étudier tous les jours ?', 'habitué', ['habitues', 'habituer', 'habituais'], 'be_used_to_question'),
  'Are they used to living here?': item('Est-ce qu’ils sont habitués à vivre ici ?', 'Est-ce qu’ils sont ___ à vivre ici ?', 'habitués', ['habitent', 'habiter', 'habitaient'], 'be_used_to_question'),
  'This is the person who helped me.': item("C'est la personne qui m'a aidé.", "C'est la personne ___ m'a aidé.", 'qui', ['que', 'où', 'dont'], 'relative_qui'),
  'She is the woman whose bag we found.': item("C'est la femme dont nous avons trouvé le sac.", "C'est la femme ___ nous avons trouvé le sac.", 'dont', ['qui', 'que', 'où'], 'relative_dont'),
  'This is the app that helps me learn.': item("C'est l'application qui m'aide à apprendre.", "C'est l'application ___ m'aide à apprendre.", 'qui', ['que', 'où', 'dont'], 'relative_qui'),
  'This is the place where we met.': item("C'est l'endroit où nous nous sommes rencontrés.", "C'est l'endroit ___ nous nous sommes rencontrés.", 'où', ['qui', 'que', 'dont'], 'relative_ou'),
  'I called the man who sent the message.': item("J'ai appelé l'homme qui a envoyé le message.", "J'ai appelé l'homme ___ a envoyé le message.", 'qui', ['que', 'où', 'dont'], 'relative_qui'),
  'We found the keys that she lost.': item("Nous avons trouvé les clés qu'elle a perdues.", "Nous avons trouvé les clés ___ elle a perdues.", "qu'", ['qui', 'où', 'dont'], 'relative_que'),
  'They opened the room where we waited.': item('Ils ont ouvert la pièce où nous avons attendu.', 'Ils ont ouvert la pièce ___ nous avons attendu.', 'où', ['qui', 'que', 'dont'], 'relative_ou'),
  'I remember the teacher whose lesson helped me.': item("Je me souviens du professeur dont le cours m'a aidé.", "Je me souviens du professeur ___ le cours m'a aidé.", 'dont', ['qui', 'que', 'où'], 'relative_dont'),
  'He said that he was tired.': item("Il a dit qu'il était fatigué.", "Il a dit qu'il ___ fatigué.", 'était', ['est', 'être', 'sera'], 'reported_imparfait'),
  'She said that she would call later.': item("Elle a dit qu'elle appellerait plus tard.", "Elle a dit qu'elle ___ plus tard.", 'appellerait', ['appelle', 'appeler', 'appellera'], 'reported_conditionnel'),
  'They said that they had sent the documents.': item("Ils ont dit qu'ils avaient envoyé les documents.", "Ils ont dit qu'ils ___ envoyé les documents.", 'avaient', ['ont', 'avoir', 'auront'], 'reported_plus_que_parfait'),
  'We were told that the room was cleaned.': item('On nous a dit que la chambre avait été nettoyée.', 'On nous a ___ que la chambre avait été nettoyée.', 'dit', ['dire', 'dites', 'disait'], 'reported_passive_told'),
  'I was told that the app was fixed.': item("On m'a dit que l'application avait été réparée.", "On m'a ___ que l'application avait été réparée.", 'dit', ['dire', 'dites', 'disait'], 'reported_passive_told'),
  'She was told that the tickets were sold.': item('On lui a dit que les billets avaient été vendus.', 'On lui a ___ que les billets avaient été vendus.', 'dit', ['dire', 'dites', 'disait'], 'reported_passive_told'),
  'They were told that the problem was solved.': item('On leur a dit que le problème avait été résolu.', 'On leur a ___ que le problème avait été résolu.', 'dit', ['dire', 'dites', 'disait'], 'reported_passive_told'),
  'He explained that everything was okay.': item('Il a expliqué que tout allait bien.', 'Il a expliqué que tout ___ bien.', 'allait', ['va', 'aller', 'ira'], 'reported_imparfait'),
  'If you call me, I will answer.': item("Si tu m'appelles, je répondrai.", "Si tu m'appelles, je ___.", 'répondrai', ['réponds', 'répondre', 'répondais'], 'si_present_future'),
  'If she has time, she will help us.': item('Si elle a le temps, elle nous aidera.', 'Si elle a le temps, elle nous ___.', 'aidera', ['aide', 'aider', 'aidait'], 'si_present_future'),
  'If we start now, we will finish today.': item("Si nous commençons maintenant, nous finirons aujourd'hui.", "Si nous commençons maintenant, nous ___ aujourd'hui.", 'finirons', ['finissons', 'finir', 'finissions'], 'si_present_future'),
  'If they do not come, we will start without them.': item("S'ils ne viennent pas, nous commencerons sans eux.", "S'ils ne viennent pas, nous ___ sans eux.", 'commencerons', ['commençons', 'commencer', 'commencions'], 'si_negative_future'),
  'If I had known, I would have helped.': item("Si je l'avais su, j'aurais aidé.", "Si je l'avais su, j'___ aidé.", 'aurais', ['ai', 'avoir', 'avais'], 'third_conditional'),
  'If she had called me, I would have answered.': item("Si elle m'avait appelé, j'aurais répondu.", "Si elle m'avait appelé, j'___ répondu.", 'aurais', ['ai', 'avoir', 'avais'], 'third_conditional'),
  'If we had started earlier, we would have finished.': item('Si nous avions commencé plus tôt, nous aurions fini.', 'Si nous avions commencé plus tôt, nous ___ fini.', 'aurions', ['avons', 'avoir', 'avions'], 'third_conditional'),
  'If they had checked the room, they would have found the keys.': item("S'ils avaient vérifié la chambre, ils auraient trouvé les clés.", "S'ils avaient vérifié la chambre, ils ___ trouvé les clés.", 'auraient', ['ont', 'avoir', 'avaient'], 'third_conditional'),
  'I saw him leave.': item("Je l'ai vu partir.", "Je l'ai ___ partir.", 'vu', ['voir', 'regardé', 'voyais'], 'perception_voir_infinitive'),
  'She heard me call her.': item("Elle m'a entendu l'appeler.", "Elle m'a ___ l'appeler.", 'entendu', ['entendre', 'écouté', 'entendait'], 'perception_entendre_infinitive'),
  'We felt the phone vibrate.': item('Nous avons senti le téléphone vibrer.', 'Nous avons ___ le téléphone vibrer.', 'senti', ['sentir', 'touché', 'sentions'], 'perception_sentir_infinitive'),
  'They made us wait outside.': item('Ils nous ont fait attendre dehors.', 'Ils nous ont ___ attendre dehors.', 'fait', ['faire', 'font', 'faisaient'], 'faire_causative'),
  'He let me use his phone.': item("Il m'a laissé utiliser son téléphone.", "Il m'a ___ utiliser son téléphone.", 'laissé', ['laisser', 'laisse', 'laissait'], 'laisser_infinitive'),
  'This lesson helped me understand English better.': item("Cette leçon m'a aidé à mieux comprendre l'anglais.", "Cette leçon m'a ___ à mieux comprendre l'anglais.", 'aidé', ['aider', 'aide', 'aidait'], 'aider_a_infinitive'),
  'I have been waiting for an hour.': item("J'attends depuis une heure.", "J'attends ___ une heure.", 'depuis', ['pendant', 'pour', 'en'], 'depuis_duration'),
  'She has been studying all morning.': item('Elle étudie depuis ce matin.', 'Elle étudie ___ ce matin.', 'depuis', ['pendant', 'pour', 'en'], 'depuis_duration'),
  'We have been working since eight.': item('Nous travaillons depuis huit heures.', 'Nous travaillons ___ huit heures.', 'depuis', ['pendant', 'pour', 'en'], 'depuis_since'),
  'They have been looking for the keys.': item('Ils cherchent les clés.', 'Ils ___ les clés.', 'cherchent', ['chercher', 'cherchaient', 'chercheront'], 'present_continuing_action'),
  'The room is being cleaned now.': item('On nettoie la chambre maintenant.', 'On ___ la chambre maintenant.', 'nettoie', ['nettoyer', 'nettoyait', 'nettoiera'], 'natural_passive_on'),
  'The documents are being checked now.': item('On vérifie les documents maintenant.', 'On ___ les documents maintenant.', 'vérifie', ['vérifier', 'vérifiait', 'vérifiera'], 'natural_passive_on'),
  'I would rather you stayed here.': item('Je préférerais que tu restes ici.', 'Je préférerais que tu ___ ici.', 'restes', ['restais', 'rester', 'resteras'], 'preferer_que_subjunctive'),
  'I would rather you did not call him.': item("Je préférerais que tu ne l'appelles pas.", "Je préférerais que tu ne l'___ pas.", 'appelles', ['appelais', 'appeler', 'appelleras'], 'preferer_que_subjunctive'),
  'She would rather we started later.': item('Elle préférerait que nous commencions plus tard.', 'Elle préférerait que nous ___ plus tard.', 'commencions', ['commençons', 'commencer', 'commencerons'], 'preferer_que_subjunctive'),
  'I need the documents checked today.': item("J'ai besoin que les documents soient vérifiés aujourd'hui.", "J'ai besoin que les documents ___ vérifiés aujourd'hui.", 'soient', ['sont', 'être', 'seront'], 'need_que_subjunctive_passive'),
  'We need the room cleaned before evening.': item('Nous avons besoin que la chambre soit nettoyée avant ce soir.', 'Nous avons besoin que la chambre ___ nettoyée avant ce soir.', 'soit', ['est', 'être', 'sera'], 'need_que_subjunctive_passive'),
  'They want the problem solved quickly.': item('Ils veulent que le problème soit résolu rapidement.', 'Ils veulent que le problème ___ résolu rapidement.', 'soit', ['est', 'être', 'sera'], 'want_que_subjunctive_passive'),
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
    '# GUSTAV French Lesson 32 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson32_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson32_integrated_review_generation_batch_v1',
        'lesson32_mixed_grammar_mapping_review_v1',
        'lesson32_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson32_row_ledger.json');
  const outMd = path.join(outDir, 'lesson32_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 32 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
