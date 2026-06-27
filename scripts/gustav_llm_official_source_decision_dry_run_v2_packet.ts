import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type DryRunState = 'blocked_by_findings' | 'proposal_files_ready_no_decisions_imported';
type PendingDecision = 'pending_llm_official_source_review';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type RowCandidate = {
  dryRunScope: 'row';
  candidateProposalId: string;
  sourceTemplateRef: string;
  studyTarget: 'fr';
  sourceLocaleCoverage: Array<'ru' | 'uk'>;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  sourceMeaningHash: string;
  researchEvidenceIds: string[];
  sourceFamilyIds: string[];
  requiredGateIds: string[];
  gateDecisionStatus: Record<string, PendingDecision>;
  candidateDecision: PendingDecision | 'accept_quality_gates';
  acceptedDecisionRequires: {
    evidenceIds: true;
    officialOrTrustedSourceFamilyIds: true;
    officialSourceUrlsOrIds: true;
    sourceMeaningParity: true;
    languageIsolation: true;
    antiCalque: true;
    grammarNaturalness: true;
    quizOneCorrectAnswer: true;
  };
  reviewerTemplateOverwriteAllowed: false;
  reviewerDecisionImportAllowed: false;
  generatedLedgerWriteAllowed: false;
  payloadCreationAllowed: false;
  productionApplyAllowed: false;
  activationApproved: false;
};

type AiCandidate = {
  dryRunScope: 'ai_prompt';
  candidateProposalId: string;
  sourceTemplateRef: string;
  studyTarget: 'fr';
  sourceLocaleCoverage: Array<'ru' | 'uk'>;
  contractId: string;
  aiQualityGateId: string;
  domainId: string;
  riskLevel: string;
  filePath: string;
  sourceFamilyPolicy: 'must_cite_row_or_domain_official_source_before_accept';
  allowedSourceFamilyIds: string[];
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  wrongLanguageGateDecision: PendingDecision;
  cacheLanguageGateDecision: PendingDecision;
  liveReturnGateDecision: PendingDecision;
  candidateDecision: PendingDecision | 'accept_contract';
  acceptedDecisionRequires: {
    wrongLanguageGate: true;
    cacheLanguageKeyGate: true;
    rejectBeforeReturn: true;
    rejectBeforeCache: true;
    languageSafeFallback: true;
    evidenceIdsOrDomainEvidence: true;
  };
  reviewerTemplateOverwriteAllowed: false;
  reviewerDecisionImportAllowed: false;
  generatedLedgerWriteAllowed: false;
  payloadCreationAllowed: false;
  productionApplyAllowed: false;
  activationApproved: false;
};

