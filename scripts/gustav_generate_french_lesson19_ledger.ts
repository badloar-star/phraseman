import * as fs from 'node:fs';
import * as path from 'node:path';

type SourceRow = {
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  requiredEvidence: string[];
};

type SourceGraphPhrase = {
  id: string;
  sourcePrompts?: {
    ru?: string;
    uk?: string;
  };
};

type SourceGraph = {
  phrases: SourceGraphPhrase[];
};

type TranslationSpec = {
  proposedFrench: string;
  blank: string;
  correct: string;
  distractors: string[];
};

const TRANSLATIONS: Record<string, TranslationSpec> = {
  'The phone is on the table': t('Le téléphone est sur la table', 'Le téléphone est ___ la table', 'sur', ['sous', 'dans', 'près de']),
  'The bag is under the table': t('Le sac est sous la table', 'Le sac est ___ la table', 'sous', ['sur', 'dans', 'entre']),
  'The keys are in the bag': t('Les clés sont dans le sac', 'Les clés sont ___ le sac', 'dans', ['sur', 'sous', 'derrière']),
  'The charger is near the phone': t('Le chargeur est près du téléphone', 'Le chargeur est ___ téléphone', 'près du', ['sur le', 'sous le', 'dans le']),
  'The documents are inside the bag': t('Les documents sont dans le sac', 'Les documents sont ___ le sac', 'dans', ['sur', 'sous', 'près de']),
  'The tickets are on the desk': t('Les billets sont sur le bureau', 'Les billets sont ___ le bureau', 'sur', ['sous', 'dans', 'derrière']),
  'The chair is next to the table': t('La chaise est à côté de la table', 'La chaise est ___ la table', 'à côté de', ['sous', 'dans', 'au-dessus de']),
  'The door is behind me': t('La porte est derrière moi', 'La porte est ___ moi', 'derrière', ['sur', 'dans', 'entre']),
  'The car is outside the house': t("La voiture est à l'extérieur de la maison", 'La voiture est ___ la maison', "à l'extérieur de", ['dans', 'sur', 'sous']),
  'The shop is near the hotel': t("Le magasin est près de l'hôtel", 'Le magasin est ___ l’hôtel', 'près de', ['sous', 'dans', 'derrière']),
  'The bank is opposite the shop': t('La banque est en face du magasin', 'La banque est ___ magasin', 'en face du', ['sur le', 'dans le', 'sous le']),
  'The light is above the table': t('La lumière est au-dessus de la table', 'La lumière est ___ la table', 'au-dessus de', ['sous', 'dans', 'à côté de']),
  'The phone is between the books': t('Le téléphone est entre les livres', 'Le téléphone est ___ les livres', 'entre', ['sur', 'sous', 'près de']),
  'The shoes are under the bed': t('Les chaussures sont sous le lit', 'Les chaussures sont ___ le lit', 'sous', ['sur', 'dans', 'près de']),
  'The jacket is on the chair': t('La veste est sur la chaise', 'La veste est ___ la chaise', 'sur', ['sous', 'dans', 'derrière']),
  'Is the phone on the table?': t('Est-ce que le téléphone est sur la table ?', 'Est-ce que le téléphone est ___ la table ?', 'sur', ['sous', 'dans', 'près de']),
  'Are the keys in the bag?': t('Est-ce que les clés sont dans le sac ?', 'Est-ce que les clés sont ___ le sac ?', 'dans', ['sur', 'sous', 'derrière']),
  'Is the charger near the phone?': t('Est-ce que le chargeur est près du téléphone ?', 'Est-ce que le chargeur est ___ téléphone ?', 'près du', ['sur le', 'dans le', 'sous le']),
  'Is the car outside the house?': t("Est-ce que la voiture est à l'extérieur de la maison ?", 'Est-ce que la voiture est ___ la maison ?', "à l'extérieur de", ['dans', 'sur', 'sous']),
  'Is the bank opposite the shop?': t('Est-ce que la banque est en face du magasin ?', 'Est-ce que la banque est ___ magasin ?', 'en face du', ['sur le', 'dans le', 'sous le']),
  'Is the passport in the bag?': t('Est-ce que le passeport est dans le sac ?', 'Est-ce que le passeport est ___ le sac ?', 'dans', ['sur', 'sous', 'près de']),
  'Put the phone on the table': t('Mets le téléphone sur la table', 'Mets le téléphone ___ la table', 'sur', ['sous', 'dans', 'derrière']),
  'Put the keys in the bag': t('Mets les clés dans le sac', 'Mets les clés ___ le sac', 'dans', ['sur', 'sous', 'près de']),
  'Put the charger near the phone': t('Mets le chargeur près du téléphone', 'Mets le chargeur ___ téléphone', 'près du', ['sur le', 'dans le', 'sous le']),
  'Put the documents inside the bag': t('Mets les documents dans le sac', 'Mets les documents ___ le sac', 'dans', ['sur', 'sous', 'derrière']),
  'Put the jacket on the chair': t('Mets la veste sur la chaise', 'Mets la veste ___ la chaise', 'sur', ['sous', 'dans', 'près de']),
  'Put the passport in the bag': t('Mets le passeport dans le sac', 'Mets le passeport ___ le sac', 'dans', ['sur', 'sous', 'près de']),
  'Put the wallet on the desk': t('Mets le portefeuille sur le bureau', 'Mets le portefeuille ___ le bureau', 'sur', ['sous', 'dans', 'derrière']),
  'Put the books on the chair': t('Mets les livres sur la chaise', 'Mets les livres ___ la chaise', 'sur', ['sous', 'dans', 'près de']),
  'Put the shoes under the bed': t('Mets les chaussures sous le lit', 'Mets les chaussures ___ le lit', 'sous', ['sur', 'dans', 'près de']),
  'Put the bag next to the door': t('Mets le sac à côté de la porte', 'Mets le sac ___ la porte', 'à côté de', ['sous', 'dans', 'au-dessus de']),
  'Do not put the bag under the table': t('Ne mets pas le sac sous la table', 'Ne mets pas le sac ___ la table', 'sous', ['sur', 'dans', 'près de']),
  'Do not stand behind the door': t('Ne te tiens pas derrière la porte', 'Ne te tiens pas ___ la porte', 'derrière', ['sur', 'dans', 'entre']),
  'Do not wait near the car': t("N'attends pas près de la voiture", "N'attends pas ___ la voiture", 'près de', ['sous', 'dans', 'derrière']),
  'Do not sit on the bed': t("Ne t'assieds pas sur le lit", "Ne t'assieds pas ___ le lit", 'sur', ['sous', 'dans', 'derrière']),
  'Do not leave documents on the desk': t('Ne laisse pas les documents sur le bureau', 'Ne laisse pas les documents ___ le bureau', 'sur', ['sous', 'dans', 'près de']),
  'There is a key under the chair': t('Il y a une clé sous la chaise', 'Il y a une clé ___ la chaise', 'sous', ['sur', 'dans', 'près de']),
  'There is a phone on the table': t('Il y a un téléphone sur la table', 'Il y a un téléphone ___ la table', 'sur', ['sous', 'dans', 'derrière']),
  'There are tickets in the bag': t('Il y a des billets dans le sac', 'Il y a des billets ___ le sac', 'dans', ['sur', 'sous', 'près de']),
  'There are shoes under the bed': t('Il y a des chaussures sous le lit', 'Il y a des chaussures ___ le lit', 'sous', ['sur', 'dans', 'près de']),
  'There is a shop near the hotel': t("Il y a un magasin près de l'hôtel", 'Il y a un magasin ___ l’hôtel', 'près de', ['sous', 'dans', 'derrière']),
  'My phone is on the desk': t('Mon téléphone est sur le bureau', 'Mon téléphone est ___ le bureau', 'sur', ['sous', 'dans', 'près de']),
  'Your bag is under the chair': t('Ton sac est sous la chaise', 'Ton sac est ___ la chaise', 'sous', ['sur', 'dans', 'près de']),
  'His keys are in the car': t('Ses clés sont dans la voiture', 'Ses clés sont ___ la voiture', 'dans', ['sur', 'sous', 'derrière']),
  'Her jacket is on the bed': t('Sa veste est sur le lit', 'Sa veste est ___ le lit', 'sur', ['sous', 'dans', 'près de']),
  'Their car is behind the house': t('Leur voiture est derrière la maison', 'Leur voiture est ___ la maison', 'derrière', ['sur', 'dans', 'entre']),
  'My passport is in the bag': t('Mon passeport est dans le sac', 'Mon passeport est ___ le sac', 'dans', ['sur', 'sous', 'près de']),
  'Your keys are on the desk': t('Tes clés sont sur le bureau', 'Tes clés sont ___ le bureau', 'sur', ['sous', 'dans', 'près de']),
  'His wallet is in the car': t('Son portefeuille est dans la voiture', 'Son portefeuille est ___ la voiture', 'dans', ['sur', 'sous', 'derrière']),
  'Her phone is on the bed': t('Son téléphone est sur le lit', 'Son téléphone est ___ le lit', 'sur', ['sous', 'dans', 'près de']),
};

