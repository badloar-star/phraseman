import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning';
type FieldKind =
  | 'day_topic'
  | 'day_outcome'
  | 'intro_title'
  | 'intro_body'
  | 'intro_example_gloss'
  | 'phrase_explanation_title'
  | 'phrase_explanation_rule'
  | 'phrase_explanation_why'
  | 'phrase_explanation_common_mistake'
  | 'vocabulary_translation';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type FieldSpec = {
  fieldPath: string;
  fieldKind: FieldKind;
  frenchText: string;
  source: (day: any) => any;
  englishAnchor?: (day: any) => string | undefined;
};

const PLAN_ID = 'echo' as const;
const DAY_INDEX = 14 as const;
const GENERATED_BY = 'gustav_personal_plan_echo_day014_french_full_day_text_packet' as const;

const EXPLANATIONS = [
  {
    phraseId: 'echo_d14_p1',
    title: '« Meilleur » en anglais',
    rule: 'Better est la forme spéciale de good. Après, on met toujours than puis la deuxième chose.',
    why: 'Good devient better, pas gooder. C’est une exception facile à mémoriser.',
    commonMistake: 'Ne dis pas « more good » : dis seulement better.',
  },
  {
    phraseId: 'echo_d14_p2',
    title: 'Ajoute -er au mot court',
    rule: 'Long devient longer. Pour les mots courts, ajoute simplement -er avant than.',
    why: 'C’est ainsi que l’on forme la comparaison en anglais avec les mots courts.',
    commonMistake: 'Ne dis pas « more long » : dis seulement longer.',
  },
  {
    phraseId: 'echo_d14_p3',
    title: 'Mot long : ajoute more',
    rule: 'Interesting est long : mets more devant, n’ajoute pas -er.',
    why: 'Les mots de plus de deux syllabes ne changent pas : on ajoute more devant.',
    commonMistake: 'Ne dis pas « interestinger » : dis seulement more interesting.',
  },
  {
    phraseId: 'echo_d14_p4',
    title: 'That et this : montrer deux choses',
    rule: 'This désigne ceci, près de toi ; that désigne cela, plus loin. Old devient older avant than.',
    why: 'Ainsi, tu indiques clairement laquelle des deux choses tu compares.',
    commonMistake: 'Ne confonds pas this, ici, et that, là-bas.',
  },
  {
    phraseId: 'echo_d14_p5',
    title: 'Doubler la lettre avant -er',
    rule: 'Big devient bigger : une voyelle + une consonne à la fin, on double la consonne et on ajoute -er.',
    why: 'Sans cette double consonne, « biger » se lirait mal.',
    commonMistake: 'N’écris pas « biger » : la forme correcte est bigger.',
  },
  {
    phraseId: 'echo_d14_p6',
    title: 'More + mot long',
    rule: 'Famous a deux syllabes mais finit par -ous. Avec ce type de mot, utilise more.',
    why: 'Les mots en -ous, -ful, -ing et -ed prennent toujours more : n’ajoute pas -er.',
    commonMistake: 'Ne dis pas « famouser » : dis seulement more famous.',
  },
] as const;

