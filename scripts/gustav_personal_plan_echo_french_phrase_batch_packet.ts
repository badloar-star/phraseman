import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

type Status = 'PASS' | 'BLOCK';
type FindingSeverity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: FindingSeverity;
  code: string;
  message: string;
  path?: string;
};

type PlanPhrase = {
  id: string;
  english: string;
  meaning?: Record<string, string>;
};

type PlanDay = {
  planId: string;
  dayIndex: number;
  topic?: Record<string, string>;
  outcome?: Record<string, string>;
  level?: string;
  phrases: PlanPhrase[];
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
  generatedBy: 'gustav_personal_plan_echo_french_phrase_batch_packet';
};

type DaySummary = {
  dayIndex: number;
  expectedRows: number;
  generatedRows: number;
  rowsWithFrench: number;
  rowsWithReviewerNeedsReview: number;
  activationApprovedRows: number;
  missingFrenchFields: number;
  cyrillicLeaksInFrenchFields: number;
  mojibakeFrenchFields: number;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: {
    personalPlanContentContractPacket: string;
    sourceFile: string;
    planId: 'echo';
    dayRange: { from: 1; to: 10 };
  };
  outputs: {
    rowsJsonl: string;
    reviewerQueueTsv: string;
    packetJson: string;
    packetMd: string;
  };
  summary: {
    planId: 'echo';
    days: number;
    expectedRows: number;
    generatedRows: number;
    rowsWithFrench: number;
    rowsWithReviewerNeedsReview: number;
    activationApprovedRows: number;
    duplicatePhraseIds: number;
    duplicateRowIds: number;
    missingFrenchFields: number;
    cyrillicLeaksInFrenchFields: number;
    mojibakeFrenchFields: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForFrenchPlanPhraseReview: boolean;
    readyForFullPlanActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  daySummaries: DaySummary[];
  generationPolicy: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    sourcePlanFilesModifiedByThisScript: false;
    generatedFrenchLessonLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    readinessGateModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

const PLAN_ID = 'echo' as const;
const DAY_FROM = 1 as const;
const DAY_TO = 10 as const;
const EXPECTED_DAYS = 10;
const EXPECTED_PHRASES_PER_DAY = 6;

const PHRASE_FR: Record<string, string> = {
  echo_d1_p1: "Je m'appelle Anna.",
  echo_d1_p2: "Je viens d'Ukraine.",
  echo_d1_p3: 'Elle est enseignante.',
  echo_d1_p4: 'Nous sommes nouveaux ici.',
  echo_d1_p5: 'Je suis prêt à commencer.',
  echo_d1_p6: "C'est mon ami.",
  echo_d2_p1: 'Je ne suis pas sûr de ça.',
  echo_d2_p2: "Cette info n'est pas vraie.",
  echo_d2_p3: 'Nous ne sommes pas de la même ville.',
  echo_d2_p4: "Il n'est pas journaliste.",
  echo_d2_p5: "L'entretien n'est pas encore prêt.",
  echo_d2_p6: 'Ce ne sont pas mes collègues.',
  echo_d3_p1: "Je lis les nouvelles chaque matin.",
  echo_d3_p2: 'Elle regarde la télé tous les soirs.',
  echo_d3_p3: 'Il lit un magazine chaque semaine.',
  echo_d3_p4: 'Nous écoutons la radio tous les jours.',
  echo_d3_p5: 'Ils lisent un journal chaque dimanche.',
  echo_d3_p6: 'Je regarde un film chaque week-end.',
  echo_d4_p1: 'Je ne regarde pas souvent la télé.',
  echo_d4_p2: "Elle ne lit pas les nouvelles.",
  echo_d4_p3: "Il n'écoute pas la radio.",
  echo_d4_p4: "Nous n'allons pas au cinéma.",
  echo_d4_p5: "Ils n'achètent pas de journaux.",
  echo_d4_p6: "Mon ami n'utilise pas les réseaux sociaux.",
  echo_d5_p1: 'Tu aimes lire ?',
  echo_d5_p2: "Qu'est-ce que tu lis tous les jours ?",
  echo_d5_p3: 'Est-ce que tu regardes les infos ?',
  echo_d5_p4: 'Où achètes-tu des livres ?',
  echo_d5_p5: 'Est-ce que tu écoutes la radio ?',
  echo_d5_p6: 'À quelle fréquence lis-tu ?',
  echo_d6_p1: "Qu'est-ce que tu lis d'habitude ?",
  echo_d6_p2: 'Où regardes-tu les infos ?',
  echo_d6_p3: 'Quand écoutes-tu la radio ?',
  echo_d6_p4: "Comment t'informes-tu ?",
  echo_d6_p5: 'Qui suit-elle en ligne ?',
  echo_d6_p6: 'Quelle chaîne regarde-t-il ?',
  echo_d7_p1: "J'ai un journal préféré.",
  echo_d7_p2: 'Elle a une bonne radio.',
  echo_d7_p3: "J'ai une chaîne d'information à la maison.",
  echo_d7_p4: 'Il a une émission du matin préférée.',
  echo_d7_p5: 'Nous avons deux télévisions dans notre appartement.',
  echo_d7_p6: 'Ils ont une grande collection de films.',
  echo_d8_p1: 'Je lis les nouvelles le matin.',
  echo_d8_p2: 'Elle regarde la télé le soir.',
  echo_d8_p3: 'Il écoute la radio le dimanche.',
  echo_d8_p4: 'Nous regardons les infos à sept heures.',
  echo_d8_p5: 'Je lis les infos sur mon téléphone le matin.',
  echo_d8_p6: 'Ils consultent la météo chaque soir.',
  echo_d9_p1: 'Il y a un parc près de chez moi.',
  echo_d9_p2: 'Il y a un café dans cette rue.',
  echo_d9_p3: 'Il y a un grand supermarché ici.',
  echo_d9_p4: 'Il y a deux écoles dans ce quartier.',
  echo_d9_p5: "Il n'y a pas d'hôpital dans ma ville.",
  echo_d9_p6: 'Il y a une bibliothèque calme derrière le parc.',
  echo_d10_p1: 'Je peux lire des textes anglais maintenant.',
  echo_d10_p2: 'Elle peut comprendre les infos.',
  echo_d10_p3: 'Nous ne pouvons pas trouver la chaîne.',
  echo_d10_p4: 'Peut-il regarder le film ce soir ?',
  echo_d10_p5: 'Je peux lire de courtes nouvelles chaque matin.',
  echo_d10_p6: 'Tu peux apprendre beaucoup grâce aux infos.',
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function b(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function addFinding(findings: Finding[], severity: FindingSeverity, code: string, message: string, filePath?: string): void {
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

async function importTsModule(repoRoot: string, relativePath: string): Promise<Record<string, any>> {
  const full = path.resolve(repoRoot, relativePath);
  return import(pathToFileURL(full).href);
}

async function readEchoDays(repoRoot: string): Promise<PlanDay[]> {
  const mod = await importTsModule(repoRoot, 'app/plan_content_echo.ts');
  const days = mod.ECHO_CONTENT_DAYS ?? mod.default?.ECHO_CONTENT_DAYS;
  return Array.isArray(days) ? days as PlanDay[] : [];
}

function generateRows(days: PlanDay[], findings: Finding[]): GeneratedRow[] {
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
        generatedBy: 'gustav_personal_plan_echo_french_phrase_batch_packet',
      });
    }
  }
  return rows;
}

function validateDay(dayIndex: number, rows: GeneratedRow[], findings: Finding[]): DaySummary {
  let missingFrenchFields = 0;
  let cyrillicLeaksInFrenchFields = 0;
  let mojibakeFrenchFields = 0;
  for (const row of rows) {
    if (!hasText(row.meaningFr)) missingFrenchFields += 1;
    if (hasCyrillic(row.meaningFr)) cyrillicLeaksInFrenchFields += 1;
    if (hasMojibake(row.meaningFr)) mojibakeFrenchFields += 1;
  }

  if (rows.length !== EXPECTED_PHRASES_PER_DAY) {
    addFinding(findings, 'blocker', 'personal_plan_generated_day_row_count_mismatch', `echo day ${dayIndex} generated ${rows.length} rows; expected ${EXPECTED_PHRASES_PER_DAY}.`);
  }
  if (missingFrenchFields > 0) {
    addFinding(findings, 'blocker', 'personal_plan_missing_french_fields', `echo day ${dayIndex} has ${missingFrenchFields} missing French fields.`);
  }
  if (cyrillicLeaksInFrenchFields > 0) {
    addFinding(findings, 'blocker', 'personal_plan_cyrillic_leak_in_french_fields', `echo day ${dayIndex} has ${cyrillicLeaksInFrenchFields} Cyrillic leaks in French fields.`);
  }
  if (mojibakeFrenchFields > 0) {
    addFinding(findings, 'blocker', 'personal_plan_mojibake_in_french_fields', `echo day ${dayIndex} has ${mojibakeFrenchFields} mojibake markers in French fields.`);
  }

  const dayFindings = findings.filter((finding) => finding.message.includes(`day ${dayIndex}`));
  return {
    dayIndex,
    expectedRows: EXPECTED_PHRASES_PER_DAY,
    generatedRows: rows.length,
    rowsWithFrench: rows.filter((row) => hasText(row.meaningFr)).length,
    rowsWithReviewerNeedsReview: rows.filter((row) => row.reviewerStatus === 'needs_review').length,
    activationApprovedRows: rows.filter((row) => row.activationApproved).length,
    missingFrenchFields,
    cyrillicLeaksInFrenchFields,
    mojibakeFrenchFields,
    blockers: dayFindings.filter((finding) => finding.severity === 'blocker').length,
    warnings: dayFindings.filter((finding) => finding.severity === 'warning').length,
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Personal Plan Echo French Phrase Batch Packet',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_french_phrase_batch_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const contractPath = path.join(auditsDir, 'personal_plan_content_contract_packet.json');
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const rowsPath = path.join(outDir, 'echo_days_001_010_phrase_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_days_001_010_phrase_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(contractPath)) {
    addFinding(findings, 'blocker', 'personal_plan_contract_missing', 'P3 personal plan content contract packet is missing.', rel(repoRoot, contractPath));
  } else {
    const contract = readJson<Record<string, unknown>>(contractPath);
    const summary = object(contract.summary);
    if (contract.status !== 'PASS' || !b(summary, 'readyForP8ReadinessExtension')) {
      addFinding(findings, 'blocker', 'personal_plan_contract_not_ready', 'P3 personal plan content contract is not PASS/ready.', rel(repoRoot, contractPath));
    }
  }

  const expectedTranslationCount = EXPECTED_DAYS * EXPECTED_PHRASES_PER_DAY;
  if (Object.keys(PHRASE_FR).length !== expectedTranslationCount) {
    addFinding(findings, 'blocker', 'personal_plan_translation_table_count_mismatch', `Translation table has ${Object.keys(PHRASE_FR).length} rows; expected ${expectedTranslationCount}.`);
  }

  const days = await readEchoDays(repoRoot);
  const rows = generateRows(days, findings);
  const daySummaries = Array.from({ length: EXPECTED_DAYS }, (_, index) => DAY_FROM + index)
    .map((dayIndex) => validateDay(dayIndex, rows.filter((row) => row.dayIndex === dayIndex), findings));

  const duplicatePhraseIds = rows.length - new Set(rows.map((row) => row.phraseId)).size;
  const duplicateRowIds = rows.length - new Set(rows.map((row) => row.rowId)).size;
  if (duplicatePhraseIds > 0) addFinding(findings, 'blocker', 'personal_plan_duplicate_phrase_ids', `Generated rows have ${duplicatePhraseIds} duplicate phrase ids.`);
  if (duplicateRowIds > 0) addFinding(findings, 'blocker', 'personal_plan_duplicate_row_ids', `Generated rows have ${duplicateRowIds} duplicate row ids.`);

  const activationApprovedRows = rows.filter((row) => row.activationApproved).length;
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

  const missingFrenchFields = daySummaries.reduce((sum, day) => sum + day.missingFrenchFields, 0);
  const cyrillicLeaksInFrenchFields = daySummaries.reduce((sum, day) => sum + day.cyrillicLeaksInFrenchFields, 0);
  const mojibakeFrenchFields = daySummaries.reduce((sum, day) => sum + day.mojibakeFrenchFields, 0);
  const rowsWithReviewerNeedsReview = rows.filter((row) => row.reviewerStatus === 'needs_review').length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const report: Report = {
    schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
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
      'This batch translates only Echo personal-plan phrase meanings for days 1-10.',
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

  console.log(`GUSTAV personal plan Echo French phrase batch packet: ${report.status}`);
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
