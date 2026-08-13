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
const DAY_INDEX = 11 as const;
const GENERATED_BY = 'gustav_personal_plan_echo_day011_french_full_day_text_packet' as const;

const EXPLANATIONS = [
  {
    phraseId: 'echo_d11_p1',
    title: 'Comment dire « j’ai regardé »',
    rule: 'Watch + ed = watched. Tu ajoutes -ed, et le mot parle du passé.',
    why: 'Ainsi, la personne qui écoute comprend tout de suite que l’action est déjà arrivée.',
    commonMistake: 'Ne dis pas « I watch a film yesterday » : sans -ed, cela sonne comme aujourd’hui.',
  },
  {
    phraseId: 'echo_d11_p2',
    title: 'La nuit passée',
    rule: 'Last night signifie hier soir. Listen + ed = listened. Le -ed ne change pas avec she/he.',
    why: 'Au passé, la forme est la même pour tout le monde : I listened, she listened, they listened.',
    commonMistake: 'N’ajoute pas -s : « she listens » parle d’aujourd’hui, pas d’hier.',
  },
  {
    phraseId: 'echo_d11_p3',
    title: 'Nous avons parlé : c’est déjà arrivé',
    rule: 'Talk + ed = talked. La conversation est terminée, donc tu ajoutes -ed.',
    why: 'About the film veut dire à propos du film. The indique que l’on sait de quel film il s’agit.',
    commonMistake: 'Ne dis pas « talked about a film » si le film a déjà été mentionné : utilise the.',
  },
  {
    phraseId: 'echo_d11_p4',
    title: 'J’ai appris quelque chose de nouveau',
    rule: 'Learn + ed = learned. Le mot learned indique que c’est déjà appris, déjà arrivé.',
    why: 'New word signifie un nouveau mot. Yesterday précise quand. Tout devient clair.',
    commonMistake: 'Ne dis pas « I learn a new word yesterday » : sans -ed, cela semble se passer maintenant.',
  },
  {
    phraseId: 'echo_d11_p5',
    title: 'La semaine dernière',
    rule: 'Call + ed = called. Last week signifie la semaine dernière. Les deux indiquent le passé.',
    why: 'Last week peut aller au début ou à la fin : les deux options sont correctes.',
    commonMistake: 'Ne dis pas « he calls his friend last week » : calls parle d’aujourd’hui, mais l’action est passée.',
  },
  {
    phraseId: 'echo_d11_p6',
    title: 'Ils ont apprécié : cela leur a plu',
    rule: 'Enjoy + ed = enjoyed. Le plaisir a déjà eu lieu : -ed le montre.',
    why: 'The show désigne l’émission précise que l’on connaît déjà. Last night précise quand.',
    commonMistake: 'Ne dis pas « they enjoy the show last night » : sans -ed, cela ressemble à une habitude.',
  },
] as const;

