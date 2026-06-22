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

const LESSON_ID = 10;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_modal_verb_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I can help': item('Je peux aider', 'Je ___ aider', 'peux', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir'),
  'You can start now': item('Tu peux commencer maintenant', 'Tu ___ commencer maintenant', 'peux', ['peut', 'pouvons', 'peuvent'], 'modal_pouvoir'),
  'He can call later': item('Il peut appeler plus tard', 'Il ___ appeler plus tard', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir'),
  'She can speak English': item('Elle peut parler anglais', 'Elle ___ parler anglais', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir'),
  'We can wait here': item('Nous pouvons attendre ici', 'Nous ___ attendre ici', 'pouvons', ['peux', 'peut', 'pouvez'], 'modal_pouvoir'),
  'They can work today': item("Ils peuvent travailler aujourd'hui", "Ils ___ travailler aujourd'hui", 'peuvent', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir'),
  'It can work well': item('Ça peut bien marcher', 'Ça ___ bien marcher', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir'),
  'Can you help me?': item("Est-ce que tu peux m'aider ?", "Est-ce que tu ___ m'aider ?", 'peux', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir_question'),
  'Can he drive cars?': item('Est-ce qu’il sait conduire des voitures ?', 'Est-ce qu’il ___ conduire des voitures ?', 'sait', ['peux', 'savons', 'savez'], 'modal_savoir_ability'),
  'Can she call us?': item('Est-ce qu’elle peut nous appeler ?', 'Est-ce qu’elle ___ nous appeler ?', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir_question'),
  'Can we start at noon?': item('Est-ce que nous pouvons commencer à midi ?', 'Est-ce que nous ___ commencer à midi ?', 'pouvons', ['peux', 'peut', 'pouvez'], 'modal_pouvoir_question'),
  'Can they hear us?': item('Est-ce qu’ils peuvent nous entendre ?', 'Est-ce qu’ils ___ nous entendre ?', 'peuvent', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir_question'),
  'I cannot wait': item('Je ne peux pas attendre', 'Je ne ___ pas attendre', 'peux', ['peut', 'pouvons', 'peuvent'], 'modal_pouvoir_negative'),
  'You cannot go there': item('Tu ne peux pas y aller', 'Tu ne ___ pas y aller', 'peux', ['peut', 'pouvons', 'peuvent'], 'modal_pouvoir_negative'),
  'He cannot help us': item('Il ne peut pas nous aider', 'Il ne ___ pas nous aider', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir_negative'),
  'She cannot come today': item("Elle ne peut pas venir aujourd'hui", "Elle ne ___ pas venir aujourd'hui", 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir_negative'),
  'We cannot find documents': item('Nous ne pouvons pas trouver les documents', 'Nous ne ___ pas trouver les documents', 'pouvons', ['peux', 'peut', 'pouvez'], 'modal_pouvoir_negative'),
  'They cannot use cash': item("Ils ne peuvent pas utiliser d'espèces", "Ils ne ___ pas utiliser d'espèces", 'peuvent', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir_negative'),
  'It cannot work now': item('Ça ne peut pas marcher maintenant', 'Ça ne ___ pas marcher maintenant', 'peut', ['peux', 'pouvons', 'peuvent'], 'modal_pouvoir_negative'),
  'Can I ask a question?': item('Est-ce que je peux poser une question ?', 'Est-ce que je ___ poser une question ?', 'peux', ['peut', 'pouvons', 'pouvez'], 'modal_pouvoir_question'),
  'You should rest': item('Tu devrais te reposer', 'Tu ___ te reposer', 'devrais', ['dois', 'devons', 'doivent'], 'modal_devoir_conditional'),
  'He should call her': item("Il devrait l'appeler", "Il ___ l'appeler", 'devrait', ['doit', 'devons', 'devriez'], 'modal_devoir_conditional'),
  'She should drink water': item("Elle devrait boire de l'eau", "Elle ___ boire de l'eau", 'devrait', ['doit', 'devons', 'devraient'], 'modal_devoir_conditional'),
  'We should start now': item('Nous devrions commencer maintenant', 'Nous ___ commencer maintenant', 'devrions', ['dois', 'doit', 'devriez'], 'modal_devoir_conditional'),
  'They should wait outside': item('Ils devraient attendre dehors', 'Ils ___ attendre dehors', 'devraient', ['doit', 'devrions', 'devriez'], 'modal_devoir_conditional'),
  'Should I call him?': item("Est-ce que je devrais l'appeler ?", "Est-ce que je ___ l'appeler ?", 'devrais', ['dois', 'devons', 'devraient'], 'modal_devoir_conditional_question'),
  'Should we order food?': item('Est-ce que nous devrions commander à manger ?', 'Est-ce que nous ___ commander à manger ?', 'devrions', ['dois', 'doit', 'devriez'], 'modal_devoir_conditional_question'),
  'Should they help people?': item('Est-ce qu’ils devraient aider les gens ?', 'Est-ce qu’ils ___ aider les gens ?', 'devraient', ['doit', 'devrions', 'devriez'], 'modal_devoir_conditional_question'),
  'You should not wait': item('Tu ne devrais pas attendre', 'Tu ne ___ pas attendre', 'devrais', ['dois', 'devons', 'devraient'], 'modal_devoir_conditional_negative'),
  'He should not drive fast': item('Il ne devrait pas conduire vite', 'Il ne ___ pas conduire vite', 'devrait', ['doit', 'devrions', 'devriez'], 'modal_devoir_conditional_negative'),
  'She should not work at night': item('Elle ne devrait pas travailler la nuit', 'Elle ne ___ pas travailler la nuit', 'devrait', ['doit', 'devrions', 'devraient'], 'modal_devoir_conditional_negative'),
  'We should not waste time': item('Nous ne devrions pas perdre de temps', 'Nous ne ___ pas perdre de temps', 'devrions', ['dois', 'doit', 'devriez'], 'modal_devoir_conditional_negative'),
  'They should not use this app': item('Ils ne devraient pas utiliser cette application', 'Ils ne ___ pas utiliser cette application', 'devraient', ['doit', 'devrions', 'devriez'], 'modal_devoir_conditional_negative'),
  'I must go now': item('Je dois partir maintenant', 'Je ___ partir maintenant', 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_obligation'),
  'You must listen': item('Tu dois écouter', 'Tu ___ écouter', 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_obligation'),
  'He must finish work': item('Il doit finir le travail', 'Il ___ finir le travail', 'doit', ['dois', 'devons', 'doivent'], 'modal_devoir_obligation'),
  'She must check messages': item('Elle doit vérifier les messages', 'Elle ___ vérifier les messages', 'doit', ['dois', 'devons', 'doivent'], 'modal_devoir_obligation'),
  'We must pay today': item("Nous devons payer aujourd'hui", "Nous ___ payer aujourd'hui", 'devons', ['dois', 'doit', 'devez'], 'modal_devoir_obligation'),
  'They must wait here': item('Ils doivent attendre ici', 'Ils ___ attendre ici', 'doivent', ['doit', 'devons', 'devez'], 'modal_devoir_obligation'),
  'Must I sign it?': item('Est-ce que je dois le signer ?', 'Est-ce que je ___ le signer ?', 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_question'),
  'Must we start now?': item('Est-ce que nous devons commencer maintenant ?', 'Est-ce que nous ___ commencer maintenant ?', 'devons', ['dois', 'doit', 'devez'], 'modal_devoir_question'),
  'Must they show documents?': item('Est-ce qu’ils doivent montrer les documents ?', 'Est-ce qu’ils ___ montrer les documents ?', 'doivent', ['doit', 'devons', 'devez'], 'modal_devoir_question'),
  'You must not smoke here': item('Tu ne dois pas fumer ici', 'Tu ne ___ pas fumer ici', 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_prohibition'),
  'He must not share passwords': item('Il ne doit pas partager les mots de passe', 'Il ne ___ pas partager les mots de passe', 'doit', ['dois', 'devons', 'doivent'], 'modal_devoir_prohibition'),
  'They must not enter this room': item('Ils ne doivent pas entrer dans cette pièce', 'Ils ne ___ pas entrer dans cette pièce', 'doivent', ['doit', 'devons', 'devez'], 'modal_devoir_prohibition'),
  'I have to work today': item("Je dois travailler aujourd'hui", "Je ___ travailler aujourd'hui", 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_need'),
  'Do you have to go now?': item('Est-ce que tu dois partir maintenant ?', 'Est-ce que tu ___ partir maintenant ?', 'dois', ['doit', 'devons', 'doivent'], 'modal_devoir_need_question'),
  'She does not have to wait': item('Elle n’a pas besoin d’attendre', 'Elle n’a pas besoin d’___', 'attendre', ['attend', 'attends', 'attendez'], 'avoir_besoin_negative'),
  'We have to pay rent': item('Nous devons payer le loyer', 'Nous ___ payer le loyer', 'devons', ['dois', 'doit', 'devez'], 'modal_devoir_need'),
  'You do not have to answer now': item("Tu n'as pas besoin de répondre maintenant", "Tu n'as pas besoin de ___ maintenant", 'répondre', ['réponds', 'répond', 'répondez'], 'avoir_besoin_negative'),
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
    '# GUSTAV French Lesson 10 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson10_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson10_modal_generation_batch_v1',
        'lesson10_pouvoir_devoir_avoir_besoin_mapping_review_v1',
        'lesson10_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson10_row_ledger.json');
  const outMd = path.join(outDir, 'lesson10_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 10 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
