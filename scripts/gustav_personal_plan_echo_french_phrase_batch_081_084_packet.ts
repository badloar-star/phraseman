import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type GeneratedRow = {
  rowId: string;
  targetLocale: 'fr';
  planId: 'echo';
  dayIndex: number;
  phraseId: string;
  english: string;
  meaningFr: string;
  sourcePreview: {
    topicEs?: string;
    outcomeEs?: string;
    meaningRu?: string;
    meaningUk?: string;
    meaningEs?: string;
  };
  reviewerStatus: 'needs_review';
  activationApproved: false;
  generatedBy: 'gustav_personal_plan_echo_french_phrase_batch_081_084_packet';
};

const PLAN_ID = 'echo' as const;
const DAY_FROM = 81;
const DAY_TO = 84;
const EXPECTED_DAYS = 4;
const EXPECTED_PHRASES_PER_DAY = 6;
const GENERATED_BY = 'gustav_personal_plan_echo_french_phrase_batch_081_084_packet' as const;

const PHRASE_FR: Record<string, string> = {
  echo_d81_p1: 'Où est la station de métro la plus proche ?',
  echo_d81_p2: "Y a-t-il un métro près d'ici ?",
  echo_d81_p3: "Où est l'entrée du métro ?",
  echo_d81_p4: 'Quelle est la ligne de métro ici ?',
  echo_d81_p5: 'Où est le distributeur de billets ?',
  echo_d81_p6: 'Est-ce la bonne station ?',
  echo_d82_p1: 'Où va ce bus ?',
  echo_d82_p2: 'Puis-je acheter un billet ici ?',
  echo_d82_p3: 'Combien coûte un taxi ?',
  echo_d82_p4: 'Où est la station de métro ?',
  echo_d82_p5: "J'ai besoin d'un taxi pour l'aéroport.",
  echo_d82_p6: 'Ce train va-t-il au centre-ville ?',
  echo_d83_p1: 'Ravi de vous rencontrer.',
  echo_d83_p2: 'Bonne chance pour tout !',
  echo_d83_p3: 'Il est temps de dire au revoir.',
  echo_d83_p4: "J'espère que tout ira bien.",
  echo_d83_p5: "C'est un excellent début.",
  echo_d83_p6: 'Tu fais un excellent travail.',
  echo_d84_p1: "Je parle anglais tous les jours.",
  echo_d84_p2: "Pouvez-vous m'aider, s'il vous plaît ?",
  echo_d84_p3: 'Où habites-tu maintenant ?',
  echo_d84_p4: 'Je comprends ce que tu veux dire.',
  echo_d84_p5: 'À quelle heure cela commence-t-il ?',
  echo_d84_p6: 'Tu peux bien le faire.',
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
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
  return /(?:Ð|Ñ|�|\?{3,})/.test(value);
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function lineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).length : 0;
}

async function readEchoDays(repoRoot: string): Promise<any[]> {
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const mod = await import(pathToFileURL(sourcePath).href);
  const days = mod.ECHO_CONTENT_DAYS ?? mod.default?.ECHO_CONTENT_DAYS;
  return Array.isArray(days) ? days : [];
}

function generateRows(days: any[], findings: Finding[]): GeneratedRow[] {
  const selectedDays = days.filter((day) => day.planId === PLAN_ID && day.dayIndex >= DAY_FROM && day.dayIndex <= DAY_TO);
  if (selectedDays.length !== EXPECTED_DAYS) {
    addFinding(findings, 'blocker', 'personal_plan_selected_day_count_mismatch', `Expected ${EXPECTED_DAYS} echo days but found ${selectedDays.length}.`, 'app/plan_content_echo.ts');
  }

  const rows: GeneratedRow[] = [];
  for (const day of selectedDays) {
    if (!Array.isArray(day.phrases) || day.phrases.length !== EXPECTED_PHRASES_PER_DAY) {
      addFinding(findings, 'blocker', 'personal_plan_day_phrase_count_mismatch', `echo day ${day.dayIndex} expected ${EXPECTED_PHRASES_PER_DAY} phrases but found ${day.phrases?.length ?? 0}.`, 'app/plan_content_echo.ts');
    }
    for (const phrase of day.phrases ?? []) {
      rows.push({
        rowId: `fr_${phrase.id}`,
        targetLocale: 'fr',
        planId: PLAN_ID,
        dayIndex: day.dayIndex,
        phraseId: phrase.id,
        english: phrase.english,
        meaningFr: PHRASE_FR[phrase.id] ?? '',
        sourcePreview: {
          topicEs: day.topic?.es,
          outcomeEs: day.outcome?.es,
          meaningRu: phrase.meaning?.ru,
          meaningUk: phrase.meaning?.uk,
          meaningEs: phrase.meaning?.es,
        },
        reviewerStatus: 'needs_review',
        activationApproved: false,
        generatedBy: GENERATED_BY,
      });
    }
  }
  return rows;
}

