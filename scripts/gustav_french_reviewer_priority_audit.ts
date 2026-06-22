import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type QueueRow = {
  lessonId: number;
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  quizBlank: string;
  quizCorrect: string;
  quizDistractors: string[];
  quizCategory: string;
  currentReviewerStatus: string;
  currentActivationStatus: string;
  reviewerDecision: string;
  reviewerNotes: string;
};

type LedgerRow = {
  phraseId: string;
  evidenceClaimIds?: string[];
  requiredEvidence?: string[];
  reviewerStatus: string;
  activationStatus: string;
};

type LessonLedger = {
  lessonId: number;
  activationStatus: string;
  activeAppSeedAllowed: boolean;
  rows: LedgerRow[];
};

type DuplicateGroup = {
  proposedFrench: string;
  disposition: string;
  reviewerNote: string;
  rows: Array<{
    lessonId: number;
    phraseId: string;
  }>;
};

type DuplicatePacket = {
  groups?: DuplicateGroup[];
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  phraseId?: string;
};

type PriorityTier = 'high' | 'medium' | 'low';

type PriorityRow = QueueRow & {
  sourceQueueIndex: number;
  priorityTier: PriorityTier;
  priorityScore: number;
  priorityReasons: string[];
  reviewFocus: string[];
  duplicateDisposition: string;
  duplicateReviewerNote: string;
  evidenceClaimIds: string[];
  requiredEvidence: string[];
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-priority-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceQueueRows: number;
    generatedLedgers: number;
    ledgerRows: number;
    priorityRows: number;
    highPriorityRows: number;
    mediumPriorityRows: number;
    lowPriorityRows: number;
    duplicateFrenchRows: number;
    questionMismatchCandidates: number;
    negationMismatchCandidates: number;
    quizIntegrityCandidates: number;
    lengthRatioCandidates: number;
    complexGrammarRows: number;
    rowsWithRequiredRuUkReview: number;
    rowsWithReviewerWorkspaceValues: number;
    rowsWithActivationViolations: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: {
    reviewerQueueJsonl: string;
    duplicateTranslationPacket: string;
    translationQaAudit: string;
    decisionTemplateIntegrityAudit: string;
  };
  outputArtifacts: {
    priorityQueueJsonl: string;
    priorityQueueTsv: string;
    priorityAuditJson: string;
    priorityAuditMd: string;
  };
  hashes: {
    sourceQueueSha256: string;
    priorityQueueJsonlSha256: string;
    priorityQueueTsvSha256: string;
  };
  reasonCounts: Record<string, number>;
  lessonPrioritySummary: Array<{
    lessonId: number;
    rows: number;
    high: number;
    medium: number;
    low: number;
    averageScore: number;
  }>;
  topPriorityRows: PriorityRow[];
  findings: Finding[];
};