type Evaluation = {
  rowCandidateProposals: number;
  aiCandidateProposals: number;
  rowCandidatesPending: number;
  aiCandidatesPending: number;
  rowCandidatesWithEvidenceIds: number;
  rowCandidatesWithSourceFamilies: number;
  rowCandidatesWithRequiredGates: number;
  rowCandidatesWithGateStatusForEveryGate: number;
  rowCandidatesLanguageIsolated: number;
  aiCandidatesWithWrongLanguageGate: number;
  aiCandidatesWithCacheGate: number;
  aiCandidatesWithRejectBeforeReturnCache: number;
  aiCandidatesLanguageIsolated: number;
  acceptedRowCandidates: number;
  acceptedAiCandidates: number;
  proposalFilesWritten: number;
  candidateWritesConfinedToDryRunDir: boolean;
  reviewerTemplatesOverwritten: false;
  reviewerDecisionsImported: false;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForLlmOfficialSourceDecisionPromotionPreflight: boolean;
  readyForReviewerDecisionImportExecutionGateRefresh: false;
  readyForPayloadCreationApprovalPreflight: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  dryRunState: DryRunState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-llm-official-source-decision-dry-run-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: Evaluation & {
    targetLocale: 'fr';
    sourceLocales: number;
    sourceFamilyCountsByRowCandidate: Record<string, number>;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  outputArtifactHashes: Record<string, string>;
  findings: Finding[];
  probes: Probe[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerTemplatesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROWS = 1600;
const REQUIRED_AI = 164;
const PENDING: PendingDecision = 'pending_llm_official_source_review';
const TRUSTED_SOURCE_FAMILIES = [
  'cambridge_dictionary',
  'larousse_dictionary_and_conjugation',
  'bescherelle_grammar',
  'tv5monde_apprendre',
  'academie_francaise',
  'le_robert',
  'france_education_international',
  'oqlf_vitrine_linguistique',
  'oxford_french_usage_guide',
];

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

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath: string, rows: unknown[]): void {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: JsonObject, key: string): string[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function parseJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
  findings.push({ severity, code, message });
}

function evidenceIdToSourceFamily(id: string): string {
  const value = id.toLowerCase();
  if (value.includes('cambridge')) return 'cambridge_dictionary';
  if (value.includes('larousse')) return 'larousse_dictionary_and_conjugation';
  if (value.includes('bescherelle')) return 'bescherelle_grammar';
  if (value.includes('tv5')) return 'tv5monde_apprendre';
  if (value.includes('academie')) return 'academie_francaise';
  if (value.includes('robert')) return 'le_robert';
  if (value.includes('france_education') || value.includes('delf')) return 'france_education_international';
  if (value.includes('oqlf')) return 'oqlf_vitrine_linguistique';
  if (value.includes('oxford')) return 'oxford_french_usage_guide';
  return 'unknown_source_family';
}

function unique(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean).sort();
}

function gateStatus(requiredGateIds: string[]): Record<string, PendingDecision> {
  return Object.fromEntries(requiredGateIds.map((gate) => [gate, PENDING]));
}

function buildRowCandidate(row: JsonObject, index: number): RowCandidate {
  const evidenceIds = stringArray(row, 'researchEvidenceIds');
  const sourceFamilyIds = unique(evidenceIds.map(evidenceIdToSourceFamily));
  const requiredGateIds = stringArray(row, 'requiredGateIds');
  return {
    dryRunScope: 'row',
    candidateProposalId: `llm-fr-row-${String(index + 1).padStart(4, '0')}`,
    sourceTemplateRef: `generated/fr/reviewer/reviewer_decision_template_v2.jsonl#L${index + 1}`,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    lessonId: n(row, 'lessonId'),
    phraseId: s(row, 'phraseId'),
    schemaRowId: s(row, 'schemaRowId'),
    qualityRowId: s(row, 'qualityRowId'),
    sourceMeaningHash: s(row, 'sourceMeaningHash'),
    researchEvidenceIds: evidenceIds,
    sourceFamilyIds,
    requiredGateIds,
    gateDecisionStatus: gateStatus(requiredGateIds),
    candidateDecision: PENDING,
    acceptedDecisionRequires: {
      evidenceIds: true,
      officialOrTrustedSourceFamilyIds: true,
      officialSourceUrlsOrIds: true,
      sourceMeaningParity: true,
      languageIsolation: true,
      antiCalque: true,
      grammarNaturalness: true,
      quizOneCorrectAnswer: true,
    },
    reviewerTemplateOverwriteAllowed: false,
    reviewerDecisionImportAllowed: false,
    generatedLedgerWriteAllowed: false,
    payloadCreationAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function buildAiCandidate(row: JsonObject, index: number): AiCandidate {
  return {
    dryRunScope: 'ai_prompt',
    candidateProposalId: `llm-fr-ai-${String(index + 1).padStart(4, '0')}`,
    sourceTemplateRef: `generated/fr/reviewer/reviewer_ai_decision_template_v2.jsonl#L${index + 1}`,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    contractId: s(row, 'contractId'),
    aiQualityGateId: s(row, 'aiQualityGateId'),
    domainId: s(row, 'domainId'),
    riskLevel: s(row, 'riskLevel'),
    filePath: s(row, 'filePath'),
    sourceFamilyPolicy: 'must_cite_row_or_domain_official_source_before_accept',
    allowedSourceFamilyIds: [...TRUSTED_SOURCE_FAMILIES],
    requiredGateIds: stringArray(row, 'requiredGateIds'),
    cacheKeyDimensionsRequired: stringArray(row, 'cacheKeyDimensionsRequired'),
    wrongLanguageGateDecision: PENDING,
    cacheLanguageGateDecision: PENDING,
    liveReturnGateDecision: PENDING,
    candidateDecision: PENDING,
    acceptedDecisionRequires: {
      wrongLanguageGate: true,
      cacheLanguageKeyGate: true,
      rejectBeforeReturn: true,
      rejectBeforeCache: true,
      languageSafeFallback: true,
      evidenceIdsOrDomainEvidence: true,
    },
    reviewerTemplateOverwriteAllowed: false,
    reviewerDecisionImportAllowed: false,
    generatedLedgerWriteAllowed: false,
    payloadCreationAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function countFamilies(rowCandidates: RowCandidate[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const candidate of rowCandidates) {
    for (const family of candidate.sourceFamilyIds) counts[family] = (counts[family] ?? 0) + 1;
  }
  return counts;
}

function allValues<T>(record: Record<string, T>): T[] {
  return Object.values(record);
}

function evaluate(
  p20: JsonObject,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  outputDir: string,
  reviewerDir: string,
): { metrics: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const rowCandidatesWithEvidenceIds = rowCandidates.filter((candidate) => candidate.researchEvidenceIds.length > 0).length;
  const rowCandidatesWithSourceFamilies = rowCandidates.filter((candidate) =>
    candidate.sourceFamilyIds.length > 0 &&
    candidate.sourceFamilyIds.every((family) => TRUSTED_SOURCE_FAMILIES.includes(family)),
  ).length;
  const rowCandidatesWithRequiredGates = rowCandidates.filter((candidate) => candidate.requiredGateIds.length > 0).length;
  const rowCandidatesWithGateStatusForEveryGate = rowCandidates.filter((candidate) =>
    candidate.requiredGateIds.every((gate) => candidate.gateDecisionStatus[gate] === PENDING),
  ).length;
  const rowCandidatesLanguageIsolated = rowCandidates.filter((candidate) =>
    candidate.studyTarget === 'fr' &&
    candidate.sourceLocaleCoverage.includes('ru') &&
    candidate.sourceLocaleCoverage.includes('uk'),
  ).length;
  const aiCandidatesWithWrongLanguageGate = aiCandidates.filter((candidate) =>
    candidate.requiredGateIds.includes('ai_wrong_language_gate') &&
    candidate.wrongLanguageGateDecision === PENDING,
  ).length;
  const aiCandidatesWithCacheGate = aiCandidates.filter((candidate) =>
    candidate.requiredGateIds.includes('ai_cache_language_key_gate') &&
    candidate.cacheLanguageGateDecision === PENDING,
  ).length;
  const aiCandidatesWithRejectBeforeReturnCache = aiCandidates.filter((candidate) =>
    candidate.acceptedDecisionRequires.rejectBeforeReturn &&
    candidate.acceptedDecisionRequires.rejectBeforeCache,
  ).length;
  const aiCandidatesLanguageIsolated = aiCandidates.filter((candidate) =>
    candidate.studyTarget === 'fr' &&
    candidate.sourceLocaleCoverage.includes('ru') &&
    candidate.sourceLocaleCoverage.includes('uk'),
  ).length;
  const acceptedRowCandidates = rowCandidates.filter((candidate) => candidate.candidateDecision !== PENDING).length;
  const acceptedAiCandidates = aiCandidates.filter((candidate) => candidate.candidateDecision !== PENDING).length;
  const candidateWritesConfinedToDryRunDir =
    path.resolve(outputDir).startsWith(path.resolve(reviewerDir)) &&
    path.basename(outputDir) === 'llm_official_source_decision_dry_run_v2';

  if (n(p20, 'blockers') !== 0 || !b(p20, 'readyForLlmOfficialSourceDecisionDryRun')) {
    addFinding(findings, 'blocker', 'p20_materialization_contract_not_ready', 'P20 materialization contract must be ready before P21 dry-run proposals.');
  }
  if (rowCandidates.length !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_count_invalid', `Expected ${REQUIRED_ROWS} row proposal candidates.`);
  if (aiCandidates.length !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_count_invalid', `Expected ${REQUIRED_AI} AI proposal candidates.`);
  if (rowCandidatesWithEvidenceIds !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_evidence_ids_incomplete', 'Every row proposal must carry evidence ids.');
  if (rowCandidatesWithSourceFamilies !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_source_families_incomplete', 'Every row proposal must carry trusted source family ids.');
  if (rowCandidatesWithRequiredGates !== REQUIRED_ROWS || rowCandidatesWithGateStatusForEveryGate !== REQUIRED_ROWS) {
    addFinding(findings, 'blocker', 'row_candidate_gate_contract_incomplete', 'Every row proposal must carry required gates and pending gate statuses.');
  }
  if (rowCandidatesLanguageIsolated !== REQUIRED_ROWS) addFinding(findings, 'blocker', 'row_candidate_language_isolation_incomplete', 'Every row proposal must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.');
  if (aiCandidatesWithWrongLanguageGate !== REQUIRED_AI || aiCandidatesWithCacheGate !== REQUIRED_AI) {
    addFinding(findings, 'blocker', 'ai_candidate_language_cache_gates_incomplete', 'Every AI proposal must carry wrong-language and cache-language gates.');
  }
  if (aiCandidatesWithRejectBeforeReturnCache !== REQUIRED_AI) {
    addFinding(findings, 'blocker', 'ai_candidate_reject_before_return_cache_incomplete', 'Every AI proposal must require reject-before-return/cache.');
  }
  if (aiCandidatesLanguageIsolated !== REQUIRED_AI) addFinding(findings, 'blocker', 'ai_candidate_language_isolation_incomplete', 'Every AI proposal must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.');
  if (acceptedRowCandidates > 0 || acceptedAiCandidates > 0) {
    addFinding(findings, 'blocker', 'accepted_candidates_in_dry_run', 'P21 may only prepare pending proposals, not accepted decisions.');
  }
  if (!candidateWritesConfinedToDryRunDir) addFinding(findings, 'blocker', 'candidate_output_dir_not_confined', 'Candidate proposal writes must stay inside generated/fr/reviewer/llm_official_source_decision_dry_run_v2.');
  for (const candidate of [...rowCandidates, ...aiCandidates]) {
    if (
      candidate.reviewerTemplateOverwriteAllowed ||
      candidate.reviewerDecisionImportAllowed ||
      candidate.generatedLedgerWriteAllowed ||
      candidate.payloadCreationAllowed ||
      candidate.productionApplyAllowed ||
      candidate.activationApproved
    ) {
      addFinding(findings, 'blocker', 'candidate_open_transition_flag', 'Candidate proposals may not open overwrite/import/payload/apply/activation flags.');
      break;
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const ready = blockers === 0;
  return {
    metrics: {
      rowCandidateProposals: rowCandidates.length,
      aiCandidateProposals: aiCandidates.length,
      rowCandidatesPending: rowCandidates.length - acceptedRowCandidates,
      aiCandidatesPending: aiCandidates.length - acceptedAiCandidates,
      rowCandidatesWithEvidenceIds,
      rowCandidatesWithSourceFamilies,
      rowCandidatesWithRequiredGates,
      rowCandidatesWithGateStatusForEveryGate,
      rowCandidatesLanguageIsolated,
      aiCandidatesWithWrongLanguageGate,
      aiCandidatesWithCacheGate,
      aiCandidatesWithRejectBeforeReturnCache,
      aiCandidatesLanguageIsolated,
      acceptedRowCandidates,
      acceptedAiCandidates,
      proposalFilesWritten: ready ? 3 : 0,
      candidateWritesConfinedToDryRunDir,
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForLlmOfficialSourceDecisionPromotionPreflight: ready,
      readyForReviewerDecisionImportExecutionGateRefresh: false,
      readyForPayloadCreationApprovalPreflight: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      dryRunState: ready ? 'proposal_files_ready_no_decisions_imported' : 'blocked_by_findings',
      blockers,
      warnings,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbe(
  id: string,
  expectedAccept: boolean,
  p20: JsonObject,
  rowCandidates: RowCandidate[],
  aiCandidates: AiCandidate[],
  outputDir: string,
  reviewerDir: string,
  mutate?: (draft: { p20: JsonObject; rows: RowCandidate[]; ai: AiCandidate[]; outputDir: string }) => void,
): Probe {
  const draft = { p20: clone(p20), rows: clone(rowCandidates), ai: clone(aiCandidates), outputDir };
  mutate?.(draft);
  const result = evaluate(draft.p20, draft.rows, draft.ai, draft.outputDir, reviewerDir).metrics;
  const accepted = result.blockers === 0;
  return { id, expectedAccept, accepted, blockers: result.blockers, passed: accepted === expectedAccept };
}

function makeProbes(p20: JsonObject, rowCandidates: RowCandidate[], aiCandidates: AiCandidate[], outputDir: string, reviewerDir: string): Probe[] {
  return [
    makeProbe('canonical_pending_proposals_accept', true, p20, rowCandidates, aiCandidates, outputDir, reviewerDir),
    makeProbe('p20_not_ready_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.p20.readyForLlmOfficialSourceDecisionDryRun = false;
    }),
    makeProbe('output_dir_overlap_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.outputDir = reviewerDir;
    }),
    makeProbe('row_missing_evidence_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.rows[0].researchEvidenceIds = [];
    }),
    makeProbe('row_unknown_source_family_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.rows[0].sourceFamilyIds = ['unofficial_blog'];
    }),
    makeProbe('row_missing_gate_status_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      delete draft.rows[0].gateDecisionStatus[draft.rows[0].requiredGateIds[0]];
    }),
    makeProbe('row_wrong_target_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      (draft.rows[0] as unknown as { studyTarget: string }).studyTarget = 'en';
    }),
    makeProbe('ai_missing_wrong_language_gate_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.ai[0].requiredGateIds = draft.ai[0].requiredGateIds.filter((gate) => gate !== 'ai_wrong_language_gate');
    }),
    makeProbe('accepted_row_candidate_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      draft.rows[0].candidateDecision = 'accept_quality_gates';
    }),
    makeProbe('candidate_import_open_rejected', false, p20, rowCandidates, aiCandidates, outputDir, reviewerDir, (draft) => {
      (draft.rows[0] as unknown as { reviewerDecisionImportAllowed: boolean }).reviewerDecisionImportAllowed = true;
    }),
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav LLM Official-Source Decision Dry-Run V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Dry-run state: ${report.summary.dryRunState}`,
    `- Row proposal candidates: ${report.summary.rowCandidateProposals}`,
    `- AI proposal candidates: ${report.summary.aiCandidateProposals}`,
    `- Pending row/AI candidates: ${report.summary.rowCandidatesPending}/${report.summary.aiCandidatesPending}`,
    `- Row candidates with evidence/source families: ${report.summary.rowCandidatesWithEvidenceIds}/${report.summary.rowCandidatesWithSourceFamilies}`,
    `- Row candidates with full gate status: ${report.summary.rowCandidatesWithGateStatusForEveryGate}`,
    `- AI wrong-language/cache gates: ${report.summary.aiCandidatesWithWrongLanguageGate}/${report.summary.aiCandidatesWithCacheGate}`,
    `- Accepted row/AI candidates: ${report.summary.acceptedRowCandidates}/${report.summary.acceptedAiCandidates}`,
    `- Proposal files written: ${report.summary.proposalFilesWritten}`,
    `- Candidate writes confined: ${report.summary.candidateWritesConfinedToDryRunDir ? 'yes' : 'no'}`,
    `- Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`,
    `- Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`,
    `- Ready for promotion preflight: ${report.summary.readyForLlmOfficialSourceDecisionPromotionPreflight ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Outputs',
    '',
  ];
  for (const [key, value] of Object.entries(report.outputs)) lines.push(`- ${key}: \`${value}\``);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_llm_official_source_decision_dry_run_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('LLM official-source decision dry-run V2 is scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const outputDir = path.join(reviewerDir, 'llm_official_source_decision_dry_run_v2');
  ensureDir(auditsDir);
  ensureDir(outputDir);

  const p20Path = path.join(auditsDir, 'llm_official_source_decision_materialization_v2_packet.json');
  const rowTemplatePath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const aiTemplatePath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const rowCandidatePath = path.join(outputDir, 'row_decision_candidates_v2.jsonl');
  const aiCandidatePath = path.join(outputDir, 'ai_decision_candidates_v2.jsonl');
  const proposalManifestPath = path.join(outputDir, 'llm_official_source_decision_dry_run_manifest_v2.json');
  const outJson = path.join(auditsDir, 'llm_official_source_decision_dry_run_v2_packet.json');
  const outMd = path.join(auditsDir, 'llm_official_source_decision_dry_run_v2_packet.md');

  for (const filePath of [p20Path, rowTemplatePath, aiTemplatePath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required input is missing: ${rel(repoRoot, filePath)}`);
  }

  const p20 = object(readJson<JsonObject>(p20Path).summary);
  const rowTemplates = parseJsonl<JsonObject>(rowTemplatePath);
  const aiTemplates = parseJsonl<JsonObject>(aiTemplatePath);
  const rowCandidates = rowTemplates.map(buildRowCandidate);
  const aiCandidates = aiTemplates.map(buildAiCandidate);
  const evaluation = evaluate(p20, rowCandidates, aiCandidates, outputDir, reviewerDir);
  const probes = makeProbes(p20, rowCandidates, aiCandidates, outputDir, reviewerDir);
  const findings = [...evaluation.findings];
  for (const probe of probes.filter((probe) => !probe.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'proposal_files_are_not_import_files', 'P21 writes separate pending proposal files only; reviewer templates and imports remain untouched.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const sourceFamilyCounts = countFamilies(rowCandidates);
  const metrics: Evaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    proposalFilesWritten: blockers === 0 ? 3 : 0,
    dryRunState: blockers === 0 ? evaluation.metrics.dryRunState : 'blocked_by_findings',
    readyForLlmOfficialSourceDecisionPromotionPreflight: blockers === 0 && evaluation.metrics.readyForLlmOfficialSourceDecisionPromotionPreflight,
  };

  const proposalManifest = {
    schemaVersion: 'gustav-llm-official-source-decision-dry-run-manifest-v2',
    runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    rowCandidateProposals: rowCandidates.length,
    aiCandidateProposals: aiCandidates.length,
    rowCandidatesPath: rel(repoRoot, rowCandidatePath),
    aiCandidatesPath: rel(repoRoot, aiCandidatePath),
    sourceFamilyCountsByRowCandidate: sourceFamilyCounts,
    promotionRules: [
      'Promotion must create a separate reviewed decision file; it may not overwrite reviewer templates.',
      'Accepted row decisions must cite evidence ids, source family ids, gate decisions, source meaning parity and language isolation.',
      'Accepted AI decisions must cite wrong-language, cache-language and live-return gate evidence before return/cache.',
      'Promotion must rerun P13/P17/P18/P19 and keep payload/apply closed until reviewerDecisionImportWouldRun=true.',
    ],
    safety: {
      reviewerTemplatesOverwritten: false,
      reviewerDecisionsImported: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
    },
  };

  if (blockers === 0) {
    writeJsonl(rowCandidatePath, rowCandidates);
    writeJsonl(aiCandidatePath, aiCandidates);
    writeJson(proposalManifestPath, proposalManifest);
  }

  const report: Report = {
    schemaVersion: 'gustav-llm-official-source-decision-dry-run-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      llmOfficialSourceDecisionMaterializationV2Packet: rel(repoRoot, p20Path),
      reviewerDecisionTemplateV2: rel(repoRoot, rowTemplatePath),
      reviewerAiDecisionTemplateV2: rel(repoRoot, aiTemplatePath),
    },
    outputs: {
      llmOfficialSourceDecisionDryRunV2PacketJson: rel(repoRoot, outJson),
      llmOfficialSourceDecisionDryRunV2PacketMd: rel(repoRoot, outMd),
      rowDecisionCandidatesV2: rel(repoRoot, rowCandidatePath),
      aiDecisionCandidatesV2: rel(repoRoot, aiCandidatePath),
      proposalManifestV2: rel(repoRoot, proposalManifestPath),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      sourceFamilyCountsByRowCandidate: sourceFamilyCounts,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      llmOfficialSourceDecisionMaterializationV2Packet: sha256(p20Path),
      reviewerDecisionTemplateV2: sha256(rowTemplatePath),
      reviewerAiDecisionTemplateV2: sha256(aiTemplatePath),
    },
    outputArtifactHashes: blockers === 0 ? {
      rowDecisionCandidatesV2: sha256(rowCandidatePath),
      aiDecisionCandidatesV2: sha256(aiCandidatePath),
      proposalManifestV2: sha256(proposalManifestPath),
    } : {},
    findings,
    probes,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerTemplatesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV LLM official-source decision dry-run V2 packet: ${report.status}`);
  console.log(`Dry-run state: ${report.summary.dryRunState}`);
  console.log(`Row proposal candidates: ${report.summary.rowCandidateProposals}`);
  console.log(`AI proposal candidates: ${report.summary.aiCandidateProposals}`);
  console.log(`Accepted row/AI candidates: ${report.summary.acceptedRowCandidates}/${report.summary.acceptedAiCandidates}`);
  console.log(`Reviewer templates overwritten: ${report.summary.reviewerTemplatesOverwritten ? 'yes' : 'no'}`);
  console.log(`Reviewer decisions imported: ${report.summary.reviewerDecisionsImported ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);
  if (blockers > 0) process.exitCode = 1;
}

main();
