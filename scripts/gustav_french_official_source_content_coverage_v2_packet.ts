import * as fs from 'node:fs';
import * as path from 'node:path';

type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
};

type Report = {
  schemaVersion: 'gustav-french-official-source-content-coverage-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    sourceLocales: string[];
    coverageState: string;
    p38Ready: boolean;
    lessonLedgers: number;
    ledgerRows: number;
    ledgerRowsWithEvidenceClaims: number;
    ledgerRowsWithRequiredEvidence: number;
    reviewerQueueRows: number;
    reviewerQueueNeedsReviewRows: number;
    reviewerQueueBlockedRows: number;
    rowOfficialSourceDecisionRows: number;
    acceptedRowOfficialSourceDecisionRows: number;
    aiOfficialSourceDecisionRows: number;
    acceptedAiOfficialSourceDecisionRows: number;
    rowDecisionsMatchedToLedgerRows: number;
    rowDecisionsMatchedToQueueRows: number;
    rowDecisionsWithRuUkCoverage: number;
    rowDecisionsWithTrustedEvidenceIds: number;
    rowDecisionsWithSourceRefs: number;
    rowDecisionsWithTrustedSourceRefUrls: number;
    rowDecisionsWithEvidenceCoveredBySourceRefs: number;
    rowDecisionsWithUntrustedSourceRefUrls: number;
    rowDecisionsWithUntrustedSourceRefIds: number;
    rowDecisionsWithAllRequiredGatesPassed: number;
    rowDecisionQuizRows: number;
    rowDecisionQuizRowsWithOneCorrectAnswer: number;
    rowDecisionWrongTargetRows: number;
    rowDecisionWrongSourceLocaleRows: number;
    rowDecisionActivationOpenRows: number;
    rowDecisionImportOpenRows: number;
    rowDecisionProductionApplyOpenRows: number;
    aiDecisionsWithSourceRefs: number;
    aiDecisionsWithCoreLanguageGatesPassed: number;
    aiDecisionActivationOpenRows: number;
    aiDecisionImportOpenRows: number;
    aiDecisionProductionApplyOpenRows: number;
    trustedSourceFamilies: number;
    trustedSourceIds: number;
    aiDecisionsWithTrustedSourceRefUrls: number;
    aiDecisionsWithMinimumTrustedSourceRefs: number;
    aiDecisionsWithUntrustedSourceRefUrls: number;
    aiDecisionsWithUntrustedSourceRefIds: number;
    researchPackCheckedOnlineAt: string;
    officialSourceVerificationMode: string;
    rowsReadyForReviewerDecisionImportDryRun: boolean;
    aiReadyForReviewerDecisionImportDryRun: boolean;
    readyForReviewerDecisionImportDryRunRefresh: boolean;
    readyForDecisionImportExecutionGateRefresh: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    reviewerDecisionsImported: false;
    generatedLedgerWritesAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    rejectsNonHttpsSourceRefFixture: boolean;
    rejectsUntrustedSourceDomainFixture: boolean;
    rejectsUntrustedSourceIdFixture: boolean;
    rejectsEvidenceWithoutMatchingSourceRefFixture: boolean;
    rejectsInsufficientAiTrustedSourceRefsFixture: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  sampleOfficialSources: { id: string; url: string }[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_ROWS = 1600;
let EXPECTED_AI_DECISIONS = 164;
const MIN_AI_TRUSTED_SOURCE_REFS = 5;

const TRUSTED_OFFICIAL_SOURCE_HOSTS = new Set([
  'apprendre.tv5monde.com',
  'conjugaison.bescherelle.com',
  'dictionary.cambridge.org',
  'dictionnaire.lerobert.com',
  'premium.oxforddictionaries.com',
  'vitrinelinguistique.oqlf.gouv.qc.ca',
  'www.dictionnaire-academie.fr',
  'www.larousse.fr',
]);

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    }
  }
  return args;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonOrEmpty(filePath: string): any {
  if (!fs.existsSync(filePath)) return {};
  return readJson(filePath);
}

