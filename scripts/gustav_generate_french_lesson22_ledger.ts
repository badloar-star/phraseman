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

const LESSON_ID = 22;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_infinitive_gerund_mapping_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'Reading helps': item('Lire aide', '___ aide', 'Lire', ['Lis', 'Lit', 'Lecture'], 'infinitive_subject'),
  'Cooking takes time': item('Cuisiner prend du temps', '___ prend du temps', 'Cuisiner', ['Cuisine', 'Cuisines', 'Cuisiné'], 'infinitive_subject'),
  'Waiting is hard': item('Attendre est difficile', '___ est difficile', 'Attendre', ['Attends', 'Attend', 'Attendu'], 'infinitive_subject'),
  'Learning English is useful': item("Apprendre l'anglais est utile", "___ l'anglais est utile", 'Apprendre', ['Apprends', 'Apprend', 'Appris'], 'infinitive_subject'),
  'Driving can be dangerous': item('Conduire peut être dangereux', '___ peut être dangereux', 'Conduire', ['Conduis', 'Conduit', 'Conduisant'], 'infinitive_subject'),
  'Walking is good for you': item('Marcher est bon pour toi', '___ est bon pour toi', 'Marcher', ['Marche', 'Marches', 'Marché'], 'infinitive_subject'),
  'Running is not easy': item("Courir n'est pas facile", "___ n'est pas facile", 'Courir', ['Cours', 'Court', 'Couru'], 'infinitive_subject'),
  'Sleeping helps your body': item('Dormir aide ton corps', '___ aide ton corps', 'Dormir', ['Dors', 'Dort', 'Dormi'], 'infinitive_subject'),
  'Listening helps me learn': item("Écouter m'aide à apprendre", "___ m'aide à apprendre", 'Écouter', ['Écoute', 'Écouté', 'Écoutant'], 'infinitive_subject'),
  'Speaking takes practice': item('Parler demande de la pratique', '___ demande de la pratique', 'Parler', ['Parle', 'Parlé', 'Parlant'], 'infinitive_subject'),
  'Working at night is hard': item('Travailler la nuit est difficile', '___ la nuit est difficile', 'Travailler', ['Travaille', 'Travaillé', 'Travaillant'], 'infinitive_subject'),
  'Studying every day helps': item('Étudier tous les jours aide', '___ tous les jours aide', 'Étudier', ['Étudie', 'Étudié', 'Étudiant'], 'infinitive_subject'),
  'Cleaning takes time': item('Faire le ménage prend du temps', '___ prend du temps', 'Faire le ménage', ['Fais le ménage', 'Fait le ménage', 'Nettoyé'], 'infinitive_subject_phrase'),
  'Helping people feels good': item('Aider les gens fait du bien', '___ les gens fait du bien', 'Aider', ['Aide', 'Aidé', 'Aidant'], 'infinitive_subject'),
  'Waiting outside is cold': item('Attendre dehors donne froid', '___ dehors donne froid', 'Attendre', ['Attends', 'Attend', 'Attendu'], 'infinitive_subject'),
  'I enjoy reading': item("J'aime lire", "J'aime ___", 'lire', ['lis', 'lit', 'lu'], 'verb_plus_infinitive'),
  'She enjoys cooking': item('Elle aime cuisiner', 'Elle aime ___', 'cuisiner', ['cuisine', 'cuisiné', 'cuisinant'], 'verb_plus_infinitive'),
  'We enjoy learning English': item("Nous aimons apprendre l'anglais", "Nous aimons ___ l'anglais", 'apprendre', ['apprenons', 'appris', 'apprenant'], 'verb_plus_infinitive'),
  'They enjoy watching TV': item('Ils aiment regarder la télé', 'Ils aiment ___ la télé', 'regarder', ['regardent', 'regardé', 'regardant'], 'verb_plus_infinitive'),
  'Do you enjoy working here?': item('Est-ce que tu aimes travailler ici ?', 'Est-ce que tu aimes ___ ici ?', 'travailler', ['travailles', 'travaillé', 'travaillant'], 'verb_plus_infinitive_question'),
  'I like driving': item("J'aime conduire", "J'aime ___", 'conduire', ['conduis', 'conduit', 'conduisant'], 'verb_plus_infinitive'),
  'He likes helping people': item('Il aime aider les gens', 'Il aime ___ les gens', 'aider', ['aide', 'aidé', 'aidant'], 'verb_plus_infinitive'),
  'She likes writing messages': item('Elle aime écrire des messages', 'Elle aime ___ des messages', 'écrire', ['écrit', 'écrite', 'écrivant'], 'verb_plus_infinitive'),
  'We like listening to music': item('Nous aimons écouter de la musique', 'Nous aimons ___ de la musique', 'écouter', ['écoutons', 'écouté', 'écoutant'], 'verb_plus_infinitive'),
  'They like traveling': item('Ils aiment voyager', 'Ils aiment ___', 'voyager', ['voyagent', 'voyagé', 'voyageant'], 'verb_plus_infinitive'),
  'I hate waiting': item("Je déteste attendre", "Je déteste ___", 'attendre', ['attends', 'attendu', 'attendant'], 'verb_plus_infinitive'),
  'She hates losing money': item("Elle déteste perdre de l'argent", "Elle déteste ___ de l'argent", 'perdre', ['perd', 'perdu', 'perdant'], 'verb_plus_infinitive'),
  'We hate wasting time': item('Nous détestons perdre du temps', 'Nous détestons ___ du temps', 'perdre', ['perdons', 'perdu', 'perdant'], 'verb_plus_infinitive'),
  'Do you hate cleaning?': item('Est-ce que tu détestes faire le ménage ?', 'Est-ce que tu détestes ___ ?', 'faire le ménage', ['fais le ménage', 'fait le ménage', 'ménage'], 'verb_plus_infinitive_question'),
  'He hates being late': item('Il déteste être en retard', 'Il déteste ___ en retard', 'être', ['est', 'était', 'été'], 'verb_plus_infinitive'),
  'I finished working': item("J'ai fini de travailler", "J'ai fini de ___", 'travailler', ['travaille', 'travaillé', 'travaillant'], 'finish_de_infinitive'),
  'She finished writing': item('Elle a fini d’écrire', 'Elle a fini d’___', 'écrire', ['écrit', 'écrite', 'écrivant'], 'finish_de_infinitive'),
  'We finished cleaning': item('Nous avons fini de faire le ménage', 'Nous avons fini de ___', 'faire le ménage', ['faisons le ménage', 'fait le ménage', 'ménage'], 'finish_de_infinitive'),
  'They finished checking documents': item('Ils ont fini de vérifier les documents', 'Ils ont fini de ___ les documents', 'vérifier', ['vérifient', 'vérifié', 'vérifiant'], 'finish_de_infinitive'),
  'Did you finish reading?': item('Est-ce que tu as fini de lire ?', 'Est-ce que tu as fini de ___ ?', 'lire', ['lis', 'lu', 'lisant'], 'finish_de_infinitive_question'),
  'Stop talking': item('Arrête de parler', 'Arrête de ___', 'parler', ['parle', 'parlé', 'parlant'], 'stop_de_infinitive'),
  'Stop waiting here': item('Arrête d’attendre ici', 'Arrête d’___ ici', 'attendre', ['attends', 'attendu', 'attendant'], 'stop_de_infinitive'),
  'He stopped calling her': item('Il a arrêté de lui téléphoner', 'Il a arrêté de lui ___', 'téléphoner', ['téléphone', 'téléphoné', 'téléphonant'], 'stop_de_infinitive'),
  'We stopped using cash': item("Nous avons arrêté d'utiliser des espèces", "Nous avons arrêté d'___ des espèces", 'utiliser', ['utilisons', 'utilisé', 'utilisant'], 'stop_de_infinitive'),
  'They stopped watching TV': item('Ils ont arrêté de regarder la télé', 'Ils ont arrêté de ___ la télé', 'regarder', ['regardent', 'regardé', 'regardant'], 'stop_de_infinitive'),
  'I avoid spending money': item("J'évite de dépenser de l'argent", "J'évite de ___ de l'argent", 'dépenser', ['dépense', 'dépensé', 'dépensant'], 'avoid_de_infinitive'),
  'She avoids driving at night': item('Elle évite de conduire la nuit', 'Elle évite de ___ la nuit', 'conduire', ['conduit', 'conduite', 'conduisant'], 'avoid_de_infinitive'),
  'We avoid wasting time': item('Nous évitons de perdre du temps', 'Nous évitons de ___ du temps', 'perdre', ['perdons', 'perdu', 'perdant'], 'avoid_de_infinitive'),
  'He keeps calling me': item("Il continue de m'appeler", "Il continue de m'___", 'appeler', ['appelle', 'appelé', 'appelant'], 'continue_de_infinitive'),
  'They keep asking questions': item('Ils continuent de poser des questions', 'Ils continuent de ___ des questions', 'poser', ['posent', 'posé', 'posant'], 'continue_de_infinitive'),
  'She suggested meeting later': item('Elle a proposé de se voir plus tard', 'Elle a proposé de ___ plus tard', 'se voir', ['se voit', 'vu', 'voyant'], 'suggest_de_infinitive'),
  'We suggested ordering food': item('Nous avons proposé de commander à manger', 'Nous avons proposé de ___ à manger', 'commander', ['commandons', 'commandé', 'commandant'], 'suggest_de_infinitive'),
  'Thank you for helping me': item("Merci de m'avoir aidé", "Merci de m'avoir ___", 'aidé', ['aider', 'aide', 'aidant'], 'merci_de_past_infinitive'),
  'Before leaving, check your phone': item('Avant de partir, vérifie ton téléphone', 'Avant de ___, vérifie ton téléphone', 'partir', ['pars', 'parti', 'partant'], 'avant_de_infinitive'),
  'After finishing, call me': item('Après avoir fini, appelle-moi', 'Après avoir ___, appelle-moi', 'fini', ['finir', 'finis', 'finissant'], 'apres_avoir_past_participle'),
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
    '# GUSTAV French Lesson 22 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson22_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson22_gerund_infinitive_generation_batch_v1',
        'lesson22_infinitive_de_a_mapping_review_v1',
        'lesson22_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson22_row_ledger.json');
  const outMd = path.join(outDir, 'lesson22_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 22 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
