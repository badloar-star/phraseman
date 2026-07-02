import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Status = 'PASS' | 'BLOCK';
export type Severity = 'blocker' | 'warning';
export type FieldKind =
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

export type TranslationField = {
  fieldPath: string;
  fieldKind: FieldKind;
  frenchText: string;
};

export type DayPack = {
  dayIndex: number;
  fields: TranslationField[];
};

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

export type BatchConfig = {
  dayPacks: DayPack[];
  generatedBy: string;
  scriptUsage: string;
  batchTitle: string;
  batchSchemaVersion: string;
  batchAuditBaseName: string;
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function padDay(dayIndex: number): string {
  return String(dayIndex).padStart(3, '0');
}

function phraseLedgerName(dayIndex: number): string {
  const start = Math.floor((dayIndex - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, 84);
  return `echo_days_${padDay(start)}_${padDay(end)}_phrase_fr_rows.jsonl`;
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

// Detects French elision corruption where an apostrophe was replaced by a space,
// e.g. "s il vous plait" instead of "s'il vous pla\u00eet", "quelqu un", "aujourd hui".
// A single elision proclitic (s, d, l, j, n, c, m, t), a "qu"-ending word
// (que/quelqu/jusqu/lorsqu/puisqu...) or the "aujourd" of aujourd'hui standing
// directly before a word starting with a vowel or "h" is a strong signal that the
// elision apostrophe was stripped and replaced by a space.
function hasBrokenElision(value: string): boolean {
  const vowelOrH = '[a\u00e0\u00e2\u00e4e\u00e9\u00e8\u00ea\u00ebi\u00ee\u00efo\u00f4\u00f6u\u00f9\u00fb\u00fcyhA\u00c0\u00c2\u00c4E\u00c9\u00c8\u00ca\u00cbI\u00ce\u00cfO\u00d4\u00d6U\u00d9\u00db\u00dcYH]';
  // "aujourd hui" marker (missing apostrophe in aujourd'hui).
  if (/\baujourd\s+hui\b/iu.test(value)) return true;
  // A single-letter elision proclitic (case-insensitive) as its own word directly
  // before a vowel- or h-initial word: "s il", "d abord", "l on", "C est", "m entends".
  if (new RegExp(`(?:^|\\s)[sdljncmtSDLJNCMT]\\s+${vowelOrH}`, 'u').test(value)) return true;
  // A "qu"-ending elided word: "quelqu un", "jusqu a", "lorsqu il", "puisqu il", "qu il".
  if (new RegExp(`\\b\\w*qu\\s+${vowelOrH}`, 'iu').test(value)) return true;
  return false;
}

function hasSourceLanguageLeak(value: string): boolean {
  const text = value.toLowerCase();
  const sourceMarkers = [
    /[¿¡]/u,
    /\b(?:dónde|quién|qué|cómo|estás|está|puedo|puedes|quiero|tengo|perdón|perdone|ayudarme|izquierda|derecha|camino|lejos|estoy buscando|gira|tienda|oficina|mercado|estación|autobús)\b/iu,
    /\b(?:você|vocês|não|está|estão|obrigado|obrigada|onde fica|posso|preciso|tenho|farmácia|ônibus|cartão)\b/iu,
    /[ăđơưĂĐƠƯ]/u,
    /[ğĞıİşŞ]/u,
    /[ąĄęĘłŁńŃśŚźŹżŻ]/u,
    /\b(?:anda|kamu|tidak|dengan|yang|apakah)\b/iu,
  ];
  return sourceMarkers.some((pattern) => pattern.test(text));
}

function hasFrenchLanguageSignal(value: string): boolean {
  return /\b(?:je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|des|du|de|dans|sur|pour|avec|sans|est|sont|ce|cet|cette|ces|cela|qui|que|quoi|quand|où|comment|peux|peut|faut|signifie|sert|demander|question|phrase|mot|lieu|temps|heure)\b|(?:c'est|l'|d'|qu')/iu.test(value);
}

function normalizeComparable(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[“”«»"'.!?¿¡:;,()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasUnsafeSourceEcho(row: any): boolean {
  const target = normalizeComparable(row.frenchText);
  if (target.length < 16 || target.split(' ').length < 3) return false;
  const sourceValues = [row.sourcePreview?.es, row.sourcePreview?.ru, row.sourcePreview?.uk].map(normalizeComparable).filter(Boolean);
  return sourceValues.some((sourceValue) => sourceValue === target);
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

function rowIdFromPath(dayIndex: number, fieldPath: string): string {
  return `fr_echo_d${padDay(dayIndex)}_${fieldPath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function resolveSource(day: any, fieldPath: string): any {
  if (fieldPath === 'topic') return day.topic;
  if (fieldPath === 'outcome') return day.outcome;

  let match = fieldPath.match(/^intro\[(\d+)\]\.(title|body)$/);
  if (match) return day.intro?.[Number(match[1])]?.[match[2]];

  match = fieldPath.match(/^intro\[(\d+)\]\.examples\[(\d+)\]\.gloss$/);
  if (match) return day.intro?.[Number(match[1])]?.examples?.[Number(match[2])]?.gloss;

  match = fieldPath.match(/^phrases\.([^.]+)\.explanation\.(title|rule|why|commonMistake)$/);
  if (match) return day.phrases?.find((phrase: any) => phrase.id === match?.[1])?.explanation?.[match[2]];

  match = fieldPath.match(/^vocabulary\.(.+)\.translation$/);
  if (match) return day.vocabulary?.find((vocab: any) => vocab.word === match?.[1])?.translation;

  return undefined;
}

function resolveEnglishAnchor(day: any, fieldPath: string): string | undefined {
  let match = fieldPath.match(/^intro\[(\d+)\]\.examples\[(\d+)\]\.gloss$/);
  if (match) return day.intro?.[Number(match[1])]?.examples?.[Number(match[2])]?.en;

  match = fieldPath.match(/^phrases\.([^.]+)\.explanation\./);
  if (match) return day.phrases?.find((phrase: any) => phrase.id === match?.[1])?.english;

  match = fieldPath.match(/^vocabulary\.(.+)\.translation$/);
  if (match) return day.vocabulary?.find((vocab: any) => vocab.word === match?.[1])?.example;

  return undefined;
}

async function readEchoDays(repoRoot: string): Promise<any[]> {
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const mod = await import(pathToFileURL(sourcePath).href);
  const days = mod.ECHO_CONTENT_DAYS ?? mod.default?.ECHO_CONTENT_DAYS;
  return Array.isArray(days) ? days : [];
}

function renderMarkdown(report: any): string {
  return [
    `# GUSTAV Personal Plan Echo Day ${padDay(report.summary.dayIndex)} French Full-Day Text Packet`,
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

function renderBatchMarkdown(batchReport: any, batchTitle: string): string {
  return [
    `# ${batchTitle}`,
    '',
    `Run: \`${batchReport.runId}\``,
    '',
    `Status: \`${batchReport.status}\``,
    '',
    `Generated at: ${batchReport.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(batchReport.summary).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Day Results',
    '',
    ...batchReport.dayReports.map((report: any) => `- Day ${padDay(report.summary.dayIndex)}: \`${report.status}\`, rows \`${report.summary.generatedRows}/${report.summary.expectedRows}\`, reviewers \`${report.summary.rowsWithReviewerNeedsReview}\`, apply \`${report.summary.readyForApply}\``),
    '',
  ].join('\n');
}

function buildRows(day: any, pack: DayPack, findings: Finding[], sourcePath: string, repoRoot: string, generatedBy: string): any[] {
  return pack.fields.map((field) => {
    const source = resolveSource(day, field.fieldPath);
    if (!hasText(source?.ru) && !hasText(source?.es)) addFinding(findings, 'blocker', 'full_day_source_field_missing', `Missing source text for ${field.fieldPath}.`, rel(repoRoot, sourcePath));
    return {
      rowId: rowIdFromPath(pack.dayIndex, field.fieldPath),
      planId: 'echo',
      dayIndex: pack.dayIndex,
      targetLocale: 'fr',
      sourceLocale: 'es',
      fieldPath: field.fieldPath,
      fieldKind: field.fieldKind,
      englishAnchor: resolveEnglishAnchor(day, field.fieldPath),
      sourcePreview: { ru: source?.ru, uk: source?.uk, es: source?.es },
      frenchText: field.frenchText,
      reviewerStatus: 'needs_review',
      activationApproved: false,
      generatedBy,
    };
  });
}

async function generateDay(repoRoot: string, runDir: string, pack: DayPack, day: any, generatedBy: string): Promise<any> {
  const dayPad = padDay(pack.dayIndex);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', 'full_day');
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(auditsDir, { recursive: true });

  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const phraseMeaningRowsPath = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo', phraseLedgerName(pack.dayIndex));
  const rowsPath = path.join(outDir, `echo_day_${dayPad}_full_day_fr_rows.jsonl`);
  const reviewerQueuePath = path.join(outDir, `echo_day_${dayPad}_full_day_fr_reviewer_queue.tsv`);
  const packetJsonPath = path.join(auditsDir, `personal_plan_echo_day${dayPad}_french_full_day_text_packet.json`);
  const packetMdPath = path.join(auditsDir, `personal_plan_echo_day${dayPad}_french_full_day_text_packet.md`);

  const findings: Finding[] = [];
  if (!day) addFinding(findings, 'blocker', `echo_day_${dayPad}_missing`, `Echo day ${pack.dayIndex} is missing from source content.`, rel(repoRoot, sourcePath));

  let existingPhraseMeaningRowsForDay = 0;
  if (!fs.existsSync(phraseMeaningRowsPath)) {
    addFinding(findings, 'blocker', 'phrase_meaning_rows_missing', `Echo day ${pack.dayIndex} phrase meaning rows are missing.`, rel(repoRoot, phraseMeaningRowsPath));
  } else {
    const phraseRows = fs.readFileSync(phraseMeaningRowsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    existingPhraseMeaningRowsForDay = phraseRows.filter((row) => row.dayIndex === pack.dayIndex && row.reviewerStatus === 'needs_review' && row.activationApproved === false).length;
    if (existingPhraseMeaningRowsForDay !== 6) addFinding(findings, 'blocker', `phrase_meaning_rows_day_${dayPad}_incomplete`, `Expected 6 reviewer-needed phrase meaning rows for Echo day ${pack.dayIndex} but found ${existingPhraseMeaningRowsForDay}.`, rel(repoRoot, phraseMeaningRowsPath));
  }

  const rows = day ? buildRows(day, pack, findings, sourcePath, repoRoot, generatedBy) : [];
  const expectedRows = pack.fields.length;
  const duplicateFieldPaths = rows.length - new Set(rows.map((row) => row.fieldPath)).size;
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  const missingSourceFields = rows.filter((row) => !hasText(row.sourcePreview.ru) && !hasText(row.sourcePreview.es)).length;
  const missingFrenchFields = rows.filter((row) => !hasText(row.frenchText)).length;
  const cyrillicLeaksInFrenchFields = rows.filter((row) => hasCyrillic(row.frenchText)).length;
  const mojibakeFrenchFields = rows.filter((row) => hasMojibake(row.frenchText)).length;
  const brokenElisionFrenchFields = rows.filter((row) => hasBrokenElision(row.frenchText)).length;
  const sourceLanguageLeakRows = rows.filter((row) => hasSourceLanguageLeak(row.frenchText)).length;
  const unsafeSourceEchoRows = rows.filter((row) => hasUnsafeSourceEcho(row)).length;
  const frenchSignalMissingRows = rows.filter((row) => row.fieldKind !== 'vocabulary_translation' && row.frenchText.length >= 24 && !hasFrenchLanguageSignal(row.frenchText)).length;
  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;

  if (rows.length !== expectedRows) addFinding(findings, 'blocker', 'full_day_generated_row_count_mismatch', `Generated ${rows.length} rows; expected ${expectedRows}.`);
  if (duplicateFieldPaths > 0) addFinding(findings, 'blocker', 'full_day_duplicate_field_paths', `Generated rows have ${duplicateFieldPaths} duplicate field paths.`);
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'full_day_duplicate_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);
  if (missingSourceFields > 0) addFinding(findings, 'blocker', 'full_day_missing_source_fields', `Generated rows have ${missingSourceFields} missing source fields.`);
  if (missingFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_missing_french_fields', `Generated rows have ${missingFrenchFields} missing French fields.`);
  if (cyrillicLeaksInFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_cyrillic_leak_in_french_fields', `Generated rows have ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  if (mojibakeFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_mojibake_in_french_fields', `Generated rows have ${mojibakeFrenchFields} mojibake markers in French fields.`);
  if (brokenElisionFrenchFields > 0) addFinding(findings, 'blocker', 'full_day_broken_elision_in_french_fields', `Generated rows have ${brokenElisionFrenchFields} French fields with broken elision or missing apostrophes.`);
  if (sourceLanguageLeakRows > 0) addFinding(findings, 'blocker', 'full_day_source_language_leak_in_french_fields', `Generated rows have ${sourceLanguageLeakRows} likely non-French source-language leaks in French fields.`);
  if (unsafeSourceEchoRows > 0) addFinding(findings, 'blocker', 'full_day_target_equals_source', `Generated rows have ${unsafeSourceEchoRows} long French fields that exactly equal source text.`);
  if (frenchSignalMissingRows > 0) addFinding(findings, 'warning', 'full_day_french_signal_missing', `Generated rows have ${frenchSignalMissingRows} long non-vocabulary French fields without a clear French language signal.`);
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
    schemaVersion: `gustav-personal-plan-echo-day${dayPad}-french-full-day-text-packet-v0`,
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    inputs: { sourceFile: rel(repoRoot, sourcePath), phraseMeaningRows: rel(repoRoot, phraseMeaningRowsPath), planId: 'echo', dayIndex: pack.dayIndex },
    outputs: { rowsJsonl: rel(repoRoot, rowsPath), reviewerQueueTsv: rel(repoRoot, reviewerQueuePath), packetJson: rel(repoRoot, packetJsonPath), packetMd: rel(repoRoot, packetMdPath) },
    summary: {
      planId: 'echo',
      dayIndex: pack.dayIndex,
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
      brokenElisionFrenchFields,
      sourceLanguageLeakRows,
      unsafeSourceEchoRows,
      frenchSignalMissingRows,
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
      `This packet translates Echo day ${pack.dayIndex} full-day text fields except phrase meanings, which are already covered by the phrase-meaning layer.`,
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

  return report;
}

export async function runFullDayBatch(config: BatchConfig): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) throw new Error(config.scriptUsage);

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const days = await readEchoDays(repoRoot);
  const dayReports = [];

  for (const pack of config.dayPacks) {
    const day = days.find((item) => item.planId === 'echo' && item.dayIndex === pack.dayIndex);
    dayReports.push(await generateDay(repoRoot, runDir, pack, day, config.generatedBy));
  }

  const auditsDir = path.join(runDir, 'audits');
  const batchJsonPath = path.join(auditsDir, `${config.batchAuditBaseName}.json`);
  const batchMdPath = path.join(auditsDir, `${config.batchAuditBaseName}.md`);
  const totalBlockers = dayReports.reduce((sum, report) => sum + report.summary.blockers, 0);
  const totalWarnings = dayReports.reduce((sum, report) => sum + report.summary.warnings, 0);
  const batchReport = {
    schemaVersion: config.batchSchemaVersion,
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: totalBlockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    days: config.dayPacks.map((pack) => pack.dayIndex),
    summary: {
      daysCovered: dayReports.length,
      expectedRows: dayReports.reduce((sum, report) => sum + report.summary.expectedRows, 0),
      generatedRows: dayReports.reduce((sum, report) => sum + report.summary.generatedRows, 0),
      rowsWithFrench: dayReports.reduce((sum, report) => sum + report.summary.rowsWithFrench, 0),
      rowsWithReviewerNeedsReview: dayReports.reduce((sum, report) => sum + report.summary.rowsWithReviewerNeedsReview, 0),
      activationApprovedRows: dayReports.reduce((sum, report) => sum + report.summary.activationApprovedRows, 0),
      brokenElisionFrenchFields: dayReports.reduce((sum, report) => sum + report.summary.brokenElisionFrenchFields, 0),
      sourceLanguageLeakRows: dayReports.reduce((sum, report) => sum + report.summary.sourceLanguageLeakRows, 0),
      unsafeSourceEchoRows: dayReports.reduce((sum, report) => sum + report.summary.unsafeSourceEchoRows, 0),
      frenchSignalMissingRows: dayReports.reduce((sum, report) => sum + report.summary.frenchSignalMissingRows, 0),
      blockers: totalBlockers,
      warnings: totalWarnings,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    dayReports,
  };

  fs.writeFileSync(batchJsonPath, `${JSON.stringify(batchReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(batchMdPath, `${renderBatchMarkdown(batchReport, config.batchTitle)}\n`, 'utf8');

  console.log(`${config.batchTitle}: ${batchReport.status}`);
  console.log(`Generated rows: ${batchReport.summary.generatedRows}/${batchReport.summary.expectedRows}`);
  console.log(`Rows with French: ${batchReport.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${batchReport.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${batchReport.summary.activationApprovedRows}`);
  console.log(`Blockers: ${batchReport.summary.blockers}`);
  console.log(`Warnings: ${batchReport.summary.warnings}`);
  console.log(`Ready for apply: ${batchReport.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${batchReport.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, batchJsonPath)}`);

  if (batchReport.status !== 'PASS') process.exitCode = 1;
}