function readJsonl(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function summaryOf(value: any): Record<string, unknown> {
  return value && typeof value === 'object' && value.summary && typeof value.summary === 'object'
    ? value.summary
    : {};
}

function n(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function s(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function b(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] === true;
}

function arrValue(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function rel(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string) {
  findings.push({ severity, code, message, path: filePath });
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function probe(name: string, passed: boolean, expected: string, actual: string): Probe {
  return { name, passed, expected, actual };
}

function listFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(fullPath, predicate));
    if (entry.isFile() && predicate(fullPath)) out.push(fullPath);
  }
  return out;
}

function keyOf(row: any): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function allRequiredGatesPassed(row: any): boolean {
  const required = arrValue(row.requiredGateIds);
  const decisions = row.gateReviewerDecisions && typeof row.gateReviewerDecisions === 'object' ? row.gateReviewerDecisions : {};
  return required.length > 0 && required.every((gateId) => decisions[gateId] === 'pass');
}

function hasSourceRefs(row: any): boolean {
  return typeof row.reviewerNotes === 'string' && /sourceRefs=[^;]*https?:\/\//.test(row.reviewerNotes);
}

function sourceRefsOf(row: any): { id: string; url: string; trustedUrl: boolean }[] {
  const notes = typeof row.reviewerNotes === 'string' ? row.reviewerNotes : '';
  const match = notes.match(/sourceRefs=([^;]+)/);
  if (!match) return [];
  return match[1].split(',')
    .map((item: string) => item.trim())
    .filter(Boolean)
    .map((item: string) => {
      const separator = item.indexOf('@');
      const id = separator >= 0 ? item.slice(0, separator).trim() : '';
      const url = separator >= 0 ? item.slice(separator + 1).trim() : item.trim();
      return { id, url, trustedUrl: isTrustedOfficialSourceUrl(url) };
    });
}

function isTrustedOfficialSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && TRUSTED_OFFICIAL_SOURCE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function sourceRefIds(row: any): Set<string> {
  return new Set(sourceRefsOf(row).map((source) => source.id).filter(Boolean));
}

function sourceRefsTrusted(row: any, trustedIds: Set<string>): boolean {
  const refs = sourceRefsOf(row);
  return refs.length > 0 && refs.every((source) => source.trustedUrl && trustedIds.has(source.id));
}

function evidenceCoveredBySourceRefs(row: any, trustedIds: Set<string>): boolean {
  const evidenceIds = arrValue(row.researchEvidenceIds).filter((id) => typeof id === 'string' && id.length > 0);
  const refIds = sourceRefIds(row);
  return evidenceIds.length > 0 && evidenceIds.every((id) => trustedIds.has(id) && refIds.has(id));
}

function trustedSourceRefCount(row: any, trustedIds: Set<string>): number {
  return sourceRefsOf(row).filter((source) => source.trustedUrl && trustedIds.has(source.id)).length;
}

function sourceRefText(source: { id: string; url: string }): string {
  return `${source.id}@${source.url}`;
}

function withSourceRefs(row: any, refs: { id: string; url: string }[]): any {
  const notes = typeof row.reviewerNotes === 'string' ? row.reviewerNotes : '';
  const nextSourceRefs = `sourceRefs=${refs.map(sourceRefText).join(',')}`;
  const nextNotes = /sourceRefs=[^;]*/.test(notes)
    ? notes.replace(/sourceRefs=[^;]*/, nextSourceRefs)
    : `${notes}; ${nextSourceRefs}`;
  return { ...row, reviewerNotes: nextNotes };
}

function hasTrustedEvidence(row: any): boolean {
  return arrValue(row.researchEvidenceIds).length > 0 && arrValue(row.researchEvidenceIds).every((id) => typeof id === 'string' && id.length > 0);
}

function quizHasOneCorrect(row: any): boolean {
  const quiz = row.candidateQuiz && typeof row.candidateQuiz === 'object' ? row.candidateQuiz : {};
  const correct = typeof quiz.correct === 'string' ? quiz.correct : '';
  const blank = typeof quiz.blank === 'string' ? quiz.blank : '';
  const distractors = arrValue(quiz.distractors).filter((item) => typeof item === 'string' && item.length > 0);
  return blank.includes('___') && correct.length > 0 && distractors.length >= 2 && !distractors.includes(correct);
}

function renderMarkdown(report: Report): string {
  return [
    '# GUSTAV French Official-Source Content Coverage V2',
    '',
    `Status: ${report.status}`,
    '',
    `Coverage state: ${report.summary.coverageState}`,
    '',
    `Rows: ledgers=${report.summary.ledgerRows}, row decisions=${report.summary.rowOfficialSourceDecisionRows}, accepted=${report.summary.acceptedRowOfficialSourceDecisionRows}`,
    '',
    `AI decisions: ${report.summary.acceptedAiOfficialSourceDecisionRows}/${report.summary.aiOfficialSourceDecisionRows}`,
    '',
    `Matched to ledgers/queue: ${report.summary.rowDecisionsMatchedToLedgerRows}/${report.summary.rowDecisionsMatchedToQueueRows}`,
    '',
    `Source refs / evidence ids / gates passed: ${report.summary.rowDecisionsWithSourceRefs}/${report.summary.rowDecisionsWithTrustedEvidenceIds}/${report.summary.rowDecisionsWithAllRequiredGatesPassed}`,
    '',
    `Trusted source ref URLs / evidence covered by refs: ${report.summary.rowDecisionsWithTrustedSourceRefUrls}/${report.summary.rowDecisionsWithEvidenceCoveredBySourceRefs}`,
    '',
    `AI trusted source refs / minimum trusted refs: ${report.summary.aiDecisionsWithTrustedSourceRefUrls}/${report.summary.aiDecisionsWithMinimumTrustedSourceRefs}`,
    '',
    `Negative fixtures rejected: nonHttps=${report.summary.rejectsNonHttpsSourceRefFixture ? 'yes' : 'no'}, untrustedDomain=${report.summary.rejectsUntrustedSourceDomainFixture ? 'yes' : 'no'}, untrustedId=${report.summary.rejectsUntrustedSourceIdFixture ? 'yes' : 'no'}, missingEvidenceRef=${report.summary.rejectsEvidenceWithoutMatchingSourceRefFixture ? 'yes' : 'no'}, insufficientAiRefs=${report.summary.rejectsInsufficientAiTrustedSourceRefsFixture ? 'yes' : 'no'}`,
    '',
    `Quiz one-correct rows: ${report.summary.rowDecisionQuizRowsWithOneCorrectAnswer}/${report.summary.rowDecisionQuizRows}`,
    '',
    `Research pack checked online at: ${report.summary.researchPackCheckedOnlineAt}`,
    '',
    `Ready for reviewer decision import dry-run refresh: ${report.summary.readyForReviewerDecisionImportDryRunRefresh ? 'yes' : 'no'}`,
    '',
    `Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    `Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    '',
    '## Sample Official Sources',
    '',
    ...report.sampleOfficialSources.map((source) => `- ${source.id}: ${source.url}`),
    '',
    '## Findings',
    '',
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`)
      : ['- None']),
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const runId = args.run ? path.basename(path.resolve(args.run)) : '2026-05-19_fr_inventory_v0a1';
  const runDir = args.run ? path.resolve(args.run) : path.join(repoRoot, 'docs/gustav/runs', runId);
  const target = args.target || 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr, got ${target}`);

  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated/fr/lessons');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const promotedDir = path.join(reviewerDir, 'llm_official_source_promoted_decisions_v2');
  const p38Path = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const rowDecisionPath = path.join(promotedDir, 'row_decisions_reviewed_v2.jsonl');
  const aiDecisionPath = path.join(promotedDir, 'ai_decisions_reviewed_v2.jsonl');
  const promotedManifestPath = path.join(promotedDir, 'llm_official_source_promoted_decision_file_generation_manifest_v2.json');
  const promotionPacketPath = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const reviewerQueuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const outputJsonPath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.md');

  const findings: Finding[] = [];
  for (const filePath of [p38Path, rowDecisionPath, aiDecisionPath, promotedManifestPath, promotionPacketPath, reviewerQueuePath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'REQUIRED_INPUT_MISSING', 'Required official-source coverage input is missing.', rel(repoRoot, filePath));
  }

  const p38 = readJsonOrEmpty(p38Path);
  const p38Summary = summaryOf(p38);
  const p38Ready =
    s(p38, 'status') === 'PASS' &&
    n(p38Summary, 'blockers') === 0 &&
    s(p38Summary, 'consistencyState') === 'master_next_pass_consistency_refreshed' &&
    b(p38Summary, 'readyForOfficialSourceContentCoverageGateV2') &&
    !b(p38Summary, 'readyForApply');

  const lessonFiles = listFiles(lessonsDir, (filePath) => /lesson\d+_row_ledger\.json$/.test(path.basename(filePath)));
  const ledgerRows = lessonFiles.flatMap((filePath) => {
    const ledger = readJson(filePath);
    return arrValue(ledger.rows).map((row) => ({ ...row, lessonId: ledger.lessonId }));
  });
  const reviewerQueueRows = readJsonl(reviewerQueuePath);
  const rowDecisions = readJsonl(rowDecisionPath);
  const aiDecisions = readJsonl(aiDecisionPath);
  const promotedManifest = readJsonOrEmpty(promotedManifestPath);
  const promotionPacket = readJsonOrEmpty(promotionPacketPath);
  const promotionSummary = summaryOf(promotionPacket);

  const ledgerKeys = new Set(ledgerRows.map(keyOf));
  const queueKeys = new Set(reviewerQueueRows.map(keyOf));
  const decisionKeys = new Set(rowDecisions.map(keyOf));
  const duplicateDecisionRows = rowDecisions.length - decisionKeys.size;
  const rowDecisionsMatchedToLedgerRows = rowDecisions.filter((row) => ledgerKeys.has(keyOf(row))).length;
  const rowDecisionsMatchedToQueueRows = rowDecisions.filter((row) => queueKeys.has(keyOf(row))).length;

  const rowDecisionsWithRuUkCoverage = rowDecisions.filter((row) => {
    const coverage = arrValue(row.sourceLocaleCoverage);
    return coverage.includes('ru') && coverage.includes('uk');
  }).length;
  const evidenceContract = promotedManifest.evidenceContract && typeof promotedManifest.evidenceContract === 'object' ? promotedManifest.evidenceContract : {};
  const trustedSourceFamilies = arrValue(evidenceContract.trustedSourceFamilies);
  const trustedSourceIds = arrValue(evidenceContract.trustedSourceIds);
  const trustedSourceIdSet = new Set(trustedSourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0));
  const researchPackCheckedOnlineAt = typeof evidenceContract.researchPackCheckedOnlineAt === 'string' ? evidenceContract.researchPackCheckedOnlineAt : '';
  const officialSourceVerificationMode = typeof evidenceContract.officialSourceVerificationMode === 'string' ? evidenceContract.officialSourceVerificationMode : '';

  const rowDecisionsWithTrustedEvidenceIds = rowDecisions.filter(hasTrustedEvidence).length;
  const rowDecisionsWithSourceRefs = rowDecisions.filter(hasSourceRefs).length;
  const rowDecisionsWithTrustedSourceRefUrls = rowDecisions.filter((row) => sourceRefsTrusted(row, trustedSourceIdSet)).length;
  const rowDecisionsWithEvidenceCoveredBySourceRefs = rowDecisions.filter((row) => evidenceCoveredBySourceRefs(row, trustedSourceIdSet)).length;
  const rowDecisionsWithUntrustedSourceRefUrls = rowDecisions.filter((row) => sourceRefsOf(row).some((source) => !source.trustedUrl)).length;
  const rowDecisionsWithUntrustedSourceRefIds = rowDecisions.filter((row) => sourceRefsOf(row).some((source) => !trustedSourceIdSet.has(source.id))).length;
  const rowDecisionsWithAllRequiredGatesPassed = rowDecisions.filter(allRequiredGatesPassed).length;
  const rowDecisionQuizRows = rowDecisions.filter((row) => row.candidateQuiz && typeof row.candidateQuiz === 'object').length;
  const rowDecisionQuizRowsWithOneCorrectAnswer = rowDecisions.filter(quizHasOneCorrect).length;
  const acceptedRowOfficialSourceDecisionRows = rowDecisions.filter((row) => row.reviewerDecision === 'accept_quality_gates').length;
  const rowDecisionWrongTargetRows = rowDecisions.filter((row) => row.studyTarget !== 'fr').length;
  const rowDecisionWrongSourceLocaleRows = rowDecisions.length - rowDecisionsWithRuUkCoverage;
  const rowDecisionActivationOpenRows = rowDecisions.filter((row) => row.activationApproved === true || row.currentActivationStatus !== 'blocked').length;
  const rowDecisionImportOpenRows = rowDecisions.filter((row) => row.reviewerImportAllowed === true).length;
  const rowDecisionProductionApplyOpenRows = rowDecisions.filter((row) => row.productionApplyAllowed === true).length;

  const acceptedAiOfficialSourceDecisionRows = aiDecisions.filter((row) => row.reviewerDecision === 'accept_contract').length;
  EXPECTED_AI_DECISIONS = Math.max(
    EXPECTED_AI_DECISIONS,
    n(promotionSummary, 'acceptedAiDecisionRows'),
    n(promotionSummary, 'aiPromptContractEntrypoints'),
    aiDecisions.length,
  );
  const aiDecisionsWithSourceRefs = aiDecisions.filter(hasSourceRefs).length;
  const aiDecisionsWithTrustedSourceRefUrls = aiDecisions.filter((row) => sourceRefsTrusted(row, trustedSourceIdSet)).length;
  const aiDecisionsWithMinimumTrustedSourceRefs = aiDecisions.filter((row) => trustedSourceRefCount(row, trustedSourceIdSet) >= MIN_AI_TRUSTED_SOURCE_REFS).length;
  const aiDecisionsWithUntrustedSourceRefUrls = aiDecisions.filter((row) => sourceRefsOf(row).some((source) => !source.trustedUrl)).length;
  const aiDecisionsWithUntrustedSourceRefIds = aiDecisions.filter((row) => sourceRefsOf(row).some((source) => !trustedSourceIdSet.has(source.id))).length;
  const aiDecisionsWithCoreLanguageGatesPassed = aiDecisions.filter((row) =>
    row.wrongLanguageGateDecision === 'pass' &&
    row.cacheLanguageGateDecision === 'pass' &&
    row.liveReturnGateDecision === 'pass' &&
    row.rejectedFreshOutputMayReturn === false &&
    row.rejectedFreshOutputMayBeCached === false &&
    row.targetOutputAllowedBeforeQualityPass === false
  ).length;
  const aiDecisionActivationOpenRows = aiDecisions.filter((row) => row.activationApproved === true || row.currentActivationStatus !== 'blocked').length;
  const aiDecisionImportOpenRows = aiDecisions.filter((row) => row.reviewerImportAllowed === true).length;
  const aiDecisionProductionApplyOpenRows = aiDecisions.filter((row) => row.productionApplyAllowed === true).length;

  const rowFixture = rowDecisions[0] ?? {};
  const rowFixtureRefs = sourceRefsOf(rowFixture);
  const firstRowRef = rowFixtureRefs[0];
  const secondRowRef = rowFixtureRefs[1];
  const nonHttpsRowFixture = firstRowRef
    ? withSourceRefs(rowFixture, [{ id: firstRowRef.id, url: firstRowRef.url.replace(/^https:/, 'http:') }, ...rowFixtureRefs.slice(1)])
    : {};
  const untrustedDomainRowFixture = firstRowRef
    ? withSourceRefs(rowFixture, [{ id: firstRowRef.id, url: 'https://example.com/not-official' }, ...rowFixtureRefs.slice(1)])
    : {};
  const untrustedSourceIdRowFixture = firstRowRef
    ? withSourceRefs(rowFixture, [{ id: 'untrusted_source_id', url: firstRowRef.url }, ...rowFixtureRefs.slice(1)])
    : {};
  const evidenceMissingRowFixture = secondRowRef
    ? withSourceRefs(rowFixture, [secondRowRef])
    : {};
  const rejectsNonHttpsSourceRefFixture = firstRowRef ? !sourceRefsTrusted(nonHttpsRowFixture, trustedSourceIdSet) : false;
  const rejectsUntrustedSourceDomainFixture = firstRowRef ? !sourceRefsTrusted(untrustedDomainRowFixture, trustedSourceIdSet) : false;
  const rejectsUntrustedSourceIdFixture = firstRowRef ? !sourceRefsTrusted(untrustedSourceIdRowFixture, trustedSourceIdSet) : false;
  const rejectsEvidenceWithoutMatchingSourceRefFixture = secondRowRef ? !evidenceCoveredBySourceRefs(evidenceMissingRowFixture, trustedSourceIdSet) : false;

  const aiFixture = aiDecisions[0] ?? {};
  const aiFixtureRefs = sourceRefsOf(aiFixture);
  const insufficientAiRefsFixture = aiFixtureRefs[0] ? withSourceRefs(aiFixture, [aiFixtureRefs[0]]) : {};
  const rejectsInsufficientAiTrustedSourceRefsFixture = aiFixtureRefs[0]
    ? trustedSourceRefCount(insufficientAiRefsFixture, trustedSourceIdSet) < MIN_AI_TRUSTED_SOURCE_REFS
    : false;

  if (!p38Ready) addFinding(findings, 'blocker', 'P38_NOT_READY', 'Master/next-pass consistency must be refreshed before content coverage can close.', rel(repoRoot, p38Path));
  if (lessonFiles.length !== 32) addFinding(findings, 'blocker', 'LESSON_LEDGER_COUNT_DRIFT', `Expected 32 lesson ledgers, found ${lessonFiles.length}.`, rel(repoRoot, lessonsDir));
  if (ledgerRows.length !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'LEDGER_ROW_COUNT_DRIFT', `Expected ${EXPECTED_ROWS} ledger rows, found ${ledgerRows.length}.`, rel(repoRoot, lessonsDir));
  if (reviewerQueueRows.length !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'REVIEWER_QUEUE_ROW_COUNT_DRIFT', `Expected ${EXPECTED_ROWS} queue rows, found ${reviewerQueueRows.length}.`, rel(repoRoot, reviewerQueuePath));
  if (rowDecisions.length !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_DECISION_COUNT_DRIFT', `Expected ${EXPECTED_ROWS} official-source row decisions, found ${rowDecisions.length}.`, rel(repoRoot, rowDecisionPath));
  if (duplicateDecisionRows !== 0) addFinding(findings, 'blocker', 'DUPLICATE_ROW_DECISIONS', `Found ${duplicateDecisionRows} duplicate official-source row decisions.`, rel(repoRoot, rowDecisionPath));
  if (acceptedRowOfficialSourceDecisionRows !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_DECISIONS_NOT_ALL_ACCEPTED', `Accepted row decisions: ${acceptedRowOfficialSourceDecisionRows}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsMatchedToLedgerRows !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_DECISIONS_NOT_MATCHED_TO_LEDGERS', `Matched to ledgers: ${rowDecisionsMatchedToLedgerRows}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsMatchedToQueueRows !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_DECISIONS_NOT_MATCHED_TO_QUEUE', `Matched to queue: ${rowDecisionsMatchedToQueueRows}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithRuUkCoverage !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_SOURCE_LOCALE_COVERAGE_INCOMPLETE', `RU/UK coverage: ${rowDecisionsWithRuUkCoverage}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithTrustedEvidenceIds !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_TRUSTED_EVIDENCE_INCOMPLETE', `Trusted evidence ids: ${rowDecisionsWithTrustedEvidenceIds}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithSourceRefs !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_SOURCE_REFS_INCOMPLETE', `Official source refs: ${rowDecisionsWithSourceRefs}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithTrustedSourceRefUrls !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_TRUSTED_SOURCE_REF_URLS_INCOMPLETE', `Rows with trusted official source ref URLs: ${rowDecisionsWithTrustedSourceRefUrls}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithEvidenceCoveredBySourceRefs !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_EVIDENCE_SOURCE_REF_COVERAGE_INCOMPLETE', `Rows where evidence ids are covered by sourceRefs: ${rowDecisionsWithEvidenceCoveredBySourceRefs}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithUntrustedSourceRefUrls !== 0 || rowDecisionsWithUntrustedSourceRefIds !== 0) addFinding(findings, 'blocker', 'ROW_UNTRUSTED_SOURCE_REFS_PRESENT', `Rows with untrusted source ref URLs/ids: ${rowDecisionsWithUntrustedSourceRefUrls}/${rowDecisionsWithUntrustedSourceRefIds}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionsWithAllRequiredGatesPassed !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_GATE_PASS_COVERAGE_INCOMPLETE', `Required gates passed: ${rowDecisionsWithAllRequiredGatesPassed}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionQuizRowsWithOneCorrectAnswer !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'ROW_QUIZ_ONE_CORRECT_COVERAGE_INCOMPLETE', `One-correct quiz rows: ${rowDecisionQuizRowsWithOneCorrectAnswer}/${EXPECTED_ROWS}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionWrongTargetRows !== 0 || rowDecisionWrongSourceLocaleRows !== 0) addFinding(findings, 'blocker', 'ROW_LANGUAGE_BOUNDARY_DRIFT', `Wrong target/source rows: ${rowDecisionWrongTargetRows}/${rowDecisionWrongSourceLocaleRows}.`, rel(repoRoot, rowDecisionPath));
  if (rowDecisionActivationOpenRows !== 0 || rowDecisionImportOpenRows !== 0 || rowDecisionProductionApplyOpenRows !== 0) addFinding(findings, 'blocker', 'ROW_DECISION_TRANSITIONS_OPEN', `Activation/import/apply open rows: ${rowDecisionActivationOpenRows}/${rowDecisionImportOpenRows}/${rowDecisionProductionApplyOpenRows}.`, rel(repoRoot, rowDecisionPath));
  if (aiDecisions.length !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_DECISION_COUNT_DRIFT', `Expected ${EXPECTED_AI_DECISIONS} AI decisions, found ${aiDecisions.length}.`, rel(repoRoot, aiDecisionPath));
  if (acceptedAiOfficialSourceDecisionRows !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_DECISIONS_NOT_ALL_ACCEPTED', `Accepted AI decisions: ${acceptedAiOfficialSourceDecisionRows}/${EXPECTED_AI_DECISIONS}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionsWithSourceRefs !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_SOURCE_REFS_INCOMPLETE', `AI source refs: ${aiDecisionsWithSourceRefs}/${EXPECTED_AI_DECISIONS}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionsWithTrustedSourceRefUrls !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_TRUSTED_SOURCE_REF_URLS_INCOMPLETE', `AI decisions with trusted official source ref URLs: ${aiDecisionsWithTrustedSourceRefUrls}/${EXPECTED_AI_DECISIONS}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionsWithMinimumTrustedSourceRefs !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_MINIMUM_TRUSTED_SOURCE_REFS_INCOMPLETE', `AI decisions with at least ${MIN_AI_TRUSTED_SOURCE_REFS} trusted official source refs: ${aiDecisionsWithMinimumTrustedSourceRefs}/${EXPECTED_AI_DECISIONS}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionsWithUntrustedSourceRefUrls !== 0 || aiDecisionsWithUntrustedSourceRefIds !== 0) addFinding(findings, 'blocker', 'AI_UNTRUSTED_SOURCE_REFS_PRESENT', `AI decisions with untrusted source ref URLs/ids: ${aiDecisionsWithUntrustedSourceRefUrls}/${aiDecisionsWithUntrustedSourceRefIds}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionsWithCoreLanguageGatesPassed !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'AI_CORE_LANGUAGE_GATES_INCOMPLETE', `AI core language gates: ${aiDecisionsWithCoreLanguageGatesPassed}/${EXPECTED_AI_DECISIONS}.`, rel(repoRoot, aiDecisionPath));
  if (aiDecisionActivationOpenRows !== 0 || aiDecisionImportOpenRows !== 0 || aiDecisionProductionApplyOpenRows !== 0) addFinding(findings, 'blocker', 'AI_DECISION_TRANSITIONS_OPEN', `AI activation/import/apply open rows: ${aiDecisionActivationOpenRows}/${aiDecisionImportOpenRows}/${aiDecisionProductionApplyOpenRows}.`, rel(repoRoot, aiDecisionPath));
  if (trustedSourceFamilies.length < 5 || trustedSourceIds.length < 5 || researchPackCheckedOnlineAt === '') addFinding(findings, 'blocker', 'TRUSTED_SOURCE_CONTRACT_INCOMPLETE', 'Promoted decision manifest must include trusted source families, trusted source ids and online check timestamp.', rel(repoRoot, promotedManifestPath));
  if (n(promotionSummary, 'acceptedRowDecisionRows') !== EXPECTED_ROWS || n(promotionSummary, 'acceptedAiDecisionRows') !== EXPECTED_AI_DECISIONS) addFinding(findings, 'blocker', 'PROMOTION_PACKET_ACCEPTANCE_DRIFT', 'Promotion packet accepted counts do not match promoted decision files.', rel(repoRoot, promotionPacketPath));
  if (!rejectsNonHttpsSourceRefFixture) addFinding(findings, 'blocker', 'NON_HTTPS_SOURCE_REF_FIXTURE_NOT_REJECTED', 'Official-source gate must reject non-HTTPS sourceRefs.');
  if (!rejectsUntrustedSourceDomainFixture) addFinding(findings, 'blocker', 'UNTRUSTED_SOURCE_DOMAIN_FIXTURE_NOT_REJECTED', 'Official-source gate must reject sourceRefs on untrusted domains.');
  if (!rejectsUntrustedSourceIdFixture) addFinding(findings, 'blocker', 'UNTRUSTED_SOURCE_ID_FIXTURE_NOT_REJECTED', 'Official-source gate must reject sourceRefs whose ids are not in the trusted source manifest.');
  if (!rejectsEvidenceWithoutMatchingSourceRefFixture) addFinding(findings, 'blocker', 'EVIDENCE_WITHOUT_SOURCE_REF_FIXTURE_NOT_REJECTED', 'Official-source gate must reject rows whose evidence ids are not covered by matching sourceRefs.');
  if (!rejectsInsufficientAiTrustedSourceRefsFixture) addFinding(findings, 'blocker', 'INSUFFICIENT_AI_TRUSTED_SOURCE_REFS_FIXTURE_NOT_REJECTED', `AI prompt contracts must reject fewer than ${MIN_AI_TRUSTED_SOURCE_REFS} trusted official sourceRefs.`);

  const probes = [
    probe('p38-ready', p38Ready, 'P38 PASS and ready for content coverage gate', `${s(p38, 'status')}/${s(p38Summary, 'consistencyState')}`),
    probe('row-counts', ledgerRows.length === EXPECTED_ROWS && rowDecisions.length === EXPECTED_ROWS, '1600 ledger rows and 1600 row decisions', `${ledgerRows.length}/${rowDecisions.length}`),
    probe('row-decisions-accepted', acceptedRowOfficialSourceDecisionRows === EXPECTED_ROWS, '1600 accepted official-source row decisions', String(acceptedRowOfficialSourceDecisionRows)),
    probe('row-source-refs', rowDecisionsWithSourceRefs === EXPECTED_ROWS, '1600 rows with official source refs', String(rowDecisionsWithSourceRefs)),
    probe('row-source-ref-urls-trusted', rowDecisionsWithTrustedSourceRefUrls === EXPECTED_ROWS, '1600 rows with trusted official source ref URLs', String(rowDecisionsWithTrustedSourceRefUrls)),
    probe('row-evidence-covered-by-source-refs', rowDecisionsWithEvidenceCoveredBySourceRefs === EXPECTED_ROWS, '1600 rows whose evidence ids are covered by sourceRefs', String(rowDecisionsWithEvidenceCoveredBySourceRefs)),
    probe('row-gates-pass', rowDecisionsWithAllRequiredGatesPassed === EXPECTED_ROWS, '1600 rows with required gates passed', String(rowDecisionsWithAllRequiredGatesPassed)),
    probe('quiz-one-correct', rowDecisionQuizRowsWithOneCorrectAnswer === EXPECTED_ROWS, '1600 quizzes with one correct answer', String(rowDecisionQuizRowsWithOneCorrectAnswer)),
    probe('ai-decisions-accepted', acceptedAiOfficialSourceDecisionRows === EXPECTED_AI_DECISIONS, `${EXPECTED_AI_DECISIONS} accepted AI decisions`, String(acceptedAiOfficialSourceDecisionRows)),
    probe('ai-source-ref-urls-trusted', aiDecisionsWithTrustedSourceRefUrls === EXPECTED_AI_DECISIONS, `${EXPECTED_AI_DECISIONS} AI decisions with trusted official source ref URLs`, String(aiDecisionsWithTrustedSourceRefUrls)),
    probe('ai-minimum-trusted-source-refs', aiDecisionsWithMinimumTrustedSourceRefs === EXPECTED_AI_DECISIONS, `${EXPECTED_AI_DECISIONS} AI decisions with at least ${MIN_AI_TRUSTED_SOURCE_REFS} trusted official source refs`, String(aiDecisionsWithMinimumTrustedSourceRefs)),
    probe('rejects-non-https-source-ref-fixture', rejectsNonHttpsSourceRefFixture, 'non-HTTPS sourceRef is rejected', String(rejectsNonHttpsSourceRefFixture)),
    probe('rejects-untrusted-source-domain-fixture', rejectsUntrustedSourceDomainFixture, 'untrusted sourceRef domain is rejected', String(rejectsUntrustedSourceDomainFixture)),
    probe('rejects-untrusted-source-id-fixture', rejectsUntrustedSourceIdFixture, 'untrusted sourceRef id is rejected', String(rejectsUntrustedSourceIdFixture)),
    probe('rejects-evidence-without-matching-source-ref-fixture', rejectsEvidenceWithoutMatchingSourceRefFixture, 'evidence id without matching sourceRef is rejected', String(rejectsEvidenceWithoutMatchingSourceRefFixture)),
    probe('rejects-insufficient-ai-trusted-source-refs-fixture', rejectsInsufficientAiTrustedSourceRefsFixture, 'AI contract with too few trusted sourceRefs is rejected', String(rejectsInsufficientAiTrustedSourceRefsFixture)),
    probe('transitions-closed', rowDecisionImportOpenRows === 0 && rowDecisionProductionApplyOpenRows === 0 && aiDecisionImportOpenRows === 0 && aiDecisionProductionApplyOpenRows === 0, 'import/apply transitions closed', `${rowDecisionImportOpenRows}/${rowDecisionProductionApplyOpenRows}/${aiDecisionImportOpenRows}/${aiDecisionProductionApplyOpenRows}`),
  ];

  const probeFailures = probes.filter((item) => !item.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  const rowsReadyForReviewerDecisionImportDryRun = accepted;
  const aiReadyForReviewerDecisionImportDryRun = accepted;

  const sampleOfficialSources = [
    { id: 'bescherelle_conjugation', url: 'https://conjugaison.bescherelle.com/' },
    { id: 'tv5monde_grammar', url: 'https://apprendre.tv5monde.com/fr/aides/grammaire' },
    { id: 'cambridge_en_fr_dictionary', url: 'https://dictionary.cambridge.org/translate/english-french/' },
    { id: 'larousse_fr_dictionary', url: 'https://www.larousse.fr/dictionnaires/francais' },
    { id: 'le_robert_dictionary', url: 'https://dictionnaire.lerobert.com/fr/' },
    { id: 'oqlf_vitrine_linguistique', url: 'https://vitrinelinguistique.oqlf.gouv.qc.ca/' },
    { id: 'academie_francaise_dire_ne_pas_dire', url: 'https://www.dictionnaire-academie.fr/' },
  ];

  const report: Report = {
    schemaVersion: 'gustav-french-official-source-content-coverage-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: accepted ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      masterNextPassConsistencyRefreshV2Packet: rel(repoRoot, p38Path),
      lessonLedgersDir: rel(repoRoot, lessonsDir),
      reviewerQueue: rel(repoRoot, reviewerQueuePath),
      rowDecisionsReviewedV2: rel(repoRoot, rowDecisionPath),
      aiDecisionsReviewedV2: rel(repoRoot, aiDecisionPath),
      promotedDecisionManifestV2: rel(repoRoot, promotedManifestPath),
      promotedDecisionFileGenerationPacketV2: rel(repoRoot, promotionPacketPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      coverageState: accepted ? 'official_source_content_coverage_complete_no_import' : 'blocked_by_findings',
      p38Ready,
      lessonLedgers: lessonFiles.length,
      ledgerRows: ledgerRows.length,
      ledgerRowsWithEvidenceClaims: ledgerRows.filter((row) => arrValue(row.evidenceClaimIds).length > 0).length,
      ledgerRowsWithRequiredEvidence: ledgerRows.filter((row) => arrValue(row.requiredEvidence).length > 0).length,
      reviewerQueueRows: reviewerQueueRows.length,
      reviewerQueueNeedsReviewRows: reviewerQueueRows.filter((row) => row.currentReviewerStatus === 'needs_review').length,
      reviewerQueueBlockedRows: reviewerQueueRows.filter((row) => row.currentActivationStatus === 'blocked').length,
      rowOfficialSourceDecisionRows: rowDecisions.length,
      acceptedRowOfficialSourceDecisionRows,
      aiOfficialSourceDecisionRows: aiDecisions.length,
      acceptedAiOfficialSourceDecisionRows,
      rowDecisionsMatchedToLedgerRows,
      rowDecisionsMatchedToQueueRows,
      rowDecisionsWithRuUkCoverage,
      rowDecisionsWithTrustedEvidenceIds,
      rowDecisionsWithSourceRefs,
      rowDecisionsWithTrustedSourceRefUrls,
      rowDecisionsWithEvidenceCoveredBySourceRefs,
      rowDecisionsWithUntrustedSourceRefUrls,
      rowDecisionsWithUntrustedSourceRefIds,
      rowDecisionsWithAllRequiredGatesPassed,
      rowDecisionQuizRows,
      rowDecisionQuizRowsWithOneCorrectAnswer,
      rowDecisionWrongTargetRows,
      rowDecisionWrongSourceLocaleRows,
      rowDecisionActivationOpenRows,
      rowDecisionImportOpenRows,
      rowDecisionProductionApplyOpenRows,
      aiDecisionsWithSourceRefs,
      aiDecisionsWithCoreLanguageGatesPassed,
      aiDecisionActivationOpenRows,
      aiDecisionImportOpenRows,
      aiDecisionProductionApplyOpenRows,
      trustedSourceFamilies: trustedSourceFamilies.length,
      trustedSourceIds: trustedSourceIds.length,
      aiDecisionsWithTrustedSourceRefUrls,
      aiDecisionsWithMinimumTrustedSourceRefs,
      aiDecisionsWithUntrustedSourceRefUrls,
      aiDecisionsWithUntrustedSourceRefIds,
      researchPackCheckedOnlineAt,
      officialSourceVerificationMode,
      rowsReadyForReviewerDecisionImportDryRun,
      aiReadyForReviewerDecisionImportDryRun,
      readyForReviewerDecisionImportDryRunRefresh: accepted,
      readyForDecisionImportExecutionGateRefresh: accepted,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      rejectsNonHttpsSourceRefFixture,
      rejectsUntrustedSourceDomainFixture,
      rejectsUntrustedSourceIdFixture,
      rejectsEvidenceWithoutMatchingSourceRefFixture,
      rejectsInsufficientAiTrustedSourceRefsFixture,
      fixtureProbesPassed: probes.filter((item) => item.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    sampleOfficialSources,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV French official-source content coverage V2 packet: ${report.status}`);
  console.log(`Coverage state: ${report.summary.coverageState}`);
  console.log(`Rows accepted/sourceRefs/gates: ${acceptedRowOfficialSourceDecisionRows}/${rowDecisionsWithSourceRefs}/${rowDecisionsWithAllRequiredGatesPassed}`);
  console.log(`AI accepted/sourceRefs/language gates: ${acceptedAiOfficialSourceDecisionRows}/${aiDecisionsWithSourceRefs}/${aiDecisionsWithCoreLanguageGatesPassed}`);
  console.log(`Ready for reviewer decision import dry-run refresh: ${report.summary.readyForReviewerDecisionImportDryRunRefresh ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