const FIELD_SPECS: FieldSpec[] = [
  {
    fieldPath: 'topic',
    fieldKind: 'day_topic',
    frenchText: 'Comparer deux choses',
    source: (day) => day.topic,
  },
  {
    fieldPath: 'outcome',
    fieldKind: 'day_outcome',
    frenchText: 'Tu peux comparer des livres, des films et des lieux en anglais.',
    source: (day) => day.outcome,
  },
  {
    fieldPath: 'intro[0].title',
    fieldKind: 'intro_title',
    frenchText: 'Comment comparer en anglais',
    source: (day) => day.intro?.[0]?.title,
  },
  {
    fieldPath: 'intro[0].body',
    fieldKind: 'intro_body',
    frenchText: 'Quand tu veux dire qu’une chose est meilleure, plus longue ou plus intéressante qu’une autre, ajoute -er au mot court. Ensuite, dis than et nomme la deuxième chose.',
    source: (day) => day.intro?.[0]?.body,
  },
  {
    fieldPath: 'intro[0].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Ce livre est plus long que celui-là.',
    source: (day) => day.intro?.[0]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[0]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[0].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Le film est meilleur que le livre.',
    source: (day) => day.intro?.[0]?.examples?.[1]?.gloss,
    englishAnchor: (day) => day.intro?.[0]?.examples?.[1]?.en,
  },
  {
    fieldPath: 'intro[1].title',
    fieldKind: 'intro_title',
    frenchText: 'Mot court : ajoute -er',
    source: (day) => day.intro?.[1]?.title,
  },
  {
    fieldPath: 'intro[1].body',
    fieldKind: 'intro_body',
    frenchText: 'Mots courts, une ou deux syllabes : old devient older, cheap devient cheaper, long devient longer. Exceptions : good devient better, bad devient worse. Pour les mots plus longs, on utilise more + le mot, comme more interesting.',
    source: (day) => day.intro?.[1]?.body,
  },
  {
    fieldPath: 'intro[1].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Ce cinéma est plus ancien que celui-là.',
    source: (day) => day.intro?.[1]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[1]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[1].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Cette histoire est plus intéressante que celle-là.',
    source: (day) => day.intro?.[1]?.examples?.[1]?.gloss,
    englishAnchor: (day) => day.intro?.[1]?.examples?.[1]?.en,
  },
  {
    fieldPath: 'intro[2].title',
    fieldKind: 'intro_title',
    frenchText: 'Un jour dans la vie : choisir quoi lire',
    source: (day) => day.intro?.[2]?.title,
  },
  {
    fieldPath: 'intro[2].body',
    fieldKind: 'intro_body',
    frenchText: 'Imagine : tu es dans une bibliothèque ou une librairie. Tu as deux livres dans les mains et tu réfléchis à celui que tu vas prendre. Aujourd’hui, tu apprendras à en parler en anglais, simplement et clairement.',
    source: (day) => day.intro?.[2]?.body,
  },
  {
    fieldPath: 'intro[2].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Ce livre est meilleur que celui-là.',
    source: (day) => day.intro?.[2]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[2]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[2].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Ce film-là était plus court que celui-ci.',
    source: (day) => day.intro?.[2]?.examples?.[1]?.gloss,
    englishAnchor: (day) => day.intro?.[2]?.examples?.[1]?.en,
  },
  ...EXPLANATIONS.flatMap((item) => [
    {
      fieldPath: `phrases.${item.phraseId}.explanation.title`,
      fieldKind: 'phrase_explanation_title' as FieldKind,
      frenchText: item.title,
      source: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.explanation?.title,
      englishAnchor: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.english,
    },
    {
      fieldPath: `phrases.${item.phraseId}.explanation.rule`,
      fieldKind: 'phrase_explanation_rule' as FieldKind,
      frenchText: item.rule,
      source: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.explanation?.rule,
      englishAnchor: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.english,
    },
    {
      fieldPath: `phrases.${item.phraseId}.explanation.why`,
      fieldKind: 'phrase_explanation_why' as FieldKind,
      frenchText: item.why,
      source: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.explanation?.why,
      englishAnchor: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.english,
    },
    {
      fieldPath: `phrases.${item.phraseId}.explanation.commonMistake`,
      fieldKind: 'phrase_explanation_common_mistake' as FieldKind,
      frenchText: item.commonMistake,
      source: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.explanation?.commonMistake,
      englishAnchor: (day: any) => day.phrases?.find((phrase: any) => phrase.id === item.phraseId)?.english,
    },
  ]),
  ...[
    ['better', 'meilleur'],
    ['longer', 'plus long'],
    ['interesting', 'intéressant'],
    ['older', 'plus ancien'],
    ['bigger', 'plus grand'],
    ['famous', 'célèbre'],
  ].map(([word, frenchText]) => ({
    fieldPath: `vocabulary.${word}.translation`,
    fieldKind: 'vocabulary_translation' as FieldKind,
    frenchText,
    source: (day: any) => day.vocabulary?.find((vocab: any) => vocab.word === word)?.translation,
    englishAnchor: (day: any) => day.vocabulary?.find((vocab: any) => vocab.word === word)?.example,
  })),
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCyrillic(value: string): boolean {
  return /[\u0400-\u04FF]/.test(value);
}

function hasMojibake(value: string): boolean {
  return /(?:\u00c2|\u00c3|\u00d0|\u00d1|\ufffd|\?{3,})/.test(value);
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

async function readEchoDay(repoRoot: string): Promise<any | null> {
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const mod = await import(pathToFileURL(sourcePath).href);
  const days = mod.ECHO_CONTENT_DAYS ?? mod.default?.ECHO_CONTENT_DAYS;
  return Array.isArray(days) ? days.find((day) => day.planId === PLAN_ID && day.dayIndex === DAY_INDEX) ?? null : null;
}

function rowIdFromPath(fieldPath: string): string {
  return `fr_echo_d014_${fieldPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function renderMarkdown(report: any): string {
  return [
    '# GUSTAV Personal Plan Echo Day 014 French Full-Day Text Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Field Kind Counts',
    '',
    ...Object.entries(report.fieldKindCounts).map(([key, value]) => `- \`${key}\`: ${value}`),
    '',
    '## Outputs',
    '',
    `- Rows JSONL: \`${report.outputs.rowsJsonl}\``,
    `- Reviewer queue TSV: \`${report.outputs.reviewerQueueTsv}\``,
    `- Packet JSON: \`${report.outputs.packetJson}\``,
    `- Packet MD: \`${report.outputs.packetMd}\``,
    '',
    '## Findings',
    '',
    ...(report.findings.length ? report.findings.map((finding: Finding) => `- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`) : ['- None.']),
    '',
    '## Safety',
    '',
    '- This packet did not modify production app files.',
    '- This packet did not modify source plan files.',
    '- This packet did not write reviewer decisions.',
    '- This packet does not authorize production app apply.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_day014_french_full_day_text_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'full_day');
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(auditsDir, { recursive: true });

  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const phraseMeaningRowsPath = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'echo_days_011_020_phrase_fr_rows.jsonl');
  const rowsPath = path.join(outDir, 'echo_day_014_full_day_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_day_014_full_day_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_day014_french_full_day_text_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_day014_french_full_day_text_packet.md');

  const findings: Finding[] = [];
  const day = await readEchoDay(repoRoot);
  if (!day) addFinding(findings, 'blocker', 'echo_day_014_missing', 'Echo day 14 is missing from source content.', rel(repoRoot, sourcePath));

  let existingPhraseMeaningRowsForDay = 0;
  if (!fs.existsSync(phraseMeaningRowsPath)) {
    addFinding(findings, 'blocker', 'phrase_meaning_rows_missing', 'Echo day 14 phrase meaning rows are missing.', rel(repoRoot, phraseMeaningRowsPath));
  } else {
    const phraseRows = fs.readFileSync(phraseMeaningRowsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    existingPhraseMeaningRowsForDay = phraseRows.filter((row) => row.dayIndex === DAY_INDEX && row.reviewerStatus === 'needs_review' && row.activationApproved === false).length;
    if (existingPhraseMeaningRowsForDay !== 6) addFinding(findings, 'blocker', 'phrase_meaning_rows_day_014_incomplete', `Expected 6 reviewer-needed phrase meaning rows for Echo day 14 but found ${existingPhraseMeaningRowsForDay}.`, rel(repoRoot, phraseMeaningRowsPath));
  }

  const rows = day ? FIELD_SPECS.map((spec) => {
    const source = spec.source(day);
    if (!hasText(source?.ru) && !hasText(source?.es)) addFinding(findings, 'blocker', 'full_day_source_field_missing', `Missing source text for ${spec.fieldPath}.`, 'app/plan_content_echo.ts');
    return {
      rowId: rowIdFromPath(spec.fieldPath),
      targetLocale: 'fr',
      planId: PLAN_ID,
      dayIndex: DAY_INDEX,
      fieldPath: spec.fieldPath,
      fieldKind: spec.fieldKind,
      englishAnchor: spec.englishAnchor?.(day),
      sourcePreview: { ru: source?.ru, uk: source?.uk, es: source?.es },
      frenchText: spec.frenchText,
      reviewerStatus: 'needs_review',
      activationApproved: false,
      generatedBy: GENERATED_BY,
    };
  }) : [];

  const expectedRows = FIELD_SPECS.length;
  const duplicateFieldPaths = rows.length - new Set(rows.map((row) => row.fieldPath)).size;
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  const missingSourceFields = rows.filter((row) => !hasText(row.sourcePreview.ru) && !hasText(row.sourcePreview.es)).length;
  const missingFrenchFields = rows.filter((row) => !hasText(row.frenchText)).length;
  const cyrillicLeaksInFrenchFields = rows.filter((row) => hasCyrillic(row.frenchText)).length;
  const mojibakeFrenchFields = rows.filter((row) => hasMojibake(row.frenchText)).length;
  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;

  if (rows.length !== expectedRows) addFinding(findings, 'blocker', 'full_day_generated_row_count_mismatch', `Generated ${rows.length} rows; expected ${expectedRows}.`);
  if (duplicateFieldPaths > 0) addFinding(findings, 'blocker', 'full_day_duplicate_field_paths', `Generated rows have ${duplicateFieldPaths} duplicate field paths.`);
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'full_day_duplicate_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);
  if (missingSourceFields > 0) addFinding(findings, 'blocker', 'full_day_missing_source_fields', `Generated rows have ${missingSourceFields} missing source fields.`);
  if (missingFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_missing_french_fields', `Generated rows have ${missingFrenchFields} missing French fields.`);
  if (cyrillicLeaksInFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_cyrillic_leak_in_french_fields', `Generated rows have ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  if (mojibakeFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_mojibake_in_french_fields', `Generated rows have ${mojibakeFrenchFields} mojibake markers in French fields.`);
  if (activationApprovedRows > 0) addFinding(findings, 'blocker', 'full_day_rows_activation_approved', 'Generated full-day rows must not be activation-approved.');

  fs.writeFileSync(rowsPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const tsvHeader = ['rowId', 'targetLocale', 'planId', 'dayIndex', 'fieldPath', 'fieldKind', 'englishAnchor', 'sourceEs', 'frenchText', 'reviewerStatus', 'activationApproved'];
  const tsvRows = rows.map((row) => [
    row.rowId,
    row.targetLocale,
    row.planId,
    row.dayIndex,
    row.fieldPath,
    row.fieldKind,
    row.englishAnchor ?? '',
    row.sourcePreview.es ?? '',
    row.frenchText,
    row.reviewerStatus,
    row.activationApproved,
  ].map(tsvCell).join('\t'));
  fs.writeFileSync(reviewerQueuePath, `${tsvHeader.join('\t')}\n${tsvRows.join('\n')}\n`, 'utf8');

  const jsonlRows = lineCount(rowsPath);
  const tsvLineCount = lineCount(reviewerQueuePath);
  if (jsonlRows !== rows.length) addFinding(findings, 'blocker', 'jsonl_row_count_mismatch', `Rows JSONL has ${jsonlRows} lines; expected ${rows.length}.`, rel(repoRoot, rowsPath));
  if (tsvLineCount !== rows.length + 1) addFinding(findings, 'blocker', 'reviewer_tsv_row_count_mismatch', `Reviewer TSV has ${tsvLineCount} lines; expected ${rows.length + 1}.`, rel(repoRoot, reviewerQueuePath));

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rowsWithReviewerNeedsReview = rows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const fieldKindCounts = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.fieldKind] = (counts[row.fieldKind] ?? 0) + 1;
    return counts;
  }, {});

  const report = {
    schemaVersion: 'gustav-personal-plan-echo-day014-french-full-day-text-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    inputs: { sourceFile: rel(repoRoot, sourcePath), phraseMeaningRows: rel(repoRoot, phraseMeaningRowsPath), planId: PLAN_ID, dayIndex: DAY_INDEX },
    outputs: { rowsJsonl: rel(repoRoot, rowsPath), reviewerQueueTsv: rel(repoRoot, reviewerQueuePath), packetJson: rel(repoRoot, packetJsonPath), packetMd: rel(repoRoot, packetMdPath) },
    summary: {
      planId: PLAN_ID,
      dayIndex: DAY_INDEX,
      expectedRows,
      generatedRows: rows.length,
      rowsWithFrench: rows.filter((row) => hasText(row.frenchText)).length,
      rowsWithReviewerNeedsReview,
      activationApprovedRows,
      duplicateFieldPaths,
      duplicateRowIds,
      missingSourceFields,
      missingFrenchFields,
      cyrillicLeaksInFrenchFields,
      mojibakeFrenchFields,
      existingPhraseMeaningRowsForDay,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && rowsWithReviewerNeedsReview === rows.length,
      readyForFrenchFullDayTextReview: blockers === 0 && rows.length === expectedRows,
      readyForFullPlanActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    fieldKindCounts,
    generationPolicy: [
      'This packet translates Echo day 14 full-day text fields except phrase meanings, which are already covered by the phrase-meaning layer.',
      'Generated rows are reviewer-needed by default.',
      'No generated full-day row is activation-approved.',
      'Source plan files are read-only inputs.',
      'This packet writes only GUSTAV pipeline outputs and audit artifacts.',
      'Production app apply remains blocked until reviewer decisions and explicit app-write approval exist.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      sourcePlanFilesModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(packetJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(packetMdPath, `${renderMarkdown(report)}\n`, 'utf8');

  console.log(`GUSTAV Echo day 014 French full-day text packet: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}/${report.summary.expectedRows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${report.summary.activationApprovedRows}`);
  console.log(`Existing phrase meaning rows for day: ${report.summary.existingPhraseMeaningRowsForDay}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for French full-day text review: ${report.summary.readyForFrenchFullDayTextReview ? 'yes' : 'no'}`);
  console.log(`Ready for full plan activation: ${report.summary.readyForFullPlanActivation ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, packetJsonPath)}`);

  if (report.status !== 'PASS') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