function t(proposedFrench: string, blank: string, correct: string, distractors: string[]): TranslationSpec {
  return { proposedFrench, blank, correct, distractors };
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
  if (!/[ÐÑÐІÐЄÐЇÐҐ]/.test(value)) return value;
  return Buffer.from(value, 'latin1').toString('utf8');
}

function renderMarkdown(ledger: Record<string, unknown>, outJson: string, repoRoot: string): string {
  const rows = Array.isArray(ledger.rows) ? ledger.rows as Array<Record<string, unknown>> : [];
  const lines = [
    '# GUSTAV French Lesson 19 Generated Ledger',
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
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generate_french_lesson19_ledger.ts --run docs/gustav/runs/<runId>');
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

  const sourcePath = path.join(runDir, 'research', 'lesson19_row_ledger.json');
  const source = readJson<{ sourceFile: string; rows: SourceRow[] }>(sourcePath);
  const sourceGraph = readJson<SourceGraph>(path.join(runDir, 'source_graph', 'source_graph.json'));
  const sourceGraphById = new Map(sourceGraph.phrases.map((phrase) => [phrase.id, phrase]));
  if (source.rows.length !== 50) throw new Error(`Expected 50 lesson 19 rows, found ${source.rows.length}.`);

  const rows = source.rows.map((row) => {
    const translation = TRANSLATIONS[row.englishBase];
    if (!translation) throw new Error(`Missing French translation for ${row.englishBase}`);
    const graphPhrase = sourceGraphById.get(row.phraseId);
    return {
      phraseId: row.phraseId,
      englishBase: row.englishBase,
      russianMeaning: graphPhrase?.sourcePrompts?.ru ?? repairMojibake(row.russianMeaning),
      ukrainianMeaning: graphPhrase?.sourcePrompts?.uk ?? repairMojibake(row.ukrainianMeaning),
      proposedFrench: translation.proposedFrench,
      wordsFr: [{
        text: translation.blank,
        correct: translation.correct,
        distractors: translation.distractors,
        category: 'prepositions_de_lieu',
      }],
      evidenceClaimIds: [
        'lesson19_place_prepositions_source_gate_v1',
        'lesson19_cambridge_larousse_tv5_place_preposition_sources_v1',
      ],
      requiredEvidence: row.requiredEvidence,
      reviewerStatus: 'needs_review',
      activationStatus: 'blocked',
    };
  });

  const ledger = {
    schemaVersion: 'gustav-french-lesson-row-ledger-v0',
    runId,
    lessonId: 19,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceFile: source.sourceFile,
    activationStatus: 'blocked_pending_source_review',
    activeAppSeedAllowed: false,
    rows,
  };
  const outDir = path.join(runDir, 'generated', 'fr', 'lessons');
  ensureDir(outDir);
  const outJson = path.join(outDir, 'lesson19_row_ledger.json');
  const outMd = path.join(outDir, 'lesson19_row_ledger.md');
  fs.writeFileSync(outJson, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(ledger, outJson, repoRoot));

  console.log('GUSTAV French lesson 19 ledger generated: PASS');
  console.log(`Rows: ${rows.length}`);
  console.log('Activation status: blocked_pending_source_review');
  console.log('Active app seed allowed: no');
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