const FIELD_SPECS: FieldSpec[] = [
  {
    fieldPath: 'topic',
    fieldKind: 'day_topic',
    frenchText: 'Raconter ce qui s’est passé hier',
    source: (day) => day.topic,
  },
  {
    fieldPath: 'outcome',
    fieldKind: 'day_outcome',
    frenchText: 'Tu peux raconter ce que tu as fait hier : tu as regardé un film, écouté de la musique, appris quelque chose de nouveau.',
    source: (day) => day.outcome,
  },
  {
    fieldPath: 'intro[0].title',
    fieldKind: 'intro_title',
    frenchText: 'Hier, c’est le passé',
    source: (day) => day.intro?.[0]?.title,
  },
  {
    fieldPath: 'intro[0].body',
    fieldKind: 'intro_body',
    frenchText: 'Quand tu parles de quelque chose qui est déjà arrivé, le mot change : tu ajoutes -ed à la fin. Watch devient watched. Listen devient listened. C’est ainsi que fonctionnent les mots d’action réguliers.',
    source: (day) => day.intro?.[0]?.body,
  },
  {
    fieldPath: 'intro[0].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'J’ai regardé un film hier.',
    source: (day) => day.intro?.[0]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[0]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[0].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Elle a écouté de la musique hier soir.',
    source: (day) => day.intro?.[0]?.examples?.[1]?.gloss,
    englishAnchor: (day) => day.intro?.[0]?.examples?.[1]?.en,
  },
  {
    fieldPath: 'intro[1].title',
    fieldKind: 'intro_title',
    frenchText: 'Les mots qui indiquent le passé',
    source: (day) => day.intro?.[1]?.title,
  },
  {
    fieldPath: 'intro[1].body',
    fieldKind: 'intro_body',
    frenchText: 'Certains mots indiquent directement que quelque chose est arrivé avant. Yesterday = hier. Last night = hier soir. Last week = la semaine dernière. Ils vont avec la forme en -ed.',
    source: (day) => day.intro?.[1]?.body,
  },
  {
    fieldPath: 'intro[1].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'J’ai appris un nouveau mot hier.',
    source: (day) => day.intro?.[1]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[1]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[1].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Nous avons regardé les nouvelles hier soir.',
    source: (day) => day.intro?.[1]?.examples?.[1]?.gloss,
    englishAnchor: (day) => day.intro?.[1]?.examples?.[1]?.en,
  },
  {
    fieldPath: 'intro[2].title',
    fieldKind: 'intro_title',
    frenchText: 'Le cinéma comme partie de la vie',
    source: (day) => day.intro?.[2]?.title,
  },
  {
    fieldPath: 'intro[2].body',
    fieldKind: 'intro_body',
    frenchText: 'Dans le monde anglophone, on demande souvent : What did you watch? C’est une façon simple de commencer une conversation. Un film, une série, les nouvelles : tout cela est une bonne raison de raconter ta soirée.',
    source: (day) => day.intro?.[2]?.body,
  },
  {
    fieldPath: 'intro[2].examples[0].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'J’ai regardé un documentaire hier soir.',
    source: (day) => day.intro?.[2]?.examples?.[0]?.gloss,
    englishAnchor: (day) => day.intro?.[2]?.examples?.[0]?.en,
  },
  {
    fieldPath: 'intro[2].examples[1].gloss',
    fieldKind: 'intro_example_gloss',
    frenchText: 'Il a parlé du film au travail.',
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
    ['watched', 'ai regardé / a regardé'],
    ['listened', 'ai écouté / a écouté'],
    ['talked', 'avons parlé / ont parlé'],
    ['learned', 'ai appris / a appris'],
    ['called', 'ai appelé / a appelé'],
    ['enjoyed', 'a apprécié / ont apprécié'],
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
  return `fr_echo_d011_${fieldPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function renderMarkdown(report: any): string {
  return [
    '# GUSTAV Personal Plan Echo Day 011 French Full-Day Text Packet',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_day011_french_full_day_text_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'full_day');
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(auditsDir, { recursive: true });

  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const phraseMeaningRowsPath = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'echo_days_011_020_phrase_fr_rows.jsonl');
  const rowsPath = path.join(outDir, 'echo_day_011_full_day_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_day_011_full_day_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_day011_french_full_day_text_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_day011_french_full_day_text_packet.md');

  const findings: Finding[] = [];
  const day = await readEchoDay(repoRoot);
  if (!day) addFinding(findings, 'blocker', 'echo_day_011_missing', 'Echo day 11 is missing from source content.', rel(repoRoot, sourcePath));

  let existingPhraseMeaningRowsForDay = 0;
  if (!fs.existsSync(phraseMeaningRowsPath)) {
    addFinding(findings, 'blocker', 'phrase_meaning_rows_missing', 'Echo day 11 phrase meaning rows are missing.', rel(repoRoot, phraseMeaningRowsPath));
  } else {
    const phraseRows = fs.readFileSync(phraseMeaningRowsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    existingPhraseMeaningRowsForDay = phraseRows.filter((row) => row.dayIndex === DAY_INDEX && row.reviewerStatus === 'needs_review' && row.activationApproved === false).length;
    if (existingPhraseMeaningRowsForDay !== 6) addFinding(findings, 'blocker', 'phrase_meaning_rows_day_011_incomplete', `Expected 6 reviewer-needed phrase meaning rows for Echo day 11 but found ${existingPhraseMeaningRowsForDay}.`, rel(repoRoot, phraseMeaningRowsPath));
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
    schemaVersion: 'gustav-personal-plan-echo-day011-french-full-day-text-packet-v0',
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
      'This packet translates Echo day 11 full-day text fields except phrase meanings, which are already covered by the phrase-meaning layer.',
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

  console.log(`GUSTAV Echo day 011 French full-day text packet: ${report.status}`);
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
