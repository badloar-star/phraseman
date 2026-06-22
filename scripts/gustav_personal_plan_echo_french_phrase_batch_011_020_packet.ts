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
  generatedBy: 'gustav_personal_plan_echo_french_phrase_batch_011_020_packet';
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
  schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-011-020-packet-v0';
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
    dayRange: { from: 11; to: 20 };
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
const DAY_FROM = 11 as const;
const DAY_TO = 20 as const;
const EXPECTED_DAYS = 10;
const EXPECTED_PHRASES_PER_DAY = 6;
const GENERATED_BY = 'gustav_personal_plan_echo_french_phrase_batch_011_020_packet' as const;

const PHRASE_FR: Record<string, string> = {
  echo_d11_p1: "J'ai regardé un film hier.",
  echo_d11_p2: 'Elle a écouté de la musique hier soir.',
  echo_d11_p3: 'Nous avons parlé du film.',
  echo_d11_p4: "J'ai appris un nouveau mot hier.",
  echo_d11_p5: 'Il a appelé son ami la semaine dernière.',
  echo_d11_p6: 'Ils ont apprécié le spectacle hier soir.',
  echo_d12_p1: "L'information est sortie ce matin.",
  echo_d12_p2: 'Elle est allée au cinéma hier soir.',
  echo_d12_p3: "J'ai vu le film hier.",
  echo_d12_p4: 'Il en a entendu parler à la radio.',
  echo_d12_p5: "Ils ont dit que c'était très important.",
  echo_d12_p6: "Nous avons trouvé l'histoire en ligne.",
  echo_d13_p1: "Je lirai plus de livres cette année.",
  echo_d13_p2: 'Elle regardera le film ce soir.',
  echo_d13_p3: 'Nous irons au concert la semaine prochaine.',
  echo_d13_p4: "J'apprendrai l'anglais tous les jours.",
  echo_d13_p5: 'Il visitera un nouveau musée le mois prochain.',
  echo_d13_p6: 'Ils liront les nouvelles le matin.',
  echo_d14_p1: 'Ce livre est meilleur que celui-là.',
  echo_d14_p2: 'Le film est plus long que le livre.',
  echo_d14_p3: 'Cette histoire est plus intéressante que celle-là.',
  echo_d14_p4: 'Ce cinéma-là est plus ancien que celui-ci.',
  echo_d14_p5: "La nouvelle bibliothèque est plus grande que l'ancienne.",
  echo_d14_p6: 'Cet auteur est plus célèbre que celui-là.',
  echo_d15_p1: "J'ai lu un article intéressant hier.",
  echo_d15_p2: 'Sur quoi as-tu lu ?',
  echo_d15_p3: "C'était sur le changement climatique.",
  echo_d15_p4: "J'ai trouvé mon passage préféré très utile.",
  echo_d15_p5: 'Où as-tu trouvé cet article ?',
  echo_d15_p6: "J'ai partagé l'article avec mon ami.",
  echo_d16_p1: 'Tu devrais regarder ce film.',
  echo_d16_p2: 'Je pense que tu aimeras ce livre.',
  echo_d16_p3: "L'histoire est très intéressante.",
  echo_d16_p4: 'Le personnage principal voyage beaucoup.',
  echo_d16_p5: "J'ai vraiment aimé la fin.",
  echo_d16_p6: 'Je recommanderai ce livre à mon ami.',
  echo_d17_p1: 'Cette chaîne est plus fiable que celle-là.',
  echo_d17_p2: 'Les nouvelles arrivent plus vite sur ce site.',
  echo_d17_p3: 'Ce journaliste-là est plus célèbre que celui-ci.',
  echo_d17_p4: 'Cet article est plus long que ce rapport-là.',
  echo_d17_p5: 'Le vieux journal est moins populaire maintenant.',
  echo_d17_p6: "Cette source est meilleure pour l'actualité mondiale.",
  echo_d18_p1: "Je pense que c'est une nouvelle importante.",
  echo_d18_p2: 'Je crois que cela peut aider beaucoup de gens.',
  echo_d18_p3: 'Cette nouvelle peut changer beaucoup de choses.',
  echo_d18_p4: 'Je ne comprends pas bien cette histoire.',
  echo_d18_p5: 'Les gens devraient connaître ce problème.',
  echo_d18_p6: 'Je veux en savoir plus à ce sujet.',
  echo_d19_p1: "Que s'est-il passé dans l'actualité la semaine dernière ?",
  echo_d19_p2: "J'ai entendu parler d'un grand incendie.",
  echo_d19_p3: "Où cela s'est-il passé ?",
  echo_d19_p4: 'Le président a fait un discours important.',
  echo_d19_p5: 'Comment les gens ont-ils réagi à la nouvelle ?',
  echo_d19_p6: "Mon ami m'en a parlé.",
  echo_d20_p1: 'Je commencerai ce livre demain.',
  echo_d20_p2: 'Elle lira un nouveau roman cette semaine.',
  echo_d20_p3: 'Je veux finir cet article ce soir.',
  echo_d20_p4: 'Tu devrais lire ce magazine.',
  echo_d20_p5: "J'achèterai ce livre la semaine prochaine.",
  echo_d20_p6: "Il finira l'article ce soir.",
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

async function readEchoDays(repoRoot: string): Promise<PlanDay[]> {
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const mod = await import(pathToFileURL(sourcePath).href);
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
        generatedBy: GENERATED_BY,
      });
    }
  }
  return rows;
}

function validateDay(dayIndex: number, rows: GeneratedRow[], findings: Finding[]): DaySummary {
  const missingFrenchFields = rows.filter((row) => !hasText(row.meaningFr)).length;
  const cyrillicLeaksInFrenchFields = rows.filter((row) => hasCyrillic(row.meaningFr)).length;
  const mojibakeFrenchFields = rows.filter((row) => hasMojibake(row.meaningFr)).length;

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
    '# GUSTAV Personal Plan Echo French Phrase Batch 011-020 Packet',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_french_phrase_batch_011_020_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const contractPath = path.join(auditsDir, 'personal_plan_content_contract_packet.json');
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const rowsPath = path.join(outDir, 'echo_days_011_020_phrase_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_days_011_020_phrase_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_011_020_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_011_020_packet.md');

  const findings: Finding[] = [];
  if (!fs.existsSync(contractPath)) {
    addFinding(findings, 'blocker', 'personal_plan_contract_missing', 'P3 personal plan content contract packet is missing.', rel(repoRoot, contractPath));
  } else {
    const contract = readJson<Record<string, unknown>>(contractPath);
    const summary = object(contract.summary);
    if (contract.status !== 'PASS' || summary.readyForP8ReadinessExtension !== true) {
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
    schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-011-020-packet-v0',
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
      'This batch translates only Echo personal-plan phrase meanings for days 11-20.',
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

  console.log(`GUSTAV personal plan Echo French phrase batch 011-020 packet: ${report.status}`);
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
