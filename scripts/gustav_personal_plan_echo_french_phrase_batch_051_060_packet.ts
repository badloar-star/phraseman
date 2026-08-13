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
  generatedBy: 'gustav_personal_plan_echo_french_phrase_batch_051_060_packet';
};

const PLAN_ID = 'echo' as const;
const DAY_FROM = 51;
const DAY_TO = 60;
const EXPECTED_DAYS = 10;
const EXPECTED_PHRASES_PER_DAY = 6;
const GENERATED_BY = 'gustav_personal_plan_echo_french_phrase_batch_051_060_packet' as const;

const PHRASE_FR: Record<string, string> = {
  echo_d51_p1: "Puis-je avoir des serviettes, s'il vous plaît ?",
  echo_d51_p2: 'Veuillez nous apporter plus de serviettes.',
  echo_d51_p3: "Puis-je avoir des serviettes supplémentaires aujourd'hui ?",
  echo_d51_p4: 'Nous avons besoin de deux serviettes de plus maintenant.',
  echo_d51_p5: 'Pourriez-vous apporter des serviettes dans ma chambre ?',
  echo_d51_p6: 'Veuillez laisser les serviettes à la porte.',
  echo_d52_p1: "Puis-je avoir une serviette, s'il vous plaît ?",
  echo_d52_p2: "Puis-je avoir ma clé, s'il vous plaît ?",
  echo_d52_p3: "J'ai besoin d'une serviette propre maintenant.",
  echo_d52_p4: 'Pouvez-vous me donner la clé ?',
  echo_d52_p5: 'Avez-vous une serviette supplémentaire ?',
  echo_d52_p6: "J'ai perdu la clé de ma chambre.",
  echo_d53_p1: "Où est l'ascenseur, s'il vous plaît ?",
  echo_d53_p2: "L'ascenseur est à gauche.",
  echo_d53_p3: 'Où est la réception ?',
  echo_d53_p4: "C'est près des escaliers.",
  echo_d53_p5: 'La chambre est à droite.',
  echo_d53_p6: 'Excusez-moi, où est la sortie ?',
  echo_d54_p1: 'Quel est le mot de passe du Wi-Fi ?',
  echo_d54_p2: 'Le Wi-Fi est-il gratuit ici ?',
  echo_d54_p3: 'Quel est le nom du réseau Wi-Fi ?',
  echo_d54_p4: 'Le Wi-Fi est très lent.',
  echo_d54_p5: 'Pourquoi Internet ne fonctionne-t-il plus maintenant ?',
  echo_d54_p6: 'Comment est Internet dans les chambres ?',
  echo_d55_p1: 'Combien ça coûte ?',
  echo_d55_p2: 'Quel est le prix ici ?',
  echo_d55_p3: 'Cette chemise coûte-t-elle cher ?',
  echo_d55_p4: 'Combien coûtent les chaussures ?',
  echo_d55_p5: 'Où vend-on des chapeaux ?',
  echo_d55_p6: 'Vendez-vous du pain frais ici ?',
  echo_d56_p1: "Puis-je essayer une taille plus petite, s'il vous plaît ?",
  echo_d56_p2: 'Avez-vous ceci en grande taille ?',
  echo_d56_p3: 'Ceci est trop petit pour moi.',
  echo_d56_p4: 'Puis-je avoir la taille au-dessus ?',
  echo_d56_p5: 'Avez-vous la taille M en stock ?',
  echo_d56_p6: 'Cette taille me va parfaitement.',
  echo_d57_p1: 'Je voudrais payer par carte.',
  echo_d57_p2: 'Puis-je payer en espèces ?',
  echo_d57_p3: 'Combien ça coûte ?',
  echo_d57_p4: 'Acceptez-vous les cartes de crédit ?',
  echo_d57_p5: "Je voudrais un reçu, s'il vous plaît.",
  echo_d57_p6: 'Puis-je avoir la monnaie, s\'il vous plaît ?',
  echo_d58_p1: 'Où est le rayon alimentaire, s\'il vous plaît ?',
  echo_d58_p2: 'Où est le rayon des produits laitiers, s\'il vous plaît ?',
  echo_d58_p3: 'Excusez-moi, où est la caisse ?',
  echo_d58_p4: 'Où est le rayon viande, s\'il vous plaît ?',
  echo_d58_p5: 'Où est le rayon des surgelés ?',
  echo_d58_p6: 'Où est le rayon pain, s\'il vous plaît ?',
  echo_d59_p1: 'Je voudrais retourner ceci.',
  echo_d59_p2: 'Ça ne me va pas.',
  echo_d59_p3: 'Puis-je obtenir un remboursement ?',
  echo_d59_p4: 'Je ne l\'ai pas porté.',
  echo_d59_p5: 'Avez-vous le reçu ?',
  echo_d59_p6: 'Je voudrais un avoir en magasin.',
  echo_d60_p1: 'Pouvez-vous emballer ceci comme cadeau ?',
  echo_d60_p2: 'Veuillez l\'emballer joliment pour moi.',
  echo_d60_p3: "Puis-je avoir un emballage cadeau, s'il vous plaît ?",
  echo_d60_p4: 'Avez-vous des boîtes cadeau ici ?',
  echo_d60_p5: "C'est un cadeau pour mon ami.",
  echo_d60_p6: 'Pouvez-vous y ajouter un ruban ?',
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
    '# GUSTAV Personal Plan Echo French Phrase Batch 051-060 Packet',
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
    throw new Error('Usage: npx tsx scripts/gustav_personal_plan_echo_french_phrase_batch_051_060_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const outDir = path.join(runDir, 'generated', 'fr', 'app_domains', 'personal_plan', 'echo');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const contractPath = path.join(auditsDir, 'personal_plan_content_contract_packet.json');
  const sourcePath = path.resolve(repoRoot, 'app/plan_content_echo.ts');
  const rowsPath = path.join(outDir, 'echo_days_051_060_phrase_fr_rows.jsonl');
  const reviewerQueuePath = path.join(outDir, 'echo_days_051_060_phrase_fr_reviewer_queue.tsv');
  const packetJsonPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_051_060_packet.json');
  const packetMdPath = path.join(auditsDir, 'personal_plan_echo_french_phrase_batch_051_060_packet.md');

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
    schemaVersion: 'gustav-personal-plan-echo-french-phrase-batch-051-060-packet-v0',
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
      'This batch translates only Echo personal-plan phrase meanings for days 51-60.',
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

  console.log(`GUSTAV personal plan Echo French phrase batch 051-060 packet: ${report.status}`);
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
