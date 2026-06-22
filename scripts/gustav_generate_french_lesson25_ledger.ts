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

const LESSON_ID = 25;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_imparfait_past_continuous_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  "I was working at eight o'clock": item('Je travaillais à huit heures', 'Je ___ à huit heures', 'travaillais', ['travaille', 'travailler', 'travaillé'], 'imparfait_statement'),
  'You were reading at that time': item('Tu lisais à ce moment-là', 'Tu ___ à ce moment-là', 'lisais', ['lis', 'lire', 'lu'], 'imparfait_statement'),
  'He was cooking dinner at six': item('Il préparait le dîner à six heures', 'Il ___ le dîner à six heures', 'préparait', ['prépare', 'préparer', 'préparé'], 'imparfait_statement'),
  'She was writing a message at noon': item('Elle écrivait un message à midi', 'Elle ___ un message à midi', 'écrivait', ['écrit', 'écrire', 'écrivaient'], 'imparfait_statement'),
  'We were waiting near the door': item('Nous attendions près de la porte', 'Nous ___ près de la porte', 'attendions', ['attendons', 'attendre', 'attendu'], 'imparfait_statement'),
  'They were watching TV last night': item('Ils regardaient la télé hier soir', 'Ils ___ la télé hier soir', 'regardaient', ['regardent', 'regarder', 'regardé'], 'imparfait_statement'),
  'I was looking for my keys': item('Je cherchais mes clés', 'Je ___ mes clés', 'cherchais', ['cherche', 'chercher', 'cherché'], 'imparfait_statement'),
  'You were talking to her': item('Tu lui parlais', 'Tu lui ___', 'parlais', ['parles', 'parler', 'parlé'], 'imparfait_statement'),
  'He was driving home': item('Il rentrait chez lui en voiture', 'Il ___ chez lui en voiture', 'rentrait', ['rentre', 'rentrer', 'rentré'], 'imparfait_statement'),
  'She was cleaning her room': item('Elle nettoyait sa chambre', 'Elle ___ sa chambre', 'nettoyait', ['nettoie', 'nettoyer', 'nettoyé'], 'imparfait_statement'),
  'We were checking documents': item('Nous vérifiions les documents', 'Nous ___ les documents', 'vérifiions', ['vérifions', 'vérifier', 'vérifié'], 'imparfait_statement'),
  'They were walking outside': item('Ils marchaient dehors', 'Ils ___ dehors', 'marchaient', ['marchent', 'marcher', 'marché'], 'imparfait_statement'),
  "Were you working at eight o'clock?": item('Est-ce que tu travaillais à huit heures ?', 'Est-ce que tu ___ à huit heures ?', 'travaillais', ['travailles', 'travailler', 'travaillé'], 'imparfait_question'),
  'Was he cooking dinner at six?': item("Est-ce qu'il préparait le dîner à six heures ?", "Est-ce qu'il ___ le dîner à six heures ?", 'préparait', ['prépare', 'préparer', 'préparé'], 'imparfait_question'),
  'Was she writing a message at noon?': item("Est-ce qu'elle écrivait un message à midi ?", "Est-ce qu'elle ___ un message à midi ?", 'écrivait', ['écrit', 'écrire', 'écrivaient'], 'imparfait_question'),
  'Were they watching TV last night?': item("Est-ce qu'ils regardaient la télé hier soir ?", "Est-ce qu'ils ___ la télé hier soir ?", 'regardaient', ['regardent', 'regarder', 'regardé'], 'imparfait_question'),
  'Were you looking for your keys?': item('Est-ce que tu cherchais tes clés ?', 'Est-ce que tu ___ tes clés ?', 'cherchais', ['cherches', 'chercher', 'cherché'], 'imparfait_question'),
  'What were you doing at that time?': item("Qu'est-ce que tu faisais à ce moment-là ?", "Qu'est-ce que tu ___ à ce moment-là ?", 'faisais', ['fais', 'faire', 'fait'], 'imparfait_wh_question'),
  'Where were they waiting?': item("Où est-ce qu'ils attendaient ?", "Où est-ce qu'ils ___ ?", 'attendaient', ['attendent', 'attendre', 'attendu'], 'imparfait_wh_question'),
  'Who was calling you?': item("Qui t'appelait ?", "Qui t'___ ?", 'appelait', ['appelle', 'appeler', 'appelé'], 'imparfait_wh_question'),
  'Why was she crying?': item("Pourquoi est-ce qu'elle pleurait ?", "Pourquoi est-ce qu'elle ___ ?", 'pleurait', ['pleure', 'pleurer', 'pleuré'], 'imparfait_wh_question'),
  'What was he reading?': item("Qu'est-ce qu'il lisait ?", "Qu'est-ce qu'il ___ ?", 'lisait', ['lit', 'lire', 'lu'], 'imparfait_wh_question'),
  'I was not sleeping at midnight': item('Je ne dormais pas à minuit', 'Je ne ___ pas à minuit', 'dormais', ['dors', 'dormir', 'dormi'], 'imparfait_negative'),
  'You were not listening to me': item("Tu ne m'écoutais pas", "Tu ne m'___ pas", 'écoutais', ['écoutes', 'écouter', 'écouté'], 'imparfait_negative'),
  'He was not watching TV then': item('Il ne regardait pas la télé à ce moment-là', 'Il ne ___ pas la télé à ce moment-là', 'regardait', ['regarde', 'regarder', 'regardé'], 'imparfait_negative'),
  'She was not using my phone': item("Elle n'utilisait pas mon téléphone", "Elle n'___ pas mon téléphone", 'utilisait', ['utilise', 'utiliser', 'utilisé'], 'imparfait_negative'),
  'We were not waiting outside': item("Nous n'attendions pas dehors", "Nous n'___ pas dehors", 'attendions', ['attendons', 'attendre', 'attendu'], 'imparfait_negative'),
  'They were not working yesterday evening': item('Ils ne travaillaient pas hier soir', 'Ils ne ___ pas hier soir', 'travaillaient', ['travaillent', 'travailler', 'travaillé'], 'imparfait_negative'),
  'I was not driving fast': item('Je ne conduisais pas vite', 'Je ne ___ pas vite', 'conduisais', ['conduis', 'conduire', 'conduit'], 'imparfait_negative'),
  'He was not checking messages': item('Il ne vérifiait pas les messages', 'Il ne ___ pas les messages', 'vérifiait', ['vérifie', 'vérifier', 'vérifié'], 'imparfait_negative'),
  'She was not talking to him': item('Elle ne lui parlait pas', 'Elle ne lui ___ pas', 'parlait', ['parle', 'parler', 'parlé'], 'imparfait_negative'),
  'We were not discussing the problem': item('Nous ne discutions pas du problème', 'Nous ne ___ pas du problème', 'discutions', ['discutons', 'discuter', 'discuté'], 'imparfait_negative'),
  'I was cooking while she was making coffee': item("Je cuisinais pendant qu'elle faisait du café", "Je ___ pendant qu'elle faisait du café", 'cuisinais', ['cuisine', 'cuisiner', 'cuisiné'], 'pendant_que_double_imparfait'),
  'He was cleaning while we were talking': item('Il nettoyait pendant que nous parlions', 'Il ___ pendant que nous parlions', 'nettoyait', ['nettoie', 'nettoyer', 'nettoyé'], 'pendant_que_double_imparfait'),
  'She was writing while I was reading': item("Elle écrivait pendant que je lisais", "Elle ___ pendant que je lisais", 'écrivait', ['écrit', 'écrire', 'écrivaient'], 'pendant_que_double_imparfait'),
  'We were walking while it was raining': item("Nous marchions pendant qu'il pleuvait", "Nous ___ pendant qu'il pleuvait", 'marchions', ['marchons', 'marcher', 'marché'], 'pendant_que_double_imparfait'),
  'They were waiting while we were buying tickets': item('Ils attendaient pendant que nous achetions les billets', 'Ils ___ pendant que nous achetions les billets', 'attendaient', ['attendent', 'attendre', 'attendu'], 'pendant_que_double_imparfait'),
  'I was listening while he was speaking': item("J'écoutais pendant qu'il parlait", "J'___ pendant qu'il parlait", 'écoutais', ['écoute', 'écouter', 'écouté'], 'pendant_que_double_imparfait'),
  'She was studying while they were watching TV': item('Elle étudiait pendant qu’ils regardaient la télé', 'Elle ___ pendant qu’ils regardaient la télé', 'étudiait', ['étudie', 'étudier', 'étudié'], 'pendant_que_double_imparfait'),
  'We were working while you were sleeping': item('Nous travaillions pendant que tu dormais', 'Nous ___ pendant que tu dormais', 'travaillions', ['travaillons', 'travailler', 'travaillé'], 'pendant_que_double_imparfait'),
  'I was working when you called': item('Je travaillais quand tu as appelé', 'Je ___ quand tu as appelé', 'travaillais', ['travaille', 'travailler', 'travaillé'], 'imparfait_when_passe_compose'),
  'She was cooking when he arrived': item('Elle cuisinait quand il est arrivé', 'Elle ___ quand il est arrivé', 'cuisinait', ['cuisine', 'cuisiner', 'cuisiné'], 'imparfait_when_passe_compose'),
  'We were eating when the phone rang': item('Nous mangions quand le téléphone a sonné', 'Nous ___ quand le téléphone a sonné', 'mangions', ['mangeons', 'manger', 'mangé'], 'imparfait_when_passe_compose'),
  'They were driving when it started raining': item('Ils conduisaient quand il a commencé à pleuvoir', 'Ils ___ quand il a commencé à pleuvoir', 'conduisaient', ['conduisent', 'conduire', 'conduit'], 'imparfait_when_passe_compose'),
  'He was sleeping when I opened the door': item("Il dormait quand j'ai ouvert la porte", "Il ___ quand j'ai ouvert la porte", 'dormait', ['dort', 'dormir', 'dormi'], 'imparfait_when_passe_compose'),
  'I was looking for my bag when you found it': item("Je cherchais mon sac quand tu l'as trouvé", "Je ___ mon sac quand tu l'as trouvé", 'cherchais', ['cherche', 'chercher', 'cherché'], 'imparfait_when_passe_compose'),
  'She was talking to him when I came in': item("Elle lui parlait quand je suis entré", "Elle lui ___ quand je suis entré", 'parlait', ['parle', 'parler', 'parlé'], 'imparfait_when_passe_compose'),
  'We were checking the tickets when the bus arrived': item('Nous vérifiions les billets quand le bus est arrivé', 'Nous ___ les billets quand le bus est arrivé', 'vérifiions', ['vérifions', 'vérifier', 'vérifié'], 'imparfait_when_passe_compose'),
  'They were watching a movie when I called': item("Ils regardaient un film quand j'ai appelé", "Ils ___ un film quand j'ai appelé", 'regardaient', ['regardent', 'regarder', 'regardé'], 'imparfait_when_passe_compose'),
  'I was writing a message when you knocked on the door': item('J’écrivais un message quand tu as frappé à la porte', 'J’___ un message quand tu as frappé à la porte', 'écrivais', ['écris', 'écrire', 'écrit'], 'imparfait_when_passe_compose'),
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
    '# GUSTAV French Lesson 25 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson25_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson25_imparfait_generation_batch_v1',
        'lesson25_past_continuous_mapping_review_v1',
        'lesson25_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson25_row_ledger.json');
  const outMd = path.join(outDir, 'lesson25_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 25 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
