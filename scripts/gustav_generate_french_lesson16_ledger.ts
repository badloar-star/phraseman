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

const LESSON_ID = 16;
const REQUIRED_EVIDENCE = [
  'english_phrase_source_graph',
  'french_phrasal_verb_meaning_mapping_reference',
  'ru_uk_meaning_review',
];

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'I wake up early': item('Je me réveille tôt', 'Je me ___ tôt', 'réveille', ['réveilles', 'lève', 'allume'], 'pronominal_verb_present'),
  'You get up late': item('Tu te lèves tard', 'Tu te ___ tard', 'lèves', ['lève', 'réveilles', 'mets'], 'pronominal_verb_present'),
  'He puts on glasses': item('Il met des lunettes', 'Il ___ des lunettes', 'met', ['mets', 'mettons', 'enlève'], 'phrasal_meaning_mettre'),
  'She takes off glasses': item('Elle enlève ses lunettes', 'Elle ___ ses lunettes', 'enlève', ['met', 'allume', 'rend'], 'phrasal_meaning_enlever'),
  'We turn on lights': item('Nous allumons les lumières', 'Nous ___ les lumières', 'allumons', ['allume', 'éteignons', 'mettons'], 'phrasal_meaning_allumer'),
  'They turn off lights': item('Ils éteignent les lumières', 'Ils ___ les lumières', 'éteignent', ['allument', 'mettent', 'cherchent'], 'phrasal_meaning_eteindre'),
  'I look for keys': item('Je cherche les clés', 'Je ___ les clés', 'cherche', ['cherches', 'trouve', 'jette'], 'phrasal_meaning_chercher'),
  'You clean up rooms': item('Tu ranges les chambres', 'Tu ___ les chambres', 'ranges', ['range', 'jettes', 'rends'], 'phrasal_meaning_ranger'),
  'He throws away papers': item('Il jette des papiers', 'Il ___ des papiers', 'jette', ['jeter', 'range', 'rend'], 'phrasal_meaning_jeter'),
  'She gives back tickets': item('Elle rend les billets', 'Elle ___ les billets', 'rend', ['rends', 'jette', 'cherche'], 'phrasal_meaning_rendre'),
  'We find out facts': item('Nous découvrons les faits', 'Nous ___ les faits', 'découvrons', ['découvre', 'cherchons', 'rendons'], 'phrasal_meaning_decouvrir'),
  'They go back home': item('Ils rentrent à la maison', 'Ils ___ à la maison', 'rentrent', ['rentre', 'sortent', 'jettent'], 'phrasal_meaning_rentrer'),
  'Do you wake up early?': item('Est-ce que tu te réveilles tôt ?', 'Est-ce que tu te ___ tôt ?', 'réveilles', ['réveille', 'lèves', 'mets'], 'pronominal_verb_question'),
  'Does he get up late?': item('Est-ce qu’il se lève tard ?', 'Est-ce qu’il se ___ tard ?', 'lève', ['réveille', 'met', 'rend'], 'pronominal_verb_question'),
  'Does she put on glasses?': item('Est-ce qu’elle met des lunettes ?', 'Est-ce qu’elle ___ des lunettes ?', 'met', ['mets', 'enlève', 'allume'], 'phrasal_question'),
  'Do they take off shoes?': item('Est-ce qu’ils enlèvent leurs chaussures ?', 'Est-ce qu’ils ___ leurs chaussures ?', 'enlèvent', ['mettent', 'allument', 'rendent'], 'phrasal_question'),
  'Do we turn on lights?': item('Est-ce que nous allumons les lumières ?', 'Est-ce que nous ___ les lumières ?', 'allumons', ['éteignons', 'mettons', 'rendons'], 'phrasal_question'),
  'Do you turn off lights?': item('Est-ce que tu éteins les lumières ?', 'Est-ce que tu ___ les lumières ?', 'éteins', ['allumes', 'mets', 'cherches'], 'phrasal_question'),
  'Does he look for keys?': item('Est-ce qu’il cherche les clés ?', 'Est-ce qu’il ___ les clés ?', 'cherche', ['trouve', 'jette', 'rend'], 'phrasal_question'),
  'Do they clean up rooms?': item('Est-ce qu’ils rangent les chambres ?', 'Est-ce qu’ils ___ les chambres ?', 'rangent', ['jettent', 'rendent', 'cherchent'], 'phrasal_question'),
  'I do not wake up late': item('Je ne me réveille pas tard', 'Je ne me ___ pas tard', 'réveille', ['réveilles', 'lève', 'mets'], 'pronominal_verb_negative'),
  'You do not get up early': item('Tu ne te lèves pas tôt', 'Tu ne te ___ pas tôt', 'lèves', ['lève', 'réveilles', 'mets'], 'pronominal_verb_negative'),
  'He does not put on glasses': item('Il ne met pas de lunettes', 'Il ne ___ pas de lunettes', 'met', ['mets', 'enlève', 'allume'], 'phrasal_negative'),
  'She does not take off shoes': item('Elle n’enlève pas ses chaussures', 'Elle n’___ pas ses chaussures', 'enlève', ['met', 'allume', 'rend'], 'phrasal_negative'),
  'We do not turn on lights': item('Nous n’allumons pas les lumières', 'Nous n’___ pas les lumières', 'allumons', ['éteignons', 'mettons', 'rendons'], 'phrasal_negative'),
  'They do not turn off phones': item('Ils n’éteignent pas les téléphones', 'Ils n’___ pas les téléphones', 'éteignent', ['allument', 'mettent', 'cherchent'], 'phrasal_negative'),
  'I do not look for problems': item('Je ne cherche pas les problèmes', 'Je ne ___ pas les problèmes', 'cherche', ['trouve', 'jette', 'rend'], 'phrasal_negative'),
  'You do not throw away documents': item('Tu ne jettes pas les documents', 'Tu ne ___ pas les documents', 'jettes', ['jette', 'ranges', 'rends'], 'phrasal_negative'),
  'He does not give back money': item("Il ne rend pas l'argent", "Il ne ___ pas l'argent", 'rend', ['rends', 'jette', 'cherche'], 'phrasal_negative'),
  'She does not find out facts': item('Elle ne découvre pas les faits', 'Elle ne ___ pas les faits', 'découvre', ['cherche', 'rend', 'range'], 'phrasal_negative'),
  'We should wake up early': item('Nous devrions nous réveiller tôt', 'Nous devrions nous ___ tôt', 'réveiller', ['réveillons', 'lever', 'mettre'], 'phrasal_modal_should'),
  'You should get up now': item('Tu devrais te lever maintenant', 'Tu devrais te ___ maintenant', 'lever', ['lèves', 'réveiller', 'mettre'], 'phrasal_modal_should'),
  'He should put on a jacket': item('Il devrait mettre une veste', 'Il devrait ___ une veste', 'mettre', ['met', 'enlever', 'allumer'], 'phrasal_modal_should'),
  'She should take off shoes': item('Elle devrait enlever ses chaussures', 'Elle devrait ___ ses chaussures', 'enlever', ['mettre', 'allumer', 'rendre'], 'phrasal_modal_should'),
  'We should turn off phones': item('Nous devrions éteindre nos téléphones', 'Nous devrions ___ nos téléphones', 'éteindre', ['allumer', 'mettre', 'chercher'], 'phrasal_modal_should'),
  'They should clean up rooms': item('Ils devraient ranger les chambres', 'Ils devraient ___ les chambres', 'ranger', ['jeter', 'rendre', 'chercher'], 'phrasal_modal_should'),
  'I can find out soon': item('Je peux le découvrir bientôt', 'Je peux le ___ bientôt', 'découvrir', ['chercher', 'rendre', 'jeter'], 'phrasal_modal_can'),
  'You can go back later': item('Tu peux rentrer plus tard', 'Tu peux ___ plus tard', 'rentrer', ['sortir', 'chercher', 'rendre'], 'phrasal_modal_can'),
  'He can give back a key': item('Il peut rendre une clé', 'Il peut ___ une clé', 'rendre', ['jeter', 'chercher', 'allumer'], 'phrasal_modal_can'),
  'She can throw away papers': item('Elle peut jeter des papiers', 'Elle peut ___ des papiers', 'jeter', ['rendre', 'chercher', 'éteindre'], 'phrasal_modal_can'),
  'I woke up early yesterday': item('Je me suis réveillé tôt hier', 'Je me suis ___ tôt hier', 'réveillé', ['réveille', 'levé', 'mis'], 'pronominal_past'),
  'You got up late yesterday': item("Tu t'es levé tard hier", "Tu t'es ___ tard hier", 'levé', ['réveillé', 'mis', 'rendu'], 'pronominal_past'),
  'He put on glasses yesterday': item('Il a mis des lunettes hier', 'Il a ___ des lunettes hier', 'mis', ['met', 'enlevé', 'allumé'], 'phrasal_past'),
  'She took off shoes yesterday': item('Elle a enlevé ses chaussures hier', 'Elle a ___ ses chaussures hier', 'enlevé', ['mis', 'allumé', 'rendu'], 'phrasal_past'),
  'We turned on lights at night': item('Nous avons allumé les lumières la nuit', 'Nous avons ___ les lumières la nuit', 'allumé', ['éteint', 'mis', 'rendu'], 'phrasal_past'),
  'They turned off phones at noon': item('Ils ont éteint les téléphones à midi', 'Ils ont ___ les téléphones à midi', 'éteint', ['allumé', 'mis', 'cherché'], 'phrasal_past'),
  'I looked for keys this morning': item("J'ai cherché les clés ce matin", "J'ai ___ les clés ce matin", 'cherché', ['trouvé', 'jeté', 'rendu'], 'phrasal_past'),
  'We cleaned up rooms yesterday': item('Nous avons rangé les chambres hier', 'Nous avons ___ les chambres hier', 'rangé', ['jeté', 'rendu', 'cherché'], 'phrasal_past'),
  'She gave back tickets last week': item('Elle a rendu les billets la semaine dernière', 'Elle a ___ les billets la semaine dernière', 'rendu', ['jeté', 'cherché', 'allumé'], 'phrasal_past'),
  'They found out yesterday': item("Ils l'ont découvert hier", "Ils l'ont ___ hier", 'découvert', ['cherché', 'rendu', 'rangé'], 'phrasal_past'),
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
    '# GUSTAV French Lesson 16 Generated Ledger',
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
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson16_ledger.ts --run docs/gustav/runs/<runId>');
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
        'lesson16_phrasal_meaning_generation_batch_v1',
        'lesson16_pronominal_and_plain_verb_mapping_review_v1',
        'lesson16_source_graph_ru_uk_meaning_v1',
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
  const outJson = path.join(outDir, 'lesson16_row_ledger.json');
  const outMd = path.join(outDir, 'lesson16_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 16 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