function renderMarkdown(report: any): string {
  const lines = [
    '# GUSTAV Personal Plan Echo French Phrase Batch 081-084 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Plan: \`${report.summary.planId}\``,
    `- Days: ${report.summary.days}`,
    `- Expected rows: ${report.summary.expectedRows}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`,
    `- Activation-approved rows: ${report.summary.activationApprovedRows}`,
    `- Duplicate phrase ids: ${report.summary.duplicatePhraseIds}`,
    `- Duplicate row ids: ${report.summary.duplicateRowIds}`,
    `- Missing French fields: ${report.summary.missingFrenchFields}`,
    `- Cyrillic leaks in French fields: ${report.summary.cyrillicLeaksInFrenchFields}`,
    `- Mojibake French fields: ${report.summary.mojibakeFrenchFields}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for French plan phrase review: ${report.summary.readyForFrenchPlanPhraseReview ? 'yes' : 'no'}`,
    `- Ready for full plan activation: ${report.summary.readyForFullPlanActivation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Day Summaries',
    '',
  ];

  for (const day of report.daySummaries) {
    lines.push(`- Day ${day.dayIndex}: ${day.generatedRows}/${day.expectedRows} rows, French ${day.rowsWithFrench}, reviewer ${day.rowsWithReviewerNeedsReview}, blockers ${day.blockers}`);
  }

  lines.push('', '## Outputs', '');
  lines.push(`- Rows JSONL: \`${report.outputs.rowsJsonl}\``);
  lines.push(`- Reviewer queue TSV: \`${report.outputs.reviewerQueueTsv}\``);
  lines.push(`- Packet JSON: \`${report.outputs.packetJson}\``);
  lines.push(`- Packet MD: \`${report.outputs.packetMd}\``);

  lines.push('', '## Generation Policy', '');
  for (const policy of report.generationPolicy) lines.push(`- ${policy}`);

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This packet did not modify production app files.',
    '- This packet did not modify source plan files.',
    '- This packet did not modify generated French lesson ledgers.',
    '- This packet did not write reviewer decisions.',
    '- This packet did not edit `scripts/gustav_readiness_gate.ts`.',
    '- This packet does not authorize production app apply.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_french_phrase_batch_081_084_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const contractPath = path.join(auditsDir, 'personal_plan_content_contract_packet.json');
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const rowsPath = path.join(outDir, 'echo_days_081_084_phrase_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_days_081_084_phrase_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_081_084_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_081_084_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(contractPath)) {
    addFinding(findings, 'blocker', 'personal_plan_contract_missing', 'P3 personal plan content contract packet is missing.', rel(repoRoot, contractPath));
  } else {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8')) as Record<string, any>;
    if (contract.status !== 'PASS' || contract.summary?.readyForP8ReadinessExtension !== true) {
      addFinding(findings, 'blocker', 'personal_plan_contract_not_ready', 'P3 personal plan content contract is not PASS/ready.', rel(repoRoot, contractPath));
    }
  }

  const expectedTranslationCount = EXPECTED_DAYS * EXPECTED_PHRASES_PER_DAY;
  if (Object.keys(PHRASE_FR).length !== expectedTranslationCount) {
    addFinding(findings, 'blocker', 'personal_plan_translation_table_count_mismatch', `Translation table has ${Object.keys(PHRASE_FR).length} rows; expected ${expectedTranslationCount}.`);
  }

  const days = await readEchoDays(repoRoot);
  const rows = generateRows(days, findings);
  const duplicatePhraseIds = rows.length - new Set(rows.map((row) => row.phraseId)).size;
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  const missingFrenchFields = rows.filter((row) => !hasText(row.meaningFr)).length;
  const cyrillicLeaksInFrenchFields = rows.filter((row) => hasCyrillic(row.meaningFr)).length;
  const mojibakeFrenchFields = rows.filter((row) => hasMojibake(row.meaningFr)).length;
  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;

  if (rows.length !== expectedTranslationCount) addFinding(findings, 'blocker', 'personal_plan_generated_row_count_mismatch', `Generated ${rows.length} rows; expected ${expectedTranslationCount}.`);
  if (duplicatePhraseIds > 0) addFinding(findings, 'blocker', 'personal_plan_duplicate_phrase_ids', `Generated rows have ${duplicatePhraseIds} duplicate phrase ids.`);
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'personal_plan_duplicate_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);
  if (missingFrenchFields > 0) addFinding(findings, 'blocker', 'personal_plan_missing_french_fields', `Generated rows have ${missingFrenchFields} missing French fields.`);
  if (cyrillicLeaksInFrenchFields > 0) addFinding(findings, 'blocker', 'personal_plan_cyrillic_leak_in_french_fields', `Generated rows have ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  if (mojibakeFrenchFields > 0) addFinding(findings, 'blocker', 'personal_plan_mojibake_in_french_fields', `Generated rows have ${mojibakeFrenchFields} mojibake markers in French fields.`);
  if (activationApprovedRows > 0) addFinding(findings, 'blocker', 'personal_plan_rows_activation_approved', 'Generated personal plan rows must not be activation-approved.');

  fs.writeFileSync(rowsPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  const tsvHeader = ['rowId', 'targetLocale', 'planId', 'dayIndex', 'phraseId', 'english', 'meaningFr', 'reviewerStatus', 'activationApproved'];
  const tsvRows = rows.map((row) => [
    row.rowId,
    row.targetLocale,
    row.planId,
    row.dayIndex,
    row.phraseId,
    row.english,
    row.meaningFr,
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
  const daySummaries = Array.from({ length: EXPECTED_DAYS }, (_, index) => DAY_FROM + index).map((dayIndex) => {
    const dayRows = rows.filter((row) => row.dayIndex === dayIndex);
    return {
      dayIndex,
      expectedRows: EXPECTED_PHRASES_PER_DAY,
      generatedRows: dayRows.length,
      rowsWithFrench: dayRows.filter((row) => hasText(row.meaningFr)).length,
      rowsWithReviewerNeedsReview: dayRows.filter((row) => row.reviewerStatus === 'needs_review').length,
      activationApprovedRows: dayRows.filter((row) => row.activationApproved).length,
      missingFrenchFields: dayRows.filter((row) => !hasText(row.meaningFr)).length,
      cyrillicLeaksInFrenchFields: dayRows.filter((row) => hasCyrillic(row.meaningFr)).length,
      mojibakeFrenchFields: dayRows.filter((row) => hasMojibake(row.meaningFr)).length,
      blockers: findings.filter((finding) => finding.message.includes(`day ${dayIndex}`) && finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.message.includes(`day ${dayIndex}`) && finding.severity === 'warning').length,
    };
  });

  const rowsWithReviewerNeedsReview = rows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const report = {
    schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-081-084-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' as Status : 'BLOCK' as Status,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      personalPlanContentContractPacket: rel(repoRoot, contractPath),
      sourceFile: rel(repoRoot, sourcePath),
      planId: PLAN_ID,
      dayRange: { from: DAY_FROM, to: DAY_TO },
    },
    outputs: {
      rowsJsonl: rel(repoRoot, rowsPath),
      reviewerQueueTsv: rel(repoRoot, reviewerQueuePath),
      packetJson: rel(repoRoot, packetJsonPath),
      packetMd: rel(repoRoot, packetMdPath),
    },
    summary: {
      planId: PLAN_ID,
      days: EXPECTED_DAYS,
      expectedRows: expectedTranslationCount,
      generatedRows: rows.length,
      rowsWithFrench: rows.filter((row) => hasText(row.meaningFr)).length,
      rowsWithReviewerNeedsReview,
      activationApprovedRows,
      duplicatePhraseIds,
      duplicateRowIds,
      missingFrenchFields,
      cyrillicLeaksInFrenchFields,
      mojibakeFrenchFields,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && rowsWithReviewerNeedsReview === rows.length,
      readyForFrenchPlanPhraseReview: blockers === 0 && rows.length === expectedTranslationCount,
      readyForFullPlanActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    daySummaries,
    generationPolicy: [
      'This batch translates only Echo personal-plan phrase meanings for days 81-84.',
      'Generated rows are reviewer-needed by default.',
      'No generated personal-plan row is activation-approved.',
      'Full personal-plan activation still requires intro, outcome, vocabulary, explanation, and full-day contract coverage.',
      'Source plan files are read-only inputs.',
      'This packet writes only GUSTAV pipeline outputs and audit artifacts.',
      'Production app apply remains blocked until reviewer decisions and explicit app-write approval exist.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      sourcePlanFilesModifiedByThisScript: false,
      generatedFrenchLessonLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      readinessGateModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(packetJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(packetMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV personal plan Echo French phrase batch 081-084 packet: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}/${report.summary.expectedRows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Rows needing reviewer: ${report.summary.rowsWithReviewerNeedsReview}`);
  console.log(`Activation-approved rows: ${report.summary.activationApprovedRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Ready for French plan phrase review: ${report.summary.readyForFrenchPlanPhraseReview ? 'yes' : 'no'}`);
  console.log(`Ready for full plan activation: ${report.summary.readyForFullPlanActivation ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, packetJsonPath)}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