const TSV_HEADERS = [
  'sourceQueueIndex',
  'lessonId',
  'phraseId',
  'priorityTier',
  'priorityScore',
  'englishBase',
  'proposedFrench',
  'quizCategory',
  'priorityReasons',
  'reviewFocus',
  'duplicateDisposition',
  'currentReviewerStatus',
  'currentActivationStatus',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function queueKey(row: Pick<QueueRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/'\s+/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuizValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/'\s+/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized.match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

function wordCount(value: string): number {
  return tokens(value).length;
}

function blankCount(value: string): number {
  return (value.match(/___/g) ?? []).length;
}

function reconstructedQuiz(row: QueueRow): string {
  return row.quizBlank.replace('___', row.quizCorrect).replace(/\s+/g, ' ').trim();
}

function quizReconstructs(row: QueueRow): boolean {
  return normalizeQuizValue(reconstructedQuiz(row)) === normalizeQuizValue(row.proposedFrench);
}

function englishHasQuestion(value: string): boolean {
  const normalized = normalizeText(value);
  if (/^(do not|don't|dont|does not|doesn't|doesnt|did not|didn't|didnt)\b/.test(normalized)) return false;
  return /\?$/.test(value.trim()) || /^(who|what|when|where|why|how|which|whose|do|does|did|is|are|am|was|were|can|could|will|would|should|shall|may|might|must|have|has|had)\b/.test(normalized);
}

function frenchHasQuestion(value: string): boolean {
  const normalized = normalizeText(value);
  return /\?$/.test(value.trim()) || /^(est-ce que|qu'|que|qui|quoi|ou|quand|pourquoi|comment|combien|quel|quelle|quels|quelles|as-tu|avez-vous|est-il|est-elle|suis-je|etes-vous|dois-je)\b/.test(normalized);
}

function englishHasNegation(value: string): boolean {
  const normalized = normalizeText(value);
  return /\b(no|not|never|nobody|nothing|nowhere|none|neither|nor|cannot|can't|dont|don't|doesnt|doesn't|didnt|didn't|isnt|isn't|arent|aren't|wasnt|wasn't|werent|weren't|wont|won't|wouldnt|wouldn't|shouldnt|shouldn't|couldnt|couldn't|havent|haven't|hasnt|hasn't|hadnt|hadn't)\b/.test(normalized);
}

function frenchHasNegation(value: string): boolean {
  const normalized = normalizeText(value);
  const hasNe = /\bne\b|\bn'/.test(normalized);
  const hasStandaloneNegative = /\b(pas|jamais|aucun|aucune)\b/.test(normalized);
  const hasNeBoundNegative = hasNe && /\b(plus|rien|personne)\b/.test(normalized);
  return hasStandaloneNegative || hasNeBoundNegative;
}

function isComplexCategory(category: string): boolean {
  return /(passe|imparfait|conditionnel|subjonctif|relative|relatif|reported|si_|pronoun|pronom|object|dont|lequel|laquelle|auxiliary|irregular_participle|used_to|future|comparative|superlative)/i.test(category);
}

function complexCategoryWeight(category: string): number {
  if (/(subjonctif|conditionnel|reported|dont|lequel|laquelle|relative|relatif|irregular_participle|si_)/i.test(category)) return 3;
  if (/(passe|imparfait|pronoun|pronom|object|used_to|future|comparative|superlative)/i.test(category)) return 2;
  return 0;
}

function sharedEnglishFrenchTokens(english: string, french: string): string[] {
  const commonAllowed = new Set([
    'taxi',
    'restaurant',
    'hotel',
    'pizza',
    'radio',
    'internet',
    'bus',
    'train',
    'menu',
    'tennis',
    'football',
    'weekend',
    'film',
    'email',
    'video',
    'photo',
    'piano',
  ]);
  const englishTokens = new Set(tokens(english).filter((token) => token.length >= 4 && !commonAllowed.has(token)));
  return tokens(french).filter((token, index, all) => englishTokens.has(token) && all.indexOf(token) === index);
}

function addReason(
  reasons: string[],
  focus: string[],
  reasonCounts: Record<string, number>,
  reason: string,
  focusText: string,
): void {
  reasons.push(reason);
  if (!focus.includes(focusText)) focus.push(focusText);
  reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
}

function tierForScore(score: number): PriorityTier {
  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderTsv(rows: PriorityRow[]): string {
  const lines = [TSV_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(TSV_HEADERS.map((header) => tsvCell(row[header as keyof PriorityRow])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Priority Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Source queue rows: ${report.summary.sourceQueueRows}`,
    `- Generated ledgers: ${report.summary.generatedLedgers}`,
    `- Ledger rows: ${report.summary.ledgerRows}`,
    `- Priority rows: ${report.summary.priorityRows}`,
    `- High priority rows: ${report.summary.highPriorityRows}`,
    `- Medium priority rows: ${report.summary.mediumPriorityRows}`,
    `- Low priority rows: ${report.summary.lowPriorityRows}`,
    `- Duplicate French rows: ${report.summary.duplicateFrenchRows}`,
    `- Question mismatch candidates: ${report.summary.questionMismatchCandidates}`,
    `- Negation mismatch candidates: ${report.summary.negationMismatchCandidates}`,
    `- Quiz integrity candidates: ${report.summary.quizIntegrityCandidates}`,
    `- Length ratio candidates: ${report.summary.lengthRatioCandidates}`,
    `- Complex grammar rows: ${report.summary.complexGrammarRows}`,
    `- Rows with required RU/UK review: ${report.summary.rowsWithRequiredRuUkReview}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows with activation violations: ${report.summary.rowsWithActivationViolations}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Output Artifacts',
    '',
    `- Priority JSONL: \`${report.outputArtifacts.priorityQueueJsonl}\``,
    `- Priority TSV: \`${report.outputArtifacts.priorityQueueTsv}\``,
    `- Audit JSON: \`${report.outputArtifacts.priorityAuditJson}\``,
    `- Audit MD: \`${report.outputArtifacts.priorityAuditMd}\``,
    '',
    '## Top Reasons',
    '',
  ];
  const topReasons = Object.entries(report.reasonCounts).sort((a, bValue) => bValue[1] - a[1]).slice(0, 20);
  if (topReasons.length === 0) {
    lines.push('No priority reasons.');
  } else {
    for (const [reason, count] of topReasons) {
      lines.push(`- \`${reason}\`: ${count}`);
    }
  }
  lines.push('', '## Highest Priority Rows', '');
  for (const row of report.topPriorityRows.slice(0, 50)) {
    lines.push(`- \`${row.priorityTier}\` score ${row.priorityScore} \`${row.phraseId}\` (${row.quizCategory}): ${row.englishBase} -> ${row.proposedFrench}; reasons: ${row.priorityReasons.join(', ') || 'none'}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.phraseId ? ` (${finding.phraseId})` : ''}${finding.path ? ` path=${finding.path}` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This is a reviewer support artifact only.');
  lines.push('- It does not accept, reject, correct, or import any row.');
  lines.push('- It does not modify generated lesson ledgers.');
  lines.push('- It does not create production apply approval.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_priority_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const queuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const duplicatePath = path.join(auditsDir, 'french_duplicate_translation_review_packet.json');
  const translationQaPath = path.join(auditsDir, 'french_translation_qa_audit.json');
  const decisionTemplateIntegrityPath = path.join(auditsDir, 'french_review_decision_template_integrity_audit.json');
  const findings: Finding[] = [];

  const queueRows = parseJsonl<QueueRow>(queuePath);
  const duplicatePacket = fs.existsSync(duplicatePath) ? readJson<DuplicatePacket>(duplicatePath) : { groups: [] };
  const translationQa = fs.existsSync(translationQaPath) ? asRecord(readJson<unknown>(translationQaPath)) : {};
  const translationQaSummary = asRecord(translationQa.summary);
  const decisionTemplateIntegrity = fs.existsSync(decisionTemplateIntegrityPath) ? asRecord(readJson<unknown>(decisionTemplateIntegrityPath)) : {};
  const decisionTemplateIntegritySummary = asRecord(decisionTemplateIntegrity.summary);

  const ledgerFiles = walkFiles(lessonsDir).filter((file) => /^lesson\d+_row_ledger\.json$/.test(path.basename(file)));
  const ledgerRowsByKey = new Map<string, LedgerRow>();
  let ledgerRows = 0;
  for (const ledgerFile of ledgerFiles) {
    const ledger = readJson<LessonLedger>(ledgerFile);
    if (ledger.activationStatus !== 'blocked_pending_source_review' || ledger.activeAppSeedAllowed !== false) {
      findings.push({
        severity: 'blocker',
        code: 'ledger_activation_lock_violation',
        message: 'Generated lesson ledger is not locked pending source review.',
        path: artifactPath(repoRoot, ledgerFile),
      });
    }
    ledgerRows += ledger.rows.length;
    for (const row of ledger.rows) {
      ledgerRowsByKey.set(`${ledger.lessonId}:${row.phraseId}`, row);
    }
  }

  const duplicateByKey = new Map<string, DuplicateGroup>();
  for (const group of duplicatePacket.groups ?? []) {
    for (const row of group.rows) {
      duplicateByKey.set(`${row.lessonId}:${row.phraseId}`, group);
    }
  }

  const reasonCounts: Record<string, number> = {};
  const priorityRows: PriorityRow[] = [];
  let questionMismatchCandidates = 0;
  let negationMismatchCandidates = 0;
  let quizIntegrityCandidates = 0;
  let lengthRatioCandidates = 0;
  let complexGrammarRows = 0;
  let rowsWithRequiredRuUkReview = 0;
  let rowsWithReviewerWorkspaceValues = 0;
  let rowsWithActivationViolations = 0;

  for (const [sourceQueueIndex, row] of queueRows.entries()) {
    let score = 0;
    const reasons: string[] = [];
    const reviewFocus: string[] = [];
    const ledgerRow = ledgerRowsByKey.get(queueKey(row));
    const duplicateGroup = duplicateByKey.get(queueKey(row));

    if (row.reviewerDecision || row.reviewerNotes) {
      rowsWithReviewerWorkspaceValues += 1;
      findings.push({
        severity: 'blocker',
        code: 'reviewer_workspace_not_empty',
        message: 'Reviewer queue row already contains reviewer workspace values.',
        phraseId: row.phraseId,
      });
    }
    if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked' || ledgerRow?.reviewerStatus !== 'needs_review' || ledgerRow?.activationStatus !== 'blocked') {
      rowsWithActivationViolations += 1;
      findings.push({
        severity: 'blocker',
        code: 'row_activation_lock_violation',
        message: 'Reviewer queue row or generated ledger row is not locked for review.',
        phraseId: row.phraseId,
      });
    }

    if (blankCount(row.quizBlank) !== 1 || !quizReconstructs(row)) {
      score += 8;
      quizIntegrityCandidates += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'quiz_integrity_check', 'Verify quiz blank, correct answer, and final French phrase.');
    }

    const normalizedCorrect = normalizeQuizValue(row.quizCorrect);
    const normalizedDistractors = row.quizDistractors.map(normalizeQuizValue);
    if (normalizedDistractors.includes(normalizedCorrect) || new Set(normalizedDistractors).size !== normalizedDistractors.length || row.quizDistractors.length < 2) {
      score += 6;
      quizIntegrityCandidates += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'quiz_distractor_check', 'Verify distractors are distinct and not equal to the answer.');
    }

    const englishQuestion = englishHasQuestion(row.englishBase);
    const frenchQuestion = frenchHasQuestion(row.proposedFrench);
    if (englishQuestion !== frenchQuestion) {
      score += 5;
      questionMismatchCandidates += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'question_form_check', 'Compare English source question form against French question form.');
    }

    const englishNegation = englishHasNegation(row.englishBase);
    const frenchNegation = frenchHasNegation(row.proposedFrench);
    if (englishNegation !== frenchNegation) {
      score += 5;
      negationMismatchCandidates += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'negation_check', 'Compare source negation against French negation.');
    }

    const englishWords = wordCount(row.englishBase);
    const frenchWords = wordCount(row.proposedFrench);
    const lengthRatio = englishWords > 0 ? frenchWords / englishWords : 1;
    if (englishWords >= 4 && (lengthRatio < 0.45 || lengthRatio > 2.5)) {
      score += 3;
      lengthRatioCandidates += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'length_ratio_check', 'Check whether the French phrase is unusually short or long for the source.');
    }

    const complexWeight = complexCategoryWeight(row.quizCategory);
    if (isComplexCategory(row.quizCategory)) {
      score += complexWeight;
      complexGrammarRows += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'complex_grammar_check', `Verify French grammar category ${row.quizCategory}.`);
    }

    if (duplicateGroup) {
      score += duplicateGroup.disposition === 'expected_present_aspect_collapse' ? 2 : 5;
      addReason(reasons, reviewFocus, reasonCounts, 'duplicate_french_check', 'Confirm duplicate French value is acceptable for the source meanings.');
    }

    const sharedTokens = sharedEnglishFrenchTokens(row.englishBase, row.proposedFrench);
    if (sharedTokens.length >= 2) {
      score += 2;
      addReason(reasons, reviewFocus, reasonCounts, 'shared_source_tokens_check', `Check shared source tokens: ${sharedTokens.join(', ')}.`);
    }

    const requiredEvidence = ledgerRow?.requiredEvidence ?? [];
    const evidenceClaimIds = ledgerRow?.evidenceClaimIds ?? [];
    if (requiredEvidence.includes('ru_uk_meaning_review')) {
      score += 1;
      rowsWithRequiredRuUkReview += 1;
      addReason(reasons, reviewFocus, reasonCounts, 'ru_uk_meaning_review_required', 'Compare English, Russian, and Ukrainian source meanings before accepting.');
    }

    if (reasons.length === 0) {
      addReason(reasons, reviewFocus, reasonCounts, 'standard_human_review', 'Perform normal source, French, and quiz review.');
    }

    priorityRows.push({
      ...row,
      sourceQueueIndex,
      priorityTier: tierForScore(score),
      priorityScore: score,
      priorityReasons: reasons,
      reviewFocus,
      duplicateDisposition: duplicateGroup?.disposition ?? '',
      duplicateReviewerNote: duplicateGroup?.reviewerNote ?? '',
      evidenceClaimIds,
      requiredEvidence,
    });
  }

  priorityRows.sort((a, bValue) => {
    if (bValue.priorityScore !== a.priorityScore) return bValue.priorityScore - a.priorityScore;
    if (a.lessonId !== bValue.lessonId) return a.lessonId - bValue.lessonId;
    return a.sourceQueueIndex - bValue.sourceQueueIndex;
  });

  if (queueRows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'source_queue_row_count_invalid',
      message: `Expected 1600 reviewer queue rows, found ${queueRows.length}.`,
      path: artifactPath(repoRoot, queuePath),
    });
  }
  if (ledgerFiles.length !== 32 || ledgerRows !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'generated_ledger_count_invalid',
      message: `Expected 32 ledgers and 1600 rows, found ledgers=${ledgerFiles.length}, rows=${ledgerRows}.`,
    });
  }
  if (n(translationQaSummary, 'blockers') > 0 || n(decisionTemplateIntegritySummary, 'blockers') > 0) {
    findings.push({
      severity: 'blocker',
      code: 'upstream_reviewer_gate_blocked',
      message: 'Upstream translation QA or decision template integrity has blockers.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const highPriorityRows = priorityRows.filter((row) => row.priorityTier === 'high').length;
  const mediumPriorityRows = priorityRows.filter((row) => row.priorityTier === 'medium').length;
  const lowPriorityRows = priorityRows.filter((row) => row.priorityTier === 'low').length;
  const duplicateFrenchRows = priorityRows.filter((row) => row.duplicateDisposition).length;

  const byLesson = new Map<number, PriorityRow[]>();
  for (const row of priorityRows) {
    const rows = byLesson.get(row.lessonId) ?? [];
    rows.push(row);
    byLesson.set(row.lessonId, rows);
  }
  const lessonPrioritySummary = [...byLesson.entries()]
    .sort((a, bValue) => a[0] - bValue[0])
    .map(([lessonId, rows]) => ({
      lessonId,
      rows: rows.length,
      high: rows.filter((row) => row.priorityTier === 'high').length,
      medium: rows.filter((row) => row.priorityTier === 'medium').length,
      low: rows.filter((row) => row.priorityTier === 'low').length,
      averageScore: Number((rows.reduce((sum, row) => sum + row.priorityScore, 0) / rows.length).toFixed(2)),
    }));

  const priorityJsonlPath = path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl');
  const priorityTsvPath = path.join(reviewerDir, 'french_reviewer_priority_queue.tsv');
  const priorityAuditJsonPath = path.join(auditsDir, 'french_reviewer_priority_audit.json');
  const priorityAuditMdPath = path.join(auditsDir, 'french_reviewer_priority_audit.md');

  ensureDir(reviewerDir);
  ensureDir(auditsDir);
  fs.writeFileSync(priorityJsonlPath, `${priorityRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  fs.writeFileSync(priorityTsvPath, renderTsv(priorityRows));

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-priority-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceQueueRows: queueRows.length,
      generatedLedgers: ledgerFiles.length,
      ledgerRows,
      priorityRows: priorityRows.length,
      highPriorityRows,
      mediumPriorityRows,
      lowPriorityRows,
      duplicateFrenchRows,
      questionMismatchCandidates,
      negationMismatchCandidates,
      quizIntegrityCandidates,
      lengthRatioCandidates,
      complexGrammarRows,
      rowsWithRequiredRuUkReview,
      rowsWithReviewerWorkspaceValues,
      rowsWithActivationViolations,
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && priorityRows.length === 1600,
      readyForDecisionImport: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts: {
      reviewerQueueJsonl: artifactPath(repoRoot, queuePath),
      duplicateTranslationPacket: artifactPath(repoRoot, duplicatePath),
      translationQaAudit: artifactPath(repoRoot, translationQaPath),
      decisionTemplateIntegrityAudit: artifactPath(repoRoot, decisionTemplateIntegrityPath),
    },
    outputArtifacts: {
      priorityQueueJsonl: artifactPath(repoRoot, priorityJsonlPath),
      priorityQueueTsv: artifactPath(repoRoot, priorityTsvPath),
      priorityAuditJson: artifactPath(repoRoot, priorityAuditJsonPath),
      priorityAuditMd: artifactPath(repoRoot, priorityAuditMdPath),
    },
    hashes: {
      sourceQueueSha256: sha256(queuePath),
      priorityQueueJsonlSha256: sha256(priorityJsonlPath),
      priorityQueueTsvSha256: sha256(priorityTsvPath),
    },
    reasonCounts,
    lessonPrioritySummary,
    topPriorityRows: priorityRows.slice(0, 100),
    findings,
  };

  fs.writeFileSync(priorityAuditJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(priorityAuditMdPath, renderMarkdown(report));

  console.log(`GUSTAV French reviewer priority audit: ${report.status}`);
  console.log(`Source queue rows: ${report.summary.sourceQueueRows}`);
  console.log(`Priority rows: ${report.summary.priorityRows}`);
  console.log(`High priority rows: ${report.summary.highPriorityRows}`);
  console.log(`Medium priority rows: ${report.summary.mediumPriorityRows}`);
  console.log(`Low priority rows: ${report.summary.lowPriorityRows}`);
  console.log(`Question mismatch candidates: ${report.summary.questionMismatchCandidates}`);
  console.log(`Negation mismatch candidates: ${report.summary.negationMismatchCandidates}`);
  console.log(`Quiz integrity candidates: ${report.summary.quizIntegrityCandidates}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, priorityAuditJsonPath)}`);

  if (blockers > 0) process.exit(1);
}

void main();
